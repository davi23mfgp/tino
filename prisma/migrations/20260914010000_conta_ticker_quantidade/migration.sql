-- Posição em ativo negociado, para calcular valor de mercado sem tocar no saldo.
ALTER TABLE "Conta" ADD COLUMN "ticker" TEXT;
ALTER TABLE "Conta" ADD COLUMN "quantidadeMilesimos" INTEGER;
