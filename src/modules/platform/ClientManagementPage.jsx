import { money } from "../../utils/units";

export function ClientManagementPage({
  clients,
  clientForm,
  editingClientId,
  modules,
  showClientForm,
  onClientFormChange,
  onCloseForm,
  onDelete,
  onEdit,
  onLogoRemove,
  onLogoUpload,
  onOpenClient,
  onOpenNew,
  onSave,
  onToggleModule,
  onToggleStatus
}) {
  return (
    <section className="content">
      <section className="panel compact-panel">
        <div className="panel-title-row">
          <h2>Gestão de cliente</h2>
          <button className="primary compact" onClick={onOpenNew}>+ Cadastrar cliente</button>
        </div>

        {!showClientForm && <div className="empty">Clique em <strong>Cadastrar cliente</strong> para abrir os dados cadastrais.</div>}

        {showClientForm && (
          <>
            <div className="panel-title-row form-title">
              <h3>{editingClientId ? "Editar cliente contratante" : "Dados cadastrais do cliente"}</h3>
              <button className="secondary" onClick={onCloseForm}>Fechar</button>
            </div>

            <form className="form-grid dense-form" onSubmit={onSave}>
              <TextField label="Razão social / Empresa contratante" value={clientForm.companyName} placeholder="Ex: Divino Botequim LTDA" onChange={(companyName) => onClientFormChange({ ...clientForm, companyName })} />
              <TextField label="Nome fantasia" value={clientForm.fantasyName} placeholder="Ex: Divino Botequim" onChange={(fantasyName) => onClientFormChange({ ...clientForm, fantasyName })} />
              <TextField label="CNPJ / Documento" value={clientForm.document} placeholder="00.000.000/0001-00" onChange={(document) => onClientFormChange({ ...clientForm, document })} />
              <TextField label="Telefone" value={clientForm.phone} placeholder="(00) 00000-0000" onChange={(phone) => onClientFormChange({ ...clientForm, phone })} />
              <TextField type="email" label="E-mail" value={clientForm.email} placeholder="contato@empresa.com" onChange={(email) => onClientFormChange({ ...clientForm, email })} />
              <TextField label="Endereço" value={clientForm.address} placeholder="Rua, número, cidade" onChange={(address) => onClientFormChange({ ...clientForm, address })} />

              <SelectField label="Forma de pagamento" value={clientForm.paymentMethod} options={["Pix", "Boleto", "Cartão de crédito", "Transferência"]} onChange={(paymentMethod) => onClientFormChange({ ...clientForm, paymentMethod })} />
              <TextField type="number" label="Mensalidade" value={clientForm.monthlyFee} placeholder="199" onChange={(monthlyFee) => onClientFormChange({ ...clientForm, monthlyFee })} />

              <label>
                Dia de vencimento
                <input type="number" min="1" max="31" value={clientForm.dueDay} onChange={(event) => onClientFormChange({ ...clientForm, dueDay: event.target.value })} />
              </label>

              <SelectField label="Situação financeira" value={clientForm.financialStatus} options={["Em dia", "Em aberto", "Inadimplente"]} onChange={(financialStatus) => onClientFormChange({ ...clientForm, financialStatus })} />
              <SelectField label="Status do cliente" value={clientForm.status} options={["Ativo", "Inativo"]} onChange={(status) => onClientFormChange({ ...clientForm, status })} />

              <label>
                Cor de identidade visual
                <input type="color" value={clientForm.themeColor} onChange={(event) => onClientFormChange({ ...clientForm, themeColor: event.target.value })} />
              </label>

              <div className="logo-upload-field">
                <span>Logomarca</span>
                <label className="logo-upload-drop">
                  <input type="file" accept="image/*" onChange={onLogoUpload} />
                  <strong>Fazer upload da logo</strong>
                  <small>PNG, JPG ou WEBP</small>
                </label>
              </div>

              {clientForm.logo && (
                <div className="logo-preview">
                  <img src={clientForm.logo} alt="Prévia da logo" />
                  <button type="button" className="secondary" onClick={onLogoRemove}>Remover logo</button>
                </div>
              )}

              <div className="client-modules-box">
                <strong>Funcionalidades liberadas no Hub</strong>
                <small>Selecione quais módulos a empresa contratante terá acesso.</small>
                <div className="client-modules-grid">
                  {modules.map((module) => (
                    <button type="button" key={module.id} className={(clientForm.enabledModules || []).includes(module.id) ? "client-module-option active" : "client-module-option"} onClick={() => onToggleModule(module.id)}>
                      <span>{module.icon}</span>
                      <strong>{module.title}</strong>
                      <small>{module.description}</small>
                    </button>
                  ))}
                </div>
              </div>

              <button className="primary" type="submit">{editingClientId ? "Salvar alterações" : "Salvar cliente"}</button>
            </form>
          </>
        )}
      </section>

      <section className="panel compact-panel">
        <h2>Clientes cadastrados</h2>
        {clients.length === 0 ? <div className="empty">Nenhum cliente cadastrado.</div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Logo</th><th>Cliente</th><th>Documento</th><th>Pagamento</th><th>Mensalidade</th><th>Vencimento</th><th>Financeiro</th><th>Status</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td><div className="table-logo">{client.logo ? <img src={client.logo} alt={client.fantasyName} /> : <span>{client.fantasyName.slice(0, 2).toUpperCase()}</span>}</div></td>
                    <td><strong>{client.fantasyName}</strong><small>{client.companyName}</small></td>
                    <td>{client.document || "--"}</td>
                    <td>{client.paymentMethod}</td>
                    <td>{money(client.monthlyFee)}</td>
                    <td>Dia {client.dueDay}</td>
                    <td><span className={client.financialStatus === "Em dia" ? "status" : "status attention"}>{client.financialStatus || "Em dia"}</span></td>
                    <td><span className={client.status === "Ativo" ? "status" : "status inactive"}>{client.status}</span></td>
                    <td>
                      <div className="actions">
                        <button className="secondary" onClick={() => onOpenClient(client.id)}>Abrir ambiente</button>
                        <button className="secondary" onClick={() => onEdit(client)}>Editar</button>
                        <button className="secondary" onClick={() => onToggleStatus(client.id)}>{client.status === "Ativo" ? "Inativar" : "Ativar"}</button>
                        <button className="danger" onClick={() => onDelete(client.id)}>Excluir</button>
                      </div>
                    </td>
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
