/**
 * Roda o seed de demonstração APENAS quando `SEMEAR_DEMO=1` está no ambiente.
 *
 * Existe por um beco sem saída da Vercel: as variáveis do projeto estão
 * marcadas como "Sensitive", e valor sensível não pode ser lido de volta nem
 * pelo `vercel env pull` nem pelo painel — por design. Ou seja, não há como
 * pegar a `DATABASE_URL` de produção e rodar o seed de fora.
 *
 * Mas o BUILD da Vercel roda com essa variável já injetada. Então o seed vai
 * junto do build, atrás desta chave, que se liga e desliga pelo CLI:
 *
 *     vercel env add SEMEAR_DEMO production   # valor: 1
 *     git push                                # o build semeia
 *     vercel env rm SEMEAR_DEMO production    # desliga de novo
 *
 * Sem a chave, este arquivo não faz absolutamente nada — é por isso que ele
 * pode ficar no `build` para sempre sem risco.
 *
 * O seed é seguro para produção: `limpar()` em `demo.mjs` só apaga o Lar de
 * `demo@tino.local`. Nenhuma conta real é tocada.
 */

if (process.env.SEMEAR_DEMO === "1") {
  console.log("SEMEAR_DEMO=1 — recriando a conta de demonstracao…")
  await import("./demo.mjs")
} else {
  console.log("SEMEAR_DEMO ausente — seed de demonstracao pulado.")
}
