# Audit phiên 14 (desktop, vá và chẩn đoán sau chặng C) — `coding-agent@2026-09-27#4`

*Orchestrator, 2026-09-27. Theo `08-operating-protocol.md`, Phần 5. Plan: `.plan/desktop_plan.md` (phiên 14). Sổ tồn đọng: `.plan/open_issues.md`.*

## Kết luận

**Phiên 14 được chấp nhận.**

Các mục đã rõ nguyên nhân được vá có bằng chứng: DSK-1, 4, 5, 6, 7. Chẩn đoán DSK-2 và DSK-3 đi đúng theo bảng quyết định của plan, và dừng đúng ở điểm dừng bắt buộc. Báo cáo trung thực: mọi điểm tôi kiểm lại được đều khớp. Checkpoint ghi rõ cả những gì **chưa** biết (`main-PROB-001`).

Agent đã tự phát hiện và sửa bốn chỗ plan sai hoặc thiếu:
- giới hạn 2^53 của `CreationDate`;
- `stillAlive` cũng dính lỗi PID tái sử dụng;
- xung đột giữa việc ghi `argv` vào log và ca P3;
- `test-results/` bị Playwright xóa.

Agent còn tự làm một **phép đối chứng dương** cho công cụ đo trước khi dùng nó để kết luận. Đây là cách làm đúng: một công cụ "không thấy gì" chỉ có giá trị khi đã chứng minh được là nó thấy được thứ cần thấy.

**Kết luận chính về DSK-2 và DSK-3: H1 phù hợp với dữ liệu, nhưng mới có một lần quan sát.**
- Ở lần mở đầu tiên của một exe mới, tại vị trí không có ngoại lệ antivirus, một thành phần ngoài ứng dụng giữ lời gọi CreateProcess khoảng 64 s.
- Trong lúc đó, nó chạy một **bản sao** của ứng dụng, cùng dòng lệnh, **có backend thật**.

Đây cũng là nguyên nhân độ trễ ở lần mở đầu. Không sửa được trong code của Main.

**Chặng C chưa hoàn tất.** Còn chờ ba việc:
- quyết định về DSK-2 (phần "Đề xuất");
- phép đo lại của Project Owner;
- lần chạy trên máy khác (ENV-4).

## Tôi kiểm lại độc lập

| Kiểm | Kết quả |
|---|---|
| Phạm vi | Chỉ `Desktop/` đổi: `src/main.ts`, `tests/helpers.ts`, `tests/process_tree.spec.ts` (mới), `tests/packaged/measure_startup.cjs`, `packaging/prepare_runtime.mjs`, `package.json`. `Backend/`, `.contracts/`, `.plan/`, `CLAUDE.md`, `.slnx` không đổi. Trong `UI/`, chỉ `evidence/` bị `npm run e2e` ghi lại, như phiên 13 |
| Main | Đối chiếu với phiên 13 (phần code): **chỉ thêm dòng log**: `main started` (PID, PID cha, thời điểm bắt đầu, `argv` đã che năm cờ bị bỏ qua), `second-instance`, `window-all-closed`, `before-quit`, `received SIGINT/SIGTERM`. Không đổi hành vi, không đổi thứ tự khởi động |
| Build và lint (Linux, Node 24.14.1) | `tsc` sạch, `eslint --max-warnings 0` sạch |
| **Đối chứng DSK-1** | Tôi làm lại: `process_tree.spec.ts` trên `buildTree` mới **đạt 3/3**. Thay bằng logic cũ (bỏ điều kiện `createdNotBefore`) thì **hỏng 3/3**. Khớp đúng báo cáo |
| `buildTree` và `stillAlive` | Đúng: con chỉ được nhận khi `Created` không sớm hơn cha. `Created` là FILETIME dạng chuỗi, so bằng BigInt. `stillAlive` so PID + tên + `Created` |
| DSK-4 và DSK-5 (đọc code) | `site-packages\bin` bị xóa sau `pip install`. Kiểm `powershell.exe` trong `PATH` trước mọi bước. `release/` rồi `stage/` được xóa ở đầu, thử 5 lần cách 3 s; không xóa được thì nêu các tệp còn sót |
| DSK-7 | `package.json` có `"author": "TGN"` |
| Checkpoint | YAML hợp lệ: 18 EXPERIENCES, 1 UNSOLVED_PROBLEMS, 18 EVIDENCE, 6 NOTES. NOTE sai về `PATH` của phiên 13 đã được sửa trong EXP-017 |
| `release/` | Bộ cài 121 417 325 byte, khớp số trong báo cáo |

**Không kiểm lại được từ đây** (cần Windows và antivirus thật):
- `npm test` 14/14 và `test:packaged` 6/6;
- các đợt A, B, C;
- cài và gỡ;
- các lần chụp mốc `%APPDATA%`.

## Phát hiện

### Q14-1 — Bằng chứng gốc cho H1 đã mất; kết luận dựa trên một lần quan sát (mức: trung bình)

Log thô của các đợt A, B, C nằm trong `test-results/startup/`, và Playwright đã xóa thư mục này ở lần `npm test` sau. Số liệu trong báo cáo và EVIDENCE được chép từ đầu ra lúc đo. Agent đã tự phát hiện, tự khai, và chuyển công cụ sang ghi vào `startup-logs/`.

Hệ quả là kết luận H1 dựa trên đúng **một** lượt (C, lượt 1) mà tôi không kiểm lại được bằng dữ liệu gốc. Dữ liệu đó nhất quán nội tại, và khớp với bất thường ở phiên 13 (backend bị kết thúc với mã 0 mà không ghi gì, cache bị dùng chung). Chi tiết mạnh nhất là: CreateProcess của Node không trả về trong 64 s, và bản sao lại có cha là chính Node dù script chỉ gọi `spawn` một lần. Đó là dấu hiệu của một lớp chặn CreateProcess, kiểu phần mềm bảo mật, không phải lỗi của ứng dụng.

