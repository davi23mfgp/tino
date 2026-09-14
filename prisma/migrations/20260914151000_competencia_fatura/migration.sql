-- Preserva a competência contábil e a atribuição das faturas importadas.
ALTER TABLE "Transacao" ADD COLUMN "competenciaFatura" TEXT;
