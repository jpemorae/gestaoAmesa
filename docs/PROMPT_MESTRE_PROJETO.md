# Prompt Mestre - Gestao a Mesa

Use este documento como contexto completo para continuar o desenvolvimento do projeto.

---

## PAPEL

Voce e um engenheiro senior full stack, arquiteto de software, Product Manager e especialista em UX para SaaS B2B.

Sua responsabilidade e evoluir o sistema **Gestao a Mesa** com seguranca, preservando funcionalidades existentes e preparando o produto para operacao real com frontend React, API Node.js/Express, Supabase, storage e deploy em producao.

Antes de alterar codigo:

1. Revise a estrutura atual.
2. Entenda os fluxos existentes.
3. Preserve login, Hub, estoque, etiquetas, QRCode, checklist e Kanban.
4. Implemente mudancas em etapas pequenas.
5. Rode build apos cada etapa relevante.
6. Nao apresente roadmap como funcionalidade concluida.
7. Nunca misture dados entre clientes.

---

## 1. VISAO DO PRODUTO

O **Gestao a Mesa** e um SaaS operacional para:

- restaurantes;
- bares;
- dark kitchens;
- cozinhas industriais;
- empresas de food service.

O produto centraliza operacoes internas que normalmente ficam espalhadas em planilhas, papeis, grupos de mensagem e controles informais.

O sistema possui modulos contrataveis por cliente:

- Dashboard operacional;
- Controle de estoque;
- Etiquetas com QRCode;
- Checklist;
- Kanban operacional;
- Gestao de acesso.

Cada empresa contratante possui seu proprio ambiente, identidade visual, usuarios, departamentos, estoque, etiquetas e atividades.

---

## 2. PERFIS DE USUARIO

### 2.1 Admin da plataforma

Representa o dono do SaaS.

Pode:

- acessar dashboard global;
- cadastrar e editar clientes;
- inativar clientes;
- configurar mensalidade e situacao financeira;
- selecionar modulos contratados;
- subir logo e definir cor visual;
- abrir o ambiente operacional de qualquer cliente;
- cadastrar usuarios globais da plataforma.

### 2.2 Administrador do cliente

Representa o contratante.

Pode:

- acessar apenas sua empresa;
- visualizar todos os modulos contratados;
- gerenciar funcionarios;
- cadastrar areas;
- cadastrar processos e atividades;
- acompanhar estoque, etiquetas, checklist e indicadores.

### 2.3 Gestor do cliente

Pode:

- acompanhar operacao;
- visualizar dashboards;
- acessar modulos liberados;
- usar filtros administrativos;
- acompanhar atividades por area.

### 2.4 Operacao

Pode:

- visualizar somente modulos liberados;
- visualizar apenas atividades da propria area;
- executar checklist;
- registrar pendencias;
- anexar evidencias;
- consumir ou descartar etiquetas por QRCode conforme permissao.

Nao deve:

- acessar gestao global da plataforma;
- visualizar dados de outra empresa;
- visualizar filtros administrativos globais;
- visualizar modulos nao contratados;
- visualizar atividades fora de sua area.

---

## 3. FLUXO DE LOGIN

O fluxo esperado e:

1. Usuario informa e-mail e senha.
2. O sistema valida usuario ativo.
3. Se for cliente, valida tambem se a empresa esta ativa.
4. Admin da plataforma vai para Dashboard global.
5. Cliente vai diretamente para o Hub de solucoes.
6. Operacao visualiza somente modulos e atividades liberados.
7. A sessao e persistida no navegador.
8. Logout remove a sessao corretamente.

Credenciais locais de demonstracao:

```text
Admin plataforma
admin@gestaoamesa.com
123456

Admin cliente Divino
admin@divino.com
123456
```

Essas credenciais sao apenas mock local. Nao devem ser usadas em producao.

---

## 4. AMBIENTE DO DONO DA PLATAFORMA

### Dashboard global

Indicadores atuais:

- clientes cadastrados;
- clientes ativos;
- clientes inativos;
- faturamento mensal previsto;
- faturamento em aberto;
- cards de clientes recentes.

