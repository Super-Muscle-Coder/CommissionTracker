# AUDIT — PHIÊN 23 (LAYER BACKEND, BE-7: `payment_input.method` NOT BLANK)

*Orchestrator, 2026-09-30. Đối chiếu với `.plan/backend_plan.md` (plan phiên 23), Data Schema 9.0.0 (changelog `v9.0.0`, `formats.not_blank`, `record_payment`), API Contract 4.0.0, và checkpoint `record_payment` ở đầu `services.py`. Định danh phiên của agent: `coding-agent@2026-09-30#1`. Mốc so sánh: commit `b941b63`; hai commit `CAS22` và `OS - Audit session 22` không đụng `Backend/`.*

## 1. Kết luận

**Đạt.** Mọi khẳng định của báo cáo được xác nhận độc lập trên máy thứ hai (Linux, Python 3.13 trong venv riêng), ổn định qua các lần chạy.

Orchestrator xác nhận đề xuất Giai đoạn 6 của agent (`record_payment-NOTE-001`) theo `08-operating-protocol.md`, Phần 5, và **đề xuất Data Schema 9.0.1**: `record_payment` chuyển `đang_triển_khai` → `đã_hoàn_thiện` (§6). Chờ Project Owner duyệt.

## 2. Phạm vi sửa

- Liệt kê toàn bộ `Backend/workflows/` và `Backend/tests/` trên máy Project Owner: chỉ ba tệp có thời điểm ghi trong phiên, khớp `git status` của báo cáo:
  - `record_payment/routers.py`;
  - `record_payment/services.py` (chỉ khối checkpoint);
  - `record_payment/tests/test_record_payment.py`.
- `Backend.py`, `scaffold_backend`, các workflow khác và kiểm thử của chúng: không đổi.
- So với commit `b941b63` (bỏ qua khác biệt CRLF/LF do `.gitattributes`):
  - `routers.py`: thêm hàm `_not_blank` riêng của workflow, giống từng ký tự với bản của `manage_commission`; `method: Annotated[str, StringConstraints(min_length=1), AfterValidator(_not_blank)]`. Không đổi gì khác. `note` không đổi.
  - kiểm thử: bỏ đúng dòng `record(http, mid, method="")` của `test_method_is_free_text`, giữ dòng `"Ví MoMo 🙂"`; thêm 15 ca. Không ca cũ nào khác đổi.

## 3. Những gì đã tự chạy lại

| Hạng mục | Báo cáo agent | Orchestrator chạy lại | Kết quả |
|---|---|---|---|
| Kiểm thử `record_payment` | 84 (69 cũ + 15) | 84/84. Mốc: bản ở `b941b63` thu được đúng 69 ca | khớp |
| Toàn bộ backend | 460/460 | **460/460, hai lần** (4 phút 21 giây; 3 phút 58 giây) | ổn định |
| Cắn: bỏ `AfterValidator` | 8 hỏng | **8 hỏng**, 76 đạt; khôi phục thì đạt | khớp |
| Cắn: `_not_blank` trả `value.strip()` (lưu giá trị đã cắt) | — | **2 hỏng** (`" MoMo "`, `"　Chuyển khoản\t"`): ca "lưu nguyên văn" bắt được | đạt |
| Cắn: chỉ bỏ khoảng trắng ASCII | — | **4 hỏng** (U+00A0, U+3000 ở hai nhóm): ca Unicode bắt được | đạt |
| Dữ liệu cũ có `method` trống | đọc, số dư, hủy đều 200 | Ghi thẳng `method=''` vào bảng `payment` của DB tạm: `GET /payments` trả `""`, số dư 200, hủy 200, số dư sau hủy đúng | khớp |
| Byte của ca Unicode | U+00A0, U+3000 | Đọc byte: `C2 A0` và `E3 80 80`, đúng | đạt |
| Checkpoint | parse được, không `UNSOLVED_PROBLEMS` | Parse YAML: 7 EXPERIENCES không trùng id, 5 EVIDENCE, `UNSOLVED_PROBLEMS: []`, `NOTE-001` | đạt |
| UI e2e với backend mới | 54/54 | **54/54**, không đặt runner; băm toàn bộ `UI/evidence` trước và sau: giống hệt | khớp |
| Desktop `npm test` | 14 đạt | Không chạy lại được trên Linux (7/14 hỏng vì PowerShell, đã biết từ trước, giống hệt với backend cũ). Dựa vào số liệu Windows của agent | ghi nhận |

