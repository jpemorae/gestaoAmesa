import React, { useEffect, useMemo, useState } from "react";
import { initialClients, initialUsers, SOLUTION_MODULES } from "./data/mockData";
import { MODULE_INFO } from "./data/moduleInfo";
import { AppShell } from "./layout/AppShell";
import { LoginPage } from "./layout/LoginPage";
import { ModuleShell } from "./layout/ModuleShell";
import { ClientDashboard } from "./modules/dashboards/ClientDashboard";
import { HubPage } from "./modules/hub/HubPage";
import { KanbanBoard } from "./modules/kanban/KanbanBoard";
import { ClientCardsPage } from "./modules/platform/ClientCardsPage";
import { ClientManagementPage } from "./modules/platform/ClientManagementPage";
import { PlatformDashboard } from "./modules/platform/PlatformDashboard";
import { PlatformUsersPage } from "./modules/platform/PlatformUsersPage";
import { OperationalModuleLayout } from "./modules/shared/OperationalModuleLayout";
import {
  authenticateUser,
  clearStoredSession,
  getInitialPageForUser,
  persistSession,
  restoreSession
} from "./services/authService";
import {
  canUseAppDataApi,
  loadAppData,
  loadClientStockCatalog,
  loadClientBillingData,
  loadClientSalesData,
  loginAppUser,
  removeAppClient,
  removeAppUser,
  saveAppClient,
  saveClientStockCatalog,
  saveClientBillingData,
  saveClientSalesData,
  saveAppUser
} from "./services/appDataService";
import {
  addDaysFromDate,
  currentTimeHHMM,
  diffDays,
  durationFromMinutes,
  durationText,
  formatDate,
  minutesBetween,
  punctualityStatus,
  today
} from "./utils/date";
import {
  baseUnitFor,
  compatibleUnitsFor,
  formatQuantity,
  formatStockDisplay,
  money,
  normalizeDecimal,
  toBaseUnit,
  unitLabel
} from "./utils/units";
import {
  canViewModule,
  getCurrentClientForUser,
  getUserOperationalArea as getPermissionOperationalArea,
  getVisibleModules,
  isClientAdminOrManager as isPermissionClientAdminOrManager,
  isOperationalUser as isPermissionOperationalUser
} from "./utils/permissions";
import { getQrActionUrl } from "./utils/qr";
import { getApiSessionToken } from "./services/api";
import { usePersistentState } from "./hooks/usePersistentState";
import { useTenantPersistentState } from "./hooks/useTenantPersistentState";

function StockModal({ title, children, onClose, className = "" }) {
  return (
    <div className="stock-modal-backdrop">
      <section className={`stock-modal ${className}`.trim()}>
        <div className="stock-modal-header">
          <h2>{title}</h2>
          <button className="secondary" type="button" onClick={onClose}>Fechar</button>
        </div>
        {children}
      </section>
    </div>
  );
}

