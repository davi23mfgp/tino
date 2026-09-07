-- CreateTable
CREATE TABLE "VigiaConfig" (
    "id" TEXT NOT NULL,
    "larId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "VigiaConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VigiaConfig_larId_tipo_key" ON "VigiaConfig"("larId", "tipo");

-- AddForeignKey
ALTER TABLE "VigiaConfig" ADD CONSTRAINT "VigiaConfig_larId_fkey" FOREIGN KEY ("larId") REFERENCES "Lar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
