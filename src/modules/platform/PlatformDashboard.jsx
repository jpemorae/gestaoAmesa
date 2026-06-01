import { money } from "../../utils/units";

export function PlatformDashboard({ clients, monthlyRevenue, outstandingRevenue, onOpenClient }) {
  return (
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
        <div className="metric">
          <span>Clientes inativos</span>
          <strong>{clients.filter((client) => client.status === "Inativo").length}</strong>
        </div>
        <div className="metric warning">
          <span>Faturamento mensal previsto</span>
          <strong>{money(monthlyRevenue)}</strong>
        </div>
        <div className="metric warning">
          <span>Faturamento em aberto</span>
          <strong>{money(outstandingRevenue)}</strong>
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
              <button className="client-card client-card-button" key={client.id} onClick={() => onOpenClient(client.id)}>
                <div className="client-logo">
                  {client.logo ? <img src={client.logo} alt={client.fantasyName} /> : <span>{client.fantasyName.slice(0, 2).toUpperCase()}</span>}
                </div>
                <div>
                  <strong>{client.fantasyName}</strong>
                  <small>{client.companyName}</small>
                  <small>{client.status}</small>
                  <small>{client.financialStatus || "Em dia"} · {money(client.monthlyFee)}</small>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
