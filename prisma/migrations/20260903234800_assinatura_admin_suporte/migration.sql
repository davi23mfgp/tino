-- CreateEnum
CREATE TYPE "ProvedorPagamento" AS ENUM ('MERCADO_PAGO', 'STRIPE');

-- CreateEnum
CREATE TYPE "StatusAssinatura" AS ENUM ('TESTE', 'PENDENTE', 'ATIVA', 'INADIMPLENTE', 'CANCELADA');

-- CreateEnum
CREATE TYPE "CicloCobranca" AS ENUM ('MENSAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "StatusCobranca" AS ENUM ('PENDENTE', 'PAGA', 'FALHOU', 'ESTORNADA');

-- CreateEnum
CREATE TYPE "TipoChamado" AS ENUM ('BUG', 'DUVIDA', 'COBRANCA');

-- CreateEnum
CREATE TYPE "StatusChamado" AS ENUM ('ABERTO', 'RESOLVIDO');

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "admin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Assinatura" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "provedor" "ProvedorPagamento" NOT NULL,
    "status" "StatusAssinatura" NOT NULL DEFAULT 'TESTE',
    "planoId" TEXT NOT NULL,
    "ciclo" "CicloCobranca" NOT NULL DEFAULT 'MENSAL',
    "valorCentavos" INTEGER NOT NULL DEFAULT 0,
    "idExterno" TEXT,
    "clienteExterno" TEXT,
    "testeAteEm" TIMESTAMP(3),
    "inicioEm" TIMESTAMP(3),
    "proximaCobrancaEm" TIMESTAMP(3),
    "canceladaEm" TIMESTAMP(3),
    "motivoFalha" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assinatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cobranca" (
    "id" TEXT NOT NULL,
    "assinaturaId" TEXT NOT NULL,
    "provedor" "ProvedorPagamento" NOT NULL,
    "idExterno" TEXT NOT NULL,
    "status" "StatusCobranca" NOT NULL DEFAULT 'PENDENTE',
    "valorCentavos" INTEGER NOT NULL,
    "motivoFalha" TEXT,
    "competencia" TEXT,
    "pagaEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cobranca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoWebhook" (
    "id" TEXT NOT NULL,
    "provedor" "ProvedorPagamento" NOT NULL,
    "idEvento" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "recebidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chamado" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" "TipoChamado" NOT NULL DEFAULT 'DUVIDA',
    "status" "StatusChamado" NOT NULL DEFAULT 'ABERTO',
    "mensagem" TEXT NOT NULL,
    "rota" TEXT,
    "resposta" TEXT,
    "resolvidoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Chamado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParametroSistema" (
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "descricao" TEXT,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "atualizadoPor" TEXT,

    CONSTRAINT "ParametroSistema_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE UNIQUE INDEX "Assinatura_usuarioId_key" ON "Assinatura"("usuarioId");

-- CreateIndex
CREATE INDEX "Assinatura_status_idx" ON "Assinatura"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Assinatura_provedor_idExterno_key" ON "Assinatura"("provedor", "idExterno");

-- CreateIndex
CREATE INDEX "Cobranca_assinaturaId_criadoEm_idx" ON "Cobranca"("assinaturaId", "criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "Cobranca_provedor_idExterno_key" ON "Cobranca"("provedor", "idExterno");

-- CreateIndex
CREATE INDEX "EventoWebhook_recebidoEm_idx" ON "EventoWebhook"("recebidoEm");

-- CreateIndex
CREATE UNIQUE INDEX "EventoWebhook_provedor_idEvento_key" ON "EventoWebhook"("provedor", "idEvento");

-- CreateIndex
CREATE INDEX "Chamado_status_criadoEm_idx" ON "Chamado"("status", "criadoEm");

-- CreateIndex
CREATE INDEX "Chamado_usuarioId_idx" ON "Chamado"("usuarioId");

-- AddForeignKey
ALTER TABLE "Assinatura" ADD CONSTRAINT "Assinatura_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cobranca" ADD CONSTRAINT "Cobranca_assinaturaId_fkey" FOREIGN KEY ("assinaturaId") REFERENCES "Assinatura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chamado" ADD CONSTRAINT "Chamado_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
