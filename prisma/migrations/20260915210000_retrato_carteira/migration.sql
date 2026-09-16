-- CreateTable
CREATE TABLE "RetratoCarteira" (
    "id" TEXT NOT NULL,
    "larId" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "totalCentavos" INTEGER NOT NULL,
    "aportadoCentavos" INTEGER NOT NULL,
    "porClasse" JSONB NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetratoCarteira_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RetratoCarteira_larId_competencia_idx" ON "RetratoCarteira"("larId", "competencia");

-- CreateIndex
CREATE UNIQUE INDEX "RetratoCarteira_larId_competencia_key" ON "RetratoCarteira"("larId", "competencia");

-- AddForeignKey
ALTER TABLE "RetratoCarteira" ADD CONSTRAINT "RetratoCarteira_larId_fkey" FOREIGN KEY ("larId") REFERENCES "Lar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

