"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { buscar, enviar } from "@/lib/cliente"
import { Button } from "@/components/ui/button"
import { Cartao } from "@/components/ui/painel"

interface Estado { ativo: boolean; obrigatorio: boolean; codigosRestantes: number }

export function ConfigurarSeguranca() {
  const [estado, definirEstado] = useState<Estado | null>(null)
  const [segredo, definirSegredo] = useState("")
  const [codigo, definirCodigo] = useState("")
  const [codigos, definirCodigos] = useState<string[]>([])
  const [erro, definirErro] = useState("")
  const [ocupado, definirOcupado] = useState(false)
  useEffect(() => { buscar<Estado>("/api/auth/mfa/configurar").then(definirEstado).catch((falha) => definirErro(falha.message)) }, [])
  async function agir(acao: "preparar" | "ativar" | "desativar" | "recuperacao") {
    definirOcupado(true); definirErro("")
    try {
      const resposta = await enviar<{ segredo?: string; codigos?: string[] }>("/api/auth/mfa/configurar", { acao, ...(acao !== "preparar" ? { codigo } : {}) })
      definirSegredo(resposta.segredo ?? ""); definirCodigos(resposta.codigos ?? []); definirCodigo("")
      definirEstado(await buscar<Estado>("/api/auth/mfa/configurar"))
    } catch (falha) { definirErro(falha instanceof Error ? falha.message : "Não foi possível alterar a segurança.") }
    finally { definirOcupado(false) }
  }
  return <>
    <Cartao titulo="Autenticação em dois fatores" estatico>
      <div className="space-y-4 text-sm">
        <p>Além do login, você confirma um código no Google Authenticator, Microsoft Authenticator ou outro autenticador compatível.</p>
        {estado && <p>{estado.ativo ? "Proteção ativa." : "Proteção ainda não ativada."} {estado.obrigatorio && "Obrigatória para acessar a administração."}</p>}
        {estado && !estado.ativo && !segredo && <Button disabled={ocupado} onClick={() => agir("preparar")}>Configurar autenticador</Button>}
        {segredo && <><p>No autenticador, escolha adicionar uma chave manualmente, nome Tino, com códigos baseados em tempo. Use esta chave:</p><code className="block break-all rounded-xl bg-papel-2 p-3 select-all">{segredo}</code><p>Não compartilhe essa chave. Confirme um código abaixo para ativar.</p></>}
        {(segredo || estado?.ativo) && <form className="space-y-3" onSubmit={(evento) => { evento.preventDefault(); void agir(segredo ? "ativar" : "recuperacao") }}>
          <label htmlFor="codigo-configurar" className="block">Código do autenticador{estado?.ativo && " ou de recuperação"}</label>
          <input id="codigo-configurar" autoComplete="one-time-code" value={codigo} maxLength={32} onChange={(evento) => definirCodigo(evento.target.value)} className="w-full rounded-[var(--raio-campo)] border border-pauta bg-background px-4 py-3" required />
          <Button disabled={ocupado}>{segredo ? "Ativar proteção" : "Gerar novos códigos de recuperação"}</Button>
          {estado?.ativo && !estado.obrigatorio && <Button type="button" variant="outline" disabled={ocupado || !codigo} onClick={() => { if (window.confirm("Desativar a autenticação em dois fatores? Suas outras sessões serão encerradas.")) void agir("desativar") }}>Desativar proteção</Button>}
        </form>}
        {!!codigos.length && <div className="space-y-3"><p className="font-medium">Guarde estes códigos em um local seguro. Cada um funciona uma vez. Eles não serão exibidos novamente.</p><ul className="grid grid-cols-1 gap-2 font-mono sm:grid-cols-2">{codigos.map((item) => <li key={item} className="break-all select-all">{item}</li>)}</ul><p>Se você perder o autenticador e todos os códigos, não haverá recuperação automática do segundo fator.</p></div>}
        {estado?.ativo && !codigos.length && <p>{estado.codigosRestantes} códigos de recuperação disponíveis.</p>}
        {erro && <p role="alert" className="text-negativo">{erro} {erro.includes("Entre novamente") && <Link href="/login" className="underline">Ir ao login</Link>}</p>}
      </div>
    </Cartao>
    <Link href="/configuracoes" className="inline-block py-3 text-sm underline">Voltar às configurações</Link>
  </>
}
