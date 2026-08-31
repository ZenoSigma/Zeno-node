# STATUS — Zeno-node (ComfyUI Custom Nodes Pack)
Cập nhật lần cuối: 2026-08-31 bởi Frank (Chief-of-Staff / Architect)

## Đang ở giai đoạn
Production Ready — 100% hoàn thành cho bộ 3 Custom Node chủ lực (29/29 Unit Tests PASS).

## Đã hoàn thành (chốt, không đổi lại)
- **Node 1 (`AdvancedSaveImage`):** `nodes/advanced_save_image.py`
  - Tự động dò tìm checkpoint model ngược đồ thị thực thi (`PROMPT` graph traversal).
  - Chuẩn hóa tên file theo cấu trúc phân cấp: `Model_Timestamp_CustomText`.
  - Tự động phân nhóm subfolder theo Model Name.
  - Nhúng metadata PNGInfo (workflow graph JSON) tương thích chuẩn ComfyUI.
  - Phát âm thanh chime thông báo hoàn thành.
- **Node 2 (`RatioLatentGenerator`):** `nodes/ratio_latent_node.py`, `web/smart_ratio.js`
  - Khóa tỷ lệ khung hình an toàn cho VAE (bội số của 32 trong khoảng 256 đến 4000 px).
  - Sinh `EMPTY_LATENT` chuẩn shape `[B, 4, H // 8, W // 8]`.
  - Tương thích biến đổi không gian đồng bộ (`stretch`, `crop`, `letterbox`) cho cả `IMAGE` và `MASK`.
- **Node 3 (`PromptLibrary`):** `nodes/prompt_library_node.py`, `web/prompt_library.js`
  - Quản lý prompt đa slot trực tiếp trên giao diện đồ họa Canvas.
  - Chuyển đổi slot theo index 1-based, cách ly tiêu đề (title isolation) và trả về 1 scalar `STRING`.
- **Test Suite:** 29/29 Unit Tests pass tuyệt đối (`python -m unittest discover tests`).
- **Tài liệu chuyên sâu:** `docs/architecture.md`, `docs/api_spec.md`, `docs/algorithm.md`, `AI_CONTEXT.md`, `APP_OVERVIEW.md`.

## Đang làm dở (KHÔNG được coi là xong)
- Hiện không có module nào bị dở hoặc lỗi. App đã sẵn sàng để nhân bản, đóng gói hoặc bổ sung node mới khi có yêu cầu.

## Constraint cứng (không được vi phạm dù có lý do gì)
- **VAE Safety:** Kích thước latent bắt buộc làm tròn về bội số của 32 (`round(dim / 32) * 32`) để tránh vỡ hình/lỗi VAE decode.
- **Backward Compatibility:** Không đổi tên node class hoặc kiểu dữ liệu input/output gây hỏng các workflow JSON đã lưu của người dùng.
- **Tensor Format Invariant:** `IMAGE` luôn là float32 `[B, H, W, C]` dải `[0.0, 1.0]`; `MASK` là `[B, H, W]`; `LATENT` là dict chứa tensor mẫu.
- **Defensive Execution:** Tuyệt đối không xóa các khối `try/except` và kiểm tra fallback trong quá trình đọc đồ thị prompt hoặc xử lý ảnh.

## Quyết định đã chốt gần đây (có ảnh hưởng tới việc tiếp theo)
- **BCHW Permutation:** Hoán vị tensor sang `[B, C, H, W]` khi dùng `F.interpolate` rồi hoán vị ngược lại về `[B, H, W, C]` để bảo toàn hiệu năng PyTorch.
- **UI Extension Hook:** Đăng ký dynamic dropdown và interactive canvas widget qua LiteGraph extension trong thư mục `web/`.

## Đã thử và KHÔNG dùng (tránh lặp lại)
- **Ghi đè trực tiếp metadata phi chuẩn:** Bỏ vì làm mất tính năng kéo thả workflow `.png` quay lại ComfyUI.

## Việc tiếp theo (agent kế tiếp bắt đầu từ đây)
1. **Duy trì tương thích:** Kiểm thử định kỳ khi ComfyUI Core cập nhật phiên bản mới.
2. **Mở rộng node mới (nếu có yêu cầu):** Bổ sung các node xử lý Color Grade, LoRA Stacker, hoặc Video Frame Interpolation.

## Tham chiếu
- Kiến trúc & Tensor Data Flow: [docs/architecture.md](file:///g:/Other%20computers/Home/Backup/Work/R-D/Tool%20AI/Comfy%20Node/Zeno-node/docs/architecture.md)
- Đặc tả API & Type Contracts: [docs/api_spec.md](file:///g:/Other%20computers/Home/Backup/Work/R-D/Tool%20AI/Comfy%20Node/Zeno-node/docs/api_spec.md)
- Thuật toán Snapping & Traversal: [docs/algorithm.md](file:///g:/Other%20computers/Home/Backup/Work/R-D/Tool%20AI/Comfy%20Node/Zeno-node/docs/algorithm.md)
- Tổng quan ứng dụng: [APP_OVERVIEW.md](file:///g:/Other%20computers/Home/Backup/Work/R-D/Tool%20AI/Comfy%20Node/Zeno-node/APP_OVERVIEW.md)
