CREATE TABLE "IdentidadeVisual" ("id" TEXT NOT NULL PRIMARY KEY, "larId" TEXT NOT NULL REFERENCES "Lar"("id") ON DELETE CASCADE, "nome" TEXT NOT NULL, "logoUrl" TEXT, "emoji" TEXT);
CREATE UNIQUE INDEX "IdentidadeVisual_larId_nome_key" ON "IdentidadeVisual"("larId","nome");
CREATE TABLE "FaturaRecebida" ("id" TEXT NOT NULL PRIMARY KEY, "larId" TEXT NOT NULL REFERENCES "Lar"("id") ON DELETE CASCADE, "contaId" TEXT NOT NULL, "eventoId" TEXT NOT NULL, "arquivoNome" TEXT NOT NULL, "conteudo" BYTEA NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDENTE', "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX "FaturaRecebida_eventoId_contaId_arquivoNome_key" ON "FaturaRecebida"("eventoId","contaId","arquivoNome");
CREATE INDEX "FaturaRecebida_larId_status_idx" ON "FaturaRecebida"("larId","status");
