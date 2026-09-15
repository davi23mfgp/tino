import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { formatarMoeda } from "@/lib/dinheiro"
import { autenticarChave, registrarCaptura } from "@/lib/captura"
import { baixarMidia, primeiraMensagem, responder, type EventoWhatsApp } from "@/lib/captura/whatsapp"
import { AudioIndisponivel, AudioLongoDemais, AudioVazio, transcrever } from "@/lib/captura/transcricao"
import { confirmarImportacao, detectarFormato, previaImportacao } from "@/lib/importar"
import { PdfProtegido } from "@/lib/importar/pdf"
import { montarPanorama } from "@/lib/tino/panorama"
import { responderPorRegras } from "@/lib/tino/chat"
import { ehBuscaDeDocumento, procurarDocumento } from "@/lib/tino/documentos"
import { competenciaAtual } from "@/lib/datas"

export const dynamic = "force-dynamic"

/// Fatura de um ano cabe folgado nisso; acima é arquivo errado.
const TAMANHO_MAXIMO = 10 * 1024 * 1024

/**
 * Verificação do webhook.
 *
 * A Meta chama esta rota uma vez, ao cadastrar o endereço, e só aceita o
 * webhook se a resposta devolver o `challenge` em texto puro. O token de
 * verificação é escolhido por quem cadastra e conferido aqui.
 */
export async function GET(requisicao: Request) {
  const parametros = new URL(requisicao.url).searchParams
  const modo = parametros.get("hub.mode")
  const token = parametros.get("hub.verify_token")
  const desafio = parametros.get("hub.challenge")

  if (modo === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(desafio ?? "", { status: 200, headers: { "Content-Type": "text/plain" } })
  }

  return NextResponse.json({ erro: "não autorizado" }, { status: 403 })
}

/**
 * Mensagens recebidas.
 *
 * Aceita os mesmos fluxos do Telegram, e mais um: conversa. Quem escreve algo
 * que não é gasto nem comando recebe resposta do motor do Tino, com os números
 * da própria conta.
 *
 * Responde 200 em qualquer situação, inclusive em erro. A Meta reenvia o
 * evento quando não recebe 200, e um erro nosso viraria a mesma mensagem
 * chegando repetidas vezes — ou seja, o gasto lançado várias vezes.
 */
export async function POST(requisicao: Request) {
  const evento = (await requisicao.json().catch(() => ({}))) as EventoWhatsApp
  const mensagem = primeiraMensagem(evento)
  if (!mensagem) return NextResponse.json({ ok: true })

  const telefone = mensagem.from
  const texto = (mensagem.text?.body ?? "").trim()

  try {
    await tratar(telefone, texto, mensagem)
  } catch (excecao) {
    console.error("[tino] falha no webhook do WhatsApp", excecao)
    await responder(telefone, "Deu problema aqui do meu lado. Tente de novo em instantes.").catch(() => {})
  }

  return NextResponse.json({ ok: true })
}

