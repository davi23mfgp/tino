-- Modo simples (passo 50, opção A) e o contato do botão "Pedir ajuda".
ALTER TABLE "Usuario" ADD COLUMN "modoSimples" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Usuario" ADD COLUMN "ajudaNome" TEXT;
ALTER TABLE "Usuario" ADD COLUMN "ajudaTelefone" TEXT;