Dù vậy, một lần quan sát chưa đủ để đóng DSK-2.

**Cần:** Project Owner đo lại đợt C bằng công cụ đã sửa (log được giữ), theo các lệnh ở mục 7 của báo cáo agent.

### Q14-2 — `startup-logs/` chưa có trong `.gitignore` (mức: thấp)

Công cụ đo nay ghi vào `Desktop/startup-logs/`, nhưng `.gitignore` không đổi trong phiên. Phiên desktop sau thêm vào.

### Q14-3 — `release/` được build trước lần sửa checkpoint cuối (mức: thấp)

`src/main.ts` được sửa sau lần `dist` cuối, chỉ ở phần chú thích (đường dẫn `startup-logs`). Đây là chuyện lặp lại từ phiên 13. Lần `dist` tới sẽ tạo lại; không ảnh hưởng tới kết luận.

### Q14-4 — Ngoại lệ antivirus không loại hẳn lỗi `EPERM` khi build (mức: thấp, ghi nhận)

Trong 5 lần `dist` có ngoại lệ, 1 lần hỏng ở bước electron-builder đổi tên `win-unpacked.tmp`; chạy lại thì đạt. Lỗi này nằm trong electron-builder, sau bước dọn thư mục của `prepare_runtime`. Chấp nhận: đây là máy build, không phải máy người dùng. EXP-017 đã ghi.

### Nhận xét

- **Ngoại lệ theo thư mục có tác dụng rõ với khởi động.** Trong `release\`, có ngoại lệ, lượt đầu của exe mới mở cửa sổ sau khoảng 1,1 s. Ở vị trí đã cài không có ngoại lệ, mất 64 s. Tức là trên máy build của Project Owner, các con số 33–36 s của phiên 13 là do antivirus.
- **`UI/evidence/` lại bị ghi đè** với tên người chạy sai (UI-2). Việc tồn UI-2 cần làm sớm ở D1.

## Đánh giá rủi ro của DSK-2

Ý kiến của Orchestrator; Project Owner quyết.

Trên máy người dùng thật, không có `--ct-test-data-dir`, bản sao do antivirus tạo ra sẽ dùng `%APPDATA%\CommissionTracker\data.db` thật. Có ba điều **chưa biết**:
- bản sao ghi thẳng vào tệp thật, hay vào một lớp ảo hóa của antivirus;
- bản sao có thể chạy **chồng** với một bản thật đang chạy không;
- nó bị kết thúc thế nào.

Trong lượt đã quan sát, hai backend **không** chạy chồng: bản sao kết thúc trước khi bản thật bắt đầu.

Về mức độ:
- **Chỉ xảy ra ở lần mở đầu của mỗi exe mới:** sau khi cài, sau mỗi lần cập nhật, và chỉ trên máy có antivirus làm như vậy.
- **Bản sao bị giết giữa chừng không làm hỏng tệp**, vì SQLite có journal. Rủi ro thật là **hai backend cùng ghi một lúc**, nếu chúng chạy chồng. Ví dụ: hai bên cùng chạy bước nâng cấp cấu trúc bảng, hay nhắc việc bị gửi hai lần.
- Hôm nay chưa có dữ liệu người dùng: giao diện chưa ghi được gì cho tới D1.

Vì vậy tôi đánh giá **mức trung bình**. Nên xử lý trước khi người dùng bắt đầu nhập dữ liệu thật, tức trước khi phát hành các trang ghi của chặng D. Không cần dừng mọi việc để xử lý ngay.

## Đề xuất

1. **Phiên 14: chấp nhận.** Đóng DSK-1, 4, 5, 6, 7.
2. **DSK-3: đóng phần chẩn đoán.** Nguyên nhân là antivirus giữ exe lạ chưa ký ở lần chạy đầu. Hướng xử lý duy nhất là ký số exe: đưa vào DSK-9, chặng G. Màn hình chờ không giúp được, vì code chưa chạy.
3. **DSK-2: chuyển thành việc liên layer**, và Project Owner quyết:
   - **(a) Sửa hợp đồng** (đề xuất, chờ duyệt): thêm luật vào `clause_a_common.mandatory_rules` của Data Schema, nâng lên 6.2.0: *"At most one clause_b_backend process uses db_file_path at a time. A backend that cannot take exclusive ownership of db_file_path at start-up exits with a non-zero code and never writes READY."*
   - **(b) Phiên backend** hiện thực luật đó bằng một khóa độc quyền trên tệp dữ liệu, giữ suốt vòng đời, kèm kiểm thử hai tiến trình (BE-3). Gộp vào phiên backend ngắn đã định (BE-1, BE-2).
   - **Desktop không phải sửa.** Main đã coi "backend thoát trước READY" là thử lại rồi báo lỗi. Trong lượt đã quan sát, bản sao kết thúc trước khi bản thật khởi động backend, nên khóa không làm hỏng lần mở đầu.
   - **(c) Project Owner đo lại đợt C** (Q14-1). Đo với cả hai antivirus bật, rồi lần lượt tạm dừng từng cái, để biết bên nào tạo bản sao. Dữ liệu này không chặn (a) và (b).
4. **Phiên desktop sau:** thêm `startup-logs/` vào `.gitignore` (Q14-2).
5. **Chặng C:** chưa hoàn tất. Chờ 3(c) và lần chạy trên máy khác (ENV-4).
