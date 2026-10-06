"use client"

import { useId, useMemo, useRef, useState } from "react"
import { Check, Delete, KeyRound, Smartphone } from "lucide-react"

import {
  ACESSORIOS, PECAS, conferirSerie, marcarRestoComoOk, proximoEstado, resumoDaEntrada,
  type EstadoDaPeca, type TipoDeSenha,
} from "@/lib/loja/assistencia"
import { buscarModelos, normalizarModelo, type TipoDeAparelho } from "@/lib/loja/modelos"

import estilos from "./entrada.module.css"

export interface ValorDaEntrada {
  modelo: string
  cor: string
  serie: string
  tipo: TipoDeAparelho
  acessorios: string[]
  estado: Record<string, EstadoDaPeca>
  /** null: ninguém respondeu ainda. */
  senhaTipo: TipoDeSenha | null
  senha: string
  /** Editando uma OS que já tem senha: só manda se a pessoa trocar. */
  trocarSenha: boolean
}

export function entradaVazia(tipo: TipoDeAparelho): ValorDaEntrada {
  return { modelo: "", cor: "", serie: "", tipo, acessorios: [], estado: {}, senhaTipo: null, senha: "", trocarSenha: true }
}

const TIPOS: { valor: TipoDeAparelho; nome: string }[] = [
  { valor: "celular", nome: "Celular" }, { valor: "tablet", nome: "Tablet" }, { valor: "notebook", nome: "Notebook" },
  { valor: "videogame", nome: "Videogame" }, { valor: "computador", nome: "Computador" }, { valor: "relogio", nome: "Relógio" },
  { valor: "fone", nome: "Fone e som" }, { valor: "outro", nome: "Outro" },
]
const NOME_DO_TIPO = Object.fromEntries(TIPOS.map((tipo) => [tipo.valor, tipo.nome])) as Record<TipoDeAparelho, string>
const CORES = ["Preto", "Branco", "Azul", "Verde", "Rosa", "Roxo", "Vermelho", "Dourado", "Prata", "Cinza", "Grafite", "Amarelo"]

/**
 * A entrada do aparelho, opções A e C do passo 39 juntas (Davi, 07/10/2026):
 * os blocos numerados da A, com o desenho de tocar onde tem defeito da C.
 * O que importa é a velocidade no balcão: o modelo sai em duas ou três
 * letras, e o estado em poucos toques no desenho.
 */
