export const ROLE_LABEL = { admin: "Quản trị viên", developer: "Developer", user: "Người dùng" };
export const PLACE_TYPE_LABEL = { home: "Nhà", floor: "Tầng", room: "Phòng", zone: "Khu vực" };
// Loại cha hợp lệ của từng cấp (khớp backend)
export const PARENT_TYPES = { home: [], floor: ["home"], room: ["home", "floor"], zone: ["room"] };
export const CHILD_TYPES = { home: ["floor", "room"], floor: ["room"], room: ["zone"], zone: [] };

export function timeAgo(date) {
  if (!date) return "chưa có";
  const s = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 1000));
  if (s < 5) return "vừa xong";
  if (s < 60) return `${s} giây trước`;
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  return `${Math.floor(s / 86400)} ngày trước`;
}

export const fmtTime = (d) => (d ? new Date(d).toLocaleString("vi-VN") : "—");

// Số thực gọn (28.5 -> "28.5", 60 -> "60")
export const fmtNum = (n) => (n === null || n === undefined ? "—" : Number(Number(n).toFixed(2)).toString());

// Dựng đường dẫn "Nhà › Tầng 1 › Phòng khách" cho từng place từ danh sách phẳng
export function placePaths(places) {
  const byId = new Map(places.map((p) => [p._id, p]));
  const path = (p) => [...(p.ancestors || []).map((a) => byId.get(a)?.name).filter(Boolean), p.name].join(" › ");
  return new Map(places.map((p) => [p._id, path(p)]));
}

export function download(filename, text, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

export const toNum = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
