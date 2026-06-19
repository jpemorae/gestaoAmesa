-- Hardening de seguranca para dados administrativos.
-- Remove senhas em texto claro que possam ter sido gravadas no payload legado.

update app_users
set
  payload = payload - 'password',
  updated_at = now()
where payload ? 'password';

create index if not exists idx_app_users_company_type on app_users(company_id, user_type);

alter table if exists app_clients enable row level security;
alter table if exists app_users enable row level security;
alter table if exists inventory_categories enable row level security;
alter table if exists suppliers enable row level security;
alter table if exists inventory_locations enable row level security;
alter table if exists inventory_products enable row level security;
alter table if exists inventory_batches enable row level security;
alter table if exists inventory_movements enable row level security;
alter table if exists inventory_losses enable row level security;
alter table if exists security_audit_logs enable row level security;
