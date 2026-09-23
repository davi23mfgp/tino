"use client"

import { useEffect, useState } from "react"

import { useRouter } from "next/navigation"

import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda, paraCentavos } from "@/lib/dinheiro"
import { GrupoAjustes, LinhaAjuste } from "@/components/ui/ajustes"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { showToast } from "@/components/ui/toast"
import { RelatarProblema } from "@/components/relatar-problema"
import { VigiasConfig } from "@/components/vigias-config"
import { ConfigAtalhoLancar } from "@/components/config-atalho-lancar"
import { MeusDados } from "@/components/meus-dados"
import { Aparencia } from "@/components/aparencia"
import { FotoDePerfil } from "@/components/foto-de-perfil"
import { Input } from "@/components/ui/input"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
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

/// Bandeiras que o Tino sabe desenhar. "Outra" existe para quem tem uma que
/// não está na lista e ainda assim quer o campo preenchido.
const BANDEIRAS = [
  { valor: "VISA", rotulo: "Visa" },
  { valor: "MASTERCARD", rotulo: "Mastercard" },
  { valor: "ELO", rotulo: "Elo" },
  { valor: "AMERICAN_EXPRESS", rotulo: "American Express" },
  { valor: "HIPERCARD", rotulo: "Hipercard" },
  { valor: "OUTRA", rotulo: "Outra" },
]

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
  const [nova, setNova] = useState({ nome: "", tipo: "CORRENTE", instituicao: "", saldo: "", limite: "", venc: "", bandeira: "" })
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
      bandeira: nova.tipo === "CARTAO_CREDITO" && nova.bandeira ? nova.bandeira : undefined,
    })
    setNova({ nome: "", tipo: "CORRENTE", instituicao: "", saldo: "", limite: "", venc: "", bandeira: "" })
    setCadastroAberto(false)
    showToast("Conta adicionada")
    await recarregar().catch(() => setMensagem("Conta salva. Atualize a página para recarregar."))
    } catch (erro) {
      setErroConta(erro instanceof Error ? erro.message : "Não consegui salvar a conta.")
    } finally { setSalvandoConta(false) }
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


  const totalContas = contas.reduce((soma, conta) => soma + conta.saldoCentavos, 0)
  const conectados = openFinance?.conexoes.length ?? 0

  return (
    // Dois grupos lado a lado no desktop, empilhados no celular — a
    // anatomia da referência aprovada em 13/09. `items-start` impede que o
    // grupo mais curto estique até a altura do outro e crie o espaço vazio
    // que Davi apontou.
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <GrupoAjustes titulo="Conta">
        <LinhaAjuste titulo="Seu perfil" descricao="Foto e nome que aparecem no app" acao="Editar">
          <FotoDePerfil />
          <Button variant="ghost" size="sm" className="mt-3" onClick={completarPerfil} disabled={completando}>
            {completando ? "Abrindo…" : "Completar perfil"}
          </Button>
        </LinhaAjuste>

        <LinhaAjuste
          titulo="Contas e cartões"
          descricao={
            contas.length
              ? `${contas.length} ${contas.length === 1 ? "cadastrada" : "cadastradas"} · ${formatarMoeda(totalContas)}`
              : "Nenhuma cadastrada"
          }
          acao="Gerenciar"
        >
          <div className="divide-y divide-pauta">
            {contas.map((conta) => (
              <div key={conta.id} className="flex items-center gap-3 py-2.5">
                <IdentidadeBanco instituicao={conta.instituicao} nome={conta.nome} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{conta.nome}</p>
                  <p className="truncate text-[calc(12px*var(--escala-letra))] text-muted-fg">
                    {TIPOS_CONTA.find((tipo) => tipo.valor === conta.tipo)?.rotulo ?? conta.tipo}
                    {conta.instituicao && ` · ${conta.instituicao}`}
                    {conta.limiteCentavos ? ` · limite ${formatarMoeda(conta.limiteCentavos)}` : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums ${conta.saldoCentavos < 0 ? "text-negativo" : ""}`}
                >
                  {formatarMoeda(conta.saldoCentavos)}
                </span>
              </div>
            ))}
            {contas.length === 0 && (
              <Empty className="py-6">
                <EmptyHeader>
                  <EmptyTitle className="text-sm">Nenhuma conta cadastrada</EmptyTitle>
                  <EmptyDescription className="text-[calc(13px*var(--escala-letra))]">
                    Cadastre a primeira para o Tino acompanhar saldo e fatura.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>

          <Dialog
            open={cadastroAberto}
            onOpenChange={(aberto) => {
              if (!salvandoConta) setCadastroAberto(aberto)
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="mt-3">
                Adicionar conta ou cartão
              </Button>
            </DialogTrigger>
            {/* Formulário longo: duas colunas no desktop, uma no celular.
                Antes era coluna única de 480px com campos de 60px de altura,
                o que produzia a rolagem dupla da captura de 13/09. */}
            <DialogContent className="sm:max-w-[620px]">
              <DialogHeader>
                <DialogTitle>Adicionar conta ou cartão</DialogTitle>
                <DialogDescription>Informe os dados da sua conta.</DialogDescription>
              </DialogHeader>
              <DialogBody>
                <form onSubmit={criarConta} className="grid gap-3">
                  <fieldset disabled={salvandoConta} className="min-w-0">
                    <FieldGroup className="sm:grid sm:grid-cols-2 sm:gap-x-4">
                      <Field>
                        <FieldLabel htmlFor="conta-nome">Nome da conta</FieldLabel>
                        <Input
                          id="conta-nome"
                          value={nova.nome}
                          onChange={(evento) => setNova({ ...nova, nome: evento.target.value })}
                          placeholder="Ex.: Conta corrente"
                          required
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="conta-tipo">Tipo</FieldLabel>
                        <SelectNative
                          id="conta-tipo"
                          value={nova.tipo}
                          onChange={(evento) => setNova({ ...nova, tipo: evento.target.value })}
                        >
                          {TIPOS_CONTA.map((tipo) => (
                            <option key={tipo.valor} value={tipo.valor}>
                              {tipo.rotulo}
                            </option>
                          ))}
                        </SelectNative>
                      </Field>
                      <Field className="sm:col-span-2">
                        <FieldLabel htmlFor="conta-instituicao">Banco ou instituição</FieldLabel>
                        <BuscaBancoPerfil
                          valor={nova.instituicao}
                          aoMudar={(instituicao) => setNova({ ...nova, instituicao })}
                          nomesExistentes={contas.flatMap((conta) => (conta.instituicao ? [conta.instituicao] : []))}
                          desabilitado={salvandoConta}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="conta-saldo">Saldo atual (R$)</FieldLabel>
                        <Input
                          inputMode="decimal"
                          id="conta-saldo"
                          value={nova.saldo}
                          onChange={(evento) => setNova({ ...nova, saldo: evento.target.value })}
                          placeholder="-6.582,74"
                        />
                      </Field>
                      {nova.tipo === "CARTAO_CREDITO" && (
                        <>
                          <Field>
                            <FieldLabel htmlFor="conta-limite">Limite total (R$)</FieldLabel>
                            <Input
                              inputMode="decimal"
                              id="conta-limite"
                              value={nova.limite}
                              onChange={(evento) => setNova({ ...nova, limite: evento.target.value })}
                              placeholder="6.000,00"
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="conta-bandeira">Bandeira</FieldLabel>
                            <SelectNative
                              id="conta-bandeira"
                              value={nova.bandeira}
                              onChange={(evento) => setNova({ ...nova, bandeira: evento.target.value })}
                            >
                              <option value="">Não informar</option>
                              {BANDEIRAS.map((bandeira) => (
                                <option key={bandeira.valor} value={bandeira.valor}>
                                  {bandeira.rotulo}
                                </option>
                              ))}
                            </SelectNative>
                            <FieldDescription>Aparece no cartão. Fica em branco se você não souber.</FieldDescription>
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="conta-venc">Dia do vencimento</FieldLabel>
                            <Input
                              id="conta-venc"
                              value={nova.venc}
                              onChange={(evento) => setNova({ ...nova, venc: evento.target.value })}
                              type="number"
                              min={1}
                              max={31}
                              step={1}
                              placeholder="10"
                            />
                          </Field>
                        </>
                      )}
                    </FieldGroup>
                  </fieldset>
                  {erroConta && (
                    <p role="alert" className="text-sm text-negativo">
                      {erroConta}
                    </p>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" disabled={salvandoConta} onClick={() => setCadastroAberto(false)}>
                      Cancelar
                    </Button>
                    <Button disabled={salvandoConta}>{salvandoConta ? "Salvando…" : "Adicionar"}</Button>
                  </div>
                </form>
              </DialogBody>
            </DialogContent>
          </Dialog>
        </LinhaAjuste>

        {/* O Open Finance saiu de cena em 15/09/2026 por custo: o agregador
            cobra por conta conectada. Quem já tem conexão continua vendo a
            dela para sincronizar ou revogar — esconder conexão viva seria
            pior do que mostrar. O convite para conectar saiu. */}
        {(openFinance?.conexoes.length ?? 0) > 0 && <LinhaAjuste
          titulo="Conexão com o banco"
          descricao={conectados ? `Open Finance · ${conectados} conectado(s)` : "Open Finance · nenhum conectado"}
          acao="Configurar"
        >
          {openFinance?.sandbox && (
            <p className="mb-3 rounded-[12px] border border-atencao/40 bg-atencao/10 p-3 text-xs text-atencao">
              Modo de demonstração: os dados desta conexão são fictícios. Conectar bancos de verdade exige um agregador
              autorizado pelo Banco Central com credenciais no <code>.env</code>.
            </p>
          )}

          <p className="text-[calc(13px*var(--escala-letra))] text-muted-fg">
            A autenticação acontece no site do seu banco. O app nunca recebe sua senha — só permissão de leitura, com
            prazo, que você revoga quando quiser.
          </p>

          <div className="mt-3 space-y-2">
            {openFinance?.conexoes.map((conexao) => (
              <div key={conexao.id} className="flex items-center justify-between gap-2 rounded-[12px] border border-pauta p-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm">{conexao.instituicao}</p>
                  <p className="truncate text-[calc(12px*var(--escala-letra))] text-muted-fg">
                    {conexao.status.toLowerCase()}
                    {conexao.ultimaSync && ` · sincronizado ${new Date(conexao.ultimaSync).toLocaleDateString("pt-BR")}`}
                    {conexao.diasParaExpirar !== null && ` · expira em ${conexao.diasParaExpirar} dias`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="ghost" onClick={() => sincronizar(conexao.id)}>
                    Sincronizar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => revogarConexao(conexao)}>
                    Revogar
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {mensagem && <p className="mt-2 text-[calc(13px*var(--escala-letra))] text-muted-fg">{mensagem}</p>}
        </LinhaAjuste>}

        <LinhaAjuste
          titulo="Entrada automática"
          descricao="Como o gasto entra sem você digitar"
          href="/conectar"
          acao="Ver"
        />

        <LinhaAjuste
          titulo="Assinatura"
          descricao="Plano, cobrança e cancelamento"
          href="/assinatura"
          acao="Ver"
        />
      </GrupoAjustes>

      <GrupoAjustes titulo="Aparência">
        <Aparencia />
      </GrupoAjustes>

      <GrupoAjustes titulo="Sistema">
        <LinhaAjuste
          titulo="Categorias e ícones"
          descricao="Nome, emoji e logos de estabelecimento"
          href="/categorias"
          acao="Abrir"
        />

        <LinhaAjuste
          titulo="Regras de categorização"
          descricao="Como o Tino decide a categoria sozinho"
          href="/regras"
          acao="Abrir"
        />

        <LinhaAjuste
          titulo="Atalho de lançar no celular"
          descricao="Uma notificação fixa para anotar ou ditar um gasto"
          acao="Configurar"
        >
          <ConfigAtalhoLancar />
        </LinhaAjuste>

        <LinhaAjuste titulo="Avisos do Tino" descricao="O que ele observa e avisa sem você pedir" acao="Configurar">
          <VigiasConfig semMoldura />
        </LinhaAjuste>

        <LinhaAjuste
          titulo="Meus dados"
          descricao="Baixar tudo, ou apagar a conta de vez"
          acao="Abrir"
        >
          <MeusDados />
        </LinhaAjuste>

        <LinhaAjuste titulo="Falar com o suporte" descricao="Relatar um problema ou pedir ajuda" acao="Abrir">
          <RelatarProblema semMoldura />
        </LinhaAjuste>
      </GrupoAjustes>
    </div>
  )
}
