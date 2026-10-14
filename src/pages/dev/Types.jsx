import { useState } from "react";
import { api } from "../../api.js";
import { ErrorBox, Field, ImageUpload, Modal, PageHeader, Spinner, Thumb, useAction, useAsync } from "../../ui.jsx";

function TypeForm({ item, onDone, onClose }) {
  const [f, setF] = useState({ name: item?.name || "", url_img: item?.url_img || null });
  const { run, busy } = useAction();
  const submit = async (e) => {
    e.preventDefault();
    const call = item ? () => api.patch(`/types/${item._id}`, f) : () => api.post("/types", f);
    if (await run(call, item ? "Đã cập nhật" : "Đã tạo loại thiết bị")) onDone();
  };
  return (
    <Modal title={item ? "Sửa loại thiết bị" : "Thêm loại thiết bị"} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Tên loại" hint="Duy nhất, ví dụ: Quạt, Đèn, Rèm">
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required autoFocus />
        </Field>
        <Field label="Ảnh / icon">
          <ImageUpload value={f.url_img} onChange={(url_img) => setF({ ...f, url_img })} folder="types" />
        </Field>
        <div className="form-actions"><button className="btn primary" disabled={busy}>Lưu</button></div>
      </form>
    </Modal>
  );
}

export default function Types() {
  const { data, loading, error, reload } = useAsync(() => api.get("/types"));
  const [modal, setModal] = useState(null);
  const { run } = useAction();
  const done = () => { setModal(null); reload(); };
  const remove = async (t) => {
    if (!window.confirm(`Xóa loại "${t.name}"?`)) return;
    if (await run(() => api.del(`/types/${t._id}`), "Đã xóa")) reload();
  };
  return (
    <>
      <PageHeader title="Loại thiết bị" subtitle="Phân loại thiết bị: Quạt, Đèn, Rèm…">
        <button className="btn primary" onClick={() => setModal({})}>+ Thêm loại</button>
      </PageHeader>
      <ErrorBox error={error} />
      {loading && !data ? <Spinner /> : (
        <div className="grid">
          {data?.map((t) => (
            <div key={t._id} className="card device-card">
              <div className="top">
                <Thumb src={t.url_img} size={56} />
                <div><h3>{t.name}</h3><span className="muted" style={{ fontSize: 12 }}>{t._id.slice(-6)}</span></div>
              </div>
              <div className="actions">
                <button className="btn ghost small" onClick={() => setModal({ item: t })}>Sửa</button>
                <button className="btn danger small" onClick={() => remove(t)}>Xóa</button>
              </div>
            </div>
          ))}
          {data?.length === 0 && <div className="empty-box">Chưa có loại thiết bị nào</div>}
        </div>
      )}
      {modal && <TypeForm item={modal.item} onDone={done} onClose={() => setModal(null)} />}
    </>
  );
}
