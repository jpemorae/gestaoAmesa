-- Modulo de Vendas - Gestao a Mesa
-- Migration segura e aditiva.
-- O modulo usa app_clients.payload->salesData para preservar a arquitetura atual
-- de persistencia por empresa sem remover ou alterar tabelas existentes.

create extension if not exists pgcrypto;

alter table app_clients
  alter column payload set default '{}'::jsonb;

update app_clients
set payload = coalesce(payload, '{}'::jsonb)
where payload is null;

-- Inicializa a chave de vendas apenas quando ela ainda nao existe.
update app_clients
set payload = jsonb_set(
  coalesce(payload, '{}'::jsonb),
  '{salesData}',
  '{"sales": [], "updatedAt": null}'::jsonb,
  true
)
where not (coalesce(payload, '{}'::jsonb) ? 'salesData');
