import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";

// ---------- Thông báo ----------
const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((type, text) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, type, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  const value = useMemo(() => ({ ok: (m) => push("ok", m), error: (m) => push("error", m) }), [push]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------- Tải dữ liệu ----------
// Giữ dữ liệu cũ khi tải lại (không nhấp nháy); `reload()` để làm mới
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: s.data === null, error: null }));
    fn()
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((error) => alive && setState((s) => ({ data: s.data, loading: false, error })));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

export function useInterval(fn, ms) {
  useEffect(() => {
    const id = setInterval(fn, ms);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms]);
}

// ---------- Thành phần giao diện ----------
export const Spinner = () => <div className="spinner">Đang tải…</div>;
export const ErrorBox = ({ error }) => (error ? <div className="alert error">{error.message}</div> : null);

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={"modal" + (wide ? " wide" : "")}>
        <header>
          <h3>{title}</h3>
          <button className="icon" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export const Field = ({ label, hint, children }) => (
  <label className="field">
    <span>{label}</span>
    {children}
    {hint && <small>{hint}</small>}
  </label>
);

export const Badge = ({ tone = "gray", children }) => <span className={`badge ${tone}`}>{children}</span>;

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="actions">{children}</div>
    </div>
  );
}

export function Pagination({ page, limit, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;
  return (
    <div className="pagination">
      <button className="btn ghost small" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        ‹ Trước
      </button>
      <span>
        Trang {page}/{pages} · {total} mục
      </span>
      <button className="btn ghost small" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Sau ›
      </button>
    </div>
  );
}

export function Thumb({ src, size = 48 }) {
  const [bad, setBad] = useState(false);
  useEffect(() => setBad(false), [src]);
  return src && !bad ? (
    <img className="thumb" src={src} width={size} height={size} alt="" onError={() => setBad(true)} />
  ) : (
    <div className="thumb empty" style={{ width: size, height: size }}>
      🖼
    </div>
  );
}

export function ImageUpload({ value, onChange, folder }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  async function pick(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("folder", folder);
      form.append("file", file);
      const res = await api.upload(form);
      onChange(res.url);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="img-upload">
      <Thumb src={value} size={72} />
      <label className="btn ghost small">
        {busy ? "Đang tải…" : value ? "Đổi ảnh" : "Chọn ảnh"}
        <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden onChange={pick} disabled={busy} />
      </label>
      {value && (
        <button type="button" className="btn ghost small" onClick={() => onChange(null)}>
          Bỏ ảnh
        </button>
      )}
    </div>
  );
}

export function CopyButton({ text, label = "Sao chép" }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn ghost small"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? "Đã chép ✓" : label}
    </button>
  );
}

// Chạy một thao tác bất đồng bộ, báo lỗi bằng toast
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = async (fn, successMsg) => {
    setBusy(true);
    try {
      const r = await fn();
      if (successMsg) toast.ok(successMsg);
      return r ?? true;
    } catch (err) {
      toast.error(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { run, busy };
}
