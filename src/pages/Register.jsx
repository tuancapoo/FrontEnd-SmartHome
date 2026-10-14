import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { Field, useAction } from "../ui.jsx";

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ username: "", password: "", full_name: "", telegram_chat_id: "" });
  const { run, busy } = useAction();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    run(() => register({ ...form, telegram_chat_id: form.telegram_chat_id || undefined }), "Đăng ký thành công");
  };
  return (
    <div className="auth-page">
      <form className="auth-card form" onSubmit={submit}>
        <h1>Tạo tài khoản</h1>
        <Field label="Họ và tên">
          <input value={form.full_name} onChange={set("full_name")} required autoFocus />
        </Field>
        <Field label="Tên đăng nhập" hint="Tối thiểu 3 ký tự">
          <input value={form.username} onChange={set("username")} minLength={3} required />
        </Field>
        <Field label="Mật khẩu" hint="Tối thiểu 6 ký tự">
          <input type="password" value={form.password} onChange={set("password")} minLength={6} required />
        </Field>
        <Field label="Telegram chat ID (tùy chọn)" hint="Để nhận cảnh báo qua Telegram">
          <input value={form.telegram_chat_id} onChange={set("telegram_chat_id")} />
        </Field>
        <button className="btn primary block" disabled={busy}>{busy ? "Đang tạo…" : "Đăng ký"}</button>
        <p className="muted center">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </form>
    </div>
  );
}
