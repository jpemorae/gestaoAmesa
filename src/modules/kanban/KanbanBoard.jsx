import { formatDate, today } from "../../utils/date";

const COLUMNS = ["Não iniciado", "Executando", "Pendência", "Concluído"];

export function KanbanBoard({
  activities,
  areas,
  areaFilter,
  evidence,
  getColumn,
  isOperational,
  operationalArea,
  pending,
  running,
  onAreaFilterChange
}) {
  const visibleActivities = activities.filter((activity) => (
    isOperational ? activity.area === operationalArea : areaFilter === "Todas" || activity.area === areaFilter
  ));

  return (
    <section className="module-content checklist-wide">
      <div className="kanban-header">
        <div>
          <h2>Kanban operacional</h2>
          <p className="stock-help">Acompanhe as atividades por status. Nova atividade entra como Não iniciado; ao iniciar vai para Executando; ao registrar pendência vai para Pendência.</p>
        </div>

        {isOperational ? (
          <div className="operational-scope-box compact">
            <strong>Área</strong>
            <span>{operationalArea || "Não informada"}</span>
          </div>
        ) : (
          <label>
            Filtrar por área
            <select value={areaFilter} onChange={(event) => onAreaFilterChange(event.target.value)}>
              <option>Todas</option>
              {areas.map((area) => <option key={area}>{area}</option>)}
            </select>
          </label>
        )}
      </div>

      <div className="kanban-board">
        {COLUMNS.map((column) => {
          const columnActivities = visibleActivities.filter((activity) => getColumn(activity) === column);
          return (
            <section className="kanban-column" key={column}>
              <header><strong>{column}</strong><span>{columnActivities.length}</span></header>
              <div className="kanban-list">
                {columnActivities.length === 0 ? <div className="kanban-empty">Sem atividades</div> : columnActivities.map((activity) => (
                  <article className="kanban-card" key={activity.id}>
                    <strong>{activity.name}</strong>
                    <small>{activity.area || "Sem área"}</small>
                    <small>{formatDate(activity.scheduledDate || today())} • {activity.startTime || "--"} às {activity.endTime || "--"}</small>
                    <small>{activity.frequency || "--"}</small>
                    {running[activity.id] && <small>{evidence[activity.id]?.image ? "📷 Evidência anexada" : "📷 Evidência pendente"}</small>}
                    {pending[activity.id] && <small><strong>Motivo:</strong> {pending[activity.id].reason}</small>}
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
