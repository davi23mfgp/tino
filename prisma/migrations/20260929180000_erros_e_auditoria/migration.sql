-- CreateEnum
CREATE TYPE "OrigemErro" AS ENUM ('SERVIDOR', 'NAVEGADOR');

-- CreateEnum
CREATE TYPE "StatusErro" AS ENUM ('NOVO', 'RESOLVIDO');

-- CreateTable
CREATE TABLE "ErroRegistrado" (
    "id" TEXT NOT NULL,
    "impressao" TEXT NOT NULL,
    "origem" "OrigemErro" NOT NULL,
    "mensagem" TEXT NOT NULL,
    "pilha" TEXT,
    "rota" TEXT,
    "metodo" TEXT,
    "usuarioId" TEXT,
    "ocorrencias" INTEGER NOT NULL DEFAULT 1,
    "status" "StatusErro" NOT NULL DEFAULT 'NOVO',
    "primeiroEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErroRegistrado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroAdmin" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "alvoId" TEXT,
    "detalhe" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ErroRegistrado_impressao_key" ON "ErroRegistrado"("impressao");

-- CreateIndex
CREATE INDEX "ErroRegistrado_status_ultimoEm_idx" ON "ErroRegistrado"("status", "ultimoEm");

-- CreateIndex
CREATE INDEX "RegistroAdmin_criadoEm_idx" ON "RegistroAdmin"("criadoEm");

-- CreateIndex
CREATE INDEX "RegistroAdmin_alvoId_idx" ON "RegistroAdmin"("alvoId");

