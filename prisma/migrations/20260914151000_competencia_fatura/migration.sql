-- Competência da fatura, separada da competência contábil.
-- Aditiva e idempotente: o banco de desenvolvimento desta máquina já recebeu
-- esta coluna numa tentativa anterior que foi revertida no código, e recriá-la
-- sem a guarda quebraria a aplicação da migration aqui.
ALTER TABLE "Transacao" ADD COLUMN IF NOT EXISTS "competenciaFatura" TEXT;
