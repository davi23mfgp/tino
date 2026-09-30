ALTER TABLE "Usuario"
  ADD COLUMN "mfaSegredo" TEXT,
  ADD COLUMN "mfaPendente" TEXT,
  ADD COLUMN "mfaPendenteExpiraEm" TIMESTAMP(3),
  ADD COLUMN "mfaUltimoPasso" INTEGER,
  ADD COLUMN "mfaRecuperacao" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "mfaVersao" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "mfaDesafioHash" TEXT;
