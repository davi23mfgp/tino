"use client"

import { FaturasEmail } from "@/components/faturas-email"
import { useEffect, useState } from "react"

import { buscar, enviar } from "@/lib/cliente"
import { rotuloCompetencia } from "@/lib/datas"
import { formatarMoeda } from "@/lib/dinheiro"
import { Cartao, Metrica, Vazio } from "@/components/ui/painel"
import { SelectNative } from "@/components/ui/select-native"
import { Checkbox } from "@/components/ui/checkbox"
import { ZonaDeArquivo } from "@/components/ui/filesystem-item"

interface Conta {
  id: string
  nome: string
  tipo: string
}

interface LancamentoPrevia {
  data: string
  descricao: string
  descricaoSugerida: string
  valorCentavos: number
  tipo: "RECEITA" | "DESPESA"
  possivelDuplicada?: boolean
  hashImport: string
  duplicada: boolean
  categoriaId?: string
  categoriaNome?: string
  confianca: number
  dataCompra?: string
  parcelaAtual?: number
  parcelasTotal?: number
  categoriaPelaIa?: boolean
}

interface Previa {
  formato: "ofx" | "csv" | "pdf"
  total: number
  novas: number
  duplicadas: number
  semCategoria: number
  lancamentos: LancamentoPrevia[]
  avisos: string[]
  conferencia?: { informadoCentavos: number; lidoCentavos: number }
  faturaPdf?: boolean
  lidoPelaIa?: boolean
  competenciaFatura?: string
  diaVencimento?: number
  parcelasFuturas?: { compras: number; totalCentavos: number; porMes: { competencia: string; totalCentavos: number }[] }
  futuroInformadoCentavos?: number
}

