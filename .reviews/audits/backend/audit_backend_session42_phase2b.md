# Audit phiên 42, pha 2b — backend (chặng H)

**Ngày audit:** 2026-10-13. **Người audit:** Orchestrator.
**Phiên được audit:** `coding-agent@2026-10-12#1`, pha 2b (vá ngắn sau audit pha 2).
**Yêu cầu:** `.reviews/prompts/backend/session42_phase2b_prompt.md`. Hợp đồng: Data Schema `10.0.1`, API Contract `6.1.0`.

## 1. Kết luận

**Đạt.** Hai việc của pha 2b đều đúng. Ca H-10 ổn định ở cả hai nơi: tôi chạy riêng 10/10 lần và toàn bộ 3/3 lượt trên Linux, agent chạy 10/10 và 3/3 trên Windows. Phép cắn của agent vẫn bị bắt. Phiên 42 (pha 1, 2 và 2b) được commit `CAS42`.

Có hai ghi nhận thấp, không chặn commit (§3.2, §3.3). Một trong hai là đính chính cách tôi giải thích ở audit pha 2.

## 2. Kiểm lại

**Tệp.** Tôi lấy lại cả 34 tệp `Backend/` của phiên từ máy Project Owner. Bỏ qua khác biệt xuống dòng, chỉ có hai tệp khác bản pha 2: `tests/test_kill_during_writes.py` và `Backend.py`. Liệt kê toàn bộ `Backend/` (trừ `env/`, `__pycache__/`) theo giờ sửa: chỉ hai tệp này được sửa sau pha 2, lúc 08:18:10 và 08:20:40 ngày 2026-10-13. Khớp báo cáo.

**Thay đổi.**
- `test_kill_during_writes.py`: thêm hằng `JOURNAL_MAGIC`. Khẳng định cuối giờ chỉ hỏng khi tệp `-journal` còn **và** 8 byte đầu là chuỗi nhận dạng `d9 d5 05 f9 20 a1 63 d7`. Các khẳng định khác giữ nguyên.
- `Backend.py`: khối Main có mục EVIDENCE riêng cho H-10. Phần H-10 và phép cắn (6) đã bỏ khỏi mục gộp của phiên 42, và các số thứ tự phép cắn đã đánh lại đúng.
- Giờ checkpoint: `last_updated_at` và `recorded_at` đều là `2026-10-13T08:20:13.2639332+07:00`, trước giờ ghi tệp 27 s. Bảy khối không đụng tới giữ giờ cũ, đúng yêu cầu "không sửa ngược".

**Chạy lại.** Linux, Python 3.13.13, `starlette 1.3.1`, `fastapi 0.136.1`. Bản sao dựng từ `git archive 03cd44b` chồng 34 tệp; tôi cmp lại đủ 34/34 sau khi chép (khắc phục lỗi bỏ sót dòng cuối ở pha 2).

| Lượt | Kết quả |
|---|---|
| Ca H-10 riêng, 10 lần liên tiếp | **10/10 đạt** (2,3–2,9 s) |
| `pytest` toàn bộ, lượt 1 | **814 passed** (343 s) |
| lượt 2 | **814 passed** (295 s) |
| lượt 3 | **814 passed** (295 s) |

Ba lượt toàn bộ chạy cùng lúc với các phép cắn ở §2.1, nên máy bận trong lúc chạy. Số liệu khớp báo cáo của agent (814 × 3 lượt, H-10 10/10).

Có 10 khối checkpoint, đều là YAML hợp lệ, không có `UNSOLVED_PROBLEMS` hay NOTES. Không còn `noqa`, `type: ignore` hay `pragma` nào.

### 2.1 Phép cắn (bản sao ngoài kho)

| Phép | Kết quả |
|---|---|
| Của agent: tách `manage_client.insert` thành hai giao dịch, ngủ 0,03 s giữa chúng | **bị bắt 3/3**, đúng khẳng định số liên hệ (`assert 0 == 2`) |
| Của tôi: tách hai giao dịch, **không** ngủ | bị bắt 4/6 (§3.3) |

## 3. Phát hiện

### 3.1 Hai việc của pha 2b: đạt

Khẳng định mới đúng ý của thông điệp ("a hot journal was left behind"). Mục EVIDENCE riêng nêu đủ claim, lệnh, kết quả và quan sát.

### 3.2 Giải thích của tôi về journal đầu bằng 0 chưa chính xác (thấp; đính chính)

