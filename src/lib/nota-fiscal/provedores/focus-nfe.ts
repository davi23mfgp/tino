/**
 * Provedor Focus NFe — emissão de NFC-e por API.
 *
 * Pesquisado em 03/09/2026 direto na doc oficial (doc.focusnfe.com.br):
 * autenticação HTTP Basic (token da empresa como usuário, senha em branco),
 * `POST /v2/nfce?ref=` para emitir, `GET /v2/nfce/{ref}` para consultar,
 * `DELETE /v2/nfce/{ref}` para cancelar. Ainda não contratado — ver
 * docs/TINO-MEI.md, Fase 6. Escrito agora para não travar em código no dia
 * em que o Davi assinar; mesmo raciocínio do Pluggy em `open-finance/`.
 *
 * Peculiaridade real da API: emissão rejeitada pela SEFAZ também responde
 * HTTP 201 — quem diferencia sucesso de rejeição é o campo `status` no corpo,
 * não o código HTTP. Ignorar isso faria toda rejeição parecer emitida.
 */

import type { DadosParaEmissao, EmissorDeNotaFiscal, NotaEmitida, PagamentoDaNota } from "@/lib/nota-fiscal/tipos"

const AMBIENTE = (process.env.FOCUS_NFE_AMBIENTE || "homologacao").toLowerCase()
const BASE = AMBIENTE === "producao" ? "https://api.focusnfe.com.br" : "https://homologacao.focusnfe.com.br"

/// Tabela oficial da SEFAZ para NFC-e (tpPag), não invenção do Focus NFe.
/// FIADO é aproximação: a venda fiada não tem pagamento no ato, e a tabela
/// não prevê "a prazo sem meio definido" — usa "99" (Outros) até confirmar
/// com o provedor qual código ele espera para esse caso.
const FORMA_PAGAMENTO_SEFAZ: Record<PagamentoDaNota["forma"], string> = {
  DINHEIRO: "01",
  CREDITO_VISTA: "03",
  CREDITO_PARCELADO: "03",
  DEBITO: "04",
  PIX: "17",
  FIADO: "99",
}

function token(): string {
  const valor = process.env.FOCUS_NFE_TOKEN
  if (!valor) throw new Error("Nota fiscal: FOCUS_NFE_TOKEN não configurado.")
  return valor
}

async function chamar(caminho: string, opcoes: { metodo: "GET" | "POST" | "DELETE"; corpo?: unknown }) {
  const resposta = await fetch(`${BASE}${caminho}`, {
    method: opcoes.metodo,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${token()}:`).toString("base64")}`,
    },
    body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined,
  })

  const dados = await resposta.json()
  if (!resposta.ok) {
    throw new Error(`Focus NFe: falha na chamada (${resposta.status}): ${dados?.mensagem ?? "sem detalhe"}.`)
  }
  return dados
}

function centavosParaReais(centavos: number): number {
  return Math.round(centavos) / 100
}

function montarCorpoDeEmissao(dados: DadosParaEmissao) {
  return {
    cnpj_emitente: dados.cnpj,
    data_emissao: new Date().toISOString(),
    // Venda de balcão presencial: comprador presente, sem frete, dentro do
    // estado. É o caso real do Tino.mei (ver docs/TINO-MEI.md) — loja física
    // vendendo no balcão, não venda remota.
    presenca_comprador: "1",
    modalidade_frete: "9",
    local_destino: "1",
    natureza_operacao: "VENDA AO CONSUMIDOR",
    items: dados.itens.map((item, indice) => ({
      numero_item: String(indice + 1),
      codigo_ncm: item.ncm,
      codigo_produto: String(indice + 1),
      descricao: item.descricao,
      quantidade_comercial: item.quantidade,
      quantidade_tributavel: item.quantidade,
      // CFOP de venda de mercadoria adquirida de terceiros, dentro do estado
      // — o caso do MEI comércio que revende, não fabrica (ver TINO-MEI.md:
      // "Não é o MEI prestador de serviço").
      cfop: "5102",
      valor_unitario_comercial: centavosParaReais(item.precoUnitarioCentavos),
      valor_unitario_tributavel: centavosParaReais(item.precoUnitarioCentavos),
      valor_bruto: centavosParaReais(item.precoUnitarioCentavos * item.quantidade),
      unidade_comercial: "un",
      unidade_tributavel: "un",
      // Origem nacional e tributação do Simples Nacional sem permissão de
      // crédito — o regime de todo MEI, que é o único público desta fase
      // (ver docs/TINO-MEI.md).
      icms_origem: "0",
      icms_situacao_tributaria: "102",
    })),
    formas_pagamento: dados.pagamentos.map((pagamento) => ({
      forma_pagamento: FORMA_PAGAMENTO_SEFAZ[pagamento.forma],
      valor_pagamento: centavosParaReais(pagamento.valorCentavos),
    })),
  }
}

interface RespostaFocusNfe {
  status: "autorizado" | "erro_autorizacao" | "denegado" | "processando_autorizacao" | "cancelado"
  status_sefaz?: string
  mensagem_sefaz?: string
  chave_nfe?: string
  numero?: string
  serie?: string
  caminho_xml_nota_fiscal?: string
}

export const emissorFocusNfe: EmissorDeNotaFiscal = {
  nome: "focus_nfe",

  async emitir(dados: DadosParaEmissao): Promise<NotaEmitida> {
    const ref = `tino-venda-${dados.numeroVenda}`
    const resultado = (await chamar(`/v2/nfce?ref=${ref}`, {
      metodo: "POST",
      corpo: montarCorpoDeEmissao(dados),
    })) as RespostaFocusNfe

    // Rejeição da SEFAZ vem com HTTP 201 igual sucesso — só o campo `status`
    // no corpo diferencia. Tratar como sucesso aqui faria toda nota rejeitada
    // parecer emitida pro lojista.
    if (resultado.status !== "autorizado") {
      throw new Error(resultado.mensagem_sefaz || `Focus NFe: emissão não autorizada (${resultado.status}).`)
    }

    const xml = resultado.caminho_xml_nota_fiscal
      ? await fetch(`${BASE}${resultado.caminho_xml_nota_fiscal}`).then((resposta) => resposta.text())
      : ""

    return {
      chaveAcesso: resultado.chave_nfe as string,
      numero: Number(resultado.numero),
      serie: Number(resultado.serie),
      xml,
    }
  },

  async cancelar(params: { chaveAcesso: string; justificativa: string }): Promise<void> {
    if (params.justificativa.length < 15) {
      throw new Error("Justificativa do cancelamento precisa de ao menos 15 caracteres (exigência da SEFAZ).")
    }
    // Focus NFe cancela pela `ref` usada na emissão, não pela chave de acesso
    // — por isso `emitirNotaDaVenda` precisa guardar a `ref` se quiser cancelar
    // por aqui depois. Ainda não guardada (ver NotaFiscalVenda no schema);
    // fica para quando a Fase 6 sair do esqueleto de verdade.
    throw new Error("Cancelamento pelo Focus NFe ainda não ligado: falta guardar a ref da emissão.")
  },
}
