# ===WCA-PLAN===
# session_for: backend
# drafted_by: Orchestrator + Project Owner
# drafted_at: 2026-10-12T16:40:00+07:00
# contract: data_schema 10.0.1, api_contract 6.1.0 (approved)

## MỤC TIÊU PHIÊN NÀY

**Phiên 42, pha 2: vá.** Plan này thay plan pha 1. Bạn chính là phiên đã làm pha 1; báo cáo pha 1 của bạn đã được Orchestrator kiểm lại và chọn việc. Từ pha 2, bạn được sửa tệp trong `Backend/`.

Pha 2 gồm hai nhóm:
1. **Phát hiện của pha 1 được chọn sửa:** R42-1, R42-2, R42-3, R42-4, R42-5, R42-7, R42-8, R42-9, R42-10, R42-11, R42-12, R42-13, R42-14, R42-15.
2. **Việc đã biết của layer** (`.plan/open_issues.md`): BE-8, BE-12, H-10.

**R42-6 không làm** (để V2). Lý do: ví dụ của chính skill (04, `book_appointment`) cũng gọi đồng hồ trong Services; sửa sáu workflow là nhiều thay đổi cho một lợi ích nhỏ ở V1.

Từ pha 2 bạn **được đọc** `.plan/open_issues.md`, mục BE-8, BE-12, H-10 và mục "Chặng H — phiên kiểm độc lập backend (phiên 42)".

**Hợp đồng đổi một chỗ, trước phiên này:** API Contract **6.1.0** (CT-10, Project Owner duyệt 2026-10-12) thêm vào `endpoint_forms.http` luật: tham số truy vấn không phải input của lối vào thì **bị bỏ qua**. Xác nhận Data Schema `10.0.1`, API Contract `6.1.0`, cả hai `approved`. Mọi lỗi mới trả nhãn và mã đã khai báo cho đúng lối vào đó. Không thêm nhãn, mã lỗi hay điểm giao tiếp nào.

**Điểm dừng:**
- mọi việc ở mục "VIỆC CẦN LÀM" xong, mỗi việc có ca kiểm thử và phép cắn như ghi;
- `pytest` đạt 3 lượt liên tiếp;
- Desktop `npm test` và UI e2e đạt một lượt với backend mới.

## ĐẶC TẢ ĐÃ CHỐT

### Nhóm A — ranh giới đầu vào (R42-1, R42-2, R42-9, R42-10, R42-8)

**R42-1 — chuỗi không mã hóa được UTF-8.** Mọi trường chuỗi mà bên ngoài gửi vào backend qua `http`, ở mọi workflow, phải bị Routers từ chối nếu chuỗi không mã hóa được UTF-8 (ví dụ surrogate lẻ `"\ud800"`), **bằng nhãn lỗi định dạng mà lối vào đó đã khai**:
- trường trong body JSON và tham số truy vấn của lối vào có khai 400: **400 `ERR_VALIDATION`**, `details` chỉ ra trường, theo đúng dạng lỗi 400 hiện có của workflow;
- tham số đường dẫn và tham số truy vấn mang mã định danh (ví dụ `client_id`, `commission_id`): làm **đúng như mã định danh sai dạng hiện nay** ở lối vào đó (thường là 404 `ERR_NOT_FOUND`, như các ca "malformed id" đã có). Không trả 400 ở lối vào không khai 400.
- Áp cho **mọi** trường chuỗi, không chỉ 10 trường đã đo ở pha 1. Rà lại cả các trường có `StringConstraints` và các trường đường dẫn tệp (`backup_data`: `destination_dir`, `archive_path`). Trường nào đã trả 400 thì ghi lý do vào báo cáo và vẫn thêm ca kiểm thử.
- Cách làm do bạn chọn: mỗi workflow giữ bản riêng, đúng khuôn của layer. Không đưa vào `shared/` (`05-edge-cases.md` Bước 5.3).
- **Kiểm thử:** mỗi trường một ca (tham số hóa là được), khẳng định đúng nhãn như trên, `content-type: application/json`, `error_body` đúng mã, và không có gì được ghi. Không lối vào nào còn trả 500 dạng chữ thường cho chuỗi như vậy.
- **Phép cắn:** bỏ kiểm tra ở một workflow → ca của workflow đó hỏng.

