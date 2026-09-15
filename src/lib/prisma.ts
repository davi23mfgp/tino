import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * `TINO_LOG_QUERIES=1` liga a contagem de consultas por requisição.
 *
 * Existe porque latência de banco não se descobre lendo código: uma página que
 * parece leve pode emitir quarenta consultas pequenas, e num banco gerenciado
 * a quarenta milissegundos de distância isso vira segundos. Fica desligado por
 * padrão — o log em si custa, e em produção só atrapalharia.
 */
export const prisma =
  globalForPrisma.prisma ??
  (process.env.TINO_LOG_QUERIES === "1"
    ? new PrismaClient({ log: [{ emit: "event", level: "query" }] })
    : new PrismaClient());

if (process.env.TINO_LOG_QUERIES === "1") {
  const cliente = prisma as unknown as {
    $on: (evento: "query", ouvinte: (dado: { duration: number; query: string }) => void) => void
  };
  let quantas = 0;
  let somaMs = 0;
  cliente.$on("query", (dado) => {
    quantas += 1;
    somaMs += dado.duration;
    console.log(`[consulta ${quantas}] ${dado.duration}ms · total ${somaMs}ms · ${dado.query.slice(0, 90)}`);
  });
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
