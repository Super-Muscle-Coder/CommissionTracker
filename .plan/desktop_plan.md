# ===WCA-PLAN===
# session_for: desktop
# drafted_by: Orchestrator + Project Owner
# drafted_at: 2026-10-13T13:34:04+07:00
# contract: data_schema 10.0.1, api_contract 6.2.0 (approved)

## MỤC TIÊU PHIÊN NÀY

Đây là **pha 2 (vá)** của phiên 43, phiên kiểm độc lập Desktop của chặng H. Bạn tiếp tục cùng phiên, cùng định danh `coding-agent@2026-10-13#1`.

Orchestrator đã audit báo cáo pha 1 và đánh giá đạt (bản audit Orchestrator giữ riêng). Pha 1 có 21 phát hiện, R43-1 → R43-21; bạn báo 20 mục, mã R43-14b được đánh lại thành R43-20, và Orchestrator thêm R43-21. Project Owner đã quyết ngày 2026-10-13:
- CT-11 và CT-12 theo hướng A, ghi thành **API Contract 6.2.0**;
- pha 2 làm trong cùng phiên này, gồm các phát hiện được chọn sửa **và** việc đã biết của Desktop.

Từ pha 2, bạn được sửa tệp trong `Desktop/`, và được đọc `.plan/open_issues.md` ở các mục: mục "Chặng H — phiên kiểm độc lập desktop (phiên 43)" (gồm CT-11, CT-12), DSK-30, H-7, H-9, H-11. Vẫn không đọc, không ghi `.reviews/`.

**Hợp đồng vừa đổi (6.1.0 → 6.2.0).** Đọc hai mục changelog v6.2.0 ở đầu `api_contract.yaml`, câu mới cuối `clause_a_common.endpoint_forms.ipc`, và `meaning` mới của `ERR_RESTORE_FAILED`. Cả hai thay đổi đều là mở rộng. Ngoài R43-11, không thay đổi nào đòi đổi hành vi của Desktop.

**Điểm dừng:** mọi việc ở mục "VIỆC CẦN LÀM" xong; mọi phép cắn ghi ở từng việc bị bắt; `npm test` ba lượt liên tiếp; UI e2e một lượt; checkpoint đúng Giao thức 07.

## VIỆC CẦN LÀM, THEO THỨ TỰ (PHA 2)

0. **Đọc lại** plan này từ đầu, các mục `open_issues` nêu trên, và phần hợp đồng v6.2.0. Xác nhận Data Schema **`10.0.1`** và API Contract **`6.2.0`**, cả hai `approved`. Sai thì dừng lại và báo.

   **Mốc:** ghi `git status --short` (phải trống) và mốc `%APPDATA%` như pha 1. Hỏi Project Owner trạng thái antivirus nếu pha 1 chưa có câu trả lời.

### Nhóm A — kiểm thử phải bắt được những vi phạm pha 1 tìm ra

Với mỗi việc dưới đây, làm lại **đúng phép cắn của pha 1** trên bản sao ngoài kho. Phép cắn phải bị bắt bởi ca mới hay ca đã sửa.

| Mã | Việc | Phép cắn phải bị bắt |
|---|---|---|
| R43-1 | Một ca chạy Main thật khẳng định `webContents.getLastWebPreferences()` của **cửa sổ chính** có `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false` | M2 (`sandbox: false`) |
| R43-2 | Ca cho **bước 4 hỏng** (không dời được tệp dữ liệu đang dùng) và **bước 5 hỏng** (không chuyển được tệp chờ vào `db_file_path`), theo `.design/f_restore.md` §3 bước 8. Dùng kỹ thuật `ScriptedAdapters` có sẵn. Khẳng định: kết quả `rolled_back`; `db_file_path` giữ dữ liệu trước đó; bản ghi đang chờ đã xóa | D2 (gán `moves.asidePath` trước khi đổi tên) |
| R43-3 | Thêm origin `app://commission-tracker.evil/` vào R1a | D3 (`startsWith` thay cho `!==`) |
| R43-5 | Ca: hai lần kiểm trả cùng một `notification_id` thì hiện hai toast | X1 (bỏ thông báo trùng id) |
| R43-8 | Một khẳng định so ba địa chỉ trong `configs/restore_data.json` với chuỗi nguyên văn của hợp đồng: `restore:prepare`, `restore:status`, `restore:cancel` | C1 (`restore:prepare` thành `restore:prepare2`): ca mới phải hỏng |

