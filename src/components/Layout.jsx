import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { api } from "../api.js";
import { isStaff, useAuth } from "../auth.jsx";
import { Badge, Field, Modal, useAction } from "../ui.jsx";
import { ROLE_LABEL } from "../utils.js";

function ChangePassword({ onClose }) {
  const [form, setForm] = useState({ current_password: "", new_password: "" });
  const { run, busy } = useAction();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    if (await run(() => api.patch("/users/me/password", form), "Đã đổi mật khẩu")) onClose();
  };
  return (
    <Modal title="Đổi mật khẩu" onClose={onClose}>
      <form onSubmit={submit} className="form">
        <Field label="Mật khẩu hiện tại">
          <input type="password" value={form.current_password} onChange={set("current_password")} required autoFocus />
        </Field>
        <Field label="Mật khẩu mới" hint="Tối thiểu 6 ký tự">
          <input type="password" value={form.new_password} onChange={set("new_password")} minLength={6} required />
        </Field>
        <div className="form-actions">
          <button className="btn primary" disabled={busy}>Đổi mật khẩu</button>
        </div>
      </form>
    </Modal>
  );
}

const Item = ({ to, children }) => (
  <NavLink to={to} className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
    {children}
  </NavLink>
);

export default function Layout() {
  const { user, logout } = useAuth();
  const [pwd, setPwd] = useState(false);
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">🏠 Nhà thông minh</div>
        {user.role === "admin" && (
          <>
            <div className="nav-group">Quản trị</div>
            <Item to="/admin/users">Tài khoản</Item>
          </>
        )}
        {isStaff(user) && (
          <>
            <div className="nav-group">Kỹ thuật</div>
            <Item to="/dev/types">Loại thiết bị</Item>
            <Item to="/dev/component-models">Loại linh kiện</Item>
            <Item to="/dev/device-models">Mẫu thiết bị</Item>
            <Item to="/dev/devices">Sản xuất thiết bị</Item>
          </>
        )}
        <div className="nav-group">Của tôi</div>
        <Item to="/my-devices">Thiết bị của tôi</Item>
        <Item to="/places">Vị trí</Item>
        <Item to="/register-device">Đăng ký thiết bị</Item>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="who">
            <strong>{user.full_name || user.username}</strong>
            <Badge tone={user.role === "admin" ? "red" : user.role === "developer" ? "blue" : "green"}>
              {ROLE_LABEL[user.role]}
            </Badge>
          </div>
          <div className="actions">
            <button className="btn ghost small" onClick={() => setPwd(true)}>Đổi mật khẩu</button>
            <button className="btn ghost small" onClick={logout}>Đăng xuất</button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
      {pwd && <ChangePassword onClose={() => setPwd(false)} />}
    </div>
  );
}
