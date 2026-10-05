"use client"

import { useEffect, useMemo, useState } from "react"
import { Minus, Plus, Search, X } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { dividirPagamento } from "@/lib/loja/orcamento"
import { totalDaVenda } from "@/lib/loja/venda"
import { Input } from "@/components/ui/input"
import { SelectNative } from "@/components/ui/select-native"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import { numeroDoOrcamento, type ClienteDaLista, type ItemDoOrcamento, type OrcamentoDaFicha } from "./comum"
import estilos from "./clientes.module.css"

interface DoCatalogo { id: string; nome: string; precoCentavos: number }

// Chave estável por linha: o campo de preço não é controlado, e com a chave
// pelo índice, tirar a primeira linha deixava o preço dela na segunda.
let proximaChave = 0
type ItemNoEditor = ItemDoOrcamento & { chave: number }
const comChave = (item: ItemDoOrcamento): ItemNoEditor => ({ ...item, chave: (proximaChave += 1) })

const reaisDoCampo = (centavos: number) => (centavos > 0 ? (centavos / 100).toFixed(2).replace(".", ",") : "")

export interface Salvo { clienteId: string; orcamentoId: string; enviar: boolean }

/**
 * Montar ou editar um orçamento. A opção A não desenha este passo; ele segue
 * a lista de itens da opção C (catálogo ou avulso, quantidade, total) dentro
 * do diálogo sólido do app.
 */
