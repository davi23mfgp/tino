"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { BrickWall, CalendarDays, Car, FileText, NotebookPen, Package, PawPrint, Ruler, Scissors, Shirt, ShoppingBag, ShoppingBasket, Store, UtensilsCrossed, Wrench, Zap } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { AREAS, OUTRA_AREA, SUBAREA_OUTRA, areaPorId, oQueVem, type ItemQueVem } from "@/lib/loja/areas"
import { showToast } from "@/components/ui/toast"

import base from "../clientes/clientes.module.css"
import estilos from "./comecar.module.css"

const ICONE_DA_AREA: Record<string, typeof Wrench> = {
  assistencia: Wrench, beleza: Scissors, moda: Shirt, alimentacao: UtensilsCrossed, obras: BrickWall,
  instalacao: Zap, mercadinho: ShoppingBasket, oficina: Car, pets: PawPrint, costura: Ruler,
}

const ICONE_DO_ITEM: Record<ItemQueVem["icone"], typeof Wrench> = {
  chave: Wrench, documento: FileText, calendario: CalendarDays, sacola: ShoppingBag, caixa: Package, caderno: NotebookPen, loja: Store,
}

/**
 * "O que você faz?" (opção A do passo 38, Davi, 06/10/2026). A área deixa o
 * Tino com a cara do negócio, como os modos do Square; a caixa ao lado diz o
 * que já vem pronto, só com o que existe hoje (`oQueVem`).
 */
export default function Comecar() {
  const router = useRouter()
  const [nome, setNome] = useState<string | null>(null)
  const [area, setArea] = useState<string | null>(null)
  const [subarea, setSubarea] = useState<string | null>(null)
  const [outraTexto, setOutraTexto] = useState("")
  const [salvando, setSalvando] = useState(false)
  // Vindo do cadastro, a área é o passo 2 de 3; o 3 é confirmar os dados da empresa.
  const [noCadastro, setNoCadastro] = useState(false)

  useEffect(() => {
    setNoCadastro(new URLSearchParams(window.location.search).has("inicio"))
    buscar<{ nome: string; area: string | null; subarea: string | null }>("/api/loja/area").then((atual) => {
      setNome(atual.nome)
      setArea(atual.area)
      if (atual.area === OUTRA_AREA.id) setOutraTexto(atual.subarea ?? "")
      else setSubarea(atual.subarea)
    }, () => setNome(""))
  }, [])

  const escolhida = areaPorId(area)
  const ehOutra = area === OUTRA_AREA.id
  const pronta = Boolean(escolhida) && (ehOutra || Boolean(subarea))
  const itens = escolhida && !ehOutra ? oQueVem(escolhida.id) : []

  function escolherArea(id: string) {
    if (id !== area) setSubarea(null)
    setArea(id)
  }

  async function continuar() {
    if (!pronta || !escolhida) return
    setSalvando(true)
    try {
      await enviar("/api/loja/area", { area: escolhida.id, subarea: ehOutra ? outraTexto.trim() || null : subarea }, "PUT")
      router.push(noCadastro ? "/loja/dados" : "/loja/painel")
      router.refresh()
    } catch (falha) {
      showToast(falha instanceof Error ? falha.message : "Não consegui salvar.", { variant: "error" })
      setSalvando(false)
    }
  }

  return (
    <div className={estilos.pagina}>
      <div className={estilos.coluna}>
        {noCadastro && <div className={estilos.passos} aria-label="Passo 2 de 3">
          <div><i data-feito /><i data-feito /><i /></div>
          <span>Passo 2 de 3</span>
        </div>}
        <div className={estilos.titulo}>
          <h1>O que você faz?</h1>
          <p>{nome ? `O Tino arruma o ${nome} para o seu tipo de negócio.` : "O Tino se arruma para o seu tipo de negócio."}</p>
        </div>

        <div className={estilos.areas} role="group" aria-label="Área do negócio">
          {AREAS.map((item) => {
            const Icone = ICONE_DA_AREA[item.id]
            return (
              <button key={item.id} type="button" className={estilos.area} aria-pressed={area === item.id} onClick={() => escolherArea(item.id)}>
                <Icone aria-hidden /><span>{item.nome}</span>
              </button>
            )
          })}
        </div>
        {!ehOutra && <button type="button" className={estilos.outra} onClick={() => escolherArea(OUTRA_AREA.id)}>Minha área não está aqui</button>}

        {escolhida && !ehOutra && (
          <>
            <div className={estilos.pergunta}>{escolhida.nome} de quê?</div>
            <div className={estilos.chips} role="group" aria-label="Tipo do negócio">
              {[...escolhida.subareas, SUBAREA_OUTRA].map((item) => (
                <button key={item} type="button" className={estilos.chip} aria-pressed={subarea === item} onClick={() => setSubarea(item)}>{item}</button>
              ))}
            </div>
          </>
        )}
        {ehOutra && (
          <label className={estilos.coluna}>
            <span className={estilos.pergunta}>Com o que você trabalha?</span>
            <input className={estilos.campo} value={outraTexto} onChange={(evento) => setOutraTexto(evento.target.value)} maxLength={60} placeholder="Ex.: fotografia de festas" />
            <span className={base.dica}>O Tino vem com tudo ligado. Com a sua resposta, a gente vê que áreas criar depois.</span>
          </label>
        )}

      </div>

      {escolhida && !ehOutra && (
        <section className={`${base.bloco} ${estilos.vem}`} aria-label="O que já vem pronto">
          <b>Seu Tino {escolhida.curto} vem assim</b>
          <ul>
            {itens.map((item) => {
              const Icone = ICONE_DO_ITEM[item.icone]
              return <li key={item.texto}><Icone aria-hidden /><span>{item.texto}</span></li>
            })}
          </ul>
          <p>Dá para trocar a área depois, sem perder nada.</p>
        </section>
      )}

      {/* Depois da caixa no celular: quem toca em Continuar já viu o que vem. */}
      <div className={estilos.acao}><button type="button" className={base.botao} data-principal disabled={!pronta || salvando} onClick={() => void continuar()}>{salvando ? "Salvando…" : "Continuar"}</button></div>
    </div>
  )
}
