"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ReceiptText, X } from "lucide-react"

import { enviar } from "@/lib/cliente"
import { formatarMoeda } from "@/lib/dinheiro"
import { showToast } from "@/components/ui/toast"

import estilos from "./inicio.module.css"

export interface CapturaNoInicio {
  id: string
  estabelecimento: string | null
  valorCentavos: number | null
  quando: string
  via: string
  contaId: string | null
  categoriaId: string | null
  categoriaNome: string | null
}

/**
 * Uma compra por vez, com os dois botões à mão (opção C do Início).
 *
 * A lista de quatro linhas mandava para /capturas para decidir. Aqui a decisão
 * é na própria tela: "Não foi" descarta, "Confirmar" lança, com as mesmas
 * chamadas da tela Anotar. O resto da fila continua lá, no "ver todas".
 */
export function ConferirNoInicio({ capturas, total, contaPadraoId }: { capturas: CapturaNoInicio[]; total: number; contaPadraoId: string | null }) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState(false)
  const [feitas, setFeitas] = useState<string[]>([])
  const restantes = capturas.filter((captura) => !feitas.includes(captura.id))
  const atual = restantes[0]
  if (!atual) return null

  async function decidir(confirmar: boolean) {
    setOcupado(true)
    try {
      if (confirmar) {
        await enviar("/api/capturas", {
          capturaId: atual.id,
          contaId: atual.contaId ?? contaPadraoId ?? undefined,
          categoriaId: atual.categoriaId ?? undefined,
          valorCentavos: atual.valorCentavos ?? undefined,
          descricao: atual.estabelecimento ?? undefined,
          criarRegra: Boolean(atual.categoriaId),
        })
        showToast(`${atual.estabelecimento ?? "Compra"} lançada`, { description: formatarMoeda(atual.valorCentavos ?? 0) })
      } else {
        await enviar("/api/capturas", { capturaId: atual.id }, "PATCH")
      }
      setFeitas((lista) => [...lista, atual.id])
      router.refresh()
    } catch (falha) {
      showToast("Não consegui salvar", { description: falha instanceof Error ? falha.message : "Tente de novo.", variant: "error" })
    } finally {
      setOcupado(false)
    }
  }

  const posicao = total - restantes.length + 1
  return (
    <section className={estilos.bloco} aria-labelledby="conferir-titulo" data-area="conferir">
      <header className={estilos.cabeca}>
        <div><h2 id="conferir-titulo">Conferir</h2><p>nada entra no saldo sem você olhar</p></div>
        <Link href="/capturas">{posicao} de {total} →</Link>
      </header>
      <div className={estilos.pilha}>
        <div className={estilos.compraConferir}>
          <div className={estilos.linhaConferir}>
            <span className={estilos.iconeConferir}><ReceiptText aria-hidden /></span>
            <div className="min-w-0"><strong>{atual.estabelecimento ?? "Sem descrição"}</strong><small>{atual.quando} · {atual.via}</small></div>
          </div>
          <p className={estilos.valorConferir}><Reais centavos={atual.valorCentavos ?? 0} /></p>
          <p className={estilos.categoriaConferir}>{atual.categoriaNome ? <>categoria <span>{atual.categoriaNome}</span></> : <em>sem categoria: escolha em Anotar</em>}</p>
          <div className={estilos.botoesConferir}>
            <button type="button" disabled={ocupado} onClick={() => void decidir(false)}><X aria-hidden />Não foi</button>
            <button type="button" disabled={ocupado} onClick={() => void decidir(true)} data-principal><Check aria-hidden />Confirmar</button>
          </div>
        </div>
      </div>
    </section>
  )
}

function Reais({ centavos }: { centavos: number }) {
  const texto = formatarMoeda(centavos)
  const virgula = texto.lastIndexOf(",")
  return <span className="valor-sensivel">{texto.slice(0, virgula)}<small>{texto.slice(virgula)}</small></span>
}
