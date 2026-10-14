import { useState } from "react";
import { api } from "../../api.js";
import { Badge, ErrorBox, Field, Modal, PageHeader, Spinner, useAction, useAsync } from "../../ui.jsx";
import { fmtNum, toNum } from "../../utils.js";

const DRIVERS = ["dht20_temp", "dht20_hum", "analog_percent", "pwm_percent", "servo_angle"];

function Form({ item, onDone, onClose }) {
  const [f, setF] = useState({
    name: item?.name || "",
    label: item?.label || "",
    description: item?.description || "",
    driver: item?.driver || "",
    kind: item?.kind || "sensor",
    metric: item?.metric || "",
    unit: item?.unit || "",
    min: item?.range?.min ?? 0,
    max: item?.range?.max ?? 100,
    min_start: item?.min_start ?? "",
    type: item?.type || "",
  });
  const { run, busy } = useAction();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    const body = {
      name: f.name, label: f.label, description: f.description, driver: f.driver, kind: f.kind,
      metric: f.metric, unit: f.unit,
      range: { min: Number(f.min), max: Number(f.max) },
      min_start: toNum(f.min_start),
      type: f.kind === "actuator" && f.type ? f.type : null,
    };
    const call = item ? () => api.patch(`/component-models/${item._id}`, body) : () => api.post("/component-models", body);
    if (await run(call, item ? "Đã cập nhật" : "Đã tạo loại linh kiện")) onDone();
  };
  return (
    <Modal title={item ? `Sửa linh kiện: ${item.name}` : "Thêm loại linh kiện"} onClose={onClose} wide>
      <form className="form" onSubmit={submit}>
        <div className="row">
          <Field label="Mã (tên feed)" hint="Chữ thường, số, dấu '-' — vd dht20-temp">
            <input value={f.name} onChange={set("name")} pattern="[a-z0-9\-]+" required autoFocus />
          </Field>
          <Field label="Tên hiển thị"><input value={f.label} onChange={set("label")} /></Field>
        </div>
        <Field label="Mô tả"><textarea value={f.description} onChange={set("description")} /></Field>
        <div className="row">
          <Field label="Driver trên firmware" hint="Tên driver trong DRIVERS của yolobit-main.py">
            <input list="drivers" value={f.driver} onChange={set("driver")} pattern="[a-z0-9_]+" required />
            <datalist id="drivers">{DRIVERS.map((d) => <option key={d} value={d} />)}</datalist>
          </Field>
          <Field label="Loại">
            <select value={f.kind} onChange={set("kind")}>
              <option value="sensor">Cảm biến (sensor)</option>
              <option value="actuator">Chấp hành (actuator)</option>
            </select>
          </Field>
        </div>
        <div className="row">
          <Field label="Đại lượng (metric)" hint="vd temperature, fan_speed"><input value={f.metric} onChange={set("metric")} required /></Field>
          <Field label="Đơn vị"><input value={f.unit} onChange={set("unit")} required /></Field>
        </div>
        <div className="row">
          <Field label="Giá trị nhỏ nhất"><input type="number" step="any" value={f.min} onChange={set("min")} required /></Field>
          <Field label="Giá trị lớn nhất"><input type="number" step="any" value={f.max} onChange={set("max")} required /></Field>
          <Field label="Mức tối thiểu để chạy" hint="vd quạt: 30"><input type="number" step="any" value={f.min_start} onChange={set("min_start")} /></Field>
        </div>
        {f.kind === "actuator" && (
          <Field label="Kiểu điều khiển">
            <select value={f.type} onChange={set("type")}>
              <option value="">— không —</option>
              <option value="slider">Thanh trượt (slider)</option>
              <option value="switch">Công tắc (switch)</option>
            </select>
          </Field>
        )}
        <div className="form-actions"><button className="btn primary" disabled={busy}>Lưu</button></div>
      </form>
    </Modal>
  );
}

export default function ComponentModels() {
  const { data, loading, error, reload } = useAsync(() => api.get("/component-models"));
  const [modal, setModal] = useState(null);
  const { run } = useAction();
  const done = () => { setModal(null); reload(); };
  const remove = async (m) => {
    if (!window.confirm(`Xóa loại linh kiện "${m.name}"?`)) return;
    if (await run(() => api.del(`/component-models/${m._id}`), "Đã xóa")) reload();
  };
  return (
    <>
      <PageHeader title="Loại linh kiện" subtitle="Cảm biến và thiết bị chấp hành: dải đo, đơn vị, driver">
        <button className="btn primary" onClick={() => setModal({})}>+ Thêm linh kiện</button>
      </PageHeader>
      <ErrorBox error={error} />
      {loading && !data ? <Spinner /> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Linh kiện</th><th>Loại</th><th>Đại lượng</th><th>Dải</th><th>Driver</th><th /></tr></thead>
            <tbody>
              {data?.map((m) => (
                <tr key={m._id}>
                  <td>
                    <strong>{m.label || m.name}</strong>
                    <div className="muted" style={{ fontSize: 12 }}><code>{m.name}</code>{m.description && ` — ${m.description}`}</div>
                  </td>
                  <td><Badge tone={m.kind === "sensor" ? "blue" : "amber"}>{m.kind}</Badge>{m.type && <> <Badge>{m.type}</Badge></>}</td>
                  <td>{m.metric} ({m.unit})</td>
                  <td>{fmtNum(m.range.min)} … {fmtNum(m.range.max)}{m.min_start != null && <div className="muted" style={{ fontSize: 12 }}>chạy từ {fmtNum(m.min_start)}</div>}</td>
                  <td><code>{m.driver}</code></td>
                  <td>
                    <div className="cell-actions">
                      <button className="btn ghost small" onClick={() => setModal({ item: m })}>Sửa</button>
                      <button className="btn danger small" onClick={() => remove(m)}>Xóa</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal && <Form item={modal.item} onDone={done} onClose={() => setModal(null)} />}
    </>
  );
}
