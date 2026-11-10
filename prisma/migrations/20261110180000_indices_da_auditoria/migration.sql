CREATE INDEX "Transacao_recorrenciaId_idx" ON "Transacao"("recorrenciaId");
CREATE INDEX "Transacao_metaId_idx" ON "Transacao"("metaId");
CREATE INDEX "Transacao_dividaId_idx" ON "Transacao"("dividaId");
CREATE INDEX "ChaveCaptura_chatId_idx" ON "ChaveCaptura"("chatId");
CREATE INDEX "Captura_larId_criadoEm_idx" ON "Captura"("larId", "criadoEm");
-- Um caixa aberto por loja: a rota conferia antes de abrir, mas duas
-- aberturas ao mesmo tempo passavam as duas. Índice parcial, que o Prisma não
-- descreve no schema, por isso só aqui.
CREATE UNIQUE INDEX "Caixa_um_aberto_por_loja" ON "Caixa"("lojaId") WHERE "fechadoEm" IS NULL;
