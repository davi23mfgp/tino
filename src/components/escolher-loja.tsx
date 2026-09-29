"use client"

import { useState } from "react"
import { Search } from "lucide-react"

import { enviar } from "@/lib/cliente"
import { MARCAS, palavras } from "@/lib/marcas"
import { showToast } from "@/components/ui/toast"
import { Input } from "@/components/ui/input"
import { useIdentidades, useIdentidadeVisual, useMarca, useSugestaoDaIA } from "@/components/identidades-visuais"

import estilos from "./escolher-loja.module.css"

/** Fundo opaco para o diálogo: a grade de logos sobre o extrato borrado confundia. */
export const CLASSE_DIALOGO_LOJA = estilos.dialogo

/** Logo, ou a inicial quando não há imagem ou ela não carrega. */
function Logo({ url, nome }: { url: string | null; nome: string }) {
  const [falhou, setFalhou] = useState(false)
  return (
    <span className={estilos.logo} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && !falhou ? <img src={url} alt="" onError={() => setFalhou(true)} /> : nome.trim().charAt(0).toUpperCase()}
    </span>
  )
}

/**
 * "Qual loja é esta?" — camada 3 dos logos (28/09/2026).
 *
 * A pessoa toca no ícone da compra no extrato e escolhe a loja uma vez; a
 * escolha vira uma identidade visual com o texto da compra, e toda compra
 * com o mesmo texto passa a sair com aquele logo. Vale antes da lista pronta
 * e antes da IA: quem conhece a compra é a pessoa.
 *
 * O palpite da IA (camada 4), quando existe, vem em cima com um botão de
 * confirmar — é o jeito de uma SUGESTÃO virar logo sem ninguém procurar a
 * loja na lista.
 */
export function EscolherLoja({ descricao, original, aoFechar }: { descricao: string; original?: string | null; aoFechar: () => void }) {
  const { recarregar } = useIdentidades()
  const identidade = useIdentidadeVisual(descricao)
  const atual = useMarca(descricao, original)
  const sugestao = useSugestaoDaIA(descricao, original)
  const [busca, setBusca] = useState("")
  const [salvando, setSalvando] = useState(false)

  const nomeDaIdentidade = descricao.trim().slice(0, 80)
  // Só oferece tirar o logo que foi escolhido para ESTA compra. Um logo
  // associado a um nome mais curto ("Padaria") vale para várias compras e se
  // tira em Logos das lojas, onde se vê o que mais ele cobre.
  const propria = identidade?.nome === nomeDaIdentidade ? identidade : null
  const termo = palavras(busca).trim()
  const lojas = termo
    ? MARCAS.filter((marca) => [marca.nome, ...marca.termos].some((texto) => palavras(texto).includes(termo)))
    : MARCAS

  async function escolher(site: string, nome: string) {
    if (salvando) return
    setSalvando(true)
    try {
      await enviar("/api/identidades", { nome: nomeDaIdentidade, marcaSite: site }, "PUT")
      recarregar()
      showToast(`Compras "${nomeDaIdentidade}" agora saem com o logo de ${nome}`)
      aoFechar()
    } catch (falha) {
      showToast(falha instanceof Error ? falha.message : "Não consegui salvar.", { variant: "error" })
    } finally {
      setSalvando(false)
    }
  }

  async function tirar() {
    if (!propria || salvando) return
    setSalvando(true)
    try {
      await enviar("/api/identidades", { id: propria.id }, "DELETE")
      recarregar()
      aoFechar()
    } finally {
      setSalvando(false)
    }
  }

  // A sugestão só aparece se muda alguma coisa: se a IA acha o mesmo que já
  // está na tela, não há o que confirmar.
  // Nem depois que a pessoa já escolheu: a escolha dela vale mais que o palpite.
  const mostrarSugestao = !propria && sugestao?.marcaNome && sugestao.site && sugestao.marcaNome !== atual?.nome

  return (
    <div className={estilos.escolher}>
      <p className={estilos.original}>
        Como veio do banco: <b>{original || descricao}</b>
      </p>

      {mostrarSugestao && (
        <div className={estilos.sugestao}>
          <Logo url={sugestao.logoUrl} nome={sugestao.marcaNome!} />
          <span>
            <small>Palpite do Tino</small>
            <strong>{sugestao.marcaNome}</strong>
          </span>
          <button type="button" disabled={salvando} onClick={() => void escolher(sugestao.site!, sugestao.marcaNome!)}>
            É essa
          </button>
        </div>
      )}

      <label className={estilos.busca}>
        <Search aria-hidden />
        <Input value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Buscar loja" aria-label="Buscar loja" autoComplete="off" />
      </label>

      <div className={estilos.grade} role="list" aria-label="Lojas">
        {lojas.map((marca) => (
          <button
            key={marca.site}
            type="button"
            role="listitem"
            className={estilos.loja}
            aria-pressed={atual?.nome === marca.nome}
            disabled={salvando}
            onClick={() => void escolher(marca.site, marca.nome)}
          >
            <Logo url={marca.logo ?? `/api/logo/${marca.site}`} nome={marca.nome} />
            <small>{marca.nome}</small>
          </button>
        ))}
        {lojas.length === 0 && (
          <p className={estilos.vazio}>Nenhuma loja com esse nome. Em Categorias → Logos das lojas dá para pôr o logo que quiser.</p>
        )}
      </div>

      <div className={estilos.rodape}>
        {propria ? (
          <button type="button" data-perigo onClick={() => void tirar()} disabled={salvando}>
            Tirar o logo
          </button>
        ) : (
          <span />
        )}
        <button type="button" onClick={aoFechar}>
          Fechar
        </button>
      </div>
    </div>
  )
}
