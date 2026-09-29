import Link from "next/link"
import { notFound } from "next/navigation"

import { sessaoDeAdmin } from "@/lib/admin"
import { formatarMoeda } from "@/lib/dinheiro"
import { registrarAcaoDoAdmin } from "@/lib/erros"
import { ROTULO_PROVEDOR, ROTULO_STATUS } from "@/lib/pagamento"
import { prisma } from "@/lib/prisma"
import { Cartao, Vazio } from "@/components/ui/painel"

/**
 * Ficha de uma conta: o que o suporte precisa para ajudar (29/09/2026).
 *
 * Cadastro, assinatura, cobranças, chamados, erros e acessos. **Lançamentos,
 * saldos, contas e dívidas não aparecem aqui, de propósito**: para responder
 * "por que minha cobrança falhou" ou "o app quebrou nesta tela" nenhum deles é
 * necessário, e a LGPD (art. 6º, III) pede o mínimo. Abrir a ficha fica
 * registrado em /admin/logs.
 */
export const dynamic = "force-dynamic"

const ROTULO_COBRANCA = { PENDENTE: "pendente", PAGA: "paga", FALHOU: "falhou", ESTORNADA: "estornada" } as const
const ROTULO_CHAMADO = { BUG: "defeito", DUVIDA: "dúvida", COBRANCA: "cobrança" } as const

