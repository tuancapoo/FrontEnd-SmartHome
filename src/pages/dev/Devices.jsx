import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api.js";
import { useAuth } from "../../auth.jsx";
import { Badge, CopyButton, ErrorBox, Field, ImageUpload, Modal, PageHeader, Pagination, Spinner, useAction, useAsync } from "../../ui.jsx";
import { download, fmtTime, timeAgo } from "../../utils.js";

const LIMIT = 10;

// Kết quả nhân bản: bảng mã đăng ký để dán nhãn / gửi cho người dùng
function CloneResult({ devices, onClose }) {
  const lines = devices.map((d) => `${d.device_name}\t${d.registration_code}`).join("\n");
  const csv = "Tên thiết bị,Mã đăng ký\n" + devices.map((d) => `"${d.device_name}",${d.registration_code}`).join("\n");
  return (
    <Modal title={`Đã tạo ${devices.length} thiết bị`} onClose={onClose}>
      <p className="muted" style={{ marginTop: 0 }}>Mã đăng ký dùng để người dùng nhận thiết bị. Hãy lưu lại hoặc dán lên bo.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Tên</th><th>Mã đăng ký</th></tr></thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d._id}><td>{d.device_name}</td><td><span className="code">{d.registration_code}</span></td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="form-actions" style={{ marginTop: 14 }}>
        <CopyButton text={lines} label="Sao chép tất cả" />
        <button className="btn ghost small" onClick={() => download("ma-dang-ky.csv", "﻿" + csv, "text/csv")}>Tải CSV</button>
      </div>
    </Modal>
  );
}

function EditForm({ device, users, onDone, onClose }) {
  const [f, setF] = useState({
    device_name: device.device_name,
    mode: device.mode,
    url_img: device.url_img || null,
    shared_with: (device.shared_with || []).map(String),
  });
  const { run, busy } = useAction();
  const toggle = (id) =>
    setF({ ...f, shared_with: f.shared_with.includes(id) ? f.shared_with.filter((x) => x !== id) : [...f.shared_with, id] });
  const submit = async (e) => {
    e.preventDefault();
    const body = { device_name: f.device_name, mode: f.mode, url_img: f.url_img };
    if (users) body.shared_with = f.shared_with;
    if (await run(() => api.patch(`/devices/${device._id}`, body), "Đã cập nhật thiết bị")) onDone();
  };
  return (
    <Modal title={`Sửa thiết bị: ${device.device_name}`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Tên thiết bị"><input value={f.device_name} onChange={(e) => setF({ ...f, device_name: e.target.value })} required /></Field>
        <Field label="Chế độ" hint="custom: theo tự động hóa + điều khiển tay · on/off: ép bật/tắt">
          <select value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })}>
            <option value="custom">custom</option><option value="on">on</option><option value="off">off</option>
          </select>
        </Field>
        <Field label="Ảnh"><ImageUpload value={f.url_img} onChange={(url_img) => setF({ ...f, url_img })} folder="devices" /></Field>
        {users && (
          <Field label="Chia sẻ cho" hint="Người được chia sẻ xem và điều khiển được thiết bị">
            <div className="pick-list">
              {users.filter((u) => u._id !== String(device.owner_id)).map((u) => (
                <label key={u._id}>
                  <input type="checkbox" checked={f.shared_with.includes(u._id)} onChange={() => toggle(u._id)} />
                  <span>{u.full_name || u.username} <span className="muted">({u.username})</span></span>
                </label>
              ))}
            </div>
          </Field>
        )}
        <div className="form-actions"><button className="btn primary" disabled={busy}>Lưu</button></div>
      </form>
    </Modal>
  );
}

