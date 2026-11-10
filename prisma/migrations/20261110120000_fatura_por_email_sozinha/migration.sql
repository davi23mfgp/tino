ALTER TABLE "Conta" ADD COLUMN "senhaFaturaCifrada" TEXT;
ALTER TABLE "FaturaRecebida" ADD COLUMN "leitura" JSONB;
ALTER TABLE "Conta" ADD COLUMN "codigoGmail" TEXT;
ALTER TABLE "Conta" ADD COLUMN "codigoGmailEm" TIMESTAMP(3);
