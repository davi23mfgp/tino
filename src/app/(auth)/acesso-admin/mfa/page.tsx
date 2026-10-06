import type { Metadata } from "next"

import ConfirmarMfa from "@/components/confirmar-acesso"

export const metadata: Metadata = { title: "Administração", robots: { index: false, follow: false } }

export default function ConfirmarMfaAdmin() { return <ConfirmarMfa modoAdmin /> }
