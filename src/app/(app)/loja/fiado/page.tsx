"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, Copy } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda } from "@/lib/dinheiro"
import { Cartao, Metrica, Vazio } from "@/components/ui/painel"
import { TrilhaLoja } from "@/components/trilha-loja"
import { textoDeCobranca } from "@/lib/loja/fiado"
import type { ClienteDevedor } from "@/lib/loja/fiado"

/**
 * Fiado.
 *
 * A lista é ordenada pelo mais antigo, não pelo maior valor: quem deve pouco há
 * muito tempo costuma ser quem não vai pagar, e é essa cobrança que precisa
 * sair antes.
 *
 * O texto de cobrança é copiado, não enviado. Quem conhece o cliente sabe o tom
 * certo, e mensagem automática em nome da loja azeda relação de bairro.
 */

interface Resposta {
  loja: { nome: string }
  devedores: (Omit<ClienteDevedor, "vendas"> & {
    vendas: { vendaId: string; numero: number; valorCentavos: number; criadoEm: string }[]
  })[]
  resumo: { totalCentavos: number; clientes: number; atrasadoCentavos: number }
}

export default function Fiado() {
  const [dados, setDados] = useState<Resposta | null>(null)
  const [copiado, setCopiado] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const carregar = useCallback(async () => {
    setDados(await buscar<Resposta>("/api/loja/fiado"))
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function receber(vendaId: string) {
    setOcupado(true)
    try {
      await enviar("/api/loja/fiado", { vendaId })
      await carregar()
    } finally {
      setOcupado(false)
    }
  }

  async function copiarCobranca(devedor: Resposta["devedores"][number]) {
    const texto = textoDeCobranca(
      { ...devedor, vendas: devedor.vendas.map((v) => ({ ...v, criadoEm: new Date(v.criadoEm), recebidoEm: null })) },
      dados?.loja.nome ?? "loja",
      formatarMoeda,
    )

    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(devedor.id)
      setTimeout(() => setCopiado(null), 2500)
    } catch {
      // Navegador sem permissão de área de transferência: mostrar o texto é
      // melhor que falhar em silêncio.
      window.prompt("Copie a mensagem:", texto)
    }
  }

  const devedores = dados?.devedores ?? []

  return (
    <div className="space-y-4">
      <TrilhaLoja pagina="Fiado" />
      <Cartao titulo="Fiado">
        <div className="grid gap-3 sm:grid-cols-3">
          <Metrica
            rotulo="Na rua"
            valor={formatarMoeda(dados?.resumo.totalCentavos ?? 0)}
            tom={dados?.resumo.totalCentavos ? "atencao" : "neutro"}
          />
          <Metrica rotulo="Pessoas devendo" valor={String(dados?.resumo.clientes ?? 0)} />
          <Metrica
            rotulo="Há mais de 30 dias"
            valor={formatarMoeda(dados?.resumo.atrasadoCentavos ?? 0)}
            tom={dados?.resumo.atrasadoCentavos ? "negativo" : "neutro"}
            detalhe="passou do combinado do mês seguinte"
          />
        </div>
      </Cartao>

      <Cartao titulo="Quem deve">
        {devedores.length === 0 ? (
          <Vazio
            titulo="Ninguém devendo"
            texto="Quando você fechar uma venda no fiado, quem levou aparece aqui com o valor e a data."
          />
        ) : (
          <div className="divide-y divide-pauta">
            {devedores.map((devedor) => (
              <div key={devedor.id} className="py-4 first:pt-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="text-[15px] font-medium">{devedor.nome}</p>
                    <p className="text-[12px] text-muted-fg">
                      {devedor.telefone ? `${devedor.telefone} · ` : ""}
                      há {devedor.diasDaMaisAntiga} {devedor.diasDaMaisAntiga === 1 ? "dia" : "dias"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`numero text-[17px] font-semibold ${
                        devedor.diasDaMaisAntiga > 30 ? "text-negativo" : "text-atencao"
                      }`}
                    >
                      {formatarMoeda(devedor.devendoCentavos)}
                    </span>
                    <button
                      onClick={() => copiarCobranca(devedor)}
                      className="flex items-center gap-1.5 rounded-full border border-pauta px-3 py-1.5 text-[12px] text-muted-fg hover:text-foreground"
                    >
                      {copiado === devedor.id ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                      {copiado === devedor.id ? "copiado" : "cobrar"}
                    </button>
                  </div>
                </div>

                <div className="mt-2.5 space-y-1">
                  {devedor.vendas.map((venda) => (
                    <div key={venda.vendaId} className="flex items-center justify-between gap-3 text-[13px]">
                      <span className="text-muted-fg">
                        #{venda.numero} · {new Date(venda.criadoEm).toLocaleDateString("pt-BR")}
                      </span>
                      <span className="numero">{formatarMoeda(venda.valorCentavos)}</span>
                      <button
                        onClick={() => receber(venda.vendaId)}
                        disabled={ocupado}
                        className="rounded-full border border-positivo/40 px-3 py-1 text-[12px] text-positivo disabled:opacity-50"
                      >
                        recebi
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-4 text-[12px] leading-relaxed text-muted-fg">
          O texto de cobrança é copiado para você mandar — não é enviado sozinho. Quem conhece o cliente sabe o tom
          certo, e mensagem automática em nome da loja azeda relação de bairro.
        </p>
      </Cartao>
    </div>
  )
}
