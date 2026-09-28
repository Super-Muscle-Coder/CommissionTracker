# AUDIT — PHIÊN 17 (LAYER GIAO DIỆN, VÁ CHẶNG D1)

*Orchestrator, 2026-09-28. Đối chiếu với `.plan/ui_plan.md` (plan phiên 17), `.design/ui_decomposition.md` §5 và §7 (bản sau audit phiên 16), Data Schema 7.0.0 và API Contract 4.0.0, và các checkpoint `manage_client`, `kit`, `screens`, `main` trong `UI/`. Định danh phiên của agent: `coding-agent@2026-09-28#2`.*

## 1. Kết luận

**Đạt.** Mọi mục vá đều được xác nhận độc lập trên máy thứ hai (Linux, nhanh hơn máy Windows), kể cả e2e, là chỗ hỏng 4/5 lần ở audit phiên 16. Không tìm thấy lỗi nào chặn.

Ba trang `client_list`, `client_detail`, `client_form` **đủ điều kiện `hoàn_tất` về phía Orchestrator**. Chúng chuyển trạng thái khi Project Owner tự chạy tay ba kịch bản (điều kiện đã ghi ở phụ lục audit phiên 16).

## 2. Những gì đã tự chạy lại

Môi trường: Linux, Node 24.14.1. `node_modules` cài từ đúng `package-lock.json`, không đổi so với phiên 12. Mã `UI/` lấy thẳng từ đĩa. Desktop ở trạng thái phiên 14, Backend ở trạng thái phiên 15; Xvfb.

| Hạng mục | Báo cáo agent | Orchestrator chạy lại | Kết quả |
|---|---|---|---|
| `npm run check` | 241 kiểm thử; 18 cặp chữ, 11 cặp phi văn bản | 241/241; 18 + 11 cặp; 71 tệp, không vi phạm | khớp |
| Độ ổn định vitest | agent từng gặp một ca focus chập chờn và đã sửa | 8 lần liên tiếp, cả 8 lần 241/241 | ổn định |
| `npm run e2e` | 5/5 lần trên Windows | **6/6 lần** trên Linux, mỗi lần 17 đạt (25–32 s) | ổn định (phiên 16: 1/5) |
| Thư mục tạm, tiến trình | không sót | Không thư mục `ct-ui-*` mới. Còn hai tiến trình `<defunct>`: đã kết thúc, chỉ chưa được container thu dọn | đạt |
| Hợp đồng, plan, đặc tả không bị sửa | — | mtime của `.contracts/*`, `.plan/*`, `.design/*` đúng như lúc Orchestrator ghi | đạt |
| Bản ghi kịch bản | runner `#2`, mọi bước đạt | Ba tệp `*-run.json` của agent: mọi bước `passed`, runner `coding-agent@2026-09-28#2` | khớp |

## 3. Từng mục vá

### 3.1 UI-4 — e2e tất định: đóng

- Ba cờ `use_client_list.loading`, `use_client_detail.loading`, `use_client_form.opening` khởi tạo `true`, đúng plan.
- **Độ cắn, Orchestrator tự thử:** đặt cả ba cờ về `false` thì đúng 4 ca "lần vẽ đầu" hỏng (1 list, 1 detail, 2 form); khôi phục thì đạt. Khớp báo cáo.
- **Harness:** `launch` chờ trạng thái rỗng; `goToList` chờ danh sách có tên; `reloadList(page, 'list' | 'unreachable')` chờ nội dung đích. Không còn chỗ nào chờ trạng thái nút.
- **Không đạt suông:** Orchestrator rà mọi lời gọi `reloadList`. Mỗi lời gọi chuyển giữa hai nội dung khác nhau (rỗng → danh sách; danh sách → lỗi; lỗi → danh sách), nên không thể đạt nhờ nội dung cũ. Ở `client_form` S2, `before` được khẳng định khác rỗng trước khi so.

### 3.2 CT-2 phía giao diện: đạt

- Configs ghi `dataSchema: '7.0.0'`. Chú thích `[CONTRACT]` trích đúng `client_input` mới và `formats.not_blank`. Các chú thích còn lại đã đổi số phiên bản.
- `readDraft` tách rõ luật sao từ hợp đồng và luật `[UI-ONLY]` (bỏ khoảng trắng, bỏ hàng trống cả hai ô, ghi chú rỗng thành `null`), khớp `ui_decomposition.md` §5. Hành vi không đổi.
- Có ca khoảng trắng Unicode cho tên và cho ô liên hệ: `U+00A0`, `U+3000`, tab, xuống dòng.
- NOTE CT-2 của phiên 16 đã đóng, chuyển thành `manage_client-EXP-009`.

