"use client"

import { useState } from "react"

import { enviar } from "@/lib/cliente"
import { MARCAS } from "@/lib/marcas"
import { Input } from "@/components/ui/input"
import { SeletorEmoji } from "@/components/ui/seletor-emoji"
import { useIdentidades, type Identidade } from "@/components/identidades-visuais"
import estilos from "./logos-das-lojas.module.css"

type Jeito = "site" | "imagem" | "emoji"
const VISIVEIS = 18

/**
 * Logos das lojas (Davi, 28/09: "com possibilidade de colocar logo das lojas,
 * ou uma lista já no sistema, ou uma API que puxe da net").
 *
 * As três coisas: a lista de lojas conhecidas já vem pronta (logo puxado da
 * internet pelo servidor, sem ninguém cadastrar); para as outras, a pessoa
 * associa um logo pelo site da loja — o Tino busca a imagem —, por arquivo ou
 * por emoji. O que ela associa vale antes da lista pronta.
 */
export function LogosDasLojas() {
  const { lista, recarregar } = useIdentidades()
  const [editando, setEditando] = useState<Identidade | "nova" | null>(null)
  const [todas, setTodas] = useState(false)

  async function remover(identidade: Identidade) {
    await enviar("/api/identidades", { id: identidade.id }, "DELETE")
    recarregar()
  }

  return (
    <div className={estilos.logos}>
      <section className={estilos.secao}>
        <p>Os seus · {lista.length}</p>
        {lista.length === 0 && !editando && <p className={estilos.apoio}>Nenhum ainda. Associe um logo a uma loja que não está na lista abaixo, ou troque o de uma que está.</p>}
        <div>
          {lista.map((identidade) => editando !== "nova" && editando?.id === identidade.id ? (
            <Formulario key={identidade.id} inicial={identidade} aoFechar={() => setEditando(null)} aoSalvar={() => { recarregar(); setEditando(null) }} />
          ) : (
            <div key={identidade.id} className={estilos.linha}>
              <Logo url={identidade.logoUrl} emoji={identidade.emoji} nome={identidade.nome} />
              <span>{identidade.nome}</span>
              <button type="button" onClick={() => setEditando(identidade)}>Editar</button>
              <button type="button" onClick={() => void remover(identidade)}>Remover</button>
            </div>
          ))}
        </div>
        {editando === "nova" ? (
          <Formulario inicial={null} aoFechar={() => setEditando(null)} aoSalvar={() => { recarregar(); setEditando(null) }} />
        ) : !editando && (
          <button type="button" className={estilos.adicionar} onClick={() => setEditando("nova")}>Associar um logo</button>
        )}
      </section>

      <section className={estilos.secao}>
        <p>Reconhecidas sozinhas · {MARCAS.length}</p>
        <p className={estilos.apoio}>Quando a compra tem o nome de uma destas lojas, o logo aparece no extrato sem você fazer nada.</p>
        <div className={estilos.conhecidas}>
          {(todas ? MARCAS : MARCAS.slice(0, VISIVEIS)).map((marca) => (
            <span key={marca.site}><Logo url={marca.logo ?? `/api/logo/${marca.site}`} nome={marca.nome} />{marca.nome}</span>
          ))}
          {MARCAS.length > VISIVEIS && <button type="button" onClick={() => setTodas((atual) => !atual)}>{todas ? "mostrar menos" : `+ ${MARCAS.length - VISIVEIS}`}</button>}
        </div>
      </section>
    </div>
  )
}

/** Logo, ou o emoji, ou a inicial — nesta ordem, e a inicial também quando a imagem não carrega. */
function Logo({ url, emoji, nome }: { url: string | null; emoji?: string | null; nome: string }) {
  const [falhou, setFalhou] = useState(false)
  return (
    <span className={estilos.logo} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && !falhou ? <img src={url} alt="" onError={() => setFalhou(true)} /> : emoji ?? nome.trim().charAt(0).toUpperCase()}
    </span>
  )
}

