"use client"

import { useMemo, useState } from "react"
import { Landmark, Plus, Search, Wallet } from "lucide-react"

import { enviar } from "@/lib/cliente"
import { paraCentavos } from "@/lib/dinheiro"
import { BANCOS_PERFIL, encontrarBanco, normalizarBanco } from "@/lib/bancos-perfil"
import { useIdentidadeVisual } from "@/components/identidades-visuais"
import { showToast } from "@/components/ui/toast"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { lerDiaVencimento } from "@/lib/dia-vencimento"
import { SelectNative } from "@/components/ui/select-native"

import estilos from "./cadastro-de-conta.module.css"

/// Bandeiras que o Tino sabe desenhar. "Outra" existe para quem tem uma que
/// não está na lista e ainda assim quer o campo preenchido.
const BANDEIRAS = [
  { valor: "VISA", rotulo: "Visa" },
  { valor: "MASTERCARD", rotulo: "Mastercard" },
  { valor: "ELO", rotulo: "Elo" },
  { valor: "AMERICAN_EXPRESS", rotulo: "American Express" },
  { valor: "HIPERCARD", rotulo: "Hipercard" },
  { valor: "OUTRA", rotulo: "Outra" },
]

/// Dinheiro não aparece aqui: tem o próprio quadrado na grade, porque não
/// tem banco para escolher antes.
const TIPOS = [
  { valor: "CORRENTE", rotulo: "Conta corrente" },
  { valor: "CARTAO_CREDITO", rotulo: "Cartão de crédito" },
  { valor: "POUPANCA", rotulo: "Poupança" },
  { valor: "INVESTIMENTO", rotulo: "Investimento" },
  
]

/**
 * O nome que a conta ganha sozinha, a partir do banco e do tipo. Quase todo
 * mundo chamaria a conta assim mesmo; digitar "Cartão Nubank" depois de
 * tocar no logo do Nubank e em "Cartão de crédito" era trabalho repetido.
 */
function nomeSugerido(banco: string, tipo: string) {
  if (tipo === "DINHEIRO") return "Carteira"
  if (!banco) return ""
  if (tipo === "CARTAO_CREDITO") return `Cartão ${banco}`
  if (tipo === "POUPANCA") return `Poupança ${banco}`
  if (tipo === "INVESTIMENTO") return `Investimentos ${banco}`
  if (tipo === "PJ_MEI") return `${banco} MEI`
  return banco
}

/** O quadrado do logo: o que a pessoa subiu, senão o do catálogo, senão ícone neutro. */
function Logo({ nome }: { nome: string }) {
  const personalizada = useIdentidadeVisual(nome)
  const arte = personalizada?.logoUrl ?? encontrarBanco(nome)?.logo
  if (arte) {
    return (
      <span className={estilos.logo}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={arte} alt="" aria-hidden />
      </span>
    )
  }
  return (
    <span className={estilos.logo} data-neutro>
      {personalizada?.emoji ? <span aria-hidden>{personalizada.emoji}</span> : <Landmark aria-hidden />}
    </span>
  )
}