export default async function FichaDaConta({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await sessaoDeAdmin()
  const { id } = await params

  const usuario = await prisma.usuario.findUnique({
    where: { id },
    select: {
      id: true,
      nome: true,
      email: true,
      admin: true,
      criadoEm: true,
      ultimoLogin: true,
      lar: { select: { nome: true, tipo: true, meiPerfil: { select: { id: true } }, _count: { select: { membros: true } } } },
      assinatura: { include: { cobrancas: { orderBy: { criadoEm: "desc" }, take: 12 } } },
      chamados: { orderBy: { criadoEm: "desc" }, take: 20 },
    },
  })
  if (!usuario) notFound()

  const [erros, acessos, acoes] = await Promise.all([
    prisma.erroRegistrado.findMany({ where: { usuarioId: id }, orderBy: { ultimoEm: "desc" }, take: 10 }),
    prisma.registroAcesso.findMany({ where: { usuarioId: id }, orderBy: { criadoEm: "desc" }, take: 10 }),
    prisma.registroAdmin.findMany({ where: { alvoId: id }, orderBy: { criadoEm: "desc" }, take: 10 }),
  ])
  await registrarAcaoDoAdmin(sessao.usuarioId, "abriu a ficha", id)

  const assinatura = usuario.assinatura
  const data = (valor: Date | null | undefined) => (valor ? valor.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—")

  return (
    <div className="space-y-4">
      <Link href="/admin/contas" className="text-[calc(13px*var(--escala-letra))] text-muted-fg hover:text-foreground">
        ← contas
      </Link>

      <div className="grid gap-4 lg:grid-cols-2">
        <Cartao titulo={usuario.nome}>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[calc(13px*var(--escala-letra))]">
            <dt className="text-muted-fg">E-mail</dt>
            <dd>{usuario.email}</dd>
            <dt className="text-muted-fg">Conta criada</dt>
            <dd>{data(usuario.criadoEm)}</dd>
            <dt className="text-muted-fg">Último acesso</dt>
            <dd>{usuario.ultimoLogin ? usuario.ultimoLogin.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—"}</dd>
            <dt className="text-muted-fg">Perfil</dt>
            <dd>
              {usuario.lar.meiPerfil ? "MEI com loja" : "Pessoal"} · {usuario.lar._count.membros} {usuario.lar._count.membros === 1 ? "pessoa" : "pessoas"} no lar
            </dd>
            {usuario.admin && (
              <>
                <dt className="text-muted-fg">Papel</dt>
                <dd className="text-acao">admin</dd>
              </>
            )}
          </dl>
          <p className="mt-4 text-[calc(12px*var(--escala-letra))] text-muted-fg">
            Lançamentos, saldos e dívidas não aparecem aqui: o suporte não precisa deles, e a LGPD pede o mínimo.
          </p>
        </Cartao>

        <Cartao titulo="Assinatura">
          {!assinatura ? (
            <Vazio titulo="Sem assinatura" texto="A conta nunca escolheu um plano." />
          ) : (
            <>
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[calc(13px*var(--escala-letra))]">
                <dt className="text-muted-fg">Situação</dt>
                <dd className={assinatura.status === "ATIVA" ? "text-positivo" : assinatura.status === "INADIMPLENTE" ? "text-negativo" : undefined}>{ROTULO_STATUS[assinatura.status]}</dd>
                <dt className="text-muted-fg">Plano</dt>
                <dd>
                  {assinatura.planoId} · {assinatura.ciclo === "ANUAL" ? "anual" : "mensal"} · {formatarMoeda(assinatura.valorCentavos)}
                </dd>
                <dt className="text-muted-fg">Cobrança</dt>
                <dd>{ROTULO_PROVEDOR[assinatura.provedor]}</dd>
                {assinatura.testeAteEm && (
                  <>
                    <dt className="text-muted-fg">Teste até</dt>
                    <dd>{data(assinatura.testeAteEm)}</dd>
                  </>
                )}
                <dt className="text-muted-fg">Próxima cobrança</dt>
                <dd>{data(assinatura.proximaCobrancaEm)}</dd>
                {assinatura.canceladaEm && (
                  <>
                    <dt className="text-muted-fg">Cancelada em</dt>
                    <dd>{data(assinatura.canceladaEm)}</dd>
                  </>
                )}
                {assinatura.motivoFalha && (
                  <>
                    <dt className="text-muted-fg">Última falha</dt>
                    <dd className="text-negativo">{assinatura.motivoFalha}</dd>
                  </>
                )}
              </dl>
              {assinatura.cobrancas.length > 0 && (
                <div className="mt-4 divide-y divide-pauta border-t border-pauta text-[calc(13px*var(--escala-letra))]">
                  {assinatura.cobrancas.map((cobranca) => (
                    <div key={cobranca.id} className="flex justify-between gap-3 py-2">
                      <span className="text-muted-fg">{data(cobranca.pagaEm ?? cobranca.criadoEm)}</span>
                      <span className={cobranca.status === "FALHOU" ? "text-negativo" : cobranca.status === "PAGA" ? undefined : "text-muted-fg"}>
                        {ROTULO_COBRANCA[cobranca.status]}
                        {cobranca.motivoFalha && ` · ${cobranca.motivoFalha}`}
                      </span>
                      <span className="numero">{formatarMoeda(cobranca.valorCentavos)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </Cartao>
      </div>

      <Cartao titulo="Chamados">
        {usuario.chamados.length === 0 ? (
          <Vazio titulo="Nenhum chamado" />
        ) : (
          <div className="divide-y divide-pauta text-[calc(13px*var(--escala-letra))]">
            {usuario.chamados.map((chamado) => (
              <div key={chamado.id} className="grid gap-1 py-2.5">
                <p className="text-[calc(12px*var(--escala-letra))] text-muted-fg">
                  {ROTULO_CHAMADO[chamado.tipo]} · {chamado.criadoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · {chamado.status === "ABERTO" ? "aberto" : "resolvido"}
                  {chamado.rota && ` · ${chamado.rota}`}
                </p>
                <p className="whitespace-pre-wrap">{chamado.mensagem}</p>
                {chamado.resposta && <p className="whitespace-pre-wrap rounded-xl bg-papel-2 p-2.5 text-muted-fg">{chamado.resposta}</p>}
              </div>
            ))}
            <p className="pt-3">
              <Link href="/admin/suporte" className="underline underline-offset-2">
                responder na fila de suporte
              </Link>
            </p>
          </div>
        )}
      </Cartao>

      <div className="grid gap-4 lg:grid-cols-2">
        <Cartao titulo="Erros desta conta">
          {erros.length === 0 ? (
            <Vazio titulo="Nenhum erro registrado" />
          ) : (
            <div className="divide-y divide-pauta text-[calc(13px*var(--escala-letra))]">
              {erros.map((erro) => (
                <div key={erro.id} className="py-2">
                  <p className="break-words font-mono text-[calc(12px*var(--escala-letra))]">{erro.mensagem}</p>
                  <p className="text-[calc(12px*var(--escala-letra))] text-muted-fg">
                    {erro.rota ?? "—"} · {erro.ocorrencias}× · {erro.ultimoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · {erro.status === "NOVO" ? "em aberto" : "resolvido"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Cartao>

        <Cartao titulo="Acessos e o que o admin fez">
          <div className="divide-y divide-pauta text-[calc(13px*var(--escala-letra))]">
            {acessos.map((acesso) => (
              <div key={acesso.id} className="flex justify-between gap-3 py-2">
                <span>{acesso.evento === "LOGIN" ? "entrou" : "criou a conta"}</span>
                <span className="font-mono text-[calc(12px*var(--escala-letra))] text-muted-fg">{acesso.ip}</span>
                <span className="text-muted-fg">{acesso.criadoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
              </div>
            ))}
            {acoes.map((acao) => (
              <div key={acao.id} className="flex justify-between gap-3 py-2 text-muted-fg">
                <span>admin {acao.acao}</span>
                <span>{acao.criadoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
              </div>
            ))}
            {acessos.length === 0 && acoes.length === 0 && <Vazio titulo="Nada registrado" />}
          </div>
        </Cartao>
      </div>
    </div>
  )
}
