# Zeno-node (ComfyUI Custom Nodes Pack)

Bộ công cụ mở rộng (Custom Nodes Pack) chuyên nghiệp cho **ComfyUI**, tập trung vào tối ưu quy trình xử lý Latent và lưu ảnh:
1. **Zeno - Advanced Save Image**: Tự động chuẩn hoá và đặt tên file thông minh (Model ➔ Timestamp ➔ Custom text), nhận diện model tự động từ workflow graph, phân loại thư mục theo Model/Date, bảo toàn 100% metadata workflow và hỗ trợ chuông thông báo.
2. **Zeno - Smart Ratio Latent Generator**: Tự động tính toán kích thước Latent theo tỷ lệ chuẩn, ép về bội số 32, hỗ trợ transform (Stretch / Crop / Letterbox) trực tiếp cho Image và Mask đầu vào.

---

## 📦 Danh sách Node trong Pack

### 1. Zeno - Advanced Save Image
- **Category:** `Zeno/Image`
- **Class:** `AdvancedSaveImage`
- **Tính năng nổi bật:**
  - **Thứ tự ưu tiên đặt tên:** Model Name (tự động nhận diện từ workflow) ➔ Timestamp (thời gian tạo) ➔ Custom Text (chữ tuỳ chỉnh).
  - **Chuẩn hoá định dạng:** Chỉ viết hoa chữ cái đầu tiên của toàn bộ tên file, tất cả các ký tự còn lại là chữ thường. Loại bỏ ký tự đặc biệt, lọc sạch số trong tên model.
  - **Quản lý thư mục:** Lưu tự do theo Ngày (`YYYY-MM-DD`), theo Model hoặc thư mục tuỳ chỉnh.
  - **Định dạng:** Mặc định lưu PNG chuẩn lossless chất lượng cao nhất kèm đầy đủ Workflow PNGInfo metadata.
  - **Chuông thông báo:** Tuỳ chọn phát chuông âm thanh (`play_sound_on_finish`) khi render và lưu ảnh xong.

| Tên tham số | Kiểu | Mặc định | Ý nghĩa |
| :--- | :--- | :--- | :--- |
| `images` | `IMAGE` | *(bắt buộc)* | Tensor hình ảnh đầu vào |
| `include_model_name` | `BOOLEAN` | `True` | Bật/tắt tự động lấy tên model gắn vào đầu tên file |
| `include_timestamp` | `BOOLEAN` | `True` | Bật/tắt gắn thời gian tạo |
| `timestamp_format` | `COMBO` | `%Y%m%d_%H%M%S` | Định dạng thời gian tạo |
| `custom_text` | `STRING` | `""` | Văn bản/ghi chú tuỳ chỉnh người dùng điền |
| `subfolder_mode` | `COMBO` | `None` | Chế độ tạo thư mục con phân loại |
| `custom_subfolder` | `STRING` | `""` | Tên thư mục con khi chọn mode `Custom Subfolder` |
| `save_workflow_metadata` | `BOOLEAN` | `True` | Lưu metadata workflow vào PNG |
| `play_sound_on_finish` | `BOOLEAN` | `False` | Bật/tắt phát chuông thông báo khi hoàn thành xuất ảnh |

---

### 2. Zeno - Smart Ratio Latent Generator
- **Category:** `Zeno/Latent`
- **Class:** `RatioLatentGenerator`
- **Tính năng nổi bật:**
  - **Hỗ trợ tỷ lệ chuẩn:** `1:1`, `5:4`, `4:3`, `3:2`, `16:9`, `21:9`, `2.35:1` hoặc tự động nhận diện tỷ lệ theo ảnh/mask đầu vào.
  - **Bội số 32 an toàn cho VAE:** Tự động làm tròn chiều dài cạnh lớn nhất (`longest_side`) và cạnh phụ về bội số của 32.
  - **Xử lý Image / Mask đồng bộ:** Hỗ trợ 3 chế độ `stretch` (kéo dãn), `crop` (cắt giữa), `letterbox` (thêm viền đen) với các thuật toán nội suy `bicubic`, `bilinear`, `nearest`, `area`.

## 📥 Cài đặt (Installation)

### Cách 1: Qua Git Clone (Khuyên dùng)
```bash
cd ComfyUI/custom_nodes
git clone https://github.com/ZenoSigma/Zeno-node.git
pip install -r Zeno-node/requirements.txt
```

### Cách 2: Qua ComfyUI Manager
- Mở ComfyUI ➔ Chọn **Manager** ➔ **Custom Nodes Manager** ➔ Tìm kiếm `Zeno-node` hoặc chọn **Install via Git URL** và dán `https://github.com/ZenoSigma/Zeno-node.git`.

---

## 🚀 Cấu trúc thư mục Pack

```bash
Zeno-node/
├── __init__.py
├── README.md
├── nodes/
│   ├── __init__.py
│   ├── advanced_save_image.py
│   └── ratio_latent_node.py
└── tests/
    └── test_naming.py
```

---

## 🧪 Kiểm thử (Testing)

```bash
python -m unittest discover tests
```
