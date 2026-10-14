import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api.js";
import { isStaff, useAuth } from "../../auth.jsx";
import Chart from "../../components/Chart.jsx";
import ControlPanel, { CommandLog } from "../../components/ControlPanel.jsx";
import { Badge, CopyButton, ErrorBox, PageHeader, Spinner, Thumb, useAction, useAsync, useInterval } from "../../ui.jsx";
import { fmtNum, fmtTime, placePaths, timeAgo } from "../../utils.js";

const RANGES = [
  { label: "1 giờ", hours: 1 },
  { label: "6 giờ", hours: 6 },
  { label: "24 giờ", hours: 24 },
  { label: "7 ngày", hours: 168 },
];

function Metric({ c, selected, onSelect }) {
  const m = c.componentModel;
  const isActuator = m.kind === "actuator";
  return (
    <div className={"metric" + (selected ? " selected" : "")} onClick={onSelect} style={{ cursor: "pointer" }} title={m.description}>
      <div className="label">
        <span>{m.label || m.name}</span>
        <Badge tone={isActuator ? "amber" : "blue"}>{isActuator ? "chấp hành" : "cảm biến"}</Badge>
      </div>
      {isActuator ? (
        <>
          <div className="value">
            {c.control ? (c.control.mode === "on" ? <>{fmtNum(c.control.val)}<small> {m.unit}</small></> : "Tắt") : "—"}
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            {c.control ? `${c.control.mode === "on" ? "Đang bật" : "Đang tắt"} · ${c.control.source === "button" ? "bấm nút tại bo" : "lệnh từ xa"}` : "Chưa có trạng thái"}
            {c.data && <> · giá trị đo {fmtNum(c.data.value)}{m.unit}</>}
          </div>
        </>
      ) : (
        <>
          <div className="value">{c.data ? <>{fmtNum(c.data.value)}<small> {m.unit}</small></> : "—"}</div>
          <div className="muted" style={{ fontSize: 12 }}>{m.metric}</div>
        </>
      )}
      <div className="muted" style={{ fontSize: 12, marginTop: 4 }} title={fmtTime(c.lastUpdate)}>Cập nhật: {timeAgo(c.lastUpdate)}</div>
    </div>
  );
}