**R42-2, R42-10 — chỉ chữ số ASCII.**
- `send_reminder/routers.py`, `_AT_TIME_REGEX`: thay `\d` bằng `[0-9]`.
- `Backend.py`, kiểm `CT_PORT`: chỉ nhận chữ số ASCII. `CT_PORT="²"` và `CT_PORT="٨٠٨٠"` phải thoát với mã 2, không `READY`, như mọi giá trị khởi động sai dạng khác (main-EXP-003).
- `_SEMVER` ở `Backend.py` và `backup_data/services.py`: `[0-9]` thay `\d`. `"1٢.0.0"` không phải semantic version.
- Rà toàn `Backend/` tìm `\d` và `isdigit()` ở chỗ kiểm định dạng đầu vào; sửa mọi chỗ cùng loại, liệt kê trong báo cáo.
- **Kiểm thử:** `at_time` `"0٩:30"`, `"09:3٠"` → 400; `CT_PORT` `"²"`, `"٨٠٨٠"` → mã 2; `parse_semver("1٢.0.0")` → không hợp lệ.

**R42-9 — tham số truy vấn thừa (CT-10, API Contract 6.1.0).** Hợp đồng nay ghi rõ: tham số truy vấn không phải input của lối vào thì bị bỏ qua. Hành vi hiện tại đã đúng luật mới, nên **không đổi hành vi**. Việc của phiên:
- gỡ mã chết đã nêu ở pha 1 (`extra="forbid"` của `_PeriodFormat` trong `view_income_report/routers.py`, trong khi `given` đã lọc sẵn);
- sửa `view_income_report-EXP-003` để trỏ tới luật của API Contract 6.1.0;
- **kiểm thử:** một ca tham số hóa cho mọi lối vào `GET`: thêm tham số thừa (`?foo=1`, cộng tham số thật nếu có) → kết quả giống hệt khi không có tham số thừa. Ca này khóa luật mới.

**R42-8 — thứ tự ngày của `view_income_report`.** Từ Data Schema 9.0.2, `period_to` là `date (on or after period_from)`, tức là một phần của `type`. Chuyển kiểm tra thứ tự ngày từ Services sang Routers. Hành vi ngoài không đổi (400). Sửa `view_income_report-EXP-001`. Ca kiểm thử 400 hiện có phải vẫn đạt.

### Nhóm B — đúng đắn và cô lập (R42-3, R42-4, R42-5, R42-15)

**R42-3 — mất cờ lưu trữ.** `manage_client.edit` và `manage_client.set_archived` phải đọc và ghi trong **cùng một giao dịch**, theo khuôn "kiểm tra rồi ghi nguyên tử" của layer (như `write_scope` của `update_progress`). Cách khác được nêu ở pha 1 (cho `replace` chỉ ghi cột của hành động đó) cũng chấp nhận được, nếu bạn ghi lý do. **Kiểm thử:** dựng lại đúng thứ tự chen nhau tất định đã dùng ở pha 1 → cờ lưu trữ không mất.

**R42-4 — khóa luật "mỗi workflow chỉ chạm bảng của mình" bằng máy.** Một kiểm thử cấp layer trong `Backend/tests/`:
- lấy danh sách bảng mà mỗi workflow sở hữu, từ chính `_STORAGE_UPGRADES` của workflow đó (câu `CREATE TABLE`, `CREATE INDEX`), không gõ tay;
- quét mọi câu SQL trong `adapters.py` của từng workflow, và khẳng định mỗi tên bảng xuất hiện ở đó thuộc chính workflow đó;
- khẳng định không `services.py`, `routers.py` hay `entities.py` nào chứa SQL;
- khẳng định không workflow nào nhập mã từ thư mục của workflow khác (trừ cách gọi đã có qua Adapters của bên gọi tới Routers của bên được gọi, nếu dự án dùng `import` cho việc đó; khi ấy liệt kê đích danh các chỗ được phép).
- **Phép cắn:** lặp lại phép cắn B2 của pha 1 (`record_payment` đọc thẳng bảng `commission`) → kiểm thử mới hỏng.

**R42-5 — `READY` chỉ sau khi đã lắng nghe.** Một ca trong `tests/test_backend_process.py`: ngay khi đọc được dòng `READY`, mở kết nối TCP tới cổng với thời gian chờ ngắn (ví dụ 0,2 s), không thử lại. **Phép cắn:** lặp lại B5 hoặc B5b của pha 1 → ca mới hỏng. Nếu trên Windows ca mới vẫn không bắt được B5 vì hệ điều hành tự gửi lại SYN, ghi rõ điều đo được và vẫn giữ ca, kèm giới hạn đó trong checkpoint.

**R42-15.** Thêm ca vào `manage_commission`: tạo đơn với `deadline` ở quá khứ → 201 (hợp đồng không cấm). **Phép cắn:** lặp lại B1 của pha 1 → ca mới hỏng. Rà các ngày cố định trong kiểm thử của `send_reminder` từng làm B1 bị bắt "nhờ may": nếu ca nào sẽ đổi kết quả khi ngày cố định trôi qua, ghi vào báo cáo; không sửa ở phiên này.

