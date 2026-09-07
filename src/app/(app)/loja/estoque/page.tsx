"use client"

import { useCallback, useEffect, useState } from "react"
import { PackagePlus } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda, formatarPercentual, paraCentavos } from "@/lib/dinheiro"
import { Cartao, Metrica, Vazio } from "@/components/ui/painel"
import { TrilhaLoja } from "@/components/trilha-loja"

/**
 * Prateleira.
 *
 * Responde três coisas que o lojista não sabe olhando a loja: quanto tem de
 * cada peça, quanto ela custou e quanto sobra em cada venda. A saída não se
 * lança aqui — ela nasce da venda no balcão, senão o saldo passa a divergir do
 * que foi vendido e a prateleira deixa de servir para conferir a loja.
 */

interface Linha {
  id: string
  nome: string
  precoCentavos: number
  saldo: number
  custoMedioCentavos: number | null
  acabando: boolean
  semSaldo: boolean
  margem: { lucroCentavos: number | null; margemBps: number | null; markupBps: number | null }
}

interface Resposta {
  prateleira: Linha[]
  acabando: number
  semSaldo: number
  semCusto: number
}

const campo = "rounded-xl border border-pauta bg-background px-3 py-2 text-[13px] outline-none focus:border-positivo/50"

const VAZIO = { produtoId: "", tipo: "ENTRADA" as "ENTRADA" | "AJUSTE", quantidade: "", custo: "", motivo: "" }

export default function Estoque() {
  const [dados, setDados] = useState<Resposta | null>(null)
  const [lancamento, setLancamento] = useState(VAZIO)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setDados(await buscar<Resposta>("/api/loja/estoque"))
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function lancar(evento: React.FormEvent) {
    evento.preventDefault()
    setOcupado(true)
    setErro(null)

    try {
      await enviar("/api/loja/estoque", {
        produtoId: lancamento.produtoId,
        tipo: lancamento.tipo,
        quantidade: Number(lancamento.quantidade) || 0,
        custoUnitarioCentavos: lancamento.custo ? paraCentavos(lancamento.custo) : undefined,
        motivo: lancamento.motivo || undefined,
      })
      setLancamento(VAZIO)
      await carregar()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui lançar.")
    } finally {
      setOcupado(false)
    }
  }

  const prateleira = dados?.prateleira ?? []

  return (
    <div className="space-y-4">
      <TrilhaLoja pagina="Prateleira" />
      <Cartao titulo="Prateleira">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Metrica rotulo="Produtos" valor={String(prateleira.length)} />
          <Metrica
            rotulo="Acabando"
            valor={String(dados?.acabando ?? 0)}
            tom={dados?.acabando ? "atencao" : "neutro"}
            detalhe="no mínimo que você definiu"
          />
          <Metrica
            rotulo="Sem custo lançado"
            valor={String(dados?.semCusto ?? 0)}
            tom={dados?.semCusto ? "atencao" : "neutro"}
            detalhe="sem custo não dá para saber a margem"
          />
        </div>
      </Cartao>

      <Cartao titulo="Entrada de mercadoria">
        <form onSubmit={lancar} className="grid gap-3 sm:grid-cols-5">
          <label className="flex flex-col gap-1.5 text-[12px] text-muted-fg sm:col-span-2">
            produto
            <select
              required
              value={lancamento.produtoId}
              onChange={(evento) => setLancamento({ ...lancamento, produtoId: evento.target.value })}
              className={campo}
            >
              <option value="">escolha</option>
              {prateleira.map((linha) => (
                <option key={linha.id} value={linha.id}>
                  {linha.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-[12px] text-muted-fg">
            o que houve
            <select
              value={lancamento.tipo}
              onChange={(evento) =>
                setLancamento({ ...lancamento, tipo: evento.target.value as "ENTRADA" | "AJUSTE" })
              }
              className={campo}
            >
              <option value="ENTRADA">chegou mercadoria</option>
              <option value="AJUSTE">contei a prateleira</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-[12px] text-muted-fg">
            {lancamento.tipo === "ENTRADA" ? "quantas peças" : "quantas tem hoje"}
            <input
              required
              inputMode="numeric"
              value={lancamento.quantidade}
              onChange={(evento) => setLancamento({ ...lancamento, quantidade: evento.target.value })}
              className={campo}
            />
          </label>

          {lancamento.tipo === "ENTRADA" ? (
            <label className="flex flex-col gap-1.5 text-[12px] text-muted-fg">
              custo por peça
              <input
                inputMode="decimal"
                placeholder="0,00"
                value={lancamento.custo}
                onChange={(evento) => setLancamento({ ...lancamento, custo: evento.target.value })}
                className={campo}
              />
            </label>
          ) : (
            <label className="flex flex-col gap-1.5 text-[12px] text-muted-fg">
              motivo
              <input
                placeholder="contagem do sábado"
                value={lancamento.motivo}
                onChange={(evento) => setLancamento({ ...lancamento, motivo: evento.target.value })}
                className={campo}
              />
            </label>
          )}

          <div className="flex items-end sm:col-span-5">
            <button
              type="submit"
              disabled={ocupado}
              className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground disabled:opacity-50"
            >
              <PackagePlus className="size-4" /> lançar
            </button>
          </div>

          {erro && <p className="text-[13px] text-negativo sm:col-span-5">{erro}</p>}
        </form>

        <p className="mt-3 text-[12px] leading-relaxed text-muted-fg">
          A contagem manda: ao informar quantas peças existem hoje, o saldo passa a ser esse número e a diferença fica
          registrada. A saída não se lança aqui — ela sai sozinha quando você vende no balcão.
        </p>
      </Cartao>

      <Cartao titulo="O que tem na loja">
        {prateleira.length === 0 ? (
          <Vazio
            titulo="Nenhum produto ainda"
            texto="Cadastre pelo balcão, na primeira venda. Aqui você lança a mercadoria que chegou."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-pauta text-left text-[11px] uppercase tracking-widest text-muted-fg">
                  <th className="pb-2 font-normal">produto</th>
                  <th className="pb-2 text-right font-normal">tem</th>
                  <th className="pb-2 text-right font-normal">custou</th>
                  <th className="pb-2 text-right font-normal">vende por</th>
                  <th className="pb-2 text-right font-normal">sobra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pauta">
                {prateleira.map((linha) => (
                  <tr key={linha.id}>
                    <td className="py-2.5">{linha.nome}</td>
                    <td
                      className={`numero py-2.5 text-right ${
                        linha.semSaldo ? "text-negativo" : linha.acabando ? "text-atencao" : ""
                      }`}
                    >
                      {linha.saldo}
                    </td>
                    <td className="numero py-2.5 text-right text-muted-fg">
                      {linha.custoMedioCentavos === null ? "—" : formatarMoeda(linha.custoMedioCentavos)}
                    </td>
                    <td className="numero py-2.5 text-right">{formatarMoeda(linha.precoCentavos)}</td>
                    <td className="numero py-2.5 text-right">
                      {linha.margem.margemBps === null ? (
                        <span className="text-muted-fg">falta o custo</span>
                      ) : (
                        <span className={linha.margem.margemBps < 0 ? "text-negativo" : "text-positivo"}>
                          {formatarMoeda(linha.margem.lucroCentavos ?? 0)}{" "}
                          <span className="text-[11px] text-muted-fg">
                            ({formatarPercentual(linha.margem.margemBps, 0)})
                          </span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>
    </div>
  )
}
