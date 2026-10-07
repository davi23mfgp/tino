-- Retorno em garantia: a OS nova aponta para a OS de antes do mesmo aparelho.
ALTER TABLE "OrdemServicoLoja" ADD COLUMN "garantiaDeId" TEXT;
ALTER TABLE "OrdemServicoLoja" ADD CONSTRAINT "OrdemServicoLoja_garantiaDeId_fkey" FOREIGN KEY ("garantiaDeId") REFERENCES "OrdemServicoLoja"("id") ON DELETE SET NULL ON UPDATE CASCADE;
