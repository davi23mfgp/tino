import type { Metadata } from "next"
export const metadata: Metadata = { title: "Movimentos - Tino", description: "Seus movimentos, com busca e filtros.", robots: { index: false, follow: false } }
export default function Layout({children}:{children:React.ReactNode}) { return children }
