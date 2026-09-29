"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Check, MessageCircle, Plus } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda } from "@/lib/dinheiro"
import { idadeDoFiado, textoDeCobranca } from "@/lib/loja/fiado"
import type { ClienteDevedor } from "@/lib/loja/fiado"
import { TrilhaLoja } from "@/components/trilha-loja"
import { showToast } from "@/components/ui/toast"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import estilos from "./fiado.module.css"

/**
 * Fiado — F3 do canvas com o bloco de idade da F2 (Davi, 28/09/2026).
 *
 * Abre pelo que cobrar hoje (quem passou de 30 dias), não pela lista inteira:
 * é a única parte do fiado que pede ação. A idade de cada compra fica ao lado,
 * como no relatório de contas a receber.
 *
 * O texto de cobrança é do dono: copiado, ou aberto no WhatsApp dele para
 * ele mandar. Nunca enviado sozinho — mensagem automática em nome da loja
 * azeda relação de bairro, e quem conhece o cliente sabe o tom certo.
 */

type Devedor = Omit<ClienteDevedor, "vendas"> & {
  vendas: { vendaId: string; numero: number; valorCentavos: number; criadoEm: string }[]
}

interface Resposta {
  loja: { nome: string }
  devedores: Devedor[]
  resumo: { totalCentavos: number; clientes: number; atrasadoCentavos: number }
}

/// Trinta dias: a régua do comércio de rua, a mesma de `resumirFiado`.
const PRAZO = 30
/// Tons das faixas de idade: do mais claro (mais novo) ao mais escuro.
const TONS = ["color-mix(in oklab, var(--foreground), transparent 10%)", "color-mix(in oklab, var(--foreground), transparent 38%)", "color-mix(in oklab, var(--foreground), transparent 60%)", "color-mix(in oklab, var(--foreground), transparent 78%)"]

const paraLib = (devedor: Devedor): ClienteDevedor => ({
  ...devedor,
  vendas: devedor.vendas.map((venda) => ({ ...venda, criadoEm: new Date(venda.criadoEm), recebidoEm: null })),
})
const diasDesde = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
const textoDias = (dias: number) => (dias === 0 ? "hoje" : dias === 1 ? "1 dia" : `${dias} dias`)

