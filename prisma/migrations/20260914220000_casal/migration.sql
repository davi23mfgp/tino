-- Divisão de gastos do casal. Tudo aditivo: lar sem casal não muda em nada.
DO $$ BEGIN
  CREATE TYPE "ModalidadeCasal" AS ENUM ('METADE', 'PROPORCIONAL', 'MESADA', 'PERSONALIZADA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Casal" (
  "id" TEXT NOT NULL,
  "larId" TEXT NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT false,
  "modalidade" "ModalidadeCasal" NOT NULL DEFAULT 'METADE',
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Casal_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Casal_larId_key" ON "Casal"("larId");

CREATE TABLE IF NOT EXISTS "PessoaDoCasal" (
  "id" TEXT NOT NULL,
  "casalId" TEXT NOT NULL,
  "membroId" TEXT,
  "nome" TEXT NOT NULL,
  "rendaCentavos" INTEGER NOT NULL DEFAULT 0,
  "mesadaCentavos" INTEGER NOT NULL DEFAULT 0,
  "quotaBps" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "PessoaDoCasal_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PessoaDoCasal_casalId_idx" ON "PessoaDoCasal"("casalId");

ALTER TABLE "Categoria" ADD COLUMN IF NOT EXISTS "modalidadeCasal" "ModalidadeCasal";

ALTER TABLE "Casal" DROP CONSTRAINT IF EXISTS "Casal_larId_fkey";
ALTER TABLE "Casal" ADD CONSTRAINT "Casal_larId_fkey" FOREIGN KEY ("larId") REFERENCES "Lar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PessoaDoCasal" DROP CONSTRAINT IF EXISTS "PessoaDoCasal_casalId_fkey";
ALTER TABLE "PessoaDoCasal" ADD CONSTRAINT "PessoaDoCasal_casalId_fkey" FOREIGN KEY ("casalId") REFERENCES "Casal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PessoaDoCasal" DROP CONSTRAINT IF EXISTS "PessoaDoCasal_membroId_fkey";
ALTER TABLE "PessoaDoCasal" ADD CONSTRAINT "PessoaDoCasal_membroId_fkey" FOREIGN KEY ("membroId") REFERENCES "Membro"("id") ON DELETE SET NULL ON UPDATE CASCADE;
