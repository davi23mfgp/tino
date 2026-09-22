-- CreateTable
CREATE TABLE "RegistroAcesso" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "evento" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroAcesso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegistroAcesso_criadoEm_idx" ON "RegistroAcesso"("criadoEm");

-- CreateIndex
CREATE INDEX "RegistroAcesso_usuarioId_idx" ON "RegistroAcesso"("usuarioId");
