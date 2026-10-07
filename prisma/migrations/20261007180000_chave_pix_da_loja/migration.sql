-- Item 2.3: chave Pix e cidade da loja, para o Pix no link.
ALTER TABLE "Loja" ADD COLUMN "chavePix" TEXT;
ALTER TABLE "Loja" ADD COLUMN "cidade" TEXT;
