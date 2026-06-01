export function ModuleShell({ moduleInfo, canAccess, onBack, children }) {
  if (!canAccess) {
    return (
      <main className="module-full">
        <header className="module-header">
          <button className="module-back" onClick={onBack}>← Voltar ao Hub</button>
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
        <button className="module-back" onClick={onBack}>← Voltar ao Hub</button>
      </header>

      <section className="module-hero">
        <span className="module-icon">{moduleInfo.icon}</span>
        <div>
          <h1>{moduleInfo.title}</h1>
          <p>{moduleInfo.description}</p>
        </div>
      </section>

      {children}
    </main>
  );
}