export function CadastroDeConta({
  nomesExistentes,
  tipoInicial = "CORRENTE",
  aoCriar,
  aoCancelar,
  aoMudarSalvando,
}: {
  /** Instituições das contas que a pessoa já tem, inclusive fora do catálogo. */
  tipoInicial?: string
  nomesExistentes: string[]
  aoCriar: () => void
  aoCancelar: () => void
  aoMudarSalvando?: (salvando: boolean) => void
}) {
  const [passo, setPasso] = useState<"banco" | "dados">("banco")
  const [busca, setBusca] = useState("")
  const [outro, setOutro] = useState(false)
  const [nomeEditado, setNomeEditado] = useState(false)
  const [nova, setNova] = useState({ nome: "", tipo: tipoInicial, instituicao: "", saldo: "", limite: "", venc: "", bandeira: "" })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // As que a pessoa já usa e o catálogo não conhece entram no começo: é a
  // cooperativa da cidade dela, que nenhuma lista nacional vai trazer.
  const proprias = useMemo(
    () => [...new Set(nomesExistentes.filter((nome) => nome.trim() && !encontrarBanco(nome)))],
    [nomesExistentes],
  )

  const termo = normalizarBanco(busca)
  const casa = (nome: string, apelidos: string[] = []) =>
    !termo || [nome, ...apelidos].some((apelido) => normalizarBanco(apelido).includes(termo))
  const comLogo = BANCOS_PERFIL.filter((banco) => banco.logo && casa(banco.nome, banco.aliases))
  const semLogo = BANCOS_PERFIL.filter((banco) => !banco.logo && casa(banco.nome, banco.aliases))
  const propriasFiltradas = proprias.filter((nome) => casa(nome))
  const nada = comLogo.length + semLogo.length + propriasFiltradas.length === 0

  function escolher(instituicao: string, tipo?: string) {
    const tipoFinal = tipo ?? (nova.tipo === "DINHEIRO" ? "CORRENTE" : nova.tipo)
    setOutro(false)
    setNomeEditado(false)
    setNova({ ...nova, instituicao, tipo: tipoFinal, nome: nomeSugerido(instituicao, tipoFinal) })
    setErro(null)
    setPasso("dados")
  }

  function escolherOutro() {
    setOutro(true)
    setNomeEditado(false)
    const tipo = nova.tipo === "DINHEIRO" ? "CORRENTE" : nova.tipo
    setNova({ ...nova, instituicao: busca.trim(), tipo, nome: nomeSugerido(busca.trim(), tipo) })
    setErro(null)
    setPasso("dados")
  }

  function mudarTipo(tipo: string) {
    setNova({ ...nova, tipo, nome: nomeEditado ? nova.nome : nomeSugerido(nova.instituicao, tipo) })
  }

  function mudarInstituicao(instituicao: string) {
    setNova({ ...nova, instituicao, nome: nomeEditado ? nova.nome : nomeSugerido(instituicao, nova.tipo) })
  }

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault()
    if (salvando) return
    setSalvando(true)
    aoMudarSalvando?.(true)
    setErro(null)
    try {
      if (!nova.nome.trim()) throw new Error("Dê um nome à conta.")
      const campos = nova.tipo === "CARTAO_CREDITO" ? [nova.limite] : [nova.saldo]
      if (campos.some((valor) => valor.trim() && !/^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:[,.]\d{1,2})?$/.test(valor.trim()))) {
        throw new Error("Informe os valores como 1.234,56 ou 1234.56.")
      }
      if (campos.some((valor) => Math.abs(paraCentavos(valor)) > 2147483647)) throw new Error("Valor acima do limite permitido.")
      if (nova.tipo === "CARTAO_CREDITO") {
        if (paraCentavos(nova.limite) < 0) throw new Error("O limite não pode ser negativo.")
      }
      await enviar("/api/contas", {
        nome: nova.nome.trim(),
        tipo: nova.tipo,
        instituicao: nova.instituicao.trim() || undefined,
        saldoInicialCentavos: nova.tipo === "CARTAO_CREDITO" ? 0 : nova.saldo ? paraCentavos(nova.saldo) : 0,
        limiteCentavos: nova.tipo === "CARTAO_CREDITO" && nova.limite ? paraCentavos(nova.limite) : undefined,
        diaVencimento: nova.tipo === "CARTAO_CREDITO" ? lerDiaVencimento(nova.venc) : undefined,
        bandeira: nova.tipo === "CARTAO_CREDITO" && nova.bandeira ? nova.bandeira : undefined,
      })
      showToast("Conta adicionada")
      aoCriar()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui salvar a conta.")
    } finally {
      setSalvando(false)
      aoMudarSalvando?.(false)
    }
  }

  if (passo === "banco") {
    return (
      <div className="grid gap-4">
        <label className={estilos.busca}>
          <Search aria-hidden />
          <Input
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar banco"
            aria-label="Buscar banco"
            autoComplete="off"
          />
        </label>

        <div className={estilos.grade} role="list" aria-label="Bancos">
          {!termo && (
            <>
              <button type="button" role="listitem" className={estilos.banco} onClick={() => escolher("", "DINHEIRO")}>
                <span className={estilos.logo} data-neutro>
                  <Wallet aria-hidden />
                </span>
                <small>Dinheiro</small>
              </button>
              <button type="button" role="listitem" className={estilos.banco} onClick={escolherOutro}>
                <span className={estilos.logo} data-neutro>
                  <Plus aria-hidden />
                </span>
                <small>Outro</small>
              </button>
            </>
          )}
          {propriasFiltradas.map((nome) => (
            <button key={nome} type="button" role="listitem" className={estilos.banco} onClick={() => escolher(nome)}>
              <Logo nome={nome} />
              <small>{nome}</small>
            </button>
          ))}
          {comLogo.map((banco) => (
            <button key={banco.nome} type="button" role="listitem" className={estilos.banco} onClick={() => escolher(banco.nome)}>
              <Logo nome={banco.nome} />
              <small>{banco.nome}</small>
            </button>
          ))}
          {semLogo.length > 0 && <p className={estilos.secao}>Corretoras sem logo no catálogo</p>}
          {semLogo.map((banco) => (
            <button key={banco.nome} type="button" role="listitem" className={estilos.banco} onClick={() => escolher(banco.nome, "INVESTIMENTO")}>
              <Logo nome={banco.nome} />
              <small>{banco.nome}</small>
            </button>
          ))}
          {termo && (
            <button type="button" role="listitem" className={estilos.banco} onClick={escolherOutro}>
              <span className={estilos.logo} data-neutro>
                <Plus aria-hidden />
              </span>
              <small>{nada ? `Usar “${busca.trim()}”` : "Outro"}</small>
            </button>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={aoCancelar}>
            Cancelar
          </Button>
        </div>
      </div>
    )
  }

  const dinheiro = nova.tipo === "DINHEIRO"

  return (
    <form onSubmit={salvar} className="grid gap-4">
      <div className={estilos.escolhido}>
        {dinheiro ? (
          <span className={estilos.logo} data-neutro>
            <Wallet aria-hidden />
          </span>
        ) : (
          <Logo nome={nova.instituicao} />
        )}
        <strong>{dinheiro ? "Dinheiro" : nova.instituicao || "Outro banco"}</strong>
        <button type="button" className={estilos.trocar} onClick={() => setPasso("banco")} disabled={salvando}>
          Trocar
        </button>
      </div>

      <fieldset disabled={salvando} className="grid min-w-0 gap-4">
        {!dinheiro && (
          <div className="grid gap-2">
            <span className={estilos.rotulo}>Tipo</span>
            <div className={estilos.tipos} role="group" aria-label="Tipo">
              {TIPOS.map((tipo) => (
                <button key={tipo.valor} type="button" aria-pressed={nova.tipo === tipo.valor} onClick={() => mudarTipo(tipo.valor)}>
                  {tipo.rotulo}
                </button>
              ))}
            </div>
          </div>
        )}

        <FieldGroup className="sm:grid sm:grid-cols-2 sm:gap-x-4">
          {outro && (
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="conta-instituicao">Nome do banco</FieldLabel>
              <Input
                id="conta-instituicao"
                value={nova.instituicao}
                onChange={(evento) => mudarInstituicao(evento.target.value)}
                placeholder="Ex.: Cooperativa da cidade"
                autoFocus
              />
            </Field>
          )}
          <Field>
            <FieldLabel htmlFor="conta-nome">Nome da conta</FieldLabel>
            <Input
              id="conta-nome"
              value={nova.nome}
              onChange={(evento) => {
                setNomeEditado(true)
                setNova({ ...nova, nome: evento.target.value })
              }}
              placeholder="Ex.: Conta corrente"
              required
            />
          </Field>
          {nova.tipo !== "CARTAO_CREDITO" && <Field>
            <FieldLabel htmlFor="conta-saldo">Saldo atual (R$)</FieldLabel>
            <Input
              inputMode="decimal"
              id="conta-saldo"
              value={nova.saldo}
              onChange={(evento) => setNova({ ...nova, saldo: evento.target.value })}
              placeholder="0,00"
            />
          </Field>}
          {nova.tipo === "CARTAO_CREDITO" && (
            <>
              <Field>
                <FieldLabel htmlFor="conta-limite">Limite total (R$)</FieldLabel>
                <Input
                  inputMode="decimal"
                  id="conta-limite"
                  value={nova.limite}
                  onChange={(evento) => setNova({ ...nova, limite: evento.target.value })}
                  placeholder="6.000,00"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="conta-venc">Dia de vencimento</FieldLabel>
                <SelectNative id="conta-venc" value={nova.venc} onChange={(evento) => setNova({ ...nova, venc: evento.target.value })}>
                  <option value="">Selecione o dia</option>
                  {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>Dia {i + 1}</option>)}
                </SelectNative>
              </Field>
              <Field>
                <FieldLabel htmlFor="conta-bandeira">Bandeira</FieldLabel>
                <SelectNative id="conta-bandeira" value={nova.bandeira} onChange={(evento) => setNova({ ...nova, bandeira: evento.target.value })}>
                  <option value="">Não informar</option>
                  {BANDEIRAS.map((bandeira) => (
                    <option key={bandeira.valor} value={bandeira.valor}>
                      {bandeira.rotulo}
                    </option>
                  ))}
                </SelectNative>
              </Field>
            </>
          )}
        </FieldGroup>
      </fieldset>

      {erro && (
        <p role="alert" className="text-sm text-negativo">
          {erro}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" disabled={salvando} onClick={aoCancelar}>
          Cancelar
        </Button>
        <Button disabled={salvando}>{salvando ? "Salvando…" : "Adicionar"}</Button>
      </div>
    </form>
  )
}
