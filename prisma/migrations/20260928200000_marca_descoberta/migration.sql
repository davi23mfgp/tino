-- CreateTable
CREATE TABLE "MarcaDescoberta" (
    "chave" TEXT NOT NULL,
    "exemplo" TEXT NOT NULL,
    "situacao" TEXT NOT NULL,
    "marcaNome" TEXT,
    "site" TEXT,
    "confianca" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarcaDescoberta_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE INDEX "MarcaDescoberta_site_idx" ON "MarcaDescoberta"("site");

-- CreateIndex
CREATE INDEX "MarcaDescoberta_criadoEm_idx" ON "MarcaDescoberta"("criadoEm");