function Formulario({ inicial, aoFechar, aoSalvar }: { inicial: Identidade | null; aoFechar: () => void; aoSalvar: () => void }) {
  const [nome, setNome] = useState(inicial?.nome ?? "")
  const [jeito, setJeito] = useState<Jeito>(inicial?.emoji && !inicial.logoUrl ? "emoji" : inicial?.logoUrl ? "imagem" : "site")
  const [site, setSite] = useState("")
  const [logoUrl, setLogoUrl] = useState<string | null>(inicial?.logoUrl ?? null)
  const [emoji, setEmoji] = useState(inicial?.emoji ?? "")
  const [erro, setErro] = useState("")
  const [ocupado, setOcupado] = useState(false)

  async function buscarPeloSite() {
    setOcupado(true)
    setErro("")
    try {
      const resposta = await enviar<{ logoUrl: string }>("/api/identidades/logo-do-site", { site })
      setLogoUrl(resposta.logoUrl)
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui buscar o logo.")
    } finally {
      setOcupado(false)
    }
  }

  function ler(arquivo?: File) {
    if (!arquivo) return
    if (!["image/png", "image/jpeg", "image/webp"].includes(arquivo.type) || arquivo.size > 500 * 1024) {
      setErro("Use PNG, JPG ou WebP de até 500 KB.")
      return
    }
    setErro("")
    const leitor = new FileReader()
    leitor.onload = () => setLogoUrl(String(leitor.result))
    leitor.readAsDataURL(arquivo)
  }

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault()
    setOcupado(true)
    setErro("")
    try {
      // Um ou outro: emoji escolhido limpa a imagem, e vice-versa.
      await enviar("/api/identidades", { nome, emoji: jeito === "emoji" ? emoji : null, logoUrl: jeito === "emoji" ? null : logoUrl }, "PUT")
      aoSalvar()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível salvar.")
    } finally {
      setOcupado(false)
    }
  }

  const pronto = nome.trim() && (jeito === "emoji" ? Boolean(emoji) : Boolean(logoUrl))

  return (
    <form onSubmit={salvar} className={estilos.formulario}>
      <label className={estilos.campo}>
        Nome como aparece na compra
        <Input required maxLength={80} value={nome} onChange={(evento) => setNome(evento.target.value)} placeholder="Ex.: Padaria Real, Posto do Zé" disabled={Boolean(inicial)} autoFocus={!inicial} />
      </label>
      <div className={estilos.jeitos} role="tablist" aria-label="De onde vem o logo">
        {([["site", "Pelo site"], ["imagem", "Imagem"], ["emoji", "Emoji"]] as [Jeito, string][]).map(([valor, rotulo]) => (
          <button key={valor} type="button" role="tab" aria-selected={jeito === valor} onClick={() => { setJeito(valor); setErro("") }}>{rotulo}</button>
        ))}
      </div>
      {jeito === "site" && (
        <div className={estilos.site}>
          <Input value={site} onChange={(evento) => setSite(evento.target.value)} placeholder="loja.com.br" aria-label="Site da loja" inputMode="url" />
          <button type="button" onClick={() => void buscarPeloSite()} disabled={ocupado || !site.trim()}>{ocupado ? "Buscando…" : "Buscar logo"}</button>
        </div>
      )}
      {jeito === "imagem" && (
        <label className={estilos.arquivo}>
          Escolher imagem
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(evento) => ler(evento.target.files?.[0])} />
        </label>
      )}
      {jeito === "emoji" && <SeletorEmoji valor={emoji} aoMudar={setEmoji} desabilitado={ocupado} />}
      {jeito !== "emoji" && logoUrl && (
        <div className={estilos.previa}><Logo url={logoUrl} nome={nome || "?"} />É este o logo que vai aparecer nas compras.</div>
      )}
      {erro && <p role="alert" className={estilos.erro}>{erro}</p>}
      <div className={estilos.botoes}>
        <button type="button" onClick={aoFechar} disabled={ocupado}>Cancelar</button>
        <button type="submit" disabled={ocupado || !pronto}>Salvar</button>
      </div>
    </form>
  )
}