### Nhóm B — mã

1. **R43-21: tuần tự hóa `restore_data`.**
   - Mọi lời gọi tới `prepare`, `status`, `cancel` và `applyPending` của Services chạy **nối tiếp** qua một hàng đợi trong Services. Một lời gọi chỉ bắt đầu khi lời gọi trước đã xong, kể cả khi lời gọi trước hỏng.
   - Không thêm nhãn nào, không từ chối lời gọi thứ hai, không thêm lối vào.
   - **Ca mới, phải tất định** (không dựa vào may rủi của thời gian):
     - hai lần `restore:prepare` gửi cùng lúc qua `invoke`, lần thứ nhất bị backend giả làm chậm. Khẳng định: bản ghi cuối cùng (`restore:status`) khớp với tệp chờ cuối cùng mà backend đã tạo, và cả hai lời gọi đều có câu trả lời;
     - `restore:cancel` gửi trong lúc một `restore:prepare` đang chạy: cancel trả lời sau khi prepare xong, và sau cùng không còn gì đang chờ.
   - **Phép cắn:** bỏ hàng đợi. Ca mới phải hỏng **3/3** lần chạy.
2. **R43-6:** đường dẫn và phương thức của `check_due` (`POST /reminders/checks`) chuyển vào mục `reminder_ticker` của `configs/desktop.json`. Main đọc và trao cho ticker. Hành vi không đổi.
3. **R43-9:** nhãn `200` của `native_dialogs` chuyển vào mục `native_dialogs` của `configs/desktop.json`. Hành vi không đổi.
4. **R43-11 (theo CT-11):** `dialog:open-file` đòi đối số đúng `{ filters }`. `filters` là danh sách đúng hình dạng hoặc `null`; không thừa khóa. Không đối số, `{}`, hay có khóa lạ: `invoke` bị từ chối. Sửa ca N1b cho khớp. Giao diện luôn gửi `{ filters }`, nên không bên gọi nào bị ảnh hưởng.
5. **R43-4 (theo CT-12):**
   - Main tự khai kiểu của hai khóa nó đọc trong `details` của `ERR_RESTORE_FAILED` (`rollback_stage`, `previous_database_path`), đúng như `meaning` mới.
   - `src/error_dialog.ts` **không** còn nhập gì từ `src/workflows/restore_data/`.
   - Hành vi không đổi; U1–U3 và A5 phải đạt như cũ.

### Nhóm C — việc đã biết của Desktop (đọc mục tương ứng trong `open_issues`)

6. **DSK-30 mục 3:** mọi ca dùng `spawnMain` in log của Main khi ca hỏng, kể cả khi hỏng vì hết giờ chờ tiến trình thoát.
7. **DSK-30 mục 6:** `tests/fixtures/fake_backend_die_on_first_call.py` theo dõi mọi kết nối cùng lúc (ví dụ `selectors`). Một kết nối không gửi gì không được chặn kết nối khác.
8. **DSK-30 mục 7:** ca 6 khẳng định thêm dòng stderr `fake backend: first call received`.
   - **Phép cắn:** backend giả thoát ngay sau `READY`, không chờ lời gọi. Ca 6 phải hỏng.
