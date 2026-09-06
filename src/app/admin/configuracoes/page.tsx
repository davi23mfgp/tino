"use client"

import { useEffect, useState } from "react"

import { buscar } from "@/lib/cliente"
import { formatarMoeda, formatarPercentual, paraCentavos } from "@/lib/dinheiro"
import { Aviso, Cartao } from "@/components/ui/painel"

/**
 * Parâmetros globais editáveis sem deploy.
 *
 * Cada linha mostra o valor em vigor, o padrão do código e o motivo de o número
 * existir. Sem o motivo, quem edita daqui a um ano muda o teto do cheque
 * especial achando que é a taxa média do mercado — e o app passa a projetar
 * dívida com um juro que não é o legal.
 *
 * A entrada é sempre na unidade humana (reais, % ao mês, dias) e a conversão
 * acontece aqui, na borda, como no resto do Tino.
 */

interface Parametro {
  chave: string
  rotulo: string
  descricao: string
  unidade: "centavos" | "bps" | "dias"
  padrao: number
  valor: number
  editado: boolean
}

function mostrar(parametro: Pick<Parametro, "unidade">, valor: number): string {
  if (parametro.unidade === "centavos") return formatarMoeda(valor)
  if (parametro.unidade === "bps") return `${formatarPercentual(valor, 2)} ao mês`
  return `${valor} dias`
}

function paraEdicao(parametro: Parametro): string {
  if (parametro.unidade === "centavos") return (parametro.valor / 100).toFixed(2).replace(".", ",")
  if (parametro.unidade === "bps") return (parametro.valor / 100).toFixed(2).replace(".", ",")
  return String(parametro.valor)
}

function paraGravar(unidade: Parametro["unidade"], texto: string): number {
  // Reais e percentual têm duas casas e viram Int do mesmo jeito: centavos e
  // pontos-base são a mesma multiplicação por cem.
  if (unidade === "dias") return Math.round(Number(texto.replace(",", ".")))
  return paraCentavos(texto)
}

export default function ConfiguracoesAdmin() {
  const [parametros, setParametros] = useState<Parametro[]>([])
  const [rascunho, setRascunho] = useState<Record<string, string>>({})
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)

  async function recarregar() {
    const lista = await buscar<Parametro[]>("/api/admin/parametros")
    setParametros(lista)
    setRascunho(Object.fromEntries(lista.map((linha) => [linha.chave, paraEdicao(linha)])))
  }

  useEffect(() => {
    recarregar().catch(() => setErro("Não consegui carregar os parâmetros."))
  }, [])

  async function gravar(parametro: Parametro) {
    setOcupado(parametro.chave)
    setErro(null)
    setMensagem(null)
    try {
      await buscar("/api/admin/parametros", {
        method: "PUT",
        body: JSON.stringify({ chave: parametro.chave, valor: paraGravar(parametro.unidade, rascunho[parametro.chave] ?? "") }),
      })
      await recarregar()
      setMensagem(`${parametro.rotulo} atualizado. Vale já na próxima tela aberta, sem deploy.`)
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : "Não consegui gravar.")
    } finally {
      setOcupado(null)
    }
  }

  async function restaurar(parametro: Parametro) {
    setOcupado(parametro.chave)
    try {
      await buscar("/api/admin/parametros", {
        method: "PUT",
        body: JSON.stringify({ chave: parametro.chave, restaurar: true }),
      })
      await recarregar()
      setMensagem(`${parametro.rotulo} voltou ao valor de fábrica.`)
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : "Não consegui restaurar.")
    } finally {
      setOcupado(null)
    }
  }

  return (
    <div className="space-y-4">
      <Aviso tom="info">
        Mudar o preço aqui muda o que a página de vendas anuncia e o que o gateway cobra de quem assinar a partir de
        agora. Quem já assinou continua no valor que contratou — o preço fica congelado na assinatura.
      </Aviso>

      {mensagem && <p className="text-[13px] text-positivo">{mensagem}</p>}
      {erro && <p className="text-[13px] text-negativo">{erro}</p>}

      <Cartao titulo="Parâmetros do sistema">
        <div className="divide-y divide-pauta">
          {parametros.map((parametro) => (
            <div key={parametro.chave} className="py-4 first:pt-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[14px] font-medium">{parametro.rotulo}</p>
                <p className="text-[12px] text-muted-fg">
                  em vigor: <span className="numero">{mostrar(parametro, parametro.valor)}</span>
                  {parametro.editado && (
                    <>
                      {" · "}padrão do código: <span className="numero">{mostrar(parametro, parametro.padrao)}</span>
                    </>
                  )}
                </p>
              </div>

              <p className="mt-1 text-[12px] leading-relaxed text-muted-fg">{parametro.descricao}</p>

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <input
                  value={rascunho[parametro.chave] ?? ""}
                  onChange={(evento) => setRascunho({ ...rascunho, [parametro.chave]: evento.target.value })}
                  inputMode="decimal"
                  className="numero w-40 rounded-[var(--raio-campo)] border border-pauta bg-background px-4 py-2 text-sm"
                />
                <span className="text-[12px] text-muted-fg">
                  {parametro.unidade === "centavos" ? "reais" : parametro.unidade === "bps" ? "% ao mês" : "dias"}
                </span>
                <button
                  onClick={() => gravar(parametro)}
                  disabled={ocupado === parametro.chave}
                  className="rounded-full bg-primary px-5 py-2 text-[13px] font-medium text-primary-foreground disabled:opacity-50"
                >
                  Gravar
                </button>
                {parametro.editado && (
                  <button
                    onClick={() => restaurar(parametro)}
                    disabled={ocupado === parametro.chave}
                    className="rounded-full border border-pauta px-4 py-2 text-[13px] text-muted-fg disabled:opacity-50"
                  >
                    Voltar ao padrão
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Cartao>
    </div>
  )
}
