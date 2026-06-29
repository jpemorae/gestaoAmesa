-- Modulo de Faturamento - migration aditiva e segura.
-- Nao remove nem altera dados existentes.

create extension if not exists pgcrypto;

create table if not exists billing_customers (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  full_name text not null,
  cpf text not null,
  birth_date date,
  phone text,
  email text,
  zip_code text,
  address text,
  address_number text,
  complement text,
  district text,
  city text,
  state text,
  status text not null default 'Ativo',
  notes text,
  registered_at date not null default current_date,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, cpf)
);

create table if not exists billing_charges (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  customer_id uuid not null references billing_customers(id),
  parent_charge_id uuid,
  payment_method text not null,
  charge_type text not null,
  total_amount numeric(14,2) not null default 0,
  amount numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  installment_number integer not null default 1,
  total_installments integer not null default 1,
  due_date date not null,
  fixed_due_day integer,
  status text not null default 'A vencer',
  paid_at date,
  notes text,
  history jsonb not null default '[]'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists billing_payments (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  charge_id uuid not null references billing_charges(id),
  customer_id uuid not null references billing_customers(id),
  amount numeric(14,2) not null,
  payment_method text,
  paid_at date not null default current_date,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_billing_customers_company_status on billing_customers(company_id, status);
create index if not exists idx_billing_customers_company_cpf on billing_customers(company_id, cpf);
create index if not exists idx_billing_charges_company_due on billing_charges(company_id, due_date);
create index if not exists idx_billing_charges_company_status on billing_charges(company_id, status);
create index if not exists idx_billing_charges_customer on billing_charges(customer_id);
create index if not exists idx_billing_payments_company_paid on billing_payments(company_id, paid_at);

alter table billing_customers enable row level security;
alter table billing_charges enable row level security;
alter table billing_payments enable row level security;
