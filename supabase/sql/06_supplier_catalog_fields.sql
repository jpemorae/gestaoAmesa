-- Campos completos para cadastro de fornecedores.
-- Migration aditiva: nao remove dados existentes.

alter table suppliers
  add column if not exists corporate_name text,
  add column if not exists fantasy_name text,
  add column if not exists product_category_id text,
  add column if not exists status text not null default 'Ativo',
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update suppliers
set
  corporate_name = coalesce(corporate_name, name),
  fantasy_name = coalesce(fantasy_name, name),
  status = case when active then 'Ativo' else 'Inativo' end
where corporate_name is null
   or fantasy_name is null
   or status is null;

create index if not exists idx_suppliers_company_status on suppliers(company_id, status);
create index if not exists idx_suppliers_company_product_category on suppliers(company_id, product_category_id);
create index if not exists idx_suppliers_company_document on suppliers(company_id, document);
