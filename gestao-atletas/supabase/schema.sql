-- Schema do sistema de Gestão de Atletas
-- Rode este script no SQL Editor de um projeto Supabase novo.

create extension if not exists pgcrypto;

-- ATLETAS
create table public.atletas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  email text,
  modalidade text,
  data_inicio date not null default current_date,
  status text not null default 'ativo' check (status in ('ativo','inativo')),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- PRODUTOS (tipos de pacote/sessão)
create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  qtd_sessoes integer not null check (qtd_sessoes in (1,2)),
  valor numeric(10,2) not null check (valor >= 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- PACOTES VENDIDOS (vínculo atleta-produto = a cobrança)
create table public.pacotes_vendidos (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  produto_id uuid not null references public.produtos(id) on delete restrict,
  produto_nome_snapshot text not null,
  qtd_sessoes_snapshot integer not null,
  data_venda date not null default current_date,
  valor numeric(10,2) not null check (valor >= 0),
  status_pagamento text not null default 'pendente' check (status_pagamento in ('pago','pendente')),
  data_pagamento date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- SESSOES (1 ou 2 por pacote)
create table public.sessoes (
  id uuid primary key default gen_random_uuid(),
  pacote_id uuid not null references public.pacotes_vendidos(id) on delete cascade,
  atleta_id uuid not null references public.atletas(id) on delete cascade,
  data date not null,
  horario time not null,
  status text not null default 'agendada' check (status in ('agendada','realizada','cancelada')),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_pacotes_atleta on public.pacotes_vendidos(atleta_id);
create index idx_pacotes_produto on public.pacotes_vendidos(produto_id);
create index idx_sessoes_pacote on public.sessoes(pacote_id);
create index idx_sessoes_atleta on public.sessoes(atleta_id);
create index idx_sessoes_data on public.sessoes(data);
create index idx_atletas_status on public.atletas(status);

-- updated_at trigger helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_atletas_updated_at before update on public.atletas
  for each row execute function public.set_updated_at();
create trigger trg_produtos_updated_at before update on public.produtos
  for each row execute function public.set_updated_at();
create trigger trg_pacotes_updated_at before update on public.pacotes_vendidos
  for each row execute function public.set_updated_at();
create trigger trg_sessoes_updated_at before update on public.sessoes
  for each row execute function public.set_updated_at();

-- RLS: aplicativo de usuário único, acesso apenas para usuários autenticados
alter table public.atletas enable row level security;
alter table public.produtos enable row level security;
alter table public.pacotes_vendidos enable row level security;
alter table public.sessoes enable row level security;

create policy "auth full access atletas" on public.atletas
  for all to authenticated using (true) with check (true);
create policy "auth full access produtos" on public.produtos
  for all to authenticated using (true) with check (true);
create policy "auth full access pacotes_vendidos" on public.pacotes_vendidos
  for all to authenticated using (true) with check (true);
create policy "auth full access sessoes" on public.sessoes
  for all to authenticated using (true) with check (true);
