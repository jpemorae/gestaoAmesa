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
                <div className="visual-client-logo">
                  {client.logo ? <img src={client.logo} alt={client.fantasyName} /> : <span>{client.fantasyName.slice(0, 2).toUpperCase()}</span>}
                </div>
                <div className="visual-client-body">
                  <strong>{client.fantasyName}</strong>
                  <small>{client.companyName}</small>
                  <small>{client.document || "Documento não informado"}</small>
                  <small>{money(client.monthlyFee)} · {client.financialStatus || "Em dia"}</small>
                  <div className="contracted-modules-list">
                    <strong>Módulos contratados:</strong>
                    {(client.enabledModules || []).length === 0 ? (
                      <small>Nenhum módulo contratado</small>
                    ) : (
                      (client.enabledModules || []).map((moduleId) => {
                        const module = modules.find((item) => item.id === moduleId);
                        return module ? <small key={module.id}>{module.title}</small> : null;
                      })
                    )}
                  </div>
                  <div className="visual-client-footer">
                    <span>{client.status}</span>
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
