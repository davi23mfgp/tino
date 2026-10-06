-- Passo 39: entrada do aparelho na ordem de serviço (área Assistência técnica).
ALTER TABLE "OrdemServicoLoja" ADD COLUMN "aparelhoModelo" TEXT;
ALTER TABLE "OrdemServicoLoja" ADD COLUMN "aparelhoCor" TEXT;
ALTER TABLE "OrdemServicoLoja" ADD COLUMN "aparelhoSerie" TEXT;
ALTER TABLE "OrdemServicoLoja" ADD COLUMN "aparelhoTipo" TEXT;
ALTER TABLE "OrdemServicoLoja" ADD COLUMN "acessorios" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "OrdemServicoLoja" ADD COLUMN "estadoEntrada" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "OrdemServicoLoja" ADD COLUMN "senhaTipo" TEXT;
ALTER TABLE "OrdemServicoLoja" ADD COLUMN "senhaCifrada" TEXT;
ALTER TABLE "OrdemServicoLoja" ADD COLUMN "entradaConferidaEm" TIMESTAMP(3);
ALTER TABLE "OrdemServicoLoja" ADD COLUMN "entradaContestada" TEXT;
