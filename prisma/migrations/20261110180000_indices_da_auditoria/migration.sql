CREATE INDEX "Transacao_recorrenciaId_idx" ON "Transacao"("recorrenciaId");
CREATE INDEX "Transacao_metaId_idx" ON "Transacao"("metaId");
CREATE INDEX "Transacao_dividaId_idx" ON "Transacao"("dividaId");
CREATE INDEX "ChaveCaptura_chatId_idx" ON "ChaveCaptura"("chatId");
CREATE INDEX "Captura_larId_criadoEm_idx" ON "Captura"("larId", "criadoEm");
-- Um caixa aberto por loja: a rota conferia antes de abrir, mas duas
-- aberturas ao mesmo tempo passavam as duas. Índice parcial, que o Prisma não
-- descreve no schema, por isso só aqui.
-- Antes do índice: se a corrida já tiver deixado dois caixas abertos na mesma
-- loja em produção, o índice falharia e o deploy inteiro não subiria. Fica
-- aberto o mais recente; os mais antigos são fechados com a hora da migração,
-- sem valor contado (o dono vê "fechado sem contagem" e confere).
UPDATE "Caixa" c SET "fechadoEm" = CURRENT_TIMESTAMP
WHERE c."fechadoEm" IS NULL
  AND EXISTS (SELECT 1 FROM "Caixa" n WHERE n."lojaId" = c."lojaId" AND n."fechadoEm" IS NULL AND (n."abertoEm" > c."abertoEm" OR (n."abertoEm" = c."abertoEm" AND n.id > c.id)));
CREATE UNIQUE INDEX "Caixa_um_aberto_por_loja" ON "Caixa"("lojaId") WHERE "fechadoEm" IS NULL;
