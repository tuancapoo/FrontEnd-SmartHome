import { useState } from "react";
import { api } from "../../api.js";
import { Badge, CopyButton, ErrorBox, Field, ImageUpload, Modal, PageHeader, Spinner, Thumb, useAction, useAsync } from "../../ui.jsx";
import { download } from "../../utils.js";

function ExportModal({ model, onClose }) {
  const { data, loading, error } = useAsync(() => api.get(`/device-models/${model._id}/export`), [model._id]);
  const text = data ? JSON.stringify(data, null, 2) : "";
  return (
    <Modal title={`Cài đặt mẫu: ${model.name}`} onClose={onClose} wide>
      <p className="muted" style={{ marginTop: 0 }}>
        Dán khối này vào <code>DEVICES</code> trong firmware Yolo:Bit, rồi đổi tên khóa, điền id thiết bị, model nút bấm và <code>pin</code>.
      </p>
      <ErrorBox error={error} />
      {loading && <Spinner />}
      {data && (
        <>
          <pre className="json">{text}</pre>
          <div className="form-actions">
            <CopyButton text={text} label="Sao chép JSON" />
            <button className="btn ghost small" onClick={() => download(`${model.name}.json`, text, "application/json")}>Tải .json</button>
          </div>
        </>
      )}
    </Modal>
  );
}

function Form({ item, types, parts, onDone, onClose }) {
  const [f, setF] = useState({
    name: item?.name || "",
    description: item?.description || "",
    type_id: item?.type_id || types[0]?._id || "",
    url_img: item?.url_img || null,
    buttons: item?.buttons || "",
    components: item?.components || [], // thứ tự id
  });
  const { run, busy } = useAction();
  const byId = new Map(parts.map((p) => [p._id, p]));
  const toggle = (id) =>
    setF({ ...f, components: f.components.includes(id) ? f.components.filter((c) => c !== id) : [...f.components, id] });
  const move = (i, d) => {
    const c = [...f.components];
    [c[i], c[i + d]] = [c[i + d], c[i]];
    setF({ ...f, components: c });
  };
  const actuators = f.components.map((id) => byId.get(id)).filter((p) => p?.kind === "actuator");
  const buttons = actuators.some((a) => a.name === f.buttons) ? f.buttons : "";

  const submit = async (e) => {
    e.preventDefault();
    const body = { ...f, buttons: buttons || null };
    const call = item ? () => api.patch(`/device-models/${item._id}`, body) : () => api.post("/device-models", body);
    if (await run(call, item ? "Đã cập nhật mẫu" : "Đã tạo mẫu thiết bị")) onDone();
  };
  return (
    <Modal title={item ? `Sửa mẫu: ${item.name}` : "Tạo mẫu thiết bị"} onClose={onClose} wide>
      <form className="form" onSubmit={submit}>
        <div className="row">
          <Field label="Tên mẫu" hint="Duy nhất — tên thiết bị nhân bản sẽ lấy theo tên này">
            <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required autoFocus />
          </Field>
          <Field label="Loại thiết bị">
            <select value={f.type_id} onChange={(e) => setF({ ...f, type_id: e.target.value })} required>
              {types.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Mô tả"><textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <Field label="Ảnh"><ImageUpload value={f.url_img} onChange={(url_img) => setF({ ...f, url_img })} folder="device-models" /></Field>
        <div className="row">
          <Field label="Chọn linh kiện">
            <div className="pick-list">
              {parts.map((p) => (
                <label key={p._id}>
                  <input type="checkbox" checked={f.components.includes(p._id)} onChange={() => toggle(p._id)} />
                  <span>{p.label || p.name} <Badge tone={p.kind === "sensor" ? "blue" : "amber"}>{p.kind}</Badge></span>
                </label>
              ))}
            </div>
          </Field>
          <Field label="Thứ tự trong mẫu">
            <div className="order-list">
              {f.components.length === 0 && <span className="muted">Chưa chọn linh kiện</span>}
              {f.components.map((id, i) => (
                <div className="item" key={id}>
                  <span>{byId.get(id)?.label || byId.get(id)?.name}</span>
                  <button type="button" className="btn ghost small" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                  <button type="button" className="btn ghost small" disabled={i === f.components.length - 1} onClick={() => move(i, 1)}>↓</button>
                </div>
              ))}
            </div>
          </Field>
        </div>
        <Field label="Nút A/B điều khiển (buttons)" hint="Chọn actuator trong mẫu mà nút bấm trên bo điều khiển">
          <select value={buttons} onChange={(e) => setF({ ...f, buttons: e.target.value })}>
            <option value="">— tắt nút bấm —</option>
            {actuators.map((a) => <option key={a._id} value={a.name}>{a.name}</option>)}
          </select>
        </Field>
        <div className="form-actions"><button className="btn primary" disabled={busy || f.components.length === 0}>Lưu</button></div>
      </form>
    </Modal>
  );
}

export default function DeviceModels() {
  const { data, loading, error, reload } = useAsync(async () => {
    const [models, types, parts] = await Promise.all([api.get("/device-models"), api.get("/types"), api.get("/component-models")]);
    return { models, types, parts };
  });
  const [modal, setModal] = useState(null);
  const { run } = useAction();
  const done = () => { setModal(null); reload(); };
  const remove = async (m) => {
    if (!window.confirm(`Xóa mẫu "${m.name}"?`)) return;
    if (await run(() => api.del(`/device-models/${m._id}`), "Đã xóa mẫu")) reload();
  };
  const typeName = (id) => data.types.find((t) => t._id === id)?.name || "—";
  const partName = (id) => data.parts.find((p) => p._id === id)?.name || id.slice(-4);

  return (
    <>
      <PageHeader title="Mẫu thiết bị" subtitle="Thiết kế một lần, nhân bản thành nhiều thiết bị">
        <button className="btn primary" disabled={!data?.types.length || !data?.parts.length} onClick={() => setModal({ type: "form" })}>+ Tạo mẫu</button>
      </PageHeader>
      <ErrorBox error={error} />
      {data && (!data.types.length || !data.parts.length) && (
        <div className="alert info">Cần có ít nhất một loại thiết bị và một loại linh kiện trước khi tạo mẫu.</div>
      )}
      {loading && !data ? <Spinner /> : (
        <div className="grid">
          {data?.models.map((m) => (
            <div key={m._id} className="card device-card">
              <div className="top">
                <Thumb src={m.url_img} size={56} />
                <div><h3>{m.name}</h3><Badge tone="blue">{typeName(m.type_id)}</Badge></div>
              </div>
              {m.description && <p className="muted" style={{ margin: 0 }}>{m.description}</p>}
              <div className="chips">{m.components.map((id) => <span key={id} className="chip">{partName(id)}</span>)}</div>
              <div className="muted" style={{ fontSize: 12 }}>Nút A/B: {m.buttons || "tắt"}</div>
              <div className="actions">
                <button className="btn primary small" onClick={() => setModal({ type: "export", model: m })}>Xuất JSON</button>
                <button className="btn ghost small" onClick={() => setModal({ type: "form", item: m })}>Sửa</button>
                <button className="btn danger small" onClick={() => remove(m)}>Xóa</button>
              </div>
            </div>
          ))}
          {data?.models.length === 0 && <div className="empty-box">Chưa có mẫu thiết bị nào</div>}
        </div>
      )}
      {modal?.type === "form" && <Form item={modal.item} types={data.types} parts={data.parts} onDone={done} onClose={() => setModal(null)} />}
      {modal?.type === "export" && <ExportModal model={modal.model} onClose={() => setModal(null)} />}
    </>
  );
}