export function EditorDeOrcamento({
  aberto, aoFechar, aoSalvar, clientes, cliente, orcamento,
}: {
  aberto: boolean
  aoFechar: () => void
  aoSalvar: (salvo: Salvo) => void
  clientes: ClienteDaLista[]
  cliente?: { id: string; nome: string } | null
  orcamento?: (OrcamentoDaFicha & { clienteId: string }) | null
}) {
  const [catalogo, setCatalogo] = useState<{ produtos: DoCatalogo[]; servicos: DoCatalogo[] } | null>(null)
  const [nomeCliente, setNomeCliente] = useState("")
  const [telefone, setTelefone] = useState("")
  const [itens, setItens] = useState<ItemNoEditor[]>([])
  const [procura, setProcura] = useState("")
  const [desconto, setDesconto] = useState("")
  const [validade, setValidade] = useState("7")
  const [forma, setForma] = useState<"vista" | "entrada" | "parcelado">("vista")
  const [entrada, setEntrada] = useState("")
  const [parcelas, setParcelas] = useState("2")
  const [observacao, setObservacao] = useState("")
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Cada abertura começa do orçamento escolhido, ou em branco.
  useEffect(() => {
    if (!aberto) return
    setErro(null)
    setProcura("")
    setNomeCliente(cliente?.nome ?? "")
    setTelefone("")
    setItens(orcamento ? orcamento.itens.map(({ produtoId, servicoId, descricao, quantidade, precoUnitarioCentavos }) => comChave({ produtoId, servicoId, descricao, quantidade, precoUnitarioCentavos })) : [])
    setDesconto(orcamento ? reaisDoCampo(orcamento.descontoCentavos) : "")
    setValidade("7")
    setForma(!orcamento ? "vista" : orcamento.entradaCentavos ? "entrada" : orcamento.parcelas > 1 ? "parcelado" : "vista")
    setEntrada(orcamento?.entradaCentavos ? reaisDoCampo(orcamento.entradaCentavos) : "")
    setParcelas(String(orcamento && orcamento.parcelas > 1 ? orcamento.parcelas : 2))
    setObservacao(orcamento?.observacao ?? "")
    if (!catalogo) void buscar<{ produtos: DoCatalogo[]; servicos: DoCatalogo[] }>("/api/loja/orcamentos").then(setCatalogo).catch(() => setCatalogo({ produtos: [], servicos: [] }))
  }, [aberto]) // eslint-disable-line react-hooks/exhaustive-deps

  const descontoCentavos = desconto ? paraCentavos(desconto) : 0
  const total = useMemo(() => totalDaVenda(itens, descontoCentavos), [itens, descontoCentavos])
  const entradaCentavos = forma === "entrada" && entrada ? paraCentavos(entrada) : null
  const quantasParcelas = forma === "vista" ? 1 : Math.min(24, Math.max(1, Number(parcelas) || 1))
  const plano = dividirPagamento(total, entradaCentavos, quantasParcelas)

  const encontrados = useMemo(() => {
    const termo = procura.trim().toLowerCase()
    if (!catalogo || !termo) return []
    const produtos = catalogo.produtos.filter((p) => p.nome.toLowerCase().includes(termo)).map((p) => ({ ...p, tipo: "produto" as const }))
    const servicos = catalogo.servicos.filter((s) => s.nome.toLowerCase().includes(termo)).map((s) => ({ ...s, tipo: "servico" as const }))
    return [...servicos, ...produtos].slice(0, 12)
  }, [catalogo, procura])

  function adicionar(item: DoCatalogo & { tipo: "produto" | "servico" }) {
    setItens((atual) => {
      const chave = item.tipo === "produto" ? "produtoId" : "servicoId"
      const existente = atual.findIndex((linha) => linha[chave] === item.id)
      if (existente >= 0) return atual.map((linha, i) => (i === existente ? { ...linha, quantidade: linha.quantidade + 1 } : linha))
      return [...atual, comChave({ produtoId: item.tipo === "produto" ? item.id : null, servicoId: item.tipo === "servico" ? item.id : null, descricao: item.nome, quantidade: 1, precoUnitarioCentavos: item.precoCentavos })]
    })
    setProcura("")
  }

  const mudar = (indice: number, parte: Partial<ItemNoEditor>) => setItens((atual) => atual.map((linha, i) => (i === indice ? { ...linha, ...parte } : linha)))

  async function salvar(enviarDepois: boolean) {
    if (ocupado) return
    setErro(null)
    if (!orcamento && !cliente && !nomeCliente.trim()) return setErro("Diga para quem é o orçamento.")
    if (itens.length === 0) return setErro("Ponha pelo menos um item.")
    if (itens.some((item) => !item.descricao.trim())) return setErro("Dê um nome a cada item.")
    if (itens.some((item) => item.precoUnitarioCentavos <= 0)) return setErro("Todo item precisa de preço.")
    if (forma === "entrada" && (!entradaCentavos || entradaCentavos >= total)) return setErro("A entrada precisa ser maior que zero e menor que o total.")
    setOcupado(true)
    const corpo = {
      itens: itens.map(({ produtoId, servicoId, descricao, quantidade, precoUnitarioCentavos }) => ({
        ...(produtoId ? { produtoId } : {}), ...(servicoId ? { servicoId } : {}), descricao: descricao.trim(), quantidade, precoUnitarioCentavos,
      })),
      descontoCentavos,
      entradaCentavos: forma === "entrada" ? entradaCentavos : null,
      parcelas: quantasParcelas,
      validadeDias: Number(validade),
      observacao: observacao.trim(),
    }
    try {
      if (orcamento) {
        await enviar(`/api/loja/orcamentos/${orcamento.id}`, corpo, "PUT")
        aoSalvar({ clienteId: orcamento.clienteId, orcamentoId: orcamento.id, enviar: enviarDepois })
      } else {
        const conhecido = cliente ?? clientes.find((linha) => linha.nome.toLowerCase() === nomeCliente.trim().toLowerCase())
        const resposta = await enviar<{ orcamento: { id: string; clienteId: string } }>("/api/loja/orcamentos", {
          ...corpo,
          ...(conhecido ? { clienteId: conhecido.id } : { clienteNome: nomeCliente.trim(), clienteTelefone: telefone.trim() || undefined }),
        })
        aoSalvar({ clienteId: resposta.orcamento.clienteId, orcamentoId: resposta.orcamento.id, enviar: enviarDepois })
      }
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui salvar o orçamento.")
    } finally {
      setOcupado(false)
    }
  }

  const novoCliente = !orcamento && !cliente
  const conhecido = novoCliente && clientes.some((linha) => linha.nome.toLowerCase() === nomeCliente.trim().toLowerCase())

  return (
    <Dialog open={aberto} onOpenChange={(abrir) => !abrir && aoFechar()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{orcamento ? `Orçamento ${numeroDoOrcamento(orcamento.numero)}` : "Novo orçamento"}</DialogTitle>
          <DialogDescription>
            {orcamento?.status === "ENVIADO"
              ? "O cliente passa a ver a versão nova no mesmo link. A anterior fica guardada."
              : cliente ? `Para ${cliente.nome}.` : "Itens do catálogo ou avulsos, e as condições de pagamento."}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className={estilos.form}>
            {novoCliente && (
              <div className={estilos.dois}>
                <label className={estilos.campo}>Cliente
                  <Input list="clientes-da-loja" value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} placeholder="Nome" autoComplete="off" />
                  <datalist id="clientes-da-loja">{clientes.map((linha) => <option key={linha.id} value={linha.nome} />)}</datalist>
                </label>
                <label className={estilos.campo}>Telefone{conhecido ? " (já cadastrado)" : ""}
                  <Input inputMode="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 9 0000-0000" disabled={conhecido} />
                </label>
              </div>
            )}

            <div className={estilos.campo}>
              Itens
              {itens.map((item, indice) => (
                <div key={item.chave} className={estilos.linhaItem}>
                  <div>
                    <Input aria-label="Descrição do item" value={item.descricao} onChange={(e) => mudar(indice, { descricao: e.target.value })} readOnly={Boolean(item.produtoId || item.servicoId)} />
                  </div>
                  <div>
                    <button type="button" className={estilos.remover} aria-label={`Tirar ${item.descricao || "item"}`} onClick={() => setItens((atual) => atual.filter((_, i) => i !== indice))}><X aria-hidden /></button>
                  </div>
                  <div>
                    <span className={estilos.qtd}>
                      <button type="button" aria-label="Menos um" onClick={() => mudar(indice, { quantidade: Math.max(1, item.quantidade - 1) })}><Minus aria-hidden /></button>
                      <b className={estilos.num}>{item.quantidade}</b>
                      <button type="button" aria-label="Mais um" onClick={() => mudar(indice, { quantidade: item.quantidade + 1 })}><Plus aria-hidden /></button>
                    </span>
                    <span>×</span>
                    <Input aria-label="Preço de cada" inputMode="decimal" className="max-w-[120px]" defaultValue={reaisDoCampo(item.precoUnitarioCentavos)} onBlur={(e) => mudar(indice, { precoUnitarioCentavos: paraCentavos(e.target.value) })} placeholder="0,00" />
                  </div>
                  <b className={estilos.num} style={{ alignSelf: "center" }}>{formatarMoeda(item.quantidade * item.precoUnitarioCentavos)}</b>
                </div>
              ))}
              <div className={estilos.busca}>
                <Search aria-hidden />
                <input aria-label="Procurar no catálogo" value={procura} onChange={(e) => setProcura(e.target.value)} placeholder={catalogo && catalogo.produtos.length + catalogo.servicos.length === 0 ? "Catálogo vazio: use o item avulso" : "Procurar produto ou serviço"} />
              </div>
              {encontrados.length > 0 && (
                <div className={estilos.resultados}>
                  {encontrados.map((achado) => (
                    <button key={`${achado.tipo}-${achado.id}`} type="button" className={estilos.resultado} onClick={() => adicionar(achado)}>
                      <span>{achado.nome} <small>· {achado.tipo === "servico" ? "serviço" : "peça"}</small></span>
                      <span className={estilos.num}>{formatarMoeda(achado.precoCentavos)}</span>
                    </button>
                  ))}
                </div>
              )}
              <button type="button" className={`${estilos.botao} ${estilos.pequeno}`} style={{ justifySelf: "start" }} onClick={() => setItens((atual) => [...atual, comChave({ produtoId: null, servicoId: null, descricao: "", quantidade: 1, precoUnitarioCentavos: 0 })])}>
                <Plus aria-hidden />Item avulso
              </button>
            </div>

            <div className={estilos.dois}>
              <label className={estilos.campo}>Desconto em R$<Input inputMode="decimal" value={desconto} onChange={(e) => setDesconto(e.target.value)} placeholder="0,00" /></label>
              <label className={estilos.campo}>Vale por
                <SelectNative value={validade} onChange={(e) => setValidade(e.target.value)}>
                  {["3", "7", "15", "30"].map((dias) => <option key={dias} value={dias}>{dias} dias{orcamento ? " a partir de hoje" : ""}</option>)}
                </SelectNative>
              </label>
            </div>

            <div className={estilos.form}>
              <label className={estilos.campo}>Pagamento
                <SelectNative value={forma} onChange={(e) => setForma(e.target.value as typeof forma)}>
                  <option value="vista">À vista</option>
                  <option value="entrada">Entrada e parcelas</option>
                  <option value="parcelado">Parcelado, sem entrada</option>
                </SelectNative>
              </label>
              {forma !== "vista" && (
                <div className={estilos.dois}>
                  {forma === "entrada" && <label className={estilos.campo}>Entrada<Input inputMode="decimal" value={entrada} onChange={(e) => setEntrada(e.target.value)} placeholder="0,00" /></label>}
                  <label className={estilos.campo}>Parcelas<Input inputMode="numeric" value={parcelas} onChange={(e) => setParcelas(e.target.value.replace(/\D/g, ""))} /></label>
                </div>
              )}
            </div>

            <label className={estilos.campo}>Observação para o cliente<Textarea rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Prazo de entrega, garantia, o que não está incluso" maxLength={500} /></label>

            <div className={estilos.totalEditor}>
              <span>Total</span>
              <span className={estilos.grande}>{formatarMoeda(total)}</span>
            </div>
            {forma !== "vista" && total > 0 && (
              <p className={estilos.dica}>
                {plano.entradaCentavos > 0 ? `Entrada de ${formatarMoeda(plano.entradaCentavos)} e ` : ""}
                {plano.parcelas.length} {plano.parcelas.length === 1 ? "parcela" : "parcelas"} de {formatarMoeda(plano.parcelas[0] ?? 0)}
                {plano.parcelas.some((valor) => valor !== plano.parcelas[0]) ? ` (a última de ${formatarMoeda(plano.parcelas[plano.parcelas.length - 1]!)})` : ""}.
              </p>
            )}
            {erro && <p className={estilos.erro}>{erro}</p>}
            <div className={estilos.acoes}>
              {orcamento?.status === "ENVIADO" ? (
                <button type="button" className={estilos.botao} data-principal disabled={ocupado} onClick={() => void salvar(false)}>Salvar a versão nova</button>
              ) : (
                <>
                  <button type="button" className={estilos.botao} data-principal disabled={ocupado} onClick={() => void salvar(true)}>Salvar e enviar o link</button>
                  <button type="button" className={estilos.botao} disabled={ocupado} onClick={() => void salvar(false)}>Salvar rascunho</button>
                </>
              )}
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
