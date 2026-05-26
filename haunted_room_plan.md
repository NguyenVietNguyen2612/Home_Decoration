# Kế hoạch Phát triển: Sinh viên Thuê Trọ Ma Ám

Dưới đây là lộ trình chi tiết để chuyển đổi đồ án Home Decoration hiện tại thành một Mini-game Trang trí phòng (Game-based Application). Việc chia nhỏ thành các giai đoạn giúp bạn code đến đâu chạy được đến đó (không làm hỏng code cũ).

## Giai đoạn 1: Tiền trạm & Dọn dẹp (Cleanup & Setup)
Mục tiêu: Đưa ứng dụng từ trạng thái "Công cụ tự do" về "Môi trường Game có kiểm soát".

- [ ] **1.1. Cập nhật `index.html`:**
  - Thay đổi tiêu đề và mô tả trang chủ thành chủ đề "Căn trọ ma ám".
  - Đổi nút "Dự án mới" thành "Bắt đầu Game".
  - Ẩn hoặc xóa nút "Dự án sẵn có" (Upload) vì game sẽ lưu tiến trình tự động.
- [ ] **1.2. Ràng buộc `editor.html`:**
  - Ẩn nút "New Room" (Tạo phòng mới). Kích thước phòng sẽ do hệ thống Game Level quy định.
  - Xóa/Ẩn mục "Background" (Sky, Solid, Stars) trong Sidebar. Thay vào đó, nền sẽ luôn là màu tối hoặc sương mù.
  - Sửa tiêu đề ứng dụng (Mini 3D Interior Design -> Căn trọ ma ám 3D).

## Giai đoạn 2: Xây dựng Giao diện Game (Game UI Layer)
Mục tiêu: Thêm các thành phần UI để tương tác với NPC (Hồn ma) và hiển thị thông số game.

- [ ] **2.1. Thanh Tiền (Budget HUD):**
  - Thêm một thẻ div hiển thị số tiền góc trên cùng màn hình (VD: `Ngân sách: 1.500.000 VNĐ`).
- [ ] **2.2. Khung Hội thoại (Dialogue Box):**
  - Thêm một panel ở dưới cùng màn hình (đè lên hoặc cạnh Toolbar).
  - Có avatar của Hồn ma và text chạy chữ (Typewriter effect) để giao nhiệm vụ.
- [ ] **2.3. Bảng Nhiệm vụ (Quest Checklist):**
  - Một bảng nhỏ góc phải màn hình, chứa danh sách các yêu cầu của level (ví dụ: "[ ] Đặt 1 giường", "[ ] Không mua cây").
- [ ] **2.4. Nút "Chốt đơn" (Submit Level):**
  - Đổi nút "Save" trong Toolbar thành "Bàn giao phòng" hoặc "Đi ngủ".

## Giai đoạn 3: Hệ thống Kinh tế (Economy System)
Mục tiêu: Đồ vật không còn miễn phí, kéo thả sẽ tốn tiền.

- [ ] **3.1. Gắn giá tiền cho Model:**
  - Trong `editor.html`, thêm thuộc tính `data-price` cho tất cả các thẻ `.object-item`. 
  - *Ví dụ:* `<div class="object-item" data-type="things/bed" data-price="500000">`
  - Thêm UI hiển thị giá tiền ngay trên ảnh thumbnail của đồ vật ở Sidebar.
- [ ] **3.2. Code logic Trừ tiền:**
  - Can thiệp vào sự kiện `drop` (khi kéo vật thể từ sidebar thả vào 3D/2D view).
  - Kiểm tra xem Giá tiền vật thể > Số tiền hiện có không.
  - Nếu đủ: Cho phép thả, trừ tiền, cập nhật UI hiển thị tiền.
  - Nếu thiếu: Báo lỗi "Bạn không đủ tiền!", từ chối không load model 3D.
- [ ] **3.3. Code logic Hoàn tiền:**
  - Khi nhấn Delete xóa một vật thể trong phòng, lấy lại giá trị của vật đó và cộng lại vào tổng tiền.

## Giai đoạn 4: Logic Game & Hệ thống Level (Core Game Logic)
Mục tiêu: Quản lý luật chơi, thắng/thua.

- [ ] **4.1. Tạo file `js/gameLogic.js`:**
  - Cấu trúc dữ liệu mảng các Levels. Mỗi level chứa:
    - Lời thoại mở đầu của ma.
    - Ngân sách cho phép (Budget).
    - Điều kiện thắng (VD: `requiredItems: { 'things/bed': 1, 'doors/window': 2 }`, `bannedItems: ['decorations/flower_vase']`).
- [ ] **4.2. Viết hàm Kiểm tra (Validation):**
  - Viết hàm `checkLevelClear()` gắn vào nút "Đi ngủ".
  - Quét mảng `scene.children` (chỉ đếm các Mesh có thuộc tính `userData.type`).
  - Đối chiếu với điều kiện của Level hiện tại.
- [ ] **4.3. Xử lý kết quả:**
  - **Pass:** Phát nhạc mừng, hiển thị thoại ma hài lòng, chuyển sang Level tiếp theo.
  - **Fail:** Đèn nhấp nháy đỏ, hiển thị thoại ma tức giận, thông báo lỗi (VD: "Thiếu giường rồi ngủ dưới đất à?").

## Giai đoạn 5: Hiệu ứng Đồ họa Ma quái (Atmosphere & VFX)
Mục tiêu: Dùng Three.js để biến phòng bình thường thành phòng ma.

- [ ] **5.1. Thiết lập Ánh sáng (Lighting):**
  - Chuyển `AmbientLight` xuống cường độ cực thấp, màu lạnh (xanh đen).
  - Thêm một `PointLight` mờ màu cam/vàng vào giữa phòng để giả lập đèn sợi đốt cũ.
- [ ] **5.2. Hiệu ứng Môi trường:**
  - Thêm `scene.fog = new THREE.FogExp2(0x0a0a1a, 0.03)` để tạo cảm giác mù mịt ngoài viền căn phòng.
- [ ] **5.3. Hiệu ứng chớp tắt (Flicker Effect):**
  - Viết một hàm trong vòng lặp `requestAnimationFrame` (`animate()` trong Three.js) để cường độ sáng (intensity) của đèn thay đổi ngẫu nhiên theo thời gian, tạo cảm giác rùng rợn.
- [ ] **5.4. Wall & Floor mặc định:**
  - Đổi texture tường/sàn mặc định sang các hình ảnh tường nứt nẻ, gạch cũ.

## Giai đoạn 6: Âm thanh & Hoàn thiện (Audio & Polish)
Mục tiêu: Tăng trải nghiệm người dùng.

- [ ] **6.1. Âm thanh nền:** Thêm tiếng quạt trần cọc cạch, tiếng dế kêu, âm thanh u ám.
- [ ] **6.2. SFX (Hiệu ứng âm thanh):** Thếng "Kaching" khi trừ tiền, tiếng thở dài của ma khi bạn chọn sai đồ.
- [ ] **6.3. Polish UI:** Thêm animation cho hộp thoại, làm gọn gàng các khung UI.
