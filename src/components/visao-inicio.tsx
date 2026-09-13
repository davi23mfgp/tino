"use client"

import type { ReactNode } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export function VisaoInicio({ agora, futuro, categorias }: { agora: ReactNode; futuro: ReactNode; categorias: ReactNode }) {
  return <Tabs defaultValue="agora" className="min-w-0">
    <TabsList aria-label="Visão do seu dinheiro" className="w-full">
      <TabsTrigger value="agora">Agora</TabsTrigger>
      <TabsTrigger value="futuro">Próximos meses</TabsTrigger>
      <TabsTrigger value="categorias">Categorias</TabsTrigger>
    </TabsList>
    <TabsContent value="agora">{agora}</TabsContent>
    <TabsContent value="futuro">{futuro}</TabsContent>
    <TabsContent value="categorias">{categorias}</TabsContent>
  </Tabs>
}
