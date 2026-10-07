import { redirect } from "next/navigation"

import { getSessao } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { BlocosSimples } from "./blocos"

/**
 * Modo simples, opção A do passo 50 (Davi, 08/10/2026: "bote o A"). Seis
 * blocos grandes no lugar da Visão geral, como o Acesso Assistivo do iPhone:
 * só o essencial, com rótulo, e um botão para pedir ajuda a quem a pessoa
 * escolheu. Nada some do app: "Ver tudo" leva ao modo completo, e o menu
 * continua no lugar.
 */
export default async function PaginaSimples() {
  const sessao = await getSessao()
  if (!sessao) redirect("/login")
  const usuario = await prisma.usuario.findUnique({ where: { id: sessao.usuarioId }, select: { ajudaNome: true, ajudaTelefone: true } })
  return <BlocosSimples nome={sessao.nome.split(" ")[0] ?? sessao.nome} ajudaNome={usuario?.ajudaNome ?? null} ajudaTelefone={usuario?.ajudaTelefone ?? null} />
}