9. **H-7: ba ô chiều gọi đi chưa có ca.** Thêm chế độ vào `tests/fixtures/fake_backend_restore.py`, cộng ba ca. Kết quả mong đợi theo ánh xạ hiện có của Adapters:
   - `create_backup` trả 400: `restore:prepare` trả **424** `ERR_STORAGE_IO`, không gì đang chờ;
   - `create_backup` trả 201 với thân sai hình dạng: **424**, không gì đang chờ;
   - `prepare_restore` trả 400: **503** `ERR_SERVICE_UNAVAILABLE`, không gì đang chờ, không có bản sao lưu an toàn.

   Không đổi ánh xạ. Nếu hành vi thật khác mong đợi, dừng lại và báo.
10. **H-9: khởi động khi thư mục dữ liệu không dùng được.** Ca với `--ct-test-data-dir` trỏ vào một **tệp**, và ca trỏ vào một đường dẫn mà thư mục cha là một tệp. Khẳng định:
    - chữ hộp thoại lỗi đúng câu khởi động tiếng Việt trong `configs/desktop.json`;
    - mã thoát là `main.failure_exit_code`;
    - ứng dụng thoát trong hạn, không treo;
    - không sót tiến trình python.

    Nếu hành vi thật khác (treo, không hộp thoại, mã thoát 0), **dừng lại và báo trước khi sửa mã Main**.
11. **H-11: trạng thái sót lại khi máy tắt giữa lúc khôi phục.** Dựng sẵn trạng thái trên thư mục dữ liệu tạm, rồi chạy Main thật:
    - **sau bước 4:** bản ghi đang chờ còn, tệp chờ còn, `db_file_path` trống, tệp cũ đã ở `restore-previous`. Khẳng định kết quả `restored` và dữ liệu là của bản sao lưu;
    - **sau bước 5:** bản ghi đang chờ còn, tệp chờ đã ở `db_file_path`. Khẳng định kết quả `discarded`, dữ liệu là của bản sao lưu, tệp cũ còn ở `restore-previous`.

    Đây là suy luận của Orchestrator từ `.design/f_restore.md` §3. **Nếu kết quả khác suy luận, đó là lỗi thật của chặng F: dừng lại và báo**, không sửa mã để khớp suy luận.

    Hai điều ghi lại trong báo cáo, không khẳng định cứng và không sửa:
    - ở trạng thái sau bước 4, backend khởi động trước `restore_trigger`, nên có thể tạo một cơ sở dữ liệu rỗng ở `db_file_path`, rồi tệp rỗng đó bị dời sang `restore-previous`. Liệt kê các tệp trong `restore-previous` sau ca;
    - ở trạng thái sau bước 5, chép nguyên chữ hộp thoại của kết quả `discarded`.

### Nhóm D — checkpoint, comment, công cụ

