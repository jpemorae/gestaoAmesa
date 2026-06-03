import { useState } from "react";
import { formatDate, today } from "../../utils/date";

const COLUMNS = ["Não iniciado", "Executando", "Pendência", "Concluído"];

export function KanbanBoard({
  activities,
  areas,
  areaFilter,
  evidence,
  getColumn,
  history = [],
  isOperational,
  operationalArea,
  pending,
  running,
  onAreaFilterChange
}) {
  const [selectedActivity, setSelectedActivity] = useState(null);
  const visibleActivities = activities.filter((activity) => (
    isOperational ? activity.area === operationalArea : areaFilter === "Todas" || activity.area === areaFilter
  ));
  const selectedHistory = selectedActivity
    ? history.filter((record) => record.activityId === selectedActivity.id)
    : [];
  const selectedStatus = selectedActivity ? getColumn(selectedActivity) : "";
  const selectedRunning = selectedActivity ? running[selectedActivity.id] : null;
  const selectedPending = selectedActivity ? pending[selectedActivity.id] : null;
  const selectedEvidence = selectedActivity ? evidence[selectedActivity.id] : null;

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
                  <button className="kanban-card" key={activity.id} type="button" onClick={() => setSelectedActivity(activity)}>
                    <span className="kanban-label-row">
                      <i />
                      <strong>{activity.name}</strong>
                    </span>
                    <small>{activity.area || "Sem área"}</small>
                    <small>{formatDate(activity.scheduledDate || today())} | {activity.startTime || "--"} às {activity.endTime || "--"}</small>
                    {pending[activity.id] && <small className="kanban-card-note">{pending[activity.id].reason}</small>}
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {selectedActivity && (
        <div className="kanban-modal-backdrop" role="presentation" onClick={() => setSelectedActivity(null)}>
          <section className="kanban-modal" role="dialog" aria-modal="true" aria-labelledby="kanban-modal-title" onClick={(event) => event.stopPropagation()}>
            <header className="kanban-modal-top">
              <h2 id="kanban-modal-title">{selectedActivity.name}</h2>
              <button type="button" aria-label="Fechar detalhes" onClick={() => setSelectedActivity(null)}>×</button>
            </header>

            <div className="kanban-modal-body">
              <div className="kanban-detail-panel">
                <h3>Dados do card</h3>
                <div className="kanban-detail-grid">
                  <span>Status</span><strong>{selectedStatus}</strong>
                  <span>Tipo</span><strong>{selectedActivity.type || "--"}</strong>
                  <span>Área</span><strong>{selectedActivity.area || "--"}</strong>
                  <span>Data</span><strong>{formatDate(selectedActivity.scheduledDate || today())}</strong>
                  <span>Previsto</span><strong>{selectedActivity.startTime || "--"} às {selectedActivity.endTime || "--"}</strong>
                  <span>Frequência</span><strong>{selectedActivity.frequency || "--"}</strong>
                  <span>Repetição</span><strong>{selectedActivity.repeats === "Sim" ? `${selectedActivity.repeatQuantity || 0} vez(es)` : "Não"}</strong>
                  <span>Responsável</span><strong>{selectedRunning?.executor || selectedPending?.executor || selectedHistory[0]?.executor || "--"}</strong>
                </div>

                {selectedEvidence?.image && (
                  <a className="kanban-evidence-link" href={selectedEvidence.image} target="_blank" rel="noreferrer">
                    Ver evidência anexada
                  </a>
                )}
              </div>

              <aside className="kanban-comments-panel">
                <div className="kanban-comments-heading">
                  <strong>Comentários e atividade</strong>
                  <span>{selectedHistory.length + (selectedPending ? 1 : 0)}</span>
                </div>

                <div className="kanban-comments-list">
                  {selectedPending && (
                    <article className="kanban-comment">
                      <strong>Pendência registrada</strong>
                      <p>{selectedPending.reason}</p>
                      <small>{selectedPending.stoppedAtFull || selectedPending.stoppedAt || "--"}</small>
                    </article>
                  )}

                  {selectedHistory.map((record) => (
                    <article className="kanban-comment" key={record.id}>
                      <strong>Checklist concluído</strong>
                      <p>{record.executor || "Não informado"} finalizou em {record.executionTime || "--"} com status {record.punctuality || "--"}.</p>
                      <small>{record.completedAt || formatDate(record.date)}</small>
                      {record.evidenceImage && (
                        <a href={record.evidenceImage} target="_blank" rel="noreferrer">Abrir evidência</a>
                      )}
                    </article>
                  ))}

                  {!selectedPending && selectedHistory.length === 0 && (
                    <div className="kanban-no-comments">Nenhum comentário registrado.</div>
                  )}
                </div>
              </aside>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
