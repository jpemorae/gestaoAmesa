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


## V27 - Correção estoque inicial e etiquetas

Correção:
- Ao cadastrar Produto/Item com quantidade/peso padrão maior que zero, o sistema agora cria automaticamente uma entrada de estoque inicial.
- A quantidade aparece corretamente em Itens cadastrados.
- O módulo Etiquetas passa a enxergar estoque disponível para impressão.
- Mantida a conversão:
  - Kilo → Grama
  - Litro → Mililitro


## V28 - Etiquetas com identidade do cliente

Alteração:
- As etiquetas geradas agora exibem:
  - logo da empresa contratante;
  - nome fantasia da empresa contratante.
- Caso o cliente não tenha logo cadastrada, aparece um bloco com as iniciais.


## V29 - Governança operacional de acesso

Incluído:
- Cadastro de funcionário agora cria login operacional.
- Funcionário possui permissões por módulo:
  - Controle de estoque
  - Etiquetas
  - Checklist
- Perfil Operação:
  - vê somente módulos liberados;
  - no Checklist não vê filtros administrativos;
  - visualiza apenas atividades da sua área/setor;
  - no Kanban visualiza somente a sua área;
  - não vê Histórico nem Acompanhamento do Checklist.
- Gestor/Administrador continuam vendo filtros, histórico, dashboard e visão geral.


## V30 - Rastreabilidade por QRCode nas etiquetas

Mudança de processo:
- Gerar/imprimir etiqueta NÃO baixa mais o estoque.
- A etiqueta representa fracionamento/movimentação interna.
- Cada etiqueta possui QRCode/código único.
- A baixa no estoque acontece somente na leitura do QRCode, quando o produto é usado na produção.
- Novo status da etiqueta: Disponível, Consumido ou Descartado.
- Leitura de QRCode registra área, responsável e data/hora.


## V31 - QRCode real nas etiquetas

Correção:
- Substituído o QR visual/simulado por QRCode real.
- O QRCode agora carrega o código único da etiqueta.
- Ao ler o QRCode, o valor retornado é o código da etiqueta, usado para baixa no estoque.
- Mantido botão "Usar código" como alternativa manual.


## V32 - Layout para impressora térmica monocromática

Melhorias:
- Etiquetas otimizadas para impressoras térmicas monocromáticas.
- Layout reduzido para etiquetas pequenas.
- QRCode em alto contraste preto e branco.
- Removidas cores na impressão.
- Melhor aproveitamento de papel térmico.
- Botões ocultados automaticamente na impressão.
- Fonte ampliada para leitura operacional rápida.


## V33 - QRCode abre página de ação

Correção de processo:
- Ao ler o QRCode, o usuário vai para uma página de ação da etiqueta.
- Opções disponíveis:
  - Produção para mesa: baixa estoque e registra consumo/venda.
  - Descarte: baixa estoque e registra perda/descarte.
  - Sair: não faz nenhuma ação.
- O QRCode agora aponta para uma URL com o código da etiqueta.
- A baixa não acontece apenas por abrir o QRCode.


## V34 - Evidência fotográfica no Checklist

Incluído:
- Upload/tirar foto durante execução do checklist.
- Exigência de foto antes de finalizar atividade.
- Preview da imagem anexada.
- Opção de remover/substituir foto antes de finalizar.
- Histórico salva imagem de evidência.
- Histórico permite abrir a imagem em nova aba.
- Kanban mostra se a atividade em execução possui evidência anexada ou pendente.
- Dashboard do checklist conta atividades com evidência.


## V35 - Correção processo/atividade

Correção:
- Corrigido erro `saveProcessActivity is not defined`.
- O cadastro de Processo / Atividade voltou a salvar corretamente.
- A página não quebra mais ao abrir/criar processo ou atividade.


## V36 - Recorrência de atividades

Correção/evolução:
- Campo "Quantas vezes repete?" desbloqueado.
- Campo "Frequência" desbloqueado.
- Se o processo/atividade for configurado como "Sim" para repetição:
  - Diário: cria uma atividade para cada dia.
  - Semanal: cria uma atividade a cada 7 dias.
  - Mensal: cria uma atividade a cada 30 dias.
  - Por turno: cria múltiplas atividades no mesmo dia.
- Atividades passam a carregar data programada.
- Checklist, Kanban e lista de atividades exibem a data programada.


## V37 - Recorrência diária corrigida

Correções:
- "Quantas vezes repete?" e "Frequência" voltaram a bloquear quando "Se repete?" = Não.
- Ao selecionar "Se repete?" = Sim, os campos são liberados.
- Atividades diárias retornam automaticamente no dia seguinte após serem concluídas.
- O colaborador vê novamente a atividade no novo dia.
- Atividades semanais aparecem no mesmo dia da semana conforme a data inicial.
- Atividades mensais aparecem no mesmo dia do mês conforme a data inicial.
