"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CalendarDays, NotebookPen, Phone, ShoppingBag, Store, Wallet } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda } from "@/lib/dinheiro"
import { showToast } from "@/components/ui/toast"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import estilos from "./simples.module.css"

interface Resumo { brutoCentavos: number; vendas: number }

const BLOCOS = [
  { rota: "/loja", rotulo: "Vender", Icone: ShoppingBag, principal: true },
  { rota: "/loja/fiado", rotulo: "Fiado", Icone: NotebookPen },
  { rota: "/loja/agenda", rotulo: "Agenda de hoje", Icone: CalendarDays },
  { rota: "/loja/financas", rotulo: "Quanto tenho", Icone: Wallet },
  { rota: "/mei", rotulo: "Pagar o DAS", Icone: Store },
] as const

const reaisInteiros = (centavos: number) => formatarMoeda(centavos).replace(/ /g, " ")

export function BlocosSimples({ nome, ajudaNome, ajudaTelefone }: { nome: string; ajudaNome: string | null; ajudaTelefone: string | null }) {
  const [hoje, setHoje] = useState<{ atual: Resumo; anterior: Resumo } | null>(null)
  const [falhou, setFalhou] = useState(false)
  const [ajuda, setAjuda] = useState({ nome: ajudaNome, telefone: ajudaTelefone })
  const [escolher, setEscolher] = useState(false)

  useEffect(() => {
    buscar<{ atual: Resumo; anterior: Resumo }>("/api/loja/painel?periodo=dia").then(setHoje).catch(() => setFalhou(true))
  }, [])

  const mensagem = encodeURIComponent(`Oi${ajuda.nome ? `, ${ajuda.nome.split(" ")[0]}` : ""}! Preciso de ajuda com o Tino.`)
  const centavos = hoje?.atual.brutoCentavos ?? 0
  const [inteiro, cents] = reaisInteiros(centavos).split(",")

  return (
    <div className={estilos.pagina}>
      <header className={estilos.topo}>
        <h1>Oi, {nome}</h1>
      </header>

      <section className={estilos.hoje} aria-live="polite">
        <span>Hoje você vendeu</span>
        {hoje ? (
          <>
            <strong>{inteiro}<small>,{cents}</small></strong>
            {/* A referência de sempre: o mesmo dia de ontem, para o número dizer alguma coisa. */}
            <span>ontem: {reaisInteiros(hoje.anterior.brutoCentavos)}</span>
          </>
        ) : falhou ? (
          <span>Não consegui ver as vendas de hoje agora.</span>
        ) : (
          <span>Somando as vendas de hoje…</span>
        )}
      </section>

      <nav className={estilos.blocos} aria-label="O que você quer fazer">
        {BLOCOS.map(({ rota, rotulo, Icone, ...resto }) => (
          <Link key={rota} href={rota} className={estilos.bloco} data-principal={"principal" in resto ? "" : undefined}>
            <Icone aria-hidden />
            <span>{rotulo}</span>
          </Link>
        ))}
        {ajuda.telefone ? (
          // O WhatsApp de quem a pessoa escolheu, por link: não é integração do Tino.
          <a className={estilos.bloco} data-ajuda="" href={`https://wa.me/55${ajuda.telefone}?text=${mensagem}`} target="_blank" rel="noopener noreferrer">
            <Phone aria-hidden />
            <span>Pedir ajuda{ajuda.nome ? <small>{ajuda.nome}</small> : null}</span>
          </a>
        ) : (
          <button type="button" className={estilos.bloco} data-ajuda="" onClick={() => setEscolher(true)}>
            <Phone aria-hidden />
            <span>Pedir ajuda<small>escolher quem</small></span>
          </button>
        )}
      </nav>

      <Link href="/loja/painel" className={estilos.tudo}>Ver tudo (modo completo)</Link>

      <EscolherAjuda aberto={escolher} aoFechar={() => setEscolher(false)} aoSalvar={(dados) => { setAjuda(dados); setEscolher(false) }} />
    </div>
  )
}

export function EscolherAjuda({ aberto, aoFechar, aoSalvar, inicial }: { aberto: boolean; aoFechar: () => void; aoSalvar: (dados: { nome: string | null; telefone: string | null }) => void; inicial?: { nome: string | null; telefone: string | null } }) {
  const [nome, setNome] = useState(inicial?.nome ?? "")
  const [telefone, setTelefone] = useState(inicial?.telefone ?? "")
  const [ocupado, setOcupado] = useState(false)

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault()
    setOcupado(true)
    try {
      const salvo = await enviar<{ ajudaNome: string | null; ajudaTelefone: string | null }>("/api/loja/modo-simples", { ajudaNome: nome, ajudaTelefone: telefone }, "PUT")
      showToast(salvo.ajudaTelefone ? `Pronto: "Pedir ajuda" chama ${salvo.ajudaNome ?? "esse número"}.` : "Contato apagado.")
      aoSalvar({ nome: salvo.ajudaNome, telefone: salvo.ajudaTelefone })
    } catch (falha) {
      showToast(falha instanceof Error ? (falha.message.includes("ajudaTelefone") ? "Confira o telefone: com DDD, só números." : falha.message) : "Não consegui salvar.", { variant: "error" })
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(abrir) => !abrir && aoFechar()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Quem te ajuda?</DialogTitle>
          <DialogDescription>O botão &quot;Pedir ajuda&quot; abre o WhatsApp dessa pessoa com a mensagem pronta.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <form onSubmit={salvar} className={estilos.form}>
            <label>Nome<input id="ajuda-nome" value={nome} onChange={(evento) => setNome(evento.target.value)} placeholder="Joana (filha)" maxLength={60} /></label>
            <label>WhatsApp com DDD<input id="ajuda-telefone" value={telefone} onChange={(evento) => setTelefone(evento.target.value)} placeholder="(31) 99123-4567" inputMode="tel" maxLength={30} /></label>
            <button type="submit" className={estilos.salvar} disabled={ocupado || !telefone.trim()}>Salvar</button>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
