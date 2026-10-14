import { Link } from "react-router-dom";
import { api } from "../../api.js";
import { Badge, ErrorBox, PageHeader, Spinner, Thumb, useAsync, useInterval } from "../../ui.jsx";
import { placePaths, timeAgo } from "../../utils.js";

export default function MyDevices() {
  const { data, loading, error, reload } = useAsync(async () => {
    const [devices, places] = await Promise.all([api.get("/devices/mine"), api.get("/places")]);
    return { devices, paths: placePaths(places) };
  });
  useInterval(reload, 15000); // làm mới trạng thái online

  return (
    <>
      <PageHeader title="Thiết bị của tôi" subtitle="Thiết bị bạn sở hữu hoặc được chia sẻ">
        <Link className="btn primary" to="/register-device">+ Đăng ký thiết bị</Link>
      </PageHeader>
      <ErrorBox error={error} />
      {loading && !data ? <Spinner /> : (
        <div className="grid">
          {data?.devices.map((d) => (
            <Link key={d._id} to={`/device/${d._id}`} className="card device-card">
              <div className="top">
                <Thumb src={d.url_img} size={56} />
                <div>
                  <h3>{d.device_name}</h3>
                  <div className="muted" style={{ fontSize: 13 }}>{data.paths.get(d.place_id) || (d.place_id ? "Vị trí của người khác" : "Chưa có vị trí")}</div>
                </div>
              </div>
              <div>
                <span className={"dot" + (d.online ? " on" : "")} />
                {d.online ? <Badge tone="green">Online</Badge> : <Badge>Offline</Badge>}
                <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>tin cuối: {timeAgo(d.last_seen)}</span>
              </div>
            </Link>
          ))}
          {data?.devices.length === 0 && (
            <div className="empty-box">
              Bạn chưa có thiết bị nào. <Link to="/register-device">Đăng ký thiết bị</Link> bằng mã in trên bo.
            </div>
          )}
        </div>
      )}
    </>
  );
}
