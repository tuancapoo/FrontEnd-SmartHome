import { useState } from "react";
import { api } from "../api.js";
import { Badge, Spinner, useAction, useAsync } from "../ui.jsx";
import { fmtNum, fmtTime, timeAgo } from "../utils.js";

const WAIT_MS = 30000; // chờ bo báo lại trạng thái tối đa chừng này

function ActuatorRow({ c, deviceId, onSent }) {
  const m = c.componentModel;
  const state = c.control; // { mode, val, source, ts } | null
  const isSwitch = m.type === "switch";
  const { run, busy } = useAction();
  const [sent, setSent] = useState(null); // { at, text }

  const first = Math.max(m.range.min, m.min_start ?? m.range.min);
  const [level, setLevel] = useState(state?.mode === "on" ? state.val : Math.min(m.range.max, Math.max(first, Math.round((m.range.min + m.range.max) / 2))));
  const tooLow = m.min_start != null && level < m.min_start;

  async function send(body, text) {
    const res = await run(
      () => api.post(`/devices/${deviceId}/commands`, { componentModelId: m._id, ...body }),
      `Đã gửi lệnh: ${m.label || m.name} — ${text}`
    );
    if (res) {
      setSent({ at: Date.now(), text });
      onSent();
    }
  }

  // Đang chờ bo xác nhận: đã gửi lệnh mà trạng thái báo lại chưa mới hơn lúc gửi
  const waiting = sent && Date.now() - sent.at < WAIT_MS && (!state || new Date(state.ts).getTime() < sent.at);
  const isOn = state?.mode === "on";

  return (
    <div className="control-row">
      <div className="control-info">
        <strong>{m.label || m.name}</strong>
        <div className="muted" style={{ fontSize: 12 }}>
          {state ? (
            <>
              {isOn ? <Badge tone="green">Đang bật · {fmtNum(state.val)} {m.unit}</Badge> : <Badge>Đang tắt</Badge>}
              <span style={{ marginLeft: 8 }} title={fmtTime(state.ts)}>{timeAgo(state.ts)}</span>
            </>
          ) : "Chưa có trạng thái từ bo"}
        </div>
        {waiting && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>⏳ Đã gửi “{sent.text}”, đang chờ bo xác nhận…</div>}
      </div>

      {!isSwitch && (
        <div className="control-slider">
          <input
            type="range"
            min={m.range.min}
            max={m.range.max}
            step={m.range.max - m.range.min > 10 ? 1 : 0.1}
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            disabled={busy}
          />
          <div className="muted" style={{ fontSize: 12 }}>
            <strong style={{ color: tooLow ? "var(--red)" : "inherit" }}>{fmtNum(level)} {m.unit}</strong>
            {m.min_start != null && <> · chạy từ {fmtNum(m.min_start)}</>}
          </div>
        </div>
      )}

      <div className="control-buttons">
        <button
          className={"btn small " + (isOn ? "primary" : "ghost")}
          disabled={busy || (!isSwitch && tooLow)}
          title={!isSwitch && tooLow ? `Thiết bị chỉ chạy từ mức ${m.min_start}` : undefined}
          onClick={() => (isSwitch ? send({ mode: "on" }, "Bật") : send({ mode: "on", val: level }, `Bật ${fmtNum(level)}${m.unit}`))}
        >
          {isSwitch ? "Bật" : "Bật / đặt mức"}
        </button>
        <button className={"btn small " + (state && !isOn ? "primary" : "ghost")} disabled={busy} onClick={() => send({ mode: "off" }, "Tắt")}>
          Tắt
        </button>
      </div>
    </div>
  );
}

export default function ControlPanel({ deviceId, actuators, online, onSent }) {
  return (
    <div className="card" style={{ marginTop: 18 }}>
      <h2>Điều khiển</h2>
      {!online && (
        <div className="alert info">Thiết bị đang offline — lệnh vẫn được gửi đi nhưng bo có thể chưa nhận được.</div>
      )}
      {actuators.map((c) => (
        <ActuatorRow key={c.componentModel._id} c={c} deviceId={deviceId} onSent={onSent} />
      ))}
    </div>
  );
}

// Nhật ký lệnh đã gửi tới thiết bị
export function CommandLog({ deviceId, names, meId, refreshKey }) {
  const { data, loading, error } = useAsync(() => api.get(`/devices/${deviceId}/commands`, { limit: 10 }), [deviceId, refreshKey]);
  if (error) return <div className="alert error">{error.message}</div>;
  if (loading && !data) return <Spinner />;
  return (
    <div className="card" style={{ marginTop: 18 }}>
      <h2>Nhật ký lệnh</h2>
      {data.items.length === 0 ? (
        <div className="empty-box">Chưa gửi lệnh nào tới thiết bị này</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Thời gian</th><th>Linh kiện</th><th>Lệnh</th><th>Người gửi</th></tr></thead>
            <tbody>
              {data.items.map((r) => (
                <tr key={r._id}>
                  <td title={fmtTime(r.sent_at)}>{timeAgo(r.sent_at)}</td>
                  <td>{names.get(r.component_model_id) || "—"}</td>
                  <td>
                    <Badge tone={r.payload.mode === "on" ? "green" : "gray"}>{r.payload.mode === "on" ? "Bật" : "Tắt"}</Badge>
                    {r.payload.mode === "on" && <span style={{ marginLeft: 6 }}>{fmtNum(r.payload.val)}</span>}
                  </td>
                  <td>{r.issued_by === meId ? "Bạn" : r.issued_by ? "Người khác" : "Hệ thống"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