### Nhóm C — phụ thuộc (BE-12)

**BE-12 — nâng Starlette.** Orchestrator đã thử ngày 2026-10-12: `fastapi==0.136.1` khai `starlette>=0.46.0`, không có cận trên; với `starlette==1.3.1`, `pip check` sạch, `pip-audit` không còn lỗ hổng, và 573 kiểm thử đạt (Linux, Python 3.11). Việc của bạn:
- `Backend/requirements.txt`: `starlette==1.0.0` → `starlette==1.3.1`. Không đổi phiên bản nào khác. `requirements-dev.txt` nhận theo qua `-r requirements.txt`.
- Cài vào `Backend/env`: `env\Scripts\python.exe -m pip install -r requirements-dev.txt`. **Đây là ngoại lệ duy nhất cho luật "không cài gói"** của plan.
- `env\Scripts\python.exe -m pip check`: sạch. Ghi phiên bản starlette, fastapi đã cài vào EVIDENCE.
- Kiểm thử có thể có thêm cảnh báo của `starlette.testclient` (khuyên dùng `httpx2`). Đó là cảnh báo của công cụ kiểm thử, không phải lỗi; không đổi `httpx`.
- Sửa `main-EXP` mô tả phụ thuộc (nếu có ghi phiên bản), và EVIDENCE tách phụ thuộc.
- Bản đóng gói cài theo `requirements.txt` khi dựng (`Desktop/packaging/prepare_runtime.mjs`); việc dựng lại gói thuộc chặng H bước 3, không thuộc phiên này.

### Nhóm D — bằng chứng còn thiếu (H-10)

**H-10 — giết backend giữa lúc ghi.** Một ca trong `Backend/tests/`, chạy tiến trình `Backend.py` thật:
- một luồng ghi liên tục qua `http` (ví dụ `POST /clients` liên tiếp);
- giết tiến trình giữa chừng (`kill`, không đóng stdin);
- khởi động lại trên cùng tệp. Khẳng định:
  - `PRAGMA integrity_check` trả `ok`;
  - mỗi bản ghi mà phía gửi đã nhận 201 đều còn, và không có bản ghi dở dang (một khách hàng thiếu liên hệ của chính nó);
  - backend lên lại, `READY`, đọc được.

### Nhóm E — mã và checkpoint (R42-7, R42-11, R42-12, R42-13, R42-14, BE-8)

- **R42-7:** không đổi mã. Ghi vào checkpoint của `record_payment` và `view_income_report` một EXPERIENCES nói rõ `_MAX_COMPUTED_INTEGER` là ngoại lệ có chủ ý (luật số nguyên tính ra của Data Schema), và vì sao nó không nằm trong Configs.
- **R42-11:** xóa 5 NOTES đã nêu.
- **R42-12:** các mục EVIDENCE nêu script tạm hay script ngoài dự án: không đưa script vào dự án. Sửa `how` để nói rõ đây là **bằng chứng một lần**, không chạy lại được, và nêu ca kiểm thử nào trong dự án hiện giữ cùng khẳng định (nếu có).
- **R42-13:** ghi đè các mục "cả layer đạt" về mốc mới nhất (sau phiên này), sửa số ca của `-k payments`, `-k income`, số chỗ gọi `wire_workflows(`.
- **R42-14:** xóa hai import không dùng.
- **BE-8:** `record_payment/services.py`, EVIDENCE BE-7, `recorded_at: 2026-09-30T23:40:00+07:00` → `2026-09-30T22:38:59+07:00` (giờ tệp được ghi lần cuối, Orchestrator đo ở audit phiên 23). Không đổi gì khác trong mục đó.

## VIỆC CẦN LÀM, THEO THỨ TỰ (PHA 2)

0. Đọc lại plan này. Đọc `.plan/open_issues.md`, mục BE-8, BE-12, H-10, và mục "Chặng H — phiên kiểm độc lập backend (phiên 42)". Hỏi Project Owner số thứ tự phiên trong ngày nếu chưa có câu trả lời.

1. **Mốc:** `git status --short` (phải rỗng); `pytest -q` một lượt (573).

2. **BE-12** trước, vì nó đổi môi trường mà mọi bước sau chạy trên đó. Chạy `pytest` toàn bộ: phải đạt.

3. **Nhóm A**, rồi **nhóm B**, rồi **H-10**, rồi **nhóm E**. Sau mỗi nhóm chạy `pytest` toàn bộ một lượt.

4. **Phép cắn** như ghi ở từng việc, chỉ trên bản sao ngoài kho. Khi xóa bản sao, **chỉ xóa đúng thư mục bạn tạo**, gọi đích danh; không xóa theo mẫu tên.