async function tratar(telefone: string, texto: string, mensagem: NonNullable<ReturnType<typeof primeiraMensagem>>) {
  // ── Ligar a conversa ao lar ─────────────────────────────
  const conectar = /^\/?conectar\s+(\S+)/i.exec(texto)
  if (conectar) {
    const chave = await autenticarChave(conectar[1])
    if (!chave) {
      await responder(telefone, "Chave inválida. Gere outra em Configurações → Captura rápida.")
      return
    }

    await prisma.chaveCaptura.update({
      where: { id: chave.id },
      data: { chatId: telefone, origem: "WHATSAPP" },
    })

    await responder(
      telefone,
      "Pronto, conversa conectada.\n\nAgora você pode:\n• anotar um gasto: *mercado 52,30*\n• encaminhar a notificação de compra do banco\n• mandar o arquivo da fatura (PDF, CSV ou OFX)\n• perguntar o que quiser: *quanto eu tenho hoje?*",
    )
    return
  }

  // Sem vínculo não há como saber de quem é o dinheiro, e adivinhar seria
  // lançar na conta de outra pessoa.
  const chave = await prisma.chaveCaptura.findFirst({ where: { chatId: telefone, ativa: true } })
  if (!chave) {
    await responder(
      telefone,
      "Ainda não sei de quem é esta conversa. No app, vá em Configurações → Captura rápida, gere uma chave e me mande aqui:\n\n`conectar SUA_CHAVE`",
    )
    return
  }

  await prisma.chaveCaptura.update({
    where: { id: chave.id },
    data: { ultimoUso: new Date(), usos: { increment: 1 } },
  })

  // ── Arquivo: extrato ou fatura ──────────────────────────
  if (mensagem.document) {
    await tratarDocumento(telefone, chave.larId, mensagem.document)
    return
  }

  // ── Áudio: a pessoa falou em vez de escrever ────────────
  if (mensagem.audio) {
    const falado = await tratarAudio(telefone, mensagem.audio)
    if (!falado) return
    // O id da mensagem segue junto: a Meta reentrega o mesmo áudio quando o
    // webhook falha, e sem ele o gasto entraria duas vezes.
    await tratarTexto(telefone, chave.larId, chave.id, falado, mensagem.id ?? null)
    return
  }

  if (mensagem.image) {
    await responder(
      telefone,
      "Ainda não leio foto de comprovante. Me manda o valor por escrito (ex.: *farmácia 38,90*) ou o arquivo da fatura.",
    )
    return
  }

  if (!texto) return

  if (/^\/?(ajuda|help|menu|oi|ol[áa])$/i.test(texto)) {
    await responder(
      telefone,
      "Sou o Tino. Por aqui você pode:\n• anotar um gasto: *mercado 52,30*\n• encaminhar a notificação de compra do banco\n• mandar o arquivo da fatura (PDF, CSV ou OFX)\n• perguntar sobre suas contas: *quanto eu tenho hoje?*",
    )
    return
  }

  await tratarTexto(telefone, chave.larId, chave.id, texto, mensagem.id ?? null)
}

/**
 * Baixa e transcreve o áudio, ou explica por que não deu.
 *
 * Devolve `null` quando já respondeu à pessoa e não há texto para seguir.
 */
async function tratarAudio(telefone: string, audio: { id: string; mime_type?: string }): Promise<string | null> {
  try {
    const arquivo = await baixarMidia(audio.id)
    const falado = await transcrever(arquivo.conteudo, arquivo.nome)
    // Mostrar o que foi entendido antes de agir: transcrição erra, e a pessoa
    // precisa ver o valor que vai virar lançamento sem ter que abrir o app.
    await responder(telefone, `Entendi: _${falado}_`)
    return falado
  } catch (excecao) {
    const recado =
      excecao instanceof AudioIndisponivel
        ? "Ainda não escuto áudio por aqui. Me manda por escrito (ex.: *mercado 52,30*)."
        : excecao instanceof AudioLongoDemais
          ? "Esse áudio é comprido demais. Manda um recadinho curto, só o gasto."
          : excecao instanceof AudioVazio
            ? "Não consegui ouvir nada nesse áudio. Grava de novo ou escreve o valor."
            : "Não consegui entender esse áudio. Tenta escrever o gasto."
    await responder(telefone, recado)
    return null
  }
}

/** Caminho comum do que a pessoa disse, tendo digitado ou falado. */
async function tratarTexto(telefone: string, larId: string, chaveId: string, texto: string, mensagemId: string | null) {
  // ── Pergunta ou lançamento ──────────────────────────────
  //
  // A distinção decide tudo: tratar pergunta como gasto criaria lançamento do
  // nada, e tratar gasto como pergunta perderia o registro. Texto terminado em
  // interrogação, ou começando com palavra de pergunta, é conversa.
  // Procurar papel vem antes de responder sobre dinheiro: "acha o comprovante
  // do aluguel" passaria pelo motor de regras como pergunta qualquer e sairia
  // com um panorama que ninguém pediu.
  if (ehBuscaDeDocumento(texto)) {
    await responder(telefone, await procurarDocumento(larId, texto))
    return
  }

  if (ehPergunta(texto)) {
    const panorama = await montarPanorama(larId, competenciaAtual())
    const resposta = responderPorRegras(texto, panorama)

    await responder(
      telefone,
      resposta?.texto ??
        "Essa eu ainda não sei responder por aqui. No app, a tela de Análise tem o parecer completo.",
    )
    return
  }

  // Notificação encaminhada tem cara de aviso de banco; o resto é texto que a
  // pessoa escreveu. Os dois leitores são diferentes, e o errado erra o valor.
  const pareceNotificacao = /R\$|compra|aprovad|cart[aã]o|d[eé]bito|pagamento/i.test(texto) && texto.length > 25

  const resultado = await registrarCaptura({
    larId,
    chaveId,
    texto,
    origem: "WHATSAPP",
    textoLivre: !pareceNotificacao,
    // A Meta reentrega a mesma mensagem quando o webhook falha.
    eventoId: mensagemId ? `whatsapp:${mensagemId}` : null,
  })

  await responder(telefone, resultado.resposta)
}

