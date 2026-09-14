-- Classe de ativo da conta de investimento, para a carteira do ARCA.
-- Aditiva: contas existentes ficam com NULL e a tela pede a classificação.
DO $$ BEGIN
  CREATE TYPE "ClasseDeAtivo" AS ENUM ('ACOES', 'FII', 'RENDA_FIXA', 'CAIXA', 'INTERNACIONAL', 'CRIPTO', 'OUTROS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Conta" ADD COLUMN IF NOT EXISTS "classeDeAtivo" "ClasseDeAtivo";
