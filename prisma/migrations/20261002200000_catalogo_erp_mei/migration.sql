ALTER TABLE "ProdutoLoja"
  ADD COLUMN "sku" TEXT,
  ADD COLUMN "descricao" TEXT,
  ADD COLUMN "imagemUrl" TEXT,
  ADD COLUMN "marca" TEXT,
  ADD COLUMN "unidade" TEXT DEFAULT 'UN',
  ADD COLUMN "categoriaId" TEXT,
  ADD COLUMN "fornecedorId" TEXT;

CREATE TABLE "CategoriaLoja" (
  "id" TEXT NOT NULL,
  "lojaId" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "imagemUrl" TEXT,
  "arquivada" BOOLEAN NOT NULL DEFAULT false,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CategoriaLoja_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FornecedorLoja" (
  "id" TEXT NOT NULL,
  "lojaId" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "telefone" TEXT,
  "email" TEXT,
  "documento" TEXT,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FornecedorLoja_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServicoLoja" (
  "id" TEXT NOT NULL,
  "lojaId" TEXT NOT NULL,
  "categoriaId" TEXT,
  "nome" TEXT NOT NULL,
  "descricao" TEXT,
  "precoCentavos" INTEGER NOT NULL DEFAULT 0,
  "custoEstimadoCentavos" INTEGER,
  "duracaoMinutos" INTEGER,
  "imagemUrl" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServicoLoja_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProdutoLoja_lojaId_sku_key" ON "ProdutoLoja"("lojaId", "sku");
CREATE INDEX "ProdutoLoja_categoriaId_idx" ON "ProdutoLoja"("categoriaId");
CREATE INDEX "ProdutoLoja_fornecedorId_idx" ON "ProdutoLoja"("fornecedorId");
CREATE UNIQUE INDEX "CategoriaLoja_lojaId_nome_key" ON "CategoriaLoja"("lojaId", "nome");
CREATE INDEX "CategoriaLoja_lojaId_arquivada_idx" ON "CategoriaLoja"("lojaId", "arquivada");
CREATE UNIQUE INDEX "FornecedorLoja_lojaId_nome_key" ON "FornecedorLoja"("lojaId", "nome");
CREATE INDEX "ServicoLoja_lojaId_nome_idx" ON "ServicoLoja"("lojaId", "nome");
CREATE INDEX "ServicoLoja_categoriaId_idx" ON "ServicoLoja"("categoriaId");

ALTER TABLE "CategoriaLoja" ADD CONSTRAINT "CategoriaLoja_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FornecedorLoja" ADD CONSTRAINT "FornecedorLoja_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServicoLoja" ADD CONSTRAINT "ServicoLoja_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "Loja"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServicoLoja" ADD CONSTRAINT "ServicoLoja_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaLoja"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProdutoLoja" ADD CONSTRAINT "ProdutoLoja_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaLoja"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProdutoLoja" ADD CONSTRAINT "ProdutoLoja_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "FornecedorLoja"("id") ON DELETE SET NULL ON UPDATE CASCADE;
