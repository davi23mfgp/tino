-- Identidade do evento de transporte, para reconhecer o mesmo aviso reenviado.
-- Aditiva e idempotente: este banco de desenvolvimento já recebeu a coluna numa
-- tentativa anterior que foi revertida no código.
ALTER TABLE "Captura" ADD COLUMN IF NOT EXISTS "eventoId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Captura_eventoId_key" ON "Captura"("eventoId");