### Gestao de clientes

Campos:

- razao social;
- nome fantasia;
- CNPJ ou documento;
- telefone;
- e-mail;
- endereco;
- forma de pagamento;
- mensalidade;
- dia de vencimento;
- situacao financeira: `Em dia`, `Em aberto`, `Inadimplente`;
- status: `Ativo`, `Inativo`;
- cor da identidade visual;
- logomarca;
- modulos contratados.

Acoes:

- cadastrar;
- editar;
- ativar;
- inativar;
- excluir no prototipo local;
- abrir ambiente operacional.

### Card do cliente

Exibe:

- logo ou iniciais;
- nome fantasia;
- razao social;
- status;
- situacao financeira;
- mensalidade;
- modulos contratados.

---

## 5. HUB DE SOLUCOES

O Hub e a entrada do ambiente operacional.

Exibe:

- identidade do cliente;
- logo ou iniciais;
- nome fantasia;
- cards somente dos modulos contratados e permitidos.

Modulos:

```text
acompanhamento -> Dashboard
estoque         -> Controle de estoque
etiquetas       -> Etiquetas
checklist       -> Checklist
acesso          -> Gestao de acesso
```

Regra obrigatoria:

```text
Nunca mostrar modulo nao contratado.
Nunca mostrar modulo nao liberado para o perfil.
```

---

## 6. DASHBOARD DO CLIENTE

Indicadores consolidados:

- estoque zerado;
- lotes vencidos;
- etiquetas disponiveis;
- etiquetas consumidas;
- etiquetas descartadas;
- pendencias abertas;
- checklist concluido hoje;
- atividades com evidencia fotografica.

---

## 7. CONTROLE DE ESTOQUE

### Menu interno

- Cadastro;
- Itens cadastrados;
- Lancamento de estoque;
- Estoque;
- Acompanhamento.

### Produto ou item

Campos:

- tipo: produto ou item;
- nome;
- categoria;
- quantidade ou peso inicial;
- unidade;
- validade padrao em dias.

### Categorias

Permite:

- criar;
- listar;
- excluir somente quando nao houver vinculo.

### Lancamento

Campos:

- item;
- quantidade;
- unidade;
- validade;
- origem.

### Regras de unidade

O sistema converte:

```text
kg -> g
L  -> ml
```

Unidades base:

```text
peso   -> g
volume -> ml
item   -> un
```

### Regras obrigatorias

- controlar saldo por lote;
- controlar validade;
- manter quantidade inicial;
- exibir itens zerados;
- exibir proximos do vencimento;
- exibir vencidos;
- nao confundir impressao de etiqueta com baixa de estoque.

---

## 8. ETIQUETAS E QRCODE

### Geracao

Campos:

- produto ou item;
- quantidade por etiqueta;
- unidade;
- quantidade de etiquetas;
- data de emissao;
- validade.

Cada etiqueta possui:

- codigo unico;
- produto;
- quantidade;
- unidade;
- validade;
- status;
- logo e nome fantasia;
- QRCode real.

### Status

```text
Disponivel
Consumido
Descartado
Vencido
```

### Regra principal

```text
Gerar ou imprimir etiqueta NAO baixa estoque.
```

A baixa ocorre somente quando:

1. QRCode e lido ou codigo e informado manualmente.
2. Usuario abre pagina de acao.
3. Usuario escolhe uma acao.

### Acoes do QRCode

#### Producao para mesa

- baixa estoque;
- registra consumo ou venda;
- registra responsavel;
- registra area;
- registra data e hora.

#### Descarte

- exige motivo;
- baixa estoque;
- registra responsavel;
- registra area;
- registra data e hora.

#### Sair

- nao altera estoque;
- retorna para etiquetas.

### Impressao

O CSS possui layout para impressora termica monocromatica:

- alto contraste;
- QRCode legivel;
- botoes ocultos;
- dimensoes reduzidas;
- identidade do cliente.

---

## 9. CHECKLIST

### Menu interno

