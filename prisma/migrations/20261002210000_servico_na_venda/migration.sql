ALTER TABLE "ItemVenda" ADD COLUMN "servicoId" TEXT;
CREATE INDEX "ItemVenda_servicoId_idx" ON "ItemVenda"("servicoId");
ALTER TABLE "ItemVenda" ADD CONSTRAINT "ItemVenda_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "ServicoLoja"("id") ON DELETE SET NULL ON UPDATE CASCADE;
