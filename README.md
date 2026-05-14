# Gestão à Mesa - V5

Atualizações:
- Card de Visualizar clientes não exibe mais o valor faturado.
- Ajustes de proporção da tela: campos, botões, cards e espaçamentos menores.
- Responsividade melhorada para celular.
- Login agora valida usuário cadastrado.
- Usuário inicial:
  - admin@gestaoamesa.com
  - senha: 123456


## V8 - Hub simples funcional

- Adicionada opção "Hub de soluções" no menu lateral.
- Hub possui três cards fixos:
  - Controle de estoque
  - Etiquetas
  - Checklist
- Ao clicar em qualquer card, o sistema abre uma tela nova do módulo.
- Nas telas dos módulos, o layout principal do Gestão à Mesa não aparece.
- Cada módulo possui botão para voltar ao Hub.


## V11 - Estoque refatorado

- Refeito a partir da V8 funcional para evitar erro de JSX.
- Controle de estoque foi separado em funções:
  - renderStockModule
  - renderStockCadastro
  - renderStockItens
  - renderStockLancamento
  - renderStockEstoque
- Menu lateral interno do estoque:
  - Cadastro
  - Itens cadastrados
  - Lançamento de estoque
  - Estoque
- Cadastro permite:
  - Produto
  - Item
  - Processo
  - Atividade
- Entrada de estoque com conversão:
  - Kilo → Grama
  - Litro → Mililitro


## V12 - Cadastros separados no Controle de Estoque

Alterações:
- Cadastro separado para Produto/Item.
- Cadastro separado para Processo/Atividade.
- Processo/Atividade contém:
  - Nome do processo/atividade
  - Hora início
  - Hora fim
  - Se repete
  - Quantas vezes repete
  - Frequência: diário, semanal, mensal ou por turno
  - Área referente
- Itens cadastrados agora exibe tanto produtos/itens quanto processos/atividades.


## V13 - Estoque + Checklist

Novidades:
- Tela Cadastro agora usa seleção:
  - Produto / Item
  - Processo / Atividade
  - Usuário
- Cadastro de usuário com:
  - Perfil
  - Setor
  - Cargo
- Checklist funcional:
  - Usa processos/atividades cadastrados no estoque
  - Executar checklist com botão Iniciar e Finalizar
  - Captura horário do dispositivo
  - Calcula tempo de execução
  - Mede pontualidade
  - Histórico de execução


## V15 - Acompanhamento separado

Correção:
- Removido dashboard de dentro da tela Cadastro.
- Criada opção no menu interno: Acompanhamento (dashboard).

Controle de estoque:
- Acompanhamento (dashboard) mostra indicadores operacionais do estoque.

Checklist:
- Acompanhamento (dashboard) mostra indicadores operacionais do checklist.


## V16 - Checklist completo

Funcionalidades aplicadas ao módulo Checklist:
- Cadastro de atividades diretamente no módulo Checklist.
- Atividades continuam compartilhadas com Processos/Atividades cadastrados no Controle de Estoque.
- Execução com botão Iniciar e Finalizar.
- Captura automática do horário do dispositivo.
- Cálculo de tempo de execução.
- Validação de pontualidade com base no horário previsto.
- Filtro por área.
- Seleção de responsável pela execução.
- Histórico com responsável, horário previsto, horário realizado, tempo e pontualidade.
- Acompanhamento/dashboard separado.
- Exclusão de atividades.


## V17 - Mobile friendly

Melhorias para celular:
- Menu principal vira barra inferior fixa.
- Menu interno dos módulos vira navegação horizontal.
- Cabeçalho fica compacto e fixo no topo.
- Cards, formulários e botões ajustados para toque.
- Telas dos módulos ficam mais leves em celular.
- Tabelas mantêm rolagem horizontal suave.
- Melhor espaçamento e proporção geral para webapp mobile.


## V18 - Notificação Telegram no cadastro de usuário

Incluído no cadastro de usuário:
- Opção "Receber notificações no Telegram".
- Username do Telegram.
- Chat ID do Telegram.
- Telefone de referência.
- Validação obrigatória do Chat ID quando Telegram estiver ativo.
- Lista de usuários exibe status do Telegram.
- Botão para testar configuração do Telegram.
- Dashboard do Checklist passa a contar usuários com Telegram ativo.