### 3.3 Tương phản 3:1 cho thành phần tương tác: đạt

- Hai token mới: `--color-border-field` `#858585` và `--color-border-field-danger` `#cc6b62`. Agent tự phát hiện viền lỗi cũ `#b8574f` chỉ đạt 2.96:1 trên nền ô, nên tách thêm token này. Đó là điểm plan chưa nêu, và agent xử lý đúng.
- **Orchestrator tính lại bằng công thức riêng:**

  | Cặp | Tỷ lệ |
  |---|---|
  | viền ô / nền ô | 3.73 |
  | viền ô / nền trang | 4.62 |
  | viền lỗi / nền ô | 3.83 |
  | viền lỗi / nền trang | 4.74 |
  | vòng focus / mục đang chọn | 5.49 |
  | vòng focus / mục khi rê chuột | 6.26 |
  | vạch mục điều hướng / nền nổi | 6.97 |

  Tất cả khớp script.
- **Script kiểm cả vị trí thật trong CSS** (vòng focus nằm trong hay ngoài thành phần). Việc này vượt yêu cầu tối thiểu của plan và bịt đúng chỗ Orchestrator lo: cặp vòng focus trên nút chính.
- **Độ cắn, Orchestrator tự thử bằng giá trị khác agent:**
  - viền lỗi `#a85048`: script bắt cạnh trong, 2.56:1, và trả mã thoát 1;
  - `outline-offset: -2px` cho `TextField`: script báo "the CSS no longer puts it there".

  Đã khôi phục cả hai.

### 3.4 Hàng nút và focus ở `client_form`: đạt

- Hàng "Lưu" và "Hủy" nằm ngay dưới tiêu đề; thông báo kết quả lưu nằm ngay dưới hàng nút. Ảnh `client_form-S2-errors.png` khớp: khung "Chưa lưu được" dưới hàng nút, vòng focus xanh ở "Tên hiển thị".
- **Cơ chế focus:**
  - `TextField` và `TextArea` nhận `focusRequest: number` và tự gọi `focus()` qua ref của chính chúng; mỗi số chỉ xử lý một lần, và bỏ qua khi ô đang vô hiệu.
  - Hook đếm số kết quả lưu (`saveCount`). Trang chọn ô lỗi đầu tiên theo thứ tự trên màn hình.
  - Không dùng `document` hay `window` ở phân khu màn hình. Đúng R7–R11, lint sạch.
- **Thứ tự sự kiện đúng:** kết quả lưu làm `saving=false` và `saveCount+1` trong cùng một lượt vẽ, nên effect của ô chạy khi ô đã hết vô hiệu. Bỏ một hàng liên hệ thì xóa kết quả lưu, nên chỉ số hàng không lệch.

## 4. Phát hiện mới

**Q17-1 (thấp) — chưa có quy ước xuống dòng.** `tokens.css` đổi từ CRLF sang LF trong phiên này, nên lần commit tới sẽ hiện toàn bộ tệp là đã sửa, dù chỉ thêm vài dòng. Hiện `UI/` có 11 tệp CRLF và 72 tệp LF; không tệp nào trộn hai kiểu trong cùng tệp. Không ảnh hưởng hành vi. Đề xuất cho một phiên dọn dẹp: thêm `.gitattributes` với quy ước chung, ví dụ `* text=auto eol=lf`, rồi chuẩn hóa một lần. Ghi thành UI-7.

## 5. Trạng thái trang

`client_list`, `client_detail`, `client_form`: **giữ `đang_làm`, chờ Project Owner chạy tay ba kịch bản.** Các bước bấm tay nằm ở cuối báo cáo của agent phiên 17 và trong ba `walkthrough.yaml`. Chạy xong và báo lại thì Orchestrator chuyển cả ba sang `hoàn_tất` trong `ui_decomposition.md`.

## 6. Việc tiếp theo

1. Project Owner chạy tay ba kịch bản.
2. Phiên backend BE-5: `create_client` và `edit_client` áp dụng "not blank" theo Data Schema 7.0.0, rồi đề xuất `manage_client` trở lại `đã_hoàn_thiện`.
3. Chặng D2 (đơn hàng) sau khi xong hai việc trên.
