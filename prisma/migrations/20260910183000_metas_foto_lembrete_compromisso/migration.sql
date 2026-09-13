ALTER TABLE "Meta"
  ADD COLUMN "fotoUrl" TEXT,
  ADD COLUMN "lembreteDia" INTEGER,
  ADD COLUMN "compromissoMensal" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Meta" ADD CONSTRAINT "Meta_lembreteDia_valido"
  CHECK ("lembreteDia" IS NULL OR "lembreteDia" BETWEEN 1 AND 31);
ALTER TABLE "Conta" ADD COLUMN "orcamentoMensalCentavos" INTEGER;
