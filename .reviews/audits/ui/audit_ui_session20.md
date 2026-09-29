# AUDIT — PHIÊN 20 (LAYER GIAO DIỆN, CHẶNG D3: TIẾN ĐỘ; UI-9)

*Orchestrator, 2026-09-29. Đối chiếu với `.plan/ui_plan.md` (plan phiên 20), `.design/ui_decomposition.md` mục "Chặng D3 — Tiến độ", Data Schema 8.0.1, API Contract 4.0.0, và các khối checkpoint `main`, `kit`, `screens`, `manage_commission`, `update_progress`. Định danh phiên của agent: `coding-agent@2026-09-29#2`; phiên bị ngắt một lần vì chạm giới hạn sử dụng, rồi tiếp tục. Mốc so sánh: commit `9777a2e`, trên `30593e3` (`CAS19`).*

## 1. Kết luận

**Đạt về chức năng. UI-9 đã đóng. Nhưng e2e có một chỗ không tất định mới (Q20-1), do chính D3 tạo ra.**

Mọi thứ khác được xác nhận độc lập:
- D3 đúng đặc tả: bảng tiến độ, đổi giai đoạn, xác nhận trong trang, phần Tiến độ của `commission_detail`;
- UI-9 đã vá;
- Q19-3 đã sửa;
- UI-8 vẫn đứng vững.

Theo luật "EVIDENCE chỉ đạt khi chạy lại ổn định", **năm trang D2 và D3 chưa chuyển `hoàn_tất`**. Chỗ hỏng chỉ nằm ở spec kiểm thử, không ở sản phẩm, và cách sửa đã được thí nghiệm xác nhận (§5).

## 2. Phạm vi sửa

So nội dung mọi tệp trong `UI/src`, `UI/tests`, `UI/scripts` trên máy Project Owner với commit `9777a2e`: **đúng 41 tệp đổi hoặc mới**, khớp báo cáo. Mọi tệp khác giống hệt bản đã commit.

Không có tệp nào đổi trong:
- `Desktop/`, `Backend/`;
- các thư mục bắt đầu bằng dấu chấm.

Thay đổi ở trang D1: không có.

## 3. Những gì đã tự chạy lại

Môi trường: Linux, Node 24.14.1, Xvfb, `node_modules` từ đúng `package-lock.json`, Backend ở trạng thái phiên 18.

| Hạng mục | Báo cáo agent | Orchestrator chạy lại | Kết quả |
|---|---|---|---|
| `npm run check` | 780 | 780/780, hai lần; 19 cặp chữ + 12 cặp phi văn bản; 114 tệp, không vi phạm R1–R14 | khớp |
| `npm run e2e` toàn bộ | 5/5 lần, mỗi lần 42 | **6/6 lần, mỗi lần 42 passed** | khớp |
| Spec `commission_form` chạy riêng | 10/10 | **45 lần, 3 lần hỏng** (Q20-1); không lần nào hỏng ở chỗ cũ của UI-9 | UI-9 đóng; lỗi mới |
| UI-8, chạy không đặt biến | `UI/evidence` nguyên vẹn | Băm SHA-1 toàn bộ `UI/evidence` trước và sau 6 lần chạy: giống hệt | đạt |
| Cắn: nhận biết giai đoạn khép lại | có | Đổi `isClosed` thành luôn `false`: 6 ca hỏng; khôi phục thì đạt | đạt |
| Cắn: lịch sử mới nhất trước | có | Bỏ `.reverse()`: 1 ca hỏng; khôi phục thì đạt | đạt |
| Checkpoint | 5 khối parse được | Parse lại cả 5 khối: hợp lệ, không trùng id, không `UNSOLVED_PROBLEMS`; khối `update_progress` mới | đạt |
| Hộp thoại gốc, lời gọi bị loại trừ | không có | Không có `confirm(`, `alert(`, `prompt(` nào trong `src/`; không có lời gọi watermark | đạt |
| Ảnh chụp | — | `progress_board-S2`: ba nhóm đúng thứ tự, đúng số đếm, hạn sớm trước. `commission_detail-S5`: đơn "Đã giao", không có nút "Đổi giai đoạn", có câu khép lại. `stage_change-S3`: sau "Quay lại" rồi "Hủy", giai đoạn vẫn là "Phác thảo" | đúng đặc tả |

## 4. Đối chiếu với đặc tả D3

- **Lời gọi:** đúng sáu lời gọi của bảng D3. `list_commissions` là bản riêng của `update_progress` (R2; `check_layer` đạt). Mỗi thao tác nhiều lời gọi trả **một** kết quả.
- **Tên giai đoạn:** đúng 11 tên của bảng. Mã lạ thì hiện mã; nhóm "Giai đoạn khác: <mã>" có mặt.
- **Khép lại theo `kind`, không theo mã:** có kiểm thử với danh mục giả (một giai đoạn tên khác nhưng `kind` là `finished`), và phép cắn của Orchestrator xác nhận kiểm thử đó có tác dụng.
- **Phần Tiến độ của `commission_detail`:**
  - dùng hook riêng, tải và lỗi riêng, "Thử lại" riêng;
  - nút "Đổi giai đoạn" là hành động phụ, đứng sau "Sửa";
  - nút chỉ có khi phần Tiến độ đã tải xong và giai đoạn chưa khép lại;
  - hai phần của trang không ghép dữ liệu với nhau.
