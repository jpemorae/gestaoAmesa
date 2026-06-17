import { BrandLogo } from "./BrandLogo";

export function LoginPage({ login, onLoginChange, onSubmit }) {
  return (
    <main className="login-page">
      <section className="login-card">
        <div className="logo-box">
          <BrandLogo />
        </div>

        <h1>Gestão à Mesa</h1>
        <p className="subtitle">Eficiência para restaurantes e bares</p>

        <form className="login-form" onSubmit={onSubmit}>
          <label>
            E-mail
            <input
              type="email"
              value={login.email}
              onChange={(event) => onLoginChange({ ...login, email: event.target.value })}
              placeholder="Digite seu e-mail"
              required
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              value={login.password}
              onChange={(event) => onLoginChange({ ...login, password: event.target.value })}
              placeholder="Digite sua senha"
              required
            />
          </label>

          <button type="submit">Entrar</button>
        </form>

      </section>
    </main>
  );
}