export function EntradaDoAparelho({ valor, mudar, modelosUsados, temSenhaGuardada }: {
  valor: ValorDaEntrada
  mudar: (valor: ValorDaEntrada) => void
  modelosUsados: string[]
  temSenhaGuardada: boolean
}) {
  const serie = conferirSerie(valor.serie)
  const serieRef = useRef<HTMLInputElement>(null)
  const pecas = PECAS[valor.tipo]
  const resumo = resumoDaEntrada(valor.estado, valor.tipo)

  return (
    <div className={estilos.entrada}>
      <section className={estilos.bloco} aria-labelledby="entrada-aparelho">
        <h3 id="entrada-aparelho"><span>01</span>Aparelho</h3>
        <BuscaDeModelo
          valor={valor.modelo}
          historico={modelosUsados}
          mudar={(modelo, tipo) => mudar({ ...valor, modelo, ...(tipo && tipo !== valor.tipo ? { tipo, estado: {}, acessorios: [] } : {}) })}
          aoEscolher={() => serieRef.current?.focus()}
        />
        <div className={estilos.tipos} role="group" aria-label="Tipo de aparelho">
          {TIPOS.map((tipo) => (
            <button key={tipo.valor} type="button" aria-pressed={valor.tipo === tipo.valor} onClick={() => tipo.valor !== valor.tipo && mudar({ ...valor, tipo: tipo.valor, estado: {}, acessorios: [] })}>{tipo.nome}</button>
          ))}
        </div>
        <div className={estilos.dois}>
          <label className={estilos.campo}>Cor
            <input list="cores-aparelho" value={valor.cor} onChange={(e) => mudar({ ...valor, cor: e.target.value })} maxLength={30} placeholder="Preto" autoComplete="off" />
            <datalist id="cores-aparelho">{CORES.map((cor) => <option key={cor} value={cor} />)}</datalist>
          </label>
          <label className={estilos.campo}>{valor.tipo === "celular" || valor.tipo === "tablet" ? "IMEI ou número de série" : "Número de série"}
            <input ref={serieRef} value={valor.serie} onChange={(e) => mudar({ ...valor, serie: e.target.value })} maxLength={40} inputMode={valor.tipo === "celular" ? "numeric" : "text"} autoComplete="off" placeholder={valor.tipo === "celular" ? "15 dígitos" : "na etiqueta do aparelho"} />
          </label>
        </div>
        <p className={estilos.dica} data-tom={serie === "imei" ? "bom" : serie === "imei_errado" ? "atencao" : undefined}>
          {serie === "imei" ? <><Check aria-hidden />IMEI confere.</>
            : serie === "imei_errado" ? "Este IMEI tem um dígito errado. Confira: na entrega, é ele que prova que o aparelho é o mesmo."
              : valor.tipo === "celular" ? "No celular, disque *#06# para ver o IMEI."
                : "Prova, na entrega, que o aparelho é o mesmo."}
        </p>
      </section>

      <section className={estilos.bloco} aria-labelledby="entrada-junto">
        <h3 id="entrada-junto"><span>02</span>O que ficou junto</h3>
        <div className={estilos.chips}>
          {ACESSORIOS[valor.tipo].map((item) => {
            const marcado = valor.acessorios.includes(item)
            return (
              <button key={item} type="button" aria-pressed={marcado} onClick={() => mudar({ ...valor, acessorios: marcado ? valor.acessorios.filter((a) => a !== item) : [...valor.acessorios, item] })}>
                {marcado && <Check aria-hidden />}{item}
              </button>
            )
          })}
        </div>
      </section>

      <section className={`${estilos.bloco} ${estilos.estado}`} aria-labelledby="entrada-estado">
        <h3 id="entrada-estado"><span>03</span>Como chegou</h3>
        <p className={estilos.dica}>Toque uma vez onde tem defeito. Mais um toque: funciona. Mais um: volta a não testado.</p>
        {valor.tipo === "celular" || valor.tipo === "tablet" ? (
          <DesenhoDoAparelho tipo={valor.tipo} estado={valor.estado} tocar={(chave) => mudar({ ...valor, estado: { ...valor.estado, [chave]: proximoEstado(valor.estado[chave]) } })} />
        ) : (
          <div className={estilos.gradePecas}>
            {pecas.map((peca) => (
              <button key={peca.chave} type="button" className={estilos.peca} data-estado={valor.estado[peca.chave] ?? "nao_testado"} onClick={() => mudar({ ...valor, estado: { ...valor.estado, [peca.chave]: proximoEstado(valor.estado[peca.chave]) } })}>
                {peca.nome}<small>{rotuloDoEstado(valor.estado[peca.chave])}</small>
              </button>
            ))}
          </div>
        )}
        <div className={estilos.resumo}>
          <span data-tom="defeito">{resumo.defeito.length} com defeito</span>
          <span data-tom="ok">{resumo.ok.length} {resumo.ok.length === 1 ? "funciona" : "funcionam"}</span>
          <span>{resumo.naoTestado.length} {resumo.naoTestado.length === 1 ? "não testado" : "não testados"}</span>
          {resumo.naoTestado.length > 0 && (
            <button type="button" onClick={() => mudar({ ...valor, estado: marcarRestoComoOk(valor.estado, valor.tipo) })}>Testei: o resto funciona</button>
          )}
        </div>
      </section>

      <section className={estilos.bloco} aria-labelledby="entrada-senha">
        <h3 id="entrada-senha"><span>04</span>Senha do aparelho</h3>
        {temSenhaGuardada && !valor.trocarSenha ? (
          <div className={estilos.guardada}>
            <KeyRound aria-hidden /><span>Senha guardada. Fica cifrada e some na entrega.</span>
            <button type="button" onClick={() => mudar({ ...valor, trocarSenha: true, senhaTipo: null, senha: "" })}>Trocar</button>
          </div>
        ) : (
          <>
            <div className={estilos.segmento} role="radiogroup" aria-label="Tipo de senha">
              {([["PADRAO", "Padrão"], ["NUMERO", "Senha"], ["NENHUMA", "Sem senha"]] as const).map(([tipo, nome]) => (
                <button key={tipo} type="button" role="radio" aria-checked={valor.senhaTipo === tipo} onClick={() => mudar({ ...valor, senhaTipo: tipo, senha: "" })}>{nome}</button>
              ))}
            </div>
            {valor.senhaTipo === "PADRAO" && <PadraoDeDesbloqueio valor={valor.senha} mudar={(senha) => mudar({ ...valor, senha })} />}
            {valor.senhaTipo === "NUMERO" && (
              <label className={estilos.campo}>Senha
                <input value={valor.senha} onChange={(e) => mudar({ ...valor, senha: e.target.value })} maxLength={32} autoComplete="off" spellCheck={false} placeholder="como o cliente falou" />
              </label>
            )}
            <p className={estilos.dica}>Fica cifrada. Só quem atende vê, nunca vai no link do cliente, e some sozinha na entrega.</p>
          </>
        )}
      </section>
    </div>
  )
}

