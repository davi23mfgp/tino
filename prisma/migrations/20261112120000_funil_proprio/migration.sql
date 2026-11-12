-- Medição própria do funil (auditoria, achado 14).
CREATE TYPE "EtapaFunil" AS ENUM ('VISITA', 'CLIQUE_COMECAR', 'CADASTRO_INICIADO', 'CADASTRO_CRIADO', 'ROTEIRO_TERMINADO', 'ASSINATURA_PAGA');

CREATE TABLE "EventoFunil" (
    "id" TEXT NOT NULL,
    "etapa" "EtapaFunil" NOT NULL,
    "produto" TEXT,
    "usuarioId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventoFunil_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventoFunil_etapa_usuarioId_key" ON "EventoFunil"("etapa", "usuarioId");
CREATE INDEX "EventoFunil_etapa_criadoEm_idx" ON "EventoFunil"("etapa", "criadoEm");
