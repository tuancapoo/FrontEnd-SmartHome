import { useState } from "react";
import { api } from "../../api.js";
import { useAuth } from "../../auth.jsx";
import { Badge, ErrorBox, Field, Modal, PageHeader, Pagination, Spinner, useAction, useAsync } from "../../ui.jsx";
import { fmtTime, ROLE_LABEL } from "../../utils.js";

const TONE = { admin: "red", developer: "blue", user: "green" };
const LIMIT = 10;

function CreateForm({ onDone, onClose }) {
  const [f, setF] = useState({ username: "", password: "", full_name: "", telegram_chat_id: "", role: "user" });
  const { run, busy } = useAction();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    const body = { ...f, telegram_chat_id: f.telegram_chat_id || null };
    if (await run(() => api.post("/users", body), "Đã tạo tài khoản")) onDone();
  };
  return (
    <Modal title="Tạo tài khoản" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Họ và tên"><input value={f.full_name} onChange={set("full_name")} required autoFocus /></Field>
        <div className="row">
          <Field label="Tên đăng nhập"><input value={f.username} onChange={set("username")} minLength={3} required /></Field>
          <Field label="Mật khẩu"><input type="password" value={f.password} onChange={set("password")} minLength={6} required /></Field>
        </div>
        <div className="row">
          <Field label="Vai trò">
            <select value={f.role} onChange={set("role")}>
              {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Telegram chat ID"><input value={f.telegram_chat_id} onChange={set("telegram_chat_id")} /></Field>
        </div>
        <div className="form-actions"><button className="btn primary" disabled={busy}>Tạo</button></div>
      </form>
    </Modal>
  );
}

function EditForm({ user, onDone, onClose }) {
  const [f, setF] = useState({ full_name: user.full_name || "", telegram_chat_id: user.telegram_chat_id || "", role: user.role });
  const { run, busy } = useAction();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    if (await run(() => api.patch(`/users/${user._id}`, { ...f, telegram_chat_id: f.telegram_chat_id || null }), "Đã cập nhật")) onDone();
  };
  return (
    <Modal title={`Sửa tài khoản: ${user.username}`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Họ và tên"><input value={f.full_name} onChange={set("full_name")} required /></Field>
        <Field label="Vai trò">
          <select value={f.role} onChange={set("role")}>
            {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Telegram chat ID"><input value={f.telegram_chat_id} onChange={set("telegram_chat_id")} /></Field>
        <div className="form-actions"><button className="btn primary" disabled={busy}>Lưu</button></div>
      </form>
    </Modal>
  );
}

function ResetPassword({ user, onClose }) {
  const [pw, setPw] = useState("");
  const { run, busy } = useAction();
  const submit = async (e) => {
    e.preventDefault();
    if (await run(() => api.patch(`/users/${user._id}/password`, { new_password: pw }), "Đã đặt lại mật khẩu")) onClose();
  };
  return (
    <Modal title={`Đặt lại mật khẩu: ${user.username}`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Mật khẩu mới" hint="Tối thiểu 6 ký tự">
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} minLength={6} required autoFocus />
        </Field>
        <div className="form-actions"><button className="btn primary" disabled={busy}>Đặt lại</button></div>
      </form>
    </Modal>
  );
}

export default function Users() {
  const { user: me } = useAuth();
  const [q, setQ] = useState({ search: "", role: "", page: 1 });
  const [modal, setModal] = useState(null); // { type, user? }
  const { run } = useAction();
  const { data, loading, error, reload } = useAsync(
    () => api.get("/users", { search: q.search, role: q.role, page: q.page, limit: LIMIT }),
    [q.search, q.role, q.page]
  );
  const done = () => { setModal(null); reload(); };

  const remove = async (u) => {
    if (!window.confirm(`Xóa tài khoản "${u.username}"?`)) return;
    if (await run(() => api.del(`/users/${u._id}`), "Đã xóa tài khoản")) reload();
  };

  return (
    <>
      <PageHeader title="Quản lý tài khoản" subtitle="Tạo, phân quyền và quản lý người dùng">
        <button className="btn primary" onClick={() => setModal({ type: "create" })}>+ Tạo tài khoản</button>
      </PageHeader>
      <div className="filters">
        <input placeholder="Tìm theo tên đăng nhập / họ tên" value={q.search} onChange={(e) => setQ({ ...q, search: e.target.value, page: 1 })} style={{ minWidth: 260 }} />
        <select value={q.role} onChange={(e) => setQ({ ...q, role: e.target.value, page: 1 })}>
          <option value="">Tất cả vai trò</option>
          {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <ErrorBox error={error} />
      {loading && !data ? <Spinner /> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Tên đăng nhập</th><th>Họ tên</th><th>Vai trò</th><th>Telegram</th><th>Tạo lúc</th><th /></tr></thead>
            <tbody>
              {data?.items.map((u) => (
                <tr key={u._id}>
                  <td><strong>{u.username}</strong>{u._id === me._id && <> <Badge>bạn</Badge></>}</td>
                  <td>{u.full_name}</td>
                  <td><Badge tone={TONE[u.role]}>{ROLE_LABEL[u.role]}</Badge></td>
                  <td>{u.telegram_chat_id || "—"}</td>
                  <td>{fmtTime(u.created_at)}</td>
                  <td>
                    <div className="cell-actions">
                      <button className="btn ghost small" onClick={() => setModal({ type: "edit", user: u })}>Sửa</button>
                      <button className="btn ghost small" onClick={() => setModal({ type: "pwd", user: u })}>Đặt lại MK</button>
                      <button className="btn danger small" disabled={u._id === me._id} onClick={() => remove(u)}>Xóa</button>
                    </div>
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && <tr><td colSpan="6" className="center muted">Không có tài khoản nào</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} limit={data.limit} total={data.total} onPage={(page) => setQ({ ...q, page })} />}
      {modal?.type === "create" && <CreateForm onDone={done} onClose={() => setModal(null)} />}
      {modal?.type === "edit" && <EditForm user={modal.user} onDone={done} onClose={() => setModal(null)} />}
      {modal?.type === "pwd" && <ResetPassword user={modal.user} onClose={() => setModal(null)} />}
    </>
  );
}
