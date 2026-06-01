export function HubPage({ client, modules, onOpenModule }) {
  return (
    <section className="content">
      <section className="panel compact-panel">
        <h2>Hub de soluções</h2>
        {client && (
          <div className="hub-client-banner" style={{ borderColor: client.themeColor || "#c8a34f" }}>
            {client.logo
              ? <img src={client.logo} alt={client.fantasyName} />
              : <span className="hub-client-initial">{client.fantasyName.slice(0, 2).toUpperCase()}</span>}
            <div>
              <strong>{client.fantasyName}</strong>
              <small>Ambiente operacional do cliente</small>
            </div>
          </div>
        )}
        <p className="hub-description">Escolha uma funcionalidade para abrir o módulo em tela separada.</p>
        <div className="solution-grid">
          {modules.map((module) => (
            <button className="solution-card" key={module.id} onClick={() => onOpenModule(module.id)}>
              <span>{module.icon}</span>
              <strong>{module.title}</strong>
              <small>{module.description}</small>
            </button>
          ))}
        </div>
        {modules.length === 0 && <div className="empty">Nenhuma funcionalidade foi liberada para este cliente.</div>}
      </section>
    </section>
  );
}
