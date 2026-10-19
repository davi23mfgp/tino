"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ReceiptText, X } from "lucide-react"

import { enviar } from "@/lib/cliente"
import { formatarMoeda } from "@/lib/dinheiro"
import { showToast } from "@/components/ui/toast"
import { AnotarRapidoHoje } from "@/components/anotar-rapido"
import { SeletorCategoria, type CategoriaSelecionavel } from "@/components/seletor-categoria"

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
export function ConferirNoInicio({ capturas, total, contaPadraoId, categorias }: { capturas: CapturaNoInicio[]; total: number; contaPadraoId: string | null; categorias: CategoriaSelecionavel[] }) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState(false)
  const [feitas, setFeitas] = useState<string[]>([])
  const [escolhidas, setEscolhidas] = useState<Record<string, string | null>>({})
  const restantes = capturas.filter((captura) => !feitas.includes(captura.id))
  const atual = restantes[0]
  if (!atual) return null
  const categoriaId = atual.id in escolhidas ? escolhidas[atual.id] : atual.categoriaId

  async function decidir(confirmar: boolean) {
    setOcupado(true)
    try {
      if (confirmar) {
        await enviar("/api/capturas", {
          capturaId: atual.id,
          contaId: atual.contaId ?? contaPadraoId ?? undefined,
          categoriaId: categoriaId ?? undefined,
          valorCentavos: atual.valorCentavos ?? undefined,
          descricao: atual.estabelecimento ?? undefined,
          criarRegra: Boolean(categoriaId),
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
          <div className={estilos.categoriaConferir}>
            <SeletorCategoria opcoes={categorias} valor={categoriaId} aoMudar={(id) => setEscolhidas((atuais) => ({ ...atuais, [atual.id]: id }))} vazio="escolher a categoria" desabilitado={ocupado} />
          </div>
          <div className={estilos.botoesConferir}>
            <button type="button" disabled={ocupado} onClick={() => void decidir(false)}><X aria-hidden />Não foi</button>
            <button type="button" disabled={ocupado} onClick={() => void decidir(true)} data-principal><Check aria-hidden />Confirmar</button>
          </div>
        </div>
      </div>
      <div className={estilos.anotarNoPainel}>
        <header><h3>Anotar agora</h3><p>Digite ou dite. Depois, confira aqui.</p></header>
        <AnotarRapidoHoje />
      </div>
    </section>
  )
}

function Reais({ centavos }: { centavos: number }) {
  const texto = formatarMoeda(centavos)
  const virgula = texto.lastIndexOf(",")
  return <span className="valor-sensivel">{texto.slice(0, virgula)}<small>{texto.slice(virgula)}</small></span>
}
