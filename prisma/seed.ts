/**
 * Seed do `npx prisma db seed` / `prisma migrate reset`.
 *
 * A lógica de verdade mora em `scripts/demo.mjs` — conta de demonstração
 * com seis meses de histórico coerente (ver o cabeçalho de lá). Este
 * arquivo só existe porque `package.json` declara `prisma.seed` apontando
 * pra cá; sem ele, `npx prisma db seed` falhava com "Cannot find module".
 *
 * Entrar: demo@tino.local / demo12345
 */
import "../scripts/demo.mjs"
