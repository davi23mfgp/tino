import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { formatarMoeda } from "@/lib/dinheiro"
import { autenticarChave, hashDeChave, registrarCaptura } from "@/lib/captura"
import { baixarArquivo, responder, type AtualizacaoTelegram } from "@/lib/captura/telegram"
import { confirmarImportacao, detectarFormato, previaImportacao } from "@/lib/importar"
import { PdfProtegido } from "@/lib/importar/pdf"

export const dynamic = "force-dynamic"

/// Fatura de um ano cabe folgado nisso; acima é arquivo errado.
const TAMANHO_MAXIMO = 10 * 1024 * 1024

/**
 * Webhook do bot.
 *
 * O Telegram entrega qualquer atualização para esta URL, então ela é protegida
 * por um segredo na própria rota (`?segredo=`) — sem isso, qualquer pessoa que
 * descobrisse o endereço poderia lançar gastos na conta de alguém.
 *
 * Fluxos aceitos:
 * - `/conectar <chave>` — liga esta conversa ao lar, uma vez só;
 * - texto livre ("mercado 52,30") — vira gasto pendente de conferência;
 * - notificação encaminhada do banco — lida pelo mesmo leitor do celular;
 * - PDF, CSV ou OFX — importado como extrato ou fatura.
 */
export async function POST(requisicao: Request) {
  const segredo = new URL(requisicao.url).searchParams.get("segredo")
  if (!process.env.TELEGRAM_WEBHOOK_SEGREDO || segredo !== process.env.TELEGRAM_WEBHOOK_SEGREDO) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 })
  }

  const atualizacao = (await requisicao.json().catch(() => ({}))) as AtualizacaoTelegram
  const mensagem = atualizacao.message
  if (!mensagem) return NextResponse.json({ ok: true })

  const chatId = String(mensagem.chat.id)
  const texto = (mensagem.text ?? mensagem.caption ?? "").trim()

  // ── Ligar a conversa ao lar ─────────────────────────────
  const conectar = /^\/conectar\s+(\S+)/i.exec(texto)
  if (conectar) {
    const chave = await autenticarChave(conectar[1])
    if (!chave) {
      await responder(chatId, "Chave inválida. Gere outra em Configurações → Captura rápida.")
      return NextResponse.json({ ok: true })
    }

    await prisma.chaveCaptura.update({
      where: { id: chave.id },
      data: { chatId, origem: "TELEGRAM" },
    })

    await responder(
      chatId,
      "Pronto, conversa conectada.\n\nAgora você pode:\n• escrever <b>mercado 52,30</b> para anotar um gasto\n• encaminhar a notificação de compra do banco\n• mandar o PDF, CSV ou OFX da fatura",
    )
    return NextResponse.json({ ok: true })
  }

  // A conversa precisa ter sido ligada antes: sem isso não há como saber de
  // quem é o dinheiro, e adivinhar seria lançar na conta errada.
  const chave = await prisma.chaveCaptura.findFirst({ where: { chatId, ativa: true } })
  if (!chave) {
    await responder(
      chatId,
      "Ainda não sei de quem é esta conversa. No app, vá em Configurações → Captura rápida, gere uma chave e me mande aqui:\n\n<code>/conectar SUA_CHAVE</code>",
    )
    return NextResponse.json({ ok: true })
  }

  await prisma.chaveCaptura.update({
    where: { id: chave.id },
    data: { ultimoUso: new Date(), usos: { increment: 1 } },
  })

  // ── Arquivo: extrato ou fatura ──────────────────────────
  const documento = mensagem.document
  if (documento) {
    if ((documento.file_size ?? 0) > TAMANHO_MAXIMO) {
      await responder(chatId, "Esse arquivo é grande demais (limite de 10 MB).")
      return NextResponse.json({ ok: true })
    }

    const conta = await prisma.conta.findFirst({
      where: { larId: chave.larId, arquivada: false },
      // Fatura quase sempre é de cartão: começar por ele acerta na maioria, e
      // o app permite trocar a conta depois.
      orderBy: { tipo: "asc" },
    })

    if (!conta) {
      await responder(chatId, "Você ainda não tem contas cadastradas no app. Cadastre uma e mande de novo.")
      return NextResponse.json({ ok: true })
    }

    try {
      const arquivo = await baixarArquivo(documento.file_id)
      const nome = documento.file_name ?? arquivo.nome
      const formato = detectarFormato(nome, new TextDecoder().decode(arquivo.conteudo.slice(0, 2000)))

      const previa = await previaImportacao({
        larId: chave.larId,
        contaId: conta.id,
        arquivoNome: nome,
        conteudo: arquivo.conteudo,
        faturaCartao: conta.tipo === "CARTAO_CREDITO",
      })

      if (previa.novas === 0) {
        await responder(
          chatId,
          previa.total === 0
            ? "Não achei lançamentos nesse arquivo. Se for um PDF com senha, me diga a senha pelo app em Importar."
            : `Todos os ${previa.total} lançamentos desse arquivo já estavam no app. Nada duplicado.`,
        )
        return NextResponse.json({ ok: true })
      }

      const importacao = await confirmarImportacao({
        larId: chave.larId,
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
        chatId,
        [
          `Importei <b>${importacao.importadas}</b> lançamento(s) em ${conta.nome}.`,
          `Total de gastos: <b>${formatarMoeda(total)}</b>.`,
          previa.duplicadas > 0 ? `${previa.duplicadas} já existiam e foram ignorados.` : "",
          previa.semCategoria > 0 ? `${previa.semCategoria} ficaram sem categoria — vale conferir no app.` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      )
    } catch (excecao) {
      // Senha de PDF não passa pelo Telegram: mensagem em chat fica no
      // histórico do aparelho e do servidor do mensageiro.
      const recado =
        excecao instanceof PdfProtegido
          ? "Esse PDF tem senha. Por segurança não recebo senha por aqui — mande o arquivo pelo app, em Importar, que lá eu pergunto."
          : "Não consegui ler esse arquivo. Tente mandar o OFX ou o CSV do banco."
      await responder(chatId, recado)
    }

    return NextResponse.json({ ok: true })
  }

  if (mensagem.photo?.length) {
    await responder(
      chatId,
      "Ainda não leio foto de comprovante. Me manda o valor por escrito (ex.: <b>farmácia 38,90</b>) ou o arquivo da fatura.",
    )
    return NextResponse.json({ ok: true })
  }

  // ── Texto ───────────────────────────────────────────────
  if (!texto) return NextResponse.json({ ok: true })

  if (/^\/(start|ajuda|help)/i.test(texto)) {
    await responder(
      chatId,
      "Sou o Tino. Por aqui você pode:\n• anotar um gasto: <b>mercado 52,30</b>\n• encaminhar a notificação de compra do banco\n• mandar o arquivo da fatura (PDF, CSV ou OFX)",
    )
    return NextResponse.json({ ok: true })
  }

  // Notificação encaminhada tem cara de aviso de banco; o resto é texto que a
  // pessoa escreveu. Os dois leitores são diferentes, e usar o errado erra o valor.
  const pareceNotificacao = /R\$|compra|aprovad|cart[aã]o|d[eé]bito|pagamento/i.test(texto) && texto.length > 25

  const resultado = await registrarCaptura({
    larId: chave.larId,
    chaveId: chave.id,
    texto,
    origem: "TELEGRAM",
    textoLivre: !pareceNotificacao,
  })

  await responder(chatId, resultado.resposta)
  return NextResponse.json({ ok: true })
}
