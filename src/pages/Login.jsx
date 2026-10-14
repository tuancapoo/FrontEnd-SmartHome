import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { Field, useAction } from "../ui.jsx";

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: "", password: "" });
  const { run, busy } = useAction();
  const submit = (e) => {
    e.preventDefault();
    run(() => login(form.username.trim(), form.password));
  };
  return (
    <div className="auth-page">
      <form className="auth-card form" onSubmit={submit}>
        <h1>🏠 Nhà thông minh</h1>
        <p className="muted">Đăng nhập để tiếp tục</p>
        <Field label="Tên đăng nhập">
          <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoFocus required />
        </Field>
        <Field label="Mật khẩu">
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </Field>
        <button className="btn primary block" disabled={busy}>{busy ? "Đang đăng nhập…" : "Đăng nhập"}</button>
        <p className="muted center">
          Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
        </p>
        {import.meta.env.DEV && (
          <p className="hint">Tài khoản mẫu (dev): admin, dev, tuan, lan</p>
        )}
      </form>
    </div>
  );
}
