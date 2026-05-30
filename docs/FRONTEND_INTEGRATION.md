# Integração Frontend

Copie os arquivos de `frontend/src/services` para seu projeto React.

Configure `.env`:

VITE_API_URL=https://seu-backend.onrender.com
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_ANON_KEY

Migração gradual:
- localStorage -> API
- arrays locais -> services
- fotos base64 -> upload no Supabase Storage