function rotuloDoEstado(estado: EstadoDaPeca | undefined) {
  return estado === "defeito" ? "não funciona" : estado === "ok" ? "funciona" : "não testado"
}

/**
 * A busca do modelo: começa a sugerir na primeira letra, pelo começo de
 * qualquer palavra ("a5", "note 12", "ip 15"), com os modelos que a loja já
 * atendeu em cima. Enter escolhe o primeiro; o que não estiver na lista vale
 * como foi digitado.
 */
function BuscaDeModelo({ valor, historico, mudar, aoEscolher }: {
  valor: string
  historico: string[]
  mudar: (modelo: string, tipo?: TipoDeAparelho) => void
  aoEscolher: () => void
}) {
  const id = useId()
  const [aberta, setAberta] = useState(false)
  const [ativo, setAtivo] = useState(0)
  // Escolher na lista passa o foco para o IMEI, e esse blur chegaria com o
  // texto digitado ("ip 13") por cima do modelo escolhido ("iPhone 13").
  const acabouDeEscolher = useRef(false)
  const sugestoes = useMemo(() => buscarModelos(valor, historico, 8), [valor, historico])
  const mostrar = aberta && valor.trim().length > 0 && sugestoes.length > 0
  const daLoja = new Set(historico)

  function escolher(indice: number) {
    const modelo = sugestoes[indice]
    if (!modelo) return
    mudar(modelo.nome, modelo.tipo)
    setAberta(false)
    acabouDeEscolher.current = true
    aoEscolher()
  }

  return (
    <div className={estilos.busca}>
      <label className={estilos.campo} htmlFor={`${id}-modelo`}>Marca e modelo</label>
      <div className={estilos.buscaCampo}>
        <Smartphone aria-hidden />
        <input
          id={`${id}-modelo`}
          role="combobox"
          aria-expanded={mostrar}
          aria-controls={`${id}-lista`}
          aria-activedescendant={mostrar ? `${id}-op-${ativo}` : undefined}
          aria-autocomplete="list"
          value={valor}
          maxLength={80}
          autoComplete="off"
          spellCheck={false}
          placeholder="Comece a digitar: a54, ip 13, g52…"
          onChange={(e) => { mudar(e.target.value); setAberta(true); setAtivo(0) }}
          onFocus={() => setAberta(true)}
          onBlur={() => {
            setAberta(false)
            if (acabouDeEscolher.current) { acabouDeEscolher.current = false; return }
            // Digitou o nome inteiro sem escolher na lista: o tipo vem do que
            // bate. Nome fora da lista não mexe no tipo que a pessoa marcou.
            const exato = sugestoes.find((modelo) => normalizarModelo(modelo.nome) === normalizarModelo(valor))
            if (valor.trim()) mudar(valor.trim(), exato?.tipo)
          }}
          onKeyDown={(evento) => {
            if (!mostrar) return
            if (evento.key === "ArrowDown") { evento.preventDefault(); setAtivo((atual) => (atual + 1) % sugestoes.length) }
            else if (evento.key === "ArrowUp") { evento.preventDefault(); setAtivo((atual) => (atual - 1 + sugestoes.length) % sugestoes.length) }
            else if (evento.key === "Enter") { evento.preventDefault(); escolher(ativo) }
            else if (evento.key === "Escape") setAberta(false)
          }}
        />
      </div>
      {mostrar && (
        <ul id={`${id}-lista`} role="listbox" className={`${estilos.sugestoes} superficie-flutuante`}>
          {sugestoes.map((modelo, indice) => (
            <li
              key={`${modelo.marca}-${modelo.nome}`}
              id={`${id}-op-${indice}`}
              role="option"
              aria-selected={indice === ativo}
              // mousedown, não click: o click chega depois do blur, que fecha a lista.
              onMouseDown={(evento) => { evento.preventDefault(); escolher(indice) }}
              onMouseEnter={() => setAtivo(indice)}
            >
              <b>{modelo.nome}</b>
              <small>{daLoja.has(modelo.nome) ? "já atendido aqui" : `${modelo.marca && modelo.marca !== "Outro" ? `${modelo.marca} · ` : ""}${NOME_DO_TIPO[modelo.tipo].toLowerCase()}`}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Onde cada peça fica no desenho do celular, em % da largura e da altura. */
const POSICOES: Record<string, { x: number; y: number; lado?: "esq" | "dir" }> = {
  camera: { x: 50, y: 7 }, wifi: { x: 50, y: 19 }, tela: { x: 50, y: 33 }, toque: { x: 50, y: 46 },
  biometria: { x: 50, y: 59 }, microfone: { x: 50, y: 83 }, carga: { x: 50, y: 95 },
  // Os botões laterais e o alto-falante ficam na borda, por dentro: por fora
  // o desenho passaria da largura do celular de 360 px.
  botoes: { x: 9, y: 71, lado: "esq" }, som: { x: 91, y: 71, lado: "dir" },
}

function DesenhoDoAparelho({ tipo, estado, tocar }: { tipo: TipoDeAparelho; estado: Record<string, EstadoDaPeca>; tocar: (chave: string) => void }) {
  return (
    <div className={estilos.desenho} data-tipo={tipo}>
      <div className={estilos.corpo} aria-hidden />
      {PECAS[tipo].map((peca) => {
        const lugar = POSICOES[peca.chave] ?? { x: 50, y: 50 }
        const atual = estado[peca.chave] ?? "nao_testado"
        return (
          <button
            key={peca.chave}
            type="button"
            className={estilos.ponto}
            data-estado={atual}
            data-lado={lugar.lado}
            style={{ left: `${lugar.x}%`, top: `${lugar.y}%` }}
            aria-label={`${peca.nome}: ${rotuloDoEstado(atual)}`}
            onClick={() => tocar(peca.chave)}
          >
            {atual === "defeito" ? "✕ " : atual === "ok" ? "✓ " : ""}{peca.nome}
          </button>
        )
      })}
    </div>
  )
}

/**
 * O padrão do Android, tocado ponto a ponto na ordem: é mais rápido que
 * desenhar com o dedo numa tela pequena, e o número de cada ponto mostra a
 * ordem para quem vai desbloquear depois.
 */
function PadraoDeDesbloqueio({ valor, mudar }: { valor: string; mudar: (valor: string) => void }) {
  const centro = (ponto: number) => ({ x: 20 + ((ponto - 1) % 3) * 40, y: 20 + Math.floor((ponto - 1) / 3) * 40 })
  const pontos = valor.split("").map(Number)
  return (
    <div className={estilos.padrao}>
      <div className={estilos.grade3}>
        <svg viewBox="0 0 120 120" aria-hidden>
          {pontos.slice(1).map((ponto, indice) => {
            const de = centro(pontos[indice]!)
            const para = centro(ponto)
            return <line key={indice} x1={de.x} y1={de.y} x2={para.x} y2={para.y} />
          })}
        </svg>
        {Array.from({ length: 9 }, (_, i) => i + 1).map((ponto) => {
          const ordem = pontos.indexOf(ponto)
          return (
            <button key={ponto} type="button" aria-label={ordem >= 0 ? `Ponto ${ponto}, ${ordem + 1}º` : `Ponto ${ponto}`} aria-pressed={ordem >= 0}
              disabled={ordem >= 0 || pontos.length >= 9} onClick={() => mudar(valor + String(ponto))}>
              {ordem >= 0 ? ordem + 1 : ""}
            </button>
          )
        })}
      </div>
      <div className={estilos.padraoLado}>
        <p>{pontos.length === 0 ? "Toque os pontos na ordem do desenho." : pontos.length < 4 ? `${pontos.length} pontos: o padrão tem pelo menos 4.` : `${pontos.length} pontos.`}</p>
        {pontos.length > 0 && <button type="button" onClick={() => mudar("")}><Delete aria-hidden />Apagar</button>}
      </div>
    </div>
  )
}