export function Importador({ contaInicial = "", aoConcluir }: { contaInicial?: string; aoConcluir?: () => void }) {
  const [contas, setContas] = useState<Conta[]>([])
  const [contaId, setContaId] = useState(contaInicial)
  const [recebidoId,setRecebidoId]=useState<string|null>(null)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [faturaCartao, setFaturaCartao] = useState(Boolean(contaInicial))
  const [previa, setPrevia] = useState<Previa | null>(null)
  const [senhaPdf, setSenhaPdf] = useState("")
  const [pedirSenha, setPedirSenha] = useState<{ senhaIncorreta: boolean; erro: string } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)

  useEffect(() => {
    buscar<Conta[]>("/api/contas").then((lista) => {
      setContas(lista)
      setContaId(lista.find(c => c.id === contaInicial)?.id ?? lista[0]?.id ?? "")
    }).catch(() => setMensagem("Não foi possível carregar as contas. Recarregue a página."))
  }, [contaInicial])

  async function analisar() {
    if (!arquivo || !contaId) return
    setOcupado(true)
    setMensagem(null)

    const formulario = new FormData()
    formulario.append("arquivo", arquivo)
    formulario.append("contaId", contaId)
    if (faturaCartao) formulario.append("faturaCartao", "1")
    if (senhaPdf) formulario.append("senhaPdf", senhaPdf)

    try {
      const resposta = await fetch("/api/importar", { method: "POST", body: formulario })
      const dados = await resposta.json()
      if (!resposta.ok) throw new Error(dados.erro)

      // PDF cifrado não é erro: é uma pergunta. A tela mostra o campo de senha
      // em vez de uma falha genérica que não diz o que fazer.
      if (dados.precisaSenha) {
        setPedirSenha({ senhaIncorreta: dados.senhaIncorreta, erro: dados.erro })
        setPrevia(null)
        return
      }

      setPedirSenha(null)
      setPrevia(dados)
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : "Falha ao ler o arquivo.")
    } finally {
      setOcupado(false)
    }
  }

  async function confirmar() {
    if (!previa || !arquivo) return
    setOcupado(true)

    try {
      const resultado = await enviar<{ importadas: number }>(
        "/api/importar",
        {
          contaId,
          arquivoNome: arquivo.name,
          formato: previa.formato,
          competenciaFatura: previa.competenciaFatura,
          diaVencimento: previa.diaVencimento,
          lancamentos: previa.lancamentos.map((lancamento) => ({
            data: lancamento.data,
            descricao: lancamento.descricaoSugerida,
            descricaoOriginal: lancamento.descricao,
            valorCentavos: lancamento.valorCentavos,
            tipo: lancamento.tipo,
            categoriaId: lancamento.categoriaId ?? null,
            hashImport: lancamento.hashImport,
            duplicada: lancamento.duplicada,
            parcelaAtual: lancamento.parcelaAtual,
            parcelasTotal: lancamento.parcelasTotal,
            dataCompra: lancamento.dataCompra,
          })),
        },
        "PUT",
      )
      if(recebidoId){await enviar(`/api/faturas-email/${recebidoId}`,{},"DELETE");setRecebidoId(null)}
      aoConcluir?.()
      setMensagem(`${resultado.importadas} lançamento(s) importado(s).`)
      setPrevia(null)
      setArquivo(null)
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : "Falha ao importar.")
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="space-y-4">
      {contaId&&<FaturasEmail contaId={contaId} aoEscolher={(arquivo,id)=>{setArquivo(arquivo);setRecebidoId(id);setPrevia(null);setMensagem("Fatura recebida selecionada. Clique em analisar para conferir.")}}/>}
      <Cartao titulo="Importar extrato ou fatura">
        <p className="text-sm text-muted-fg">
          Envie OFX, CSV ou PDF. Confira os lançamentos antes de importar.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs uppercase tracking-widest text-muted-fg">Conta</span>
            <SelectNative disabled={Boolean(contaInicial)||ocupado} value={contaId} onChange={(evento) => {setContaId(evento.target.value);setPrevia(null);setRecebidoId(null);setArquivo(null)}}>
              {contas.map((conta) => (
                <option key={conta.id} value={conta.id}>
                  {conta.nome}
                </option>
              ))}
            </SelectNative>
          </label>

          <div className="space-y-1.5">
            <span className="text-xs uppercase tracking-widest text-muted-fg">Arquivo</span>
            <ZonaDeArquivo
              arquivo={arquivo}
              aoEscolher={arquivo=>{setArquivo(arquivo);setRecebidoId(null);setPrevia(null)}}
              aceita=".ofx,.qfx,.csv,.txt,.pdf"
              rotulo="Solte o extrato aqui (OFX, CSV ou PDF) ou clique para escolher"
            />
          </div>
        </div>

        {pedirSenha && (
          <div className="mt-3 space-y-2 rounded-2xl border border-atencao/40 bg-atencao/10 p-3">
            <p className="text-sm text-atencao">{pedirSenha.erro}</p>
            <input
              type="password"
              value={senhaPdf}
              onChange={(evento) => setSenhaPdf(evento.target.value)}
              placeholder="senha do arquivo"
              autoComplete="off"
              className="w-full rounded-[var(--raio-campo)] border border-pauta bg-background px-4 py-2.5 text-sm outline-none focus:border-acao/50"
            />
            <p className="text-xs text-atencao/80">
              A senha é usada só para abrir o arquivo agora e não fica guardada em lugar nenhum.
            </p>
          </div>
        )}

        <div className="mt-3">
          <Checkbox
            checked={faturaCartao}
            onChange={(e) => setFaturaCartao(e.target.checked)}
            rotulo="É fatura de cartão (todo lançamento é gasto, menos estorno)"
          />
        </div>

        <button
          onClick={analisar}
          disabled={!arquivo || !contaId || ocupado}
          className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition disabled:opacity-40"
        >
          {ocupado ? "Lendo…" : "Analisar arquivo"}
        </button>

        {mensagem && <p className="mt-3 text-sm text-positivo">{mensagem}</p>}
      </Cartao>

      {previa && (
        <Cartao titulo="Confira antes de gravar">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metrica rotulo="Encontrados" valor={String(previa.total)} />
            <Metrica rotulo="Novos" valor={String(previa.novas)} tom="positivo" />
            <Metrica rotulo="Já existiam" valor={String(previa.duplicadas)} />
            <Metrica
              rotulo="Sem categoria"
              valor={String(previa.semCategoria)}
              tom={previa.semCategoria > 0 ? "atencao" : "neutro"}
            />
          </div>

          {previa.conferencia && previa.conferencia.lidoCentavos === previa.conferencia.informadoCentavos && (
            <p className="mt-3 rounded-xl border border-positivo/40 bg-positivo/10 p-2.5 text-xs text-positivo">
              A soma dos lançamentos lidos fecha com o total da fatura: {formatarMoeda(previa.conferencia.informadoCentavos)}.
            </p>
          )}

          {previa.parcelasFuturas && previa.parcelasFuturas.compras > 0 && (
            <div className="mt-3 rounded-xl border border-pauta p-3 text-xs">
              <p className="font-medium">
                {previa.parcelasFuturas.compras} compra(s) parcelada(s) continuam nas próximas faturas:{" "}
                {formatarMoeda(previa.parcelasFuturas.totalCentavos)} ao todo.
              </p>
              {previa.futuroInformadoCentavos !== undefined && (
                <p className="mt-1 text-muted-fg">
                  Referência: o banco informa {formatarMoeda(previa.futuroInformadoCentavos)} comprometidos nas próximas faturas.
                </p>
              )}
              {previa.parcelasFuturas.porMes.length > 0 && (
                <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                  {previa.parcelasFuturas.porMes.slice(0, 6).map((mes) => (
                    <li key={mes.competencia} className="flex justify-between gap-2">
                      <span className="text-muted-fg">{rotuloCompetencia(mes.competencia, true)}</span>
                      <span>{formatarMoeda(mes.totalCentavos)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-muted-fg">Ao importar, essas parcelas entram na projeção e no plano de pagamento.</p>
            </div>
          )}

          {previa.avisos.map((aviso) => (
            <p key={aviso} className="mt-3 rounded-xl border border-atencao/40 bg-atencao/10 p-2.5 text-xs text-atencao">
              {aviso}
            </p>
          ))}

          <div className="mt-4 max-h-[400px] divide-y divide-pauta overflow-y-auto">
            {previa.lancamentos.map((lancamento) => (
              <div
                key={lancamento.hashImport}
                className={`flex items-center gap-3 py-2.5 text-sm ${lancamento.duplicada ? "opacity-40" : ""}`}
              >
                {lancamento.possivelDuplicada&&<Checkbox aria-label={`Incluir ${lancamento.descricaoSugerida} mesmo com possível repetição`} checked={!lancamento.duplicada} onChange={e=>{const incluir=e.target.checked;setPrevia(atual=>{if(!atual)return atual;const lancamentos=atual.lancamentos.map(l=>l.hashImport===lancamento.hashImport?{...l,duplicada:!incluir}:l);return {...atual,lancamentos,novas:lancamentos.filter(l=>!l.duplicada).length,duplicadas:lancamentos.filter(l=>l.duplicada).length}})}}/>}
                <span className="w-20 shrink-0 text-[calc(12px*var(--escala-letra))] text-muted-fg">
                  {new Date(lancamento.data).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {lancamento.descricaoSugerida}
                  {lancamento.categoriaNome && (
                    <span className="ml-2 rounded-full bg-papel-2 px-2 py-0.5 text-[max(10px,calc(12px*var(--escala-letra)))]">
                      {lancamento.categoriaNome}
                      {lancamento.categoriaPelaIa && <span title="Sugerida pela IA: confira"> · IA</span>}
                    </span>
                  )}
                  {lancamento.dataCompra && (
                    <span className="ml-2 text-[max(10px,calc(12px*var(--escala-letra)))] text-muted-fg">
                      compra em {new Date(lancamento.dataCompra).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                    </span>
                  )}
                  {lancamento.duplicada && <span className="ml-2 text-[max(10px,calc(12px*var(--escala-letra)))] text-muted-fg">{lancamento.possivelDuplicada?"Possível repetição do celular":"Já importado"}</span>}
                </span>
                <span className={lancamento.tipo === "RECEITA" ? "text-positivo" : ""}>
                  {lancamento.tipo === "RECEITA" ? "+" : "-"}
                  {formatarMoeda(lancamento.valorCentavos)}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={confirmar}
            disabled={ocupado || previa.novas === 0}
            className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            Importar {previa.novas} lançamento(s)
          </button>
        </Cartao>
      )}

    </div>
  )
}