- Executar checklist;
- Kanban;
- Atividades;
- Historico;
- Acompanhamento.

### Status

```text
Nao iniciado
Executando
Pendencia
Concluido
```

### Execucao

Ao iniciar:

- registrar horario;
- iniciar cronometro;
- registrar responsavel.

Ao marcar pendencia:

- exigir motivo;
- parar cronometro;
- preservar tempo acumulado;
- mover para Pendencia;
- permitir retomada.

Ao finalizar:

- exigir evidencia fotografica;
- permitir upload ou captura;
- exibir preview;
- registrar horario final;
- calcular duracao;
- registrar pontualidade;
- mover para Concluido;
- salvar evidencia no historico.

### Recorrencia

Configuracoes:

- nao repete;
- diaria;
- semanal;
- mensal;
- por turno.

Atividades recorrentes voltam conforme periodicidade.

---

## 10. KANBAN OPERACIONAL

Colunas:

```text
Nao iniciado
Executando
Pendencia
Concluido
```

Regras:

- atividade cadastrada entra em Nao iniciado;
- iniciar move para Executando;
- registrar impedimento move para Pendencia;
- finalizar move para Concluido;
- operacao visualiza somente propria area;
- gestor e admin podem filtrar por area.

---

## 11. GESTAO DE ACESSO

### Cadastros

- usuario;
- processo ou atividade;
- area ou departamento.

### Usuario

Campos:

- nome;
- e-mail;
- senha;
- perfil;
- setor;
- cargo;
- status;
- permissoes por modulo;
- notificacao Telegram;
- username Telegram;
- chat ID;
- telefone.

### Perfis

```text
Administrador
Gestor
Operacao
```

### Telegram

O frontend possui cadastro e teste visual da configuracao.

Pendente:

- integrar bot real;
- implementar envio real de notificacoes.

---

## 12. SEGURANCA E MULTIEMPRESA

### Frontend local

Os dados operacionais em `localStorage` usam chaves com `companyId`:

```text
<chave>:<companyId>
```

Exemplo:

```text
gestao_mesa_stock_products:cliente-divino-botequim
```

O helper esta em:

```text
src/services/tenantStorage.js
```

O hook esta em:

```text
src/hooks/useTenantPersistentState.js
```

### Permissoes frontend

Arquivo:

```text
src/utils/permissions.js
```

Funcoes:

```text
canViewModule(user, company, moduleId)
canCreate(user)
canEdit(user)
canDelete(user)
getVisibleModules(user, company, modules)
getVisibleActivities(user, activities)
getCurrentClientForUser(user, clients, viewedClientId)
isOperationalUser(user)
isClientAdminOrManager(user)
getUserOperationalArea(user)
```

### Backend

O middleware:

```text
backend/src/middleware/auth.js
```

Valida:

- token Bearer;
- usuario Supabase Auth;
- perfil em `users_profile`;
- `company_id`;
- perfil permitido por rota.

Regra obrigatoria:

```text
Frontend nao e camada suficiente de seguranca.
Sempre validar company_id e perfil no backend.
Aplicar RLS no Supabase.
```

---

## 13. STACK

### Frontend

```text
React
Vite
CSS puro
localStorage durante transicao
```

Scripts:

```bash
npm run dev
npm run build
npm run preview
```

### Backend

```text
Node.js
Express
Supabase JS
CORS
Helmet
Morgan
Multer
dotenv
```

Scripts:

```bash
cd backend
npm install
npm run dev
npm start
```

### Infra prevista

```text
Frontend -> Vercel
Backend  -> Render
Banco    -> Supabase Postgres
Auth     -> Supabase Auth
Storage  -> Supabase Storage
```

---

## 14. ESTRUTURA DO FRONTEND

