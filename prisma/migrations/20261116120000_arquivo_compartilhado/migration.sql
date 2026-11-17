-- Arquivo recebido pelo "Compartilhar" do celular, à espera da tela de importar.
CREATE TABLE "ArquivoCompartilhado" (
    "usuarioId" TEXT NOT NULL,
    "larId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "conteudo" BYTEA NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArquivoCompartilhado_pkey" PRIMARY KEY ("usuarioId")
);
