# MR3 Gestão — Fabio Nascimento

Sistema de gestão para atendimento individual de atletas: agenda, atletas, fichas de cadastro, materiais, sessões, pacotes, financeiro e retenção (churn).
HTML + CSS + JavaScript puro, sem build. Funciona abrindo o `index.html` direto no navegador (precisa de internet só para carregar a fonte Inter, o Chart.js e os ícones Lucide via CDN).

## Como usar

1. Abra `index.html` no Chrome/Edge/Safari (no celular, pode hospedar a pasta em qualquer site estático: Vercel, Netlify, GitHub Pages).
2. Quer explorar antes? **Configurações → Carregar demonstração** (26 atletas, 6 meses de sessões, 12 meses de financeiro, fichas e materiais de exemplo). Depois, **Limpar demonstração** remove só os dados fictícios.
3. Fluxo do dia a dia:
   - **Planos e sessões** → crie os planos (mensal X vezes por semana, pacote de N sessões com validade, avulso).
   - **Atletas** → cadastre (com plano, valor personalizado, dia de vencimento). Para tirar alguém, use **Desativar** (pede o motivo, que entra no cálculo de churn).
   - **Agenda** → clique num horário vazio para agendar; use “Repetir toda semana” para recorrência. Marque realizada/falta com 1 clique (realizada abre PSE e anotações).
   - **Fichas de cadastro** → “Enviar ficha” manda pelo WhatsApp o link do `ficha.html`; o atleta (ou o responsável) preenche no celular e devolve pelo WhatsApp. Copie a mensagem recebida e use “Importar ficha” → “Criar atleta”. Também dá para “Preencher aqui”, junto com o atleta.
   - **Materiais** → biblioteca de vídeos, PDFs, imagens e links (YouTube, Drive). Abra em tela cheia para apresentar no treino, vincule a atletas e envie pelo WhatsApp (no celular, o arquivo é compartilhado direto).
   - **Financeiro** → “Gerar mensalidades de [mês]” (não duplica), registre pagamentos totais ou parciais, cobre pelo WhatsApp e imprima recibos.
   - **Relatórios** → churn, motivos de saída, novos × saídas, MRR, LTV, presença, ocupação (mapa de calor) e inadimplência.
4. **Backup**: os dados ficam só neste navegador (localStorage). Use **Configurações → Exportar backup** com frequência (o sistema avisa após 7 dias). Atalho: `/` foca a busca de atletas; `Esc` fecha janelas.

## No celular

1. Publique a pasta `mr3-gestao` num site estático gratuito. O jeito mais simples é o **Netlify Drop** (app.netlify.com/drop): arraste a pasta e copie o endereço.
2. Abra o endereço no celular → menu do navegador → **Adicionar à tela inicial**. O MR3 vira um ícone e abre em tela cheia, como um aplicativo.
3. Em **Configurações → Ficha de cadastro**, cole o endereço do `ficha.html` (ex.: `https://seu-site.netlify.app/ficha.html`) e confira o seu WhatsApp. É esse link que vai para os atletas.

Os dados ficam no aparelho onde o sistema é usado. Para levar do computador para o celular: **Exportar backup** num e **Importar backup** no outro. Arquivos dos Materiais ficam só no aparelho onde foram enviados; para vídeos grandes, prefira links do YouTube/Drive.

## Estrutura

```
index.html               o sistema
ficha.html               ficha de cadastro pública (o atleta preenche no celular)
manifest.webmanifest     instalação na tela inicial (ícones em icons/)
css/styles.css           design system (azul + dourado, tema claro/escuro, layout mobile)
js/utils.js              datas (fuso America/Sao_Paulo, semana começando na segunda), moeda, máscaras, CSV
js/store.js              camada única de dados (getAll/getById/create/update/remove/query), schemaVersion + migrações, backup
js/domain.js             regras e indicadores (status atrasado, saldo de pacote, churn, MRR, LTV, ocupação)
js/files.js              arquivos dos Materiais (IndexedDB)
js/ficha-campos.js       campos da ficha + código MR3FICHA1 (ida e volta pelo WhatsApp)
js/ui.js                 modais, toasts, badges, gráficos, WhatsApp, impressão
js/demo.js               gerador de dados de demonstração (registros marcados com _demo)
js/modules/*.js          dashboard, atletas, fichas, materiais, agenda, sessoes, financeiro, relatorios, config
js/app.js                roteamento por hash (#/atletas/ID/financeiro…), layout, tema, busca global
```

## Migração futura para Supabase

Os módulos só falam com `MR3.Store`. O store mantém os dados em memória e delega a gravação a um *adapter* (`load()` / `save(data, change)`).
Para usar Supabase com login: criar um `SupabaseAdapter` que, após a autenticação, carrega as tabelas em `load()` e faz upsert/delete do registro descrito em `change` (`{op, col, id, record}`) em `save()`, e chamar `MR3.Store.init(SupabaseAdapter)` em `app.js`. Nenhuma tela precisa mudar. Os arquivos dos Materiais seguem o mesmo padrão em `js/files.js` (trocar por Supabase Storage). Com Supabase, a ficha também pode gravar direto no banco em vez de voltar pelo WhatsApp.
