import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api.js";
import { ErrorBox, Field, PageHeader, Spinner, useAction, useAsync } from "../../ui.jsx";
import { placePaths } from "../../utils.js";

export default function RegisterDevice() {
  const nav = useNavigate();
  const { data: places, loading, error } = useAsync(() => api.get("/places"));
  const [f, setF] = useState({ registration_code: "", place_id: "", device_name: "" });
  const { run, busy } = useAction();
  const paths = places ? placePaths(places) : new Map();

  const submit = async (e) => {
    e.preventDefault();
    const body = { registration_code: f.registration_code, place_id: f.place_id, ...(f.device_name && { device_name: f.device_name }) };
    const device = await run(() => api.post("/devices/register", body), "Đăng ký thiết bị thành công");
    if (device) nav(`/device/${device._id}`);
  };

  return (
    <>
      <PageHeader title="Đăng ký thiết bị" subtitle="Nhập mã in trên bo, chọn phòng và đặt tên để nhận thiết bị" />
      <ErrorBox error={error} />
      {loading ? <Spinner /> : (
        <form className="card form" style={{ maxWidth: 520 }} onSubmit={submit}>
          <Field label="Mã đăng ký" hint="8 ký tự in trên bo, không phân biệt hoa/thường">
            <input value={f.registration_code} onChange={(e) => setF({ ...f, registration_code: e.target.value.toUpperCase() })}
              placeholder="ABCD2345" maxLength={9} required autoFocus style={{ letterSpacing: ".15em", fontWeight: 600 }} />
          </Field>
          <Field label="Đặt vào vị trí">
            <select value={f.place_id} onChange={(e) => setF({ ...f, place_id: e.target.value })} required>
              <option value="">— chọn vị trí —</option>
              {places?.map((p) => <option key={p._id} value={p._id}>{paths.get(p._id)}</option>)}
            </select>
          </Field>
          {places?.length === 0 && (
            <div className="alert info" style={{ margin: 0 }}>Bạn chưa có vị trí nào. <Link to="/places">Tạo nhà / phòng</Link> trước khi đăng ký.</div>
          )}
          <Field label="Tên thiết bị (tùy chọn)" hint="Bỏ trống để dùng tên mặc định của thiết bị">
            <input value={f.device_name} onChange={(e) => setF({ ...f, device_name: e.target.value })} />
          </Field>
          <div className="form-actions"><button className="btn primary" disabled={busy || !f.place_id}>{busy ? "Đang đăng ký…" : "Đăng ký"}</button></div>
        </form>
      )}
    </>
  );
}
