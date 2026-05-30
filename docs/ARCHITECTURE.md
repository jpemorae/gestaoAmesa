# Arquitetura do Gestao a Mesa

Este projeto esta em transicao de prototipo localStorage para SaaS com API, Supabase e storage.

## Camadas atuais

- `src/data`: seeds e configuracoes estaveis usadas enquanto a API nao substitui os mocks.
- `src/services`: contratos de dados do frontend. Hoje usam localStorage ou wrappers simples; no futuro, estas funcoes devem chamar a API REST.
- `src/utils`: regras puras de negocio, como permissoes, datas e conversao de unidades.
- `src/App.jsx`: shell funcional atual. Ainda concentra muita UI e deve ser quebrado por modulos em etapas.
- `backend/src`: API Express preparada para Render/Supabase.

## Proximas quebras recomendadas

1. Extrair layout base para `src/layout`.
2. Mover dashboard, hub e gestao de clientes para `src/modules/platform` e `src/modules/hub`.
3. Mover estoque, etiquetas, checklist, kanban e acesso para `src/modules`.
4. Trocar gradualmente cada service local por chamadas em `src/services/api.js`.
5. Remover estados duplicados do `App.jsx` conforme cada modulo passar a ser dono da sua tela.

## Regra de seguranca de produto

Qualquer tela deve chamar as regras de `src/utils/permissions.js` antes de exibir modulo, atividade ou dados de cliente. Isso evita mostrar modulo nao contratado, dados de outro cliente ou filtros administrativos para usuarios operacionais.