```text
src/
  App.jsx
  main.jsx
  style.css
  assets/
    gestao-a-mesa-logo.png
  data/
    mockData.js
    moduleInfo.js
  hooks/
    usePersistentState.js
    useTenantPersistentState.js
  layout/
    AppShell.jsx
    BrandLogo.jsx
    LoginPage.jsx
    ModuleShell.jsx
  modules/
    dashboards/
      ClientDashboard.jsx
    hub/
      HubPage.jsx
    kanban/
      KanbanBoard.jsx
    platform/
      ClientCardsPage.jsx
      ClientManagementPage.jsx
      PlatformDashboard.jsx
      PlatformUsersPage.jsx
    shared/
      OperationalModuleLayout.jsx
  services/
    accessService.js
    api.js
    authService.js
    checklistService.js
    clientService.js
    labelService.js
    localStore.js
    stockService.js
    tenantStorage.js
    uploadService.js
  utils/
    date.js
    permissions.js
    qr.js
    units.js
```

Observacao:

```text
src/App.jsx ainda orquestra estados e partes internas dos modulos operacionais.
Continuar extraindo em etapas, sem reescrever tudo de uma vez.
```

---

## 15. ESTRUTURA DO BACKEND

```text
backend/
  src/
    server.js
    config/
      supabase.js
    middleware/
      auth.js
      error.js
    routes/
      auth.routes.js
      company.routes.js
      access.routes.js
      stock.routes.js
      label.routes.js
      checklist.routes.js
      upload.routes.js
    controllers/
      auth.controller.js
      company.controller.js
      access.controller.js
      stock.controller.js
      label.controller.js
      checklist.controller.js
      upload.controller.js
```

---

## 16. API REST PREPARADA

### Health

```text
GET /health
GET /
```

### Auth

```text
POST /auth/login
GET  /auth/me
```

### Empresas

```text
GET  /companies
POST /companies
PUT  /companies/:id
```

Restrito a:

```text
Super Admin
```

### Acesso

```text
GET  /access/departments
POST /access/departments
GET  /access/users
POST /access/users
```

### Estoque

```text
GET  /stock/products
POST /stock/products
GET  /stock/lots
POST /stock/entries
```

### Etiquetas

```text
GET  /labels
POST /labels
POST /labels/:code/consume
POST /labels/:code/discard
```

### Checklist

```text
GET  /checklist/activities
POST /checklist/activities
GET  /checklist/executions
POST /checklist/executions/:activityId/start
POST /checklist/executions/:executionId/pending
POST /checklist/executions/:executionId/finish
```

### Uploads

```text
POST /uploads/evidence
POST /uploads/logo
```

Uploads usam:

```text
multipart/form-data
campo: file
```

---

## 17. SUPABASE

### Variaveis backend

```env
PORT=10000
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_ANON_KEY=SUA_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY
FRONTEND_URL=https://seu-front.vercel.app
```

### Variaveis frontend previstas

```env
VITE_API_URL=https://seu-backend.onrender.com
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_ANON_KEY
```

### Buckets previstos

```text
logos
evidencias
etiquetas
```

### Tabelas esperadas pela API

A API atual referencia:

```text
companies
users_profile
departments
product_categories
products
stock_lots
stock_movements
labels
activities
checklist_executions
```

### Pendencia critica

Os arquivos abaixo existem, mas estao vazios no workspace atual:

```text
supabase/sql/01_schema.sql
supabase/sql/02_rls.sql
supabase/sql/03_seed.sql
```

Portanto:

```text
O schema Supabase ainda NAO esta entregue.
As policies RLS ainda NAO estao entregues.
Os seeds SQL ainda NAO estao entregues.
```

Antes de integrar a API em producao:

1. Criar schema completo.
2. Criar indices.
3. Criar constraints.
4. Criar policies RLS multiempresa.
5. Criar buckets e policies de storage.
6. Criar seeds de desenvolvimento.
7. Testar isolamento entre empresas.

---

## 18. DEPLOY

### Frontend na Vercel

Usar projeto raiz:

```text
/
```

Build:

```bash
npm run build
```

Diretorio de saida:

```text
dist
```

### Backend no Render

Root Directory:

```text
backend
```

Build Command:

```bash
npm install
```

Start Command:

```bash
npm start
```

---

## 19. ESTADO ATUAL REAL

### Implementado e validado

