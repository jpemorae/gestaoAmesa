# Arquitetura do Gestao a Mesa

Este projeto esta em transicao de prototipo localStorage para SaaS com API, Supabase e storage.

## Camadas atuais

- `src/data`: seeds e configuracoes estaveis usadas enquanto a API nao substitui os mocks.
- `src/hooks`: estado reutilizavel do frontend, incluindo persistencia local.
- `src/layout`: login, identidade visual, shell principal e shell dos modulos.
- `src/modules/platform`: dashboard da plataforma, gestao de clientes e usuarios globais.
- `src/modules/hub`: entrada do ambiente operacional do cliente.
- `src/modules/dashboards`: dashboard consolidado do cliente.
- `src/modules/shared`: layout reutilizavel dos modulos operacionais.
- `src/modules/kanban`: quadro operacional por status e area.
- `src/services`: contratos de dados do frontend. Hoje usam localStorage ou wrappers simples; no futuro, estas funcoes devem chamar a API REST.
- `src/utils`: regras puras de negocio, como permissoes, datas e conversao de unidades.
- `src/App.jsx`: orquestrador funcional atual. Os modulos operacionais ainda serao extraidos gradualmente.
- `backend/src`: API Express preparada para Render/Supabase.

## Multiempresa no frontend local

Os dados operacionais em localStorage usam chaves com `companyId`. Isso impede que estoque, etiquetas, funcionarios e checklist de um cliente aparecam no ambiente de outro cliente durante a fase anterior a API.

Os services locais tambem recebem `companyId`. Ao trocar para a API REST, esse escopo deve ser validado novamente no backend e pelas politicas RLS do Supabase.

## Proximas quebras recomendadas

1. Criar hooks por modulo para remover estados operacionais do `App.jsx`.
2. Extrair formularios e tabelas internas de estoque, etiquetas, checklist e acesso.
3. Trocar gradualmente cada service local por chamadas em `src/services/api.js`.
4. Substituir imagens em base64 por upload em Supabase Storage.

## Regra de seguranca de produto

Qualquer tela deve chamar as regras de `src/utils/permissions.js` antes de exibir modulo, atividade ou dados de cliente. Isso evita mostrar modulo nao contratado, dados de outro cliente ou filtros administrativos para usuarios operacionais.
