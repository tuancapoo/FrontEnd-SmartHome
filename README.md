# Giao diện Nhà thông minh (React + Vite)

## Chạy

Cần chạy backend (API) ở cổng 5000 trước; giao diện chuyển tiếp `/api` tới đó.

```bash
npm install
npm run dev      # cổng 5173
```

Mở http://localhost:5173. Muốn trỏ tới backend khác: `VITE_API_TARGET=http://host:port npm run dev`.

Build production: `npm run build` (ra thư mục `dist`).

## Tài khoản mẫu

Các tài khoản dưới đây có sẵn trong DB của dự án (mật khẩu do người vận hành đặt, không ghi trong repo).


| Tài khoản | Vai trò | Vào được |
|---|---|---|
| `admin` | Quản trị viên | Quản lý tài khoản + toàn bộ trang kỹ thuật |
| `dev` | Developer | Loại thiết bị, loại linh kiện, mẫu thiết bị, sản xuất thiết bị |
| `tuan`, `lan` | Người dùng | Thiết bị của tôi, vị trí, đăng ký thiết bị, đọc dữ liệu |

## Luồng thử

1. **Admin** → *Tài khoản*: tạo tài khoản, đổi vai trò, đặt lại mật khẩu, xóa.
2. **Developer**
   - *Loại thiết bị* / *Loại linh kiện*: tạo loại thiết bị và linh kiện (có `driver`, dải đo, mô tả).
   - *Mẫu thiết bị*: chọn linh kiện + thứ tự, nút A/B; **Xuất JSON** để dán vào firmware.
   - *Sản xuất thiết bị*: chọn mẫu, số lượng, **Nhân bản** → nhận danh sách mã đăng ký (sao chép / tải CSV).
3. **Người dùng** → đăng nhập
   - *Vị trí*: tạo Nhà → Tầng → Phòng → Khu vực.
   - *Đăng ký thiết bị*: nhập mã, chọn phòng, đặt tên.
   - *Thiết bị của tôi* → mở thiết bị: trạng thái online/offline (quá 60 giây không có tin là offline), giá trị mới nhất,
     biểu đồ lịch sử (1 giờ / 6 giờ / 24 giờ / 7 ngày), lịch sử điều khiển.

## Lưu ý

- Dữ liệu đo chỉ có khi bo gửi lên Adafruit và backend được cấu hình `ADAFRUIT_UP_KEY` (xem `backend/.env`).
- Tải ảnh (loại thiết bị, mẫu, vị trí, thiết bị) cần cấu hình S3 trong `backend/.env`.
- Access token lưu trong `localStorage`, hết hạn sau 1 ngày thì tự về trang đăng nhập.
