"use client"

import { useEffect, useState } from "react"

import { useRouter } from "next/navigation"

import Link from "next/link"

import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { Cartao, Vazio } from "@/components/ui/painel"
import { showToast } from "@/components/ui/toast"
import { RelatarProblema } from "@/components/relatar-problema"
import { VigiasConfig } from "@/components/vigias-config"
import { FotoDePerfil } from "@/components/foto-de-perfil"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { BuscaBancoPerfil, IdentidadeBanco } from "@/components/banco-perfil"
import { Button } from "@/components/ui/button"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody } from "@/components/ui/dialog"
import { SelectNative } from "@/components/ui/select-native"

interface Conta {
  id: string
  nome: string
  tipo: string
  instituicao: string | null
  saldoCentavos: number
  limiteCentavos: number | null
  diaVencimento: number | null
}

interface Conexao {
  id: string
  instituicao: string
  status: string
  ultimaSync: string | null
  diasParaExpirar: number | null
}

const TIPOS_CONTA = [
  { valor: "CORRENTE", rotulo: "Conta corrente" },
  { valor: "POUPANCA", rotulo: "Poupança" },
  { valor: "CARTAO_CREDITO", rotulo: "Cartão de crédito" },
  { valor: "DINHEIRO", rotulo: "Dinheiro" },
  { valor: "INVESTIMENTO", rotulo: "Investimento" },
  { valor: "PJ_MEI", rotulo: "Conta do CNPJ (MEI)" },
]

