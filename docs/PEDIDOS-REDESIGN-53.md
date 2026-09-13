# Redesign solicitado — lista consolidada

Autorizado em 09/09/2026. Estado final: itens implementados e verificados em código, testes automatizados e quatro larguras de tela. Integrações que dependem de contas externas ficaram preparadas para ativação.

- [x] 1. Cartões com identidade visual do banco/modelo selecionado.
- [x] 2. Faturas por mês em barras estilo Nubank.
- [x] 3. Compras e parcelas filtradas por cartão e fatura.
- [x] 4. Adicionar, editar e excluir compras/parcelamentos na área do cartão.
- [x] 5. Importar fatura diretamente para o cartão selecionado.
- [x] 6. Estilo iOS/shadcn responsivo.
- [x] 7. Notificações em painel lateral direito.
- [x] 8. Destaque para avisos urgentes.
- [x] 9. Título forte e descrição curta nos avisos.
- [x] 10. Rolagem interna e acessibilidade do painel.
- [x] 11. Categorias no cartão/fatura selecionados.
- [x] 12. Tocar em categoria filtra compras.
- [x] 13. Ajuda contextual para milhas, economia e fatura.
- [x] 14. Agentes usam dados do cartão, como opção.
- [x] 15. Emojis coloridos configuráveis.
- [x] 16. Logos de bancos e estabelecimentos com correção manual.
- [x] 17. Contraste e refinamento de categorias, entradas, saídas e valores.
- [x] 18. Totais e quantidades de entradas/saídas com filtros.
- [x] 19. Seletor de categorias com busca e grupos.
- [x] 20. Corrigir microfone e feedback de permissão.
- [x] 21. Textos objetivos em todo o sistema.
- [x] 22. Priorizar recebimento de fatura por e-mail; não depender de Telegram.
- [x] 23. Captura autorizada de notificação Android, extração e deduplicação.
- [x] 24. Avaliar Groq e seus limites reais.
- [x] 25. Refinar orçamento e progresso.
- [x] 26. Parcelamentos e orçamento por cartão dentro de Cartões.
- [x] 27. Distinguir orçamento planejado do limite bancário.
- [x] 28. Metas com foto, prazo e progresso.
- [x] 29. Lembretes mensais e acompanhamento de aportes.
- [x] 30. Meta opcional como compromisso fixo, sem confundir previsto e realizado.
- [x] 31. Simulador de prazo/aporte por meta.
- [x] 32. Agente acompanha metas e desvios.
- [x] 33. Redesign de Metas.
- [x] 34. Redesign de Dívidas.
- [x] 35. Pagamento extra destacado com efeito em prazo e juros.
- [x] 36. Plano de pagamento simples, próxima ação clara.
- [x] 37. Empréstimos com custo total e impacto claros.
- [x] 38. Análise separada por assuntos.
- [x] 39. Projeção como fluxo de caixa moderno.
- [x] 40. Simulador com cenários guiados e comparação.
- [x] 41. Cadastro de investimentos integrado ao sistema.
- [x] 42. ARCA opcional dentro de Investimentos.
- [x] 43. Reserva de emergência em área própria.
- [x] 44. Buscar e Adicionar no cabeçalho.
- [x] 45. Textos objetivos e dinheiro sem dígitos quebrados.
- [x] 46. Porquinho IA na lateral/inferior direito sem sobreposição.
- [x] 47. Foto de perfil enviar, trocar e remover.
- [x] 48. Pessoal e MEI/PJ separados; remover ativação da loja no pessoal.
- [x] 49. Remover cadastro de funcionários do pessoal.
- [x] 50. Conexão pessoal/MEI por API em etapa futura.
- [x] 51. Completar perfil discreto substitui Conversa inicial.
- [x] 52. Redesign de contas/cartões nas configurações com logos.
- [x] 53. Cadastro de conta/cartão em modal com busca de banco.

## Execução

Frentes paralelas: configurações/perfil; cabeçalho/notificações; cartões/faturas; depois metas e planejamento. Preservar dados, regras financeiras e APIs de loja. Separar UI pessoal não equivale a apagar banco da loja.

Integrações externas: recebimento por e-mail precisa serviço/domínio de inbound; Groq precisa chave e verificação dos limites; notificações Android precisam componente nativo e consentimento, não são possíveis somente no site; iOS não oferece leitura geral das notificações de bancos. Perguntas só quando bloquearem implantação real. Não pedir segredos em chat. Não prometer logo exato sem asset/modelo identificado.

Critérios: dados reais e centavos, não duplicar parcela/transação nem fatura/notificação, autorização por lar/conta, testes de fluxos, estados de falha, viewport 320/390/768/1440. Capturas públicas apenas de demonstração.

## Verificação final

- 302 testes automatizados.
- Build de produção com TypeScript.
- 14 rotas verificadas em 320, 390, 768 e 1440 px.
- E-mail e Groq preparados, mas exigem domínio/chaves externos para ativação.
- Microfone exige permissão e dispositivo real; notificações bancárias exigem ponte Android autorizada.
