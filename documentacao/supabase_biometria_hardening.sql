-- Hardening do fluxo de biometria facial no registro de ponto.
-- Aplicar no projeto Supabase antes de publicar o front-end atualizado.

begin;

alter table public.pontos
    add column if not exists biometria_verificada boolean not null default false,
    add column if not exists biometria_score numeric(6,4),
    add column if not exists biometria_metodo text,
    add column if not exists biometria_timestamp timestamptz,
    add column if not exists biometria_device_error text;

comment on column public.pontos.biometria_verificada is 'Indica se houve verificacao facial valida antes da gravacao do ponto.';
comment on column public.pontos.biometria_score is 'Score de confianca da validacao facial (0 a 1).';
comment on column public.pontos.biometria_metodo is 'Motor usado para validar a biometria.';
comment on column public.pontos.biometria_timestamp is 'Data/hora da validacao facial que autorizou a batida.';
comment on column public.pontos.biometria_device_error is 'Codigo do erro de dispositivo quando a camera falhar.';

create or replace function public.validate_biometric_punch()
returns trigger
language plpgsql
as $$
begin
    if new.tipo in ('check-in', 'check-out')
       and coalesce(new.status, '') <> 'automatico_50' then
        if coalesce(new.biometria_verificada, false) is not true then
            raise exception 'Biometria facial obrigatoria para %.', new.tipo
                using errcode = 'P0001';
        end if;

        if coalesce(new.biometria_metodo, '') <> 'face-api' then
            raise exception 'Metodo biometrico invalido para %.', new.tipo
                using errcode = 'P0001';
        end if;

        if new.biometria_timestamp is null then
            raise exception 'Timestamp da biometria obrigatorio para %.', new.tipo
                using errcode = 'P0001';
        end if;

        if new.biometria_score is null or new.biometria_score <= 0 then
            raise exception 'Score biometrico obrigatorio para %.', new.tipo
                using errcode = 'P0001';
        end if;

        if new.biometria_device_error is not null then
            raise exception 'Registro com erro de camera nao pode ser persistido como ponto valido.'
                using errcode = 'P0001';
        end if;
    end if;

    return new;
end;
$$;

drop trigger if exists trg_validate_biometric_punch on public.pontos;
create trigger trg_validate_biometric_punch
before insert or update on public.pontos
for each row
execute function public.validate_biometric_punch();

commit;

-- Observacao importante:
-- O projeto atual autentica usuarios em tabela propria (perfis_tripulantes) usando a anon key.
-- Isso impede vincular funcionario_id ao auth.uid() de forma forte no banco sem migrar para Supabase Auth.
-- Quando a autenticacao for migrada, complemente este hardening com:
-- 1. RLS em public.pontos exigindo funcionario_id = auth.uid()
-- 2. RPC/trigger de update de biometria aceitando apenas o proprio usuario autenticado
