-- Gestao de Estoque - migration aditiva e reversivel
-- UP: cria estruturas novas sem remover/alterar tabelas existentes.
-- DOWN seguro, se necessario em rollback controlado:
-- drop table if exists inventory_losses;
-- drop table if exists inventory_movements;
-- drop table if exists inventory_batches;
-- drop table if exists inventory_products;
-- drop table if exists suppliers;
-- drop table if exists inventory_locations;
-- drop table if exists inventory_categories;

create extension if not exists pgcrypto;

create table if not exists inventory_categories (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, name)
);

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  name text not null,
  document text,
  phone text,
  email text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, name)
);

create table if not exists inventory_locations (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, name)
);

create table if not exists inventory_products (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  category_id uuid references inventory_categories(id),
  name text not null,
  internal_code text,
  barcode text,
  unit text not null,
  min_stock numeric(14,3) not null default 0,
  max_stock numeric(14,3) not null default 0,
  unit_cost numeric(14,4) not null default 0,
  controls_expiry boolean not null default true,
  active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, internal_code)
);

create table if not exists inventory_batches (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  product_id uuid not null references inventory_products(id),
  supplier_id uuid references suppliers(id),
  location_id uuid references inventory_locations(id),
  batch_code text,
  quantity numeric(14,3) not null default 0,
  initial_quantity numeric(14,3) not null default 0,
  unit text not null,
  expiry_date date,
  unit_cost numeric(14,4) not null default 0,
  invoice_url text,
  note text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  product_id uuid not null references inventory_products(id),
  batch_id uuid references inventory_batches(id),
  movement_type text not null check (movement_type in ('entrada','saida','transferencia','inventario','ajuste','descarte')),
  quantity numeric(14,3) not null,
  unit text not null,
  from_location_id uuid references inventory_locations(id),
  to_location_id uuid references inventory_locations(id),
  reason text,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists inventory_losses (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  product_id uuid not null references inventory_products(id),
  movement_id uuid references inventory_movements(id),
  quantity numeric(14,3) not null,
  unit text not null,
  total_value numeric(14,4) not null default 0,
  reason text not null,
  responsible_name text,
  location_id uuid references inventory_locations(id),
  photo_url text,
  note text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_products_company_active on inventory_products(company_id, active);
create index if not exists idx_inventory_batches_product_location on inventory_batches(product_id, location_id);
create index if not exists idx_inventory_batches_expiry on inventory_batches(company_id, expiry_date);
create index if not exists idx_inventory_movements_company_created on inventory_movements(company_id, created_at desc);
create index if not exists idx_inventory_losses_company_created on inventory_losses(company_id, created_at desc);
