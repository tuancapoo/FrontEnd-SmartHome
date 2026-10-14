import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api.js";
import { Badge, ErrorBox, Field, ImageUpload, Modal, PageHeader, Spinner, Thumb, useAction, useAsync, useInterval } from "../../ui.jsx";
import { CHILD_TYPES, PARENT_TYPES, PLACE_TYPE_LABEL, placePaths, timeAgo } from "../../utils.js";

// Thiết bị tại một vị trí + đăng ký thiết bị mới vào đúng vị trí này
function PlaceDevices({ place, paths, onClose }) {
  const [recursive, setRecursive] = useState(true);
  const [f, setF] = useState({ registration_code: "", device_name: "" });
  const { run, busy } = useAction();
  const { data, loading, error, reload } = useAsync(
    () => api.get(`/places/${place._id}/devices`, { recursive }),
    [place._id, recursive]
  );
  useInterval(reload, 15000); // làm mới trạng thái online

  const register = async (e) => {
    e.preventDefault();
    const body = { registration_code: f.registration_code, place_id: place._id, ...(f.device_name && { device_name: f.device_name }) };
    if (await run(() => api.post("/devices/register", body), "Đã đăng ký thiết bị vào vị trí")) {
      setF({ registration_code: "", device_name: "" });
      reload();
    }
  };

  return (
    <Modal title={`Thiết bị tại: ${paths.get(place._id) || place.name}`} onClose={onClose} wide>
      <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <input type="checkbox" checked={recursive} onChange={(e) => setRecursive(e.target.checked)} />
        Gồm cả thiết bị ở các vị trí con
      </label>
      <ErrorBox error={error} />
      {loading && !data ? <Spinner /> : data?.length === 0 ? (
        <div className="empty-box">Chưa có thiết bị nào tại đây. Nhập mã bên dưới để đăng ký.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Thiết bị</th><th>Vị trí</th><th>Trạng thái</th><th /></tr></thead>
            <tbody>
              {data?.map((d) => (
                <tr key={d._id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Thumb src={d.url_img} size={36} />
                      <strong>{d.device_name}</strong>
                    </div>
                  </td>
                  <td>{d.place_id === place._id ? <span className="muted">tại đây</span> : paths.get(d.place_id) || "—"}</td>
                  <td>
                    <span className={"dot" + (d.online ? " on" : "")} />
                    {d.online ? <Badge tone="green">Online</Badge> : <Badge>Offline</Badge>}
                    <div className="muted" style={{ fontSize: 12 }}>tin cuối: {timeAgo(d.last_seen)}</div>
                  </td>
                  <td><div className="cell-actions"><Link className="btn ghost small" to={`/device/${d._id}`}>Xem</Link></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form className="form" onSubmit={register} style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
        <h2 style={{ margin: 0 }}>Đăng ký thiết bị vào “{place.name}”</h2>
        <div className="row" style={{ alignItems: "flex-end" }}>
          <Field label="Mã đăng ký" hint="8 ký tự in trên bo">
            <input value={f.registration_code} onChange={(e) => setF({ ...f, registration_code: e.target.value.toUpperCase() })}
              placeholder="ABCD2345" maxLength={9} required style={{ letterSpacing: ".15em", fontWeight: 600 }} />
          </Field>
          <Field label="Tên thiết bị (tùy chọn)">
            <input value={f.device_name} onChange={(e) => setF({ ...f, device_name: e.target.value })} />
          </Field>
          <div><button className="btn primary" disabled={busy}>{busy ? "Đang đăng ký…" : "Đăng ký"}</button></div>
        </div>
      </form>
    </Modal>
  );
}

function PlaceForm({ mode, parent, place, places, onDone, onClose }) {
  const types = mode === "create" ? (parent ? CHILD_TYPES[parent.type] : ["home"]) : [place.type];
  const [f, setF] = useState({
    name: place?.name || "",
    type: types[0],
    url_img: place?.url_img || null,
    parent_id: place?.parent_id || "",
  });
  const { run, busy } = useAction();
  const paths = placePaths(places);
  // Chỗ chuyển tới hợp lệ: đúng cấp cha, không phải chính nó hay cây con của nó
  const targets =
    mode === "edit" && place.type !== "home"
      ? places.filter(
          (p) => PARENT_TYPES[place.type].includes(p.type) && p._id !== place._id && !(p.ancestors || []).includes(place._id)
        )
      : [];

  const submit = async (e) => {
    e.preventDefault();
    let call;
    if (mode === "create") {
      call = () => api.post("/places", { name: f.name, type: f.type, url_img: f.url_img, ...(parent && { parent_id: parent._id }) });
    } else {
      const body = { name: f.name, url_img: f.url_img };
      if (f.parent_id && f.parent_id !== place.parent_id) body.parent_id = f.parent_id;
      call = () => api.patch(`/places/${place._id}`, body);
    }
    if (await run(call, mode === "create" ? "Đã thêm vị trí" : "Đã cập nhật")) onDone();
  };

  return (
    <Modal title={mode === "create" ? (parent ? `Thêm vào “${parent.name}”` : "Thêm nhà") : `Sửa: ${place.name}`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        {mode === "create" && (
          <Field label="Loại">
            <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
              {types.map((t) => <option key={t} value={t}>{PLACE_TYPE_LABEL[t]}</option>)}
            </select>
          </Field>
        )}
        <Field label="Tên"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required autoFocus /></Field>
        <Field label="Ảnh"><ImageUpload value={f.url_img} onChange={(url_img) => setF({ ...f, url_img })} folder="places" /></Field>
        {targets.length > 0 && (
          <Field label="Chuyển sang" hint="Vị trí con (cùng các thiết bị bên trong) đi theo">
            <select value={f.parent_id} onChange={(e) => setF({ ...f, parent_id: e.target.value })}>
              {targets.map((p) => <option key={p._id} value={p._id}>{paths.get(p._id)}</option>)}
            </select>
          </Field>
        )}
        <div className="form-actions"><button className="btn primary" disabled={busy}>Lưu</button></div>
      </form>
    </Modal>
  );
}

function Node({ place, tree, onAdd, onEdit, onDelete, onDevices }) {
  const children = tree.get(place._id) || [];
  return (
    <li>
      <div className="node">
        <Thumb src={place.url_img} size={36} />
        <span className="name">{place.name}</span>
        <Badge tone="blue">{PLACE_TYPE_LABEL[place.type]}</Badge>
        <button className="btn primary small" onClick={() => onDevices(place)}>Thiết bị</button>
        {CHILD_TYPES[place.type].length > 0 && <button className="btn ghost small" onClick={() => onAdd(place)}>+ Thêm</button>}
        <button className="btn ghost small" onClick={() => onEdit(place)}>Sửa</button>
        <button className="btn danger small" onClick={() => onDelete(place)}>Xóa</button>
      </div>
      {children.length > 0 && (
        <ul className="tree">
          {children.map((c) => <Node key={c._id} place={c} tree={tree} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} onDevices={onDevices} />)}
        </ul>
      )}
    </li>
  );
}

export default function Places() {
  const { data: places, loading, error, reload } = useAsync(() => api.get("/places"));
  const [modal, setModal] = useState(null);
  const { run } = useAction();

  // Dựng cây từ danh sách phẳng
  const tree = new Map();
  const roots = [];
  for (const p of places || []) {
    if (p.parent_id && places.some((x) => x._id === p.parent_id)) {
      tree.set(p.parent_id, [...(tree.get(p.parent_id) || []), p]);
    } else roots.push(p);
  }
  const done = () => { setModal(null); reload(); };
  const remove = async (p) => {
    if (!window.confirm(`Xóa “${p.name}”?`)) return;
    if (await run(() => api.del(`/places/${p._id}`), "Đã xóa")) reload();
  };

  return (
    <>
      <PageHeader title="Vị trí" subtitle="Nhà → Tầng → Phòng → Khu vực. Thiết bị được đặt vào vị trí khi đăng ký.">
        <button className="btn primary" onClick={() => setModal({ mode: "create" })}>+ Thêm nhà</button>
      </PageHeader>
      <ErrorBox error={error} />
      {loading && !places ? <Spinner /> : roots.length === 0 ? (
        <div className="empty-box">Chưa có vị trí nào. Bắt đầu bằng việc thêm một “Nhà”, sau đó thêm tầng và phòng.</div>
      ) : (
        <ul className="tree root">
          {roots.map((p) => (
            <Node key={p._id} place={p} tree={tree}
              onAdd={(parent) => setModal({ mode: "create", parent })}
              onEdit={(place) => setModal({ mode: "edit", place })}
              onDelete={remove}
              onDevices={(place) => setModal({ mode: "devices", place })} />
          ))}
        </ul>
      )}
      {modal?.mode === "devices" && (
        <PlaceDevices place={modal.place} paths={placePaths(places || [])} onClose={() => setModal(null)} />
      )}
      {modal && modal.mode !== "devices" && <PlaceForm {...modal} places={places || []} onDone={done} onClose={() => setModal(null)} />}
    </>
  );
}