- **Xác nhận:** `ConfirmPanel` là component kit mới, nằm trong trang. Focus tới "Xác nhận"; "Quay lại" không gửi gì. Vòng focus trên nền cảnh báo đạt 6,56:1, đã có trong `check_contrast`.
- **R13:** agent lấy trường `kind` của hợp đồng qua một `switch` bốn nhánh thay vì tắt luật. Không có ngoại lệ lint mới. Đúng tinh thần luật.

### Hai điểm agent hỏi, Orchestrator chốt

1. **Câu khép lại.** Đặc tả viết "Đơn đã <tên giai đoạn>, …". Ghép với tên "Đã giao" thì thành "Đơn đã Đã giao". Đây là lỗi của đặc tả do Orchestrator viết. **Chấp nhận câu của agent:** `Đơn đang ở giai đoạn "<tên>", không đổi giai đoạn được nữa.` Đặc tả đã được sửa theo câu này.
2. **`list_stages` rỗng bị coi là vi phạm hợp đồng.** **Chấp nhận.** Hợp đồng luôn nói tới "giai đoạn đầu của danh mục" (`progress_state`, `progress_entry_record`), nên một danh mục rỗng làm hợp đồng mất nghĩa. Ghi vào đặc tả là luật `[UI-ONLY]` rút ra từ hợp đồng. Không cần sửa hợp đồng ở V1.

## 5. Phát hiện

### Q20-1 (trung bình, chặn `hoàn_tất`) — spec `commission_form` tìm `role="status"` không kèm tên

**Hiện tượng:** Sau khi lưu đơn, trang `commission_detail` có **hai** vùng `role="status"` cùng lúc:
- thông báo chuyển trang "Đã thêm đơn hàng." hoặc "Đã lưu thay đổi.";
- dòng "Đang tải tiến độ…" của phần Tiến độ mới (D3).

Spec `commission_form` khẳng định bằng `getByRole('status')` không lọc. Nếu lúc khẳng định phần Tiến độ chưa tải xong, Playwright báo "strict mode violation" vì thấy hai phần tử.

- Chạy spec riêng 45 lần trên máy Orchestrator: hỏng 3 lần, ở S1, S3, S6 (các dòng 109, 175, 211, 237).
- Toàn bộ e2e thì đạt 6/6, vì khi chạy chung, thời điểm khác đi.

**Nguyên nhân:** D3 thêm một vùng `status` vào trang mà spec D2 đang khẳng định. Agent đã dùng đúng cách lọc ở spec mới (`stage_change`: `getByRole('status').filter({ hasText: … })`), nhưng không rà lại các spec cũ cùng đi qua trang đó.

**Thí nghiệm, trên bản sao:** đổi bốn khẳng định sang `getByRole('status').filter({ hasText: '…' })` thì **30/30 lần đạt**.

**Sản phẩm không sai.** Hai vùng `status` cùng lúc là đúng về trợ năng: một thông báo, một chỉ báo đang tải.

**Việc sửa** (UI-10):
- sửa bốn khẳng định của `commission_form`;
- rà mọi `getByRole('status')` không lọc trong `tests/e2e` (hiện còn ở `client_detail`, `client_form`, `commission_form` và harness) và quyết từng chỗ: nơi nào trang có thể có nhiều vùng `status` thì lọc theo chữ. Các chỗ `toHaveCount(0)` của harness đang dùng để chờ mọi chỉ báo tải biến mất, nên đúng như hiện nay;
- thêm một phép kiểm máy làm được vào `npm run check`: một spec e2e không được gọi `getByRole('status')` rồi khẳng định chữ ngay mà không lọc. Như vậy lỗi này không tái phát khi D4 thêm vùng mới.

### Ghi nhận

- **`main_layout.spec.ts` hết giờ chụp ảnh một lần trên Windows** (lượt 5 lần đầu tiên của agent), giống hiện tượng ở `main-EXP-013` và lần mốc của phiên 19. Máy Orchestrator chưa gặp lần nào. Agent đã chạy lại đủ 5 lần; cách làm đó đúng, vì tệp này không đổi trong phiên. Đây đã là lần thứ ba; ghi vào UI-10 để theo dõi: gặp lần nữa thì điều tra (ví dụ tăng thời gian chờ chụp ảnh riêng cho spec này, hoặc chụp sau khi cửa sổ ổn định).
- **Bằng chứng UI-9 của agent:** agent ép hai lần ghi trùng giây bằng một spec tạm (đã xóa). Không chờ thì khẳng định cũ hỏng 10/10; có chờ thì đạt 10/10. Cách chứng minh tốt hơn yêu cầu tối thiểu.

## 6. Trạng thái trang

`commission_list`, `commission_detail`, `commission_form`, `progress_board`, `stage_change`: **giữ `đang_làm`**. Chuyển `hoàn_tất` khi:
1. UI-10 được vá, và spec `commission_form` chạy riêng đạt ổn định trên máy Orchestrator;
2. Project Owner tự chạy tay các bước mới của D3 (ba kịch bản D2 đã chạy tay ngày 2026-09-29).

## 7. Commit

Sản phẩm của phiên 20 đúng và đã được xác nhận: commit ngay dưới tên `CAS20`, gồm cả `UI/evidence`, là các lần chạy có tên người chạy.