12. **R43-12:** comment và checkpoint của `native_dialogs` (gồm `packaged_app.spec.ts:545`): `save_file` đã bị bỏ khỏi hợp đồng ở 6.0.0. Nay `dialog:save-file` là một địa chỉ không khai báo, và ca N2 khẳng định preload từ chối nó.
13. **R43-13:** comment đầu Adapters của `restore_data` (pha 2 có đổi tên tệp dữ liệu và tệp chờ); `restore_data-EXP-001` đếm đúng 8 nhãn, 6 mã lỗi.
14. **R43-14:** `restore_trigger-EXP-003` dùng đúng khóa `restore_failed_summaries`.
15. **R43-15:** bỏ câu lỗi thời ở cuối `main-EXP-031`, và NOTE ngày 2026-10-05 về DSK-18.
16. **R43-16:** các mục EVIDENCE mang số ca cũ (main #3, #15, #22, #28, #30, #31, #34, #37, #40; `restore_data` #8): theo Giao thức 07, chỉ giữ bằng chứng mới nhất cho mỗi khẳng định. Gộp thành mục mốc hiện tại, ghi số ca sau pha 2.
17. **R43-7:** ghi vào checkpoint `restore_data` rằng bước `sync` khi ghi bản ghi đang chờ không kiểm được bằng kiểm thử thường (cần cắt điện).
18. **R43-20:** `tests/tools/toast_probe_main.cjs` và `tests/probe.cjs` dọn thư mục tạm chúng tạo khi thoát. Chạy mỗi công cụ một lần để kiểm, **sau khi** đọc mã và xác nhận nó không đụng `%APPDATA%\CommissionTracker` thật. `toast_probe_main.cjs` hiện toast thật: báo Project Owner trước khi chạy.
19. Khi ghi EXPERIENCES cho cách từ chối lời gọi `ipc`, trích đúng API Contract 6.2.0 (`endpoint_forms.ipc`). Các câu ghi phiên bản lúc một luật ra đời ("API Contract 5.0.0") thì giữ nguyên.

### Nhóm E — chạy và bằng chứng

20. **Theo thứ tự:**
    - `npm run lint`: sạch.
    - `npm test` **ba lượt liên tiếp** trên máy Project Owner trong lúc anh dùng máy bình thường (tiêu chí ổn định của chặng H, câu hỏi 3). Mọi lượt hỏng đều tính và phải báo: tên ca, lỗi, log (DSK-30 mục 3).
      - Ca 15 và 16 của `show_inactive` đo tiêu điểm cửa sổ. Nếu hỏng vì Project Owner chuyển cửa sổ, ghi riêng, kèm lý do (DSK-30 mục 4). Không `skip` chúng.
      - Ca khác hỏng thì tìm nguyên nhân. Không chạy lại cho tới khi đạt, không nới thời gian chờ.
    - Trong `UI/`: `npm run build`, rồi `npm run e2e` một lượt, không đặt `CT_WALKTHROUGH_RUNNER`. Phải đạt **83/83**, và `UI/evidence` không đổi.
    - **Không** chạy `npm run dist` và `test:packaged`. Bản đóng gói sẽ được dựng lại ở chặng H bước 3, sau phiên kiểm độc lập của giao diện, kèm Starlette mới (BE-12).
21. **Checkpoint** theo Giao thức 07, ở mọi khối bạn sửa:
    - EXPERIENCES cho R43-21 (hàng đợi), R43-11 và CT-11, R43-4 và CT-12, H-9, H-11 (kết quả thật);
    - EVIDENCE gồm các phép cắn, ba lượt `npm test`, UI e2e;
    - **Giờ ghi:** với mỗi khối, chép **nguyên** giá trị `Get-Date -Format o` lấy **ngay trước khi ghi khối đó**. Không dùng chung một giá trị cho nhiều khối. Không sửa ngược khối không đụng tới.
    - **Nếu sửa checkpoint sau khi đã chạy ba lượt, chạy lại `npm test` một lượt** và ghi điều đó trong báo cáo.

## BÁO CÁO PHA 2

Viết bằng tiếng Việt, ngắn gọn, theo `CLAUDE.md` mục 5. Báo cáo gồm:
1. Bảng từng việc (nhóm A → D): đã làm gì, ở tệp nào, phép cắn và kết quả.
2. H-9, H-11: kết quả thật, và có khớp mong đợi không.
3. Ba lượt `npm test`: số đạt và hỏng từng lượt, tên ca hỏng, thời gian. Một lượt UI e2e. Lint.
4. Số kiểm thử Desktop sau pha 2 (mốc pha 1: 79).
5. `git status --short`: mọi dòng phải nằm trong `Desktop/`. Tệp mới thì kèm `git -c core.ignorecase=true check-ignore -v`.
6. Mốc `%APPDATA%` đầu và cuối.
7. Chỗ nào đã dừng để báo, nếu có, và điều cần quyết.

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG

- API Contract 6.2.0, `endpoint_forms.ipc`:
  - lời gọi từ khung hay origin khác, hoặc tới địa chỉ không khai báo: không có đối tượng trả lời, `invoke` bị từ chối;
  - đối số sai dạng: trả 400 nếu lối vào khai 400, nếu không thì `invoke` bị từ chối.
- `ERR_RESTORE_FAILED.meaning`: `details` có đúng `reason`, `rollback_reason`, `rollback_stage` (`start` | `move_failed_aside` | `move_back`), `previous_database_path`. Không đổi giá trị gửi đi.
- Không lối vào, nhãn hay mã lỗi nào được thêm, bớt hay đổi. Ánh xạ nhãn backend → nhãn Desktop giữ nguyên (H-7 chỉ thêm ca).
- Hạ tầng cắt ngang không ra quyết định nghiệp vụ; Main không gọi workflow lúc chạy.

## CẢNH BÁO — điều KHÔNG được làm trong pha 2

- Không sửa tệp nào ngoài `Desktop/`. Được **chạy** `npm run build` và `npm run e2e` của `UI/`; không sửa `UI/`, không sửa `Backend/`.
- Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`. Không đọc, không ghi `.reviews/`.
- Không thêm lối vào `ipc`, nhãn, mã lỗi hay cờ `--ct-test-*`. Không thêm mã vào sản phẩm chỉ để phục vụ kiểm thử.
- Không bật `nodeIntegration`, không tắt `contextIsolation` hay `sandbox`, không đưa `ipcRenderer` cho renderer.
- Không tắt luật lint, không thêm `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`. Không viết kiểm thử luôn đạt.
- Không tăng thời gian chờ sẵn có, không thêm `retries` hay `skip`. Không đổi bộ công cụ kiểm thử.
- Không chạy `npm ci`, `npm install`, `npm audit fix`, `npm run dist`. Không cài gói nào.
- Không chạy `git commit`, `push`, `reset`, `checkout`, `restore`, `stash`, `clean`, `tag` hay lệnh nào đổi trạng thái kho. Chỉ được đọc.
- ⚠ Không kiểm thử hay lần chạy nào được đụng `%APPDATA%\CommissionTracker` thật. Mọi lần chạy ứng dụng phải kèm `--ct-test-data-dir`, trừ công cụ ở việc 18 sau khi đã xác nhận như việc đó nói.
- Không cài bộ cài, không gỡ bản đã cài, không sửa registry.
- Không tắt, gỡ hay đổi cấu hình phần mềm diệt virus.
- Phép cắn chỉ làm trên bản sao ở `%TEMP%\ct_review_desktop\`, dựng như pha 1, không junction. Xóa đúng thư mục đó khi xong, gọi đích danh. Chỉ xóa thư mục bạn tạo.
- Không dùng sub-agent. Không chạy song song hai lệnh kiểm thử hay hai bản ứng dụng.
- Gặp chỗ dường như phải đổi hợp đồng, phải trả một nhãn không khai báo, hay hành vi thật khác mong đợi ở H-7, H-9, H-11: dừng lại và báo.

## TIÊU CHÍ HOÀN TẤT PHA 2

1. Nhóm A: năm việc xong; năm phép cắn M2, D2, D3, X1, C1 đều bị bắt.
2. Nhóm B: R43-21 có hàng đợi và hai ca tất định, phép cắn bỏ hàng đợi bị bắt 3/3; R43-6, R43-9, R43-11, R43-4 xong, hành vi không đổi ngoài R43-11.
3. Nhóm C: DSK-30 mục 3, 6, 7 xong, phép cắn của mục 7 bị bắt; H-7 có ba ca; H-9 và H-11 có ca, kết quả khớp mong đợi (hoặc đã dừng và báo).
4. Nhóm D: R43-7, R43-12 → R43-16, R43-20 xong.
5. `npm run lint` sạch; `npm test` ba lượt liên tiếp, mọi lượt đã báo; UI e2e 83/83, `UI/evidence` không đổi.
6. Checkpoint: YAML hợp lệ, `UNSOLVED_PROBLEMS: []`, giờ ghi lấy riêng cho từng khối.
7. `git status --short` chỉ có tệp trong `Desktop/`; mốc `%APPDATA%` giống đầu phiên.
