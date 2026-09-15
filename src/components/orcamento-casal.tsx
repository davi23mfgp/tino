"use client"

import { useCallback, useEffect, useState } from "react"
import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { Abertura } from "@/components/abertura"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { SelectNative } from "@/components/ui/select-native"
import { dividirEntreCasal, type ModalidadeCasal } from "@/lib/casal"

interface Pessoa {
  id?: string
  nome: string
  rendaCentavos: number
  mesadaCentavos: number
  quotaBps: number
}

interface Casal {
  ativo: boolean
  modalidade: ModalidadeCasal
  pessoas: Pessoa[]
}

const FORMAS: { valor: ModalidadeCasal; rotulo: string }[] = [
  { valor: "METADE", rotulo: "Metade para cada um" },
  { valor: "PROPORCIONAL", rotulo: "Proporcional à renda" },
  { valor: "MESADA", rotulo: "Mesada de cada um e gasto do casal" },
  { valor: "PERSONALIZADA", rotulo: "Do nosso jeito" },
]

/**
 * A divisão do que é do casal.
 *
 * Vive atrás de um interruptor porque casal é uma escolha, não o padrão: um
 * lar de uma pessoa não deve carregar campo de divisão em lugar nenhum.
 *
 * As três primeiras formas são as que o Davi listou como as que existem na
 * vida real. A quarta existe porque casal nenhum cabe em três opções — ali as
 * duas pessoas escrevem a porcentagem que combinaram.
 *
 * Mesada é **limite**, não transferência: é um teto imaginário para o gasto
 * individual de cada um. Nenhum dinheiro muda de conta por causa dela, e ela
 * não altera a divisão do que é comum.
 */
export function OrcamentoCasal({ gastoComumCentavos = 0 }: { gastoComumCentavos?: number }) {
  const [casal, setCasal] = useState<Casal | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")

  const carregar = useCallback(async () => {
    try { setCasal(await buscar<Casal | null>("/api/casal")) }
    catch { setErro("Não consegui carregar a divisão.") }
  }, [])
  useEffect(() => { void carregar() }, [carregar])

  const ativo = casal?.ativo ?? false
  const modalidade = casal?.modalidade ?? "METADE"
  const pessoas: Pessoa[] = casal?.pessoas?.length
    ? casal.pessoas
    : [
        // A segunda pessoa nasce com nome. A API exige nome de todo mundo, e
        // antes ela nascia vazia: ligar a chave disparava o salvamento, o
        // servidor recusava com "cada pessoa precisa de um nome", e a chave
        // voltava sozinha para desligado. Do lado de fora parecia que o botão
        // não funcionava — era a tela mandando um dado que ela mesma sabia ser
        // inválido. O nome é editável logo abaixo.
        { nome: "Eu", rendaCentavos: 0, mesadaCentavos: 0, quotaBps: 5000 },
        { nome: "Quem mora comigo", rendaCentavos: 0, mesadaCentavos: 0, quotaBps: 5000 },
      ]

  async function guardar(mudanca: Partial<Casal>) {
    setSalvando(true); setErro("")
    try {
      const salvo = await enviar<Casal>("/api/casal", { ativo, modalidade, pessoas, ...mudanca }, "PUT")
      setCasal(salvo)
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível salvar.") }
    finally { setSalvando(false) }
  }

  function mudarPessoa(indice: number, campo: keyof Pessoa, valor: string) {
    const proximas = pessoas.map((pessoa, i) =>
      i === indice
        ? { ...pessoa, [campo]: campo === "nome" ? valor : campo === "quotaBps" ? Math.round(Number(valor.replace(",", ".")) * 100) : paraCentavos(valor) }
        : pessoa,
    )
    setCasal({ ativo, modalidade, pessoas: proximas })
  }

  const conta = dividirEntreCasal(
    gastoComumCentavos,
    modalidade,
    pessoas.map((pessoa, indice) => ({ ...pessoa, id: pessoa.id ?? String(indice), pagouCentavos: 0 })),
  )

  return (
    <Abertura
      rotulo="Dividir com quem mora com você"
      titulo={
        ativo && gastoComumCentavos > 0 ? (
          <>De <em>{formatarMoeda(gastoComumCentavos)}</em> do casal, cabe {formatarMoeda(conta.partes[0]?.deviaCentavos ?? 0)} para {pessoas[0]?.nome || "você"}.</>
        ) : (
          <>Divida o que é do casal.</>
        )
      }
      apoio={ativo ? undefined : "Ligue para escolher a forma de dividir."}
    >
      <label className="flex min-h-11 items-center gap-3 text-sm sm:col-span-full">
        <Switch
          checked={ativo}
          disabled={salvando}
          onCheckedChange={(valor) => void guardar({ ativo: valor })}
          aria-label="Dividir com o casal"
        />
        {salvando ? "Salvando…" : ativo ? "Ligado" : "Desligado"}
      </label>

      {/* O erro fica FORA do bloco que só aparece quando está ligado. Ele
          morava lá dentro, então uma falha ao ligar não tinha onde aparecer: a
          chave voltava para desligado e a tela não dizia nada. */}
      {erro && (
        <p role="alert" className="text-[calc(13px*var(--escala-letra))] text-negativo sm:col-span-full">
          {erro}
        </p>
      )}

      {ativo && (
        <>
          <label className="block text-sm sm:col-span-full">
            Como vocês dividem
            <SelectNative
              value={modalidade}
              onChange={(evento) => void guardar({ modalidade: evento.target.value as ModalidadeCasal })}
            >
              {FORMAS.map((forma) => <option key={forma.valor} value={forma.valor}>{forma.rotulo}</option>)}
            </SelectNative>
          </label>

          {pessoas.map((pessoa, indice) => (
            <div key={indice} className="vidro-menu rounded-2xl p-3">
              <Input
                aria-label={`Nome da pessoa ${indice + 1}`}
                value={pessoa.nome}
                placeholder={indice === 0 ? "Você" : "A outra pessoa"}
                onChange={(evento) => mudarPessoa(indice, "nome", evento.target.value)}
              />

              {modalidade === "PROPORCIONAL" && (
                <label className="mt-2 block text-xs text-muted-fg">
                  Renda por mês
                  <Input inputMode="decimal" defaultValue={(pessoa.rendaCentavos / 100).toFixed(2)} onBlur={(evento) => mudarPessoa(indice, "rendaCentavos", evento.target.value)} />
                </label>
              )}

              {modalidade === "MESADA" && (
                <label className="mt-2 block text-xs text-muted-fg">
                  Mesada — teto do gasto individual
                  <Input inputMode="decimal" defaultValue={(pessoa.mesadaCentavos / 100).toFixed(2)} onBlur={(evento) => mudarPessoa(indice, "mesadaCentavos", evento.target.value)} />
                </label>
              )}

              {modalidade === "PERSONALIZADA" && (
                <label className="mt-2 block text-xs text-muted-fg">
                  Paga quanto por cento
                  <Input inputMode="decimal" defaultValue={(pessoa.quotaBps / 100).toFixed(0)} onBlur={(evento) => mudarPessoa(indice, "quotaBps", evento.target.value)} />
                </label>
              )}

              {gastoComumCentavos > 0 && (
                <p className="numero mt-2 text-sm font-semibold">{formatarMoeda(conta.partes[indice]?.deviaCentavos ?? 0)}</p>
              )}
            </div>
          ))}

          <div className="flex items-center gap-3 sm:col-span-full">
            <Button disabled={salvando} onClick={() => void guardar({})}>{salvando ? "Salvando…" : "Salvar divisão"}</Button>
          </div>
        </>
      )}
    </Abertura>
  )
}
