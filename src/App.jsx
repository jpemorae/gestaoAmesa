import React, { useMemo, useState } from "react";
import gestaoMesaLogo from "./assets/gestao-a-mesa-logo.png";

const initialClients = [
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
    enabledModules: ["estoque", "checklist", "etiquetas", "acesso"],
    status: "Ativo",
    enabledModules: ["estoque", "checklist", "etiquetas", "acesso"],
    createdAt: "Inicial"
  }
];
const initialUsers = [
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

const SOLUTION_MODULES = [
  {
    id: "estoque",
    title: "Controle de estoque",
    icon: "📦",
    description: "Produtos, quantidades, pesos e validade."
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
    id: "acesso",
    title: "Gestão de acesso",
    icon: "👥",
    description: "Funcionários, perfis, permissões e notificações."
  }
];

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function formatDate(date) {
  if (!date) return "--";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function normalizeDecimal(value) {
  if (value === undefined || value === null || value === "") return 0;
  return Number(String(value).replace(",", "."));
}

function unitLabel(unit) {
  const labels = {
    g: "Grama",
    kg: "Kilo",
    un: "Unidade",
    ml: "Mililitro",
    L: "Litro"
  };
  return labels[unit] || unit;
}

function baseUnitFor(unit) {
  if (unit === "kg" || unit === "g") return "g";
  if (unit === "L" || unit === "ml") return "ml";
  return unit || "un";
}

function compatibleUnitsFor(unit) {
  const base = baseUnitFor(unit);
  if (base === "g") return ["g", "kg"];
  if (base === "ml") return ["ml", "L"];
  return ["un"];
}

function toBaseUnit(quantity, unit) {
  const value = normalizeDecimal(quantity);
  if (unit === "kg") return { quantity: value * 1000, unit: "g" };
  if (unit === "g") return { quantity: value, unit: "g" };
  if (unit === "L") return { quantity: value * 1000, unit: "ml" };
  if (unit === "ml") return { quantity: value, unit: "ml" };
  return { quantity: value, unit };
}

function formatQuantity(value) {
  return Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

function formatStockDisplay(value, unit) {
  const number = Number(value || 0);
  if (unit === "g" && number >= 1000) {
    return `${(number / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 3 })} Kilo`;
  }
  if (unit === "ml" && number >= 1000) {
    return `${(number / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 3 })} Litro`;
  }
  return `${formatQuantity(number)} ${unitLabel(unit)}`;
}

function diffDays(date) {
  if (!date) return 999;
  const start = new Date(today() + "T00:00:00");
  const end = new Date(date + "T00:00:00");
  return Math.ceil((end - start) / 86400000);
}

function currentTimeHHMM() {
  return new Date().toTimeString().slice(0, 5);
}

function timeToMinutes(time) {
  if (!time || !time.includes(":")) return null;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function durationText(start, end) {
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);

  if (startMin === null || endMin === null) return "--";

  const total = endMin >= startMin ? endMin - startMin : (24 * 60 - startMin) + endMin;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;

  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}

function punctualityStatus(plannedStart, plannedEnd, realStart, realEnd) {
  const ps = timeToMinutes(plannedStart);
  const pe = timeToMinutes(plannedEnd);
  const rs = timeToMinutes(realStart);
  const re = timeToMinutes(realEnd);

  if (rs === null || re === null) return "Sem horário real";
  if (ps === null || pe === null) return "Sem horário previsto";

  const tolerance = 10;
  const startedOnTime = rs <= ps + tolerance;
  const finishedOnTime = re <= pe + tolerance;

  if (startedOnTime && finishedOnTime) return "Dentro do horário";
  if (!startedOnTime && !finishedOnTime) return "Iniciou e terminou fora do horário";
  if (!startedOnTime) return "Iniciou fora do horário";
  return "Terminou fora do horário";
}

function LogoGestaoMesa({ small = false }) {
  return (
    <img
      src={gestaoMesaLogo}
      alt="Gestão à Mesa"
      className={small ? "brand-logo small" : "brand-logo"}
    />
  );
}

export default function App() {
  const [isLogged, setIsLogged] = useState(false);
  const [loggedUser, setLoggedUser] = useState(null);
  const [login, setLogin] = useState({ email: "admin@gestaoamesa.com", password: "123456" });
  const [page, setPage] = useState("dashboard");

  const [clients, setClients] = useState(initialClients);
  const [editingClientId, setEditingClientId] = useState(null);
  const [showClientForm, setShowClientForm] = useState(false);

  const [users, setUsers] = useState(initialUsers);
  const [editingUserId, setEditingUserId] = useState(null);

  const emptyClientForm = {
    companyName: "",
    fantasyName: "",
    document: "",
    phone: "",
    email: "",
    address: "",
    paymentMethod: "Pix",
    monthlyFee: "",
    dueDay: "10",
    logo: ""
  };

  const emptyUserForm = {
    name: "",
    email: "",
    password: "",
    profile: "Administrador",
    status: "Ativo"
  };

  const [clientForm, setClientForm] = useState(emptyClientForm);
  const [userForm, setUserForm] = useState(emptyUserForm);

  const [stockPage, setStockPage] = useState("cadastro");
  const [stockCategories, setStockCategories] = useState([
    { id: "cat-comida", name: "Comida" },
    { id: "cat-bebida", name: "Bebida" },
    { id: "cat-limpeza", name: "Limpeza" }
  ]);
  const [stockItems, setStockItems] = useState([]);
  const [stockLots, setStockLots] = useState([]);
  const [stockSearch, setStockSearch] = useState("");
  const [stockCategoryName, setStockCategoryName] = useState("");
  const [stockAlertDays, setStockAlertDays] = useState(2);
  const [stockItemForm, setStockItemForm] = useState({
    name: "",
    type: "Produto",
    categoryId: "",
    defaultQuantity: "",
    unit: "kg",
    defaultValidityDays: 3
  });

  const [processActivityForm, setProcessActivityForm] = useState({
    name: "",
    type: "Processo",
    area: "",
    startTime: "",
    endTime: "",
    repeats: "Não",
    repeatQuantity: "",
    frequency: "Diário"
  });
  const [stockEntryForm, setStockEntryForm] = useState({
    itemId: "",
    quantity: "",
    quantityUnit: "g",
    expiryDate: ""
  });

  const [stockCadastroType, setStockCadastroType] = useState("produto");
  const [accessCadastroType, setAccessCadastroType] = useState("usuario");
  const [areaForm, setAreaForm] = useState("");
  const [areas, setAreas] = useState(["Cozinha", "Salão", "Estoque", "Bar"]);
  const [kanbanAreaFilter, setKanbanAreaFilter] = useState("Todas");
  const [stockUsers, setStockUsers] = useState([]);
  const [stockUserForm, setStockUserForm] = useState({
    name: "",
    email: "",
    password: "",
    profile: "Operação",
    sector: "",
    role: "",
    status: "Ativo",
    telegramEnabled: false,
    telegramUsername: "",
    telegramChatId: "",
    telegramPhone: ""
  });

  const [checklistPage, setChecklistPage] = useState("executar");
  const [runningChecklist, setRunningChecklist] = useState({});
  const [checklistHistory, setChecklistHistory] = useState([]);
  const [checklistAreaFilter, setChecklistAreaFilter] = useState("Todas");
  const [checklistExecutor, setChecklistExecutor] = useState("");

  const monthlyRevenue = useMemo(
    () => clients.reduce((sum, client) => sum + Number(client.monthlyFee || 0), 0),
    [clients]
  );

  function handleLogin(event) {
    event.preventDefault();

    const user = users.find(
      (item) =>
        item.email.toLowerCase() === login.email.trim().toLowerCase() &&
        item.password === login.password &&
        item.status === "Ativo"
    );

    if (!user) {
      alert("Usuário ou senha inválidos, ou usuário inativo.");
      return;
    }

    setLoggedUser(user);
    setIsLogged(true);
    setPage(user.userType === "client" ? "hub" : "dashboard");
  }

  function handleLogoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setClientForm({ ...clientForm, logo: reader.result });
    };
    reader.readAsDataURL(file);
  }

  function resetClientForm() {
    setClientForm(emptyClientForm);
    setEditingClientId(null);
    setShowClientForm(false);
  }

  function openNewClientForm() {
    setClientForm(emptyClientForm);
    setEditingClientId(null);
    setShowClientForm(true);
  }

  function saveClient(event) {
    event.preventDefault();

    if (!clientForm.companyName.trim()) {
      alert("Informe o nome da empresa contratante.");
      return;
    }

    if (editingClientId) {
      setClients(
        clients.map((client) =>
          client.id === editingClientId
            ? {
                ...client,
                ...clientForm,
                companyName: clientForm.companyName.trim(),
                fantasyName: clientForm.fantasyName.trim() || clientForm.companyName.trim(),
                monthlyFee: Number(clientForm.monthlyFee || 0)
              }
            : client
        )
      );
      resetClientForm();
      setPage("clients");
      return;
    }

    const newClient = {
      id: crypto.randomUUID(),
      ...clientForm,
      companyName: clientForm.companyName.trim(),
      fantasyName: clientForm.fantasyName.trim() || clientForm.companyName.trim(),
      monthlyFee: Number(clientForm.monthlyFee || 0),
      createdAt: new Date().toLocaleDateString("pt-BR"),
      status: "Ativo"
    };

    setClients([newClient, ...clients]);
    resetClientForm();
    setPage("clients");
  }

  function editClient(client) {
    setEditingClientId(client.id);
    setShowClientForm(true);
    setClientForm({
      companyName: client.companyName || "",
      fantasyName: client.fantasyName || "",
      document: client.document || "",
      phone: client.phone || "",
      email: client.email || "",
      address: client.address || "",
      paymentMethod: client.paymentMethod || "Pix",
      monthlyFee: client.monthlyFee || "",
      dueDay: client.dueDay || "10",
      logo: client.logo || "",
      enabledModules: client.enabledModules || ["estoque", "checklist", "etiquetas"]
    });
    setPage("clients");
  }

  function deleteClient(clientId) {
    if (!confirm("Deseja excluir este cliente?")) return;
    setClients(clients.filter((client) => client.id !== clientId));
  }

  function saveUser(event) {
    event.preventDefault();

    if (!userForm.name.trim()) {
      alert("Informe o nome do usuário.");
      return;
    }

    if (!userForm.email.trim()) {
      alert("Informe o e-mail do usuário.");
      return;
    }

    if (!userForm.password.trim()) {
      alert("Informe a senha do usuário.");
      return;
    }

    const emailAlreadyExists = users.some(
      (user) => user.email.toLowerCase() === userForm.email.toLowerCase() && user.id !== editingUserId
    );

    if (emailAlreadyExists) {
      alert("Já existe um usuário com este e-mail.");
      return;
    }

    if (editingUserId) {
      setUsers(users.map((user) => (user.id === editingUserId ? { ...user, ...userForm } : user)));

      if (loggedUser?.id === editingUserId) {
        setLoggedUser({ ...loggedUser, ...userForm });
      }

      setEditingUserId(null);
      setUserForm(emptyUserForm);
      return;
    }

    setUsers([
      {
        id: crypto.randomUUID(),
        ...userForm,
        createdAt: new Date().toLocaleDateString("pt-BR")
      },
      ...users
    ]);

    setUserForm(emptyUserForm);
  }

  function editUser(user) {
    setEditingUserId(user.id);
    setUserForm({
      name: user.name,
      email: user.email,
      password: user.password,
      profile: user.profile,
      status: user.status
    });
  }

  function deleteUser(userId) {
    if (loggedUser?.id === userId) {
      alert("Você não pode excluir o usuário que está logado.");
      return;
    }

    if (!confirm("Deseja excluir este usuário?")) return;
    setUsers(users.filter((user) => user.id !== userId));
  }

  function logout() {
    setIsLogged(false);
    setLoggedUser(null);
    setLogin({ email: "", password: "" });
  }


  const stockItemsView = useMemo(() => {
    return stockItems.map((item) => {
      const category = item.category || stockCategories.find((cat) => cat.id === item.categoryId)?.name || "Sem categoria";
      const stockUnit = baseUnitFor(item.unit);
      const totalStock = stockLots
        .filter((lot) => lot.itemId === item.id)
        .reduce((sum, lot) => sum + Number(lot.quantity || 0), 0);

      return { ...item, category, stockUnit, totalStock };
    });
  }, [stockItems, stockCategories, stockLots]);

  const filteredStockItems = useMemo(() => {
    const query = stockSearch.trim().toLowerCase();
    return stockItemsView.filter((item) => `${item.name} ${item.category} ${item.type}`.toLowerCase().includes(query));
  }, [stockItemsView, stockSearch]);

  function addStockCategory(event) {
    event.preventDefault();
    const name = stockCategoryName.trim();
    if (!name) return alert("Informe o nome da categoria.");
    if (stockCategories.some((category) => category.name.toLowerCase() === name.toLowerCase())) {
      return alert("Categoria já cadastrada.");
    }
    setStockCategories([...stockCategories, { id: crypto.randomUUID(), name }]);
    setStockCategoryName("");
  }

  function deleteStockCategory(categoryId) {
    if (stockItems.some((item) => item.categoryId === categoryId)) {
      alert("Não é possível excluir categoria vinculada a cadastro.");
      return;
    }
    setStockCategories(stockCategories.filter((category) => category.id !== categoryId));
  }

  function saveStockItem(event) {
    event.preventDefault();

    if (!stockItemForm.name.trim()) return alert("Informe o nome.");
    if (!stockItemForm.categoryId) return alert("Selecione uma categoria.");

    setStockItems([
      {
        id: crypto.randomUUID(),
        ...stockItemForm,
        name: stockItemForm.name.trim(),
        defaultQuantity: normalizeDecimal(stockItemForm.defaultQuantity),
        defaultValidityDays: Number(stockItemForm.defaultValidityDays || 0)
      },
      ...stockItems
    ]);

    setStockItemForm({
      name: "",
      type: stockItemForm.type,
      categoryId: stockItemForm.categoryId,
      defaultQuantity: "",
      unit: "kg",
      defaultValidityDays: 3
    });
  }

  function saveProcessActivity(event) {
    event.preventDefault();

    if (!processActivityForm.name.trim()) {
      alert("Informe o nome do processo ou atividade.");
      return;
    }

    if (!processActivityForm.area.trim()) {
      alert("Informe a área referente.");
      return;
    }

    setStockItems([
      {
        id: crypto.randomUUID(),
        name: processActivityForm.name.trim(),
        type: processActivityForm.type,
        categoryId: "",
        category: "Processos e atividades",
        defaultQuantity: 0,
        unit: "un",
        defaultValidityDays: 0,
        area: processActivityForm.area.trim(),
        startTime: processActivityForm.startTime,
        endTime: processActivityForm.endTime,
        repeats: processActivityForm.repeats,
        repeatQuantity: processActivityForm.repeatQuantity,
        frequency: processActivityForm.frequency
      },
      ...stockItems
    ]);

    setProcessActivityForm({
      name: "",
      type: processActivityForm.type,
      area: "",
      startTime: "",
      endTime: "",
      repeats: "Não",
      repeatQuantity: "",
      frequency: "Diário"
    });
  }

  function saveStockEntry(event) {
    event.preventDefault();

    if (!stockEntryForm.itemId) return alert("Selecione um item.");
    if (!stockEntryForm.quantity || normalizeDecimal(stockEntryForm.quantity) <= 0) {
      return alert("Informe uma quantidade maior que zero.");
    }
    if (!stockEntryForm.expiryDate) return alert("Informe a validade.");

    const item = stockItemsView.find((currentItem) => currentItem.id === stockEntryForm.itemId);
    const converted = toBaseUnit(stockEntryForm.quantity, stockEntryForm.quantityUnit);

    if (!item || converted.unit !== item.stockUnit) {
      alert("Unidade incompatível com o item selecionado.");
      return;
    }

    setStockLots([
      {
        id: crypto.randomUUID(),
        itemId: stockEntryForm.itemId,
        quantity: converted.quantity,
        initialQuantity: converted.quantity,
        unit: converted.unit,
        inputQuantity: normalizeDecimal(stockEntryForm.quantity),
        inputUnit: stockEntryForm.quantityUnit,
        expiryDate: stockEntryForm.expiryDate,
        createdAt: new Date().toLocaleString("pt-BR")
      },
      ...stockLots
    ]);

    setStockEntryForm({ itemId: "", quantity: "", quantityUnit: "g", expiryDate: "" });
  }

  function deleteStockLot(lotId) {
    if (!confirm("Deseja excluir este lançamento de estoque?")) return;
    setStockLots(stockLots.filter((lot) => lot.id !== lotId));
  }


  function saveStockUser(event) {
    event.preventDefault();

    if (!stockUserForm.name.trim()) return alert("Informe o nome do usuário.");
    if (!stockUserForm.email.trim()) return alert("Informe o e-mail do usuário.");
    if (!stockUserForm.password.trim()) return alert("Informe a senha do usuário.");
    if (!stockUserForm.sector.trim()) return alert("Informe o setor.");
    if (!stockUserForm.role.trim()) return alert("Informe o cargo.");

    if (stockUserForm.telegramEnabled && !stockUserForm.telegramChatId.trim()) {
      return alert("Informe o Chat ID do Telegram para ativar notificações.");
    }

    const emailExists = stockUsers.some((user) => user.email.toLowerCase() === stockUserForm.email.toLowerCase());
    if (emailExists) return alert("Já existe um usuário com este e-mail.");

    setStockUsers([
      {
        id: crypto.randomUUID(),
        ...stockUserForm,
        createdAt: new Date().toLocaleDateString("pt-BR")
      },
      ...stockUsers
    ]);

    setStockUserForm({
      name: "",
      email: "",
      password: "",
      profile: "Operação",
      sector: "",
      role: "",
      status: "Ativo",
      telegramEnabled: false,
      telegramUsername: "",
      telegramChatId: "",
      telegramPhone: ""
    });
  }

  function deleteStockUser(userId) {
    if (!confirm("Deseja excluir este usuário?")) return;
    setStockUsers(stockUsers.filter((user) => user.id !== userId));
  }

  function testTelegramUser(user) {
    if (!user.telegramEnabled || !user.telegramChatId) {
      alert("Este usuário não está configurado para receber notificações no Telegram.");
      return;
    }

    alert(
      `Teste de notificação preparado para ${user.name}\n\n` +
      `Telegram: ${user.telegramUsername || "Não informado"}\n` +
      `Chat ID: ${user.telegramChatId}\n\n` +
      `Na próxima etapa, conectamos isso ao bot real do Telegram.`
    );
  }

  const checklistActivities = stockItems.filter((item) => item.type === "Processo" || item.type === "Atividade");
  const completedTodayIds = new Set(checklistHistory.filter((record) => record.date === today()).map((record) => record.activityId));
  const checklistAreas = ["Todas", ...Array.from(new Set(checklistActivities.map((activity) => activity.area).filter(Boolean)))];
  const filteredChecklistActivities = checklistActivities.filter((activity) =>
    checklistAreaFilter === "Todas" || activity.area === checklistAreaFilter
  );

  function startChecklistActivity(activity) {
    if (completedTodayIds.has(activity.id)) return;
    if (runningChecklist[activity.id]) return alert("Esta atividade já foi iniciada.");

    setRunningChecklist({
      ...runningChecklist,
      [activity.id]: {
        activityId: activity.id,
        startedAt: currentTimeHHMM(),
        startedAtFull: new Date().toLocaleString("pt-BR"),
        executor: checklistExecutor || "Não informado"
      }
    });
  }

  function finishChecklistActivity(activity) {
    const running = runningChecklist[activity.id];

    if (!running) {
      alert("Clique em iniciar antes de finalizar.");
      return;
    }

    const realStart = running.startedAt;
    const realEnd = currentTimeHHMM();

    const record = {
      id: crypto.randomUUID(),
      activityId: activity.id,
      title: activity.name,
      type: activity.type,
      area: activity.area || "--",
      executor: running.executor || checklistExecutor || "Não informado",
      plannedStart: activity.startTime || "",
      plannedEnd: activity.endTime || "",
      realStart,
      realEnd,
      executionTime: durationText(realStart, realEnd),
      punctuality: punctualityStatus(activity.startTime, activity.endTime, realStart, realEnd),
      date: today(),
      completedAt: new Date().toLocaleString("pt-BR")
    };

    const nextRunning = { ...runningChecklist };
    delete nextRunning[activity.id];

    setRunningChecklist(nextRunning);
    setChecklistHistory([record, ...checklistHistory]);
  }


  function deleteChecklistActivity(activityId) {
    if (!confirm("Deseja excluir esta atividade do checklist?")) return;
    setStockItems(stockItems.filter((item) => item.id !== activityId));
    setChecklistHistory(checklistHistory.filter((record) => record.activityId !== activityId));

    const nextRunning = { ...runningChecklist };
    delete nextRunning[activityId];
    setRunningChecklist(nextRunning);
  }

  function renderChecklistCadastro() {
    return (
      <section className="module-content checklist-wide">
        <h2>Cadastrar atividade do checklist</h2>
        <p className="stock-help">Cadastre processos ou atividades operacionais com horário, repetição, frequência e área.</p>

        <form className="stock-form-grid" onSubmit={saveProcessActivity}>
          <label>
            Tipo
            <select
              value={processActivityForm.type}
              onChange={(event) => setProcessActivityForm({ ...processActivityForm, type: event.target.value })}
            >
              <option>Processo</option>
              <option>Atividade</option>
            </select>
          </label>

          <label>
            Processo / Atividade
            <input
              value={processActivityForm.name}
              onChange={(event) => setProcessActivityForm({ ...processActivityForm, name: event.target.value })}
              placeholder="Ex: Limpeza da cozinha, Conferência de freezer"
            />
          </label>

          <label>
            Área referente
            <input
              value={processActivityForm.area}
              onChange={(event) => setProcessActivityForm({ ...processActivityForm, area: event.target.value })}
              placeholder="Ex: Cozinha, Salão, Estoque, Bar"
            />
          </label>

          <label>
            Hora início
            <input
              type="time"
              value={processActivityForm.startTime}
              onChange={(event) => setProcessActivityForm({ ...processActivityForm, startTime: event.target.value })}
            />
          </label>

          <label>
            Hora fim
            <input
              type="time"
              value={processActivityForm.endTime}
              onChange={(event) => setProcessActivityForm({ ...processActivityForm, endTime: event.target.value })}
            />
          </label>

          <label>
            Se repete?
            <select
              value={processActivityForm.repeats}
              onChange={(event) => setProcessActivityForm({ ...processActivityForm, repeats: event.target.value })}
            >
              <option>Não</option>
              <option>Sim</option>
            </select>
          </label>

          <label>
            Quantas vezes repete?
            <input
              type="number"
              min="0"
              value={processActivityForm.repeatQuantity}
              onChange={(event) => setProcessActivityForm({ ...processActivityForm, repeatQuantity: event.target.value })}
              placeholder="Ex: 3"
              disabled={processActivityForm.repeats === "Não"}
            />
          </label>

          <label>
            Frequência
            <select
              value={processActivityForm.frequency}
              onChange={(event) => setProcessActivityForm({ ...processActivityForm, frequency: event.target.value })}
              disabled={processActivityForm.repeats === "Não"}
            >
              <option>Diário</option>
              <option>Semanal</option>
              <option>Mensal</option>
              <option>Por turno</option>
            </select>
          </label>

          <button className="primary" type="submit">Cadastrar atividade</button>
        </form>
      </section>
    );
  }

  function renderCadastroSelector() {
    const options = [
      { id: "produto", title: "Produto / Item", icon: "📦", description: "Cadastre itens com controle de quantidade, unidade e validade." }
    ];

    return (
      <div className="cadastro-selector">
        {options.map((option) => (
          <button
            key={option.id}
            className={stockCadastroType === option.id ? "cadastro-card active" : "cadastro-card"}
            onClick={() => setStockCadastroType(option.id)}
            type="button"
          >
            <span>{option.icon}</span>
            <strong>{option.title}</strong>
            <small>{option.description}</small>
          </button>
        ))}
      </div>
    );
  }

  function renderStockCadastro() {
    return (
      <>
        <section className="module-content stock-wide">
          <h2>Cadastro</h2>
          <p className="stock-help">Cadastre produtos e itens que terão controle de quantidade, unidade e validade.</p>
          {renderCadastroSelector()}
        </section>

        {stockCadastroType === "produto" && (
          <section className="module-content stock-wide">
            <h2>Cadastrar produto ou item</h2>
            <p className="stock-help">Use este cadastro para tudo que terá controle de quantidade, peso, unidade e validade.</p>

            <form className="stock-form-grid" onSubmit={saveStockItem}>
              <label>
                Tipo de cadastro
                <select
                  value={stockItemForm.type}
                  onChange={(event) => setStockItemForm({ ...stockItemForm, type: event.target.value })}
                >
                  <option>Produto</option>
                  <option>Item</option>
                </select>
              </label>

              <label>
                Nome
                <input
                  value={stockItemForm.name}
                  onChange={(event) => setStockItemForm({ ...stockItemForm, name: event.target.value })}
                  placeholder="Ex: Carne, Arroz, Etiqueta térmica"
                />
              </label>

              <label>
                Categoria
                <select
                  value={stockItemForm.categoryId}
                  onChange={(event) => setStockItemForm({ ...stockItemForm, categoryId: event.target.value })}
                >
                  <option value="">Selecione</option>
                  {stockCategories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>

              <label>
                Quantidade / peso padrão
                <input
                  type="number"
                  step="0.001"
                  value={stockItemForm.defaultQuantity}
                  onChange={(event) => setStockItemForm({ ...stockItemForm, defaultQuantity: event.target.value })}
                  placeholder="Ex: 1"
                />
              </label>

              <div className="unit-picker-stock">
                <span>Unidade padrão</span>
                <div className="unit-buttons-stock">
                  {["g", "kg", "un", "ml", "L"].map((unit) => (
                    <button
                      type="button"
                      key={unit}
                      className={stockItemForm.unit === unit ? "unit-btn-stock active" : "unit-btn-stock"}
                      onClick={() => setStockItemForm({ ...stockItemForm, unit })}
                    >
                      {unitLabel(unit)}
                    </button>
                  ))}
                </div>
              </div>

              <label>
                Validade padrão em dias
                <input
                  type="number"
                  value={stockItemForm.defaultValidityDays}
                  onChange={(event) => setStockItemForm({ ...stockItemForm, defaultValidityDays: event.target.value })}
                />
              </label>

              <button className="primary" type="submit">Cadastrar produto/item</button>
            </form>

            <div className="category-mini-box">
              <strong>Categorias</strong>
              <form className="stock-inline-form" onSubmit={addStockCategory}>
                <input
                  value={stockCategoryName}
                  onChange={(event) => setStockCategoryName(event.target.value)}
                  placeholder="Criar categoria. Ex: Comida, Bebida, Limpeza"
                />
                <button className="primary" type="submit">Criar categoria</button>
              </form>

              <div className="stock-chip-list">
                {stockCategories.map((category) => (
                  <span className="stock-chip" key={category.id}>
                    {category.name}
                    <button type="button" onClick={() => deleteStockCategory(category.id)}>×</button>
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}


      </>
    );
  }

  function renderStockItens() {
    return (
      <section className="module-content stock-wide">
        <div className="stock-title-row">
          <div>
            <h2>Itens cadastrados</h2>
            <p className="stock-help">Extrato de tudo que foi cadastrado: produto, item, processo e atividade.</p>
          </div>
          <input
            value={stockSearch}
            onChange={(event) => setStockSearch(event.target.value)}
            placeholder="Filtrar cadastro..."
          />
        </div>

        {filteredStockItems.length === 0 ? (
          <div className="module-placeholder">
            <strong>Nenhum cadastro encontrado</strong>
            <p>Use o menu Cadastro para criar produtos, itens, processos ou atividades.</p>
          </div>
        ) : (
          <div className="stock-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Nome</th>
                  <th>Categoria/Área</th>
                  <th>Padrão/Horário</th>
                  <th>Unidade/Frequência</th>
                  <th>Estoque atual/Repetição</th>
                </tr>
              </thead>
              <tbody>
                {filteredStockItems.map((item) => (
                  <tr key={item.id} className={item.totalStock <= 0 ? "stock-zero-row" : ""}>
                    <td><span className="stock-type-badge">{item.type || "Produto"}</span></td>
                    <td><strong>{item.name}</strong></td>
                    <td>{item.area || item.category}</td>
                    <td>
                      {item.type === "Processo" || item.type === "Atividade"
                        ? `${item.startTime || "--"} às ${item.endTime || "--"}`
                        : item.defaultQuantity ? `${formatQuantity(item.defaultQuantity)} ${unitLabel(item.unit)}` : "--"}
                    </td>
                    <td>{item.frequency || unitLabel(item.stockUnit)}</td>
                    <td>
                      {item.type === "Processo" || item.type === "Atividade"
                        ? item.repeats === "Sim" ? `${item.repeatQuantity || 0} vez(es)` : "Não repete"
                        : <strong>{formatStockDisplay(item.totalStock, item.stockUnit)}</strong>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  function renderStockLancamento() {
    return (
      <section className="module-content stock-wide">
        <h2>Lançamento de estoque</h2>
        <p className="stock-help">Registre a entrada dos itens em estoque.</p>

        <form className="stock-form-grid" onSubmit={saveStockEntry}>
          <label>
            Item
            <select
              value={stockEntryForm.itemId}
              onChange={(event) => {
                const selectedItem = stockItemsView.find((item) => item.id === event.target.value);
                const firstUnit = compatibleUnitsFor(selectedItem?.unit || "g")[0];
                setStockEntryForm({ ...stockEntryForm, itemId: event.target.value, quantityUnit: firstUnit });
              }}
            >
              <option value="">Selecione</option>
              {stockItemsView.map((item) => (
                <option key={item.id} value={item.id}>{item.name} - {item.category}</option>
              ))}
            </select>
          </label>

          <label>
            Quantidade ou peso
            <input
              type="number"
              step="0.001"
              value={stockEntryForm.quantity}
              onChange={(event) => setStockEntryForm({ ...stockEntryForm, quantity: event.target.value })}
              placeholder="Ex: 10"
            />
          </label>

          <div className="unit-picker-stock">
            <span>Unidade do estoque</span>
            <div className="unit-buttons-stock">
              {compatibleUnitsFor(stockItemsView.find((item) => item.id === stockEntryForm.itemId)?.unit || "g").map((unit) => (
                <button
                  type="button"
                  key={unit}
                  className={stockEntryForm.quantityUnit === unit ? "unit-btn-stock active" : "unit-btn-stock"}
                  onClick={() => setStockEntryForm({ ...stockEntryForm, quantityUnit: unit })}
                >
                  {unitLabel(unit)}
                </button>
              ))}
            </div>
          </div>

          <label>
            Validade
            <input
              type="date"
              value={stockEntryForm.expiryDate}
              onChange={(event) => setStockEntryForm({ ...stockEntryForm, expiryDate: event.target.value })}
            />
          </label>

          <button className="primary" type="submit">Registrar entrada</button>
        </form>
      </section>
    );
  }

  function renderStockEstoque() {
    return (
      <section className="module-content stock-wide">
        <div className="stock-title-row">
          <div>
            <h2>Estoque</h2>
            <p className="stock-help">Extrato dos itens de estoque e seus vencimentos.</p>
          </div>
          <label className="stock-alert-label">
            Alerta de vencimento em até
            <input
              type="number"
              value={stockAlertDays}
              onChange={(event) => setStockAlertDays(Number(event.target.value || 0))}
            />
            dias
          </label>
        </div>

        {stockLots.length === 0 ? (
          <div className="module-placeholder">
            <strong>Nenhuma entrada registrada</strong>
            <p>Registre uma entrada de estoque para acompanhar validade e quantidade.</p>
          </div>
        ) : (
          <div className="stock-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantidade atual</th>
                  <th>Quantidade inicial</th>
                  <th>Entrada original</th>
                  <th>Validade</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {stockLots.map((lot) => {
                  const item = stockItemsView.find((currentItem) => currentItem.id === lot.itemId);
                  const days = diffDays(lot.expiryDate);

                  return (
                    <tr key={lot.id} className={days < 0 ? "stock-expired-row" : days <= stockAlertDays ? "stock-warning-row" : ""}>
                      <td><strong>{item?.name || "--"}</strong></td>
                      <td>{formatStockDisplay(lot.quantity, lot.unit)}</td>
                      <td>{formatStockDisplay(lot.initialQuantity, lot.unit)}</td>
                      <td>{formatQuantity(lot.inputQuantity)} {unitLabel(lot.inputUnit)}</td>
                      <td>{formatDate(lot.expiryDate)}</td>
                      <td>{days < 0 ? "Vencido" : days <= stockAlertDays ? `Vence em ${days} dia(s)` : "OK"}</td>
                      <td><button className="danger" onClick={() => deleteStockLot(lot.id)}>Excluir</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }


  function MiniDashCard({ title, value, detail, warning = false, danger = false }) {
    return (
      <div className={danger ? "acomp-card danger-card" : warning ? "acomp-card warning" : "acomp-card"}>
        <span>{title}</span>
        <strong>{value}</strong>
        {detail && <small>{detail}</small>}
      </div>
    );
  }

  function renderAcompanhamentoEstoque() {
    const totalItens = stockItems.length;
    const produtosItens = stockItems.filter((item) => item.type === "Produto" || item.type === "Item").length;
    const processosAtividades = stockItems.filter((item) => item.type === "Processo" || item.type === "Atividade").length;
    const totalEstoque = stockLots.reduce((sum, lot) => sum + Number(lot.quantity || 0), 0);
    const vencidos = stockLots.filter((lot) => diffDays(lot.expiryDate) < 0).length;
    const proximos = stockLots.filter((lot) => {
      const days = diffDays(lot.expiryDate);
      return days >= 0 && days <= stockAlertDays;
    }).length;

    return (
      <section className="module-content stock-wide">
        <h2>Acompanhamento do estoque</h2>
        <p className="stock-help">Dashboard com indicadores operacionais do módulo de controle de estoque.</p>

        <div className="acomp-grid">
          <MiniDashCard title="Cadastros totais" value={totalItens} detail="Produtos, itens, processos e atividades" />
          <MiniDashCard title="Produtos / Itens" value={produtosItens} detail="Com controle de estoque" />
          <MiniDashCard title="Processos / Atividades" value={processosAtividades} detail="Base para checklist" />
          <MiniDashCard title="Lançamentos" value={stockLots.length} detail="Entradas registradas" />
          <MiniDashCard title="Total em estoque" value={formatQuantity(totalEstoque)} detail="Soma em unidade base" />
          <MiniDashCard title="Próx. vencimento" value={proximos} detail={`Até ${stockAlertDays} dia(s)`} warning />
          <MiniDashCard title="Vencidos" value={vencidos} detail="Lotes vencidos" danger />
          <MiniDashCard title="Categorias" value={stockCategories.length} detail="Categorias cadastradas" />
        </div>
      </section>
    );
  }

  function renderAcompanhamentoChecklist() {
    const total = checklistActivities.length;
    const concluidas = checklistHistory.filter((record) => record.date === today()).length;
    const andamento = Object.keys(runningChecklist).length;
    const pendentes = Math.max(total - concluidas, 0);
    const historicoTotal = checklistHistory.length;

    return (
      <section className="module-content checklist-wide">
        <h2>Acompanhamento do checklist</h2>
        <p className="stock-help">Dashboard com indicadores operacionais de execução das atividades.</p>

        <div className="acomp-grid">
          <MiniDashCard title="Atividades" value={total} detail="Processos/atividades cadastrados" />
          <MiniDashCard title="Concluídas hoje" value={concluidas} detail="Finalizadas no dia" />
          <MiniDashCard title="Em andamento" value={andamento} detail="Iniciadas e não finalizadas" warning={andamento > 0} />
          <MiniDashCard title="Pendentes hoje" value={pendentes} detail="Ainda não concluídas" danger={pendentes > 0} />
          <MiniDashCard title="Histórico total" value={historicoTotal} detail="Execuções registradas" />
          <MiniDashCard title="Usuários cadastrados" value={stockUsers.length} detail="Operação, setor, cargo e Telegram" />
          <MiniDashCard title="Telegram ativo" value={stockUsers.filter((user) => user.telegramEnabled).length} detail="Usuários aptos a receber alerta" />
        </div>
      </section>
    );
  }

  function renderStockModule() {
    return (
      <section className="stock-workspace">
        <aside className="stock-sidebar">
          <button className={stockPage === "cadastro" ? "stock-nav active" : "stock-nav"} onClick={() => setStockPage("cadastro")}>Cadastro</button>
          <button className={stockPage === "itens" ? "stock-nav active" : "stock-nav"} onClick={() => setStockPage("itens")}>Itens cadastrados</button>
          <button className={stockPage === "lancamento" ? "stock-nav active" : "stock-nav"} onClick={() => setStockPage("lancamento")}>Lançamento de estoque</button>
          <button className={stockPage === "estoque" ? "stock-nav active" : "stock-nav"} onClick={() => setStockPage("estoque")}>Estoque</button>
          <button className={stockPage === "acompanhamento" ? "stock-nav active" : "stock-nav"} onClick={() => setStockPage("acompanhamento")}>Acompanhamento (dashboard)</button>
        </aside>

        <main className="stock-main">
          {stockPage === "cadastro" && renderStockCadastro()}
          {stockPage === "itens" && renderStockItens()}
          {stockPage === "lancamento" && renderStockLancamento()}
          {stockPage === "estoque" && renderStockEstoque()}
          {stockPage === "acompanhamento" && renderAcompanhamentoEstoque()}
        </main>
      </section>
    );
  }


  function renderChecklistAtividades() {
    return (
      <section className="module-content checklist-wide">
        <h2>Atividades do checklist</h2>
        <p className="stock-help">As atividades vêm do cadastro de Processo/Atividade feito no módulo Controle de estoque.</p>

        {checklistActivities.length === 0 ? (
          <div className="module-placeholder">
            <strong>Nenhuma atividade cadastrada</strong>
            <p>Volte ao Controle de estoque → Cadastro → Processo/Atividade para criar atividades.</p>
          </div>
        ) : (
          <div className="stock-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Atividade</th>
                  <th>Área</th>
                  <th>Horário previsto</th>
                  <th>Repete</th>
                  <th>Frequência</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {checklistActivities.map((activity) => (
                  <tr key={activity.id}>
                    <td><span className="stock-type-badge">{activity.type}</span></td>
                    <td><strong>{activity.name}</strong></td>
                    <td>{activity.area || "--"}</td>
                    <td>{activity.startTime || "--"} às {activity.endTime || "--"}</td>
                    <td>{activity.repeats === "Sim" ? `${activity.repeatQuantity || 0} vez(es)` : "Não"}</td>
                    <td>{activity.frequency || "--"}</td>
                    <td><button className="danger" onClick={() => deleteChecklistActivity(activity.id)}>Excluir</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  function renderChecklistExecucao() {
    return (
      <section className="module-content checklist-wide">
        <h2>Executar checklist</h2>
        <p className="stock-help">Clique em iniciar quando começar e finalizar quando concluir. O sistema registra o horário do dispositivo.</p>

        <div className="checklist-control-bar">
          <label>
            Área
            <select value={checklistAreaFilter} onChange={(event) => setChecklistAreaFilter(event.target.value)}>
              {checklistAreas.map((area) => <option key={area}>{area}</option>)}
            </select>
          </label>

          <label>
            Responsável pela execução
            <select value={checklistExecutor} onChange={(event) => setChecklistExecutor(event.target.value)}>
              <option value="">Selecionar responsável</option>
              {stockUsers.filter((user) => user.status === "Ativo").map((user) => (
                <option key={user.id} value={user.name}>{user.name} - {user.sector}</option>
              ))}
            </select>
          </label>
        </div>

        {checklistActivities.length === 0 ? (
          <div className="module-placeholder">
            <strong>Nenhuma atividade para executar</strong>
            <p>Cadastre um processo ou atividade para que ela apareça aqui.</p>
          </div>
        ) : (
          <div className="checklist-card-list">
            {filteredChecklistActivities.map((activity) => {
              const running = runningChecklist[activity.id];
              const done = completedTodayIds.has(activity.id);

              return (
                <article className={done ? "checklist-card done" : running ? "checklist-card running" : "checklist-card"} key={activity.id}>
                  <div className="checklist-card-info">
                    <strong>{activity.name}</strong>
                    <small>{activity.type} • Área: {activity.area || "--"} • Previsto: {activity.startTime || "--"} às {activity.endTime || "--"}</small>

                    <div className="checklist-time-grid">
                      <div>
                        <span>Início real</span>
                        <b>{running?.startedAt || "--"}</b>
                      </div>
                      <div>
                        <span>Status</span>
                        <b>{running ? punctualityStatus(activity.startTime, activity.endTime, running.startedAt, currentTimeHHMM()) : done ? "Concluído hoje" : "Aguardando"}</b>
                      </div>
                      <div>
                        <span>Tempo</span>
                        <b>{running ? durationText(running.startedAt, currentTimeHHMM()) : "--"}</b>
                      </div>
                    </div>
                  </div>

                  <div className="checklist-actions">
                    {done ? (
                      <button className="done-button" disabled>Concluído</button>
                    ) : running ? (
                      <button className="finish-button" onClick={() => finishChecklistActivity(activity)}>Finalizar</button>
                    ) : (
                      <button className="primary" onClick={() => startChecklistActivity(activity)}>Iniciar</button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  function renderChecklistHistorico() {
    return (
      <section className="module-content checklist-wide">
        <h2>Histórico do checklist</h2>

        {checklistHistory.length === 0 ? (
          <div className="module-placeholder">
            <strong>Nenhuma execução registrada</strong>
            <p>As conclusões do checklist aparecerão aqui.</p>
          </div>
        ) : (
          <div className="stock-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Atividade</th>
                  <th>Área</th>
                  <th>Responsável</th>
                  <th>Data</th>
                  <th>Previsto</th>
                  <th>Realizado</th>
                  <th>Tempo</th>
                  <th>Pontualidade</th>
                  <th>Concluído em</th>
                </tr>
              </thead>
              <tbody>
                {checklistHistory.map((record) => (
                  <tr key={record.id}>
                    <td><strong>{record.title}</strong></td>
                    <td>{record.area}</td>
                    <td>{record.executor || "--"}</td>
                    <td>{formatDate(record.date)}</td>
                    <td>{record.plannedStart || "--"} às {record.plannedEnd || "--"}</td>
                    <td>{record.realStart || "--"} às {record.realEnd || "--"}</td>
                    <td>{record.executionTime}</td>
                    <td>{record.punctuality}</td>
                    <td>{record.completedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  function renderChecklistModule() {
    return (
      <section className="stock-workspace checklist-workspace">
        <aside className="stock-sidebar">
          <button className={checklistPage === "executar" ? "stock-nav active" : "stock-nav"} onClick={() => setChecklistPage("executar")}>Executar checklist</button>
          <button className={checklistPage === "kanban" ? "stock-nav active" : "stock-nav"} onClick={() => setChecklistPage("kanban")}>Kanban</button>
          <button className={checklistPage === "atividades" ? "stock-nav active" : "stock-nav"} onClick={() => setChecklistPage("atividades")}>Atividades</button>
          <button className={checklistPage === "historico" ? "stock-nav active" : "stock-nav"} onClick={() => setChecklistPage("historico")}>Histórico</button>
          <button className={checklistPage === "acompanhamento" ? "stock-nav active" : "stock-nav"} onClick={() => setChecklistPage("acompanhamento")}>Acompanhamento (dashboard)</button>
        </aside>

        <main className="stock-main">
          {checklistPage === "executar" && renderChecklistExecucao()}
          {checklistPage === "kanban" && renderKanbanModule()}
          {checklistPage === "atividades" && renderChecklistAtividades()}
          {checklistPage === "historico" && renderChecklistHistorico()}
          {checklistPage === "acompanhamento" && renderAcompanhamentoChecklist()}
        </main>
      </section>
    );
  }


  function toggleClientModule(moduleId) {
    const current = clientForm.enabledModules || [];
    const next = current.includes(moduleId)
      ? current.filter((id) => id !== moduleId)
      : [...current, moduleId];

    setClientForm({ ...clientForm, enabledModules: next });
  }

  function getCurrentClient() {
    if (loggedUser?.userType === "client") {
      return clients.find((client) => client.id === loggedUser.companyId) || clients[0] || null;
    }

    return clients[0] || null;
  }

  function getAllowedModules() {
    const currentClient = getCurrentClient();
    if (!currentClient) return SOLUTION_MODULES;
    return SOLUTION_MODULES.filter((module) => (currentClient.enabledModules || []).includes(module.id));
  }

  function canAccessModule(moduleId) {
    if (loggedUser?.userType === "platform") return true;
    const currentClient = getCurrentClient();
    return Boolean(currentClient?.enabledModules?.includes(moduleId));
  }

  function openModuleFromHub(moduleId) {
    if (!canAccessModule(moduleId)) {
      alert("Este módulo não está contratado para este cliente.");
      return;
    }

    setPage(moduleId);
  }



  function renderAccessCadastroSelector() {
    const options = [
      { id: "usuario", title: "Usuário", icon: "👤", description: "Cadastre funcionários, perfil, setor, cargo e Telegram." },
      { id: "processo", title: "Processo / Atividade", icon: "✅", description: "Cadastre rotinas operacionais para o checklist." },
      { id: "area", title: "Área / Departamento", icon: "🏢", description: "Cadastre áreas como Cozinha, Salão, Estoque e Bar." }
    ];

    return (
      <div className="cadastro-selector access-selector">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={accessCadastroType === option.id ? "cadastro-card active" : "cadastro-card"}
            onClick={() => setAccessCadastroType(option.id)}
          >
            <span>{option.icon}</span>
            <strong>{option.title}</strong>
            <small>{option.description}</small>
          </button>
        ))}
      </div>
    );
  }

  function renderAccessUserForm() {
    return (
      <>
        <h2>Cadastrar usuário</h2>
        <p className="stock-help">Cadastre funcionários do cliente, defina perfil, setor, cargo e dados para notificação no Telegram.</p>

        <form className="stock-form-grid" onSubmit={saveStockUser}>
          <label>
            Nome
            <input value={stockUserForm.name} onChange={(event) => setStockUserForm({ ...stockUserForm, name: event.target.value })} placeholder="Nome do funcionário" />
          </label>

          <label>
            E-mail
            <input type="email" value={stockUserForm.email} onChange={(event) => setStockUserForm({ ...stockUserForm, email: event.target.value })} placeholder="funcionario@empresa.com" />
          </label>

          <label>
            Senha
            <input type="password" value={stockUserForm.password} onChange={(event) => setStockUserForm({ ...stockUserForm, password: event.target.value })} placeholder="Senha de acesso" />
          </label>

          <label>
            Perfil
            <select value={stockUserForm.profile} onChange={(event) => setStockUserForm({ ...stockUserForm, profile: event.target.value })}>
              <option>Operação</option>
              <option>Gestor</option>
              <option>Administrador</option>
            </select>
          </label>

          <label>
            Setor
            <select value={stockUserForm.sector} onChange={(event) => setStockUserForm({ ...stockUserForm, sector: event.target.value })}>
              <option value="">Selecione</option>
              {areas.map((area) => <option key={area}>{area}</option>)}
            </select>
          </label>

          <label>
            Cargo
            <input value={stockUserForm.role} onChange={(event) => setStockUserForm({ ...stockUserForm, role: event.target.value })} placeholder="Ex: Cozinheiro, Gerente, Auxiliar" />
          </label>

          <label>
            Status
            <select value={stockUserForm.status} onChange={(event) => setStockUserForm({ ...stockUserForm, status: event.target.value })}>
              <option>Ativo</option>
              <option>Inativo</option>
            </select>
          </label>

          <div className="telegram-user-box">
            <label className="telegram-toggle">
              <input type="checkbox" checked={stockUserForm.telegramEnabled} onChange={(event) => setStockUserForm({ ...stockUserForm, telegramEnabled: event.target.checked })} />
              <span>Receber notificações no Telegram</span>
            </label>

            {stockUserForm.telegramEnabled && (
              <div className="telegram-fields">
                <label>
                  Username do Telegram
                  <input value={stockUserForm.telegramUsername} onChange={(event) => setStockUserForm({ ...stockUserForm, telegramUsername: event.target.value })} placeholder="@usuario" />
                </label>

                <label>
                  Chat ID do Telegram
                  <input value={stockUserForm.telegramChatId} onChange={(event) => setStockUserForm({ ...stockUserForm, telegramChatId: event.target.value })} placeholder="Ex: 123456789" />
                </label>

                <label>
                  Telefone de referência
                  <input value={stockUserForm.telegramPhone} onChange={(event) => setStockUserForm({ ...stockUserForm, telegramPhone: event.target.value })} placeholder="(00) 00000-0000" />
                </label>
              </div>
            )}
          </div>

          <button className="primary" type="submit">Cadastrar funcionário</button>
        </form>
      </>
    );
  }

  function renderAccessProcessForm() {
    return (
      <>
        <h2>Cadastrar processo ou atividade</h2>
        <p className="stock-help">Cadastre rotinas operacionais que serão usadas no módulo Checklist.</p>

        <form className="stock-form-grid" onSubmit={saveProcessActivity}>
          <label>
            Tipo
            <select value={processActivityForm.type} onChange={(event) => setProcessActivityForm({ ...processActivityForm, type: event.target.value })}>
              <option>Processo</option>
              <option>Atividade</option>
            </select>
          </label>

          <label>
            Processo / Atividade
            <input value={processActivityForm.name} onChange={(event) => setProcessActivityForm({ ...processActivityForm, name: event.target.value })} placeholder="Ex: Limpeza da cozinha, Conferência de freezer" />
          </label>

          <label>
            Área referente
            <select value={processActivityForm.area} onChange={(event) => setProcessActivityForm({ ...processActivityForm, area: event.target.value })}>
              <option value="">Selecione</option>
              {areas.map((area) => <option key={area}>{area}</option>)}
            </select>
          </label>

          <label>
            Hora início
            <input type="time" value={processActivityForm.startTime} onChange={(event) => setProcessActivityForm({ ...processActivityForm, startTime: event.target.value })} />
          </label>

          <label>
            Hora fim
            <input type="time" value={processActivityForm.endTime} onChange={(event) => setProcessActivityForm({ ...processActivityForm, endTime: event.target.value })} />
          </label>

          <label>
            Se repete?
            <select value={processActivityForm.repeats} onChange={(event) => setProcessActivityForm({ ...processActivityForm, repeats: event.target.value })}>
              <option>Não</option>
              <option>Sim</option>
            </select>
          </label>

          <label>
            Quantas vezes repete?
            <input type="number" min="0" value={processActivityForm.repeatQuantity} onChange={(event) => setProcessActivityForm({ ...processActivityForm, repeatQuantity: event.target.value })} placeholder="Ex: 3" disabled={processActivityForm.repeats === "Não"} />
          </label>

          <label>
            Frequência
            <select value={processActivityForm.frequency} onChange={(event) => setProcessActivityForm({ ...processActivityForm, frequency: event.target.value })} disabled={processActivityForm.repeats === "Não"}>
              <option>Diário</option>
              <option>Semanal</option>
              <option>Mensal</option>
              <option>Por turno</option>
            </select>
          </label>

          <button className="primary" type="submit">Cadastrar processo/atividade</button>
        </form>
      </>
    );
  }


  function saveAreaDepartment(event) {
    event.preventDefault();
    const name = areaForm.trim();

    if (!name) {
      alert("Informe o nome da área/departamento.");
      return;
    }

    if (areas.some((area) => area.toLowerCase() === name.toLowerCase())) {
      alert("Área/departamento já cadastrado.");
      return;
    }

    setAreas([...areas, name]);
    setAreaForm("");
  }

  function deleteAreaDepartment(name) {
    if (!confirm("Deseja excluir esta área/departamento?")) return;

    const usedInActivities = stockItems.some((item) => item.area === name);
    const usedInUsers = stockUsers.some((user) => user.sector === name);

    if (usedInActivities || usedInUsers) {
      alert("Não é possível excluir uma área vinculada a usuário ou processo/atividade.");
      return;
    }

    setAreas(areas.filter((area) => area !== name));
  }

  function renderAccessAreaForm() {
    return (
      <>
        <h2>Cadastrar área / departamento</h2>
        <p className="stock-help">Cadastre áreas para reutilizar em usuários, processos, checklist e Kanban.</p>

        <form className="stock-inline-form" onSubmit={saveAreaDepartment}>
          <input
            value={areaForm}
            onChange={(event) => setAreaForm(event.target.value)}
            placeholder="Ex: Cozinha, Salão, Estoque, Bar"
          />
          <button className="primary" type="submit">Cadastrar área</button>
        </form>

        <div className="area-list">
          {areas.map((area) => (
            <span className="stock-chip" key={area}>
              {area}
              <button type="button" onClick={() => deleteAreaDepartment(area)}>×</button>
            </span>
          ))}
        </div>
      </>
    );
  }

  function getKanbanColumn(activity) {
    if (checklistHistory.some((record) => record.activityId === activity.id && record.date === today())) {
      return "Concluído";
    }

    if (runningChecklist[activity.id]) {
      return "Executando";
    }

    const plannedEnd = timeToMinutes(activity.endTime);
    const now = timeToMinutes(currentTimeHHMM());

    if (plannedEnd !== null && now !== null && now > plannedEnd) {
      return "Pendência";
    }

    return "Não iniciado";
  }

  function renderKanbanModule() {
    const columns = ["Não iniciado", "Executando", "Pendência", "Concluído"];
    const visibleActivities = checklistActivities.filter((activity) =>
      kanbanAreaFilter === "Todas" || activity.area === kanbanAreaFilter
    );

    return (
      <section className="module-content checklist-wide">
        <div className="kanban-header">
          <div>
            <h2>Kanban operacional</h2>
            <p className="stock-help">Acompanhe as atividades por status e filtre por área/departamento.</p>
          </div>

          <label>
            Filtrar por área
            <select value={kanbanAreaFilter} onChange={(event) => setKanbanAreaFilter(event.target.value)}>
              <option>Todas</option>
              {areas.map((area) => <option key={area}>{area}</option>)}
            </select>
          </label>
        </div>

        <div className="kanban-board">
          {columns.map((column) => {
            const columnActivities = visibleActivities.filter((activity) => getKanbanColumn(activity) === column);

            return (
              <section className="kanban-column" key={column}>
                <header>
                  <strong>{column}</strong>
                  <span>{columnActivities.length}</span>
                </header>

                <div className="kanban-list">
                  {columnActivities.length === 0 ? (
                    <div className="kanban-empty">Sem atividades</div>
                  ) : (
                    columnActivities.map((activity) => (
                      <article className="kanban-card" key={activity.id}>
                        <strong>{activity.name}</strong>
                        <small>{activity.area || "Sem área"}</small>
                        <small>{activity.startTime || "--"} às {activity.endTime || "--"}</small>
                        <small>{activity.frequency || "--"}</small>
                      </article>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    );
  }

  function renderAccessModule() {
    return (
      <section className="stock-workspace access-workspace">
        <aside className="stock-sidebar">
          <button className="stock-nav active">Cadastros</button>
        </aside>

        <main className="stock-main">
          <section className="module-content stock-wide">
            <h2>Gestão de acesso</h2>
            <p className="stock-help">Selecione se deseja cadastrar usuário ou processo/atividade.</p>
            {renderAccessCadastroSelector()}
          </section>

          <section className="module-content stock-wide">
            {accessCadastroType === "usuario" && renderAccessUserForm()}
            {accessCadastroType === "processo" && renderAccessProcessForm()}
            {accessCadastroType === "area" && renderAccessAreaForm()}
          </section>

          {accessCadastroType === "usuario" && (
            <section className="module-content stock-wide">
              <h2>Funcionários cadastrados</h2>

              {stockUsers.length === 0 ? (
                <div className="module-placeholder">
                  <strong>Nenhum funcionário cadastrado</strong>
                  <p>Cadastre os funcionários do cliente para controlar acessos e notificações.</p>
                </div>
              ) : (
                <div className="stock-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>E-mail</th>
                        <th>Perfil</th>
                        <th>Setor</th>
                        <th>Cargo</th>
                        <th>Telegram</th>
                        <th>Status</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockUsers.map((user) => (
                        <tr key={user.id}>
                          <td><strong>{user.name}</strong></td>
                          <td>{user.email}</td>
                          <td>{user.profile}</td>
                          <td>{user.sector}</td>
                          <td>{user.role}</td>
                          <td>{user.telegramEnabled ? "Ativo" : "Não"}</td>
                          <td>{user.status}</td>
                          <td>
                            <div className="actions">
                              {user.telegramEnabled && <button className="secondary" onClick={() => testTelegramUser(user)}>Testar Telegram</button>}
                              <button className="danger" onClick={() => deleteStockUser(user.id)}>Excluir</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {accessCadastroType === "processo" && renderChecklistAtividades()}
        </main>
      </section>
    );
  }


  if (!isLogged) {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="logo-box">
            <LogoGestaoMesa />
          </div>

          <h1>Gestão à Mesa</h1>
          <p className="subtitle">Eficiência para restaurantes e bares</p>

          <form className="login-form" onSubmit={handleLogin}>
            <label>
              E-mail
              <input
                type="email"
                value={login.email}
                onChange={(event) => setLogin({ ...login, email: event.target.value })}
                placeholder="Digite seu e-mail"
                required
              />
            </label>

            <label>
              Senha
              <input
                type="password"
                value={login.password}
                onChange={(event) => setLogin({ ...login, password: event.target.value })}
                placeholder="Digite sua senha"
                required
              />
            </label>

            <button type="submit">Entrar</button>
          </form>

          <div className="login-hint">
            <strong>Acesso inicial</strong>
            <span>admin@gestaoamesa.com / 123456</span>
            <span>admin@divino.com / 123456</span>
          </div>
        </section>
      </main>
    );
  }

  if (["estoque", "etiquetas", "checklist", "acesso"].includes(page)) {
    const moduleInfo = {
      estoque: {
        title: "Controle de estoque",
        icon: "📦",
        description: "Cadastro, lançamento e extrato dos itens de estoque.",
        items: []
      },
      etiquetas: {
        title: "Etiquetas",
        icon: "🏷️",
        description: "Aqui será construída a funcionalidade de etiquetas da versão 26.",
        items: [
          "Seleção de produto",
          "Quantidade ou peso da etiqueta",
          "Data de emissão",
          "Data de validade",
          "Impressão e histórico"
        ]
      },
      checklist: {
        title: "Checklist",
        icon: "✅",
        description: "Aqui será construída a funcionalidade de checklist da versão 26.",
        items: [
          "Cadastro de atividades",
          "Atividades por setor",
          "Botão iniciar",
          "Botão finalizar",
          "Tempo de execução e histórico"
        ]
      },
      acesso: {
        title: "Gestão de acesso",
        icon: "👥",
        description: "Cadastro de funcionários, perfis, setores, cargos, permissões e notificações.",
        items: [
          "Cadastro de funcionários",
          "Perfis de acesso",
          "Setor e cargo",
          "Permissões por módulo",
          "Notificação por Telegram"
        ]
      }
    }[page];

    if (!canAccessModule(page)) {
      return (
        <main className="module-full">
          <header className="module-header">
            <button className="module-back" onClick={() => setPage("hub")}>← Voltar ao Hub</button>
          </header>
          <section className="module-content">
            <h2>Acesso não liberado</h2>
            <p>Este módulo não está contratado para este cliente.</p>
          </section>
        </main>
      );
    }

    return (
      <main className="module-full">
        <header className="module-header">
          <button className="module-back" onClick={() => setPage("hub")}>← Voltar ao Hub</button>
        </header>

        <section className="module-hero">
          <span className="module-icon">{moduleInfo.icon}</span>
          <div>
            <h1>{moduleInfo.title}</h1>
            <p>{moduleInfo.description}</p>
          </div>
        </section>

        {page === "estoque" && renderStockModule()}
        {page === "checklist" && renderChecklistModule()}
        {page === "etiquetas" && (
          <section className="module-content">
            <h2>Funcionalidades previstas</h2>
            <div className="module-items">
              {moduleInfo.items.map((item) => (
                <div className="module-item" key={item}>
                  <span>✓</span>
                  <strong>{item}</strong>
                </div>
              ))}
            </div>
          </section>
        )}

        {page === "acesso" && renderAccessModule()}
      </main>
    );
  }

  return (
    <div className="work-page">
      <aside className="sidebar">
        {loggedUser?.userType === "platform" && (
          <>
            <button className={page === "dashboard" ? "nav active" : "nav"} onClick={() => setPage("dashboard")}>
              Dashboard
            </button>

            <button className={page === "clients" ? "nav active" : "nav"} onClick={() => setPage("clients")}>
              Gestão de cliente
            </button>

            <button className={page === "view" ? "nav active" : "nav"} onClick={() => setPage("view")}>
              Visualizar cliente
            </button>
          </>
        )}

        <button className={page === "hub" ? "nav active" : "nav"} onClick={() => setPage("hub")}>
          Hub de soluções
        </button>

        {loggedUser?.userType === "platform" && (
          <button className={page === "users" ? "nav active" : "nav"} onClick={() => setPage("users")}>
            Cadastrar usuários
          </button>
        )}
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <LogoGestaoMesa small />
            <div>
              <h1>{loggedUser?.userType === "client" ? "Hub de soluções" : "Gestão de Clientes"}</h1>
              <p>{loggedUser?.userType === "client" ? "Escolha uma funcionalidade contratada" : "Administração dos clientes contratantes"}</p>
            </div>
          </div>

          <div className="topbar-actions">
            <span>Olá, {loggedUser?.name}</span>
            <button className="logout" onClick={logout}>Sair</button>
          </div>
        </header>

        {page === "dashboard" && (
          <section className="content">
            <div className="metrics">
              <div className="metric">
                <span>Clientes cadastrados</span>
                <strong>{clients.length}</strong>
              </div>

              <div className="metric">
                <span>Clientes ativos</span>
                <strong>{clients.filter((client) => client.status === "Ativo").length}</strong>
              </div>

              <div className="metric warning">
                <span>Faturamento do mês</span>
                <strong>{money(monthlyRevenue)}</strong>
              </div>

              <div className="metric warning">
                <span>Usuários cadastrados</span>
                <strong>{users.length}</strong>
              </div>
            </div>

            <section className="panel">
              <h2>Clientes recentes</h2>

              {clients.length === 0 ? (
                <div className="empty">
                  Nenhum cliente cadastrado ainda. Comece pelo menu <strong>Gestão de cliente</strong>.
                </div>
              ) : (
                <div className="client-grid">
                  {clients.slice(0, 4).map((client) => (
                    <article className="client-card" key={client.id}>
                      <div className="client-logo">
                        {client.logo ? <img src={client.logo} alt={client.fantasyName} /> : <span>{client.fantasyName.slice(0, 2).toUpperCase()}</span>}
                      </div>
                      <div>
                        <strong>{client.fantasyName}</strong>
                        <small>{client.companyName}</small>
                        <small>{client.status}</small>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </section>
        )}

        {page === "clients" && (
          <section className="content">
            <section className="panel compact-panel">
              <div className="panel-title-row">
                <h2>Gestão de cliente</h2>
                <button className="primary compact" onClick={openNewClientForm}>
                  + Cadastrar cliente
                </button>
              </div>

              {!showClientForm && (
                <div className="empty">
                  Clique em <strong>Cadastrar cliente</strong> para abrir os dados cadastrais.
                </div>
              )}

              {showClientForm && (
                <>
                  <div className="panel-title-row form-title">
                    <h3>{editingClientId ? "Editar cliente contratante" : "Dados cadastrais do cliente"}</h3>
                    <button className="secondary" onClick={resetClientForm}>Fechar</button>
                  </div>

                  <form className="form-grid dense-form" onSubmit={saveClient}>
                    <label>
                      Razão social / Empresa contratante
                      <input value={clientForm.companyName} onChange={(event) => setClientForm({ ...clientForm, companyName: event.target.value })} placeholder="Ex: Divino Botequim LTDA" />
                    </label>

                    <label>
                      Nome fantasia
                      <input value={clientForm.fantasyName} onChange={(event) => setClientForm({ ...clientForm, fantasyName: event.target.value })} placeholder="Ex: Divino Botequim" />
                    </label>

                    <label>
                      CNPJ / Documento
                      <input value={clientForm.document} onChange={(event) => setClientForm({ ...clientForm, document: event.target.value })} placeholder="00.000.000/0001-00" />
                    </label>

                    <label>
                      Telefone
                      <input value={clientForm.phone} onChange={(event) => setClientForm({ ...clientForm, phone: event.target.value })} placeholder="(00) 00000-0000" />
                    </label>

                    <label>
                      E-mail
                      <input type="email" value={clientForm.email} onChange={(event) => setClientForm({ ...clientForm, email: event.target.value })} placeholder="contato@empresa.com" />
                    </label>

                    <label>
                      Endereço
                      <input value={clientForm.address} onChange={(event) => setClientForm({ ...clientForm, address: event.target.value })} placeholder="Rua, número, cidade" />
                    </label>

                    <label>
                      Forma de pagamento
                      <select value={clientForm.paymentMethod} onChange={(event) => setClientForm({ ...clientForm, paymentMethod: event.target.value })}>
                        <option>Pix</option>
                        <option>Boleto</option>
                        <option>Cartão de crédito</option>
                        <option>Transferência</option>
                      </select>
                    </label>

                    <label>
                      Mensalidade
                      <input type="number" value={clientForm.monthlyFee} onChange={(event) => setClientForm({ ...clientForm, monthlyFee: event.target.value })} placeholder="199" />
                    </label>

                    <label>
                      Dia de vencimento
                      <input type="number" min="1" max="31" value={clientForm.dueDay} onChange={(event) => setClientForm({ ...clientForm, dueDay: event.target.value })} />
                    </label>

                    <label>
                      Logomarca
                      <input type="file" accept="image/*" onChange={handleLogoUpload} />
                    </label>

                    {clientForm.logo && (
                      <div className="logo-preview">
                        <img src={clientForm.logo} alt="Prévia da logo" />
                      </div>
                    )}

                    <div className="client-modules-box">
                      <strong>Funcionalidades liberadas no Hub</strong>
                      <small>Selecione quais módulos a empresa contratante terá acesso.</small>

                      <div className="client-modules-grid">
                        {SOLUTION_MODULES.map((module) => (
                          <button
                            type="button"
                            key={module.id}
                            className={(clientForm.enabledModules || []).includes(module.id) ? "client-module-option active" : "client-module-option"}
                            onClick={() => toggleClientModule(module.id)}
                          >
                            <span>{module.icon}</span>
                            <strong>{module.title}</strong>
                            <small>{module.description}</small>
                          </button>
                        ))}
                      </div>
                    </div>

                    <button className="primary" type="submit">
                      {editingClientId ? "Salvar alterações" : "Salvar cliente"}
                    </button>
                  </form>
                </>
              )}
            </section>

            <section className="panel compact-panel">
              <h2>Clientes cadastrados</h2>

              {clients.length === 0 ? (
                <div className="empty">Nenhum cliente cadastrado.</div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Logo</th>
                        <th>Cliente</th>
                        <th>Documento</th>
                        <th>Pagamento</th>
                        <th>Mensalidade</th>
                        <th>Vencimento</th>
                        <th>Status</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map((client) => (
                        <tr key={client.id}>
                          <td>
                            <div className="table-logo">
                              {client.logo ? <img src={client.logo} alt={client.fantasyName} /> : <span>{client.fantasyName.slice(0, 2).toUpperCase()}</span>}
                            </div>
                          </td>
                          <td>
                            <strong>{client.fantasyName}</strong>
                            <small>{client.companyName}</small>
                          </td>
                          <td>{client.document || "--"}</td>
                          <td>{client.paymentMethod}</td>
                          <td>{money(client.monthlyFee)}</td>
                          <td>Dia {client.dueDay}</td>
                          <td><span className="status">{client.status}</span></td>
                          <td>
                            <div className="actions">
                              <button className="secondary" onClick={() => editClient(client)}>Editar</button>
                              <button className="danger" onClick={() => deleteClient(client.id)}>Excluir</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </section>
        )}

        {page === "view" && (
          <section className="content">
            <section className="panel compact-panel">
              <h2>Visualizar clientes</h2>

              {clients.length === 0 ? (
                <div className="empty">Nenhum cliente cadastrado.</div>
              ) : (
                <div className="client-card-grid">
                  {clients.map((client) => (
                    <article className="visual-client-card" key={client.id}>
                      <div className="visual-client-logo">
                        {client.logo ? <img src={client.logo} alt={client.fantasyName} /> : <span>{client.fantasyName.slice(0, 2).toUpperCase()}</span>}
                      </div>

                      <div className="visual-client-body">
                        <strong>{client.fantasyName}</strong>
                        <small>{client.companyName}</small>
                        <small>{client.document || "Documento não informado"}</small>
                        <div className="contracted-modules-list">
                          <strong>Módulos contratados:</strong>
                          {(client.enabledModules || []).length === 0 ? (
                            <small>Nenhum módulo contratado</small>
                          ) : (
                            (client.enabledModules || []).map((moduleId) => {
                              const module = SOLUTION_MODULES.find((item) => item.id === moduleId);
                              return module ? <small key={module.id}>{module.title}</small> : null;
                            })
                          )}
                        </div>
                        <div className="visual-client-footer">
                          <span>{client.status}</span>
                          <button className="secondary" onClick={() => editClient(client)}>Editar</button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </section>
        )}

        {page === "hub" && (
          <section className="content">
            <section className="panel compact-panel">
              <h2>Hub de soluções</h2>
              <p className="hub-description">
                Escolha uma funcionalidade para abrir o módulo em tela separada.
              </p>

              <div className="solution-grid">
                {getAllowedModules().map((module) => (
                  <button className="solution-card" key={module.id} onClick={() => openModuleFromHub(module.id)}>
                    <span>{module.icon}</span>
                    <strong>{module.title}</strong>
                    <small>{module.description}</small>
                  </button>
                ))}
              </div>

              {getAllowedModules().length === 0 && (
                <div className="empty">
                  Nenhuma funcionalidade foi liberada para este cliente.
                </div>
              )}
            </section>
          </section>
        )}

        {page === "users" && (
          <section className="content">
            <section className="panel compact-panel">
              <div className="panel-title-row">
                <h2>{editingUserId ? "Editar usuário" : "Cadastrar usuário"}</h2>
                {editingUserId && (
                  <button
                    className="secondary"
                    onClick={() => {
                      setEditingUserId(null);
                      setUserForm({ name: "", email: "", password: "", profile: "Administrador", status: "Ativo" });
                    }}
                  >
                    Cancelar edição
                  </button>
                )}
              </div>

              <form className="form-grid dense-form" onSubmit={saveUser}>
                <label>
                  Nome
                  <input value={userForm.name} onChange={(event) => setUserForm({ ...userForm, name: event.target.value })} placeholder="Nome do usuário" />
                </label>

                <label>
                  E-mail
                  <input type="email" value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} placeholder="usuario@empresa.com" />
                </label>

                <label>
                  Senha
                  <input type="password" value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} placeholder="Senha de acesso" />
                </label>

                <label>
                  Perfil
                  <select value={userForm.profile} onChange={(event) => setUserForm({ ...userForm, profile: event.target.value })}>
                    <option>Administrador</option>
                    <option>Gerente</option>
                    <option>Supervisor</option>
                    <option>Operador</option>
                  </select>
                </label>

                <label>
                  Status
                  <select value={userForm.status} onChange={(event) => setUserForm({ ...userForm, status: event.target.value })}>
                    <option>Ativo</option>
                    <option>Inativo</option>
                  </select>
                </label>

                <button className="primary" type="submit">
                  {editingUserId ? "Salvar alterações" : "Salvar usuário"}
                </button>
              </form>
            </section>

            <section className="panel compact-panel">
              <h2>Usuários cadastrados</h2>

              {users.length === 0 ? (
                <div className="empty">Nenhum usuário cadastrado.</div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>E-mail</th>
                        <th>Perfil</th>
                        <th>Status</th>
                        <th>Criado em</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td><strong>{user.name}</strong></td>
                          <td>{user.email}</td>
                          <td>{user.profile}</td>
                          <td><span className="status">{user.status}</span></td>
                          <td>{user.createdAt || "--"}</td>
                          <td>
                            <div className="actions">
                              <button className="secondary" onClick={() => editUser(user)}>Editar</button>
                              <button className="danger" onClick={() => deleteUser(user.id)}>Excluir</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </section>
        )}
      </main>
    </div>
  );
}
