"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, Store } from "lucide-react"

import { buscar, enviar } from "@/lib/cliente"
import { formatarMoeda } from "@/lib/dinheiro"
import { formatarCnpj, lerCnpj, lerDesde } from "@/lib/loja/ligar-negocio"
import { Aviso, Cartao } from "@/components/ui/painel"

/**
 * Ligar o Tino negócio na conta que já existe (passo 40, opção B com A, Davi,
 * 08/10/2026). Três passos curtos, um por tela, em vez de um formulário só:
 * CNPJ, desde quando e a confirmação com o preço. A pessoa chega por três
 * lugares (card no Início, linha no Perfil e o login MEI), e o fluxo é o mesmo.
 *
 * Depois de ligar, o negócio entra pelo login MEI e a casa pelo pessoal (regra
 * de 04/10/2026), então o fim da tela leva a esse login em vez de trocar a
 * sessão escondido. O histórico da casa não é tocado.
 */

const CAMPO = "min-h-12 w-full rounded-2xl border border-pauta bg-papel-2 px-4 text-[calc(15px*var(--escala-letra))]"
const PRIMARIO = "min-h-11 w-full rounded-full bg-primary px-5 text-[calc(14.5px*var(--escala-letra))] font-semibold text-primary-foreground disabled:opacity-40"

