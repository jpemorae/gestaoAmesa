import { BrandLogo } from "./BrandLogo";

export function AppShell({ loggedUser, page, onNavigate, onLogout, children }) {
  const isPlatformAdmin = loggedUser?.userType === "platform";

  return (
    <div className="work-page">
      <aside className="sidebar">
        {isPlatformAdmin && (
          <>
            <button className={page === "dashboard" ? "nav active" : "nav"} onClick={() => onNavigate("dashboard")}>
              Dashboard
            </button>
            <button className={page === "clients" ? "nav active" : "nav"} onClick={() => onNavigate("clients")}>
              Gestão de cliente
            </button>
            <button className={page === "view" ? "nav active" : "nav"} onClick={() => onNavigate("view")}>
              Visualizar cliente
            </button>
          </>
        )}

        <button className={page === "hub" ? "nav active" : "nav"} onClick={() => onNavigate("hub")}>
          Hub de soluções
        </button>

        {isPlatformAdmin && (
          <button className={page === "users" ? "nav active" : "nav"} onClick={() => onNavigate("users")}>
            Usuários master
          </button>
        )}
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <BrandLogo small />
            <div>
              <h1>{loggedUser?.userType === "client" ? "Hub de soluções" : "Gestão de Clientes"}</h1>
              <p>{loggedUser?.userType === "client" ? "Escolha uma funcionalidade contratada" : "Administração dos clientes contratantes"}</p>
            </div>
          </div>

          <div className="topbar-actions">
            <span>Olá, {loggedUser?.name}</span>
            <button className="logout" onClick={onLogout}>Sair</button>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
