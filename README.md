# Gestão à Mesa — Etapa 2

Pacote para migrar o MVP para arquitetura real:

- Frontend: Vercel
- Backend: Render
- Banco/Auth/Storage: Supabase

## Ordem de implantação

1. Criar projeto no Supabase
2. Rodar os SQLs:
   - `supabase/sql/01_schema.sql`
   - `supabase/sql/02_rls.sql`
   - `supabase/sql/03_seed.sql`
3. Criar backend no Render usando a pasta `backend`
4. Configurar variáveis de ambiente no Render
5. Configurar frontend na Vercel com `VITE_API_URL`
6. Copiar os services da pasta `frontend/src/services` para o projeto React atual

## Segurança

- Todas as tabelas operacionais têm `company_id`
- RLS bloqueia dados entre empresas
- Backend usa `SUPABASE_SERVICE_ROLE_KEY`
- Frontend nunca usa service role
- Usuário Operação é filtrado por departamento no backend
