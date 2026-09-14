-- Objetivo de aporte mensal, um por lar.
CREATE TABLE IF NOT EXISTS "ObjetivoDeAporte" (
  "id" TEXT NOT NULL,
  "larId" TEXT NOT NULL,
  "valorMensalCentavos" INTEGER NOT NULL,
  "prazoAnos" INTEGER NOT NULL DEFAULT 10,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ObjetivoDeAporte_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ObjetivoDeAporte_larId_key" ON "ObjetivoDeAporte"("larId");

ALTER TABLE "ObjetivoDeAporte" DROP CONSTRAINT IF EXISTS "ObjetivoDeAporte_larId_fkey";
ALTER TABLE "ObjetivoDeAporte" ADD CONSTRAINT "ObjetivoDeAporte_larId_fkey"
  FOREIGN KEY ("larId") REFERENCES "Lar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