export default function LigarNegocio() {
  const router = useRouter()
  const [passo, setPasso] = useState<1 | 2 | 3 | 4>(1)
  const [cnpj, setCnpj] = useState("")
  const [desde, setDesde] = useState("")
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [preco, setPreco] = useState<number | null>(null)

  // O preço vem dos planos vigentes (o Davi edita no painel). Se a busca falhar,
  // a tela some com a linha do preço em vez de inventar um número.
  useEffect(() => {
    buscar<{ planos: { codigo: string; mensalCentavos: number }[] }>("/api/assinatura")
      .then(({ planos }) => setPreco(planos.find((plano) => plano.codigo === "loja")?.mensalCentavos ?? null))
      .catch(() => undefined)
  }, [])

  function avancar() {
    setErro(null)
    const lido = passo === 1 ? lerCnpj(cnpj) : lerDesde(desde)
    if (!lido.ok) return setErro(lido.erro)
    setPasso(passo === 1 ? 2 : 3)
  }

  async function ligar() {
    setOcupado(true)
    setErro(null)
    try {
      await enviar("/api/mei/ligar", { cnpj, desde })
      setPasso(4)
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : "Não consegui ligar o negócio.")
    } finally {
      setOcupado(false)
    }
  }

  async function entrarNoMei() {
    // Sai da sessão pessoal para o login MEI abrir limpo: os dois entram por telas diferentes.
    await enviar("/api/auth/logout", {}).catch(() => undefined)
    router.push("/login/mei")
    router.refresh()
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      {passo < 4 && (
        <div aria-label={`Passo ${passo} de 3`} className="space-y-2">
          <div className="flex gap-1.5">
            {[1, 2, 3].map((n) => <i key={n} className={`h-1.5 flex-1 rounded-full ${n <= passo ? "bg-primary" : "bg-foreground/10"}`} />)}
          </div>
          <p className="text-[calc(12.5px*var(--escala-letra))] text-muted-fg">Passo {passo} de 3</p>
        </div>
      )}

      {erro && <Aviso tom="critico">{erro}</Aviso>}

      {passo === 1 && (
        <Cartao estatico>
          <h2 className="text-[calc(20px*var(--escala-letra))] font-semibold">Qual é o CNPJ?</h2>
          <label className="mt-4 block text-[calc(13px*var(--escala-letra))] text-muted-fg" htmlFor="cnpj-negocio">CNPJ do MEI</label>
          <input id="cnpj-negocio" className={`${CAMPO} mt-1.5`} inputMode="numeric" autoComplete="off" placeholder="00.000.000/0000-00" value={cnpj} onChange={(evento) => setCnpj(formatarCnpj(evento.target.value))} />
          <p className="mt-1.5 text-[calc(12px*var(--escala-letra))] text-muted-fg">Conferimos os dígitos. O Tino não consulta a Receita: vale o que você informar.</p>
          <button type="button" className={`${PRIMARIO} mt-5`} onClick={avancar} disabled={!cnpj}>Continuar</button>
        </Cartao>
      )}

      {passo === 2 && (
        <Cartao estatico>
          <h2 className="text-[calc(20px*var(--escala-letra))] font-semibold">Desde quando o MEI existe?</h2>
          <label className="mt-4 block text-[calc(13px*var(--escala-letra))] text-muted-fg" htmlFor="desde-negocio">Mês e ano de abertura</label>
          <input id="desde-negocio" className={`${CAMPO} mt-1.5`} inputMode="numeric" autoComplete="off" placeholder="03/2024" maxLength={7} value={desde} onChange={(evento) => setDesde(evento.target.value)} />
          <p className="mt-1.5 text-[calc(12px*var(--escala-letra))] text-muted-fg">Para o limite do ano sair certo.</p>
          <div className="mt-5 flex gap-2">
            <button type="button" className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-pauta px-4 text-[calc(14px*var(--escala-letra))]" onClick={() => { setErro(null); setPasso(1) }}><ArrowLeft className="size-4" aria-hidden />Voltar</button>
            <button type="button" className={PRIMARIO} onClick={avancar} disabled={!desde}>Continuar</button>
          </div>
        </Cartao>
      )}

      {passo === 3 && (
        <Cartao estatico>
          <h2 className="text-[calc(20px*var(--escala-letra))] font-semibold">Confira e ligue</h2>
          <dl className="mt-4 divide-y divide-pauta text-[calc(14px*var(--escala-letra))]">
            <div className="flex justify-between gap-3 py-2.5"><dt className="text-muted-fg">CNPJ</dt><dd className="numero">{cnpj}</dd></div>
            <div className="flex justify-between gap-3 py-2.5"><dt className="text-muted-fg">MEI desde</dt><dd className="numero">{desde}</dd></div>
          </dl>
          <p className="mt-3 text-[calc(13px*var(--escala-letra))] leading-relaxed text-muted-fg">
            {preco !== null && <>Plano Meu negócio: {formatarMoeda(preco)} por mês. Você escolhe e confirma o plano na Assinatura; nada é cobrado sozinho. </>}
            A casa continua como está e entra pelo login do Tino pessoal. O Tino não passa nada da casa para o negócio sem você confirmar.
          </p>
          <div className="mt-5 flex gap-2">
            <button type="button" className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-pauta px-4 text-[calc(14px*var(--escala-letra))]" onClick={() => { setErro(null); setPasso(2) }}><ArrowLeft className="size-4" aria-hidden />Voltar</button>
            <button type="button" className={PRIMARIO} onClick={() => void ligar()} disabled={ocupado}>{ocupado ? "Ligando…" : "Ligar o negócio"}</button>
          </div>
        </Cartao>
      )}

      {passo === 4 && (
        <Cartao estatico>
          <p className="flex items-center gap-2 text-[calc(16px*var(--escala-letra))] font-semibold"><Check className="size-5 text-positivo" aria-hidden />Tino negócio ligado.</p>
          <p className="mt-2 text-[calc(14px*var(--escala-letra))] leading-relaxed text-muted-fg">Agora o negócio tem a própria entrada. Use o mesmo e-mail e a mesma senha no login do Tino MEI, e escolha o segmento do seu negócio.</p>
          <button type="button" className={`${PRIMARIO} mt-5 inline-flex items-center justify-center gap-2`} onClick={() => void entrarNoMei()}><Store className="size-4" aria-hidden />Entrar no Tino MEI</button>
          <Link href="/painel" className="mt-2 flex min-h-11 items-center justify-center text-[calc(13px*var(--escala-letra))] text-muted-fg">Ficar no Tino pessoal</Link>
        </Cartao>
      )}
    </div>
  )
}