5. **`Backend.pyproj`:** thêm `<Compile Include>` cho tệp kiểm thử mới (`CLAUDE.md` mục 5). Sửa bằng công cụ soạn thảo tệp trực tiếp.

6. **Chạy toàn bộ:**
   - `pytest` **3 lượt liên tiếp**, ghi số đạt mỗi lượt. Lượt hỏng vẫn tính và phải báo;
   - trong `Desktop/`: `npm test` một lượt (mốc **79**; xem `CLAUDE.md` mục 5 về `electron.exe` sau `npm ci`);
   - trong `UI/`: `npm run build` rồi `npm run e2e` một lượt (mốc **83**), không đặt `CT_WALKTHROUGH_RUNNER`; `UI/evidence` không đổi. Hai lượt này xác nhận R42-1 và BE-12 không làm vỡ bên gọi.

7. **Checkpoint** theo Giao thức 07, ở mọi khối bạn sửa mã hay kiểm thử. **Giờ ghi:** chép nguyên `Get-Date -Format o` lấy ngay trước khi ghi. **Nếu sửa checkpoint sau khi đã chạy toàn bộ, chạy lại `pytest` một lượt** và nói rõ trong báo cáo.

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG

- Mọi lỗi trả nhãn và mã đã khai báo cho **đúng lối vào đó**. 16 trong 17 lối vào `GET` không khai 400. Nếu một việc của plan dường như đòi trả một nhãn mà lối vào không khai, **dừng lại và báo**, kèm danh sách lối vào; không tự quyết.
- `endpoint_forms.http` (6.1.0): tham số truy vấn không khai báo bị bỏ qua.
- Mỗi workflow backend chỉ tạo và nâng cấp bảng của chính nó (`clause_a_common.mandatory_rules`).
- `apply_watermark`, `verify_watermark` không có mã (V4 trở đi).

## CẢNH BÁO — điều KHÔNG được làm trong pha 2

- Không sửa tệp nào ngoài `Backend/`. Được **chạy** lệnh của `Desktop/` và `UI/`.
- Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`. Không đọc, không ghi `.reviews/`.
- Không đổi nhãn, mã lỗi, điểm giao tiếp hay cấu trúc bảng nào. Không thêm bước nâng cấp vào `_STORAGE_UPGRADES`.
- Không đổi phiên bản phụ thuộc nào ngoài `starlette`. Không thêm gói, linter hay công cụ kiểm kiểu.
- Không thêm `noqa`, `type: ignore`, `pragma` hay chú thích tắt kiểm tra nào. Không viết kiểm thử luôn đạt.
- Không chạy `git commit`, `push`, `reset`, `checkout`, `restore`, `stash` hay lệnh nào đổi trạng thái kho.
- ⚠ Không kiểm thử hay lần chạy nào được đụng `%APPDATA%\CommissionTracker` thật. Desktop luôn chạy kèm `--ct-test-data-dir`.
- Không tắt, không đổi cấu hình antivirus. Không sửa registry, không cài bộ cài.
- Không xóa thư mục tạm theo mẫu tên; chỉ xóa đúng thư mục mình tạo.
- Không dùng sub-agent. Không chạy song song hai lệnh kiểm thử.

## TIÊU CHÍ HOÀN TẤT PHA 2

1. Mỗi việc của nhóm A–E xong, có ca kiểm thử và phép cắn như ghi; phép cắn nào không bị bắt thì ghi rõ.
2. `requirements.txt` có `starlette==1.3.1`; `pip check` sạch.
3. `pytest` đạt 3 lượt liên tiếp.
4. Desktop `npm test` 79/79 một lượt; UI e2e 83/83 một lượt; `UI/evidence` không đổi.
5. Checkpoint: YAML hợp lệ; giờ ghi đúng BE-8; `UNSOLVED_PROBLEMS: []`; không NOTES quá 14 ngày.
6. Mốc `%APPDATA%` không bị đụng.
7. `git status --short` cuối phiên chỉ có tệp trong `Backend/`; liệt kê kèm `git check-ignore -v` cho từng tệp mới (`core.ignorecase=true`).
8. **Báo cáo** bằng tiếng Việt theo `CLAUDE.md` mục 5, gồm:
   - bảng từng việc: đã làm gì, tệp nào, ca nào, phép cắn nào, kết quả;
   - với R42-1: danh sách mọi trường chuỗi đã rà, trường nào trước đây đã trả 400;
   - với R42-9: danh sách lối vào `GET` có trong ca kiểm thử mới;
   - số đạt của ba lượt `pytest`, Desktop `npm test`, UI e2e;
   - các lệnh để chạy lại.