- login local;
- sessao persistente;
- logout;
- separacao admin plataforma e cliente;
- bloqueio de cliente inativo;
- dashboard global;
- gestao de clientes;
- configuracao financeira;
- identidade visual do cliente;
- Hub por modulos contratados;
- dashboard operacional;
- estoque com unidades e lotes;
- etiquetas com QRCode;
- impressao termica;
- baixa somente por acao do QRCode;
- checklist com cronometro;
- pendencia com motivo;
- evidencia fotografica local;
- recorrencia;
- Kanban;
- gestao de acesso;
- permissao frontend;
- isolamento local por empresa;
- services locais preparados para receber `companyId`;
- API Express preparada;
- uploads preparados para Supabase Storage;
- documentacao de arquitetura;
- build frontend validado;
- sintaxe backend validada.

### Parcialmente implementado

- modularizacao interna dos modulos operacionais;
- integracao frontend com API;
- persistencia real no Supabase;
- storage real;
- Telegram real.

### Nao implementado

- schema SQL Supabase;
- RLS Supabase;
- seed SQL;
- testes automatizados;
- deploy configurado em ambiente real;
- monitoramento;
- auditoria completa;
- recuperacao de senha;
- refresh de sessao real no frontend integrado;
- edicao de funcionario no modulo operacional;
- inativacao no lugar de exclusao em todos os fluxos.

---

## 20. BACKLOG PRIORIZADO

### Prioridade 1 - Banco e seguranca

1. Criar `01_schema.sql`.
2. Criar `02_rls.sql`.
3. Criar `03_seed.sql`.
4. Criar policies de storage.
5. Testar isolamento entre duas empresas.

### Prioridade 2 - Integracao API

1. Trocar login local por `/auth/login`.
2. Armazenar token com estrategia segura.
3. Adicionar Bearer token em `apiFetch`.
4. Trocar `clientService`.
5. Trocar `accessService`.
6. Trocar `stockService`.
7. Trocar `labelService`.
8. Trocar `checklistService`.
9. Trocar upload base64 por `/uploads/evidence` e `/uploads/logo`.

### Prioridade 3 - Modularizacao

1. Criar hooks por modulo.
2. Extrair formularios internos.
3. Extrair tabelas internas.
4. Remover estados operacionais de `App.jsx`.
5. Criar testes de regras puras.

### Prioridade 4 - Produto

1. Telegram real.
2. Auditoria.
3. Recuperacao de senha.
4. Historico financeiro.
5. Relatorios.
6. Monitoramento.

---

## 21. CRITERIOS DE ACEITE

Antes de considerar qualquer entrega concluida:

```text
[ ] Login da plataforma funciona
[ ] Login do cliente funciona
[ ] Cliente inativo nao entra
[ ] Hub mostra somente modulos contratados
[ ] Operacao nao acessa gestao global
[ ] Dados de uma empresa nao aparecem em outra
[ ] Estoque converte kg/g e L/ml
[ ] Impressao de etiqueta nao baixa estoque
[ ] QRCode abre pagina de acao
[ ] Consumo baixa estoque
[ ] Descarte exige motivo e baixa estoque
[ ] Checklist exige evidencia
[ ] Pendencia exige motivo
[ ] Kanban reflete os status
[ ] Build frontend passa
[ ] Backend passa em verificacao sintatica
[ ] RLS e testada quando Supabase estiver integrado
```

---

## 22. COMANDOS DE VALIDACAO

Frontend:

```bash
npm run build
```

Backend:

```powershell
Get-ChildItem backend\src -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

Desenvolvimento local:

```bash
npm run dev -- --host 127.0.0.1 --port 5173
```

---

## 23. INSTRUCAO FINAL PARA CONTINUAR O DESENVOLVIMENTO

Continue o projeto em etapas pequenas e verificaveis.

Nao destrua funcionalidades existentes.

Nao confunda prototipo local com backend concluido.

Priorize:

1. schema Supabase;
2. RLS multiempresa;
3. integracao real da API;
4. storage;
5. testes;
6. modularizacao restante.

Sempre preserve a identidade visual atual do Gestao a Mesa.

