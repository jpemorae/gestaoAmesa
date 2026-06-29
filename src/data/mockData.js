export const STORAGE_KEYS = {
  loggedUser: "gestao_mesa_logged_user",
  isLogged: "gestao_mesa_is_logged",
  page: "gestao_mesa_current_page"
};

export const SOLUTION_MODULES = [
  {
    id: "acompanhamento",
    title: "Dashboard",
    icon: "📊",
    description: "Indicadores operacionais da empresa."
  },
  {
    id: "estoque",
    title: "Controle de estoque",
    icon: "📦",
    description: "Entradas, saídas, saldos e validade."
  },
  {
    id: "etiquetas",
    title: "Etiquetas",
    icon: "🏷️",
    description: "Emissão, validade e impressão de etiquetas."
  },
  {
    id: "checklist",
    title: "Checklist",
    icon: "✅",
    description: "Rotinas, início, fim e histórico operacional."
  },
  {
    id: "faturamento",
    title: "Faturamento",
    icon: "$",
    description: "Clientes, cobrancas e controle de pagamentos."
  },  {
    id: "acesso",
    title: "Cadastros",
    icon: "⚙️",
    description: "Produtos, usuários, áreas e rotinas."
  }
];

export const initialClients = [
  {
    id: "cliente-divino-botequim",
    companyName: "Divino Botequim",
    fantasyName: "Divino",
    document: "",
    phone: "",
    email: "admin@divino.com",
    address: "",
    paymentMethod: "Pix",
    monthlyFee: 200,
    dueDay: "10",
    logo: "",
    enabledModules: ["acompanhamento", "estoque", "checklist", "faturamento", "etiquetas", "acesso"],
    financialStatus: "Em dia",
    themeColor: "#0b2f4f",
    status: "Ativo",
    createdAt: "Inicial"
  }
];

export const initialUsers = [
  {
    id: "admin-inicial",
    name: "Administrador da Plataforma",
    email: "admin@gestaoamesa.com",
    password: "123456",
    profile: "Administrador",
    userType: "platform",
    companyId: null,
    status: "Ativo",
    createdAt: "Inicial"
  },
  {
    id: "cliente-divino",
    name: "Administrador Divino",
    email: "admin@divino.com",
    password: "123456",
    profile: "Administrador",
    userType: "client",
    companyId: "cliente-divino-botequim",
    status: "Ativo",
    createdAt: "Inicial"
  }
];

