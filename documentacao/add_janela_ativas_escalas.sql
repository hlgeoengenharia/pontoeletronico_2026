-- Adicionar colunas de Janela de Ativação à tabela escalas
-- Aplicar no Supabase SQL Editor

begin;

-- Adicionar colunas que faltam na tabela escalas
alter table public.escalas
    add column if not exists janela_ativa_antes_minutos integer not null default 30,
    add column if not exists janela_ativa_depois_minutos integer not null default 30;

comment on column public.escalas.janela_ativa_antes_minutos is 'Minutos antes do horário de entrada para ativar o botão de registro';
comment on column public.escalas.janela_ativa_depois_minutos is 'Minutos depois do horário de entrada para ativar o botão de registro';

-- Atualizar registros existentes que podem ter valores null
update public.escalas 
set janela_ativa_antes_minutos = 30 
where janela_ativa_antes_minutos is null;

update public.escalas 
set janela_ativa_depois_minutos = 30 
where janela_ativa_depois_minutos is null;

commit;