"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { enviar } from "@/lib/cliente"
import { FotoDePerfil } from "@/components/foto-de-perfil"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { showToast } from "@/components/ui/toast"

type TipoDeCasa = "SOLO" | "CASAL" | "FAMILIA"

const TIPOS: { valor: TipoDeCasa; rotulo: string }[] = [
  { valor: "SOLO", rotulo: "Só eu" },
  { valor: "CASAL", rotulo: "Casal" },
  { valor: "FAMILIA", rotulo: "Família" },
]

/**
 * Perfil num lugar só (Davi, 29/09/2026: "tem que ter um jeito de poder mudar
 * nome, foto e etc tudo junto"). Antes o diálogo prometia "foto e nome" e só
 * trocava a foto; o nome e a casa ficavam como o cadastro inicial deixou.
 *
 * A foto salva sozinha ao escolher (é o componente de sempre). Nome e casa
 * vão juntos no botão Salvar. O e-mail aparece, mas não se edita aqui: é o
 * login, e trocar exige confirmar o endereço novo, que o app ainda não faz.
 */
export function EditarPerfil({
  nome,
  email,
  casa,
  podeMudarCasa,
  aoSalvar,
}: {
  nome: string
  email: string
  casa: { nome: string; tipo: TipoDeCasa } | null
  podeMudarCasa: boolean
  aoSalvar: () => void
}) {
  const router = useRouter()
  const [novoNome, setNovoNome] = useState(nome)
  const [casaNome, setCasaNome] = useState(casa?.nome ?? "")
  const [casaTipo, setCasaTipo] = useState<TipoDeCasa>(casa?.tipo ?? "SOLO")
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    setNovoNome(nome)
    setCasaNome(casa?.nome ?? "")
    setCasaTipo(casa?.tipo ?? "SOLO")
  }, [nome, casa?.nome, casa?.tipo])

  const mudouCasa = Boolean(casa) && (casaNome.trim() !== casa?.nome || casaTipo !== casa?.tipo)
  const mudou = novoNome.trim() !== nome || mudouCasa

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault()
    setSalvando(true)
    setErro(null)
    try {
      await enviar("/api/usuario", { nome: novoNome, ...(podeMudarCasa && mudouCasa ? { casaNome, casaTipo } : {}) }, "PATCH")
      showToast("Perfil salvo.")
      aoSalvar()
      // O nome aparece no topo e no menu, que vêm do servidor.
      router.refresh()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui salvar.")
    } finally {
      setSalvando(false)
    }
  }

  const rotulo = "grid gap-1.5 text-[calc(12.5px*var(--escala-letra))] text-[color:var(--texto-2)]"

  return (
    <div className="grid gap-5">
      <FotoDePerfil />
      <form onSubmit={salvar} className="grid gap-4">
        <label className={rotulo}>
          Seu nome
          <Input value={novoNome} onChange={(evento) => setNovoNome(evento.target.value)} maxLength={80} autoComplete="name" required />
        </label>
        <label className={rotulo}>
          E-mail de acesso
          <Input value={email} readOnly aria-readonly className="opacity-70" />
        </label>
        {casa && (
          <fieldset className="grid gap-3" disabled={!podeMudarCasa}>
            <label className={rotulo}>
              Nome da casa
              <Input value={casaNome} onChange={(evento) => setCasaNome(evento.target.value)} maxLength={80} required />
            </label>
            <div className={rotulo}>
              <span id="quem-mora">Quem mora</span>
              <div className="flex flex-wrap gap-2" role="group" aria-labelledby="quem-mora">
                {TIPOS.map((tipo) => (
                  <button
                    key={tipo.valor}
                    type="button"
                    aria-pressed={casaTipo === tipo.valor}
                    onClick={() => setCasaTipo(tipo.valor)}
                    className="min-h-10 rounded-full border border-pauta px-4 text-[calc(13.5px*var(--escala-letra))] text-[color:var(--texto-2)] aria-pressed:border-transparent aria-pressed:bg-acao/15 aria-pressed:font-semibold aria-pressed:text-acao"
                  >
                    {tipo.rotulo}
                  </button>
                ))}
              </div>
            </div>
            {!podeMudarCasa && <p className="text-[calc(12px*var(--escala-letra))] text-[color:var(--texto-3)]">Só quem é dono da casa muda o nome dela.</p>}
          </fieldset>
        )}
        {erro && <p className="text-[calc(13px*var(--escala-letra))] text-negativo">{erro}</p>}
        <Button type="submit" disabled={!mudou || salvando}>
          {salvando ? "Salvando…" : "Salvar"}
        </Button>
      </form>
    </div>
  )
}
