-- Identidade de transporte opcional; registros antigos permanecem intactos.
ALTER TABLE "Captura" ADD COLUMN "eventoId" TEXT;
CREATE UNIQUE INDEX "Captura_eventoId_key" ON "Captura"("eventoId");