export default function DeviceDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const staff = isStaff(user);
  const nav = useNavigate();
  const { run } = useAction();
  const [comp, setComp] = useState("");
  const [hours, setHours] = useState(6);
  const [cmdTick, setCmdTick] = useState(0); // làm mới nhật ký lệnh sau khi gửi

  // Người dùng thường chỉ lấy được thiết bị qua danh sách "của tôi"; admin/developer xem chi tiết trực tiếp
  const info = useAsync(async () => {
    const [device, places] = await Promise.all([
      staff ? api.get(`/devices/${id}`) : api.get("/devices/mine").then((l) => l.find((d) => d._id === id)),
      api.get("/places"),
    ]);
    if (!device) throw new Error("Không tìm thấy thiết bị hoặc bạn không có quyền xem");
    return { device, paths: placePaths(places) };
  }, [id, staff]);
  const status = useAsync(() => api.get(`/devices/${id}/status`), [id]);
  const latest = useAsync(() => api.get(`/devices/${id}/latest`), [id]);
  useInterval(() => { status.reload(); latest.reload(); }, 10000);

  const components = latest.data?.components || [];
  const actuators = components.filter((c) => c.componentModel.kind === "actuator");
  const names = new Map(components.map((c) => [c.componentModel._id, c.componentModel.label || c.componentModel.name]));
  // Sau khi gửi lệnh: bo cần vài giây để chạy và báo lại, nên làm mới trạng thái vài lần
  const afterSend = () => {
    setCmdTick((t) => t + 1);
    for (const ms of [1500, 4000, 9000]) setTimeout(() => { latest.reload(); status.reload(); }, ms);
  };
  useEffect(() => {
    // mặc định chọn linh kiện đã có số đo (biểu đồ không trống), không có thì lấy cái đầu tiên
    if (!comp && components.length) setComp((components.find((c) => c.data) || components[0]).componentModel._id);
  }, [components, comp]);
  const selected = components.find((c) => c.componentModel._id === comp);
  const isActuator = selected?.componentModel.kind === "actuator";

  const from = () => new Date(Date.now() - hours * 3600e3).toISOString();
  const data = useAsync(
    () => (comp ? api.get(`/devices/${id}/data`, { componentModelId: comp, from: from(), order: "asc", limit: 1000 }) : Promise.resolve(null)),
    [id, comp, hours]
  );
  const control = useAsync(
    () => (comp && isActuator ? api.get(`/devices/${id}/control`, { componentModelId: comp, from: from(), limit: 30 }) : Promise.resolve(null)),
    [id, comp, hours, isActuator]
  );

  const d = info.data?.device;
  const mine = d && String(d.owner_id) === String(user._id);
  const unregister = async () => {
    if (!window.confirm("Gỡ đăng ký thiết bị này? Bạn sẽ không còn quản lý nó nữa.")) return;
    if (await run(() => api.post(`/devices/${id}/unregister`), "Đã gỡ đăng ký")) nav("/my-devices");
  };

  if (info.error) return <><ErrorBox error={info.error} /><Link to="/my-devices">← Thiết bị của tôi</Link></>;
  if (!d) return <Spinner />;
  const online = status.data?.online;

  return (
    <>
      <PageHeader title={d.device_name} subtitle={info.data.paths.get(d.place_id) || (d.place_id ? "Vị trí của người khác" : "Chưa có vị trí")}>
        {(mine || staff) && d.owner_id && <button className="btn ghost small" onClick={unregister}>Gỡ đăng ký</button>}
        <Link className="btn ghost small" to={staff ? "/dev/devices" : "/my-devices"}>← Quay lại</Link>
      </PageHeader>

      <div className="card" style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <Thumb src={d.url_img} size={64} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <div>
            <span className={"dot" + (online ? " on" : "")} />
            {online ? <Badge tone="green">Online</Badge> : <Badge>Offline</Badge>}
            <span className="muted" style={{ marginLeft: 10 }}>
              {status.data?.last_seen
                ? `Tin cuối ${timeAgo(status.data.last_seen)} (${fmtTime(status.data.last_seen)})`
                : "Chưa nhận được tin nào từ thiết bị"}
            </span>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Offline nếu quá {status.data?.offline_after_seconds ?? 60} giây không có tin mới · tự làm mới mỗi 10 giây
          </div>
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="muted">ID thiết bị:</span>
            <span className="code" style={{ letterSpacing: 0, userSelect: "all" }}>{d._id}</span>
            <CopyButton text={d._id} label="Sao chép ID" />
          </div>
        </div>
        {staff && d.registration_code && <div>Mã đăng ký: <span className="code">{d.registration_code}</span></div>}
      </div>

      <h2>Giá trị mới nhất</h2>
      <ErrorBox error={latest.error} />
      {latest.loading && !latest.data ? <Spinner /> : components.length === 0 ? (
        <div className="empty-box">Thiết bị chưa có linh kiện nào.</div>
      ) : (
        <div className="metrics">
          {components.map((c) => (
            <Metric key={c.componentModel._id} c={c} selected={c.componentModel._id === comp} onSelect={() => setComp(c.componentModel._id)} />
          ))}
        </div>
      )}

      {actuators.length > 0 && (
        <ControlPanel deviceId={id} actuators={actuators} online={online} onSent={afterSend} />
      )}
      {actuators.length > 0 && <CommandLog deviceId={id} names={names} meId={user._id} refreshKey={cmdTick} />}

      {selected && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="page-header" style={{ marginBottom: 8 }}>
            <h2 style={{ margin: 0 }}>Lịch sử: {selected.componentModel.label || selected.componentModel.name}</h2>
            <div className="range">
              {RANGES.map((r) => (
                <button key={r.hours} className={"btn small ghost" + (hours === r.hours ? " active" : "")} onClick={() => setHours(r.hours)}>{r.label}</button>
              ))}
            </div>
          </div>
          <ErrorBox error={data.error} />
          {data.loading && !data.data ? <Spinner /> : <Chart points={data.data?.items || []} unit={selected.componentModel.unit} />}
          {data.data && <div className="muted" style={{ fontSize: 12 }}>{data.data.count} bản ghi trong {RANGES.find((r) => r.hours === hours).label} gần nhất</div>}

          {isActuator && (
            <>
              <h2 style={{ marginTop: 18 }}>Lịch sử điều khiển</h2>
              {control.data?.items.length ? (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Thời gian</th><th>Trạng thái</th><th>Mức</th><th>Nguồn</th></tr></thead>
                    <tbody>
                      {control.data.items.map((r, i) => (
                        <tr key={i}>
                          <td>{fmtTime(r.ts)}</td>
                          <td><Badge tone={r.mode === "on" ? "green" : "gray"}>{r.mode === "on" ? "Bật" : "Tắt"}</Badge></td>
                          <td>{fmtNum(r.val)} {selected.componentModel.unit}</td>
                          <td>{r.source === "button" ? "Nút bấm tại bo" : "Lệnh từ xa"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div className="empty-box">Chưa có lịch sử điều khiển trong khoảng này</div>}
            </>
          )}
        </div>
      )}
    </>
  );
}