/** Telefone para o link do WhatsApp: só dígitos, com o 55 do Brasil quando faltar. */
function linkDoWhatsApp(telefone: string, texto: string) {
  const digitos = telefone.replace(/\D/g, "")
  const numero = digitos.length <= 11 ? `55${digitos}` : digitos
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`
}

function Situacao({ dias }: { dias: number }) {
  const atrasado = dias > PRAZO
  return (
    <span className={estilos.situacao} data-atrasado={atrasado || undefined}>
      <i aria-hidden />
      {atrasado ? `Atrasado · ${textoDias(dias)}` : `Em dia · ${textoDias(dias)}`}
    </span>
  )
}

/** Valor com os centavos menores, como nos quadros de Finanças e MEI. */
function Reais({ centavos, tom }: { centavos: number; tom?: "negativo" }) {
  const texto = formatarMoeda(centavos)
  const virgula = texto.lastIndexOf(",")
  return (
    <strong className={estilos.num} data-tom={tom}>
      {texto.slice(0, virgula)}
      <span>{texto.slice(virgula)}</span>
    </strong>
  )
}

export default function Fiado() {
  const [dados, setDados] = useState<Resposta | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [aberto, setAberto] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const carregar = useCallback(async () => {
    try {
      setDados(await buscar<Resposta>("/api/loja/fiado"))
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui carregar o fiado.")
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const devedores = dados?.devedores ?? []
  const atrasados = devedores.filter((devedor) => devedor.diasDaMaisAntiga > PRAZO)
  const emDia = devedores.filter((devedor) => devedor.diasDaMaisAntiga <= PRAZO)
  const faixas = useMemo(() => idadeDoFiado(devedores.map(paraLib)), [devedores])
  const total = dados?.resumo.totalCentavos ?? 0
  const devedor = devedores.find((linha) => linha.id === aberto)
  const mensagem = (alvo: Devedor) => textoDeCobranca(paraLib(alvo), dados?.loja.nome ?? "loja", formatarMoeda)

  async function cobrar(alvo: Devedor) {
    const texto = mensagem(alvo)
    if (alvo.telefone) {
      window.open(linkDoWhatsApp(alvo.telefone, texto), "_blank", "noopener")
      return
    }
    try {
      await navigator.clipboard.writeText(texto)
      showToast(`Mensagem para ${alvo.nome} copiada`, { description: "Cole no WhatsApp ou onde vocês conversam." })
    } catch {
      // Navegador sem permissão de área de transferência: mostrar o texto é
      // melhor que falhar em silêncio.
      window.prompt("Copie a mensagem:", texto)
    }
  }

  async function receber(vendaIds: string[]) {
    if (ocupado || vendaIds.length === 0) return
    setOcupado(true)
    try {
      // Uma baixa por venda, como a rota pede: pagamento sem dizer de qual
      // compra deixaria o app adivinhando qual quitar.
      for (const vendaId of vendaIds) await enviar("/api/loja/fiado", { vendaId })
      showToast(vendaIds.length === 1 ? "Compra recebida" : `${vendaIds.length} compras recebidas`)
      await carregar()
    } catch (falha) {
      showToast(falha instanceof Error ? falha.message : "Não consegui dar baixa.", { variant: "error" })
      await carregar()
    } finally {
      setOcupado(false)
    }
  }

  // Recebeu tudo de quem estava aberto: a ficha fecha sozinha.
  useEffect(() => {
    if (aberto && dados && !devedor) setAberto(null)
  }, [aberto, dados, devedor])

  const linhaDeCliente = (alvo: Devedor) => (
    <button key={alvo.id} type="button" className={estilos.linha} onClick={() => setAberto(alvo.id)}>
      <span>
        <b className={estilos.nome}>{alvo.nome}</b>
        <Situacao dias={alvo.diasDaMaisAntiga} />
      </span>
      <span className={estilos.direita}>
        <b className={estilos.valor}>{formatarMoeda(alvo.devendoCentavos)}</b>
        <small>
          {alvo.vendas.length} {alvo.vendas.length === 1 ? "compra" : "compras"}
        </small>
      </span>
    </button>
  )

  const blocoIdade = (
    <section className={`${estilos.bloco} ${estilos.idade}`} aria-labelledby="titulo-idade">
      <header>
        <div>
          <span className={estilos.rotulo} id="titulo-idade">
            Idade do fiado
          </span>
          <strong className={estilos.num}>{formatarMoeda(total)}</strong>
        </div>
        <span>por idade da compra</span>
      </header>
      {total > 0 && (
        <div className={estilos.faixas} aria-hidden>
          {faixas.map((faixa, indice) =>
            faixa.totalCentavos > 0 ? <i key={faixa.rotulo} style={{ width: `${(faixa.totalCentavos / total) * 100}%`, background: TONS[indice] }} /> : null,
          )}
        </div>
      )}
      <div>
        {faixas.map((faixa, indice) => (
          <div key={faixa.rotulo} className={estilos.faixa}>
            <i style={{ background: TONS[indice] }} aria-hidden />
            <span>
              {faixa.rotulo}
              <small>
                {faixa.compras === 0
                  ? "nenhuma compra"
                  : `${faixa.compras} ${faixa.compras === 1 ? "compra" : "compras"} · ${faixa.clientes.join(", ")}`}
              </small>
            </span>
            <b className={estilos.num}>{formatarMoeda(faixa.totalCentavos)}</b>
          </div>
        ))}
      </div>
    </section>
  )

  return (
    <div className={estilos.pagina}>
      <TrilhaLoja pagina="Fiado" />

      <div className={estilos.topo}>
        <p>{dados && total === 0 ? "Ninguém devendo. Quando vender fiado no Balcão, a conta de cada cliente aparece aqui." : "Quem levou e ainda não pagou"}</p>
        <Link href="/loja?forma=FIADO" className={estilos.botao} data-principal>
          <Plus aria-hidden />
          Vender fiado
        </Link>
      </div>

      {/* Quadros finos (29/09), como Finanças da loja e MEI. */}
      {dados && total > 0 && (
        <div className={estilos.quadros}>
          <div className={`${estilos.bloco} ${estilos.quadro}`}>
            <span>Para cobrar hoje</span>
            <Reais centavos={dados.resumo.atrasadoCentavos} tom={dados.resumo.atrasadoCentavos > 0 ? "negativo" : undefined} />
            <small>mais de {PRAZO} dias</small>
          </div>
          <div className={`${estilos.bloco} ${estilos.quadro}`}>
            <span>Na rua</span>
            <Reais centavos={total} />
            <small>
              {dados.resumo.clientes} {dados.resumo.clientes === 1 ? "pessoa" : "pessoas"}
            </small>
          </div>
        </div>
      )}

      {erro && <p className="text-[calc(13px*var(--escala-letra))] text-negativo">{erro}</p>}

      <div className={estilos.grade}>
        <div className={estilos.coluna}>
          <div className={estilos.titulo}>
            <h2>Para cobrar</h2>
            <span>mais de {PRAZO} dias</span>
          </div>
          {atrasados.length === 0 ? (
            <p className={`${estilos.bloco} ${estilos.vazio}`}>Nada atrasado. Todo fiado está dentro dos {PRAZO} dias.</p>
          ) : (
            <div className={estilos.cartoes}>
              {atrasados.map((alvo) => (
                <div key={alvo.id} className={`${estilos.bloco} ${estilos.cartao}`}>
                  <button type="button" onClick={() => setAberto(alvo.id)} aria-label={`Abrir a conta de ${alvo.nome}`}>
                    <span>
                      <b className={estilos.nome}>{alvo.nome}</b>
                      <Situacao dias={alvo.diasDaMaisAntiga} />
                    </span>
                    <b className={estilos.valor}>{formatarMoeda(alvo.devendoCentavos)}</b>
                  </button>
                  <div className={estilos.dois}>
                    <button type="button" className={estilos.botao} data-principal onClick={() => void cobrar(alvo)}>
                      <MessageCircle aria-hidden />
                      Cobrar
                    </button>
                    <button type="button" className={estilos.botao} onClick={() => setAberto(alvo.id)}>
                      <Check aria-hidden />
                      Recebi
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className={estilos.titulo}>
            <h2>Em dia</h2>
            <span>{emDia.length}</span>
          </div>
          {emDia.length === 0 ? (
            <p className={`${estilos.bloco} ${estilos.vazio}`}>Ninguém com fiado recente.</p>
          ) : (
            <div className={`${estilos.bloco} ${estilos.lista}`}>{emDia.map(linhaDeCliente)}</div>
          )}
        </div>

        {blocoIdade}
      </div>

      <Dialog open={Boolean(devedor)} onOpenChange={(abrir) => !abrir && setAberto(null)}>
        <DialogContent className="sm:max-w-[520px]">
          {devedor && (
            <>
              <DialogHeader>
                <DialogTitle>{devedor.nome}</DialogTitle>
                <DialogDescription asChild>
                  <span>
                    <Situacao dias={devedor.diasDaMaisAntiga} />
                    {devedor.telefone ? ` · ${devedor.telefone}` : ""}
                  </span>
                </DialogDescription>
              </DialogHeader>
              <DialogBody>
                <div className={estilos.ficha}>
                  <div className={estilos.total}>
                    <strong className={estilos.num}>{formatarMoeda(devedor.devendoCentavos)}</strong>
                    <span>
                      em {devedor.vendas.length} {devedor.vendas.length === 1 ? "compra" : "compras"}
                    </span>
                  </div>

                  <div>
                    <span className={estilos.rotulo}>Compras em aberto</span>
                    {devedor.vendas.map((venda) => (
                      <div key={venda.vendaId} className={estilos.compra}>
                        <span className={estilos.num}>{new Date(venda.criadoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                        <span>
                          Venda nº {venda.numero} · {textoDias(diasDesde(venda.criadoEm))}
                        </span>
                        <b className={estilos.num}>{formatarMoeda(venda.valorCentavos)}</b>
                        <button type="button" onClick={() => void receber([venda.vendaId])} disabled={ocupado}>
                          Recebi
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-2">
                    <span className={estilos.rotulo}>Mensagem de cobrança</span>
                    <p className={estilos.mensagem}>{mensagem(devedor)}</p>
                  </div>

                  <div className={estilos.dois}>
                    <button type="button" className={estilos.botao} data-principal onClick={() => void cobrar(devedor)}>
                      <MessageCircle aria-hidden />
                      {devedor.telefone ? "Abrir no WhatsApp" : "Copiar mensagem"}
                    </button>
                    <button type="button" className={estilos.botao} onClick={() => void receber(devedor.vendas.map((venda) => venda.vendaId))} disabled={ocupado}>
                      <Check aria-hidden />
                      Receber tudo
                    </button>
                  </div>
                  <p className={estilos.dica}>
                    {devedor.telefone
                      ? "Abre a conversa no seu WhatsApp com a mensagem escrita. Quem manda é você."
                      : "Sem telefone cadastrado: a mensagem é copiada para você mandar."}
                  </p>
                </div>
              </DialogBody>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
