CREATE TABLE "OrcamentoCartao" (
  "id" TEXT NOT NULL,
  "larId" TEXT NOT NULL,
  "contaId" TEXT NOT NULL,
  "competencia" TEXT NOT NULL,
  "totalCentavos" INTEGER NOT NULL,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrcamentoCartao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrcamentoCartaoCategoria" (
  "id" TEXT NOT NULL,
  "orcamentoCartaoId" TEXT NOT NULL,
  "categoriaId" TEXT NOT NULL,
  "limiteCentavos" INTEGER NOT NULL,
  CONSTRAINT "OrcamentoCartaoCategoria_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrcamentoCartao_contaId_competencia_key" ON "OrcamentoCartao"("contaId", "competencia");
CREATE INDEX "OrcamentoCartao_larId_competencia_idx" ON "OrcamentoCartao"("larId", "competencia");
CREATE UNIQUE INDEX "OrcamentoCartaoCategoria_orcamentoCartaoId_categoriaId_key" ON "OrcamentoCartaoCategoria"("orcamentoCartaoId", "categoriaId");
CREATE INDEX "OrcamentoCartaoCategoria_categoriaId_idx" ON "OrcamentoCartaoCategoria"("categoriaId");

ALTER TABLE "OrcamentoCartao" ADD CONSTRAINT "OrcamentoCartao_larId_fkey" FOREIGN KEY ("larId") REFERENCES "Lar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrcamentoCartao" ADD CONSTRAINT "OrcamentoCartao_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "Conta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrcamentoCartaoCategoria" ADD CONSTRAINT "OrcamentoCartaoCategoria_orcamentoCartaoId_fkey" FOREIGN KEY ("orcamentoCartaoId") REFERENCES "OrcamentoCartao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrcamentoCartaoCategoria" ADD CONSTRAINT "OrcamentoCartaoCategoria_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