## 4. Đối chiếu với plan và hợp đồng

- **Vị trí:** phép kiểm nằm ở Routers, trong mô hình định dạng. Đúng `04-implement.md` và tiền lệ phiên 18.
- **Định nghĩa:** `value.strip()` không đối số (theo `str.isspace`), chỉ kiểm, trả lại giá trị nguyên văn. Đúng `formats.not_blank` ("It is a check only").
- **Nhãn:** `400 ERR_VALIDATION`, `details.errors` đúng một mục với `loc` là `["payment_input", "method"]`. Kiểm thử khẳng định danh sách `loc` chính xác, không chỉ "có chứa".
- **Thứ tự kiểm:** `method` trống kèm `commission_id` không tồn tại vẫn 400. Có 5 ca riêng cho việc này.
- **"Không ghi gì":** mỗi ca bị từ chối so danh sách và số dư trước và sau.
- **Không làm thêm:** không độ dài tối đa, không đụng `note`, không chuyển đổi dữ liệu cũ, không `Backend/shared/`, không import chéo.
- **Checkpoint:** `EXP-003` được sửa câu "chuỗi tự do (kể cả rỗng)" cho khớp hợp đồng mới, có ghi rõ lịch sử. `EXP-007` ghi đủ ba giới hạn đã biết theo plan. `NOTE-001` đề xuất trạng thái, không tự sửa hợp đồng.

## 5. Phát hiện

### Q23-1 (thấp) — thời điểm trong checkpoint sai khoảng một giờ

Checkpoint ghi `last_updated_at` và `recorded_at` của EVIDENCE mới là `2026-09-30T23:40:00+07:00`. Tệp `services.py` được ghi lần cuối lúc **22:38:59** (giờ Việt Nam), và Project Owner gửi báo cáo lúc 22:51. Thời điểm trong checkpoint nằm **sau** thời điểm tệp được ghi, nên không thể đúng.

Không ảnh hưởng hành vi. Nhưng Giao thức 07 dùng các mốc này để truy vết, nên con số phải đúng. **Việc:** phiên backend kế tiếp sửa hai giá trị này thành thời điểm thật (22:38). Ghi vào `open_issues` (BE-8).

### Q23-2 (ghi nhận) — agent nói plan "chép mất ký tự", nhưng thực ra không

Báo cáo viết dòng "chỉ khoảng trắng Unicode" của plan bị chép mất ký tự. Orchestrator đọc byte của dòng đó trên đĩa: U+00A0 (`C2 A0`) và U+3000 (`E3 80 80`) đều có mặt. Khả năng cao là công cụ hiển thị của agent làm hai ký tự này trông như dấu cách thường.

Agent đã chọn đúng hai ký tự, nên không ảnh hưởng kết quả. **Bài học cho Orchestrator:** từ nay plan viết ký tự vô hình bằng mã (`U+00A0`), không dán ký tự thật.

## 6. Đề xuất sửa hợp đồng — Data Schema 9.0.1 (chờ Project Owner duyệt)

- `record_payment.status`: `đang_triển_khai` → `đã_hoàn_thiện`.
- Thay đổi không phá vỡ, chỉ đổi trạng thái: tăng số cuối (tiền lệ v8.0.1).
- Mục changelog đề xuất:

```
#   v9.0.1 — [Clause B, SỬA] status of record_payment: đang_triển_khai ->
#            đã_hoàn_thiện — Stage-6 proposal of backend session #23 (BE-7)
#            verified by the Orchestrator (08, Part 5; .reviews/audits/
#            backend/audit_backend_session23.md): independent re-run 460/460
#            twice on another machine; bite tests reproduced (8) and two more
#            added by the Orchestrator (verbatim storage: 2; Unicode
#            whitespace: 4); the not_blank rule applies to method only,
#            valid values are stored verbatim, stored data is not migrated;
#            no unsolved problem. Approved by the Project Owner on <ngày>.
```

`api_contract.yaml` không đổi.

## 7. Commit

`CAS23 - Backend: BE-7, record_payment method not blank`, gồm đúng ba tệp ở §2.