/** Pergunta pede resposta; o resto é lançamento. */
function ehPergunta(texto: string): boolean {
  if (texto.includes("?")) return true
  return /^(quanto|quando|onde|como|qual|quais|quem|por que|porque|vale a pena|posso|devo|d[áa] para)\b/i.test(texto)
}

async function tratarDocumento(
  telefone: string,
  larId: string,
  documento: { id: string; filename?: string; mime_type?: string },
) {
  const conta = await prisma.conta.findFirst({
    where: { larId, arquivada: false },
    // Fatura quase sempre é de cartão: começar por ele acerta na maioria, e o
    // app permite trocar a conta depois.
    orderBy: { tipo: "asc" },
  })

  if (!conta) {
    await responder(telefone, "Você ainda não tem contas cadastradas no app. Cadastre uma e mande de novo.")
    return
  }

  try {
    const arquivo = await baixarMidia(documento.id)

    if (arquivo.conteudo.byteLength > TAMANHO_MAXIMO) {
      await responder(telefone, "Esse arquivo é grande demais (limite de 10 MB).")
      return
    }

    const nome = documento.filename ?? arquivo.nome
    const formato = detectarFormato(nome, new TextDecoder().decode(arquivo.conteudo.slice(0, 2000)))

    const previa = await previaImportacao({
      larId,
      contaId: conta.id,
      arquivoNome: nome,
      conteudo: arquivo.conteudo,
      faturaCartao: conta.tipo === "CARTAO_CREDITO",
    })

    if (previa.novas === 0) {
      await responder(
        telefone,
        previa.total === 0
          ? "Não achei lançamentos nesse arquivo. Se for um PDF com senha, use a tela Importar do app."
          : `Todos os ${previa.total} lançamentos desse arquivo já estavam no app. Nada duplicado.`,
      )
      return
    }

    const importacao = await confirmarImportacao({
      larId,
      contaId: conta.id,
      arquivoNome: nome,
      formato,
      lancamentos: previa.lancamentos.map((lancamento) => ({
        data: lancamento.data.toISOString(),
        descricao: lancamento.descricaoSugerida,
        descricaoOriginal: lancamento.descricao,
        valorCentavos: lancamento.valorCentavos,
        tipo: lancamento.tipo,
        categoriaId: lancamento.categoriaId ?? null,
        hashImport: lancamento.hashImport,
        duplicada: lancamento.duplicada,
      })),
    })

    const total = previa.lancamentos
      .filter((lancamento) => !lancamento.duplicada && lancamento.tipo === "DESPESA")
      .reduce((soma, lancamento) => soma + lancamento.valorCentavos, 0)

    await responder(
      telefone,
      [
        `Importei *${importacao.importadas}* lançamento(s) em ${conta.nome}.`,
        `Total de gastos: *${formatarMoeda(total)}*.`,
        previa.duplicadas > 0 ? `${previa.duplicadas} já existiam e foram ignorados.` : "",
        previa.semCategoria > 0 ? `${previa.semCategoria} ficaram sem categoria — vale conferir no app.` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    )
  } catch (excecao) {
    // Senha de PDF não passa por mensageiro: fica guardada no aparelho e no
    // servidor da Meta.
    const recado =
      excecao instanceof PdfProtegido
        ? "Esse PDF tem senha. Por segurança não recebo senha por aqui — mande o arquivo pelo app, em Importar, que lá eu pergunto."
        : "Não consegui ler esse arquivo. Tente mandar o OFX ou o CSV do banco."
    await responder(telefone, recado)
  }
}
