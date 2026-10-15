# MR3 Gestão — Fabio Nascimento

Sistema de gestão para atendimento individual de atletas: agenda, atletas, sessões, pacotes, financeiro e retenção (churn).
HTML + CSS + JavaScript puro, sem build. Funciona abrindo o `index.html` direto no navegador (precisa de internet só para carregar a fonte Inter, o Chart.js e os ícones Lucide via CDN).

## Como usar

1. Abra `index.html` no Chrome/Edge/Safari (no celular, pode hospedar a pasta em qualquer site estático: Vercel, Netlify, GitHub Pages).
2. Quer explorar antes? **Configurações → Carregar demonstração** (26 atletas, 6 meses de sessões, 12 meses de financeiro). Depois, **Limpar demonstração** remove só os dados fictícios.
3. Fluxo do dia a dia:
   - **Planos e sessões** → crie os planos (mensal X vezes por semana, pacote de N sessões com validade, avulso).
   - **Atletas** → cadastre (com plano, valor personalizado, dia de vencimento). Para tirar alguém, use **Desativar** (pede o motivo, que entra no cálculo de churn).
   - **Agenda** → clique num horário vazio para agendar; use “Repetir toda semana” para recorrência. Marque realizada/falta com 1 clique (realizada abre PSE e anotações).
   - **Financeiro** → “Gerar mensalidades de [mês]” (não duplica), registre pagamentos totais ou parciais, cobre pelo WhatsApp e imprima recibos.
   - **Relatórios** → churn, motivos de saída, novos × saídas, MRR, LTV, presença, ocupação (mapa de calor) e inadimplência.
4. **Backup**: os dados ficam só neste navegador (localStorage). Use **Configurações → Exportar backup** com frequência (o sistema avisa após 7 dias). Atalho: `/` foca a busca de atletas; `Esc` fecha janelas.

## Estrutura

```
index.html
css/styles.css           design system (azul + dourado, tema claro/escuro)
js/utils.js              datas (fuso America/Sao_Paulo, semana começando na segunda), moeda, máscaras, CSV
js/store.js              camada única de dados (getAll/getById/create/update/remove/query), schemaVersion + migrações, backup
js/domain.js             regras e indicadores (status atrasado, saldo de pacote, churn, MRR, LTV, ocupação)
js/ui.js                 modais, toasts, badges, gráficos, WhatsApp, impressão
js/demo.js               gerador de dados de demonstração (registros marcados com _demo)
js/modules/*.js          dashboard, atletas, agenda, sessoes, financeiro, relatorios, config
js/app.js                roteamento por hash (#/atletas/ID/financeiro…), layout, tema, busca global
```

## Migração futura para Supabase

Os módulos só falam com `MR3.Store`. O store mantém os dados em memória e delega a gravação a um *adapter* (`load()` / `save(data, change)`).
Para usar Supabase com login: criar um `SupabaseAdapter` que, após a autenticação, carrega as tabelas em `load()` e faz upsert/delete do registro descrito em `change` (`{op, col, id, record}`) em `save()`, e chamar `MR3.Store.init(SupabaseAdapter)` em `app.js`. Nenhuma tela precisa mudar.
