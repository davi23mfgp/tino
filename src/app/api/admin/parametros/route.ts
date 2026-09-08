/** Parâmetros globais do sistema: ler e editar sem deploy. */

import { NextResponse } from "next/server"

import { comAdmin } from "@/lib/admin"
import { PARAMETROS, gravarParametro, restaurarParametro, valoresVigentes } from "@/lib/parametros"

export const GET = comAdmin(async () => {
  const valores = await valoresVigentes()
  return NextResponse.json(
    PARAMETROS.map((definicao) => ({
      ...definicao,
      valor: valores[definicao.chave],
      // A tela mostra o padrão ao lado do valor: sem a referência, quem edita
      // não sabe se está mexendo muito ou pouco.
      editado: valores[definicao.chave] !== definicao.padrao,
    })),
  )
})

export const PUT = comAdmin(async (sessao, requisicao) => {
  const dados = (await requisicao.json()) as { chave?: string; valor?: number; restaurar?: boolean }
  if (!dados.chave) return NextResponse.json({ erro: "Informe a chave do parâmetro." }, { status: 400 })

  try {
    if (dados.restaurar) {
      await restaurarParametro(dados.chave)
    } else {
      await gravarParametro(dados.chave, Number(dados.valor), sessao.email)
    }
  } catch (excecao) {
    return NextResponse.json({ erro: (excecao as Error).message }, { status: 400 })
  }

  const valores = await valoresVigentes()
  return NextResponse.json({ chave: dados.chave, valor: valores[dados.chave] })
})
