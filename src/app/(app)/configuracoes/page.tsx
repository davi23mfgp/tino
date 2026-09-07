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
  const [temLoja, setTemLoja] = useState<boolean | null>(null)

  async function recarregar() {
    const [lista, of, mei] = await Promise.all([
      buscar<Conta[]>("/api/contas"),
      buscar<{ provedor: string; sandbox: boolean; conexoes: Conexao[] }>("/api/open-finance"),
      buscar<{ ativo: boolean }>("/api/mei"),
    ])
    setContas(lista)
    setOpenFinance(of)
    setTemLoja(mei.ativo)
  }

  useEffect(() => {
    recarregar()
  }, [])

  async function criarConta(evento: React.FormEvent) {
    evento.preventDefault()
    await enviar("/api/contas", {
      nome: nova.nome,
      tipo: nova.tipo,
      instituicao: nova.instituicao || undefined,
      saldoInicialCentavos: nova.saldo ? paraCentavos(nova.saldo) : 0,
      limiteCentavos: nova.limite ? paraCentavos(nova.limite) : undefined,
      diaVencimento: nova.venc ? Number(nova.venc) : undefined,
    })
    setNova({ nome: "", tipo: "CORRENTE", instituicao: "", saldo: "", limite: "", venc: "" })
    recarregar()
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
      recarregar()
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : "Falha na sincronização.")
    }
  }

  /**
   * Liga e desliga a parte da loja.
   *
   * Desligar apaga o perfil, nunca o histórico: faturamento declarado é prova
   * do que foi informado à Receita, e pode ser preciso anos depois. Quem
   * religar encontra tudo no lugar.
   */
  async function alternarLoja() {
    if (temLoja) {
      await buscar("/api/mei", { method: "DELETE" })
      setMensagem("Parte da loja desligada. O que você já lançou continua guardado.")
    } else {
      await enviar("/api/mei", {}, "PUT")
      setMensagem("Pronto. Balcão, prateleira e MEI apareceram no menu.")
    }

    await recarregar()
    router.refresh()
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

  async function refazerConversa() {
    await buscar("/api/onboarding", { method: "DELETE" })
    router.push("/bem-vindo")
  }

  return (
    <div className="space-y-4">
      <Cartao titulo="Sua foto">
        <FotoDePerfil />
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

      <Cartao titulo="O que o Tino cuida">
        <p className="text-[13px] leading-relaxed text-muted-fg">
          {temLoja
            ? "Você tem o balcão, a prateleira e o acompanhamento do limite do MEI, além das contas pessoais."
            : "Hoje o Tino cuida só das suas contas pessoais."}
        </p>

        <button
          onClick={alternarLoja}
          disabled={temLoja === null}
          className="mt-3 rounded-full border border-pauta px-5 py-2.5 text-[13px] disabled:opacity-50"
        >
          {temLoja ? "Desligar a parte da loja" : "Ligar a parte da loja (sou MEI)"}
        </button>

        <p className="mt-3 text-[12px] leading-relaxed text-muted-fg">
          {temLoja
            ? "Desligar tira balcão, prateleira e MEI do menu. As vendas e o faturamento já lançados continuam guardados — se religar, tudo volta como estava."
            : "Ligar acrescenta venda no balcão, controle de estoque e acompanhamento do limite anual do MEI."}
        </p>
      </Cartao>

      <Cartao titulo="Conversa inicial">
        <p className="text-[13px] leading-relaxed text-muted-fg">
          Responder as perguntas do Tino é o que faz o painel, a projeção e o plano de pagamento saírem do zero.
          Nada do que você já cadastrou é apagado: o que responder soma ao que existe.
        </p>
        <button
          onClick={refazerConversa}
          className="mt-3 rounded-full border border-acao/40 bg-acao/10 px-5 py-2.5 text-[13px] text-acao"
        >
          Responder as perguntas do Tino
        </button>
      </Cartao>

      <Cartao titulo="Contas e cartões">
        <div className="divide-y divide-pauta">
          {contas.map((conta) => (
            <div key={conta.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm">{conta.nome}</p>
                <p className="text-[12px] text-muted-fg">
                  {TIPOS_CONTA.find((tipo) => tipo.valor === conta.tipo)?.rotulo ?? conta.tipo}
                  {conta.instituicao && ` · ${conta.instituicao}`}
                  {conta.limiteCentavos ? ` · limite ${formatarMoeda(conta.limiteCentavos)}` : ""}
                </p>
              </div>
              <span className={`text-sm ${conta.saldoCentavos < 0 ? "text-negativo" : ""}`}>
                {formatarMoeda(conta.saldoCentavos)}
              </span>
            </div>
          ))}
          {contas.length === 0 && <Vazio titulo="Nenhuma conta cadastrada" />}
        </div>

        <form onSubmit={criarConta} className="mt-4 grid gap-2 sm:grid-cols-3">
          <input
            value={nova.nome}
            onChange={(evento) => setNova({ ...nova, nome: evento.target.value })}
            placeholder="nome da conta"
            required
            className="rounded-[var(--raio-campo)] border border-pauta bg-background px-4 py-2.5 text-sm"
          />
          <SelectNative value={nova.tipo} onChange={(evento) => setNova({ ...nova, tipo: evento.target.value })}>
            {TIPOS_CONTA.map((tipo) => (
              <option key={tipo.valor} value={tipo.valor}>
                {tipo.rotulo}
              </option>
            ))}
          </SelectNative>
          <input
            value={nova.instituicao}
            onChange={(evento) => setNova({ ...nova, instituicao: evento.target.value })}
            placeholder="banco"
            className="rounded-[var(--raio-campo)] border border-pauta bg-background px-4 py-2.5 text-sm"
          />
          <input
            value={nova.saldo}
            onChange={(evento) => setNova({ ...nova, saldo: evento.target.value })}
            placeholder="saldo atual (ex.: -6.582,74)"
            className="rounded-[var(--raio-campo)] border border-pauta bg-background px-4 py-2.5 text-sm"
          />
          {nova.tipo === "CARTAO_CREDITO" && (
            <>
              <input
                value={nova.limite}
                onChange={(evento) => setNova({ ...nova, limite: evento.target.value })}
                placeholder="limite total"
                className="rounded-[var(--raio-campo)] border border-pauta bg-background px-4 py-2.5 text-sm"
              />
              <input
                value={nova.venc}
                onChange={(evento) => setNova({ ...nova, venc: evento.target.value })}
                placeholder="dia do vencimento"
                className="rounded-[var(--raio-campo)] border border-pauta bg-background px-4 py-2.5 text-sm"
              />
            </>
          )}
          <button className="rounded-[var(--raio-pilula)] bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground sm:col-span-3">
            Adicionar conta
          </button>
        </form>
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