export default function Configuracoes() {
  const router = useRouter()
  const [contas, setContas] = useState<Conta[]>([])
  const [openFinance, setOpenFinance] = useState<{ provedor: string; sandbox: boolean; conexoes: Conexao[] } | null>(
    null,
  )
  const [nova, setNova] = useState({ nome: "", tipo: "CORRENTE", instituicao: "", saldo: "", limite: "", venc: "" })
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [cadastroAberto, setCadastroAberto] = useState(false)
  const [salvandoConta, setSalvandoConta] = useState(false)
  const [completando, setCompletando] = useState(false)
  const [erroConta, setErroConta] = useState<string | null>(null)

  async function recarregar() {
    const [lista, of] = await Promise.all([
      buscar<Conta[]>("/api/contas"),
      buscar<{ provedor: string; sandbox: boolean; conexoes: Conexao[] }>("/api/open-finance"),
    ])
    setContas(lista)
    setOpenFinance(of)
  }

  useEffect(() => {
    recarregar().catch(() => setMensagem("Não consegui carregar suas contas. Atualize a página."))
  }, [])

  async function criarConta(evento: React.FormEvent) {
    evento.preventDefault()
    if (salvandoConta) return
    setSalvandoConta(true)
    setErroConta(null)
    try {
    if (!nova.nome.trim()) throw new Error("Dê um nome à conta.")
    const campos = nova.tipo === "CARTAO_CREDITO" ? [nova.saldo, nova.limite] : [nova.saldo]
    if (campos.some((valor) => valor.trim() && !/^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:[,.]\d{1,2})?$/.test(valor.trim()))) {
      throw new Error("Informe os valores como 1.234,56 ou 1234.56.")
    }
    if (campos.some((valor) => Math.abs(paraCentavos(valor)) > 2147483647)) throw new Error("Valor acima do limite permitido.")
    if (nova.tipo === "CARTAO_CREDITO") {
      if (paraCentavos(nova.limite) < 0) throw new Error("O limite não pode ser negativo.")
      if (nova.venc && (!Number.isInteger(Number(nova.venc)) || Number(nova.venc) < 1 || Number(nova.venc) > 31)) throw new Error("Escolha um dia entre 1 e 31.")
    }
    await enviar("/api/contas", {
      nome: nova.nome.trim(),
      tipo: nova.tipo,
      instituicao: nova.instituicao.trim() || undefined,
      saldoInicialCentavos: nova.saldo ? paraCentavos(nova.saldo) : 0,
      limiteCentavos: nova.tipo === "CARTAO_CREDITO" && nova.limite ? paraCentavos(nova.limite) : undefined,
      diaVencimento: nova.tipo === "CARTAO_CREDITO" && nova.venc ? Number(nova.venc) : undefined,
    })
    setNova({ nome: "", tipo: "CORRENTE", instituicao: "", saldo: "", limite: "", venc: "" })
    setCadastroAberto(false)
    showToast("Conta adicionada")
    await recarregar().catch(() => setMensagem("Conta salva. Atualize a página para recarregar."))
    } catch (erro) {
      setErroConta(erro instanceof Error ? erro.message : "Não consegui salvar a conta.")
    } finally { setSalvandoConta(false) }
  }

  async function conectarBanco() {
    try {
      const { url } = await enviar<{ url: string }>("/api/open-finance", {})
      // A autenticação acontece no site do banco, nunca dentro do app.
      window.location.href = url
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : "Não consegui iniciar a conexão.")
    }
  }

  async function sincronizar(conexaoId: string) {
    setMensagem("Sincronizando…")
    try {
      const resultado = await enviar<{ transacoesNovas: number }>("/api/open-finance", { conexaoId }, "PUT")
      setMensagem(`${resultado.transacoesNovas} lançamento(s) novo(s).`)
      await recarregar()
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : "Falha na sincronização.")
    }
  }

  /**
   * "Desfazer em vez de confirmar" — mesmo padrão de `/recorrencias`. A
   * conexão some da lista na hora; o DELETE de verdade (que só revoga,
   * sem apagar a conexão) sai depois de 5s sem ninguém desfazer.
   */
  function revogarConexao(conexao: Conexao) {
    setOpenFinance((atual) =>
      atual ? { ...atual, conexoes: atual.conexoes.filter((c) => c.id !== conexao.id) } : atual,
    )

    let desfeito = false
    showToast(`Conexão com ${conexao.instituicao} revogada`, {
      action: {
        label: "Desfazer",
        onClick: () => {
          desfeito = true
          setOpenFinance((atual) =>
            atual && !atual.conexoes.some((c) => c.id === conexao.id)
              ? { ...atual, conexoes: [...atual.conexoes, conexao] }
              : atual,
          )
        },
      },
    })

    setTimeout(async () => {
      if (desfeito) return
      await buscar(`/api/open-finance?conexaoId=${conexao.id}`, { method: "DELETE" })
    }, 5000)
  }

  async function completarPerfil() {
    if (completando) return
    setCompletando(true)
    try {
      await buscar("/api/onboarding", { method: "DELETE" })
      router.push("/bem-vindo")
    } catch (erro) {
      setCompletando(false)
      showToast(erro instanceof Error ? erro.message : "Não consegui abrir seu perfil.", { variant: "error" })
    }
  }

  return (
    <div className="space-y-4">
      <Cartao titulo="Seu perfil">
        <FotoDePerfil />
        <Button variant="ghost" size="sm" className="mt-3" onClick={completarPerfil} disabled={completando}>{completando ? "Abrindo…" : "Completar perfil"}</Button>
      </Cartao>

      <Cartao titulo="Assinatura">
        <p className="text-[13px] leading-relaxed text-muted-fg">
          Plano contratado, situação do pagamento, próxima cobrança e cancelamento ficam numa tela só.
        </p>
        <Link
          href="/assinatura"
          className="mt-3 inline-block rounded-full border border-pauta px-5 py-2.5 text-[13px] transition-colors hover:border-acao/40"
        >
          Ver minha assinatura
        </Link>
      </Cartao>

      <Cartao titulo="Contas e cartões">
        <div className="divide-y divide-pauta">
          {contas.map((conta) => (
            <div key={conta.id} className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-x-3 gap-y-1 py-3 sm:grid-cols-[40px_minmax(0,1fr)_auto]">
              <IdentidadeBanco instituicao={conta.instituicao} nome={conta.nome} />
              <div className="min-w-0 flex-1 break-words">
                <p className="text-sm">{conta.nome}</p>
                <p className="text-[12px] text-muted-fg">
                  {TIPOS_CONTA.find((tipo) => tipo.valor === conta.tipo)?.rotulo ?? conta.tipo}
                  {conta.instituicao && ` · ${conta.instituicao}`}
                  {conta.limiteCentavos ? ` · limite ${formatarMoeda(conta.limiteCentavos)}` : ""}
                </p>
              </div>
              <span className={`col-start-2 whitespace-nowrap text-sm font-semibold tabular-nums sm:col-start-3 ${conta.saldoCentavos < 0 ? "text-negativo" : ""}`}>
                {formatarMoeda(conta.saldoCentavos)}
              </span>
            </div>
          ))}
          {contas.length === 0 && <Vazio titulo="Nenhuma conta cadastrada" />}
        </div>

        <Dialog open={cadastroAberto} onOpenChange={(aberto) => { if (!salvandoConta) setCadastroAberto(aberto) }}>
          <DialogTrigger asChild><Button variant="outline" size="sm" className="mt-3">Adicionar conta ou cartão</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Adicionar conta ou cartão</DialogTitle><DialogDescription>Informe os dados da sua conta.</DialogDescription></DialogHeader>
            <DialogBody>
        <form onSubmit={criarConta} className="grid gap-3">
<fieldset disabled={salvandoConta} className="min-w-0">
<FieldGroup>
          <Field><FieldLabel htmlFor="conta-nome">Nome da conta</FieldLabel><Input id="conta-nome" value={nova.nome}
            onChange={(evento) => setNova({ ...nova, nome: evento.target.value })}
            placeholder="nome da conta"
            required
          /></Field>
          <Field><FieldLabel htmlFor="conta-tipo">Tipo</FieldLabel><SelectNative id="conta-tipo" value={nova.tipo} onChange={(evento) => setNova({ ...nova, tipo: evento.target.value })}>
            {TIPOS_CONTA.map((tipo) => (
              <option key={tipo.valor} value={tipo.valor}>
                {tipo.rotulo}
              </option>
            ))}
          </SelectNative></Field>
          <Field><FieldLabel htmlFor="conta-instituicao">Banco ou instituição</FieldLabel>
            <BuscaBancoPerfil valor={nova.instituicao} aoMudar={(instituicao) => setNova({ ...nova, instituicao })}
              nomesExistentes={contas.flatMap((conta) => conta.instituicao ? [conta.instituicao] : [])} desabilitado={salvandoConta} />
          </Field>
          <Field><FieldLabel htmlFor="conta-saldo">Saldo atual (R$)</FieldLabel><Input inputMode="decimal" id="conta-saldo" value={nova.saldo}
            onChange={(evento) => setNova({ ...nova, saldo: evento.target.value })}
            placeholder="saldo atual (ex.: -6.582,74)"
          /></Field>
          {nova.tipo === "CARTAO_CREDITO" && (
            <>
              <Field><FieldLabel htmlFor="conta-limite">Limite total (R$)</FieldLabel><Input inputMode="decimal" id="conta-limite" value={nova.limite}
                onChange={(evento) => setNova({ ...nova, limite: evento.target.value })}
                placeholder="limite total"
              /></Field>
              <Field><FieldLabel htmlFor="conta-venc">Dia do vencimento</FieldLabel><Input id="conta-venc" value={nova.venc}
                onChange={(evento) => setNova({ ...nova, venc: evento.target.value })}
                type="number" min={1} max={31} step={1}
                placeholder="dia do vencimento"
              /></Field>
            </>
          )}
</FieldGroup>
</fieldset>
          {erroConta && <p role="alert" className="text-sm text-negativo">{erroConta}</p>}
          <Button disabled={salvandoConta}>{salvandoConta ? "Salvando…" : "Adicionar"}</Button>
          <Button type="button" variant="ghost" disabled={salvandoConta} onClick={() => setCadastroAberto(false)}>Cancelar</Button>
        </form>
            </DialogBody>
          </DialogContent>
        </Dialog>
      </Cartao>

      <Cartao titulo="Conexão com o banco (Open Finance)">
        {openFinance?.sandbox && (
          <p className="mb-3 rounded-2xl border border-atencao/40 bg-atencao/10 p-3 text-xs text-atencao">
            Modo de demonstração: os dados desta conexão são fictícios, gerados localmente. Para conectar bancos de
            verdade é preciso contratar um agregador autorizado pelo Banco Central (Pluggy, Belvo ou equivalente) e
            preencher as credenciais no arquivo <code>.env</code>.
          </p>
        )}

        <p className="text-sm text-muted-fg">
          A autenticação acontece no site do seu banco. O app nunca recebe sua senha — recebe apenas uma permissão de
          leitura, com prazo definido, que você pode revogar a qualquer momento aqui ou no aplicativo da instituição.
        </p>

        <div className="mt-4 space-y-2">
          {openFinance?.conexoes.map((conexao) => (
            <div key={conexao.id} className="flex items-center justify-between rounded-[var(--raio-cartao)] border border-pauta p-3">
              <div>
                <p className="text-sm">{conexao.instituicao}</p>
                <p className="text-[12px] text-muted-fg">
                  {conexao.status.toLowerCase()}
                  {conexao.ultimaSync && ` · última sincronização ${new Date(conexao.ultimaSync).toLocaleString("pt-BR")}`}
                  {conexao.diasParaExpirar !== null && ` · consentimento expira em ${conexao.diasParaExpirar} dias`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => sincronizar(conexao.id)}
                  className="rounded-full border border-pauta px-3 py-1.5 text-xs hover:border-acao/40"
                >
                  sincronizar
                </button>
                <button
                  onClick={() => revogarConexao(conexao)}
                  className="rounded-full border border-pauta px-3 py-1.5 text-xs hover:border-negativo/40"
                >
                  revogar
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={conectarBanco}
          className="mt-4 rounded-full border border-acao/40 bg-acao/10 px-5 py-2.5 text-sm text-acao"
        >
          Conectar um banco
        </button>

        {mensagem && <p className="mt-3 text-sm text-muted-fg">{mensagem}</p>}
      </Cartao>

      <VigiasConfig />

      {/* Regras e Assinatura saíram da navegação principal em 07/09/2026:
          são manutenção, não uso do dia a dia — ninguém abre o app de manhã
          para mexer em regra de categorização ou trocar de plano. Nenhuma
          das duas telas foi removida, só o link mudou de lugar. */}
      <Cartao titulo="Preferências">
        <div className="grid gap-2 sm:grid-cols-2">
          <Link
            href="/regras"
            className="rounded-[var(--raio-cartao)] border border-pauta p-4 text-sm transition hover:border-acao/40"
          >
            <p className="font-medium">Regras de categorização</p>
            <p className="mt-1 text-[13px] text-muted-fg">
              Como o Tino decide sozinho a categoria de um lançamento novo.
            </p>
          </Link>
          <Link
            href="/assinatura"
            className="rounded-[var(--raio-cartao)] border border-pauta p-4 text-sm transition hover:border-acao/40"
          >
            <p className="font-medium">Assinatura do Tino</p>
            <p className="mt-1 text-[13px] text-muted-fg">Seu plano, cobrança e cancelamento.</p>
          </Link>
        </div>
      </Cartao>

      <RelatarProblema />
    </div>
  )
}