Observação:
- O envio real via bot será conectado na próxima etapa com a API do Telegram.


## V19 - Módulos por cliente

Incluído:
- Na Gestão de Cliente, seleção das funcionalidades liberadas no Hub:
  - Controle de estoque
  - Etiquetas
  - Checklist
- Login de cliente vai direto para o Hub de soluções.
- Cliente só enxerga os módulos contratados.
- Admin da plataforma continua vendo gestão de clientes.
- Ambiente do cliente Divino criado para teste:
  - admin@divino.com
  - senha: 123456
- Admin plataforma:
  - admin@gestaoamesa.com
  - senha: 123456


## V20 - Módulos contratados e Gestão de acesso

Alterações:
- Removido card do cliente dentro do Hub de soluções.
- Card da guia Visualizar cliente agora exibe:
  - Módulos contratados:
    - Controle de estoque
    - Etiquetas
    - Checklist
    - Gestão de acesso
- Criado novo módulo no Hub: Gestão de acesso.
- Gestão de acesso permite cadastrar funcionários, perfil, setor, cargo, status e dados do Telegram.
- O cliente só visualiza no Hub os módulos liberados na Gestão de cliente.


## V21 - Usuários removidos do estoque

Alteração:
- Removido o cadastro de usuário de dentro do módulo Controle de estoque.
- O módulo Controle de estoque agora cadastra apenas:
  - Produto / Item
  - Processo / Atividade
- A gestão de funcionários, perfis, setores, cargos e Telegram fica exclusivamente no módulo Gestão de acesso.


## V22 - Processo/Atividade na Gestão de acesso

Alterações:
- Removido Processo/Atividade do cadastro do Controle de Estoque.
- Controle de Estoque agora cadastra apenas Produto/Item.
- Gestão de acesso agora permite escolher o que cadastrar:
  - Usuário
  - Processo / Atividade
- Cadastro de Processo/Atividade foi movido para Gestão de acesso.
- Checklist continua consumindo os processos/atividades cadastrados.


## V23 - Kanban e Áreas/Departamentos

Incluído:
- Checklist > Kanban com colunas:
  - Não iniciado
  - Executando
  - Pendência
  - Concluído
- Filtro por área/departamento no Kanban.
- Gestão de acesso > Cadastro de Área / Departamento.
- Áreas reutilizadas no cadastro de usuário e processo/atividade.


## V24 - Pendência no Checklist

Incluído:
- Botão Pendência durante a execução do checklist.
- Ao clicar em Pendência:
  - o cronômetro para;
  - abre uma caixa para informar o motivo do impedimento;
  - a atividade entra em status de Pendência;
  - o Kanban passa a mostrar a atividade na coluna Pendência;
  - é possível Retomar a atividade depois.
- Ao retomar, o tempo já executado é preservado.
- Ao finalizar, o sistema soma o tempo executado antes e depois da pendência.


## V25 - Regra de status do Kanban ajustada

Ajuste aplicado:
- Atividade cadastrada aparece em "Não iniciado".
- Ao clicar em Iniciar, vai para "Executando".
- Ao clicar em Pendência, vai para "Pendência".
- Ao finalizar, vai para "Concluído".
- Removida regra automática que enviava atividade atrasada para Pendência sem clique do usuário.


## V26 - Etiquetas funcional

Funcionalidades trazidas para o novo projeto:
- Geração de etiquetas por produto/item.
- Quantidade por etiqueta.
- Seleção de unidade:
  - Grama
  - Kilo
  - Mililitro
  - Litro
  - Unidade
- Quantidade de etiquetas.
- Data de emissão.
- Validade.
- Baixa automática no estoque ao gerar etiquetas.
- Validação de estoque insuficiente.
- Histórico de etiquetas geradas.
- Dashboard do módulo:
  - Etiquetas emitidas
  - Emitidas hoje
  - Próximas do vencimento
  - Vencidas
- Impressão das etiquetas.
