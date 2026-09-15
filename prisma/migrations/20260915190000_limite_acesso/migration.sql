-- CreateTable
CREATE TABLE "LimiteAcesso" (
    "chave" TEXT NOT NULL,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "janelaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bloqueadoAte" TIMESTAMP(3),

    CONSTRAINT "LimiteAcesso_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE INDEX "LimiteAcesso_bloqueadoAte_idx" ON "LimiteAcesso"("bloqueadoAte");
