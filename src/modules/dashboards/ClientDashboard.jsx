export function ClientDashboard({ client, metrics }) {
  return (
    <section className="module-content">
      <h2>Acompanhamento operacional</h2>
      <p className="stock-help">Visão resumida dos módulos liberados para {client?.fantasyName || "a empresa"}.</p>
      <div className="acomp-grid">
        <DashboardCard danger title="Estoque zerado" value={metrics.emptyStock} detail="Itens que precisam de reposição" />
        <DashboardCard danger title="Lotes vencidos" value={metrics.expiredLots} detail="Lotes com saldo e validade expirada" />
        <DashboardCard title="Etiquetas disponíveis" value={metrics.availableLabels} detail={`${metrics.consumedLabels} consumidas e ${metrics.discardedLabels} descartadas`} />
        <DashboardCard warning title="Pendências abertas" value={metrics.openPending} detail="Atividades aguardando retomada" />
        <DashboardCard title="Checklist concluído hoje" value={metrics.completedToday} detail="Execuções finalizadas no dia" />
        <DashboardCard title="Atividades com evidência" value={metrics.withEvidence} detail="Registros rastreáveis no histórico" />
      </div>
    </section>
  );
}

function DashboardCard({ title, value, detail, warning = false, danger = false }) {
  const className = danger ? "acomp-card danger-card" : warning ? "acomp-card warning" : "acomp-card";
  return (
    <div className={className}>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