Để biết vì sao tệp `-journal` đôi khi còn lại, tôi chèn lệnh in trạng thái journal vào một bản sao của ca, ở hai chỗ: ngay sau khi giết, và ở cuối ca. Kết quả 12 lần chạy:

| Ngay sau khi giết | Cuối ca | Số lần |
|---|---|---|
| không có tệp | không có tệp | 5 |
| có tệp, đầu `d9d505f9…` (journal nóng) | **không có tệp** | 3 |
| có tệp, đầu toàn 0 | còn nguyên tệp đó (cùng kích thước) | 4 |

Từ bảng này có hai điều:

1. **Journal nóng thật có xảy ra khi bị giết**, và đó là bình thường: lần giết rơi vào giữa một giao dịch đang ghi. Backend thứ hai hoàn tác nó rồi xóa đi, nên tới cuối ca tệp không còn. Như vậy khẳng định cuối không kiểm gì về lúc bị giết. Nó kiểm trạng thái **sau khi đã phục hồi**: không còn journal nóng nào sót lại. Ý đó đúng và vô hại, nhưng phần bảo vệ thật của ca là các khẳng định về dữ liệu ở trên (đủ bản ghi đã trả 201, không bản ghi dở dang, `integrity_check`). Không cần sửa.
2. **Journal đầu toàn 0 có ngay từ lúc bị giết**, không phải do một bước vô hiệu hóa sau đó. Tôi giải thích như sau (khớp với quan sát, nhưng tôi chưa đối chiếu với mã nguồn SQLite): ở chế độ `DELETE` với `synchronous=FULL`, SQLite ghi đầu journal bằng 0 trong lúc chép trang cũ vào journal, và chỉ ghi chuỗi nhận dạng khi đã đồng bộ journal, ngay trước khi sửa tệp cơ sở dữ liệu. Bị giết trước bước đó thì tệp dữ liệu chưa bị đụng, và journal **chưa từng có hiệu lực**. Tệp còn tới cuối ca vì backend thứ hai chỉ đọc (`GET`), không mở giao dịch ghi nào để ghi đè hay xóa nó.

Ở audit pha 2 tôi gọi tệp này là "journal đã vô hiệu". Agent chép đúng chữ đó vào comment của ca và vào EVIDENCE. Gọi đúng là "journal chưa từng có hiệu lực". Kết luận vô hại vẫn đúng, chỉ chữ mô tả sai. Đây là lỗi của tôi, không phải của agent. Ghi thành **BE-13** (thấp): sửa câu ở comment và EVIDENCE khi một phiên backend chạm lại tệp này. Không mở phiên riêng.

### 3.3 Ca H-10 bắt lỗi tách giao dịch theo xác suất (thấp; ghi nhận)

Tách hai giao dịch mà không ngủ thì ca chỉ bắt được 4/6 lần, vì lần giết phải rơi đúng khe giữa hai giao dịch. Đây là bản chất của loại kiểm thử "giết giữa lúc ghi", không sửa được bằng cách viết ca khác đi mà vẫn giữ tiến trình thật. Luật "một lần ghi là một giao dịch" còn được khóa ở mức mã: R42-3 dùng `write_scope`, và `insert` nằm trong một `transaction()`. Chấp nhận, không mở mục.

### 3.4 Định danh phiên

Khối Main ghi `last_updated_by: coding-agent@2026-10-12#1`, dù việc sửa diễn ra ngày 2026-10-13. Pha 2b là một phần của phiên 42, bắt đầu ngày 2026-10-12, nên giữ định danh đó là đúng.

## 4. Đóng mục

Đóng 2026-10-13, phiên 42:
- R42-1 → R42-15, trừ R42-6 (V2);
- BE-8, BE-12, H-10.

Mở BE-13 (thấp).

## 5. Việc tiếp theo

- Project Owner commit `CAS42` (34 tệp `Backend/`), rồi commit `OS` cho tài liệu của Orchestrator.
- BE-12 đã nâng Starlette trong `requirements.txt`, nên **bản cài 1.0.0 hiện có ở `Desktop\release\` vẫn mang Starlette 1.0.0**. Bộ cài phải dựng lại. Việc này nằm trong chặng H bước 3: dựng lại bản cuối, chạy `test:packaged`, đo lại dung lượng (H-3).
- Phiên kiểm độc lập kế tiếp: Desktop.
