import { money } from "../../utils/units";

export function ClientCardsPage({ clients, modules, onEdit, onOpenClient }) {
  return (
    <section className="content">
      <section className="panel compact-panel">
        <h2>Visualizar clientes</h2>
        {clients.length === 0 ? (
          <div className="empty">Nenhum cliente cadastrado.</div>
        ) : (
          <div className="client-card-grid">
            {clients.map((client) => (
              <article className="visual-client-card" key={client.id}>
                <div className="visual-client-top">
                  <div className="visual-client-logo">
                    {client.logo ? (
                      <img src={client.logo} alt={client.fantasyName} />
                    ) : (
                      <span>{client.fantasyName.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <span className={client.status === "Ativo" ? "client-status-pill active" : "client-status-pill inactive"}>
                    {client.status}
                  </span>
                </div>

                <div className="visual-client-body">
                  <div className="visual-client-title">
                    <strong>{client.fantasyName}</strong>
                    <small>{client.companyName}</small>
                  </div>

                  <div className="visual-client-meta">
                    <small>{client.document || "Documento não informado"}</small>
                    <span className="client-billing-pill">{money(client.monthlyFee)} · {client.financialStatus || "Em dia"}</span>
                  </div>

                  <div className="contracted-modules-list">
                    <strong>Módulos contratados</strong>
                    {(client.enabledModules || []).length === 0 ? (
                      <small>Nenhum módulo contratado</small>
                    ) : (
                      <div className="client-module-chip-list">
                        {(client.enabledModules || []).map((moduleId) => {
                          const module = modules.find((item) => item.id === moduleId);
                          return module ? <span className="client-module-chip" key={module.id}>{module.title}</span> : null;
                        })}
                      </div>
                    )}
                  </div>

                  <div className="visual-client-footer">
                    <button className="secondary" onClick={() => onOpenClient(client.id)}>Abrir ambiente</button>
                    <button className="secondary" onClick={() => onEdit(client)}>Editar</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
