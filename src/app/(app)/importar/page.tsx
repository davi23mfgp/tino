"use client"

import { useEffect, useState } from "react"

import { buscar, enviar } from "@/lib/cliente"
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
  hashImport: string
  duplicada: boolean
  categoriaId?: string
  categoriaNome?: string
  confianca: number
}

interface Previa {
  formato: "ofx" | "csv" | "pdf"
  total: number
  novas: number
  duplicadas: number
  semCategoria: number
  lancamentos: LancamentoPrevia[]
  avisos: string[]
}

export default function Importar() {
  const [contas, setContas] = useState<Conta[]>([])
  const [contaId, setContaId] = useState("")
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [faturaCartao, setFaturaCartao] = useState(false)
  const [previa, setPrevia] = useState<Previa | null>(null)
  const [senhaPdf, setSenhaPdf] = useState("")
  const [pedirSenha, setPedirSenha] = useState<{ senhaIncorreta: boolean; erro: string } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)

  useEffect(() => {
    buscar<Conta[]>("/api/contas").then((lista) => {
      setContas(lista)
      setContaId(lista[0]?.id ?? "")
    })
  }, [])

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
          lancamentos: previa.lancamentos.map((lancamento) => ({
            data: lancamento.data,
            descricao: lancamento.descricaoSugerida,
            descricaoOriginal: lancamento.descricao,
            valorCentavos: lancamento.valorCentavos,
            tipo: lancamento.tipo,
            categoriaId: lancamento.categoriaId ?? null,
            hashImport: lancamento.hashImport,
            duplicada: lancamento.duplicada,
          })),
        },
        "PUT",
      )
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
      <Cartao titulo="Importar extrato ou fatura">
        <p className="text-sm text-muted-fg">
          Aceita OFX, CSV e PDF. O Tino lê, categoriza pelo que já aprendeu e mostra tudo antes de gravar — nada
          entra sem você conferir. Reimportar o mesmo arquivo não duplica lançamento.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs uppercase tracking-widest text-muted-fg">Conta</span>
            <SelectNative value={contaId} onChange={(evento) => setContaId(evento.target.value)}>
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
              aoEscolher={setArquivo}
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
                <span className="w-20 shrink-0 text-[12px] text-muted-fg">
                  {new Date(lancamento.data).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {lancamento.descricaoSugerida}
                  {lancamento.categoriaNome && (
                    <span className="ml-2 rounded-full bg-papel-2 px-2 py-0.5 text-[10px]">
                      {lancamento.categoriaNome}
                    </span>
                  )}
                  {lancamento.duplicada && <span className="ml-2 text-[10px] text-muted-fg">já importado</span>}
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

      {!previa && (
        <Cartao titulo="Conectar banco automaticamente">
          <p className="text-sm text-muted-fg">
            A conexão automática usa Open Finance por meio de um agregador autorizado pelo Banco Central. Sua senha do
            banco nunca passa por aqui: a autenticação acontece no site da instituição e o app recebe só a permissão de
            leitura, que você pode revogar quando quiser.
          </p>
          <p className="mt-2 text-[12px] text-muted-fg">
            Configure as credenciais do agregador no arquivo <code>.env</code> para habilitar.
          </p>
        </Cartao>
      )}
    </div>
  )
}
