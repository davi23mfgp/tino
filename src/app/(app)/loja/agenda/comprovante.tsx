"use client"

import { formatarMoeda } from "@/lib/dinheiro"
import { DIAS_DE_GARANTIA, resumoDaEntrada, type EstadoDaPeca } from "@/lib/loja/assistencia"
import { numeroDaOrdem } from "@/lib/loja/agenda"
import type { TipoDeAparelho } from "@/lib/loja/modelos"

interface OrdemDoComprovante {
  numero: number
  objeto: string
  servico: string
  naEntrada: string | null
  prazoEm: string | null
  valorCentavos: number | null
  criadoEm: string
  cliente: { nome: string; telefone: string | null }
  aparelhoModelo: string | null
  aparelhoCor: string | null
  aparelhoSerie: string | null
  aparelhoTipo: TipoDeAparelho | null
  acessorios: string[]
  estadoEntrada: Record<string, EstadoDaPeca>
  entradaConferidaEm: string | null
  entradaContestada: string | null
  qr: string
}

/** O que a ficha diz sobre a conferência do cliente, com o tom do aviso. */
export function conferenciaDoCliente(ordem: Pick<OrdemDoComprovante, "entradaConferidaEm" | "entradaContestada">): { texto: string; tom?: "bom" | "atencao" } {
  if (ordem.entradaConferidaEm) return { texto: `O cliente conferiu a entrada pelo link em ${new Date(ordem.entradaConferidaEm).toLocaleDateString("pt-BR")}.`, tom: "bom" }
  if (ordem.entradaContestada) return { texto: `O cliente disse que a entrada está errada: “${ordem.entradaContestada}”`, tom: "atencao" }
  return { texto: "O cliente ainda não conferiu a entrada. Mostre o QR ou mande o link." }
}

/**
 * O comprovante impresso da entrada: o papel que a assistência sempre deu,
 * agora com o QR do acompanhamento. Só aparece na impressão (a classe
 * `comprovante-impressao`, em globals.css, esconde o resto da tela).
 */
export function ComprovanteDeEntrada({ loja, ordem }: { loja: { nome: string; telefone: string | null }; ordem: OrdemDoComprovante }) {
  const resumo = ordem.aparelhoTipo ? resumoDaEntrada(ordem.estadoEntrada, ordem.aparelhoTipo) : null
  const data = (iso: string) => new Date(iso).toLocaleDateString("pt-BR")
  return (
    <div className="comprovante-impressao" aria-hidden>
      <header>
        <div>
          <h1>{loja.nome}</h1>
          {loja.telefone && <p>{loja.telefone}</p>}
        </div>
        <div><small>Ordem de serviço</small><strong>{numeroDaOrdem(ordem.numero)}</strong><small>entrada em {data(ordem.criadoEm)}</small></div>
      </header>
      <section className="comprovante-dois">
        <div>
          <p><b>Cliente:</b> {ordem.cliente.nome}{ordem.cliente.telefone ? ` · ${ordem.cliente.telefone}` : ""}</p>
          <p><b>Aparelho:</b> {[ordem.aparelhoModelo, ordem.aparelhoCor].filter(Boolean).join(" · ") || ordem.objeto}</p>
          {ordem.aparelhoSerie && <p><b>IMEI ou série:</b> {ordem.aparelhoSerie}</p>}
          <p><b>Ficou junto:</b> {ordem.acessorios.length ? ordem.acessorios.join(", ") : "nada além do aparelho"}</p>
          <p><b>Serviço:</b> {ordem.servico}</p>
          {ordem.prazoEm && <p><b>Previsão:</b> {data(ordem.prazoEm)}</p>}
          <p><b>Valor:</b> {ordem.valorCentavos !== null ? formatarMoeda(ordem.valorCentavos) : "depois do diagnóstico, com a sua aprovação"}</p>
        </div>
        <div className="comprovante-qr">
          <div dangerouslySetInnerHTML={{ __html: ordem.qr }} />
          <small>Aponte a câmera para acompanhar o conserto</small>
        </div>
      </section>
      {resumo && (
        <section>
          <p><b>Como chegou</b></p>
          {resumo.defeito.length > 0 && <p>Não funciona: {resumo.defeito.join(", ")}</p>}
          {resumo.ok.length > 0 && <p>Funciona: {resumo.ok.join(", ")}</p>}
          {resumo.naoTestado.length > 0 && <p>Não deu para testar: {resumo.naoTestado.join(", ")}</p>}
          {ordem.naEntrada && <p>Observação: {ordem.naEntrada}</p>}
        </section>
      )}
      <section className="comprovante-regras">
        <p>O serviço só começa depois que você aprovar o orçamento (Código de Defesa do Consumidor, art. 40).</p>
        <p>Garantia do conserto: {DIAS_DE_GARANTIA} dias a partir da entrega (Código de Defesa do Consumidor, art. 26).</p>
      </section>
      <footer>
        <span>Assinatura do cliente</span>
        <span>Assinatura da loja</span>
      </footer>
    </div>
  )
}
