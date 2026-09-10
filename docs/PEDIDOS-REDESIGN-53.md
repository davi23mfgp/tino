# Redesign solicitado — lista consolidada

Autorizado em 09/09/2026. Estado inicial: pendentes; marcar concluído somente com código e verificação. Trabalho iOS anterior ainda local sobre aa2ef58.

- [ ] 1. Cartões com identidade visual do banco/modelo selecionado.
- [ ] 2. Faturas por mês em barras estilo Nubank.
- [ ] 3. Compras e parcelas filtradas por cartão e fatura.
- [ ] 4. Adicionar, editar e excluir compras/parcelamentos na área do cartão.
- [ ] 5. Importar fatura diretamente para o cartão selecionado.
- [ ] 6. Estilo iOS/shadcn responsivo.
- [ ] 7. Notificações em painel lateral direito.
- [ ] 8. Destaque para avisos urgentes.
- [ ] 9. Título forte e descrição curta nos avisos.
- [ ] 10. Rolagem interna e acessibilidade do painel.
- [ ] 11. Categorias no cartão/fatura selecionados.
- [ ] 12. Tocar em categoria filtra compras.
- [ ] 13. Ajuda contextual para milhas, economia e fatura.
- [ ] 14. Agentes usam dados do cartão, como opção.
- [ ] 15. Emojis coloridos configuráveis.
- [ ] 16. Logos de bancos e estabelecimentos com correção manual.
- [ ] 17. Contraste e refinamento de categorias, entradas, saídas e valores.
- [ ] 18. Totais e quantidades de entradas/saídas com filtros.
- [ ] 19. Seletor de categorias com busca e grupos.
- [ ] 20. Corrigir microfone e feedback de permissão.
- [ ] 21. Textos objetivos em todo o sistema.
- [ ] 22. Priorizar recebimento de fatura por e-mail; não depender de Telegram.
- [ ] 23. Captura autorizada de notificação Android, extração e deduplicação.
- [ ] 24. Avaliar Groq e seus limites reais.
- [ ] 25. Refinar orçamento e progresso.
- [ ] 26. Parcelamentos e orçamento por cartão dentro de Cartões.
- [ ] 27. Distinguir orçamento planejado do limite bancário.
- [ ] 28. Metas com foto, prazo e progresso.
- [ ] 29. Lembretes mensais e acompanhamento de aportes.
- [ ] 30. Meta opcional como compromisso fixo, sem confundir previsto e realizado.
- [ ] 31. Simulador de prazo/aporte por meta.
- [ ] 32. Agente acompanha metas e desvios.
- [ ] 33. Redesign de Metas.
- [ ] 34. Redesign de Dívidas.
- [ ] 35. Pagamento extra destacado com efeito em prazo e juros.
- [ ] 36. Plano de pagamento simples, próxima ação clara.
- [ ] 37. Empréstimos com custo total e impacto claros.
- [ ] 38. Análise separada por assuntos.
- [ ] 39. Projeção como fluxo de caixa moderno.
- [ ] 40. Simulador com cenários guiados e comparação.
- [ ] 41. Cadastro de investimentos integrado ao sistema.
- [ ] 42. ARCA opcional dentro de Investimentos.
- [ ] 43. Reserva de emergência em área própria.
- [ ] 44. Buscar e Adicionar no cabeçalho.
- [ ] 45. Textos objetivos e dinheiro sem dígitos quebrados.
- [ ] 46. Porquinho IA na lateral/inferior direito sem sobreposição.
- [ ] 47. Foto de perfil enviar, trocar e remover.
- [ ] 48. Pessoal e MEI/PJ separados; remover ativação da loja no pessoal.
- [ ] 49. Remover cadastro de funcionários do pessoal.
- [ ] 50. Conexão pessoal/MEI por API em etapa futura.
- [ ] 51. Completar perfil discreto substitui Conversa inicial.
- [ ] 52. Redesign de contas/cartões nas configurações com logos.
- [ ] 53. Cadastro de conta/cartão em modal com busca de banco.

## Execução

Frentes paralelas: configurações/perfil; cabeçalho/notificações; cartões/faturas; depois metas e planejamento. Preservar dados, regras financeiras e APIs de loja. Separar UI pessoal não equivale a apagar banco da loja.

Integrações externas: recebimento por e-mail precisa serviço/domínio de inbound; Groq precisa chave e verificação dos limites; notificações Android precisam componente nativo e consentimento, não são possíveis somente no site; iOS não oferece leitura geral das notificações de bancos. Perguntas só quando bloquearem implantação real. Não pedir segredos em chat. Não prometer logo exato sem asset/modelo identificado.

Critérios: dados reais e centavos, não duplicar parcela/transação nem fatura/notificação, autorização por lar/conta, testes de fluxos, estados de falha, viewport 320/390/768/1440. Capturas públicas apenas de demonstração.
