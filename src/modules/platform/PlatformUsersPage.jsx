export function PlatformUsersPage({ editingUserId, userForm, users, onCancelEdit, onDelete, onEdit, onSave, onUserFormChange }) {
  return (
    <section className="content">
      <section className="panel compact-panel">
        <div className="panel-title-row">
          <h2>{editingUserId ? "Editar usuário" : "Cadastrar usuário"}</h2>
          {editingUserId && <button className="secondary" onClick={onCancelEdit}>Cancelar edição</button>}
        </div>

        <form className="form-grid dense-form" onSubmit={onSave}>
          <TextField label="Nome" value={userForm.name} placeholder="Nome do usuário" onChange={(name) => onUserFormChange({ ...userForm, name })} />
          <TextField type="email" label="E-mail" value={userForm.email} placeholder="usuario@empresa.com" onChange={(email) => onUserFormChange({ ...userForm, email })} />
          <TextField type="password" label="Senha" value={userForm.password} placeholder="Senha de acesso" onChange={(password) => onUserFormChange({ ...userForm, password })} />
          <SelectField label="Perfil" value={userForm.profile} options={["Administrador", "Gerente", "Supervisor", "Operador"]} onChange={(profile) => onUserFormChange({ ...userForm, profile })} />
          <SelectField label="Status" value={userForm.status} options={["Ativo", "Inativo"]} onChange={(status) => onUserFormChange({ ...userForm, status })} />
          <button className="primary" type="submit">{editingUserId ? "Salvar alterações" : "Salvar usuário"}</button>
        </form>
      </section>

      <section className="panel compact-panel">
        <h2>Usuários cadastrados</h2>
        {users.length === 0 ? <div className="empty">Nenhum usuário cadastrado.</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th>Criado em</th><th>Ações</th></tr></thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td><strong>{user.name}</strong></td><td>{user.email}</td><td>{user.profile}</td>
                    <td><span className="status">{user.status}</span></td><td>{user.createdAt || "--"}</td>
                    <td><div className="actions"><button className="secondary" onClick={() => onEdit(user)}>Editar</button><button className="danger" onClick={() => onDelete(user.id)}>Excluir</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}

function TextField({ label, onChange, placeholder, type = "text", value }) {
  return <label>{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

function SelectField({ label, onChange, options, value }) {
  return <label>{label}<select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}
