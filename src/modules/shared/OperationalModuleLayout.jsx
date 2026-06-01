export function OperationalModuleLayout({ className = "", items, page, onNavigate, children }) {
  return (
    <section className={`stock-workspace ${className}`.trim()}>
      <aside className="stock-sidebar">
        {items.map((item) => (
          <button key={item.id} className={page === item.id ? "stock-nav active" : "stock-nav"} onClick={() => onNavigate(item.id)}>
            {item.label}
          </button>
        ))}
      </aside>
      <main className="stock-main">{children}</main>
    </section>
  );
}
