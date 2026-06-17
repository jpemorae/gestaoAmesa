-- Persistencia dos cadastros administrativos usados pelo frontend.
-- Migration aditiva: nao altera nem remove tabelas existentes.
-- Rollback controlado:
-- drop table if exists app_users;
-- drop table if exists app_clients;

create extension if not exists pgcrypto;

create table if not exists app_clients (
  id text primary key,
  company_name text not null,
  fantasy_name text not null,
  email text,
  status text not null default 'Ativo',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_users (
  id text primary key,
  name text not null,
  email text not null unique,
  password_hash text not null,
  password_salt text not null,
  profile text not null default 'Administrador',
  status text not null default 'Ativo',
  user_type text not null default 'platform',
  company_id text references app_clients(id),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_app_clients_status on app_clients(status);
create index if not exists idx_app_users_email_status on app_users(email, status);