export default function Devices() {
  const { user } = useAuth();
  const [q, setQ] = useState({ search: "", registered: "", device_model_id: "", page: 1 });
  const [clone, setClone] = useState({ device_model_id: "", quantity: 1 });
  const [created, setCreated] = useState(null);
  const [editing, setEditing] = useState(null);
  const { run, busy } = useAction();

  const models = useAsync(() => api.get("/device-models"));
  // Chỉ admin xem được danh sách user để chia sẻ thiết bị
  const users = useAsync(() => (user.role === "admin" ? api.get("/users", { limit: 100 }).then((r) => r.items) : Promise.resolve(null)), [user.role]);
  const list = useAsync(
    () => api.get("/devices", { search: q.search, registered: q.registered, device_model_id: q.device_model_id, page: q.page, limit: LIMIT }),
    [q.search, q.registered, q.device_model_id, q.page]
  );
  const modelName = (id) => models.data?.find((m) => m._id === id)?.name;

  const submitClone = async (e) => {
    e.preventDefault();
    const res = await run(() => api.post("/devices", { device_model_id: clone.device_model_id, quantity: Number(clone.quantity) }));
    if (res) { setCreated(res); list.reload(); }
  };
  const remove = async (d) => {
    if (!window.confirm(`Xóa thiết bị "${d.device_name}"?`)) return;
    if (await run(() => api.del(`/devices/${d._id}`), "Đã xóa thiết bị")) list.reload();
  };
  const unregister = async (d) => {
    if (!window.confirm(`Gỡ đăng ký "${d.device_name}"? Thiết bị sẽ về trạng thái chưa có chủ.`)) return;
    if (await run(() => api.post(`/devices/${d._id}/unregister`), "Đã gỡ đăng ký")) list.reload();
  };

  return (
    <>
      <PageHeader title="Sản xuất thiết bị" subtitle="Nhân bản thiết bị từ mẫu; mỗi bản có mã đăng ký riêng" />
      <form className="card form" onSubmit={submitClone}>
        <h2>Nhân bản từ mẫu</h2>
        <div className="row" style={{ alignItems: "flex-end" }}>
          <Field label="Mẫu thiết bị" hint="Tên thiết bị lấy theo tên mẫu">
            <select value={clone.device_model_id} onChange={(e) => setClone({ ...clone, device_model_id: e.target.value })} required>
              <option value="">— chọn mẫu —</option>
              {models.data?.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="Số lượng" hint="Từ 1 đến 50">
            <input type="number" min="1" max="50" value={clone.quantity} onChange={(e) => setClone({ ...clone, quantity: e.target.value })} required />
          </Field>
          <div><button className="btn primary" disabled={busy}>{busy ? "Đang tạo…" : "Nhân bản"}</button></div>
        </div>
        {models.data?.length === 0 && <div className="alert info" style={{ margin: 0 }}>Chưa có mẫu thiết bị — hãy tạo ở trang “Mẫu thiết bị”.</div>}
      </form>

      <h2>Danh sách thiết bị</h2>
      <div className="filters">
        <input placeholder="Tìm theo tên" value={q.search} onChange={(e) => setQ({ ...q, search: e.target.value, page: 1 })} />
        <select value={q.device_model_id} onChange={(e) => setQ({ ...q, device_model_id: e.target.value, page: 1 })}>
          <option value="">Tất cả mẫu</option>
          {models.data?.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
        </select>
        <select value={q.registered} onChange={(e) => setQ({ ...q, registered: e.target.value, page: 1 })}>
          <option value="">Tất cả trạng thái</option>
          <option value="false">Chưa đăng ký</option>
          <option value="true">Đã đăng ký</option>
        </select>
      </div>
      <ErrorBox error={list.error} />
      {list.loading && !list.data ? <Spinner /> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Thiết bị</th><th>Mẫu</th><th>Đăng ký</th><th>Mã đăng ký</th><th>Tin cuối</th><th /></tr></thead>
            <tbody>
              {list.data?.items.map((d) => (
                <tr key={d._id}>
                  <td><Link to={`/device/${d._id}`}><strong>{d.device_name}</strong></Link></td>
                  <td>{modelName(d.device_model_id) || <span className="muted">—</span>}</td>
                  <td>{d.owner_id ? <Badge tone="green">Đã đăng ký</Badge> : <Badge tone="amber">Chưa đăng ký</Badge>}{d.registered_at && <div className="muted" style={{ fontSize: 12 }}>{fmtTime(d.registered_at)}</div>}</td>
                  <td>{d.registration_code ? <span className="code">{d.registration_code}</span> : <span className="muted">—</span>}</td>
                  <td title={fmtTime(d.last_seen)}>{timeAgo(d.last_seen)}</td>
                  <td>
                    <div className="cell-actions">
                      <Link className="btn ghost small" to={`/device/${d._id}`}>Xem</Link>
                      <button className="btn ghost small" onClick={() => setEditing(d)}>Sửa</button>
                      {d.owner_id && d.registration_code && <button className="btn ghost small" onClick={() => unregister(d)}>Gỡ ĐK</button>}
                      <button className="btn danger small" onClick={() => remove(d)}>Xóa</button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.data?.items.length === 0 && <tr><td colSpan="6" className="center muted">Chưa có thiết bị nào</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {list.data && <Pagination page={list.data.page} limit={list.data.limit} total={list.data.total} onPage={(page) => setQ({ ...q, page })} />}
      {created && <CloneResult devices={created} onClose={() => setCreated(null)} />}
      {editing && <EditForm device={editing} users={users.data} onDone={() => { setEditing(null); list.reload(); }} onClose={() => setEditing(null)} />}
    </>
  );
}
