# Gestão de Atletas

Sistema web para o preparador/treinador **Fábio Nascimento** gerenciar atletas, sessões táticas e pagamentos. Uso pessoal (login único), acessível de qualquer lugar, com dados na nuvem via **Supabase**.

## Stack

- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS 4
- **Backend/dados**: Supabase (Postgres + Auth)
- **PDF**: jsPDF (geração 100% no navegador)
- **Gráficos**: Recharts

## Módulos

- **Dashboard** — sessões de hoje, atletas ativos/inativos, pendências, faturamento do mês.
- **Agenda** — agendamento de pacotes (1 ou 2 sessões), visão diária e semanal.
- **Atletas** — cadastro, perfil com histórico de sessões e pagamentos, exportação em PDF.
- **Produtos** — tipos de pacote de sessão (nome, sessões, valor), com ativar/desativar.
- **Pagamentos** — controle de cobranças por pacote (pago/pendente), filtros por atleta/período/status.
- **Relatórios** — faturamento mensal, recebido, pendente, atletas atendidos e gráfico dos últimos 6 meses.

## Rodando localmente

Pré-requisitos: Node.js 20+.

```bash
cd gestao-atletas
npm install
cp .env.example .env   # já preenchido neste projeto com as credenciais do Supabase criado
npm run dev
```

Acesse `http://localhost:5173`.

### Login

O acesso é protegido por login único (Supabase Auth). As credenciais iniciais foram criadas durante a configuração deste projeto e enviadas a você separadamente — **troque a senha assim que possível** (Supabase Dashboard → Authentication → Users → seu usuário → "Send password recovery", ou peça para gerar uma tela de troca de senha).

## Banco de dados (Supabase)

Um projeto Supabase dedicado (`gestao-atletas-fabio-nascimento`, região São Paulo) já foi criado com o schema abaixo e Row Level Security habilitado (apenas usuários autenticados têm acesso):

- `atletas` — id, nome, telefone, email, modalidade, data_inicio, status (ativo/inativo), observacoes.
- `produtos` — id, nome, descricao, qtd_sessoes (1 ou 2), valor, ativo.
- `pacotes_vendidos` — vínculo atleta ↔ produto = a cobrança. id, atleta_id, produto_id, snapshot do nome/qtd do produto (preserva histórico mesmo se o produto for editado/desativado), data_venda, valor, status_pagamento, data_pagamento.
- `sessoes` — 1 ou 2 por pacote. id, pacote_id, atleta_id, data, horario, status (agendada/realizada/cancelada).

Para usar seu **próprio** projeto Supabase em vez do já criado:

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Rode o SQL de `supabase/schema.sql` (neste repositório) no SQL Editor do projeto.
3. Copie a **Project URL** e a **anon/publishable key** (Project Settings → API) para o `.env`.
4. Crie seu usuário de login em Authentication → Users → "Add user" (marque "Auto Confirm User").

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave pública (anon/publishable) do projeto |

## Deploy (Vercel)

1. Suba este diretório (`gestao-atletas`) para um repositório Git.
2. Na Vercel: **New Project** → selecione o repositório → **Root Directory**: `gestao-atletas`.
3. Framework preset: **Vite**.
4. Em **Environment Variables**, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
5. Deploy. A cada push, a Vercel gera um novo deploy automaticamente.

Build de produção local (para conferir antes do deploy):

```bash
npm run build
npm run preview
```

## Estrutura do projeto

```
src/
  components/     # Layout, modais e componentes de UI reutilizáveis
  context/        # Autenticação (AuthContext)
  lib/            # Cliente Supabase, tipos, formatação, geração de PDF
  pages/          # Dashboard, Agenda, Atletas, Produtos, Pagamentos, Relatórios
```

## Lógica de negócio

- Um **produto** define quantas sessões (1 ou 2) compõem o pacote e o valor.
- Ao **agendar**, você escolhe atleta + produto: isso cria um registro em `pacotes_vendidos` (a cobrança, começando como "pendente") e uma sessão em `sessoes` para cada sessão do pacote — cada uma com sua própria data/horário, podendo ser em dias diferentes.
- O **pagamento é vinculado ao pacote**, não à sessão individual — marcar como pago/pendente é feito na tela de Pagamentos ou no perfil do atleta.
- Desativar um produto não apaga pacotes já vendidos com ele (o nome/valor são gravados no próprio pacote no momento da venda).