export default function App() {
  const [isLogged, setIsLogged] = useState(false);
  const [loggedUser, setLoggedUser] = useState(null);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [page, setPage] = useState("dashboard");

  function clearSession() {
    clearStoredSession();
    setLoggedUser(null);
    setIsLogged(false);
    setPage("dashboard");
  }

  useEffect(() => {
    const session = restoreSession();

    if (session.isLogged) {
      if (canUseAppDataApi() && !getApiSessionToken()) {
        clearStoredSession();
        return;
      }
      setLoggedUser(session.user);
      setIsLogged(true);
      setPage(session.page);
    }
  }, []);

  useEffect(() => {
    if (isLogged && loggedUser) {
      persistSession(loggedUser, page);
    }
  }, [isLogged, loggedUser, page]);

  const [clients, setClients] = usePersistentState("gestao_mesa_clients", initialClients);
  const [viewedClientId, setViewedClientId] = usePersistentState("gestao_mesa_viewed_client", initialClients[0]?.id || "");
  const activeCompanyId = loggedUser?.userType === "client" ? loggedUser.companyId : viewedClientId || initialClients[0]?.id;
  const [editingClientId, setEditingClientId] = useState(null);
  const [showClientForm, setShowClientForm] = useState(false);

  const [users, setUsers] = usePersistentState("gestao_mesa_users", initialUsers);
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
    logo: "",
    financialStatus: "Em dia",
    themeColor: "#0b2f4f",
    status: "Ativo",
    enabledModules: ["acompanhamento", "estoque", "etiquetas", "checklist", "vendas", "faturamento", "acesso"]
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

  useEffect(() => {
    if (!canUseAppDataApi() || !isLogged || !loggedUser || !getApiSessionToken()) return;

    let active = true;
    loadAppData()
      .then(async (data) => {
        if (!active || !data) return;
        if (data.setupRequired) {
          console.warn(data.message || "Persistencia global ainda nao configurada na API.", data.diagnostics || "");
          return;
        }
        const remoteClients = Array.isArray(data.clients) ? data.clients : [];
        const remoteUsers = Array.isArray(data.users) ? data.users : [];
        const missingClients = clients.filter((client) => !remoteClients.some((remoteClient) => remoteClient.id === client.id));
        const missingUsers = users.filter((user) => !remoteUsers.some((remoteUser) => remoteUser.id === user.id));

        const syncedClients = [];
        for (const client of missingClients) {
          try {
            syncedClients.push(await saveAppClient(client));
          } catch (error) {
            console.warn(`Falha ao sincronizar cliente ${client.fantasyName}:`, error.message);
          }
        }

        const syncedUsers = [];
        for (const user of missingUsers) {
          if (!user.password) continue;
          try {
            syncedUsers.push(await saveAppUser(user));
          } catch (error) {
            console.warn(`Falha ao sincronizar usuário ${user.email}:`, error.message);
          }
        }

        const nextClients = [...remoteClients, ...syncedClients];
        const nextUsers = [...remoteUsers, ...syncedUsers];

        if (nextClients.length > 0) {
          setClients(nextClients);
          if (!nextClients.some((client) => client.id === viewedClientId)) {
            setViewedClientId(nextClients[0]?.id || "");
          }
        }
        if (nextUsers.length > 0) {
          setUsers(nextUsers);
        }
      })
      .catch((error) => {
        console.warn("Falha ao carregar dados globais da API:", error.message);
      });

    return () => {
      active = false;
    };
  }, [isLogged, loggedUser?.id]);

  const [stockPage, setStockPage] = useState("estoque");
  const legacyCompanyId = initialClients[0]?.id;
  const [stockCategories, setStockCategories] = useTenantPersistentState("gestao_mesa_stock_categories", activeCompanyId, [
    { id: "cat-comida", name: "Comida" },
    { id: "cat-bebida", name: "Bebida" },
    { id: "cat-limpeza", name: "Limpeza" }
  ], legacyCompanyId);
  const [stockItems, setStockItems] = useTenantPersistentState("gestao_mesa_stock_products", activeCompanyId, [], legacyCompanyId);
  const [menuItems, setMenuItems] = useTenantPersistentState("gestao_mesa_menu_items", activeCompanyId, [], legacyCompanyId);
  const [stockLots, setStockLots] = useTenantPersistentState("gestao_mesa_stock_lots", activeCompanyId, [], legacyCompanyId);
  const [stockMovements, setStockMovements] = useTenantPersistentState("gestao_mesa_stock_movements", activeCompanyId, [], legacyCompanyId);
  const [stockLosses, setStockLosses] = useTenantPersistentState("gestao_mesa_stock_losses", activeCompanyId, [], legacyCompanyId);
  const [stockSuppliers, setStockSuppliers] = useTenantPersistentState("gestao_mesa_stock_suppliers", activeCompanyId, [
    { id: "supplier-default", corporateName: "Fornecedor padrão", fantasyName: "Fornecedor padrão", document: "", categoryId: "", status: "Ativo" }
  ], legacyCompanyId);
  const [stockLocations, setStockLocations] = useTenantPersistentState("gestao_mesa_stock_locations", activeCompanyId, [
    "Estoque seco",
    "Câmara fria",
    "Freezer",
    "Cozinha",
    "Bar",
    "Salão"
  ], legacyCompanyId);
  const [stockSearch, setStockSearch] = useState("");
  const [stockCategoryName, setStockCategoryName] = useState("");
  const [showStockCategoryModal, setShowStockCategoryModal] = useState(false);
  const emptySupplierForm = { corporateName: "", fantasyName: "", document: "", categoryId: "", status: "Ativo" };
  const [stockSupplierForm, setStockSupplierForm] = useState(emptySupplierForm);
  const [editingStockSupplierId, setEditingStockSupplierId] = useState(null);
  const [showStockSupplierModal, setShowStockSupplierModal] = useState(false);
  const [stockAlertDays, setStockAlertDays] = useState(2);
  const [stockFilters, setStockFilters] = useState({ category: "Todos", supplier: "Todos", location: "Todos", status: "Todos" });
  const [stockQuickFilter, setStockQuickFilter] = useState("todos");
  const [stockModal, setStockModal] = useState(null);
  const [editingStockItemId, setEditingStockItemId] = useState(null);
  const [stockItemForm, setStockItemForm] = useState({
    name: "",
    type: "Produto",
    categoryId: "",
    internalCode: "",
    barcode: "",
    unit: "kg",
    minStock: "",
    maxStock: "",
    unitCost: "",
    controlsExpiry: "Sim",
    status: "Ativo",
    defaultQuantity: 0,
    defaultValidityDays: 0
  });
  const [stockCatalogSyncedCompany, setStockCatalogSyncedCompany] = useState("");
  const emptyMenuItemForm = {
    dishName: "",
    type: "Comida",
    netValue: "",
    grossValue: "",
    interestValue: "",
    saleValue: "",
    image: "",
    imageName: "",
    portions: [{ stockItemId: "", quantity: "", unit: "g" }],
    status: "Ativo"
  };
  const [menuItemForm, setMenuItemForm] = useState(emptyMenuItemForm);
  const [editingMenuItemId, setEditingMenuItemId] = useState(null);
  const [showMenuItemModal, setShowMenuItemModal] = useState(false);
  const [stockCatalogSyncState, setStockCatalogSyncState] = useState("local");

  function readTenantStoredValue(key, companyId, fallback) {
    try {
      const stored = localStorage.getItem(`${key}:${companyId || "sem-cliente"}`);
      return stored ? JSON.parse(stored) : fallback;
    } catch {
      return fallback;
    }
  }

  async function persistStockCatalog(nextCategories = stockCategories, nextItems = stockItems, nextSuppliers = stockSuppliers, nextMenuItems = menuItems, options = {}) {
    if (!canUseAppDataApi() || !activeCompanyId) {
      setStockCatalogSyncState("local");
      return true;
    }

    try {
      setStockCatalogSyncState("syncing");
      await saveClientStockCatalog(activeCompanyId, {
        categories: nextCategories,
        items: nextItems,
        suppliers: nextSuppliers,
        menuItems: nextMenuItems
      });
      setStockCatalogSyncState("synced");
      return true;
    } catch (error) {
      setStockCatalogSyncState("error");
      if (!options.silent) {
        alert(`Cadastro salvo neste computador, mas não sincronizado no banco: ${error.message}`);
      }
      return false;
    }
  }

  useEffect(() => {
    if (!canUseAppDataApi() || !getApiSessionToken()) {
      setStockCatalogSyncState("local");
      return;
    }
    if (!activeCompanyId || stockCatalogSyncedCompany === activeCompanyId) return;

    let active = true;
    setStockCatalogSyncState("syncing");

    loadClientStockCatalog(activeCompanyId)
      .then(async (catalog) => {
        if (!active) return;

        const remoteCategories = Array.isArray(catalog?.categories) ? catalog.categories : [];
        const remoteItems = Array.isArray(catalog?.items) ? catalog.items : [];
        const remoteSuppliers = Array.isArray(catalog?.suppliers) ? catalog.suppliers : [];
        const remoteMenuItems = Array.isArray(catalog?.menuItems) ? catalog.menuItems : [];
        const hasRemoteCatalog = remoteCategories.length > 0 || remoteItems.length > 0 || remoteSuppliers.length > 0 || remoteMenuItems.length > 0;

        if (hasRemoteCatalog) {
          const localCategories = readTenantStoredValue("gestao_mesa_stock_categories", activeCompanyId, stockCategories);
          const localItems = readTenantStoredValue("gestao_mesa_stock_products", activeCompanyId, stockItems);
          const localSuppliers = readTenantStoredValue("gestao_mesa_stock_suppliers", activeCompanyId, stockSuppliers);
          const localMenuItems = readTenantStoredValue("gestao_mesa_menu_items", activeCompanyId, menuItems);
          const nextCategories = remoteCategories.length > 0
            ? remoteCategories
            : (Array.isArray(localCategories) ? localCategories : stockCategories);
          const nextItems = remoteItems.length > 0
            ? remoteItems
            : (Array.isArray(localItems) ? localItems : stockItems);
          const nextSuppliers = remoteSuppliers.length > 0
            ? remoteSuppliers
            : (Array.isArray(localSuppliers) ? localSuppliers : stockSuppliers);
          const nextMenuItems = remoteMenuItems.length > 0
            ? remoteMenuItems
            : (Array.isArray(localMenuItems) ? localMenuItems : menuItems);
          setStockCategories(nextCategories);
          setStockItems(nextItems);
          setStockSuppliers(nextSuppliers);
          setMenuItems(nextMenuItems);
          if ((remoteCategories.length === 0 && nextCategories.length > 0) || (remoteItems.length === 0 && nextItems.length > 0) || (remoteSuppliers.length === 0 && nextSuppliers.length > 0) || (remoteMenuItems.length === 0 && nextMenuItems.length > 0)) {
            await saveClientStockCatalog(activeCompanyId, {
              categories: nextCategories,
              items: nextItems,
              suppliers: nextSuppliers,
              menuItems: nextMenuItems
            });
          }
        } else {
          const localCategories = readTenantStoredValue("gestao_mesa_stock_categories", activeCompanyId, stockCategories);
          const localItems = readTenantStoredValue("gestao_mesa_stock_products", activeCompanyId, stockItems);
          const localSuppliers = readTenantStoredValue("gestao_mesa_stock_suppliers", activeCompanyId, stockSuppliers);
          const localMenuItems = readTenantStoredValue("gestao_mesa_menu_items", activeCompanyId, menuItems);
          await saveClientStockCatalog(activeCompanyId, {
            categories: Array.isArray(localCategories) ? localCategories : [],
            items: Array.isArray(localItems) ? localItems : [],
            suppliers: Array.isArray(localSuppliers) ? localSuppliers : [],
            menuItems: Array.isArray(localMenuItems) ? localMenuItems : []
          });
        }

        if (!active) return;
        setStockCatalogSyncedCompany(activeCompanyId);
        setStockCatalogSyncState("synced");
      })
      .catch((error) => {
        console.warn("Falha ao sincronizar cadastro de estoque:", error.message);
        if (!active) return;
        setStockCatalogSyncedCompany(activeCompanyId);
        setStockCatalogSyncState("error");
      });

    return () => {
      active = false;
    };
  }, [activeCompanyId, stockCatalogSyncedCompany]);
  const [processActivityForm, setProcessActivityForm] = useState({
    name: "",
    type: "Processo",
    area: "",
    startTime: "",
    endTime: "",
    repeats: "Não",
    repeatQuantity: "1",
    frequency: "Diário"
  });

  function updateProcessActivityForm(field, value) {
    setProcessActivityForm((currentForm) => ({ ...currentForm, [field]: value }));
  }
  const [stockEntryForm, setStockEntryForm] = useState({
    itemId: "",
    categoryId: "",
    quantity: "",
    quantityUnit: "g",
    supplier: "",
    batchCode: "",
    expiryDate: "",
    unitCost: "",
    location: "Estoque seco",
    note: "",
    invoiceFileName: ""
  });
  const [stockEntryCategorySearch, setStockEntryCategorySearch] = useState("");
  const [stockEntryProductSearch, setStockEntryProductSearch] = useState("");
  const [stockExitForm, setStockExitForm] = useState({
    itemId: "",
    quantity: "",
    quantityUnit: "g",
    reason: "Produção",
    location: "Estoque seco",
    note: ""
  });
  const [stockTransferForm, setStockTransferForm] = useState({
    itemId: "",
    quantity: "",
    quantityUnit: "g",
    fromLocation: "Estoque seco",
    toLocation: "Cozinha",
    note: ""
  });
  const [stockInventoryForm, setStockInventoryForm] = useState({
    itemId: "",
    location: "Estoque seco",
    countedQuantity: "",
    quantityUnit: "g",
    reason: "Inventário periódico",
    note: ""
  });
  const [stockLossForm, setStockLossForm] = useState({
    itemId: "",
    quantity: "",
    quantityUnit: "g",
    reason: "Vencimento",
    responsible: "",
    location: "Estoque seco",
    note: "",
    photoFileName: ""
  });
  const [editingStockLotId, setEditingStockLotId] = useState(null);
  const [showStockEntryForm, setShowStockEntryForm] = useState(false);

  const [labelForm, setLabelForm] = useState({
    itemId: "",
    quantity: "",
    quantityUnit: "g",
    labelCount: 1,
    issuedAt: today(),
    expiryDate: ""
  });
  const [labelsHistory, setLabelsHistory] = useTenantPersistentState("gestao_mesa_labels", activeCompanyId, [], legacyCompanyId);
  const [labelConsumeCode, setLabelConsumeCode] = useState("");
  const [labelConsumeArea, setLabelConsumeArea] = useState("");
  const [labelConsumeOperator, setLabelConsumeOperator] = useState("");
  const [labelProductSearch, setLabelProductSearch] = useState("");
  const [labelPage, setLabelPage] = useState("operacional");
  const [qrActionCode, setQrActionCode] = useState("");
  const [qrActionArea, setQrActionArea] = useState("");
  const [qrActionOperator, setQrActionOperator] = useState("");
  const [qrDiscardReason, setQrDiscardReason] = useState("");

  const [stockCadastroType, setStockCadastroType] = useState("produto");
  const [openRegisteredActionId, setOpenRegisteredActionId] = useState("");
  const [accessCadastroType, setAccessCadastroType] = useState("produto");
  const [areaForm, setAreaForm] = useState("");
  const [showProcessActivityModal, setShowProcessActivityModal] = useState(false);
  const [showAreaDepartmentModal, setShowAreaDepartmentModal] = useState(false);
  const [areas, setAreas] = useTenantPersistentState("gestao_mesa_areas", activeCompanyId, ["Cozinha", "Salão", "Estoque", "Bar"], legacyCompanyId);
  const [kanbanAreaFilter, setKanbanAreaFilter] = useState("Todas");
  const [stockUsers, setStockUsers] = useTenantPersistentState("gestao_mesa_company_users", activeCompanyId, [], legacyCompanyId);
  const [stockUserForm, setStockUserForm] = useState({
    name: "",
    email: "",
    password: "",
    profile: "Operação",
    sector: "",
    sectors: [],
    role: "",
    status: "Ativo",
    telegramEnabled: false,
    telegramUsername: "",
    telegramChatId: "",
    telegramPhone: "",
    allowedModules: ["checklist", "faturamento", "acesso"]
  });
  const [editingStockUserId, setEditingStockUserId] = useState(null);
  const [showStockUserModal, setShowStockUserModal] = useState(false);

  const [checklistPage, setChecklistPage] = useState("executar");
  const [runningChecklist, setRunningChecklist] = useTenantPersistentState("gestao_mesa_checklist_running", activeCompanyId, {}, legacyCompanyId);
  const [pendingChecklist, setPendingChecklist] = useTenantPersistentState("gestao_mesa_checklist_pending", activeCompanyId, {}, legacyCompanyId);
  const [checklistEvidence, setChecklistEvidence] = useTenantPersistentState("gestao_mesa_checklist_evidence", activeCompanyId, {}, legacyCompanyId);
  const [checklistHistory, setChecklistHistory] = useTenantPersistentState("gestao_mesa_checklist_history", activeCompanyId, [], legacyCompanyId);
  const [checklistAreaFilter, setChecklistAreaFilter] = useState("Todas");
  const [checklistExecutor, setChecklistExecutor] = useState("");

  const emptyBillingCustomerForm = {
    fullName: "",
    cpf: "",
    birthDate: "",
    phone: "",
    email: "",
    zipCode: "",
    address: "",
    number: "",
    complement: "",
    district: "",
    city: "",
    state: "",
    status: "Ativo",
    notes: "",
    registeredAt: today()
  };
  const emptyBillingChargeForm = {
    customerId: "",
    paymentMethod: "PIX",
    chargeType: "À vista",
    totalAmount: "",
    installments: "1",
    installmentAmount: "",
    firstDueDate: today(),
    fixedDueDay: "",
    notes: ""
  };
  const [billingPage, setBillingPage] = useState("dashboard");
  const [billingCustomers, setBillingCustomers] = useTenantPersistentState("gestao_mesa_billing_customers", activeCompanyId, [], legacyCompanyId);
  const [billingCharges, setBillingCharges] = useTenantPersistentState("gestao_mesa_billing_charges", activeCompanyId, [], legacyCompanyId);
  const [billingCustomerForm, setBillingCustomerForm] = useState(emptyBillingCustomerForm);
  const [editingBillingCustomerId, setEditingBillingCustomerId] = useState(null);
  const [billingChargeForm, setBillingChargeForm] = useState(emptyBillingChargeForm);
  const [billingFilters, setBillingFilters] = useState({ customer: "", cpf: "", status: "Todos", paymentMethod: "Todos", periodStart: "", periodEnd: "", view: "Todos" });
  const [selectedBillingCustomerId, setSelectedBillingCustomerId] = useState("");
  const [selectedBillingCharge, setSelectedBillingCharge] = useState(null);
  const [openBillingActionId, setOpenBillingActionId] = useState("");

  const emptySaleForm = {
    saleType: "Avulsa",
    customerId: "",
    customerSearch: "",
    buyerName: "",
    buyerPhone: "",
    saleModel: "À vista",
    paymentMethod: "PIX",
    paymentDate: today(),
    paymentStatus: "Pago",
    installments: "2",
    firstDueDate: today(),
    fixedDueDay: "",
    notes: ""
  };
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState(null);
  const [salesRecords, setSalesRecords] = useTenantPersistentState("gestao_mesa_sales_records", activeCompanyId, [], legacyCompanyId);
  const [saleForm, setSaleForm] = useState(emptySaleForm);
  const [saleItems, setSaleItems] = useState([{ menuItemId: "", quantity: 1, unitPrice: 0, discount: 0 }]);
  const [salesFilters, setSalesFilters] = useState({ periodStart: "", periodEnd: "", customer: "", saleType: "Todos", paymentMethod: "Todos", status: "Todos", item: "" });
  const [selectedSale, setSelectedSale] = useState(null);

  useEffect(() => {
    const migrationKey = "gestao_mesa_migration_dashboard_module_v1";
    if (localStorage.getItem(migrationKey)) return;

    setClients((currentClients) => currentClients.map((client) => ({
      ...client,
      enabledModules: Array.from(new Set(["acompanhamento", ...(client.enabledModules || [])]))
    })));
    localStorage.setItem(migrationKey, "true");
  }, [setClients]);

  useEffect(() => {
    const migrationKey = "gestao_mesa_migration_billing_module_v1";
    if (localStorage.getItem(migrationKey)) return;

    setClients((currentClients) => currentClients.map((client) => ({
      ...client,
      enabledModules: Array.from(new Set([...(client.enabledModules || []), "faturamento"]))
    })));
    setUsers((currentUsers) => currentUsers.map((user) => user.userType === "client" ? {
      ...user,
      allowedModules: Array.from(new Set([...(user.allowedModules || ["checklist", "faturamento", "acesso"]), "faturamento"]))
    } : user));
    localStorage.setItem(migrationKey, "true");
  }, [setClients, setUsers]);

  useEffect(() => {
    const migrationKey = "gestao_mesa_migration_sales_module_v1";
    if (localStorage.getItem(migrationKey)) return;

    setClients((currentClients) => currentClients.map((client) => ({
      ...client,
      enabledModules: Array.from(new Set([...(client.enabledModules || []), "vendas"]))
    })));
    setUsers((currentUsers) => currentUsers.map((user) => user.userType === "client" ? {
      ...user,
      allowedModules: Array.from(new Set([...(user.allowedModules || ["checklist", "vendas", "faturamento", "acesso"]), "vendas"]))
    } : user));
    localStorage.setItem(migrationKey, "true");
  }, [setClients, setUsers]);
  const monthlyRevenue = useMemo(
    () => clients.reduce((sum, client) => sum + Number(client.monthlyFee || 0), 0),
    [clients]
  );
  const outstandingRevenue = useMemo(
    () => clients
      .filter((client) => client.financialStatus !== "Em dia")
      .reduce((sum, client) => sum + Number(client.monthlyFee || 0), 0),
    [clients]
  );
  const platformUsers = useMemo(
    () => users.filter((user) => user.userType === "platform" || (!user.userType && !user.companyId)),
    [users]
  );

  useEffect(() => {
    if (!isLogged) return;
    const code = new URLSearchParams(window.location.search).get("etiqueta");
    if (!code) return;
    setQrActionCode(code);
    setLabelConsumeCode(code);
    setPage("qr-action");
  }, [isLogged]);

  async function handleLogin(event) {
    event.preventDefault();

    const fallbackUsers = [
      ...users.map((user) => {
        const initialUser = initialUsers.find((current) => current.email.toLowerCase() === user.email?.toLowerCase());
        return initialUser && !user.password ? { ...initialUser, ...user, password: initialUser.password } : user;
      }),
      ...initialUsers.filter((initialUser) => !users.some((user) => user.email?.toLowerCase() === initialUser.email.toLowerCase()))
    ];
    const fallbackClients = [
      ...clients,
      ...initialClients.filter((initialClient) => !clients.some((client) => client.id === initialClient.id))
    ];

    let user = null;

    if (canUseAppDataApi()) {
      try {
        const data = await loginAppUser(login);
        user = data?.user || null;
      } catch {
        user = null;
      }
    } else {
      user = authenticateUser(login, fallbackUsers, fallbackClients);
    }

    if (!user) {
      alert("Usuário ou senha inválidos, ou usuário inativo.");
      return;
    }

    const nextPage = getInitialPageForUser(user);

    setLoggedUser(user);
    setIsLogged(true);
    setPage(nextPage);

    persistSession(user, nextPage);
  }

  function handleLogoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Envie um arquivo de imagem para a logo.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setClientForm((currentForm) => ({ ...currentForm, logo: reader.result }));
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function removeClientLogo() {
    setClientForm((currentForm) => ({ ...currentForm, logo: "" }));
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

  async function saveClient(event) {
    event.preventDefault();

    if (!clientForm.companyName.trim()) {
      alert("Informe o nome da empresa contratante.");
      return;
    }

    if (editingClientId) {
      const updatedClient = {
        ...clients.find((client) => client.id === editingClientId),
        ...clientForm,
        id: editingClientId,
        companyName: clientForm.companyName.trim(),
        fantasyName: clientForm.fantasyName.trim() || clientForm.companyName.trim(),
        monthlyFee: Number(clientForm.monthlyFee || 0)
      };

      if (canUseAppDataApi()) {
        try {
          await saveAppClient(updatedClient);
        } catch (error) {
          alert(`Não foi possível salvar no banco: ${error.message}`);
          return;
        }
      }

      setClients(
        clients.map((client) =>
          client.id === editingClientId ? updatedClient : client
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
      status: clientForm.status || "Ativo"
    };

    if (canUseAppDataApi()) {
      try {
        await saveAppClient(newClient);
      } catch (error) {
        alert(`Não foi possível salvar no banco: ${error.message}`);
        return;
      }
    }

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
      financialStatus: client.financialStatus || "Em dia",
      themeColor: client.themeColor || "#0b2f4f",
      status: client.status || "Ativo",
      enabledModules: client.enabledModules || ["acompanhamento", "estoque", "checklist", "faturamento", "etiquetas"]
    });
    setPage("clients");
  }

  async function deleteClient(clientId) {
    if (!confirm("Deseja excluir este cliente?")) return;
    if (canUseAppDataApi()) {
      try {
        await removeAppClient(clientId);
      } catch (error) {
        alert(`Não foi possível excluir no banco: ${error.message}`);
        return;
      }
    }
    setClients(clients.filter((client) => client.id !== clientId));
  }

  async function toggleClientStatus(clientId) {
    const currentClient = clients.find((client) => client.id === clientId);
    if (!currentClient) return;
    const updatedClient = { ...currentClient, status: currentClient.status === "Ativo" ? "Inativo" : "Ativo" };

    if (canUseAppDataApi()) {
      try {
        await saveAppClient(updatedClient);
      } catch (error) {
        alert(`Não foi possível atualizar no banco: ${error.message}`);
        return;
      }
    }

    setClients(clients.map((client) => client.id === clientId ? updatedClient : client));
  }

  function openClientWorkspace(clientId) {
    setViewedClientId(clientId);
    setPage("hub");
  }

  async function saveUser(event) {
    event.preventDefault();

    if (!userForm.name.trim()) {
      alert("Informe o nome do usuário.");
      return;
    }

    if (!userForm.email.trim()) {
      alert("Informe o e-mail do usuário.");
      return;
    }

    if (!editingUserId && !userForm.password.trim()) {
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
      const existingUser = users.find((user) => user.id === editingUserId);
      const updatedUser = {
        ...existingUser,
        ...userForm,
        id: editingUserId,
        password: userForm.password || existingUser?.password || "",
        userType: "platform",
        companyId: null
      };

      let savedUser = updatedUser;
      if (canUseAppDataApi()) {
        try {
          savedUser = await saveAppUser(updatedUser);
        } catch (error) {
          alert(`Não foi possível salvar no banco: ${error.message}`);
          return;
        }
      }

      setUsers(users.map((user) => (user.id === editingUserId ? { ...user, ...savedUser } : user)));

      if (loggedUser?.id === editingUserId) {
        setLoggedUser({ ...loggedUser, ...savedUser });
      }

      setEditingUserId(null);
      setUserForm(emptyUserForm);
      return;
    }

    const newUser = {
      id: crypto.randomUUID(),
      ...userForm,
      userType: "platform",
      companyId: null,
      createdAt: new Date().toLocaleDateString("pt-BR")
    };

    let savedUser = newUser;
    if (canUseAppDataApi()) {
      try {
        savedUser = await saveAppUser(newUser);
      } catch (error) {
        alert(`Não foi possível salvar no banco: ${error.message}`);
        return;
      }
    }

    setUsers([savedUser, ...users]);

    setUserForm(emptyUserForm);
  }

  function editUser(user) {
    setEditingUserId(user.id);
    setUserForm({
      name: user.name,
      email: user.email,
      password: user.password || "",
      profile: user.profile,
      status: user.status
    });
  }

  async function deleteUser(userId) {
    if (loggedUser?.id === userId) {
      alert("Você não pode excluir o usuário que está logado.");
      return;
    }

    if (!confirm("Deseja excluir este usuário?")) return;
    if (canUseAppDataApi()) {
      try {
        await removeAppUser(userId);
      } catch (error) {
        alert(`Não foi possível excluir no banco: ${error.message}`);
        return;
      }
    }
    setUsers(users.filter((user) => user.id !== userId));
  }

  function logout() {
    clearSession();
    setLogin({ email: "", password: "" });
  }


  const stockItemsView = useMemo(() => {
    return stockItems.map((item) => {
      const category = item.category || stockCategories.find((cat) => cat.id === item.categoryId)?.name || "Sem categoria";
      const stockUnit = baseUnitFor(item.unit);
      const itemLots = stockLots.filter((lot) => lot.itemId === item.id && Number(lot.quantity || 0) > 0);
      const totalStock = itemLots
        .reduce((sum, lot) => sum + Number(lot.quantity || 0), 0);
      const nextExpiryLot = item.controlsExpiry === "Não" ? null : itemLots
        .filter((lot) => lot.expiryDate)
        .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))[0];
      const mainLocation = itemLots[0]?.location || item.location || "Sem local";
      const supplier = itemLots[0]?.supplier || item.supplier || "Sem fornecedor";
      const unitCost = Number(item.unitCost ?? itemLots[0]?.unitCost ?? 0);
      const totalValue = itemLots.reduce((sum, lot) => sum + Number(lot.quantity || 0) * Number(lot.unitCost ?? unitCost ?? 0), 0);
      const lastMovement = stockMovements
        .filter((lot) => lot.itemId === item.id)
        .sort((a, b) => new Date(b.createdAtIso || b.createdAt || 0) - new Date(a.createdAtIso || a.createdAt || 0))[0];
      const minStock = Number(item.minStock || 0);
      const hasExpired = itemLots.some((lot) => lot.expiryDate && diffDays(lot.expiryDate) < 0);
      const hasExpiring = itemLots.some((lot) => {
        const days = lot.expiryDate ? diffDays(lot.expiryDate) : 9999;
        return days >= 0 && days <= stockAlertDays;
      });
      const status = hasExpired
        ? "Vencido"
        : minStock > 0 && totalStock <= minStock * 0.5
          ? "Crítico"
          : minStock > 0 && totalStock <= minStock
            ? "Atenção"
            : hasExpiring
              ? "Atenção"
              : "Normal";

      return {
        ...item,
        productStatus: item.status || "Ativo",
        category,
        stockUnit,
        hasStockEntry: stockLots.some((lot) => lot.itemId === item.id),
        totalStock,
        nextExpiry: nextExpiryLot?.expiryDate || "",
        mainLocation,
        supplier,
        unitCost,
        totalValue,
        status,
        lastMovementAt: lastMovement?.createdAtIso || lastMovement?.createdAt || item.createdAt || ""
      };
    });
  }, [stockItems, stockCategories, stockLots, stockMovements, stockAlertDays]);

  const filteredStockItems = useMemo(() => {
    const query = stockSearch.trim().toLowerCase();
    const now = new Date();

    return stockItemsView.filter((item) => {
      const matchesQuery = `${item.name} ${item.category} ${item.type} ${item.internalCode || ""} ${item.barcode || ""}`.toLowerCase().includes(query);
      const matchesCategory = stockFilters.category === "Todos" || item.categoryId === stockFilters.category || item.category === stockFilters.category;
      const matchesSupplier = stockFilters.supplier === "Todos" || item.supplier === stockFilters.supplier;
      const matchesLocation = stockFilters.location === "Todos" || item.mainLocation === stockFilters.location;
      const matchesStatus = stockFilters.status === "Todos" || item.status === stockFilters.status;
      const daysSinceMovement = item.lastMovementAt ? Math.floor((now - new Date(item.lastMovementAt)) / (1000 * 60 * 60 * 24)) : 999;
      const matchesQuick =
        stockQuickFilter === "todos" ||
        (stockQuickFilter === "baixo" && (item.status === "Atenção" || item.status === "Crítico")) ||
        (stockQuickFilter === "vencendo" && item.nextExpiry && diffDays(item.nextExpiry) >= 0 && diffDays(item.nextExpiry) <= stockAlertDays) ||
        (stockQuickFilter === "vencidos" && item.status === "Vencido") ||
        (stockQuickFilter === "sem-movimento" && daysSinceMovement >= 30);

      const isStockProduct = item.type === "Produto" || item.type === "Item";
      return isStockProduct && matchesQuery && matchesCategory && matchesSupplier && matchesLocation && matchesStatus && matchesQuick && item.productStatus !== "Inativo";
    });
  }, [stockItemsView, stockSearch, stockFilters, stockQuickFilter, stockAlertDays]);

  const stockOperationalFilteredItems = useMemo(() => {
    const query = stockSearch.trim().toLowerCase();
    const now = new Date();

    return stockItemsView.filter((item) => {
      const matchesQuery = `${item.name} ${item.category} ${item.type} ${item.internalCode || ""} ${item.barcode || ""}`.toLowerCase().includes(query);
      const matchesCategory = stockFilters.category === "Todos" || item.categoryId === stockFilters.category || item.category === stockFilters.category;
      const matchesSupplier = stockFilters.supplier === "Todos" || item.supplier === stockFilters.supplier;
      const matchesLocation = stockFilters.location === "Todos" || item.mainLocation === stockFilters.location;
      const matchesStatus = stockFilters.status === "Todos" || item.status === stockFilters.status;
      const daysSinceMovement = item.lastMovementAt ? Math.floor((now - new Date(item.lastMovementAt)) / (1000 * 60 * 60 * 24)) : 999;
      const matchesQuick =
        stockQuickFilter === "todos" ||
        (stockQuickFilter === "baixo" && (item.status === "Atenção" || item.status === "Crítico")) ||
        (stockQuickFilter === "vencendo" && item.nextExpiry && diffDays(item.nextExpiry) >= 0 && diffDays(item.nextExpiry) <= stockAlertDays) ||
        (stockQuickFilter === "vencidos" && item.status === "Vencido") ||
        (stockQuickFilter === "sem-movimento" && daysSinceMovement >= 30);

      const isStockProduct = item.type === "Produto" || item.type === "Item";
      return isStockProduct && item.hasStockEntry && matchesQuery && matchesCategory && matchesSupplier && matchesLocation && matchesStatus && matchesQuick;
    });
  }, [stockItemsView, stockSearch, stockFilters, stockQuickFilter, stockAlertDays]);

  const filteredRegisteredItems = useMemo(() => {
    const query = stockSearch.trim().toLowerCase();

    return stockItemsView.filter((item) => {
      const matchesQuery = `${item.name} ${item.category} ${item.type} ${item.internalCode || ""} ${item.barcode || ""} ${item.status || ""}`.toLowerCase().includes(query);
      const isRegisteredItem = item.type === "Produto" || item.type === "Item" || item.type === "Processo" || item.type === "Atividade";
      return isRegisteredItem && matchesQuery;
    });
  }, [stockItemsView, stockSearch]);

  const stockDashboard = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const activeProducts = stockItemsView.filter((item) => item.productStatus !== "Inativo" && item.hasStockEntry);
    const lossMonth = stockLosses
      .filter((loss) => {
        const date = new Date(loss.createdAtIso || loss.createdAt || 0);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      })
      .reduce((sum, loss) => sum + Number(loss.totalValue || 0), 0);

    return {
      totalValue: activeProducts.reduce((sum, item) => sum + Number(item.totalValue || 0), 0),
      lowStock: activeProducts.filter((item) => item.status === "Atenção" || item.status === "Crítico").length,
      expiring: activeProducts.filter((item) => item.nextExpiry && diffDays(item.nextExpiry) >= 0 && diffDays(item.nextExpiry) <= stockAlertDays).length,
      expired: activeProducts.filter((item) => item.status === "Vencido").length,
      stale: activeProducts.filter((item) => {
        if (!item.lastMovementAt) return true;
        return Math.floor((now - new Date(item.lastMovementAt)) / (1000 * 60 * 60 * 24)) >= 30;
      }).length,
      lossMonth
    };
  }, [stockItemsView, stockLosses, stockAlertDays]);

  function supplierRecord(supplier) {
    if (typeof supplier === "string") {
      const id = `legacy-${supplier.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}`;
      return {
        id,
        corporateName: supplier,
        fantasyName: supplier,
        document: "",
        categoryId: "",
        status: "Ativo"
      };
    }

    const fallbackName = supplier.corporateName || supplier.name || supplier.fantasyName || supplier.document || "fornecedor";
    const id = supplier.id || `legacy-${String(fallbackName).toLowerCase().replace(/[^a-z0-9]+/gi, "-")}`;

    return {
      id,
      corporateName: supplier.corporateName || supplier.name || supplier.fantasyName || "",
      fantasyName: supplier.fantasyName || supplier.name || supplier.corporateName || "",
      document: supplier.document || "",
      categoryId: supplier.categoryId || "",
      status: supplier.status || "Ativo"
    };
  }

  function supplierDisplayName(supplier) {
    const record = supplierRecord(supplier);
    return record.fantasyName || record.corporateName;
  }

  function normalizedSuppliers() {
    return stockSuppliers.map(supplierRecord);
  }


  async function persistBillingData(nextCustomers = billingCustomers, nextCharges = billingCharges, options = {}) {
    if (!canUseAppDataApi() || !activeCompanyId) return true;
    try {
      await saveClientBillingData(activeCompanyId, {
        customers: nextCustomers,
        charges: nextCharges
      });
      return true;
    } catch (error) {
      if (!options.silent) alert(`Faturamento salvo neste computador, mas nao sincronizado no banco: ${error.message}`);
      return false;
    }
  }

  useEffect(() => {
    if (!canUseAppDataApi() || !activeCompanyId || !isLogged || !getApiSessionToken()) return;
    let active = true;

    loadClientBillingData(activeCompanyId)
      .then(async (data) => {
        if (!active || !data) return;
        const remoteCustomers = Array.isArray(data.customers) ? data.customers : [];
        const remoteCharges = Array.isArray(data.charges) ? data.charges : [];
        if (remoteCustomers.length || remoteCharges.length) {
          setBillingCustomers(remoteCustomers);
          setBillingCharges(remoteCharges);
          return;
        }
        const localCustomers = readTenantStoredValue("gestao_mesa_billing_customers", activeCompanyId, billingCustomers);
        const localCharges = readTenantStoredValue("gestao_mesa_billing_charges", activeCompanyId, billingCharges);
        if ((Array.isArray(localCustomers) && localCustomers.length) || (Array.isArray(localCharges) && localCharges.length)) {
          await saveClientBillingData(activeCompanyId, {
            customers: Array.isArray(localCustomers) ? localCustomers : [],
            charges: Array.isArray(localCharges) ? localCharges : []
          });
        }
      })
      .catch((error) => console.warn("Falha ao sincronizar faturamento:", error.message));

    return () => {
      active = false;
    };
  }, [activeCompanyId, isLogged]);

  async function persistSalesData(nextSales = salesRecords, options = {}) {
    if (!canUseAppDataApi() || !activeCompanyId) return true;
    try {
      await saveClientSalesData(activeCompanyId, { sales: nextSales });
      return true;
    } catch (error) {
      if (!options.silent) alert(`Venda salva neste computador, mas nao sincronizada no banco: ${error.message}`);
      return false;
    }
  }

  useEffect(() => {
    if (!canUseAppDataApi() || !activeCompanyId || !isLogged || !getApiSessionToken()) return;
    let active = true;

    loadClientSalesData(activeCompanyId)
      .then(async (data) => {
        if (!active || !data) return;
        const remoteSales = Array.isArray(data.sales) ? data.sales : [];
        if (remoteSales.length) {
          setSalesRecords(remoteSales);
          return;
        }
        const localSales = readTenantStoredValue("gestao_mesa_sales_records", activeCompanyId, salesRecords);
        if (Array.isArray(localSales) && localSales.length) {
          await saveClientSalesData(activeCompanyId, { sales: localSales });
        }
      })
      .catch((error) => console.warn("Falha ao sincronizar vendas:", error.message));

    return () => {
      active = false;
    };
  }, [activeCompanyId, isLogged]);
  function resetMenuItemForm() {
    setMenuItemForm({ ...emptyMenuItemForm, portions: [{ stockItemId: "", quantity: "", unit: "g" }] });
    setEditingMenuItemId(null);
    setShowMenuItemModal(false);
  }

  function handleMenuImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Envie uma imagem do produto.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setMenuItemForm((current) => ({ ...current, image: reader.result, imageName: file.name }));
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function updateMenuPortion(index, field, value) {
    const portions = menuItemForm.portions.map((portion, currentIndex) => currentIndex === index ? { ...portion, [field]: value } : portion);
    if (field === "stockItemId") {
      const selected = stockItemsView.find((item) => item.id === value);
      portions[index].unit = compatibleUnitsFor(selected?.unit || "g")[0];
    }
    setMenuItemForm({ ...menuItemForm, portions });
  }

  function addMenuPortion() {
    setMenuItemForm({ ...menuItemForm, portions: [...menuItemForm.portions, { stockItemId: "", quantity: "", unit: "g" }] });
  }

  function removeMenuPortion(index) {
    const portions = menuItemForm.portions.filter((_, currentIndex) => currentIndex !== index);
    setMenuItemForm({ ...menuItemForm, portions: portions.length ? portions : [{ stockItemId: "", quantity: "", unit: "g" }] });
  }

  async function saveMenuItem(event) {
    event.preventDefault();
    const dishName = menuItemForm.dishName.trim();
    if (!dishName) return alert("Informe o prato/produto do menu.");
    if (!menuItemForm.saleValue || parseMoneyValue(menuItemForm.saleValue) <= 0) return alert("Informe o valor de venda.");

    const portions = menuItemForm.portions
      .filter((portion) => portion.stockItemId && Number(portion.quantity) > 0)
      .map((portion) => {
        const item = stockItemsView.find((currentItem) => currentItem.id === portion.stockItemId);
        return {
          stockItemId: portion.stockItemId,
          stockItemName: item?.name || "",
          quantity: Number(portion.quantity || 0),
          unit: portion.unit
        };
      });

    const record = {
      id: editingMenuItemId || crypto.randomUUID(),
      dishName,
      type: menuItemForm.type,
      netValue: parseMoneyValue(menuItemForm.netValue),
      grossValue: parseMoneyValue(menuItemForm.grossValue),
      interestValue: parseMoneyValue(menuItemForm.interestValue),
      saleValue: parseMoneyValue(menuItemForm.saleValue),
      image: menuItemForm.image,
      imageName: menuItemForm.imageName,
      portions,
      status: menuItemForm.status || "Ativo",
      updatedAt: new Date().toISOString(),
      createdAt: editingMenuItemId ? menuItems.find((item) => item.id === editingMenuItemId)?.createdAt : new Date().toISOString()
    };

    const nextMenuItems = editingMenuItemId
      ? menuItems.map((item) => item.id === editingMenuItemId ? record : item)
      : [record, ...menuItems];
    setMenuItems(nextMenuItems);
    await persistStockCatalog(stockCategories, stockItems, stockSuppliers, nextMenuItems, { silent: true });
    resetMenuItemForm();
  }

  function editMenuItem(item) {
    setMenuItemForm({
      ...emptyMenuItemForm,
      ...item,
      netValue: item.netValue || "",
      grossValue: item.grossValue || "",
      interestValue: item.interestValue || "",
      saleValue: item.saleValue || "",
      portions: item.portions?.length ? item.portions : [{ stockItemId: "", quantity: "", unit: "g" }]
    });
    setEditingMenuItemId(item.id);
    setShowMenuItemModal(true);
  }

  function deleteMenuItem(menuItemId) {
    if (!confirm("Deseja excluir este item do menu?")) return;
    const nextMenuItems = menuItems.filter((item) => item.id !== menuItemId);
    setMenuItems(nextMenuItems);
    persistStockCatalog(stockCategories, stockItems, stockSuppliers, nextMenuItems, { silent: true });
  }
  async function addStockCategory(event) {
    event.preventDefault();
    const name = stockCategoryName.trim();
    if (!name) return alert("Informe o nome da categoria.");
    if (stockCategories.some((category) => category.name.toLowerCase() === name.toLowerCase())) {
      return alert("Categoria já cadastrada.");
    }
    const nextCategories = [...stockCategories, { id: crypto.randomUUID(), name }];
    setStockCategories(nextCategories);
    await persistStockCatalog(nextCategories, stockItems);
    setStockCategoryName("");
    setShowStockCategoryModal(false);
  }

  async function deleteStockCategory(categoryId) {
    if (stockItems.some((item) => item.categoryId === categoryId)) {
      alert("Não é possível excluir categoria vinculada a cadastro.");
      return;
    }
    const nextCategories = stockCategories.filter((category) => category.id !== categoryId);
    setStockCategories(nextCategories);
    await persistStockCatalog(nextCategories, stockItems);
  }

  async function saveStockSupplier(event) {
    event.preventDefault();

    const corporateName = stockSupplierForm.corporateName.trim();
    const fantasyName = stockSupplierForm.fantasyName.trim();
    const document = stockSupplierForm.document.trim();

    if (!corporateName) return alert("Informe a razão social.");
    if (!fantasyName) return alert("Informe o nome fantasia.");
    if (!stockSupplierForm.categoryId) return alert("Selecione a categoria de produto.");

    const suppliers = normalizedSuppliers();
    if (suppliers.some((supplier) => supplier.id !== editingStockSupplierId && document && supplier.document === document)) {
      return alert("Já existe fornecedor com este CNPJ.");
    }
    if (suppliers.some((supplier) => supplier.id !== editingStockSupplierId && supplier.fantasyName.toLowerCase() === fantasyName.toLowerCase())) {
      return alert("Fornecedor já cadastrado.");
    }

    const record = {
      id: editingStockSupplierId || crypto.randomUUID(),
      corporateName,
      fantasyName,
      document,
      categoryId: stockSupplierForm.categoryId,
      status: stockSupplierForm.status || "Ativo"
    };

    const nextSuppliers = editingStockSupplierId
      ? suppliers.map((supplier) => supplier.id === editingStockSupplierId ? record : supplier)
      : [record, ...suppliers];

    setStockSuppliers(nextSuppliers);
    await persistStockCatalog(stockCategories, stockItems, nextSuppliers);

    setStockSupplierForm(emptySupplierForm);
    setEditingStockSupplierId(null);
    setShowStockSupplierModal(false);
  }

  function editStockSupplier(supplier) {
    const record = supplierRecord(supplier);
    setEditingStockSupplierId(record.id);
    setStockSupplierForm({
      corporateName: record.corporateName,
      fantasyName: record.fantasyName,
      document: record.document,
      categoryId: record.categoryId,
      status: record.status
    });
  }

  async function deleteStockSupplier(supplierId) {
    const suppliers = normalizedSuppliers();
    const supplier = suppliers.find((item) => item.id === supplierId);
    const names = supplier ? [supplier.fantasyName, supplier.corporateName].filter(Boolean) : [];

    if (stockLots.some((lot) => names.includes(lot.supplier) || lot.supplierId === supplierId)) {
      alert("Não é possível excluir fornecedor vinculado a entrada de estoque.");
      return;
    }
    if (!confirm("Deseja excluir este fornecedor?")) return;
    const nextSuppliers = suppliers.filter((item) => item.id !== supplierId);
    setStockSuppliers(nextSuppliers);
    await persistStockCatalog(stockCategories, stockItems, nextSuppliers);
  }

  async function saveStockItem(event) {
    event.preventDefault();

    if (!stockItemForm.name.trim()) return alert("Informe o nome.");
    if (!stockItemForm.categoryId) return alert("Selecione uma categoria.");

    if (editingStockItemId) {
      const currentItem = stockItems.find((item) => item.id === editingStockItemId);
      const hasStockLots = stockLots.some((lot) => lot.itemId === editingStockItemId);

      if (hasStockLots && baseUnitFor(currentItem?.unit) !== baseUnitFor(stockItemForm.unit)) {
        return alert("Este produto possui estoque lançado. Mantenha uma unidade compatível para preservar os cálculos.");
      }

      const nextItems = stockItems.map((item) =>
        item.id === editingStockItemId
          ? {
              ...item,
              ...stockItemForm,
              name: stockItemForm.name.trim(),
              minStock: normalizeDecimal(stockItemForm.minStock),
              maxStock: normalizeDecimal(stockItemForm.maxStock),
              unitCost: normalizeDecimal(stockItemForm.unitCost),
              defaultQuantity: 0,
              defaultValidityDays: 0
            }
          : item
      );

      setStockItems(nextItems);
      await persistStockCatalog(stockCategories, nextItems);

      resetStockItemForm();
      closeStockModal();
      return;
    }

    const newItem = {
      id: crypto.randomUUID(),
      ...stockItemForm,
      name: stockItemForm.name.trim(),
      minStock: normalizeDecimal(stockItemForm.minStock),
      maxStock: normalizeDecimal(stockItemForm.maxStock),
      unitCost: normalizeDecimal(stockItemForm.unitCost),
      defaultQuantity: 0,
      defaultValidityDays: 0,
      createdAt: new Date().toLocaleString("pt-BR")
    };

    const nextItems = [newItem, ...stockItems];
    setStockItems(nextItems);
    await persistStockCatalog(stockCategories, nextItems);
    resetStockItemForm({
      type: stockItemForm.type,
      categoryId: stockItemForm.categoryId
    });
    closeStockModal();
  }

  function resetStockItemForm(overrides = {}) {
    setStockItemForm({
      name: "",
      type: overrides.type || "Produto",
      categoryId: overrides.categoryId || "",
      internalCode: "",
      barcode: "",
      unit: "kg",
      minStock: "",
      maxStock: "",
      unitCost: "",
      controlsExpiry: "Sim",
      status: "Ativo",
      defaultQuantity: 0,
      defaultValidityDays: 0
    });
    setEditingStockItemId(null);
  }

  function editStockItem(item) {
    setEditingStockItemId(item.id);
    setStockItemForm({
      name: item.name || "",
      type: item.type || "Produto",
      categoryId: item.categoryId || "",
      internalCode: item.internalCode || "",
      barcode: item.barcode || "",
      unit: item.unit || "kg",
      minStock: item.minStock || "",
      maxStock: item.maxStock || "",
      unitCost: item.unitCost || "",
      controlsExpiry: item.controlsExpiry || "Sim",
      status: item.productStatus || item.status || "Ativo",
      defaultQuantity: 0,
      defaultValidityDays: 0
    });
    setStockModal("product");
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

    if (editingStockLotId) {
      setStockLots(stockLots.map((lot) =>
        lot.id === editingStockLotId
          ? {
              ...lot,
              itemId: stockEntryForm.itemId,
              quantity: converted.quantity,
              initialQuantity: converted.quantity,
              unit: converted.unit,
              inputQuantity: normalizeDecimal(stockEntryForm.quantity),
              inputUnit: stockEntryForm.quantityUnit,
              expiryDate: stockEntryForm.expiryDate
            }
          : lot
      ));
      resetStockEntryForm();
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

    resetStockEntryForm();
  }

  function resetStockEntryForm() {
    setStockEntryForm({
      itemId: "",
      categoryId: "",
      quantity: "",
      quantityUnit: "g",
      supplier: "",
      batchCode: "",
      expiryDate: "",
      unitCost: "",
      location: "Estoque seco",
      note: "",
      invoiceFileName: ""
    });
    setStockEntryCategorySearch("");
    setStockEntryProductSearch("");
    setEditingStockLotId(null);
    setShowStockEntryForm(false);
  }

  function deleteStockLot(lotId) {
    if (!confirm("Deseja excluir este lançamento de estoque?")) return;
    setStockLots(stockLots.filter((lot) => lot.id !== lotId));
  }

  function editStockLot(lot) {
    const item = stockItemsView.find((currentItem) => currentItem.id === lot.itemId);
    const category = stockCategories.find((currentCategory) => currentCategory.id === item?.categoryId);
    setEditingStockLotId(lot.id);
    setShowStockEntryForm(true);
    setStockPage("estoque");
    setStockEntryForm({
      itemId: lot.itemId || "",
      categoryId: item?.categoryId || "",
      quantity: lot.inputQuantity ?? lot.quantity ?? "",
      quantityUnit: lot.inputUnit || lot.unit || "g",
      supplier: lot.supplier || "",
      batchCode: lot.batchCode || "",
      expiryDate: lot.expiryDate || "",
      unitCost: lot.unitCost || "",
      location: lot.location || "Estoque seco",
      note: lot.note || "",
      invoiceFileName: lot.invoiceFileName || ""
    });
    setStockEntryCategorySearch(category ? category.name : item?.category || "");
    setStockEntryProductSearch(item ? `${item.name} | ${item.category} | ${item.internalCode || item.barcode || "sem código"}` : "");
  }

  function currentOperatorName() {
    return loggedUser?.name || loggedUser?.email || "Usuário não identificado";
  }

  function movementPayload(payload) {
    const now = new Date();
    return {
      id: crypto.randomUUID(),
      createdAt: now.toLocaleString("pt-BR"),
      createdAtIso: now.toISOString(),
      userId: loggedUser?.id || "",
      userName: currentOperatorName(),
      ...payload
    };
  }

  function appendStockMovement(payload) {
    setStockMovements((current) => [movementPayload(payload), ...current]);
  }

  function activeStockProducts() {
    return stockItemsView.filter((item) => (item.type === "Produto" || item.type === "Item") && item.productStatus !== "Inativo");
  }

  function ensureSupplier(name) {
    const supplier = (name || "Fornecedor padrão").trim();
    if (supplier && !normalizedSuppliers().some((item) => supplierDisplayName(item).toLowerCase() === supplier.toLowerCase())) {
      setStockSuppliers([...normalizedSuppliers(), { id: crypto.randomUUID(), corporateName: supplier, fantasyName: supplier, document: "", categoryId: "", status: "Ativo" }]);
    }
    return supplier;
  }

  function ensureLocation(name) {
    const location = (name || "Estoque seco").trim();
    if (location && !stockLocations.some((item) => item.toLowerCase() === location.toLowerCase())) {
      setStockLocations([...stockLocations, location]);
    }
    return location;
  }

  function stockLotsForConsumption(itemId, location = "") {
    return stockLots
      .filter((lot) => lot.itemId === itemId && Number(lot.quantity || 0) > 0 && (!location || lot.location === location))
      .sort((a, b) => {
        const dateA = a.expiryDate ? new Date(a.expiryDate).getTime() : Number.MAX_SAFE_INTEGER;
        const dateB = b.expiryDate ? new Date(b.expiryDate).getTime() : Number.MAX_SAFE_INTEGER;
        return dateA - dateB;
      });
  }

  function consumeStockLots({ item, quantity, location, allowExpired = false, note = "", movementType = "Saída", reason = "Saída", skipMovement = false }) {
    let remaining = Number(quantity || 0);
    const eligibleLots = stockLotsForConsumption(item.id, location);
    const available = eligibleLots.reduce((sum, lot) => sum + Number(lot.quantity || 0), 0);

    if (available < remaining) {
      alert(`Saldo insuficiente. Disponível em ${location || "todos os locais"}: ${formatStockDisplay(available, item.stockUnit)}.`);
      return null;
    }

    if (!allowExpired) {
      const expiredLot = eligibleLots.find((lot) => lot.expiryDate && diffDays(lot.expiryDate) < 0);
      if (expiredLot && !confirm("Há lote vencido na regra FEFO. Deseja consumir mesmo assim com justificativa na observação?")) {
        return null;
      }
    }

    const consumedLots = [];
    const nextLots = stockLots.map((lot) => {
      if (remaining <= 0 || !eligibleLots.some((eligible) => eligible.id === lot.id)) return lot;
      const used = Math.min(Number(lot.quantity || 0), remaining);
      remaining -= used;
      consumedLots.push({ ...lot, used });
      return { ...lot, quantity: Number(lot.quantity || 0) - used };
    });

    setStockLots(nextLots);
    if (!skipMovement) {
      appendStockMovement({
        itemId: item.id,
        itemName: item.name,
        type: movementType,
        quantity,
        unit: item.stockUnit,
        fromLocation: location,
        toLocation: "",
        reason,
        note,
        lots: consumedLots.map((lot) => ({ lotId: lot.id, batchCode: lot.batchCode || "", quantity: lot.used }))
      });
    }

    return consumedLots;
  }

  function openStockModal(type, item = null) {
    if (type === "product") {
      if (item) editStockItem(item);
      else resetStockItemForm();
    }
    if (type === "entry" && !editingStockLotId) {
      resetStockEntryForm();
    }
    setStockModal(type);
  }

  function closeStockModal() {
    setStockModal(null);
    setEditingStockItemId(null);
  }

  function openStockCadastroAction(type) {
    setAccessCadastroType("produto");
    setPage("acesso");

    if (type === "product") {
      resetStockItemForm();
      setStockCadastroType("produto");
      setStockModal("product");
      return;
    }

    if (type === "category") {
      setStockCadastroType("categoria");
      setShowStockCategoryModal(true);
      return;
    }

    if (type === "menu") {
      setStockCadastroType("menu");
      resetMenuItemForm();
      setShowMenuItemModal(true);
    }
  }

  async function inactivateStockItem(itemId) {
    const currentItem = stockItems.find((item) => item.id === itemId);
    if ((currentItem?.status || "Ativo") === "Inativo") {
      alert("Este cadastro já está inativo.");
      return;
    }

    const hasMovements = stockMovements.some((movement) => movement.itemId === itemId);
    const message = hasMovements
      ? "Este produto possui movimentações/estoque. Apenas o cadastro será inativado; estoque e histórico serão mantidos."
      : "Deseja inativar apenas o cadastro deste produto?";
    if (!confirm(message)) return;
    const nextItems = stockItems.map((currentItem) => currentItem.id === itemId ? { ...currentItem, status: "Inativo" } : currentItem);
    setStockItems(nextItems);
    await persistStockCatalog(stockCategories, nextItems);
    appendStockMovement({
      itemId,
      itemName: currentItem?.name || "Produto",
      type: "Ajuste",
      quantity: 0,
      unit: currentItem?.unit || "",
      fromLocation: "",
      toLocation: "",
      reason: "Produto inativado",
      note: "Exclusão lógica do cadastro"
    });
  }

  async function reactivateStockItem(itemId) {
    const nextItems = stockItems.map((currentItem) => currentItem.id === itemId ? { ...currentItem, status: "Ativo" } : currentItem);
    setStockItems(nextItems);
    await persistStockCatalog(stockCategories, nextItems);
  }

  function removeItemFromStock(itemId) {
    const item = stockItems.find((currentItem) => currentItem.id === itemId);
    const itemLots = stockLots.filter((lot) => lot.itemId === itemId);

    if (itemLots.length === 0) {
      alert("Este produto não possui entradas em estoque para remover.");
      return;
    }

    if (!confirm("Deseja remover este item apenas do estoque? O cadastro do produto será mantido.")) return;

    setStockLots(stockLots.filter((lot) => lot.itemId !== itemId));
    appendStockMovement({
      itemId,
      itemName: item?.name || "Produto",
      type: "Ajuste",
      quantity: 0,
      unit: item?.unit || "",
      fromLocation: "",
      toLocation: "",
      reason: "Removido do estoque",
      note: "Cadastro do produto preservado"
    });
  }

  function saveStockEntryAdvanced(event) {
    event.preventDefault();
    if (!stockEntryForm.itemId) return alert("Selecione um produto.");
    if (!stockEntryForm.quantity || normalizeDecimal(stockEntryForm.quantity) <= 0) return alert("Informe uma quantidade maior que zero.");

    const item = stockItemsView.find((currentItem) => currentItem.id === stockEntryForm.itemId);
    const converted = toBaseUnit(stockEntryForm.quantity, stockEntryForm.quantityUnit);
    if (!item || converted.unit !== item.stockUnit) return alert("Unidade incompatível com o produto.");
    if (item.controlsExpiry !== "Não" && !stockEntryForm.expiryDate) return alert("Informe a validade.");
    if (!stockEntryForm.supplier.trim()) return alert("Selecione um fornecedor cadastrado.");
    const activeSuppliers = normalizedSuppliers().filter((supplier) => supplier.status === "Ativo");
    const supplierInput = stockEntryForm.supplier.trim().toLowerCase();
    const selectedSupplier = activeSuppliers.find((supplier) => {
      const label = `${supplierDisplayName(supplier)} | ${stockCategories.find((category) => category.id === supplier.categoryId)?.name || "Todas categorias"} | ${supplier.document || "sem CNPJ"}`;
      return supplierDisplayName(supplier).toLowerCase() === supplierInput || label.toLowerCase() === supplierInput;
    });
    if (!selectedSupplier) {
      return alert("Fornecedor não cadastrado. Cadastre o fornecedor antes de registrar a entrada.");
    }

    const supplier = supplierDisplayName(selectedSupplier);
    const location = ensureLocation(stockEntryForm.location);
    const unitCost = Number(stockEntryForm.unitCost || item.unitCost || 0);
    const newLot = {
      id: editingStockLotId || crypto.randomUUID(),
      itemId: item.id,
      categoryId: item.categoryId || stockEntryForm.categoryId || "",
      supplierId: selectedSupplier.id,
      quantity: converted.quantity,
      initialQuantity: converted.quantity,
      unit: converted.unit,
      inputQuantity: normalizeDecimal(stockEntryForm.quantity),
      inputUnit: stockEntryForm.quantityUnit,
      supplier,
      batchCode: stockEntryForm.batchCode || `LOTE-${Date.now()}`,
      expiryDate: item.controlsExpiry === "Não" ? "" : stockEntryForm.expiryDate,
      unitCost,
      location,
      note: stockEntryForm.note || "",
      invoiceFileName: stockEntryForm.invoiceFileName || "",
      createdAt: new Date().toLocaleString("pt-BR"),
      createdAtIso: new Date().toISOString()
    };

    setStockLots(editingStockLotId ? stockLots.map((lot) => lot.id === editingStockLotId ? newLot : lot) : [newLot, ...stockLots]);
    appendStockMovement({
      itemId: item.id,
      itemName: item.name,
      type: editingStockLotId ? "Ajuste" : "Entrada",
      quantity: converted.quantity,
      unit: converted.unit,
      fromLocation: "",
      toLocation: location,
      reason: editingStockLotId ? "Correção de entrada" : "Entrada de estoque",
      note: stockEntryForm.note || "",
      supplier,
      batchCode: newLot.batchCode
    });

    resetStockEntryForm();
    closeStockModal();
  }

  function saveStockExit(event) {
    event.preventDefault();
    if (!stockExitForm.itemId) return alert("Selecione um produto.");
    if (!stockExitForm.quantity || normalizeDecimal(stockExitForm.quantity) <= 0) return alert("Informe uma quantidade maior que zero.");
    const item = stockItemsView.find((currentItem) => currentItem.id === stockExitForm.itemId);
    const converted = toBaseUnit(stockExitForm.quantity, stockExitForm.quantityUnit);
    if (!item || converted.unit !== item.stockUnit) return alert("Unidade incompatível com o produto.");
    const consumed = consumeStockLots({
      item,
      quantity: converted.quantity,
      location: stockExitForm.location,
      note: stockExitForm.note,
      movementType: stockExitForm.reason === "Descarte" ? "Descarte" : "Saída",
      reason: stockExitForm.reason
    });
    if (!consumed) return;
    setStockExitForm({ itemId: "", quantity: "", quantityUnit: "g", reason: "Produção", location: "Estoque seco", note: "" });
    closeStockModal();
  }

  function saveStockTransfer(event) {
    event.preventDefault();
    if (!stockTransferForm.itemId) return alert("Selecione um produto.");
    if (stockTransferForm.fromLocation === stockTransferForm.toLocation) return alert("Origem e destino precisam ser diferentes.");
    const item = stockItemsView.find((currentItem) => currentItem.id === stockTransferForm.itemId);
    const converted = toBaseUnit(stockTransferForm.quantity, stockTransferForm.quantityUnit);
    if (!item || converted.unit !== item.stockUnit) return alert("Unidade incompatível com o produto.");
    const consumed = consumeStockLots({
      item,
      quantity: converted.quantity,
      location: stockTransferForm.fromLocation,
      note: stockTransferForm.note,
      movementType: "Transferência",
      reason: "Transferência entre locais",
      skipMovement: true
    });
    if (!consumed) return;

    const destination = ensureLocation(stockTransferForm.toLocation);
    const transferLots = consumed.map((lot) => ({
      id: crypto.randomUUID(),
      itemId: item.id,
      quantity: lot.used,
      initialQuantity: lot.used,
      unit: item.stockUnit,
      inputQuantity: lot.used,
      inputUnit: item.stockUnit,
      supplier: lot.supplier || "",
      batchCode: lot.batchCode || `TRANSF-${Date.now()}`,
      expiryDate: lot.expiryDate || "",
      unitCost: lot.unitCost || item.unitCost || 0,
      location: destination,
      note: stockTransferForm.note || "",
      createdAt: new Date().toLocaleString("pt-BR"),
      createdAtIso: new Date().toISOString()
    }));
    setStockLots((current) => [...transferLots, ...current]);
    appendStockMovement({
      itemId: item.id,
      itemName: item.name,
      type: "Transferência",
      quantity: converted.quantity,
      unit: converted.unit,
      fromLocation: stockTransferForm.fromLocation,
      toLocation: destination,
      reason: "Transferência entre locais",
      note: stockTransferForm.note || ""
    });
    setStockTransferForm({ itemId: "", quantity: "", quantityUnit: "g", fromLocation: "Estoque seco", toLocation: "Cozinha", note: "" });
    closeStockModal();
  }

  function saveStockInventory(event) {
    event.preventDefault();
    if (!stockInventoryForm.itemId) return alert("Selecione um produto.");
    const item = stockItemsView.find((currentItem) => currentItem.id === stockInventoryForm.itemId);
    const counted = toBaseUnit(stockInventoryForm.countedQuantity, stockInventoryForm.quantityUnit);
    if (!item || counted.unit !== item.stockUnit) return alert("Unidade incompatível com o produto.");
    const location = ensureLocation(stockInventoryForm.location);
    const currentQuantity = stockLots
      .filter((lot) => lot.itemId === item.id && lot.location === location)
      .reduce((sum, lot) => sum + Number(lot.quantity || 0), 0);
    const difference = counted.quantity - currentQuantity;

    if (difference >= 0) {
      setStockLots([
        {
          id: crypto.randomUUID(),
          itemId: item.id,
          quantity: difference,
          initialQuantity: difference,
          unit: item.stockUnit,
          inputQuantity: difference,
          inputUnit: item.stockUnit,
          supplier: "Inventário",
          batchCode: `INV-${Date.now()}`,
          expiryDate: "",
          unitCost: item.unitCost || 0,
          location,
          note: stockInventoryForm.note || "",
          createdAt: new Date().toLocaleString("pt-BR"),
          createdAtIso: new Date().toISOString()
        },
        ...stockLots
      ]);
    } else {
      const consumed = consumeStockLots({
        item,
        quantity: Math.abs(difference),
        location,
        allowExpired: true,
        note: stockInventoryForm.note,
        movementType: "Inventário",
        reason: stockInventoryForm.reason
      });
      if (!consumed) return;
    }

    appendStockMovement({
      itemId: item.id,
      itemName: item.name,
      type: "Inventário",
      quantity: difference,
      unit: item.stockUnit,
      fromLocation: location,
      toLocation: location,
      reason: stockInventoryForm.reason,
      note: `Esperado: ${formatStockDisplay(currentQuantity, item.stockUnit)} | Contado: ${formatStockDisplay(counted.quantity, item.stockUnit)}. ${stockInventoryForm.note || ""}`.trim()
    });
    setStockInventoryForm({ itemId: "", location: "Estoque seco", countedQuantity: "", quantityUnit: "g", reason: "Inventário periódico", note: "" });
    closeStockModal();
  }

  function saveStockLoss(event) {
    event.preventDefault();
    if (!stockLossForm.itemId) return alert("Selecione um produto.");
    if (!stockLossForm.quantity || normalizeDecimal(stockLossForm.quantity) <= 0) return alert("Informe a quantidade perdida.");
    if (!stockLossForm.responsible.trim()) return alert("Informe o responsável.");
    const item = stockItemsView.find((currentItem) => currentItem.id === stockLossForm.itemId);
    const converted = toBaseUnit(stockLossForm.quantity, stockLossForm.quantityUnit);
    if (!item || converted.unit !== item.stockUnit) return alert("Unidade incompatível com o produto.");
    const consumed = consumeStockLots({
      item,
      quantity: converted.quantity,
      location: stockLossForm.location,
      allowExpired: true,
      note: stockLossForm.note,
      movementType: "Descarte",
      reason: stockLossForm.reason
    });
    if (!consumed) return;
    const totalValue = consumed.reduce((sum, lot) => sum + Number(lot.used || 0) * Number(lot.unitCost || item.unitCost || 0), 0);
    setStockLosses([
      {
        id: crypto.randomUUID(),
        itemId: item.id,
        itemName: item.name,
        quantity: converted.quantity,
        unit: converted.unit,
        reason: stockLossForm.reason,
        responsible: stockLossForm.responsible,
        location: stockLossForm.location,
        note: stockLossForm.note,
        photoFileName: stockLossForm.photoFileName,
        totalValue,
        createdAt: new Date().toLocaleString("pt-BR"),
        createdAtIso: new Date().toISOString()
      },
      ...stockLosses
    ]);
    setStockLossForm({ itemId: "", quantity: "", quantityUnit: "g", reason: "Vencimento", responsible: "", location: "Estoque seco", note: "", photoFileName: "" });
    closeStockModal();
  }


  function getStockUserSectors(user = stockUserForm) {
    const fromList = Array.isArray(user.sectors) ? user.sectors.filter(Boolean) : [];
    const legacy = user.sector ? [user.sector] : [];
    return Array.from(new Set([...fromList, ...legacy]));
  }

  function isMultiSectorProfile(profile = stockUserForm.profile) {
    return profile === "Gestor" || profile === "Administrador";
  }

  function getSelectedStockUserSectors() {
    const sectors = getStockUserSectors(stockUserForm);
    return isMultiSectorProfile() ? sectors : sectors.slice(0, 1);
  }

  function resetStockUserForm() {
    setStockUserForm({
      name: "",
      email: "",
      password: "",
      profile: "Operação",
      sector: "",
      sectors: [],
      role: "",
      status: "Ativo",
      telegramEnabled: false,
      telegramUsername: "",
      telegramChatId: "",
      telegramPhone: "",
      allowedModules: ["checklist", "faturamento", "acesso"]
    });
    setEditingStockUserId(null);
    setShowStockUserModal(false);
  }

  function toggleStockUserSector(area) {
    const current = getStockUserSectors();
    const next = current.includes(area)
      ? current.filter((item) => item !== area)
      : [...current, area];

    setStockUserForm({
      ...stockUserForm,
      sector: next[0] || "",
      sectors: next
    });
  }

  function editStockUser(user) {
    const sectors = getStockUserSectors(user);
    setEditingStockUserId(user.id);
    setStockUserForm({
      name: user.name || "",
      email: user.email || "",
      password: user.password || "",
      profile: user.profile || "Operação",
      sector: sectors[0] || "",
      sectors,
      role: user.role || "",
      status: user.status || "Ativo",
      telegramEnabled: Boolean(user.telegramEnabled),
      telegramUsername: user.telegramUsername || "",
      telegramChatId: user.telegramChatId || "",
      telegramPhone: user.telegramPhone || "",
      allowedModules: user.allowedModules || ["checklist", "faturamento", "acesso"]
    });
    setShowStockUserModal(true);
  }

  function openStockUserModal() {
    resetStockUserForm();
    setAccessCadastroType("usuario");
    setShowStockUserModal(true);
  }

  function openProcessActivityModal() {
    setProcessActivityForm({
      name: "",
      type: "Processo",
      area: "",
      startTime: "",
      endTime: "",
      repeats: "Não",
      repeatQuantity: "1",
      frequency: "Diário"
    });
    setAccessCadastroType("processo");
    setShowProcessActivityModal(true);
  }

  function closeProcessActivityModal() {
    setShowProcessActivityModal(false);
  }

  function openAreaDepartmentModal() {
    setAreaForm("");
    setAccessCadastroType("area");
    setShowAreaDepartmentModal(true);
  }

  function closeAreaDepartmentModal() {
    setShowAreaDepartmentModal(false);
  }

  function openStockSupplierModal() {
    setStockSupplierForm(emptySupplierForm);
    setEditingStockSupplierId(null);
    setAccessCadastroType("fornecedor");
    setShowStockSupplierModal(true);
  }

  function closeStockSupplierModal() {
    setShowStockSupplierModal(false);
    setStockSupplierForm(emptySupplierForm);
    setEditingStockSupplierId(null);
  }

  async function saveStockUser(event) {
    event.preventDefault();

    const selectedSectors = getSelectedStockUserSectors();
    const currentClient = getCurrentClient();
    const currentCompanyId = currentClient?.id || activeCompanyId;

    if (!stockUserForm.name.trim()) return alert("Informe o nome do usuário.");
    if (!stockUserForm.email.trim()) return alert("Informe o e-mail do usuário.");
    if (!editingStockUserId && !stockUserForm.password.trim()) return alert("Informe a senha do usuário.");
    if (!selectedSectors.length) return alert("Informe ao menos um setor.");
    if (!stockUserForm.role.trim()) return alert("Informe o cargo.");
    if (!currentCompanyId) return alert("Selecione uma empresa antes de cadastrar usuário.");

    if (stockUserForm.telegramEnabled && !stockUserForm.telegramChatId.trim()) {
      return alert("Informe o Chat ID do Telegram para ativar notificações.");
    }

    const emailExists = users.some((user) => user.id !== editingStockUserId && (user.email || "").toLowerCase() === stockUserForm.email.toLowerCase());
    if (emailExists) return alert("Já existe um usuário com este e-mail.");

    const newUserId = editingStockUserId || crypto.randomUUID();
    const existingStockUser = stockUsers.find((user) => user.id === editingStockUserId) || users.find((user) => user.id === editingStockUserId);
    const userRecord = {
      id: newUserId,
      ...stockUserForm,
      password: stockUserForm.password || existingStockUser?.password || "",
      sector: selectedSectors[0] || "",
      sectors: selectedSectors,
      userType: "client",
      companyId: currentCompanyId,
      updatedAt: new Date().toLocaleDateString("pt-BR")
    };

    const employeeRecord = {
      ...userRecord,
      createdAt: existingStockUser?.createdAt || new Date().toLocaleDateString("pt-BR")
    };

    const globalUserRecord = {
      ...userRecord,
      createdAt: users.find((user) => user.id === editingStockUserId)?.createdAt || new Date().toLocaleDateString("pt-BR")
    };

    let savedGlobalUser = globalUserRecord;
    if (canUseAppDataApi()) {
      try {
        savedGlobalUser = await saveAppUser(globalUserRecord);
      } catch (error) {
        alert(`Não foi possível salvar o usuário no banco: ${error.message}`);
        return;
      }
    }

    const savedEmployeeRecord = {
      ...employeeRecord,
      ...savedGlobalUser,
      password: canUseAppDataApi() ? "" : employeeRecord.password
    };
    setStockUsers(editingStockUserId
      ? stockUsers.map((user) => user.id === editingStockUserId ? savedEmployeeRecord : user)
      : [savedEmployeeRecord, ...stockUsers]
    );

    const userAlreadyExists = users.some((user) => user.id === editingStockUserId);
    setUsers(editingStockUserId && userAlreadyExists
      ? users.map((user) => user.id === editingStockUserId ? { ...user, ...savedGlobalUser } : user)
      : [savedGlobalUser, ...users]
    );

    if (loggedUser?.id === editingStockUserId) {
      setLoggedUser({ ...loggedUser, ...savedGlobalUser });
    }

    resetStockUserForm();
    setShowStockUserModal(false);
  }

  async function deleteStockUser(userId) {
    if (!confirm("Deseja excluir este usuário?")) return;
    const userToDelete = users.find((user) => user.id === userId) || stockUsers.find((user) => user.id === userId);
    if (userToDelete?.userType !== "client" || userToDelete?.companyId !== activeCompanyId) {
      alert("Você só pode excluir usuários da sua própria empresa.");
      return;
    }
    if (canUseAppDataApi()) {
      try {
        await removeAppUser(userId);
      } catch (error) {
        alert(`Não foi possível excluir o usuário no banco: ${error.message}`);
        return;
      }
    }
    setStockUsers(stockUsers.filter((user) => user.id !== userId));
    setUsers(users.filter((user) => user.id !== userId));
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

  function shouldShowActivityToday(activity) {
    if (!activity.scheduledDate) return true;

    if (activity.repeats === "Sim" && activity.frequency === "Diário") {
      return activity.scheduledDate <= today();
    }

    if (activity.repeats === "Sim" && activity.frequency === "Semanal") {
      const startDate = new Date(activity.scheduledDate + "T00:00:00");
      const currentDate = new Date(today() + "T00:00:00");
      const diff = Math.floor((currentDate - startDate) / 86400000);
      return diff >= 0 && diff % 7 === 0;
    }

    if (activity.repeats === "Sim" && activity.frequency === "Mensal") {
      const startDate = new Date(activity.scheduledDate + "T00:00:00");
      const currentDate = new Date(today() + "T00:00:00");
      return currentDate >= startDate && currentDate.getDate() === startDate.getDate();
    }

    return activity.scheduledDate === today();
  }

  const checklistActivities = stockItems.filter((item) =>
    (item.type === "Processo" || item.type === "Atividade") && shouldShowActivityToday(item)
  );
  const completedTodayIds = new Set(checklistHistory.filter((record) => record.date === today()).map((record) => record.activityId));
  const checklistAreas = ["Todas", ...Array.from(new Set(checklistActivities.map((activity) => activity.area).filter(Boolean)))];
  const filteredChecklistActivities = checklistActivities.filter((activity) => {
    if (isOperationalUser()) {
      return activity.area === getUserOperationalArea();
    }

    return checklistAreaFilter === "Todas" || activity.area === checklistAreaFilter;
  });

  function checklistStatusFor(activity) {
    if (completedTodayIds.has(activity.id)) return "done";
    if (pendingChecklist[activity.id]) return "pending";
    if (runningChecklist[activity.id]) return "running";
    return "waiting";
  }

  function checklistStatusLabel(activity) {
    const status = checklistStatusFor(activity);
    if (status === "done") return "Concluído";
    if (status === "pending") return "Pendência";
    if (status === "running") return "Em andamento";
    return "A fazer";
  }

  function timeToMinutes(value) {
    const [hours = "99", minutes = "99"] = String(value || "99:99").split(":");
    return Number(hours) * 60 + Number(minutes);
  }

  function sortChecklistActivities(list) {
    return [...list].sort((left, right) => {
      const timeDiff = timeToMinutes(left.startTime) - timeToMinutes(right.startTime);
      if (timeDiff !== 0) return timeDiff;
      return String(left.name || "").localeCompare(String(right.name || ""));
    });
  }

  function nextChecklistActivity(list) {
    return sortChecklistActivities(list).find((activity) => checklistStatusFor(activity) === "waiting") || null;
  }

  function checklistProgressFor(list) {
    const total = list.length;
    const done = list.filter((activity) => completedTodayIds.has(activity.id)).length;
    return {
      total,
      done,
      running: list.filter((activity) => runningChecklist[activity.id]).length,
      pending: list.filter((activity) => pendingChecklist[activity.id]).length,
      percent: total ? Math.round((done / total) * 100) : 0
    };
  }


  function handleChecklistEvidence(activityId, event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Envie uma imagem como evidência.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setChecklistEvidence({
        ...checklistEvidence,
        [activityId]: {
          image: reader.result,
          fileName: file.name,
          capturedAt: new Date().toLocaleString("pt-BR")
        }
      });
    };
    reader.readAsDataURL(file);
  }

  function removeChecklistEvidence(activityId) {
    const next = { ...checklistEvidence };
    delete next[activityId];
    setChecklistEvidence(next);
  }

  function startChecklistActivity(activity) {
    if (completedTodayIds.has(activity.id)) return;
    if (runningChecklist[activity.id]) return alert("Esta atividade já foi iniciada.");

    const pending = pendingChecklist[activity.id];
    const nextPending = { ...pendingChecklist };
    delete nextPending[activity.id];

    setPendingChecklist(nextPending);

    setRunningChecklist({
      ...runningChecklist,
      [activity.id]: {
        activityId: activity.id,
        startedAt: currentTimeHHMM(),
        startedAtFull: new Date().toLocaleString("pt-BR"),
        executor: isOperationalUser() ? loggedUser.name : (checklistExecutor || pending?.executor || "Não informado"),
        accumulatedMinutes: pending?.accumulatedMinutes || 0
      }
    });
  }

  function markChecklistPending(activity) {
    const running = runningChecklist[activity.id];

    if (!running) {
      alert("Clique em iniciar antes de registrar uma pendência.");
      return;
    }

    const reason = window.prompt("O que está impedindo de seguir com esta atividade?");

    if (!reason || !reason.trim()) {
      alert("Informe o motivo da pendência.");
      return;
    }

    const stoppedAt = currentTimeHHMM();
    const accumulatedMinutes = Number(running.accumulatedMinutes || 0) + minutesBetween(running.startedAt, stoppedAt);

    const nextRunning = { ...runningChecklist };
    delete nextRunning[activity.id];

    setRunningChecklist(nextRunning);
    setPendingChecklist({
      ...pendingChecklist,
      [activity.id]: {
        activityId: activity.id,
        reason: reason.trim(),
        stoppedAt,
        stoppedAtFull: new Date().toLocaleString("pt-BR"),
        realStart: running.startedAt,
        executor: running.executor || checklistExecutor || "Não informado",
        accumulatedMinutes
      }
    });
  }

  function finishChecklistActivity(activity) {
    const running = runningChecklist[activity.id];

    if (!running) {
      alert("Clique em iniciar antes de finalizar.");
      return;
    }

    const evidence = checklistEvidence[activity.id];

    if (!evidence?.image) {
      alert("Anexe ou tire uma foto como evidência antes de finalizar a atividade.");
      return;
    }

    const realStart = running.startedAt;
    const realEnd = currentTimeHHMM();
    const accumulatedMinutes = Number(running.accumulatedMinutes || 0) + minutesBetween(realStart, realEnd);

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
      executionTime: durationFromMinutes(accumulatedMinutes),
      punctuality: punctualityStatus(activity.startTime, activity.endTime, realStart, realEnd),
      date: today(),
      completedAt: new Date().toLocaleString("pt-BR"),
      evidenceImage: evidence.image,
      evidenceFileName: evidence.fileName,
      evidenceCapturedAt: evidence.capturedAt
    };

    const nextRunning = { ...runningChecklist };
    const nextPending = { ...pendingChecklist };
    const nextEvidence = { ...checklistEvidence };
    delete nextRunning[activity.id];
    delete nextPending[activity.id];
    delete nextEvidence[activity.id];

    setRunningChecklist(nextRunning);
    setPendingChecklist(nextPending);
    setChecklistEvidence(nextEvidence);
    setChecklistHistory([record, ...checklistHistory]);
  }


  function deleteChecklistActivity(activityId) {
    if (!confirm("Deseja excluir esta atividade do checklist?")) return;
    setStockItems(stockItems.filter((item) => item.id !== activityId));
    setChecklistHistory(checklistHistory.filter((record) => record.activityId !== activityId));

    const nextRunning = { ...runningChecklist };
    const nextPending = { ...pendingChecklist };
    const nextEvidence = { ...checklistEvidence };
    delete nextRunning[activityId];
    delete nextPending[activityId];
    delete nextEvidence[activityId];
    setRunningChecklist(nextRunning);
    setPendingChecklist(nextPending);
    setChecklistEvidence(nextEvidence);
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
              onChange={(event) => updateProcessActivityForm("type", event.target.value)}
            >
              <option>Processo</option>
              <option>Atividade</option>
            </select>
          </label>

          <label>
            Processo / Atividade
            <input
              value={processActivityForm.name}
              onChange={(event) => updateProcessActivityForm("name", event.target.value)}
              placeholder="Ex: Limpeza da cozinha, Conferência de freezer"
            />
          </label>

          <label>
            Área referente
            <input
              value={processActivityForm.area}
              onChange={(event) => updateProcessActivityForm("area", event.target.value)}
              placeholder="Ex: Cozinha, Salão, Estoque, Bar"
            />
          </label>

          <label>
            Hora início
            <input
              type="time"
              value={processActivityForm.startTime}
              onChange={(event) => updateProcessActivityForm("startTime", event.target.value)}
            />
          </label>

          <label>
            Hora fim
            <input
              type="time"
              value={processActivityForm.endTime}
              onChange={(event) => updateProcessActivityForm("endTime", event.target.value)}
            />
          </label>

          <label>
            Se repete?
            <select
              value={processActivityForm.repeats}
              onChange={(event) => updateProcessActivityForm("repeats", event.target.value)}
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
              onChange={(event) => updateProcessActivityForm("repeatQuantity", event.target.value)}
              placeholder="Ex: 3"
             
            />
          </label>

          <label>
            Frequência
            <select
              value={processActivityForm.frequency}
              onChange={(event) => updateProcessActivityForm("frequency", event.target.value)}
             
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
      { id: "produto", title: "Produto / Item", icon: "📦", description: "Cadastre os produtos que serão movimentados no estoque." }
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
    const stockCadastroActions = [
      { id: "product", type: "produto", title: "Cadastro de produto", detail: "Produto, item, unidade, categoria, custo e status.", button: "Cadastro de produto", variant: "primary" },
      { id: "category", type: "categoria", title: "Cadastro de categoria", detail: "Crie e organize categorias usadas nos produtos e itens.", button: "Cadastro de categoria", variant: "primary" },
      { id: "menu", type: "menu", title: "Cadastro de menu", detail: "Pratos, bebidas, preços, imagem e porcionamento para venda.", button: "Cadastro de menu", variant: "primary" }
    ];

    return (
      <>
          <section className="module-content stock-wide">
          <div className="stock-title-row">
            <div>
              <h2>Cadastro</h2>
              <p className="stock-help">Cadastre e edite a base de produtos e itens.</p>
            </div>
          </div>

          <div className="stock-action-grid">
            {stockCadastroActions.map((action) => (
              <article
                className={stockCadastroType === action.type ? "stock-action-card active" : "stock-action-card"}
                key={action.id}
              >
                <div>
                  <strong>{action.title}</strong>
                  <small>{action.detail}</small>
                </div>
                <button
                  className={action.variant}
                  type="button"
                  onClick={() => openStockCadastroAction(action.id)}
                >
                  {action.button}
                </button>
              </article>
            ))}
          </div>
          {menuItems.length > 0 && (
            <div className="stock-table-wrap menu-items-table">
              <h3>Itens de menu cadastrados</h3>
              <table>
                <thead>
                  <tr>
                    <th>Imagem</th>
                    <th>Prato</th>
                    <th>Tipo</th>
                    <th>Venda</th>
                    <th>Porcionamento</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {menuItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.image ? <img className="menu-table-image" src={item.image} alt={item.dishName} /> : "--"}</td>
                      <td><strong>{item.dishName}</strong></td>
                      <td>{item.type}</td>
                      <td>{money(Number(item.saleValue || 0))}</td>
                      <td>{(item.portions || []).length} item(ns)</td>
                      <td>{item.status}</td>
                      <td><div className="action-buttons"><button type="button" onClick={() => editMenuItem(item)}>Editar</button><button type="button" onClick={() => deleteMenuItem(item.id)}>Excluir</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {stockModal === "product" && renderStockProductModal()}
        {showStockCategoryModal && renderStockCategoryModal()}
        {showMenuItemModal && renderMenuItemModal()}

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

        {filteredRegisteredItems.length === 0 ? (
          <div className="module-placeholder">
            <strong>Nenhum cadastro encontrado</strong>
            <p>Use o módulo Cadastros para criar produtos, itens, processos ou atividades.</p>
          </div>
        ) : (
          <div className="stock-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Nome</th>
                  <th>Categoria/Área</th>
                  <th>Unidade/Horário</th>
                  <th>Unidade/Frequência</th>
                  <th>Estoque atual/Repetição</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegisteredItems.map((item) => (
                  <tr key={item.id} className={item.totalStock <= 0 ? "stock-zero-row" : ""}>
                    <td><span className="stock-type-badge">{item.type || "Produto"}</span></td>
                    <td><strong>{item.name}</strong></td>
                    <td>{item.area || item.category}</td>
                    <td>
                      {item.type === "Processo" || item.type === "Atividade"
                        ? `${item.startTime || "--"} às ${item.endTime || "--"}`
                        : unitLabel(item.unit)}
                    </td>
                    <td>{item.frequency || unitLabel(item.stockUnit)}</td>
                    <td>
                      {item.type === "Processo" || item.type === "Atividade"
                        ? item.repeats === "Sim" ? `${item.repeatQuantity || 0} vez(es)` : "Não repete"
                        : <strong>{formatStockDisplay(item.totalStock, item.stockUnit)}</strong>}
                    </td>
                    <td>{item.productStatus || item.status || "Ativo"}</td>
                    <td>
                      {item.type === "Produto" || item.type === "Item" ? (
                        <div className="table-action-menu">
                          <button
                            type="button"
                            className="table-action-trigger"
                            onClick={() => setOpenRegisteredActionId(openRegisteredActionId === item.id ? "" : item.id)}
                          >
                            ⚙️ Ações
                          </button>
                          {openRegisteredActionId === item.id && (
                            <div className="table-action-menu-list">
                              <button type="button" onClick={() => { setOpenRegisteredActionId(""); editStockItem(item); }}>Editar</button>
                              {(item.productStatus || item.status) === "Inativo" && (
                                <button type="button" onClick={() => { setOpenRegisteredActionId(""); reactivateStockItem(item.id); }}>Reativar</button>
                              )}
                              <button type="button" className="danger-action" onClick={() => { setOpenRegisteredActionId(""); inactivateStockItem(item.id); }}>Excluir cadastro</button>
                            </div>
                          )}
                        </div>
                      ) : "--"}
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
        <h2>{editingStockLotId ? "Editar item de estoque" : "Lançamento de estoque"}</h2>
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

          <button className="primary" type="submit">
            {editingStockLotId ? "Salvar alterações" : "Registrar entrada"}
          </button>
          {editingStockLotId && (
            <button className="secondary" type="button" onClick={resetStockEntryForm}>
              Cancelar edição
            </button>
          )}
        </form>
      </section>
    );
  }

  function productOptions() {
    return activeStockProducts().map((item) => (
      <option key={item.id} value={item.id}>{item.name} - {item.category}</option>
    ));
  }

  function selectedStockModalItem(form) {
    return stockItemsView.find((item) => item.id === form.itemId);
  }

  function renderMenuItemModal() {
    const stockProductOptions = stockItemsView.filter((item) => item.type === "Produto" || item.type === "Item");
    return (
      <StockModal title={editingMenuItemId ? "Editar item do menu" : "Cadastro de menu"} onClose={resetMenuItemForm}>
        <p className="stock-help stock-modal-help">Cadastre pratos e bebidas com preço e porcionamento. Esses dados ficam prontos para futura baixa automática no estoque ao registrar uma venda.</p>
        <form className="stock-form-grid stock-modal-form" onSubmit={saveMenuItem}>
          <label>Prato / produto<input value={menuItemForm.dishName} onChange={(event) => setMenuItemForm({ ...menuItemForm, dishName: event.target.value })} placeholder="Ex: Filé à parmegiana" /></label>
          <label>Tipo<select value={menuItemForm.type} onChange={(event) => setMenuItemForm({ ...menuItemForm, type: event.target.value })}><option>Comida</option><option>Bebida</option></select></label>
          <label>Valor líquido<input value={menuItemForm.netValue} onChange={(event) => setMenuItemForm({ ...menuItemForm, netValue: event.target.value })} placeholder="Ex: 25,00" /></label>
          <label>Valor bruto<input value={menuItemForm.grossValue} onChange={(event) => setMenuItemForm({ ...menuItemForm, grossValue: event.target.value })} placeholder="Ex: 32,00" /></label>
          <label>Valor com juros<input value={menuItemForm.interestValue} onChange={(event) => setMenuItemForm({ ...menuItemForm, interestValue: event.target.value })} placeholder="Ex: 34,00" /></label>
          <label>Valor de venda<input value={menuItemForm.saleValue} onChange={(event) => setMenuItemForm({ ...menuItemForm, saleValue: event.target.value })} placeholder="Ex: 39,90" /></label>
          <label>Status<select value={menuItemForm.status} onChange={(event) => setMenuItemForm({ ...menuItemForm, status: event.target.value })}><option>Ativo</option><option>Inativo</option></select></label>
          <label>Imagem do produto<input type="file" accept="image/*" onChange={handleMenuImage} /></label>
          {menuItemForm.image && (<div className="menu-image-preview"><img src={menuItemForm.image} alt={menuItemForm.dishName || "Item do menu"} /><button className="secondary" type="button" onClick={() => setMenuItemForm({ ...menuItemForm, image: "", imageName: "" })}>Remover imagem</button></div>)}

          <div className="menu-portion-box">
            <div className="stock-title-row compact"><div><strong>Porcionamento</strong><p className="stock-help">Informe quais itens do estoque compõem este produto.</p></div><button className="secondary" type="button" onClick={addMenuPortion}>Adicionar item</button></div>
            {menuItemForm.portions.map((portion, index) => (
              <div className="menu-portion-row" key={index}>
                <select value={portion.stockItemId} onChange={(event) => updateMenuPortion(index, "stockItemId", event.target.value)}><option value="">Selecione o item</option>{stockProductOptions.map((item) => <option key={item.id} value={item.id}>{item.name} - {item.category}</option>)}</select>
                <input type="number" step="0.001" value={portion.quantity} onChange={(event) => updateMenuPortion(index, "quantity", event.target.value)} placeholder="Qtd." />
                <select value={portion.unit} onChange={(event) => updateMenuPortion(index, "unit", event.target.value)}>{compatibleUnitsFor(stockItemsView.find((item) => item.id === portion.stockItemId)?.unit || "g").map((unit) => <option key={unit} value={unit}>{unitLabel(unit)}</option>)}</select>
                <button className="danger" type="button" onClick={() => removeMenuPortion(index)}>Remover</button>
              </div>
            ))}
          </div>
          <div className="stock-modal-footer"><button className="secondary" type="button" onClick={resetMenuItemForm}>Cancelar</button><button className="primary" type="submit">{editingMenuItemId ? "Salvar menu" : "Cadastrar menu"}</button></div>
        </form>
      </StockModal>
    );
  }

  function renderStockProductModal() {
    return (
      <StockModal title={editingStockItemId ? "Editar produto ou item" : "Novo produto"} onClose={closeStockModal}>
        <p className="stock-help stock-modal-help">Informe os dados fixos do produto. Entradas, saídas, transferências e inventário ficam na tela Estoque.</p>
        <form className="stock-form-grid stock-modal-form" onSubmit={saveStockItem}>
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
            <input value={stockItemForm.name} onChange={(event) => setStockItemForm({ ...stockItemForm, name: event.target.value })} placeholder="Ex: Carne, Arroz, Etiqueta térmica" />
          </label>
          <label>
            Código interno
            <input value={stockItemForm.internalCode} onChange={(event) => setStockItemForm({ ...stockItemForm, internalCode: event.target.value })} placeholder="Ex: INS-001" />
          </label>
          <label>
            Código de barras
            <input value={stockItemForm.barcode} onChange={(event) => setStockItemForm({ ...stockItemForm, barcode: event.target.value })} placeholder="EAN, SKU ou código interno" />
          </label>
          <label>
            Categoria
            <select value={stockItemForm.categoryId} onChange={(event) => setStockItemForm({ ...stockItemForm, categoryId: event.target.value })}>
              <option value="">Selecione</option>
              {stockCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <div className="unit-picker-stock">
            <span>Unidade padrão</span>
            <div className="unit-buttons-stock">
              {["kg", "g", "L", "ml", "un", "pacote", "caixa"].map((unit) => (
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
            Estoque mínimo
            <input type="number" step="0.001" value={stockItemForm.minStock} onChange={(event) => setStockItemForm({ ...stockItemForm, minStock: event.target.value })} placeholder="Ex: 5" />
          </label>
          <label>
            Estoque máximo
            <input type="number" step="0.001" value={stockItemForm.maxStock} onChange={(event) => setStockItemForm({ ...stockItemForm, maxStock: event.target.value })} placeholder="Ex: 50" />
          </label>
          <label>
            Custo unitário
            <input type="number" step="0.01" value={stockItemForm.unitCost} onChange={(event) => setStockItemForm({ ...stockItemForm, unitCost: event.target.value })} placeholder="Ex: 12.90" />
          </label>
          <label>
            Controla validade?
            <select value={stockItemForm.controlsExpiry} onChange={(event) => setStockItemForm({ ...stockItemForm, controlsExpiry: event.target.value })}>
              <option>Sim</option>
              <option>Não</option>
            </select>
          </label>
          <label>
            Status
            <select value={stockItemForm.status} onChange={(event) => setStockItemForm({ ...stockItemForm, status: event.target.value })}>
              <option>Ativo</option>
              <option>Inativo</option>
            </select>
          </label>
          <div className="stock-modal-footer">
            <button className="secondary" type="button" onClick={closeStockModal}>Cancelar</button>
            <button className="primary" type="submit">{editingStockItemId ? "Salvar alterações" : "Cadastrar produto/item"}</button>
          </div>
        </form>
      </StockModal>
    );
  }

  function renderStockCategoryModal() {
    return (
      <StockModal title="Cadastro de categoria" onClose={() => setShowStockCategoryModal(false)}>
        <div className="stock-modal-table">
          <div className="category-mini-box category-modal-box">
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
        </div>
      </StockModal>
    );
  }

  function renderStockEntryModal() {
    const item = selectedStockModalItem(stockEntryForm);
    const compatibleUnits = compatibleUnitsFor(item?.unit || "g");
    const entryCategoryOptions = stockCategories.map((category) => ({
      category,
      label: `${category.name} | ${stockItemsView.filter((currentItem) => currentItem.categoryId === category.id).length} produto(s)`
    }));
    const entryProductOptions = activeStockProducts()
      .filter((currentItem) => !stockEntryForm.categoryId || currentItem.categoryId === stockEntryForm.categoryId)
      .map((currentItem) => ({
        item: currentItem,
        label: `${currentItem.name} | ${currentItem.category} | ${currentItem.internalCode || currentItem.barcode || "sem código"}`
      }));
    const entrySupplierOptions = normalizedSuppliers()
      .filter((supplier) => supplier.status === "Ativo")
      .filter((supplier) => !stockEntryForm.categoryId || !supplier.categoryId || supplier.categoryId === stockEntryForm.categoryId)
      .map((supplier) => ({
        supplier,
        label: `${supplierDisplayName(supplier)} | ${stockCategories.find((category) => category.id === supplier.categoryId)?.name || "Todas categorias"} | ${supplier.document || "sem CNPJ"}`
      }));

    function selectEntryCategory(value) {
      const selectedOption = entryCategoryOptions.find((option) => option.label === value || option.category.name === value);
      const categoryId = selectedOption?.category.id || "";
      setStockEntryCategorySearch(value);
      setStockEntryProductSearch("");
      setStockEntryForm({ ...stockEntryForm, categoryId, itemId: "", quantityUnit: "g", unitCost: "", supplier: "" });
    }

    function clearEntryCategory() {
      setStockEntryCategorySearch("");
      setStockEntryProductSearch("");
      setStockEntryForm({ ...stockEntryForm, categoryId: "", itemId: "", quantityUnit: "g", unitCost: "", supplier: "" });
    }

    function selectEntryProduct(value) {
      const selectedOption = entryProductOptions.find((option) => option.label === value);
      const selected = selectedOption?.item || stockItemsView.find((currentItem) => currentItem.id === value);
      const category = stockCategories.find((currentCategory) => currentCategory.id === selected?.categoryId);
      setStockEntryProductSearch(value);
      setStockEntryCategorySearch(category ? category.name : selected?.category || stockEntryCategorySearch);
      setStockEntryForm({
        ...stockEntryForm,
        itemId: selected?.id || "",
        categoryId: selected?.categoryId || stockEntryForm.categoryId,
        quantityUnit: compatibleUnitsFor(selected?.unit || "g")[0],
        unitCost: selected?.unitCost || "",
        supplier: ""
      });
    }

    function clearEntryProduct() {
      setStockEntryProductSearch("");
      setStockEntryForm({ ...stockEntryForm, itemId: "", quantityUnit: "g", unitCost: "" });
    }

    return (
      <StockModal title={editingStockLotId ? "Editar entrada" : "Nova entrada"} onClose={closeStockModal}>
        <form className="stock-form-grid stock-modal-form" onSubmit={saveStockEntryAdvanced}>
          <label>
            Categoria
            <div className="smart-filter-field">
              <input
                list="stock-entry-category-options"
                value={stockEntryCategorySearch}
                onChange={(event) => selectEntryCategory(event.target.value)}
                placeholder="Busque por categoria..."
              />
              {stockEntryCategorySearch && (
                <button type="button" aria-label="Limpar categoria" onClick={clearEntryCategory}>×</button>
              )}
            </div>
            <datalist id="stock-entry-category-options">
              {entryCategoryOptions.map((option) => (
                <option key={option.category.id} value={option.label} />
              ))}
            </datalist>
          </label>
          <label>
            Produto
            <div className="smart-filter-field">
              <input
                list="stock-entry-product-options"
                value={stockEntryProductSearch}
                onChange={(event) => selectEntryProduct(event.target.value)}
                placeholder="Busque por produto, código ou categoria..."
              />
              {stockEntryProductSearch && (
                <button type="button" aria-label="Limpar produto" onClick={clearEntryProduct}>×</button>
              )}
            </div>
            <datalist id="stock-entry-product-options">
              {entryProductOptions.map((option) => (
                <option key={option.item.id} value={option.label} />
              ))}
            </datalist>
            {item && (
              <small className="smart-filter-hint">
                {item.category} • Unidade: {unitLabel(item.unit)}
              </small>
            )}
          </label>
          <label>
            Quantidade
            <input type="number" step="0.001" value={stockEntryForm.quantity} onChange={(event) => setStockEntryForm({ ...stockEntryForm, quantity: event.target.value })} />
          </label>
          <label>
            Unidade
            <select value={stockEntryForm.quantityUnit} onChange={(event) => setStockEntryForm({ ...stockEntryForm, quantityUnit: event.target.value })}>
              {compatibleUnits.map((unit) => <option key={unit} value={unit}>{unitLabel(unit)}</option>)}
            </select>
          </label>
          <label>
            Fornecedor
            <input
              list="stock-entry-supplier-options"
              value={stockEntryForm.supplier}
              onChange={(event) => setStockEntryForm({ ...stockEntryForm, supplier: event.target.value })}
              placeholder="Busque fornecedor cadastrado..."
            />
            <datalist id="stock-entry-supplier-options">
              {entrySupplierOptions.map((option) => (
                <option key={option.supplier.id} value={option.label} />
              ))}
            </datalist>
          </label>
          <label>
            Lote
            <input value={stockEntryForm.batchCode} onChange={(event) => setStockEntryForm({ ...stockEntryForm, batchCode: event.target.value })} placeholder="Ex: L2506" />
          </label>
          <label>
            Data de validade
            <input type="date" value={stockEntryForm.expiryDate} onChange={(event) => setStockEntryForm({ ...stockEntryForm, expiryDate: event.target.value })} disabled={item?.controlsExpiry === "Não"} />
          </label>
          <label>
            Custo unitário
            <input type="number" step="0.01" value={stockEntryForm.unitCost} onChange={(event) => setStockEntryForm({ ...stockEntryForm, unitCost: event.target.value })} />
          </label>
          <label>
            Local de armazenamento
            <input list="stock-locations" value={stockEntryForm.location} onChange={(event) => setStockEntryForm({ ...stockEntryForm, location: event.target.value })} />
          </label>
          <label className="stock-field-full">
            Observação
            <input value={stockEntryForm.note} onChange={(event) => setStockEntryForm({ ...stockEntryForm, note: event.target.value })} placeholder="Nota, compra ou ajuste de entrada" />
          </label>
          <label>
            Anexo da nota fiscal
            <input type="file" onChange={(event) => setStockEntryForm({ ...stockEntryForm, invoiceFileName: event.target.files?.[0]?.name || "" })} />
          </label>
          <div className="stock-modal-footer">
            <button className="secondary" type="button" onClick={closeStockModal}>Cancelar</button>
            <button className="primary" type="submit">Salvar entrada</button>
          </div>
        </form>
      </StockModal>
    );
  }

  function renderStockExitModal() {
    const item = selectedStockModalItem(stockExitForm);
    const compatibleUnits = compatibleUnitsFor(item?.unit || "g");
    return (
      <StockModal title="Nova saída" onClose={closeStockModal}>
        <form className="stock-form-grid stock-modal-form" onSubmit={saveStockExit}>
          <label>
            Produto
            <select value={stockExitForm.itemId} onChange={(event) => {
              const selected = stockItemsView.find((currentItem) => currentItem.id === event.target.value);
              setStockExitForm({ ...stockExitForm, itemId: event.target.value, quantityUnit: compatibleUnitsFor(selected?.unit || "g")[0] });
            }}>
              <option value="">Selecione</option>
              {productOptions()}
            </select>
          </label>
          <label>
            Quantidade
            <input type="number" step="0.001" value={stockExitForm.quantity} onChange={(event) => setStockExitForm({ ...stockExitForm, quantity: event.target.value })} />
          </label>
          <label>
            Unidade
            <select value={stockExitForm.quantityUnit} onChange={(event) => setStockExitForm({ ...stockExitForm, quantityUnit: event.target.value })}>
              {compatibleUnits.map((unit) => <option key={unit} value={unit}>{unitLabel(unit)}</option>)}
            </select>
          </label>
          <label>
            Motivo da saída
            <select value={stockExitForm.reason} onChange={(event) => setStockExitForm({ ...stockExitForm, reason: event.target.value })}>
              {["Produção", "Venda", "Transferência", "Consumo interno", "Descarte", "Ajuste"].map((reason) => <option key={reason}>{reason}</option>)}
            </select>
          </label>
          <label>
            Local de origem
            <select value={stockExitForm.location} onChange={(event) => setStockExitForm({ ...stockExitForm, location: event.target.value })}>
              {stockLocations.map((location) => <option key={location}>{location}</option>)}
            </select>
          </label>
          <label className="stock-field-full">
            Observação
            <input value={stockExitForm.note} onChange={(event) => setStockExitForm({ ...stockExitForm, note: event.target.value })} placeholder="Justificativa operacional" />
          </label>
          <div className="stock-modal-footer">
            <button className="secondary" type="button" onClick={closeStockModal}>Cancelar</button>
            <button className="primary" type="submit">Registrar saída</button>
          </div>
        </form>
      </StockModal>
    );
  }

  function renderStockTransferModal() {
    const item = selectedStockModalItem(stockTransferForm);
    const compatibleUnits = compatibleUnitsFor(item?.unit || "g");
    return (
      <StockModal title="Transferir entre locais" onClose={closeStockModal}>
        <form className="stock-form-grid stock-modal-form" onSubmit={saveStockTransfer}>
          <label>
            Produto
            <select value={stockTransferForm.itemId} onChange={(event) => {
              const selected = stockItemsView.find((currentItem) => currentItem.id === event.target.value);
              setStockTransferForm({ ...stockTransferForm, itemId: event.target.value, quantityUnit: compatibleUnitsFor(selected?.unit || "g")[0] });
            }}>
              <option value="">Selecione</option>
              {productOptions()}
            </select>
          </label>
          <label>
            Quantidade
            <input type="number" step="0.001" value={stockTransferForm.quantity} onChange={(event) => setStockTransferForm({ ...stockTransferForm, quantity: event.target.value })} />
          </label>
          <label>
            Unidade
            <select value={stockTransferForm.quantityUnit} onChange={(event) => setStockTransferForm({ ...stockTransferForm, quantityUnit: event.target.value })}>
              {compatibleUnits.map((unit) => <option key={unit} value={unit}>{unitLabel(unit)}</option>)}
            </select>
          </label>
          <label>
            Local origem
            <select value={stockTransferForm.fromLocation} onChange={(event) => setStockTransferForm({ ...stockTransferForm, fromLocation: event.target.value })}>
              {stockLocations.map((location) => <option key={location}>{location}</option>)}
            </select>
          </label>
          <label>
            Local destino
            <input list="stock-locations" value={stockTransferForm.toLocation} onChange={(event) => setStockTransferForm({ ...stockTransferForm, toLocation: event.target.value })} />
          </label>
          <label className="stock-field-full">
            Observação
            <input value={stockTransferForm.note} onChange={(event) => setStockTransferForm({ ...stockTransferForm, note: event.target.value })} />
          </label>
          <div className="stock-modal-footer">
            <button className="secondary" type="button" onClick={closeStockModal}>Cancelar</button>
            <button className="primary" type="submit">Transferir</button>
          </div>
        </form>
      </StockModal>
    );
  }

  function renderStockInventoryModal() {
    const item = selectedStockModalItem(stockInventoryForm);
    const compatibleUnits = compatibleUnitsFor(item?.unit || "g");
    const expected = stockLots
      .filter((lot) => lot.itemId === stockInventoryForm.itemId && lot.location === stockInventoryForm.location)
      .reduce((sum, lot) => sum + Number(lot.quantity || 0), 0);
    const counted = toBaseUnit(stockInventoryForm.countedQuantity, stockInventoryForm.quantityUnit);
    const difference = stockInventoryForm.countedQuantity ? counted.quantity - expected : 0;
    return (
      <StockModal title="Inventário" onClose={closeStockModal}>
        <form className="stock-form-grid stock-modal-form" onSubmit={saveStockInventory}>
          <label>
            Produto
            <select value={stockInventoryForm.itemId} onChange={(event) => {
              const selected = stockItemsView.find((currentItem) => currentItem.id === event.target.value);
              setStockInventoryForm({ ...stockInventoryForm, itemId: event.target.value, quantityUnit: compatibleUnitsFor(selected?.unit || "g")[0] });
            }}>
              <option value="">Selecione</option>
              {productOptions()}
            </select>
          </label>
          <label>
            Local
            <select value={stockInventoryForm.location} onChange={(event) => setStockInventoryForm({ ...stockInventoryForm, location: event.target.value })}>
              {stockLocations.map((location) => <option key={location}>{location}</option>)}
            </select>
          </label>
          <label>
            Estoque esperado
            <input value={formatStockDisplay(expected, item?.stockUnit)} disabled />
          </label>
          <label>
            Quantidade contada
            <input type="number" step="0.001" value={stockInventoryForm.countedQuantity} onChange={(event) => setStockInventoryForm({ ...stockInventoryForm, countedQuantity: event.target.value })} />
          </label>
          <label>
            Unidade
            <select value={stockInventoryForm.quantityUnit} onChange={(event) => setStockInventoryForm({ ...stockInventoryForm, quantityUnit: event.target.value })}>
              {compatibleUnits.map((unit) => <option key={unit} value={unit}>{unitLabel(unit)}</option>)}
            </select>
          </label>
          <label>
            Diferença automática
            <input value={formatStockDisplay(difference, item?.stockUnit)} disabled />
          </label>
          <label>
            Motivo do ajuste
            <input value={stockInventoryForm.reason} onChange={(event) => setStockInventoryForm({ ...stockInventoryForm, reason: event.target.value })} />
          </label>
          <label className="stock-field-full">
            Observação
            <input value={stockInventoryForm.note} onChange={(event) => setStockInventoryForm({ ...stockInventoryForm, note: event.target.value })} />
          </label>
          <div className="stock-modal-footer">
            <button className="secondary" type="button" onClick={closeStockModal}>Cancelar</button>
            <button className="primary" type="submit">Salvar inventário</button>
          </div>
        </form>
      </StockModal>
    );
  }

  function renderStockLossModal() {
    const item = selectedStockModalItem(stockLossForm);
    const compatibleUnits = compatibleUnitsFor(item?.unit || "g");
    return (
      <StockModal title="Registrar perda" onClose={closeStockModal}>
        <form className="stock-form-grid stock-modal-form" onSubmit={saveStockLoss}>
          <label>
            Produto
            <select value={stockLossForm.itemId} onChange={(event) => {
              const selected = stockItemsView.find((currentItem) => currentItem.id === event.target.value);
              setStockLossForm({ ...stockLossForm, itemId: event.target.value, quantityUnit: compatibleUnitsFor(selected?.unit || "g")[0] });
            }}>
              <option value="">Selecione</option>
              {productOptions()}
            </select>
          </label>
          <label>
            Quantidade perdida
            <input type="number" step="0.001" value={stockLossForm.quantity} onChange={(event) => setStockLossForm({ ...stockLossForm, quantity: event.target.value })} />
          </label>
          <label>
            Unidade
            <select value={stockLossForm.quantityUnit} onChange={(event) => setStockLossForm({ ...stockLossForm, quantityUnit: event.target.value })}>
              {compatibleUnits.map((unit) => <option key={unit} value={unit}>{unitLabel(unit)}</option>)}
            </select>
          </label>
          <label>
            Motivo
            <select value={stockLossForm.reason} onChange={(event) => setStockLossForm({ ...stockLossForm, reason: event.target.value })}>
              {["Vencimento", "Quebra", "Contaminação", "Erro de produção", "Produção excessiva", "Sobra", "Outros"].map((reason) => <option key={reason}>{reason}</option>)}
            </select>
          </label>
          <label>
            Responsável
            <input value={stockLossForm.responsible} onChange={(event) => setStockLossForm({ ...stockLossForm, responsible: event.target.value })} placeholder={currentOperatorName()} />
          </label>
          <label>
            Local
            <select value={stockLossForm.location} onChange={(event) => setStockLossForm({ ...stockLossForm, location: event.target.value })}>
              {stockLocations.map((location) => <option key={location}>{location}</option>)}
            </select>
          </label>
          <label>
            Foto
            <input type="file" accept="image/*" onChange={(event) => setStockLossForm({ ...stockLossForm, photoFileName: event.target.files?.[0]?.name || "" })} />
          </label>
          <label className="stock-field-full">
            Observação
            <input value={stockLossForm.note} onChange={(event) => setStockLossForm({ ...stockLossForm, note: event.target.value })} />
          </label>
          <div className="stock-modal-footer">
            <button className="secondary" type="button" onClick={closeStockModal}>Cancelar</button>
            <button className="primary" type="submit">Registrar descarte</button>
          </div>
        </form>
      </StockModal>
    );
  }

  function renderStockMovementsModal() {
    return (
      <StockModal title="Histórico de movimentações" onClose={closeStockModal}>
        <div className="stock-table-wrap stock-modal-table">
          <table>
            <thead>
              <tr>
                <th>Data e hora</th>
                <th>Produto</th>
                <th>Tipo</th>
                <th>Quantidade</th>
                <th>Origem</th>
                <th>Destino</th>
                <th>Usuário</th>
                <th>Observação</th>
              </tr>
            </thead>
            <tbody>
              {stockMovements.length === 0 ? (
                <tr><td colSpan="8">Nenhuma movimentação registrada.</td></tr>
              ) : stockMovements.map((movement) => (
                <tr key={movement.id}>
                  <td>{movement.createdAt}</td>
                  <td>{movement.itemName}</td>
                  <td>{movement.type}</td>
                  <td>{formatStockDisplay(movement.quantity, movement.unit)}</td>
                  <td>{movement.fromLocation || "--"}</td>
                  <td>{movement.toLocation || "--"}</td>
                  <td>{movement.userName}</td>
                  <td>{movement.note || movement.reason || "--"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StockModal>
    );
  }

  function renderActiveStockModal() {
    if (stockModal === "product") return renderStockProductModal();
    if (stockModal === "entry") return renderStockEntryModal();
    if (stockModal === "exit") return renderStockExitModal();
    if (stockModal === "transfer") return renderStockTransferModal();
    if (stockModal === "inventory") return renderStockInventoryModal();
    if (stockModal === "loss") return renderStockLossModal();
    if (stockModal === "movements") return renderStockMovementsModal();
    return null;
  }

  function renderStockEstoque() {
    return (
      <>
        <section className="module-content stock-wide">
          <div className="stock-title-row">
            <div>
              <h2>Gestão de estoque</h2>
              <p className="stock-help">Controle entradas, saídas, transferências, inventário, validade e perdas financeiras.</p>
            </div>
            <div className="stock-title-actions">
              <button className="primary" type="button" onClick={() => openStockModal("entry")}>Nova Entrada</button>
              <button className="secondary" type="button" onClick={() => openStockModal("exit")}>Nova Saída</button>
              <button className="secondary" type="button" onClick={() => openStockModal("transfer")}>Transferir</button>
              <button className="secondary" type="button" onClick={() => openStockModal("inventory")}>Inventário</button>
              <button className="danger" type="button" onClick={() => openStockModal("loss")}>Registrar Perda</button>
              <button className="secondary" type="button" onClick={() => openStockModal("movements")}>Ver Movimentações</button>
            </div>
          </div>
        </section>

        <section className="module-content stock-wide">
          <div className="acomp-grid">
            <MiniDashCard title="Valor total em estoque" value={money(stockDashboard.totalValue)} detail="Saldo financeiro atual" />
            <MiniDashCard title="Estoque mínimo" value={stockDashboard.lowStock} detail="Produtos em atenção/crítico" warning />
            <MiniDashCard title="Próx. vencimento" value={stockDashboard.expiring} detail={`Até ${stockAlertDays} dia(s)`} warning />
            <MiniDashCard title="Vencidos" value={stockDashboard.expired} detail="Produtos vencidos" danger />
            <MiniDashCard title="Sem movimento" value={stockDashboard.stale} detail="Há 30 dias ou mais" />
            <MiniDashCard title="Perdas do mês" value={money(stockDashboard.lossMonth)} detail="Descartes registrados" danger />
          </div>
        </section>

        <section className="module-content stock-wide">
          <div className="stock-filter-grid">
            <input value={stockSearch} onChange={(event) => setStockSearch(event.target.value)} placeholder="Buscar produto, código ou categoria..." />
            <select value={stockFilters.category} onChange={(event) => setStockFilters({ ...stockFilters, category: event.target.value })}>
              <option>Todos</option>
              {stockCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <select value={stockFilters.supplier} onChange={(event) => setStockFilters({ ...stockFilters, supplier: event.target.value })}>
              <option>Todos</option>
              {normalizedSuppliers().map((supplier) => <option key={supplier.id}>{supplierDisplayName(supplier)}</option>)}
            </select>
            <select value={stockFilters.location} onChange={(event) => setStockFilters({ ...stockFilters, location: event.target.value })}>
              <option>Todos</option>
              {stockLocations.map((location) => <option key={location}>{location}</option>)}
            </select>
            <select value={stockFilters.status} onChange={(event) => setStockFilters({ ...stockFilters, status: event.target.value })}>
              {["Todos", "Normal", "Atenção", "Crítico", "Vencido"].map((status) => <option key={status}>{status}</option>)}
            </select>
            <label className="stock-alert-label">
              Vencimento
              <input type="number" value={stockAlertDays} onChange={(event) => setStockAlertDays(Number(event.target.value || 0))} />
              dias
            </label>
          </div>

          <div className="stock-quick-filters">
            {[
              ["todos", "Todos"],
              ["baixo", "Estoque baixo"],
              ["vencendo", "Próximo do vencimento"],
              ["vencidos", "Vencidos"],
              ["sem-movimento", "Sem movimentação"]
            ].map(([id, label]) => (
              <button key={id} className={stockQuickFilter === id ? "unit-btn-stock active" : "unit-btn-stock"} type="button" onClick={() => setStockQuickFilter(id)}>
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="module-content stock-wide">
          <datalist id="stock-suppliers">
            {normalizedSuppliers().map((supplier) => <option key={supplier.id} value={supplierDisplayName(supplier)} />)}
          </datalist>
          <datalist id="stock-locations">
            {stockLocations.map((location) => <option key={location} value={location} />)}
          </datalist>

          {stockOperationalFilteredItems.length === 0 ? (
            <div className="module-placeholder">
              <strong>Nenhum produto encontrado</strong>
              <p>Use Nova Entrada para registrar estoque de um produto cadastrado ou ajuste os filtros.</p>
            </div>
          ) : (
            <div className="stock-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Categoria</th>
                    <th>Estoque atual</th>
                    <th>Estoque mínimo</th>
                    <th>Unidade</th>
                    <th>Local</th>
                    <th>Próxima validade</th>
                    <th>Custo unitário</th>
                    <th>Valor total</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {stockOperationalFilteredItems.map((item) => (
                    <tr key={item.id} className={item.status === "Vencido" ? "stock-expired-row" : item.status === "Atenção" || item.status === "Crítico" ? "stock-warning-row" : item.totalStock <= 0 ? "stock-zero-row" : ""}>
                      <td>
                        <strong>{item.name}</strong>
                        <small className="stock-row-note">{item.internalCode || item.barcode || "Sem código"}</small>
                      </td>
                      <td>{item.category}</td>
                      <td>{formatStockDisplay(item.totalStock, item.stockUnit)}</td>
                      <td>{formatStockDisplay(item.minStock, item.stockUnit)}</td>
                      <td>{unitLabel(item.unit)}</td>
                      <td>{item.mainLocation}</td>
                      <td>{item.nextExpiry ? formatDate(item.nextExpiry) : "--"}</td>
                      <td>{money(item.unitCost)}</td>
                      <td>{money(item.totalValue)}</td>
                      <td><span className={`stock-status-badge status-${item.status.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`}>{item.status}</span></td>
                      <td>
                        <div className="table-actions">
                          <button className="secondary" type="button" onClick={() => editStockItem(item)}>Editar</button>
                          <button className="danger" type="button" onClick={() => removeItemFromStock(item.id)}>Remover do estoque</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </>
    );
  }



  function onlyDigits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function maskCpf(value) {
    const digits = onlyDigits(value).slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  function isValidCpf(value) {
    const cpf = onlyDigits(value);
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
    const calc = (base) => {
      let sum = 0;
      for (let index = 0; index < base; index += 1) sum += Number(cpf[index]) * (base + 1 - index);
      const rest = (sum * 10) % 11;
      return rest === 10 ? 0 : rest;
    };
    return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
  }

  function maskCep(value) {
    return onlyDigits(value).slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
  }

  function parseMoneyValue(value) {
    const raw = String(value || "").replace(/[^\d,.-]/g, "");
    if (!raw) return 0;
    if (raw.includes(",")) return Number(raw.replace(/\./g, "").replace(",", ".")) || 0;
    return Number(raw) || 0;
  }

  function isoDate(date) {
    return date.toISOString().slice(0, 10);
  }

  function addMonthsToDate(dateString, monthOffset, fixedDay = "") {
    const base = dateString ? new Date(`${dateString}T00:00:00`) : new Date();
    const year = base.getFullYear();
    const month = base.getMonth() + monthOffset;
    const target = new Date(year, month, 1);
    const wantedDay = Number(fixedDay || base.getDate());
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    target.setDate(Math.min(Math.max(wantedDay, 1), lastDay));
    return isoDate(target);
  }

  function activeMenuItemsForSale() {
    return menuItems.filter((item) => item.status === "Ativo");
  }

  function menuItemById(menuItemId) {
    return menuItems.find((item) => item.id === menuItemId) || null;
  }

  function saleCustomerById(customerId) {
    return billingCustomers.find((customer) => customer.id === customerId) || null;
  }

  function saleBuyerName(sale) {
    if (sale.saleType === "Cliente") return sale.customerName || saleCustomerById(sale.customerId)?.fullName || "Cliente";
    return sale.buyerName || "Venda avulsa";
  }

  function saleTotals(items = saleItems) {
    return items.reduce((totals, item) => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unitPrice || 0);
      const discount = Number(item.discount || 0);
      const gross = quantity * unitPrice;
      return {
        gross: totals.gross + gross,
        discount: totals.discount + discount,
        final: totals.final + Math.max(gross - discount, 0)
      };
    }, { gross: 0, discount: 0, final: 0 });
  }

  function saleStatus(sale) {
    if (sale.status === "Aberta") return "Aberta";
    if (sale.status === "Cancelada") return "Cancelada";
    if (sale.status === "Paga") return "Paga";
    if (sale.status === "Parcialmente paga") return "Parcialmente paga";
    if (sale.saleModel === "Parcelada") {
      const relatedCharges = billingCharges.filter((charge) => charge.saleId === sale.id);
      if (relatedCharges.some((charge) => billingChargeStatus(charge) === "Vencido")) return "Em atraso";
      if (relatedCharges.length && relatedCharges.every((charge) => billingChargeStatus(charge) === "Pago")) return "Paga";
    }
    if (sale.paymentStatus === "Pendente") return "Finalizada";
    return sale.status || "Finalizada";
  }

  function resetSaleForm() {
    setSaleForm({ ...emptySaleForm, paymentDate: today(), firstDueDate: today() });
    setSaleItems([{ menuItemId: "", quantity: 1, unitPrice: 0, discount: 0 }]);
  }

  function updateSaleForm(field, value) {
    setSaleForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "saleType" && value === "Avulsa") {
        next.customerId = "";
        next.customerSearch = "";
        next.saleModel = "À vista";
      }
      if (field === "saleModel" && value === "Parcelada") {
        next.paymentStatus = "Pendente";
      }
      return next;
    });
  }

  function updateSaleItem(index, field, value) {
    const nextItems = saleItems.map((item, currentIndex) => {
      if (currentIndex !== index) return item;
      const next = { ...item, [field]: value };
      if (field === "menuItemId") {
        const menuItem = menuItemById(value);
        next.unitPrice = Number(menuItem?.saleValue || 0);
      }
      if (["quantity", "unitPrice", "discount"].includes(field)) next[field] = Number(value || 0);
      return next;
    });
    setSaleItems(nextItems);
  }

  function addSaleItem() {
    setSaleItems([...saleItems, { menuItemId: "", quantity: 1, unitPrice: 0, discount: 0 }]);
  }

  function removeSaleItem(index) {
    const nextItems = saleItems.filter((_, currentIndex) => currentIndex !== index);
    setSaleItems(nextItems.length ? nextItems : [{ menuItemId: "", quantity: 1, unitPrice: 0, discount: 0 }]);
  }

  function buildSaleBillingCharges(sale, totals) {
    if (sale.saleType !== "Cliente") return [];
    if (sale.saleModel === "À vista" && sale.paymentStatus === "Pago") {
      return [{
        id: crypto.randomUUID(),
        customerId: sale.customerId,
        paymentMethod: sale.paymentMethod,
        chargeType: "À vista",
        totalAmount: totals.final,
        installmentNumber: 1,
        totalInstallments: 1,
        amount: totals.final,
        dueDate: sale.paymentDate || today(),
        fixedDueDay: "",
        status: "Pago",
        paidAmount: totals.final,
        paidAt: sale.paymentDate || today(),
        notes: `Venda ${sale.code}`,
        saleId: sale.id,
        history: [{ action: "Pagamento registrado pela venda", note: sale.code, date: new Date().toLocaleString("pt-BR") }],
        createdAt: new Date().toISOString()
      }];
    }

    const installments = sale.saleModel === "Parcelada" ? Math.max(Number(sale.installments || 1), 1) : 1;
    const amount = Number((totals.final / installments).toFixed(2));
    return Array.from({ length: installments }, (_, index) => ({
      id: crypto.randomUUID(),
      customerId: sale.customerId,
      paymentMethod: sale.paymentMethod,
      chargeType: sale.saleModel === "Parcelada" ? "Parcelado" : "À vista",
      totalAmount: totals.final,
      installmentNumber: index + 1,
      totalInstallments: installments,
      amount: index === installments - 1 ? Number((totals.final - amount * (installments - 1)).toFixed(2)) : amount,
      dueDate: addMonthsToDate(sale.firstDueDate || today(), index, sale.fixedDueDay),
      fixedDueDay: sale.fixedDueDay || "",
      status: "A vencer",
      paidAmount: 0,
      paidAt: "",
      notes: `Venda ${sale.code}`,
      saleId: sale.id,
      history: [{ action: "Cobrança gerada pela venda", note: sale.code, date: new Date().toLocaleString("pt-BR") }],
      createdAt: new Date().toISOString()
    }));
  }

  function saleFormHasUnsavedData() {
    return Boolean(
      editingSaleId
      || saleForm.customerId
      || saleForm.customerSearch
      || saleForm.buyerName.trim()
      || saleForm.buyerPhone.trim()
      || saleForm.notes.trim()
      || saleForm.saleModel !== "À vista"
      || saleForm.paymentMethod !== "PIX"
      || saleForm.paymentDate !== today()
      || saleForm.firstDueDate !== today()
      || saleItems.some((item) => item.menuItemId || Number(item.quantity || 0) !== 1 || Number(item.unitPrice || 0) > 0 || Number(item.discount || 0) > 0)
    );
  }

  function closeSaleModal() {
    if (saleFormHasUnsavedData() && !confirm("Existem dados não salvos. Deseja sair mesmo assim?")) return;
    resetSaleForm();
    setEditingSaleId(null);
    setShowSaleModal(false);
  }

  function openSaleModal(sale = null) {
    if (sale) {
      setEditingSaleId(sale.id);
      setSaleForm({
        ...emptySaleForm,
        saleType: sale.saleType || "Avulsa",
        customerId: sale.customerId || "",
        customerSearch: sale.customerName || sale.buyerName || "",
        buyerName: sale.buyerName || "",
        buyerPhone: sale.buyerPhone || "",
        saleModel: sale.saleModel || "À vista",
        paymentMethod: sale.paymentMethod || "PIX",
        paymentDate: sale.paymentDate || today(),
        paymentStatus: sale.paymentStatus || "Pendente",
        installments: String(sale.installments || 2),
        firstDueDate: sale.firstDueDate || today(),
        fixedDueDay: sale.fixedDueDay || "",
        notes: sale.notes || ""
      });
      setSaleItems((sale.items || []).length ? sale.items.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount
      })) : [{ menuItemId: "", quantity: 1, unitPrice: 0, discount: 0 }]);
    } else {
      resetSaleForm();
      setEditingSaleId(null);
    }
    setShowSaleModal(true);
  }

  function buildSaleFromForm(finalize = false) {
    const activeMenuIds = new Set(activeMenuItemsForSale().map((item) => item.id));
    const items = saleItems
      .filter((item) => item.menuItemId && Number(item.quantity || 0) > 0)
      .map((item) => {
        const menuItem = menuItemById(item.menuItemId);
        return {
          menuItemId: item.menuItemId,
          name: menuItem?.dishName || "Item do menu",
          category: menuItem?.type || "--",
          description: (menuItem?.portions || []).map((portion) => portion.stockItemName).filter(Boolean).join(", "),
          quantity: Number(item.quantity || 0),
          unitPrice: Number(item.unitPrice || 0),
          discount: Number(item.discount || 0),
          subtotal: Math.max(Number(item.quantity || 0) * Number(item.unitPrice || 0) - Number(item.discount || 0), 0)
        };
      });

    if (items.some((item) => !activeMenuIds.has(item.menuItemId))) return { error: "Apenas itens ativos do Menu podem ser vendidos." };
    if (finalize && !items.length) return { error: "Adicione ao menos um item ativo do menu." };
    if (saleForm.saleType === "Cliente" && finalize && !saleForm.customerId) return { error: "Selecione o cliente cadastrado." };
    if (saleForm.saleType === "Avulsa" && saleForm.saleModel !== "À vista") return { error: "Venda avulsa só pode ser à vista." };
    if (saleForm.saleModel === "Parcelada" && saleForm.saleType !== "Cliente") return { error: "Venda parcelada exige cliente cadastrado." };
    if (finalize && saleForm.saleModel === "Parcelada" && Number(saleForm.installments || 0) < 2) return { error: "Informe ao menos 2 parcelas." };

    const existingSale = salesRecords.find((sale) => sale.id === editingSaleId);
    const totals = saleTotals(items);
    const customer = saleCustomerById(saleForm.customerId);
    const paidNow = finalize && saleForm.saleModel === "À vista" && saleForm.paymentStatus === "Pago";
    const sale = {
      id: editingSaleId || crypto.randomUUID(),
      code: existingSale?.code || `VEN-${Date.now().toString().slice(-6)}`,
      saleDate: existingSale?.saleDate || today(),
      createdAt: existingSale?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      saleType: saleForm.saleType === "Cliente" ? "Cliente" : "Avulsa",
      customerId: saleForm.saleType === "Cliente" ? saleForm.customerId : "",
      customerName: customer?.fullName || "",
      customerCpf: customer?.cpf || "",
      customerPhone: customer?.phone || "",
      buyerName: saleForm.saleType === "Avulsa" ? saleForm.buyerName.trim() : "",
      buyerPhone: saleForm.saleType === "Avulsa" ? saleForm.buyerPhone.trim() : "",
      saleModel: saleForm.saleType === "Avulsa" ? "À vista" : saleForm.saleModel,
      paymentMethod: saleForm.paymentMethod,
      paymentDate: paidNow ? (saleForm.paymentDate || today()) : "",
      paymentStatus: paidNow ? "Pago" : "Pendente",
      installments: saleForm.saleModel === "Parcelada" ? Number(saleForm.installments || 1) : 1,
      firstDueDate: saleForm.firstDueDate || today(),
      fixedDueDay: saleForm.fixedDueDay || "",
      items,
      totalGross: totals.gross,
      totalDiscount: totals.discount,
      totalFinal: totals.final,
      paidAmount: paidNow ? totals.final : Number(existingSale?.paidAmount || 0),
      status: finalize ? (paidNow ? "Paga" : "Finalizada") : "Aberta",
      notes: saleForm.notes || "",
      history: [
        ...(existingSale?.history || []),
        { action: finalize ? "Venda finalizada" : "Venda salva como rascunho", note: paidNow ? "Pagamento confirmado" : "", date: new Date().toLocaleString("pt-BR") }
      ]
    };

    return { sale, totals };
  }

  async function persistSaleRecord(sale, totals, finalize = false) {
    const nextSales = editingSaleId
      ? salesRecords.map((current) => current.id === editingSaleId ? sale : current)
      : [sale, ...salesRecords];
    const generatedCharges = finalize ? buildSaleBillingCharges(sale, totals) : [];
    const nextCharges = generatedCharges.length ? [...generatedCharges, ...billingCharges.filter((charge) => charge.saleId !== sale.id)] : billingCharges;
    setSalesRecords(nextSales);
    setBillingCharges(nextCharges);
    await persistSalesData(nextSales, { silent: true });
    if (generatedCharges.length) await persistBillingData(billingCustomers, nextCharges, { silent: true });
    resetSaleForm();
    setEditingSaleId(null);
    setShowSaleModal(false);
  }

  async function saveSaleDraft(event) {
    event.preventDefault();
    const result = buildSaleFromForm(false);
    if (result.error) return alert(result.error);
    await persistSaleRecord(result.sale, result.totals, false);
  }

  async function finalizeSale(event) {
    event.preventDefault();
    const result = buildSaleFromForm(true);
    if (result.error) return alert(result.error);
    await persistSaleRecord(result.sale, result.totals, true);
  }
  function updateSaleRecord(saleId, updater) {
    const nextSales = salesRecords.map((sale) => sale.id === saleId ? updater(sale) : sale);
    setSalesRecords(nextSales);
    persistSalesData(nextSales, { silent: true });
  }

  function cancelSale(sale) {
    if (!confirm("Deseja cancelar esta venda? Os dados serão preservados.")) return;
    updateSaleRecord(sale.id, (current) => ({
      ...current,
      status: "Cancelada",
      history: [...(current.history || []), { action: "Venda cancelada", note: "", date: new Date().toLocaleString("pt-BR") }]
    }));
  }

  function markSalePaid(sale) {
    updateSaleRecord(sale.id, (current) => ({
      ...current,
      status: "Paga",
      paymentStatus: "Pago",
      paidAmount: Number(current.totalFinal || 0),
      paymentDate: today(),
      history: [...(current.history || []), { action: "Venda marcada como paga", note: money(Number(current.totalFinal || 0)), date: new Date().toLocaleString("pt-BR") }]
    }));
    const nextCharges = billingCharges.map((charge) => charge.saleId === sale.id ? {
      ...charge,
      status: "Pago",
      paidAmount: Number(charge.amount || 0),
      paidAt: today(),
      history: [...(charge.history || []), { action: "Pagamento pela venda", note: sale.code, date: new Date().toLocaleString("pt-BR") }]
    } : charge);
    setBillingCharges(nextCharges);
    persistBillingData(billingCustomers, nextCharges, { silent: true });
  }

  function filteredSalesRecords() {
    return salesRecords.filter((sale) => {
      const status = saleStatus(sale);
      const buyer = saleBuyerName(sale).toLowerCase();
      const matchesStart = !salesFilters.periodStart || sale.saleDate >= salesFilters.periodStart;
      const matchesEnd = !salesFilters.periodEnd || sale.saleDate <= salesFilters.periodEnd;
      const matchesCustomer = !salesFilters.customer || buyer.includes(salesFilters.customer.toLowerCase()) || onlyDigits(sale.customerCpf).includes(onlyDigits(salesFilters.customer)) || onlyDigits(sale.customerPhone || sale.buyerPhone).includes(onlyDigits(salesFilters.customer));
      const matchesType = salesFilters.saleType === "Todos" || sale.saleType === salesFilters.saleType;
      const matchesPayment = salesFilters.paymentMethod === "Todos" || sale.paymentMethod === salesFilters.paymentMethod;
      const matchesStatus = salesFilters.status === "Todos" || status === salesFilters.status;
      const matchesItem = !salesFilters.item || (sale.items || []).some((item) => item.name.toLowerCase().includes(salesFilters.item.toLowerCase()));
      return matchesStart && matchesEnd && matchesCustomer && matchesType && matchesPayment && matchesStatus && matchesItem;
    });
  }

  function saleInstallments(saleId) {
    return billingCharges.filter((charge) => charge.saleId === saleId);
  }

  function saleWhatsappUrl(sale) {
    const phone = onlyDigits(sale.customerPhone || sale.buyerPhone);
    const message = encodeURIComponent(`Resumo da venda ${sale.code}: ${saleBuyerName(sale)} - Total ${money(Number(sale.totalFinal || 0))}.`);
    return phone ? `https://wa.me/55${phone}?text=${message}` : `https://wa.me/?text=${message}`;
  }
  function billingCustomerById(customerId) {
    return billingCustomers.find((customer) => customer.id === customerId) || null;
  }

  function billingChargePaidAmount(charge) {
    return Number(charge.paidAmount || 0);
  }

  function billingChargeOpenAmount(charge) {
    return Math.max(Number(charge.amount || 0) - billingChargePaidAmount(charge), 0);
  }

  function billingChargeStatus(charge) {
    if (charge.status === "Cancelado") return "Cancelado";
    if (charge.status === "Pago" || billingChargeOpenAmount(charge) <= 0) return "Pago";
    const days = diffDays(charge.dueDate);
    if (days < 0) return "Vencido";
    if (days === 0) return "Vence hoje";
    return "A vencer";
  }

  function resetBillingCustomerForm() {
    setBillingCustomerForm({ ...emptyBillingCustomerForm, registeredAt: today() });
    setEditingBillingCustomerId(null);
  }

  function resetBillingChargeForm() {
    setBillingChargeForm({ ...emptyBillingChargeForm, firstDueDate: today() });
  }

  function saveBillingCustomer(event) {
    event.preventDefault();
    const fullName = billingCustomerForm.fullName.trim();
    const cpf = maskCpf(billingCustomerForm.cpf);
    if (!fullName) return alert("Informe o nome completo.");
    if (!isValidCpf(cpf)) return alert("Informe um CPF valido.");
    if (!billingCustomerForm.phone.trim()) return alert("Informe o telefone/WhatsApp.");

    const duplicateCpf = billingCustomers.some((customer) => customer.id !== editingBillingCustomerId && onlyDigits(customer.cpf) === onlyDigits(cpf));
    if (duplicateCpf) return alert("Ja existe cliente cadastrado com este CPF.");

    const record = {
      ...billingCustomerForm,
      id: editingBillingCustomerId || crypto.randomUUID(),
      fullName,
      cpf,
      zipCode: maskCep(billingCustomerForm.zipCode),
      registeredAt: billingCustomerForm.registeredAt || today(),
      updatedAt: new Date().toISOString()
    };

    const nextCustomers = editingBillingCustomerId
      ? billingCustomers.map((customer) => customer.id === editingBillingCustomerId ? record : customer)
      : [record, ...billingCustomers];
    setBillingCustomers(nextCustomers);
    persistBillingData(nextCustomers, billingCharges, { silent: true });
    setSelectedBillingCustomerId(record.id);
    resetBillingCustomerForm();
  }

  function editBillingCustomer(customer) {
    setBillingCustomerForm({ ...emptyBillingCustomerForm, ...customer });
    setEditingBillingCustomerId(customer.id);
    setBillingPage("clientes");
  }

  function buildBillingInstallments() {
    const totalAmount = parseMoneyValue(billingChargeForm.totalAmount);
    const chargeType = billingChargeForm.chargeType;
    const totalInstallments = chargeType === "À vista" ? 1 : Math.max(Number(billingChargeForm.installments || 1), 1);
    const amount = parseMoneyValue(billingChargeForm.installmentAmount) || Number((totalAmount / totalInstallments).toFixed(2));
    const parentChargeId = crypto.randomUUID();

    return Array.from({ length: totalInstallments }).map((_, index) => {
      const dueDate = addMonthsToDate(billingChargeForm.firstDueDate, index, chargeType === "Recorrente mensal" ? billingChargeForm.fixedDueDay : "");
      return {
        id: crypto.randomUUID(),
        parentChargeId,
        customerId: billingChargeForm.customerId,
        paymentMethod: billingChargeForm.paymentMethod,
        chargeType,
        totalAmount,
        amount,
        paidAmount: 0,
        installmentNumber: index + 1,
        totalInstallments,
        dueDate,
        fixedDueDay: billingChargeForm.fixedDueDay,
        status: "A vencer",
        notes: billingChargeForm.notes || "",
        history: [{ date: new Date().toLocaleString("pt-BR"), action: "Cobrança criada", note: `Parcela ${index + 1}/${totalInstallments}` }],
        createdAt: new Date().toISOString()
      };
    });
  }

  function saveBillingCharge(event) {
    event.preventDefault();
    if (!billingChargeForm.customerId) return alert("Selecione um cliente.");
    if (parseMoneyValue(billingChargeForm.totalAmount) <= 0) return alert("Informe um valor total maior que zero.");
    if (!billingChargeForm.firstDueDate) return alert("Informe a data do primeiro vencimento.");
    if (billingChargeForm.chargeType !== "À vista" && Number(billingChargeForm.installments || 0) <= 0) return alert("Informe a quantidade de parcelas.");

    const installments = buildBillingInstallments();
    const nextCharges = [...installments, ...billingCharges];
    setBillingCharges(nextCharges);
    persistBillingData(billingCustomers, nextCharges, { silent: true });
    resetBillingChargeForm();
    setBillingPage("cobrancas");
  }

  function updateBillingCharge(chargeId, updater) {
    const nextCharges = billingCharges.map((charge) => charge.id === chargeId ? updater(charge) : charge);
    setBillingCharges(nextCharges);
    persistBillingData(billingCustomers, nextCharges, { silent: true });
  }

  function addBillingHistory(charge, action, note = "") {
    return [...(charge.history || []), { date: new Date().toLocaleString("pt-BR"), action, note }];
  }

  function markBillingChargePaid(charge) {
    updateBillingCharge(charge.id, (current) => ({
      ...current,
      paidAmount: Number(current.amount || 0),
      status: "Pago",
      paidAt: today(),
      history: addBillingHistory(current, "Pagamento integral", money(Number(current.amount || 0)))
    }));
  }

  function registerBillingPartialPayment(charge) {
    const value = parseMoneyValue(window.prompt("Valor do pagamento parcial:", ""));
    if (value <= 0) return alert("Informe um valor maior que zero.");
    updateBillingCharge(charge.id, (current) => {
      const nextPaid = Math.min(Number(current.amount || 0), billingChargePaidAmount(current) + value);
      const paid = nextPaid >= Number(current.amount || 0);
      return {
        ...current,
        paidAmount: nextPaid,
        status: paid ? "Pago" : billingChargeStatus(current),
        paidAt: paid ? today() : current.paidAt,
        history: addBillingHistory(current, "Pagamento parcial", money(value))
      };
    });
  }

  function editBillingDueDate(charge) {
    const dueDate = window.prompt("Novo vencimento (AAAA-MM-DD):", charge.dueDate);
    if (!dueDate) return;
    updateBillingCharge(charge.id, (current) => ({
      ...current,
      dueDate,
      history: addBillingHistory(current, "Vencimento editado", dueDate)
    }));
  }

  function cancelBillingCharge(charge) {
    if (!confirm("Deseja cancelar esta cobrança?")) return;
    updateBillingCharge(charge.id, (current) => ({
      ...current,
      status: "Cancelado",
      history: addBillingHistory(current, "Cobrança cancelada")
    }));
  }

  function addBillingObservation(charge) {
    const note = window.prompt("Observação da cobrança:", charge.notes || "");
    if (note === null) return;
    updateBillingCharge(charge.id, (current) => ({
      ...current,
      notes: note,
      history: addBillingHistory(current, "Observação adicionada", note)
    }));
  }

  function billingMetrics() {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const isCurrentMonth = (date) => {
      const current = new Date(`${date}T00:00:00`);
      return current.getMonth() === month && current.getFullYear() === year;
    };
    const activeCharges = billingCharges.filter((charge) => billingChargeStatus(charge) !== "Cancelado");
    const totalToReceive = activeCharges.filter((charge) => isCurrentMonth(charge.dueDate) && billingChargeStatus(charge) !== "Pago").reduce((sum, charge) => sum + billingChargeOpenAmount(charge), 0);
    const totalReceived = activeCharges.filter((charge) => charge.paidAt && isCurrentMonth(charge.paidAt)).reduce((sum, charge) => sum + billingChargePaidAmount(charge), 0);
    const overdue = activeCharges.filter((charge) => billingChargeStatus(charge) === "Vencido");
    const overdueCustomerIds = new Set(overdue.map((charge) => charge.customerId));
    return {
      totalToReceive,
      totalReceived,
      totalOverdue: overdue.reduce((sum, charge) => sum + billingChargeOpenAmount(charge), 0),
      delinquentCustomers: billingCustomers.filter((customer) => customer.status === "Inadimplente" || overdueCustomerIds.has(customer.id)).length,
      dueToday: activeCharges.filter((charge) => billingChargeStatus(charge) === "Vence hoje").length,
      dueNext7: activeCharges.filter((charge) => {
        const days = diffDays(charge.dueDate);
        return days > 0 && days <= 7 && billingChargeStatus(charge) !== "Pago";
      }).length
    };
  }

  function billingChargeGroupKey(charge) {
    return charge.parentChargeId || charge.saleId || `${charge.customerId}-${charge.chargeType}-${charge.paymentMethod}-${charge.totalAmount || charge.amount}-${charge.createdAt || charge.dueDate}`;
  }

  function billingGroupCharges(charges) {
    const groups = new Map();
    charges.forEach((charge) => {
      const key = billingChargeGroupKey(charge);
      const current = groups.get(key) || [];
      current.push(charge);
      groups.set(key, current);
    });
    return Array.from(groups.entries()).map(([id, groupCharges]) => {
      const sorted = [...groupCharges].sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)) || Number(a.installmentNumber || 0) - Number(b.installmentNumber || 0));
      const first = sorted[0];
      const customer = billingCustomerById(first.customerId);
      const statuses = sorted.map((charge) => billingChargeStatus(charge));
      const openCharge = sorted.find((charge) => !["Pago", "Cancelado"].includes(billingChargeStatus(charge))) || sorted[0];
      const totalAmount = sorted.reduce((sum, charge) => sum + Number(charge.amount || 0), 0);
      const paidAmount = sorted.reduce((sum, charge) => sum + billingChargePaidAmount(charge), 0);
      const status = statuses.every((item) => item === "Cancelado") ? "Cancelado"
        : statuses.every((item) => item === "Pago") ? "Pago"
          : statuses.includes("Vencido") ? "Vencido"
            : statuses.includes("Vence hoje") ? "Vence hoje"
              : paidAmount > 0 ? "Parcial" : "Pendente";
      return {
        id,
        customer,
        charges: sorted,
        primaryCharge: openCharge,
        firstCharge: first,
        installmentText: sorted.length > 1 ? `1/${sorted.length}` : `${first.installmentNumber || 1}/${first.totalInstallments || 1}`,
        dueDate: openCharge?.dueDate || first.dueDate,
        totalAmount,
        paidAmount,
        status,
        paymentMethod: first.paymentMethod
      };
    });
  }

  function filteredBillingChargeGroups() {
    return billingGroupCharges(filteredBillingCharges());
  }

  function updateBillingChargeGroup(group, updater) {
    const groupIds = new Set(group.charges.map((charge) => charge.id));
    const nextCharges = billingCharges.map((charge) => groupIds.has(charge.id) ? updater(charge) : charge);
    setBillingCharges(nextCharges);
    persistBillingData(billingCustomers, nextCharges, { silent: true });
  }

  function markBillingGroupPaid(group) {
    updateBillingChargeGroup(group, (current) => ({
      ...current,
      paidAmount: Number(current.amount || 0),
      status: "Pago",
      paidAt: today(),
      history: addBillingHistory(current, "Pagamento integral", "Cobrança consolidada")
    }));
    setOpenBillingActionId("");
  }

  function cancelBillingGroup(group) {
    if (!confirm("Deseja cancelar esta cobrança?")) return;
    updateBillingChargeGroup(group, (current) => ({
      ...current,
      status: "Cancelado",
      history: addBillingHistory(current, "Cobrança cancelada", "Cobrança consolidada")
    }));
    setOpenBillingActionId("");
  }

  function billingGroupStatusClass(status) {
    return `billing-status-${status.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")}`;
  }
  function filteredBillingCharges() {
    return billingCharges.filter((charge) => {
      const customer = billingCustomerById(charge.customerId);
      const status = billingChargeStatus(charge);
      const matchesCustomer = !billingFilters.customer || (customer?.fullName || "").toLowerCase().includes(billingFilters.customer.toLowerCase());
      const matchesCpf = !billingFilters.cpf || onlyDigits(customer?.cpf).includes(onlyDigits(billingFilters.cpf));
      const matchesStatus = billingFilters.status === "Todos" || status === billingFilters.status;
      const matchesPayment = billingFilters.paymentMethod === "Todos" || charge.paymentMethod === billingFilters.paymentMethod;
      const matchesStart = !billingFilters.periodStart || charge.dueDate >= billingFilters.periodStart;
      const matchesEnd = !billingFilters.periodEnd || charge.dueDate <= billingFilters.periodEnd;
      const matchesView = billingFilters.view === "Todos"
        || (billingFilters.view === "Pagos" && status === "Pago")
        || (billingFilters.view === "Vencidos" && status === "Vencido")
        || (billingFilters.view === "Em aberto" && !["Pago", "Cancelado"].includes(status));
      return matchesCustomer && matchesCpf && matchesStatus && matchesPayment && matchesStart && matchesEnd && matchesView;
    });
  }

  function customerFinancialSummary(customerId) {
    const charges = billingCharges.filter((charge) => charge.customerId === customerId && billingChargeStatus(charge) !== "Cancelado");
    const payments = charges.flatMap((charge) => (charge.history || []).filter((item) => item.action.includes("Pagamento")).map((item) => ({ ...item, charge })));
    return {
      totalBought: charges.reduce((sum, charge) => sum + Number(charge.amount || 0), 0),
      totalPaid: charges.reduce((sum, charge) => sum + billingChargePaidAmount(charge), 0),
      totalOpen: charges.reduce((sum, charge) => sum + billingChargeOpenAmount(charge), 0),
      totalOverdue: charges.filter((charge) => billingChargeStatus(charge) === "Vencido").reduce((sum, charge) => sum + billingChargeOpenAmount(charge), 0),
      lastPayment: payments[payments.length - 1]?.date || "--",
      futureInstallments: charges.filter((charge) => billingChargeStatus(charge) === "A vencer").length,
      overdueInstallments: charges.filter((charge) => billingChargeStatus(charge) === "Vencido").length
    };
  }

  function renderBillingDashboard() {
    const metrics = billingMetrics();
    return (
      <section className="module-content stock-wide">
        <h2>Faturamento</h2>
        <p className="stock-help">Visão financeira do mês, cobranças em aberto e inadimplência.</p>
        <div className="acomp-grid">
          <MiniDashCard title="A receber no mês" value={money(metrics.totalToReceive)} detail="Parcelas em aberto" />
          <MiniDashCard title="Recebido" value={money(metrics.totalReceived)} detail="Pagamentos do mês" />
          <MiniDashCard title="Vencido" value={money(metrics.totalOverdue)} detail="Em atraso" danger={metrics.totalOverdue > 0} />
          <MiniDashCard title="Clientes inadimplentes" value={metrics.delinquentCustomers} detail="Status ou parcelas vencidas" danger={metrics.delinquentCustomers > 0} />
          <MiniDashCard title="Vencem hoje" value={metrics.dueToday} detail="Cobranças do dia" warning={metrics.dueToday > 0} />
          <MiniDashCard title="Próx. 7 dias" value={metrics.dueNext7} detail="A vencer em breve" warning={metrics.dueNext7 > 0} />
        </div>
      </section>
    );
  }

  function renderBillingCustomers() {
    const selectedCustomer = billingCustomerById(selectedBillingCustomerId) || billingCustomers[0];
    const summary = selectedCustomer ? customerFinancialSummary(selectedCustomer.id) : null;
    return (
      <section className="module-content stock-wide">
        <h2>Clientes de faturamento</h2>
        <form className="stock-form-grid" onSubmit={saveBillingCustomer}>
          <label>Nome completo<input value={billingCustomerForm.fullName} onChange={(event) => setBillingCustomerForm({ ...billingCustomerForm, fullName: event.target.value })} /></label>
          <label>CPF<input value={billingCustomerForm.cpf} onChange={(event) => setBillingCustomerForm({ ...billingCustomerForm, cpf: maskCpf(event.target.value) })} placeholder="000.000.000-00" /></label>
          <label>Data de nascimento<input type="date" value={billingCustomerForm.birthDate} onChange={(event) => setBillingCustomerForm({ ...billingCustomerForm, birthDate: event.target.value })} /></label>
          <label>Telefone/WhatsApp<input value={billingCustomerForm.phone} onChange={(event) => setBillingCustomerForm({ ...billingCustomerForm, phone: event.target.value })} /></label>
          <label>E-mail<input type="email" value={billingCustomerForm.email} onChange={(event) => setBillingCustomerForm({ ...billingCustomerForm, email: event.target.value })} /></label>
          <label>CEP<input value={billingCustomerForm.zipCode} onChange={(event) => setBillingCustomerForm({ ...billingCustomerForm, zipCode: maskCep(event.target.value) })} onBlur={() => {}} placeholder="Preparado para ViaCEP" /></label>
          <label>Endereço<input value={billingCustomerForm.address} onChange={(event) => setBillingCustomerForm({ ...billingCustomerForm, address: event.target.value })} /></label>
          <label>Número<input value={billingCustomerForm.number} onChange={(event) => setBillingCustomerForm({ ...billingCustomerForm, number: event.target.value })} /></label>
          <label>Complemento<input value={billingCustomerForm.complement} onChange={(event) => setBillingCustomerForm({ ...billingCustomerForm, complement: event.target.value })} /></label>
          <label>Bairro<input value={billingCustomerForm.district} onChange={(event) => setBillingCustomerForm({ ...billingCustomerForm, district: event.target.value })} /></label>
          <label>Cidade<input value={billingCustomerForm.city} onChange={(event) => setBillingCustomerForm({ ...billingCustomerForm, city: event.target.value })} /></label>
          <label>Estado<input value={billingCustomerForm.state} onChange={(event) => setBillingCustomerForm({ ...billingCustomerForm, state: event.target.value.toUpperCase().slice(0, 2) })} /></label>
          <label>Status<select value={billingCustomerForm.status} onChange={(event) => setBillingCustomerForm({ ...billingCustomerForm, status: event.target.value })}><option>Ativo</option><option>Inativo</option><option>Inadimplente</option></select></label>
          <label>Data de cadastro<input type="date" value={billingCustomerForm.registeredAt} onChange={(event) => setBillingCustomerForm({ ...billingCustomerForm, registeredAt: event.target.value })} /></label>
          <label className="stock-form-grid-full">Observações<textarea value={billingCustomerForm.notes} onChange={(event) => setBillingCustomerForm({ ...billingCustomerForm, notes: event.target.value })} /></label>
          <button className="primary" type="submit">{editingBillingCustomerId ? "Salvar cliente" : "Cadastrar cliente"}</button>
          {editingBillingCustomerId && <button className="secondary" type="button" onClick={resetBillingCustomerForm}>Cancelar edição</button>}
        </form>

        {selectedCustomer && summary && (
          <div className="billing-history-panel">
            <div className="access-section-heading"><div><h2>Histórico financeiro</h2><p className="stock-help">{selectedCustomer.fullName}</p></div></div>
            <div className="workflow-summary-grid">
              <div><span>Total comprado</span><strong>{money(summary.totalBought)}</strong></div>
              <div><span>Total pago</span><strong>{money(summary.totalPaid)}</strong></div>
              <div><span>Em aberto</span><strong>{money(summary.totalOpen)}</strong></div>
              <div><span>Vencido</span><strong>{money(summary.totalOverdue)}</strong></div>
              <div><span>Último pagamento</span><strong>{summary.lastPayment}</strong></div>
              <div><span>Parcelas futuras</span><strong>{summary.futureInstallments}</strong></div>
              <div><span>Parcelas vencidas</span><strong>{summary.overdueInstallments}</strong></div>
            </div>
          </div>
        )}

        <div className="stock-table-wrap billing-table-gap"><table><thead><tr><th>Cliente</th><th>CPF</th><th>WhatsApp</th><th>Status</th><th>Cadastro</th><th>Ações</th></tr></thead><tbody>{billingCustomers.map((customer) => (<tr key={customer.id}><td>{customer.fullName}</td><td>{customer.cpf}</td><td>{customer.phone}</td><td><span className="status-pill">{customer.status}</span></td><td>{formatDate(customer.registeredAt)}</td><td><div className="action-buttons"><button type="button" onClick={() => setSelectedBillingCustomerId(customer.id)}>Histórico</button><button type="button" onClick={() => editBillingCustomer(customer)}>Editar</button></div></td></tr>))}</tbody></table></div>
      </section>
    );
  }

  function renderBillingChargeForm() {
    const total = parseMoneyValue(billingChargeForm.totalAmount);
    const installments = billingChargeForm.chargeType === "À vista" ? 1 : Math.max(Number(billingChargeForm.installments || 1), 1);
    const suggestedInstallment = total ? money(total / installments) : "--";
    return (
      <section className="module-content stock-wide">
        <h2>Gerar cobrança</h2>
        <form className="stock-form-grid" onSubmit={saveBillingCharge}>
          <label>Cliente vinculado<select value={billingChargeForm.customerId} onChange={(event) => setBillingChargeForm({ ...billingChargeForm, customerId: event.target.value })}><option value="">Selecione</option>{billingCustomers.filter((customer) => customer.status !== "Inativo").map((customer) => <option key={customer.id} value={customer.id}>{customer.fullName} - {customer.cpf}</option>)}</select></label>
          <label>Forma de pagamento<select value={billingChargeForm.paymentMethod} onChange={(event) => setBillingChargeForm({ ...billingChargeForm, paymentMethod: event.target.value })}>{["PIX", "Cartão de crédito", "Cartão de débito", "Dinheiro", "Boleto", "Transferência"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Tipo de cobrança<select value={billingChargeForm.chargeType} onChange={(event) => setBillingChargeForm({ ...billingChargeForm, chargeType: event.target.value, installments: event.target.value === "À vista" ? "1" : billingChargeForm.installments })}>{["À vista", "Parcelado", "Recorrente mensal"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Valor total<input value={billingChargeForm.totalAmount} onChange={(event) => setBillingChargeForm({ ...billingChargeForm, totalAmount: event.target.value })} placeholder="Ex: 1200,00" /></label>
          <label>Quantidade de parcelas<input type="number" min="1" value={billingChargeForm.installments} disabled={billingChargeForm.chargeType === "À vista"} onChange={(event) => setBillingChargeForm({ ...billingChargeForm, installments: event.target.value })} /></label>
          <label>Valor da parcela<input value={billingChargeForm.installmentAmount} onChange={(event) => setBillingChargeForm({ ...billingChargeForm, installmentAmount: event.target.value })} placeholder={suggestedInstallment} /></label>
          <label>Primeiro vencimento<input type="date" value={billingChargeForm.firstDueDate} onChange={(event) => setBillingChargeForm({ ...billingChargeForm, firstDueDate: event.target.value })} /></label>
          <label>Dia fixo de vencimento<input type="number" min="1" max="31" value={billingChargeForm.fixedDueDay} onChange={(event) => setBillingChargeForm({ ...billingChargeForm, fixedDueDay: event.target.value })} placeholder="Ex: 10" /></label>
          <label className="stock-form-grid-full">Observação<input value={billingChargeForm.notes} onChange={(event) => setBillingChargeForm({ ...billingChargeForm, notes: event.target.value })} /></label>
          <button className="primary" type="submit">Gerar cobrança</button>
        </form>
      </section>
    );
  }

  function renderBillingCharges() {
    const chargeGroups = filteredBillingChargeGroups();
    return (
      <section className="module-content stock-wide billing-charges-panel">
        <h2>Cobranças</h2>
        <div className="stock-filter-grid billing-filter-grid billing-filter-compact">
          <input value={billingFilters.customer} onChange={(event) => setBillingFilters({ ...billingFilters, customer: event.target.value })} placeholder="Cliente" />
          <input value={billingFilters.cpf} onChange={(event) => setBillingFilters({ ...billingFilters, cpf: maskCpf(event.target.value) })} placeholder="CPF" />
          <select value={billingFilters.status} onChange={(event) => setBillingFilters({ ...billingFilters, status: event.target.value })}>{["Todos", "A vencer", "Vence hoje", "Vencido", "Pago", "Cancelado"].map((item) => <option key={item}>{item}</option>)}</select>
          <select value={billingFilters.paymentMethod} onChange={(event) => setBillingFilters({ ...billingFilters, paymentMethod: event.target.value })}>{["Todos", "PIX", "Cartão de crédito", "Cartão de débito", "Dinheiro", "Boleto", "Transferência"].map((item) => <option key={item}>{item}</option>)}</select>
          <input type="date" value={billingFilters.periodStart} onChange={(event) => setBillingFilters({ ...billingFilters, periodStart: event.target.value })} />
          <input type="date" value={billingFilters.periodEnd} onChange={(event) => setBillingFilters({ ...billingFilters, periodEnd: event.target.value })} />
          <select value={billingFilters.view} onChange={(event) => setBillingFilters({ ...billingFilters, view: event.target.value })}>{["Todos", "Pagos", "Vencidos", "Em aberto"].map((item) => <option key={item}>{item}</option>)}</select>
        </div>
        <div className="stock-table-wrap billing-table-card">
          <table className="billing-prototype-table">
            <thead><tr><th>Cliente</th><th>CPF</th><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Pago</th><th>Status</th><th>Pagamento</th><th>Ações</th></tr></thead>
            <tbody>
              {chargeGroups.map((group) => (
                <tr key={group.id}>
                  <td>{group.customer?.fullName || "--"}</td>
                  <td>{group.customer?.cpf || "--"}</td>
                  <td>{group.installmentText}</td>
                  <td>{formatDate(group.dueDate)}</td>
                  <td>{money(group.totalAmount)}</td>
                  <td>{money(group.paidAmount)}</td>
                  <td><span className={`billing-status-pill ${billingGroupStatusClass(group.status)}`}>{group.status}</span></td>
                  <td>{group.paymentMethod}</td>
                  <td>
                    <div className="table-action-menu billing-action-menu">
                      <button
                        type="button"
                        className="billing-gear-button"
                        aria-label="Abrir ações da cobrança"
                        onClick={() => setOpenBillingActionId(openBillingActionId === group.id ? "" : group.id)}
                      >
                        ⚙
                      </button>
                      {openBillingActionId === group.id && (
                        <div className="table-action-menu-list billing-action-list">
                          <button type="button" onClick={() => markBillingGroupPaid(group)}>Pagar</button>
                          <button type="button" onClick={() => { setOpenBillingActionId(""); registerBillingPartialPayment(group.primaryCharge); }}>Pagamento parcial</button>
                          <button type="button" onClick={() => { setOpenBillingActionId(""); editBillingDueDate(group.primaryCharge); }}>Editar vencimento</button>
                          <button type="button" onClick={() => { setOpenBillingActionId(""); addBillingObservation(group.primaryCharge); }}>Adicionar observação</button>
                          <button type="button" onClick={() => { setOpenBillingActionId(""); setSelectedBillingCharge(group.primaryCharge); }}>Histórico</button>
                          <button type="button" className="danger-action" onClick={() => cancelBillingGroup(group)}>Cancelar cobrança</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }
  function renderBillingHistoryModal() {
    if (!selectedBillingCharge) return null;
    const customer = billingCustomerById(selectedBillingCharge.customerId);
    return (
      <StockModal title="Histórico da cobrança" onClose={() => setSelectedBillingCharge(null)}>
        <div className="billing-history-modal">
          <strong>{customer?.fullName || "Cliente"}</strong>
          <p className="stock-help">Parcela {selectedBillingCharge.installmentNumber}/{selectedBillingCharge.totalInstallments} • {money(Number(selectedBillingCharge.amount || 0))}</p>
          {(selectedBillingCharge.history || []).map((item, index) => (<article className="kanban-comment" key={`${item.date}-${index}`}><strong>{item.action}</strong><p>{item.note || "--"}</p><small>{item.date}</small></article>))}
          {selectedBillingCharge.notes && <div className="pending-reason-box"><strong>Observação atual:</strong><span>{selectedBillingCharge.notes}</span></div>}
        </div>
      </StockModal>
    );
  }

  function renderSaleCustomerPicker() {
    const query = saleForm.customerSearch.toLowerCase();
    const customers = billingCustomers.filter((customer) => customer.status !== "Inativo" && (!query || customer.fullName.toLowerCase().includes(query) || onlyDigits(customer.cpf).includes(onlyDigits(query)) || onlyDigits(customer.phone).includes(onlyDigits(query))));
    const selected = saleCustomerById(saleForm.customerId);
    return (
      <div className="sale-customer-box stock-form-grid-full">
        <label>Buscar cliente<input value={saleForm.customerSearch} onChange={(event) => updateSaleForm("customerSearch", event.target.value)} placeholder="Nome, CPF ou telefone" /></label>
        <label>Selecionar cliente<select value={saleForm.customerId} onChange={(event) => updateSaleForm("customerId", event.target.value)}><option value="">Selecione</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.fullName} - {customer.cpf} - {customer.phone}</option>)}</select></label>
        {selected && <div className="sale-client-summary"><strong>{selected.fullName}</strong><span>{selected.cpf} · {selected.phone}</span><small>{selected.email || "Sem e-mail"}</small></div>}
      </div>
    );
  }

  function renderSaleItemsEditor() {
    const activeItems = activeMenuItemsForSale();
    return (
      <div className="sale-items-box stock-form-grid-full">
        <div className="stock-title-row compact"><div><strong>Itens vendidos</strong><p className="stock-help">Use apenas itens ativos do cadastro de Menu.</p></div><button className="secondary" type="button" onClick={addSaleItem}>Adicionar item</button></div>
        {saleItems.map((item, index) => {
          const selected = menuItemById(item.menuItemId);
          const subtotal = Math.max(Number(item.quantity || 0) * Number(item.unitPrice || 0) - Number(item.discount || 0), 0);
          return (
            <div className="sale-item-row" key={index}>
              <select value={item.menuItemId} onChange={(event) => updateSaleItem(index, "menuItemId", event.target.value)}><option value="">Item do menu</option>{activeItems.map((menuItem) => <option key={menuItem.id} value={menuItem.id}>{menuItem.dishName} - {menuItem.type} - {money(Number(menuItem.saleValue || 0))}</option>)}</select>
              <input type="number" min="1" step="1" value={item.quantity} onChange={(event) => updateSaleItem(index, "quantity", event.target.value)} placeholder="Qtd." />
              <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => updateSaleItem(index, "unitPrice", event.target.value)} placeholder="Valor unit." />
              <input type="number" min="0" step="0.01" value={item.discount} onChange={(event) => updateSaleItem(index, "discount", event.target.value)} placeholder="Desconto" />
              <span>{money(subtotal)}</span>
              <button className="danger" type="button" onClick={() => removeSaleItem(index)}>Remover</button>
              {selected && <small>{selected.type} · {(selected.portions || []).length} porcionamento(s)</small>}
            </div>
          );
        })}
      </div>
    );
  }

  function renderSaleModal() {
    if (!showSaleModal) return null;
    const totals = saleTotals();
    const canInstallment = saleForm.saleType === "Cliente";
    return (
      <StockModal title={editingSaleId ? "Editar venda aberta" : "Nova venda"} onClose={closeSaleModal} className="sales-entry-modal">
        <div className="sales-modal-scroll">
          <p className="stock-help stock-modal-help">Registre a venda sem sair da listagem. Use apenas itens ativos do cadastro de Menu.</p>
          <form className="stock-form-grid stock-modal-form sale-modal-form" onSubmit={(event) => event.preventDefault()}>
            <label>Tipo de venda<select value={saleForm.saleType} onChange={(event) => updateSaleForm("saleType", event.target.value)}><option>Avulsa</option><option>Cliente</option></select></label>
            <label>Modelo da venda<select value={saleForm.saleModel} disabled={!canInstallment} onChange={(event) => updateSaleForm("saleModel", event.target.value)}><option>À vista</option><option>Parcelada</option></select></label>
            {saleForm.saleType === "Cliente" ? renderSaleCustomerPicker() : (<><label>Nome do comprador<input value={saleForm.buyerName} onChange={(event) => updateSaleForm("buyerName", event.target.value)} placeholder="Opcional" /></label><label>Telefone<input value={saleForm.buyerPhone} onChange={(event) => updateSaleForm("buyerPhone", event.target.value)} placeholder="Opcional" /></label></>)}
            {renderSaleItemsEditor()}
            <label>Forma de pagamento<select value={saleForm.paymentMethod} onChange={(event) => updateSaleForm("paymentMethod", event.target.value)}>{["PIX", "Dinheiro", "Cartão de débito", "Cartão de crédito", "Transferência", "Boleto"].map((item) => <option key={item}>{item}</option>)}</select></label>
            {saleForm.saleModel === "À vista" && <label>Status do pagamento<select value={saleForm.paymentStatus} onChange={(event) => updateSaleForm("paymentStatus", event.target.value)}><option>Pago</option><option>Pendente</option></select></label>}
            {saleForm.saleModel === "À vista" && saleForm.paymentStatus === "Pago" && <label>Data do pagamento<input type="date" value={saleForm.paymentDate} onChange={(event) => updateSaleForm("paymentDate", event.target.value)} /></label>}
            {saleForm.saleModel === "À vista" && saleForm.paymentStatus === "Pendente" && <label>Vencimento<input type="date" value={saleForm.firstDueDate} onChange={(event) => updateSaleForm("firstDueDate", event.target.value)} /></label>}
            {saleForm.saleModel === "Parcelada" && <label>Quantidade de parcelas<input type="number" min="2" value={saleForm.installments} onChange={(event) => updateSaleForm("installments", event.target.value)} /></label>}
            {saleForm.saleModel === "Parcelada" && <label>Primeiro vencimento<input type="date" value={saleForm.firstDueDate} onChange={(event) => updateSaleForm("firstDueDate", event.target.value)} /></label>}
            {saleForm.saleModel === "Parcelada" && <label>Dia fixo de vencimento<input type="number" min="1" max="31" value={saleForm.fixedDueDay} onChange={(event) => updateSaleForm("fixedDueDay", event.target.value)} placeholder="Opcional" /></label>}
            <label className="stock-form-grid-full">Observação<input value={saleForm.notes} onChange={(event) => updateSaleForm("notes", event.target.value)} placeholder="Observação da venda" /></label>
            <div className="sale-total-panel stock-form-grid-full"><span>Bruto <strong>{money(totals.gross)}</strong></span><span>Desconto <strong>{money(totals.discount)}</strong></span><span>Total final <strong>{money(totals.final)}</strong></span>{saleForm.saleModel === "Parcelada" && <span>Parcela <strong>{money(totals.final / Math.max(Number(saleForm.installments || 1), 1))}</strong></span>}</div>
            <div className="stock-modal-footer sale-modal-footer"><button className="secondary" type="button" onClick={closeSaleModal}>Cancelar</button><button className="secondary" type="button" onClick={saveSaleDraft}>Salvar venda</button><button className="primary" type="button" onClick={finalizeSale}>Finalizar venda</button></div>
          </form>
        </div>
      </StockModal>
    );
  }
  function renderSalesList() {
    const sales = filteredSalesRecords();
    return (
      <section className="module-content stock-wide sales-workspace">
        <div className="stock-title-row"><div><h2>Vendas realizadas</h2><p className="stock-help">Acompanhe vendas, rascunhos, pagamentos e parcelas vinculadas ao faturamento.</p></div><button className="primary" type="button" onClick={() => openSaleModal()}>Nova Venda</button></div>
        <div className="stock-filter-grid sales-filter-grid">
          <input type="date" value={salesFilters.periodStart} onChange={(event) => setSalesFilters({ ...salesFilters, periodStart: event.target.value })} />
          <input type="date" value={salesFilters.periodEnd} onChange={(event) => setSalesFilters({ ...salesFilters, periodEnd: event.target.value })} />
          <input value={salesFilters.customer} onChange={(event) => setSalesFilters({ ...salesFilters, customer: event.target.value })} placeholder="Cliente, CPF ou telefone" />
          <select value={salesFilters.saleType} onChange={(event) => setSalesFilters({ ...salesFilters, saleType: event.target.value })}>{["Todos", "Avulsa", "Cliente"].map((item) => <option key={item}>{item}</option>)}</select>
          <select value={salesFilters.paymentMethod} onChange={(event) => setSalesFilters({ ...salesFilters, paymentMethod: event.target.value })}>{["Todos", "PIX", "Dinheiro", "Cartão de débito", "Cartão de crédito", "Transferência", "Boleto"].map((item) => <option key={item}>{item}</option>)}</select>
          <select value={salesFilters.status} onChange={(event) => setSalesFilters({ ...salesFilters, status: event.target.value })}>{["Todos", "Aberta", "Finalizada", "Cancelada", "Paga", "Parcialmente paga", "Em atraso"].map((item) => <option key={item}>{item}</option>)}</select>
          <input value={salesFilters.item} onChange={(event) => setSalesFilters({ ...salesFilters, item: event.target.value })} placeholder="Item vendido" />
        </div>
        <div className="stock-table-wrap"><table><thead><tr><th>Data</th><th>Cliente/comprador</th><th>Tipo</th><th>Itens</th><th>Total</th><th>Pagamento</th><th>Status</th><th>Ações</th></tr></thead><tbody>{sales.map((sale) => { const status = saleStatus(sale); return <tr key={sale.id}><td>{formatDate(sale.saleDate)}</td><td>{saleBuyerName(sale)}</td><td>{sale.saleType}</td><td>{(sale.items || []).map((item) => `${item.quantity}x ${item.name}`).join(", ")}</td><td>{money(Number(sale.totalFinal || 0))}</td><td>{sale.paymentMethod}</td><td><span className="status-pill">{status}</span></td><td><div className="action-buttons">{status === "Aberta" && <button type="button" onClick={() => openSaleModal(sale)}>Editar</button>}<button type="button" onClick={() => setSelectedSale(sale)}>Detalhes</button><button type="button" onClick={() => markSalePaid(sale)}>Pagar</button><button type="button" onClick={() => setSelectedSale({ ...sale, showInstallments: true })}>Parcelas</button><button type="button" onClick={() => window.print()}>Imprimir</button><a className="button-link" href={saleWhatsappUrl(sale)} target="_blank" rel="noreferrer">WhatsApp</a><button type="button" onClick={() => cancelSale(sale)}>Cancelar</button></div></td></tr>; })}</tbody></table></div>
      </section>
    );
  }

  function renderSaleDetailsModal() {
    if (!selectedSale) return null;
    const installments = saleInstallments(selectedSale.id);
    return (
      <StockModal title={`Venda ${selectedSale.code}`} onClose={() => setSelectedSale(null)}>
        <div className="billing-history-modal sale-detail-modal">
          <strong>{saleBuyerName(selectedSale)} · {money(Number(selectedSale.totalFinal || 0))}</strong>
          <p className="stock-help">{selectedSale.saleType} · {selectedSale.saleModel} · {selectedSale.paymentMethod} · {saleStatus(selectedSale)}</p>
          <div className="stock-table-wrap"><table><thead><tr><th>Item</th><th>Categoria</th><th>Qtd.</th><th>Unitário</th><th>Desconto</th><th>Subtotal</th></tr></thead><tbody>{(selectedSale.items || []).map((item, index) => <tr key={`${item.menuItemId}-${index}`}><td>{item.name}</td><td>{item.category}</td><td>{item.quantity}</td><td>{money(Number(item.unitPrice || 0))}</td><td>{money(Number(item.discount || 0))}</td><td>{money(Number(item.subtotal || 0))}</td></tr>)}</tbody></table></div>
          {installments.length > 0 && <div className="stock-table-wrap"><table><thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Status</th></tr></thead><tbody>{installments.map((charge) => <tr key={charge.id}><td>{charge.installmentNumber}/{charge.totalInstallments}</td><td>{formatDate(charge.dueDate)}</td><td>{money(Number(charge.amount || 0))}</td><td>{billingChargeStatus(charge)}</td></tr>)}</tbody></table></div>}
          {(selectedSale.history || []).map((item, index) => <article className="kanban-comment" key={`${item.date}-${index}`}><strong>{item.action}</strong><p>{item.note || "--"}</p><small>{item.date}</small></article>)}
        </div>
      </StockModal>
    );
  }

  function renderSalesModule() {
    const items = [
      { id: "lista", label: "Vendas" }
    ];

    return (
      <OperationalModuleLayout className="sales-workspace" items={items} page="lista" onNavigate={() => {}}>
        {renderSalesList()}
        {renderSaleModal()}
        {renderSaleDetailsModal()}
      </OperationalModuleLayout>
    );
  }
  function renderBillingModule() {
    const items = [
      { id: "dashboard", label: "Painel" },
      { id: "clientes", label: "Clientes" },
      { id: "gerar", label: "Gerar cobrança" },
      { id: "cobrancas", label: "Cobranças" }
    ];

    return (
      <OperationalModuleLayout className="billing-workspace" items={items} page={billingPage} onNavigate={setBillingPage}>
        {billingPage === "dashboard" && renderBillingDashboard()}
        {billingPage === "clientes" && renderBillingCustomers()}
        {billingPage === "gerar" && renderBillingChargeForm()}
        {billingPage === "cobrancas" && renderBillingCharges()}
        {renderBillingHistoryModal()}
      </OperationalModuleLayout>
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
          <MiniDashCard title="Com evidência" value={checklistHistory.filter((record) => record.evidenceImage).length} detail="Atividades com foto anexada" />
          <MiniDashCard title="Usuários cadastrados" value={stockUsers.length} detail="Operação, setor, cargo e Telegram" />
          <MiniDashCard title="Telegram ativo" value={stockUsers.filter((user) => user.telegramEnabled).length} detail="Usuários aptos a receber alerta" />
        </div>
      </section>
    );
  }

  function renderStockModule() {
    const items = [
      { id: "itens", label: "Itens cadastrados" },
      { id: "estoque", label: "Estoque" },
      { id: "acompanhamento", label: "Acompanhamento (dashboard)" }
    ];

    return (
      <OperationalModuleLayout items={items} page={stockPage} onNavigate={setStockPage}>
        {stockPage === "itens" && renderStockItens()}
        {stockPage === "estoque" && renderStockEstoque()}
        {stockPage === "acompanhamento" && renderAcompanhamentoEstoque()}
        {renderActiveStockModal()}
      </OperationalModuleLayout>
    );
  }


  function renderChecklistAtividades() {
    return (
      <section className="module-content checklist-wide">
        <h2>Atividades do checklist</h2>
        <p className="stock-help">As atividades vêm do cadastro de Processo/Atividade feito no módulo Cadastros.</p>

        {checklistActivities.length === 0 ? (
          <div className="module-placeholder">
            <strong>Nenhuma atividade cadastrada</strong>
            <p>Volte ao módulo Cadastros → Processo/Atividade para criar atividades.</p>
          </div>
        ) : (
          <div className="stock-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Atividade</th>
                  <th>Área</th>
                  <th>Data</th>
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
                    <td>{formatDate(activity.scheduledDate || today())}</td>
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
    const visibleActivities = sortChecklistActivities(filteredChecklistActivities);
    const progress = checklistProgressFor(visibleActivities);
    const nextActivity = nextChecklistActivity(visibleActivities);
    const workflowGroups = [
      ["running", "Em andamento", "Finalize o que já começou"],
      ["pending", "Pendências", "Retome quando o impedimento for resolvido"],
      ["waiting", "Próximos checks", "Siga a rotina do turno"],
      ["done", "Concluídos hoje", "Registro do que já foi feito"]
    ];

    return (
      <section className="module-content checklist-wide">
        <div className="workflow-hero">
          <div>
            <span className="workflow-kicker">Rotina diária</span>
            <h2>Checks do turno</h2>
            <p className="stock-help">Fluxo simples para garçom, auxiliar de cozinha e operação: iniciar, anexar evidência quando necessário e finalizar.</p>
          </div>

          <div className="workflow-progress-card">
            <strong>{progress.percent}%</strong>
            <span>{progress.done} de {progress.total} concluídos</span>
            <div className="workflow-progress-track">
              <i style={{ width: `${progress.percent}%` }} />
            </div>
          </div>
        </div>

        {isOperationalUser() ? (
          <div className="operational-scope-box">
            <strong>Seu checklist</strong>
            <span>Área: {getUserOperationalArea() || "Não informada"}</span>
          </div>
        ) : (
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
        )}

        {visibleActivities.length > 0 && (
          <div className="workflow-summary-grid">
            <div>
              <span>A fazer</span>
              <strong>{visibleActivities.filter((activity) => checklistStatusFor(activity) === "waiting").length}</strong>
            </div>
            <div>
              <span>Em andamento</span>
              <strong>{progress.running}</strong>
            </div>
            <div>
              <span>Pendências</span>
              <strong>{progress.pending}</strong>
            </div>
            <div>
              <span>Próximo check</span>
              <strong>{nextActivity ? `${nextActivity.startTime || "--"} ${nextActivity.name}` : "Tudo em dia"}</strong>
            </div>
          </div>
        )}

        {checklistActivities.length === 0 ? (
          <div className="module-placeholder">
            <strong>Nenhuma atividade para executar</strong>
            <p>Cadastre um processo ou atividade para que ela apareça aqui.</p>
          </div>
        ) : (
          <div className="workflow-board">
            {workflowGroups.map(([status, title, helper]) => {
              const groupActivities = visibleActivities.filter((activity) => checklistStatusFor(activity) === status);
              if (status === "done" && groupActivities.length === 0) return null;

              return (
                <section className={`workflow-lane ${status}`} key={status}>
                  <header>
                    <div>
                      <strong>{title}</strong>
                      <span>{helper}</span>
                    </div>
                    <b>{groupActivities.length}</b>
                  </header>

                  {groupActivities.length === 0 ? (
                    <div className="workflow-empty">Nada aqui agora</div>
                  ) : (
                    <div className="checklist-card-list">
                      {groupActivities.map((activity) => {
                        const running = runningChecklist[activity.id];
                        const pending = pendingChecklist[activity.id];
                        const done = completedTodayIds.has(activity.id);
                        const cardClass = done ? "checklist-card done" : pending ? "checklist-card pending" : running ? "checklist-card running" : "checklist-card";

                        return (
                          <article className={cardClass} key={activity.id}>
                            <div className="checklist-card-info">
                              <div className="workflow-card-top">
                                <span className={`workflow-status ${checklistStatusFor(activity)}`}>{checklistStatusLabel(activity)}</span>
                                <small>{activity.startTime || "--"} às {activity.endTime || "--"}</small>
                              </div>
                              <strong>{activity.name}</strong>
                              <small>{activity.type} • Área: {activity.area || "--"} • {formatDate(activity.scheduledDate || today())}</small>

                              <div className="checklist-time-grid">
                                <div>
                                  <span>Início real</span>
                                  <b>{running?.startedAt || pending?.realStart || "--"}</b>
                                </div>
                                <div>
                                  <span>Status</span>
                                  <b>{pending ? "Pendência" : running ? punctualityStatus(activity.startTime, activity.endTime, running.startedAt, currentTimeHHMM()) : done ? "Concluído hoje" : "Aguardando"}</b>
                                </div>
                                <div>
                                  <span>Tempo</span>
                                  <b>{running ? durationFromMinutes(Number(running.accumulatedMinutes || 0) + minutesBetween(running.startedAt, currentTimeHHMM())) : pending ? durationFromMinutes(pending.accumulatedMinutes) : "--"}</b>
                                </div>
                              </div>

                              {pending && (
                                <div className="pending-reason-box">
                                  <strong>Motivo da pendência:</strong>
                                  <span>{pending.reason}</span>
                                  <small>Parado em: {pending.stoppedAtFull}</small>
                                </div>
                              )}

                              {running && (
                                <div className="evidence-box">
                                  <strong>Evidência da execução</strong>
                                  <p>Envie ou tire uma foto antes de finalizar esta atividade.</p>

                                  <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={(event) => handleChecklistEvidence(activity.id, event)}
                                  />

                                  {checklistEvidence[activity.id]?.image && (
                                    <div className="evidence-preview">
                                      <img src={checklistEvidence[activity.id].image} alt="Evidência da atividade" />
                                      <small>{checklistEvidence[activity.id].capturedAt}</small>
                                      <button className="danger" type="button" onClick={() => removeChecklistEvidence(activity.id)}>Remover foto</button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="checklist-actions">
                              {done ? (
                                <button className="done-button" disabled>Concluído</button>
                              ) : pending ? (
                                <button className="primary" onClick={() => startChecklistActivity(activity)}>Retomar</button>
                              ) : running ? (
                                <>
                                  <button className="pending-button" onClick={() => markChecklistPending(activity)}>Pendência</button>
                                  <button className="finish-button" onClick={() => finishChecklistActivity(activity)}>Finalizar</button>
                                </>
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
                  <th>Evidência</th>
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
                    <td>
                      {record.evidenceImage ? (
                        <a href={record.evidenceImage} target="_blank" rel="noreferrer">
                          <img className="history-evidence-thumb" src={record.evidenceImage} alt="Evidência" />
                        </a>
                      ) : (
                        "--"
                      )}
                    </td>
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
    const items = [
      { id: "executar", label: "Rotina de hoje" },
      { id: "kanban", label: "Kanban" },
      ...(!isOperationalUser() ? [
        { id: "atividades", label: "Atividades" },
        { id: "historico", label: "Histórico" },
        { id: "acompanhamento", label: "Acompanhamento (dashboard)" }
      ] : [])
    ];

    return (
      <OperationalModuleLayout className="checklist-workspace" items={items} page={checklistPage} onNavigate={setChecklistPage}>
        {checklistPage === "executar" && renderChecklistExecucao()}
        {checklistPage === "kanban" && renderKanbanModule()}
        {!isOperationalUser() && checklistPage === "atividades" && renderChecklistAtividades()}
        {!isOperationalUser() && checklistPage === "historico" && renderChecklistHistorico()}
        {!isOperationalUser() && checklistPage === "acompanhamento" && renderAcompanhamentoChecklist()}
      </OperationalModuleLayout>
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
    return getCurrentClientForUser(loggedUser, clients, viewedClientId);
  }

  function isOperationalUser() {
    return isPermissionOperationalUser(loggedUser);
  }

  function isClientAdminOrManager() {
    return isPermissionClientAdminOrManager(loggedUser);
  }

  function getUserOperationalArea() {
    return getPermissionOperationalArea(loggedUser);
  }

  function getAllowedModules() {
    return getVisibleModules(loggedUser, getCurrentClient(), SOLUTION_MODULES);
  }

  function canAccessModule(moduleId) {
    return canViewModule(loggedUser, getCurrentClient(), moduleId);
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
      { id: "produto", title: "Produto / Item", icon: "📦", description: "Cadastre produtos, itens, categorias e unidade padrão." },
      { id: "usuario", title: "Usuário", icon: "👤", description: "Cadastre funcionários, perfil, setor, cargo e Telegram." },
      { id: "processo", title: "Processo / Atividade", icon: "✅", description: "Cadastre rotinas operacionais para o checklist." },
      { id: "area", title: "Área / Departamento", icon: "🏢", description: "Cadastre áreas como Cozinha, Salão, Estoque e Bar." },
      { id: "fornecedor", title: "Fornecedor", icon: "🚚", description: "Cadastre fornecedores usados nas entradas de estoque." }
    ];

    return (
      <div className="cadastro-selector access-selector">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={accessCadastroType === option.id ? "cadastro-card active" : "cadastro-card"}
            onClick={() => {
              if (option.id === "usuario") return openStockUserModal();
              if (option.id === "processo") return openProcessActivityModal();
              if (option.id === "area") return openAreaDepartmentModal();
              if (option.id === "fornecedor") return openStockSupplierModal();
              return setAccessCadastroType(option.id);
            }}
          >
            <span>{option.icon}</span>
            <strong>{option.title}</strong>
            <small>{option.description}</small>
          </button>
        ))}
      </div>
    );
  }

  function renderAccessUserForm({ insideModal = false } = {}) {
    const selectedSectors = getSelectedStockUserSectors();
    const isEditing = Boolean(editingStockUserId);
    const contractedModuleIds = getCurrentClient()?.enabledModules || SOLUTION_MODULES.map((module) => module.id);
    const permissionModules = SOLUTION_MODULES.filter((module) => contractedModuleIds.includes(module.id));

    return (
      <div className={insideModal ? "access-user-editor access-user-editor-modal" : "access-user-editor"}>
        {!insideModal && (
          <div className="access-section-heading">
            <div>
              <h2>{isEditing ? "Editar usuário" : "Cadastrar usuário"}</h2>
              <p className="stock-help">Perfil, setores, permissões e notificações do funcionário.</p>
            </div>
            {isEditing && (
              <button className="secondary" type="button" onClick={resetStockUserForm}>Cancelar edição</button>
            )}
          </div>
        )}
        {insideModal && (
          <p className="stock-help">Perfil, setores, permissões e notificações do funcionário.</p>
        )}

        <form className="access-form-shell" onSubmit={saveStockUser}>
          <div className="access-form-grid">
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
              <select
                value={stockUserForm.profile}
                onChange={(event) => {
                  const nextProfile = event.target.value;
                  const currentSectors = getStockUserSectors();
                  const nextSectors = nextProfile === "Operação" ? currentSectors.slice(0, 1) : currentSectors;
                  setStockUserForm({
                    ...stockUserForm,
                    profile: nextProfile,
                    sector: nextSectors[0] || "",
                    sectors: nextSectors
                  });
                }}
              >
                <option>Operação</option>
                <option>Gestor</option>
                <option>Administrador</option>
              </select>
            </label>

            {!isMultiSectorProfile() ? (
              <label>
                Setor
                <select
                  value={stockUserForm.sector}
                  onChange={(event) => setStockUserForm({ ...stockUserForm, sector: event.target.value, sectors: event.target.value ? [event.target.value] : [] })}
                >
                  <option value="">Selecione</option>
                  {areas.map((area) => <option key={area}>{area}</option>)}
                </select>
              </label>
            ) : (
              <div className="access-sector-box">
                <strong>Setores</strong>
                <div className="access-sector-grid">
                  {areas.map((area) => (
                    <label key={area} className={selectedSectors.includes(area) ? "access-sector-option active" : "access-sector-option"}>
                      <input
                        type="checkbox"
                        checked={selectedSectors.includes(area)}
                        onChange={() => toggleStockUserSector(area)}
                      />
                      <span>{area}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

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
          </div>

          <div className="module-permission-box">
            <strong>Permissões de módulo</strong>

            <div className="module-permission-grid">
              {permissionModules.map((module) => (
                <label key={module.id} className="module-permission-option">
                  <input
                    type="checkbox"
                    checked={(stockUserForm.allowedModules || []).includes(module.id)}
                    onChange={(event) => {
                      const current = stockUserForm.allowedModules || [];
                      const next = event.target.checked
                        ? [...current, module.id]
                        : current.filter((item) => item !== module.id);

                      setStockUserForm({ ...stockUserForm, allowedModules: next });
                    }}
                  />
                  <span>{module.icon} {module.title}</span>
                </label>
              ))}
            </div>
          </div>

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

          <div className="access-form-actions">
            <button className="primary" type="submit">{isEditing ? "Salvar alterações" : "Cadastrar funcionário"}</button>
            {isEditing && <button className="secondary" type="button" onClick={resetStockUserForm}>Cancelar</button>}
          </div>
        </form>
      </div>
    );
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

    if (!processActivityForm.startTime) {
      alert("Informe a hora de início.");
      return;
    }

    if (!processActivityForm.endTime) {
      alert("Informe a hora fim.");
      return;
    }

    const repeats = processActivityForm.repeats === "Sim";
    const repeatQuantity = repeats ? Math.max(1, Number(processActivityForm.repeatQuantity || 1)) : 1;
    const frequency = repeats ? (processActivityForm.frequency || "Diário") : "Não se repete";

    const activitiesToCreate = Array.from({ length: repeatQuantity }, (_, index) => {
      return {
        id: crypto.randomUUID(),
        name: repeatQuantity > 1 ? `${processActivityForm.name.trim()} ${index + 1}/${repeatQuantity}` : processActivityForm.name.trim(),
        originalName: processActivityForm.name.trim(),
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
        repeatQuantity,
        frequency,
        scheduledDate: today(),
        recurrenceIndex: index + 1,
        recurrenceTotal: repeatQuantity,
        recurringTemplate: repeats
      };
    });

    setStockItems([...activitiesToCreate, ...stockItems]);

    setProcessActivityForm({
      name: "",
      type: processActivityForm.type,
      area: "",
      startTime: "",
      endTime: "",
      repeats: "Não",
      repeatQuantity: "1",
      frequency: "Diário"
    });
    closeProcessActivityModal();
  }


  function renderAccessProcessForm({ insideModal = false } = {}) {
    return (
      <>
        {!insideModal && <h2>Cadastrar processo ou atividade</h2>}
        <p className="stock-help">Cadastre rotinas operacionais que serão usadas no módulo Checklist. Se marcar repetição diária, a atividade volta automaticamente no dia seguinte após concluída.</p>

        <form className="stock-form-grid" onSubmit={saveProcessActivity}>
          <label>
            Tipo
            <select value={processActivityForm.type} onChange={(event) => updateProcessActivityForm("type", event.target.value)}>
              <option>Processo</option>
              <option>Atividade</option>
            </select>
          </label>

          <label>
            Processo / Atividade
            <input value={processActivityForm.name} onChange={(event) => updateProcessActivityForm("name", event.target.value)} placeholder="Ex: Limpeza da cozinha, Conferência de freezer" />
          </label>

          <label>
            Área referente
            <select value={processActivityForm.area} onChange={(event) => updateProcessActivityForm("area", event.target.value)}>
              <option value="">Selecione</option>
              {areas.map((area) => <option key={area}>{area}</option>)}
            </select>
          </label>

          <label>
            Hora início
            <input type="time" value={processActivityForm.startTime} onChange={(event) => updateProcessActivityForm("startTime", event.target.value)} />
          </label>

          <label>
            Hora fim
            <input type="time" value={processActivityForm.endTime} onChange={(event) => updateProcessActivityForm("endTime", event.target.value)} />
          </label>

          <label>
            Se repete?
            <select value={processActivityForm.repeats} onChange={(event) => updateProcessActivityForm("repeats", event.target.value)}>
              <option>Não</option>
              <option>Sim</option>
            </select>
          </label>

          <label>
            Quantas vezes repete?
            <input type="number" min="0" value={processActivityForm.repeatQuantity} onChange={(event) => updateProcessActivityForm("repeatQuantity", event.target.value)} placeholder="Ex: 3" disabled={processActivityForm.repeats === "Não"} />
          </label>

          <label>
            Frequência
            <select value={processActivityForm.frequency} onChange={(event) => updateProcessActivityForm("frequency", event.target.value)} disabled={processActivityForm.repeats === "Não"}>
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
    closeAreaDepartmentModal();
  }

  function deleteAreaDepartment(name) {
    if (!confirm("Deseja excluir esta área/departamento?")) return;

    const usedInActivities = stockItems.some((item) => item.area === name);
    const usedInUsers = stockUsers.some((user) => getStockUserSectors(user).includes(name));

    if (usedInActivities || usedInUsers) {
      alert("Não é possível excluir uma área vinculada a usuário ou processo/atividade.");
      return;
    }

    setAreas(areas.filter((area) => area !== name));
  }

  function renderAccessAreaForm({ insideModal = false } = {}) {
    return (
      <>
        {!insideModal && <h2>Cadastrar área / departamento</h2>}
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

  function renderAccessSupplierForm() {
    const suppliers = normalizedSuppliers();

    return (
      <>
        <p className="stock-help">Cadastre fornecedores por categoria para usar nas entradas de estoque e nas futuras listas de compra.</p>

        <form className="stock-form-grid" onSubmit={saveStockSupplier}>
          <label>
            Razão social
            <input
              value={stockSupplierForm.corporateName}
              onChange={(event) => setStockSupplierForm({ ...stockSupplierForm, corporateName: event.target.value })}
              placeholder="Ex: Distribuidora Central Ltda"
            />
          </label>

          <label>
            Nome fantasia
            <input
              value={stockSupplierForm.fantasyName}
              onChange={(event) => setStockSupplierForm({ ...stockSupplierForm, fantasyName: event.target.value })}
              placeholder="Ex: Distribuidora Central"
            />
          </label>

          <label>
            CNPJ
            <input
              value={stockSupplierForm.document}
              onChange={(event) => setStockSupplierForm({ ...stockSupplierForm, document: event.target.value })}
              placeholder="Ex: 00.000.000/0001-00"
            />
          </label>

          <label>
            Categoria de produto
            <select
              value={stockSupplierForm.categoryId}
              onChange={(event) => setStockSupplierForm({ ...stockSupplierForm, categoryId: event.target.value })}
            >
              <option value="">Selecione</option>
              {stockCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>

          <label>
            Status
            <select
              value={stockSupplierForm.status}
              onChange={(event) => setStockSupplierForm({ ...stockSupplierForm, status: event.target.value })}
            >
              <option>Ativo</option>
              <option>Inativo</option>
            </select>
          </label>

          <button className="primary" type="submit">
            {editingStockSupplierId ? "Salvar fornecedor" : "Cadastrar fornecedor"}
          </button>

          {editingStockSupplierId && (
            <button
              className="secondary"
              type="button"
              onClick={() => {
                setEditingStockSupplierId(null);
                setStockSupplierForm(emptySupplierForm);
              }}
            >
              Cancelar edição
            </button>
          )}
        </form>

        {suppliers.length === 0 ? (
          <div className="module-placeholder">
            <strong>Nenhum fornecedor cadastrado</strong>
            <p>Cadastre fornecedores para relacionar às próximas entradas de estoque.</p>
          </div>
        ) : (
          <div className="stock-table-wrap supplier-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome fantasia</th>
                  <th>Razão social</th>
                  <th>CNPJ</th>
                  <th>Categoria</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => {
                  const category = stockCategories.find((item) => item.id === supplier.categoryId);
                  return (
                    <tr key={supplier.id}>
                      <td>{supplier.fantasyName}</td>
                      <td>{supplier.corporateName}</td>
                      <td>{supplier.document || "-"}</td>
                      <td>{category?.name || "Sem categoria"}</td>
                      <td><span className="status-pill">{supplier.status}</span></td>
                      <td>
                        <div className="action-buttons">
                          <button type="button" onClick={() => editStockSupplier(supplier)}>Editar</button>
                          <button type="button" onClick={() => deleteStockSupplier(supplier.id)}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  }

  function getKanbanColumn(activity) {
    if (checklistHistory.some((record) => record.activityId === activity.id && record.date === today())) {
      return "Concluído";
    }

    if (pendingChecklist[activity.id]) {
      return "Pendência";
    }

    if (runningChecklist[activity.id]) {
      return "Executando";
    }

    return "Não iniciado";
  }

  function renderKanbanModule() {
    return (
      <KanbanBoard
        activities={checklistActivities}
        areas={areas}
        areaFilter={kanbanAreaFilter}
        evidence={checklistEvidence}
        getColumn={getKanbanColumn}
        history={checklistHistory}
        isOperational={isOperationalUser()}
        operationalArea={getUserOperationalArea()}
        pending={pendingChecklist}
        running={runningChecklist}
        onAreaFilterChange={setKanbanAreaFilter}
      />
    );
  }



  function decrementStockByLabel(label) {
    let remaining = Number(label.quantity || 0);

    const updatedLots = stockLots.map((lot) => {
      if (lot.itemId !== label.itemId || remaining <= 0) return lot;
      const used = Math.min(Number(lot.quantity || 0), remaining);
      remaining -= used;
      return { ...lot, quantity: Number(lot.quantity || 0) - used };
    });

    if (remaining > 0) {
      alert("Estoque insuficiente para dar baixa desta etiqueta.");
      return false;
    }

    setStockLots(updatedLots);
    return true;
  }

  function openQrActionPage(code) {
    setQrActionCode(code);
    setLabelConsumeCode(code);
    setQrActionArea(labelConsumeArea || loggedUser?.sector || "");
    setQrActionOperator(labelConsumeOperator || loggedUser?.name || "");
    setPage("qr-action");
  }

  function getLabelItem() {
    return stockItemsView.find((item) => item.id === labelForm.itemId);
  }

  function getLabelsDash() {
    const todayLabels = labelsHistory.filter((label) => label.issuedAt === today()).length;
    const expired = labelsHistory.filter((label) => diffDays(label.expiryDate) < 0).length;
    const expiring = labelsHistory.filter((label) => {
      const days = diffDays(label.expiryDate);
      return days >= 0 && days <= stockAlertDays;
    }).length;

    return {
      total: labelsHistory.length,
      todayLabels,
      expired,
      expiring,
      available: labelsHistory.filter((label) => label.status === "Disponível").length,
      consumed: labelsHistory.filter((label) => label.status === "Consumido").length,
      discarded: labelsHistory.filter((label) => label.status === "Descartado").length
    };
  }

  function saveLabels(event) {
    event.preventDefault();

    if (!labelForm.itemId) return alert("Selecione um produto/item.");
    if (!labelForm.quantity || normalizeDecimal(labelForm.quantity) <= 0) return alert("Informe a quantidade por etiqueta.");
    if (!labelForm.labelCount || Number(labelForm.labelCount) <= 0) return alert("Informe a quantidade de etiquetas.");
    if (!labelForm.expiryDate) return alert("Informe a validade.");

    const item = getLabelItem();
    const converted = toBaseUnit(labelForm.quantity, labelForm.quantityUnit);
    const totalFracionado = converted.quantity * Number(labelForm.labelCount);

    if (!item || converted.unit !== item.stockUnit) return alert("Unidade incompatível com o item selecionado.");

    const totalAvailable = stockLots
      .filter((lot) => lot.itemId === item.id)
      .reduce((sum, lot) => sum + Number(lot.quantity || 0), 0);

    if (totalAvailable < totalFracionado) {
      return alert(`Estoque insuficiente para fracionar. Disponível: ${formatStockDisplay(totalAvailable, item.stockUnit)}.`);
    }

    const createdLabels = Array.from({ length: Number(labelForm.labelCount) }, (_, index) => ({
      id: crypto.randomUUID(),
      code: `ETQ-${Date.now()}-${index + 1}`,
      itemId: item.id,
      itemName: item.name,
      category: item.category,
      quantity: converted.quantity,
      unit: converted.unit,
      displayQuantity: normalizeDecimal(labelForm.quantity),
      displayUnit: labelForm.quantityUnit,
      issuedAt: labelForm.issuedAt || today(),
      expiryDate: labelForm.expiryDate,
      status: "Disponível",
      createdAt: new Date().toLocaleString("pt-BR"),
      clientName: getCurrentClient()?.fantasyName || getCurrentClient()?.companyName || "Cliente",
      clientLogo: getCurrentClient()?.logo || ""
    }));

    setLabelsHistory([...createdLabels, ...labelsHistory]);
    setLabelForm({ itemId: "", quantity: "", quantityUnit: "g", labelCount: 1, issuedAt: today(), expiryDate: "" });
    setLabelProductSearch("");
    alert("Etiqueta gerada. O estoque NÃO foi baixado. A baixa ocorrerá apenas na leitura do QRCode.");
  }


  function deleteLabel(labelId) {
    if (!confirm("Deseja excluir esta etiqueta do histórico?")) return;
    setLabelsHistory(labelsHistory.filter((label) => label.id !== labelId));
  }

  function processQrAction(action) {
    const code = qrActionCode.trim() || labelConsumeCode.trim();

    if (!code) return alert("Etiqueta não informada.");

    const label = labelsHistory.find((item) => item.code === code);
    if (!label) return alert("Etiqueta não encontrada.");
    if (label.status === "Consumido") return alert("Esta etiqueta já foi consumida.");
    if (label.status === "Descartado") return alert("Esta etiqueta já foi descartada.");

    if (action === "sair") {
      setPage("etiquetas");
      setQrActionCode("");
      setQrDiscardReason("");
      return;
    }

    if (!qrActionArea) return alert("Selecione a área responsável pela movimentação.");
    if (!qrActionOperator) return alert("Selecione o responsável pela movimentação.");

    if (action === "descarte" && !qrDiscardReason.trim()) {
      return alert("Informe o motivo do descarte.");
    }

    const lowered = decrementStockByLabel(label);
    if (!lowered) return;

    const nextStatus = action === "descarte" ? "Descartado" : "Consumido";

    setLabelsHistory(labelsHistory.map((item) =>
      item.id === label.id
        ? {
            ...item,
            status: nextStatus,
            consumedAt: new Date().toLocaleString("pt-BR"),
            consumedBy: qrActionOperator || loggedUser?.name || "Não informado",
            consumedArea: qrActionArea || loggedUser?.sector || "Não informada",
            consumptionType: action === "descarte" ? "Descarte" : "Produção para mesa",
            discardReason: action === "descarte" ? qrDiscardReason.trim() : item.discardReason
          }
        : item
    ));

    setQrActionCode("");
    setQrActionArea("");
    setQrActionOperator("");
    setQrDiscardReason("");
    setLabelConsumeCode("");
    alert(action === "descarte" ? "Descarte registrado e estoque baixado." : "Produção para mesa registrada e estoque baixado.");
    setPage("etiquetas");
  }

  function consumeLabelByQr(event) {
    event.preventDefault();

    const code = labelConsumeCode.trim();
    if (!code) return alert("Informe ou leia o código da etiqueta.");

    const label = labelsHistory.find((item) => item.code === code);
    if (!label) return alert("Etiqueta não encontrada.");

    openQrActionPage(code);
  }


  function printLabels() {
    window.print();
  }

  function renderEtiquetasModule() {
    const dash = getLabelsDash();
    const selectedItem = getLabelItem();
    const compatibleUnits = compatibleUnitsFor(selectedItem?.unit || "g");
    const isLabelsDash = labelPage === "dash";
    const labelProductOptions = stockItemsView
      .filter((item) => (item.type === "Produto" || item.type === "Item") && Number(item.totalStock || 0) > 0)
      .map((item) => ({
        item,
        label: `${item.name} | ${item.category} | ${item.internalCode || item.barcode || "sem código"} | Estoque: ${formatStockDisplay(item.totalStock, item.stockUnit)}`
      }));

    function selectLabelProduct(value) {
      const selectedOption = labelProductOptions.find((option) => option.label === value);
      const selected = selectedOption?.item || stockItemsView.find((item) => item.id === value);
      const firstUnit = compatibleUnitsFor(selected?.unit || "g")[0];
      setLabelProductSearch(value);
      setLabelForm({ ...labelForm, itemId: selected?.id || "", quantityUnit: firstUnit });
    }

    function clearLabelProductSelection() {
      setLabelProductSearch("");
      setLabelForm({ ...labelForm, itemId: "", quantityUnit: "g" });
    }

    return (
      <section className="stock-workspace labels-workspace">
        <aside className="stock-sidebar">
          <button
            className={labelPage === "operacional" ? "stock-nav active" : "stock-nav"}
            type="button"
            onClick={() => setLabelPage("operacional")}
          >
            Operacional
          </button>
          <button
            className={isLabelsDash ? "stock-nav active" : "stock-nav"}
            type="button"
            onClick={() => setLabelPage("dash")}
          >
            Dash
          </button>
        </aside>

        <main className="stock-main">
          {isLabelsDash ? (
            <section className="module-content stock-wide">
              <h2>Dash de etiquetas</h2>
              <p className="stock-help">Indicadores de emissão, consumo, vencimento e descarte.</p>

              <div className="acomp-grid labels-dash">
                <div className="acomp-card">
                  <span>Etiquetas emitidas</span>
                  <strong>{dash.total}</strong>
                  <small>Histórico total</small>
                </div>
                <div className="acomp-card">
                  <span>Disponíveis</span>
                  <strong>{dash.available}</strong>
                  <small>Aguardando consumo</small>
                </div>
                <div className="acomp-card">
                  <span>Consumidas</span>
                  <strong>{dash.consumed}</strong>
                  <small>Baixadas por QRCode</small>
                </div>
                <div className="acomp-card warning">
                  <span>Próx. vencimento</span>
                  <strong>{dash.expiring}</strong>
                  <small>Até {stockAlertDays} dia(s)</small>
                </div>
                <div className="acomp-card danger-card">
                  <span>Vencidas</span>
                  <strong>{dash.expired}</strong>
                  <small>Etiquetas vencidas</small>
                </div>
                <div className="acomp-card danger-card">
                  <span>Descartadas</span>
                  <strong>{dash.discarded}</strong>
                  <small>Perda/descarte</small>
                </div>
              </div>
            </section>
          ) : (
            <>
              <section className="module-content stock-wide">
                <h2>Etiquetas</h2>
                <p className="stock-help">Gere, imprima e acione etiquetas por QRCode.</p>
              </section>

              <section className="module-content stock-wide">
                <h2>Gerar etiqueta</h2>

                <form className="stock-form-grid" onSubmit={saveLabels}>
              <label>
                Produto / Item
                <div className="smart-filter-field">
                  <input
                    list="label-product-options"
                    value={labelProductSearch}
                    onChange={(event) => selectLabelProduct(event.target.value)}
                    placeholder="Busque por produto, código ou categoria..."
                  />
                  {labelProductSearch && (
                    <button type="button" aria-label="Limpar produto selecionado" onClick={clearLabelProductSelection}>×</button>
                  )}
                </div>
                <datalist id="label-product-options">
                  {labelProductOptions.map((option) => (
                    <option key={option.item.id} value={option.label} />
                  ))}
                </datalist>
                {selectedItem && (
                  <small className="smart-filter-hint">
                    {selectedItem.category} • Estoque: {formatStockDisplay(selectedItem.totalStock, selectedItem.stockUnit)}
                  </small>
                )}
              </label>

              <label>
                Quantidade por etiqueta
                <input
                  type="number"
                  step="0.001"
                  value={labelForm.quantity}
                  onChange={(event) => setLabelForm({ ...labelForm, quantity: event.target.value })}
                  placeholder="Ex: 250"
                />
              </label>

              <div className="unit-picker-stock">
                <span>Unidade</span>
                <div className="unit-buttons-stock">
                  {compatibleUnits.map((unit) => (
                    <button
                      type="button"
                      key={unit}
                      className={labelForm.quantityUnit === unit ? "unit-btn-stock active" : "unit-btn-stock"}
                      onClick={() => setLabelForm({ ...labelForm, quantityUnit: unit })}
                    >
                      {unitLabel(unit)}
                    </button>
                  ))}
                </div>
              </div>

              <label>
                Quantidade de etiquetas
                <input
                  type="number"
                  min="1"
                  value={labelForm.labelCount}
                  onChange={(event) => setLabelForm({ ...labelForm, labelCount: event.target.value })}
                />
              </label>

              <label>
                Data de emissão
                <input
                  type="date"
                  value={labelForm.issuedAt}
                  onChange={(event) => setLabelForm({ ...labelForm, issuedAt: event.target.value })}
                />
              </label>

              <label>
                Validade
                <input
                  type="date"
                  value={labelForm.expiryDate}
                  onChange={(event) => setLabelForm({ ...labelForm, expiryDate: event.target.value })}
                />
              </label>

                  <button className="primary" type="submit">Gerar etiquetas com QRCode</button>
                </form>
              </section>

              <section className="module-content stock-wide">
                <h2>Leitura de QRCode / Ação da etiqueta</h2>
                <p className="stock-help">Ao abrir o QRCode, escolha Produção para mesa, Descarte ou Sair. A baixa no estoque acontece apenas em Produção para mesa ou Descarte.</p>

                <form className="stock-form-grid" onSubmit={consumeLabelByQr}>
              <label>
                Código da etiqueta / QRCode
                <input value={labelConsumeCode} onChange={(event) => setLabelConsumeCode(event.target.value)} placeholder="Ex: ETQ-..." />
              </label>

              <label>
                Área de consumo
                <select value={labelConsumeArea} onChange={(event) => setLabelConsumeArea(event.target.value)}>
                  <option value="">Selecione</option>
                  {areas.map((area) => <option key={area}>{area}</option>)}
                </select>
              </label>

              <label>
                Responsável
                <select value={labelConsumeOperator} onChange={(event) => setLabelConsumeOperator(event.target.value)}>
                  <option value="">Selecionar responsável</option>
                  {stockUsers.filter((user) => user.status === "Ativo").map((user) => (
                    <option key={user.id} value={user.name}>{user.name} - {user.sector}</option>
                  ))}
                </select>
              </label>

                  <button className="primary" type="submit">Abrir ação da etiqueta</button>
                </form>
              </section>

              <section className="module-content stock-wide">
                <div className="stock-title-row">
                  <div>
                    <h2>Etiquetas geradas</h2>
                    <p className="stock-help">Histórico das etiquetas emitidas. Imprimir não baixa estoque; baixa somente via leitura do QRCode.</p>
                  </div>
                  <button className="secondary" onClick={printLabels}>Imprimir térmica</button>
                </div>

            {labelsHistory.length === 0 ? (
              <div className="module-placeholder">
                <strong>Nenhuma etiqueta gerada</strong>
                <p>Gere uma etiqueta para acompanhar validade e histórico.</p>
              </div>
            ) : (
              <div className="labels-grid print-area">
                {labelsHistory.map((label) => {
                  const days = diffDays(label.expiryDate);
                  return (
                    <article className={days < 0 ? "label-card expired" : days <= stockAlertDays ? "label-card warning" : "label-card"} key={label.id}>
                      <div className="label-brand-client">
                        {label.clientLogo ? (
                          <img src={label.clientLogo} alt={label.clientName} />
                        ) : (
                          <div className="label-logo-fallback">{(label.clientName || "CL").slice(0, 2).toUpperCase()}</div>
                        )}
                        <span>{label.clientName || "Cliente"}</span>
                      </div>
                      <h3>{label.itemName}</h3>
                      <strong>{formatStockDisplay(label.quantity, label.unit)}</strong>
                      <span>Status: <b>{label.status || "Disponível"}</b></span>
                      <span>Emissão: {formatDate(label.issuedAt)}</span>
                      <span>Validade: {formatDate(label.expiryDate)}</span>

                      <div className="qr-box real-qr" title={label.code}>
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(getQrActionUrl(label.code))}`}
                          alt={`QRCode ${label.code}`}
                        />
                      </div>

                      <small>{label.code}</small>
                      {label.status === "Consumido" && <small>Consumido por {label.consumedBy} em {label.consumedAt}</small>}
                      {label.status === "Descartado" && <small>Descartado: {label.discardReason}</small>}

                      <div className="label-actions no-print">
                        {label.status === "Disponível" && <button className="secondary" onClick={() => openQrActionPage(label.code)}>Abrir QR</button>}
                        {label.status === "Disponível" && <button className="danger" onClick={() => openQrActionPage(label.code)}>Descartar</button>}
                        <button className="danger" onClick={() => deleteLabel(label.id)}>Excluir</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
              </section>
            </>
          )}
        </main>
      </section>
    );
  }

  function renderClientDashboard() {
    const labelsDash = getLabelsDash();
    const stockProducts = stockItemsView.filter((item) => (item.type === "Produto" || item.type === "Item") && item.hasStockEntry);
    const expiredLots = stockLots.filter((lot) => Number(lot.quantity || 0) > 0 && diffDays(lot.expiryDate) < 0).length;
    const completedToday = checklistHistory.filter((record) => record.date === today()).length;

    return (
      <ClientDashboard
        client={getCurrentClient()}
        metrics={{
          emptyStock: stockProducts.filter((item) => item.totalStock <= 0).length,
          expiredLots,
          availableLabels: labelsDash.available,
          consumedLabels: labelsDash.consumed,
          discardedLabels: labelsDash.discarded,
          openPending: Object.keys(pendingChecklist).length,
          completedToday,
          withEvidence: checklistHistory.filter((record) => record.evidenceImage).length
        }}
      />
    );
  }

  function renderAccessModule() {
    const productCadastros = stockItems.filter((item) => item.type === "Produto" || item.type === "Item").length;
    const processCadastros = stockItems.filter((item) => item.type === "Processo" || item.type === "Atividade").length;
    const currentCompanyId = getCurrentClient()?.id || activeCompanyId;
    const companyUsers = users.filter((user) => user.userType === "client" && user.companyId === currentCompanyId);
    const visibleStockUsers = [...stockUsers, ...companyUsers.filter((user) => !stockUsers.some((stockUser) => stockUser.id === user.id))]
      .filter((user) => (user.companyId || currentCompanyId) === currentCompanyId);
    const activeUsers = visibleStockUsers.filter((user) => user.status === "Ativo").length;

    return (
      <OperationalModuleLayout className="access-workspace" items={[{ id: "cadastros", label: "Cadastros" }]} page="cadastros" onNavigate={() => {}}>
        <section className="module-content stock-wide access-command-center">
          <div className="access-section-heading">
            <div>
              <h2>Cadastros</h2>
              <p className="stock-help">Central de cadastros da operação: produtos, usuários, áreas e rotinas.</p>
            </div>
          </div>

          <div className="access-overview-grid">
            <MiniDashCard title="Produtos / Itens" value={productCadastros} detail="Base de estoque" />
            <MiniDashCard title="Usuários" value={visibleStockUsers.length} detail="Cadastrados" />
            <MiniDashCard title="Usuários ativos" value={activeUsers} detail="Com acesso liberado" />
            <MiniDashCard title="Áreas" value={areas.length} detail="Departamentos" />
            <MiniDashCard title="Fornecedores" value={normalizedSuppliers().length} detail="Cadastrados" />
            <MiniDashCard title="Rotinas" value={processCadastros} detail="Processos e atividades" />
          </div>

          {renderAccessCadastroSelector()}
        </section>

        {accessCadastroType === "produto" ? (
          renderStockCadastro()
        ) : ["usuario", "processo", "area", "fornecedor"].includes(accessCadastroType) ? null : (
          <section className="module-content stock-wide">
          </section>
        )}

        {showStockUserModal && (
          <StockModal title={editingStockUserId ? "Editar usuário" : "Cadastrar usuário"} onClose={resetStockUserForm}>
            {renderAccessUserForm({ insideModal: true })}
          </StockModal>
        )}

        {showProcessActivityModal && (
          <StockModal title="Cadastrar processo ou atividade" onClose={closeProcessActivityModal}>
            <div className="access-user-editor access-user-editor-modal">
              {renderAccessProcessForm({ insideModal: true })}
            </div>
          </StockModal>
        )}

        {showAreaDepartmentModal && (
          <StockModal title="Cadastrar área / departamento" onClose={closeAreaDepartmentModal}>
            <div className="access-user-editor access-user-editor-modal">
              {renderAccessAreaForm({ insideModal: true })}
            </div>
          </StockModal>
        )}

        {showStockSupplierModal && (
          <StockModal title="Cadastrar fornecedor" onClose={closeStockSupplierModal}>
            <div className="access-user-editor access-user-editor-modal">
              {renderAccessSupplierForm()}
            </div>
          </StockModal>
        )}

        {accessCadastroType === "usuario" && (
            <section className="module-content stock-wide">
              <h2>Funcionários cadastrados</h2>

              {visibleStockUsers.length === 0 ? (
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
                        <th>Permissões</th>
                        <th>Telegram</th>
                        <th>Status</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleStockUsers.map((user) => (
                        <tr key={user.id}>
                          <td><strong>{user.name}</strong></td>
                          <td>{user.email}</td>
                          <td>{user.profile}</td>
                          <td>
                            <div className="access-sector-chip-list">
                              {getStockUserSectors(user).length
                                ? getStockUserSectors(user).map((sector) => (
                                  <span className="access-sector-chip" key={sector}>{sector}</span>
                                ))
                                : <span className="access-sector-chip">Sem setor</span>}
                            </div>
                          </td>
                          <td>{user.role}</td>
                          <td>{(user.allowedModules || ["checklist", "faturamento", "acesso"]).map((moduleId) => SOLUTION_MODULES.find((module) => module.id === moduleId)?.title).filter(Boolean).join(", ")}</td>
                          <td>{user.telegramEnabled ? "Ativo" : "Não"}</td>
                          <td>{user.status}</td>
                          <td>
                            <div className="actions">
                              <button className="secondary" onClick={() => editStockUser(user)}>Editar</button>
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
      </OperationalModuleLayout>
    );
  }



  function renderQrActionPage() {
    const label = labelsHistory.find((item) => item.code === qrActionCode);

    return (
      <main className="module-full qr-action-page">
        <header className="module-header">
          <button className="module-back" onClick={() => setPage("etiquetas")}>← Voltar para Etiquetas</button>
        </header>

        <section className="module-content qr-action-card">
          <h1>Leitura da etiqueta</h1>

          {!label ? (
            <div className="module-placeholder">
              <strong>Etiqueta não encontrada</strong>
              <p>Verifique o QRCode ou digite novamente o código.</p>
            </div>
          ) : (
            <>
              <div className="qr-action-summary">
                <strong>{label.itemName}</strong>
                <span>{formatStockDisplay(label.quantity, label.unit)}</span>
                <small>Código: {label.code}</small>
                <small>Status: {label.status || "Disponível"}</small>
                <small>Validade: {formatDate(label.expiryDate)}</small>
              </div>

              <div className="stock-form-grid">
                <label>
                  Área
                  <select value={qrActionArea} onChange={(event) => setQrActionArea(event.target.value)}>
                    <option value="">Selecione</option>
                    {areas.map((area) => <option key={area}>{area}</option>)}
                  </select>
                </label>

                <label>
                  Responsável
                  <select value={qrActionOperator} onChange={(event) => setQrActionOperator(event.target.value)}>
                    <option value="">Selecionar responsável</option>
                    {stockUsers.filter((user) => user.status === "Ativo").map((user) => (
                      <option key={user.id} value={user.name}>{user.name} - {user.sector}</option>
                    ))}
                  </select>
                </label>

                <label className="qr-discard-reason">
                  Motivo do descarte
                  <input
                    value={qrDiscardReason}
                    onChange={(event) => setQrDiscardReason(event.target.value)}
                    placeholder="Obrigatório apenas para descarte"
                  />
                </label>
              </div>

              <div className="qr-action-buttons">
                <button className="primary" onClick={() => processQrAction("producao")}>Produção para mesa</button>
                <button className="danger" onClick={() => processQrAction("descarte")}>Descarte</button>
                <button className="secondary" onClick={() => processQrAction("sair")}>Sair</button>
              </div>
            </>
          )}
        </section>
      </main>
    );
  }

  if (!isLogged) {
    return <LoginPage login={login} onLoginChange={setLogin} onSubmit={handleLogin} />;
  }

  if (page === "qr-action") {
    return renderQrActionPage();
  }

  if (["acompanhamento", "estoque", "etiquetas", "checklist", "vendas", "faturamento", "acesso"].includes(page)) {
    const moduleInfo = MODULE_INFO[page];

    return (
      <ModuleShell moduleInfo={moduleInfo} canAccess={canAccessModule(page)} onBack={() => setPage("hub")}>
        {page === "estoque" && renderStockModule()}
        {page === "checklist" && renderChecklistModule()}
        {page === "etiquetas" && renderEtiquetasModule()}
        {page === "acompanhamento" && renderClientDashboard()}
        {page === "vendas" && renderSalesModule()}
        {page === "faturamento" && renderBillingModule()}
        {page === "acesso" && renderAccessModule()}
      </ModuleShell>
    );
  }

  return (
    <AppShell loggedUser={loggedUser} page={page} onNavigate={setPage} onLogout={logout}>

        {page === "dashboard" && (
          <PlatformDashboard
            clients={clients}
            monthlyRevenue={monthlyRevenue}
            outstandingRevenue={outstandingRevenue}
            onOpenClient={openClientWorkspace}
          />
        )}

        {page === "clients" && (
          <ClientManagementPage
            clients={clients}
            clientForm={clientForm}
            editingClientId={editingClientId}
            modules={SOLUTION_MODULES}
            showClientForm={showClientForm}
            onClientFormChange={setClientForm}
            onCloseForm={resetClientForm}
            onDelete={deleteClient}
            onEdit={editClient}
            onLogoUpload={handleLogoUpload}
            onLogoRemove={removeClientLogo}
            onOpenClient={openClientWorkspace}
            onOpenNew={openNewClientForm}
            onSave={saveClient}
            onToggleModule={toggleClientModule}
            onToggleStatus={toggleClientStatus}
          />
        )}

        {page === "view" && (
          <ClientCardsPage clients={clients} modules={SOLUTION_MODULES} onEdit={editClient} onOpenClient={openClientWorkspace} />
        )}

        {page === "hub" && (
          <HubPage client={getCurrentClient()} modules={getAllowedModules()} onOpenModule={openModuleFromHub} />
        )}

        {page === "users" && (
          <PlatformUsersPage
            editingUserId={editingUserId}
            userForm={userForm}
            users={platformUsers}
            onCancelEdit={() => {
              setEditingUserId(null);
              setUserForm(emptyUserForm);
            }}
            onDelete={deleteUser}
            onEdit={editUser}
            onSave={saveUser}
            onUserFormChange={setUserForm}
          />
        )}
    </AppShell>
  );
}

