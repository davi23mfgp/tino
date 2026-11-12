import type { Metadata } from "next"
import Cadastro from "@/components/cadastro-produto"

// Login e cadastro não são página de busca: quem procura "Tino" deve cair na vitrine.
export const metadata: Metadata = { title: "Criar conta no Tino MEI", robots: { index: false, follow: true } }
export default function CadastroMei() { return <Cadastro modoMei /> }
