// ===WCA-CHECKPOINT-START===
// workflow: restore_data
// clause: clause_d_desktop
// component: services
// last_updated_by: coding-agent@2026-10-09#1
// last_updated_at: 2026-10-09T20:40:59.3234784+07:00
//
// EXPERIENCES:
//   - id: restore_data-EXP-001
//     content: >
//       Bố cục và ráp nối (phiên 35, pha 1). src/workflows/restore_data/ có bốn
//       tệp: entities.ts (hình dạng, kiểu kết quả của Adapters, RestoreDataConfig),
//       adapters.ts (class RestoreDataAdapters: hai lời gọi http tới backup_data,
//       thư mục và tệp bản ghi, đồng hồ), services.ts (khối này, RestoreDataService
//       với prepare, status, cancel) và routers.ts (ba trình xử lý ipc). Configs
//       là configs/restore_data.json (CLAUDE.md mục 4): chỉ Main đọc
//       (loadRestoreDataConfig), rồi tạo Adapters, Services, Routers và gọi
//       registerRestoreDataRouters SAU khi backend READY và TRƯỚC khi tạo cửa sổ.
//       Main tiêm ipcMain vào Routers, nên routers.ts chỉ import kiểu của
//       electron và kiểm thử nạp nó được không cần Electron. Ba địa chỉ, bảy nhãn và
//       năm mã lỗi trong restore_data.json là giá trị ranh giới của API Contract
//       5.0.0 (clause_d_desktop.restore_data); giá trị nội bộ: safety-backups,
//       restore-pending.json, hậu tố .tmp, hạn chờ http 30000 ms (đo ở
//       restore_data-EVIDENCE: mỗi lời gọi 12-90 ms). Kiểm khung gửi (cửa sổ chính,
//       origin bằng ui_origin) là bản sao riêng trong routers.ts, không dùng chung
//       code với native_dialogs (05-edge-cases.md Bước 5.3: không thỏa điều kiện
//       đưa vào shared/).
//   - id: restore_data-EXP-002
//     content: >
//       Trình tự và nhãn của prepare (f_restore.md mục 2). Routers kiểm định dạng
//       trước: archive_path là chuỗi tuyệt đối không rỗng, không khóa thừa; sai thì
//       trả 400 ERR_VALIDATION như một CÂU TRẢ LỜI (details.errors[0].loc =
//       ['archive_path']) và KHÔNG xóa bản ghi cũ. Từ Services: (1) xóa bản ghi
//       đang chờ; (2) prepare_restore: 404 thành 404 (details.archive_path), 500
//       hay không tới được hay trả sai hình dạng hay hết hạn chờ thành 503
//       ERR_SERVICE_UNAVAILABLE (details.reason), is_valid hoặc is_compatible
//       false thành 409 ERR_INCOMPATIBLE_BACKUP (details.reason lấy từ reason của
//       restore_staging); (3-4) mkdir safety-backups rồi create_backup purpose
//       pre_restore, mọi thất bại (mkdir hay backend 400/500 hay không tới được)
//       thành 424 ERR_STORAGE_IO; (5) ghi restore-pending.json nguyên tử (tệp .tmp,
//       sync, đổi tên), hỏng thành 500 ERR_STORAGE_IO và bản sao lưu an toàn ở
//       bước 4 được giữ; (6) 200 với đúng năm trường. Tệp bản ghi giữ thêm
//       staged_db_path (đường dẫn tệp chờ của backup_data), không bao giờ trả ra.
//       Mọi nhãn khác 200: không có bản ghi. Hai điều plan để mở: (a) bước 1 xóa
//       hỏng (ví dụ có thư mục trùng tên tệp bản ghi) thì trả 500 ERR_STORAGE_IO,
//       không tạo bản sao lưu an toàn; hợp đồng không nói nhãn riêng cho ca này.
//       (b) staging hợp lệ nhưng app_version, created_at hoặc staged_db_path là
//       null được coi là backend trả thiếu và thành 503.
//   - id: restore_data-EXP-003
//     content: >
//       status và cancel. status đọc tệp bản ghi: không có tệp thì pending null,
//       có thì năm trường (cắt staged_db_path), tệp đọc không được (thư mục thay
//       chỗ tệp, JSON hỏng, sai hình dạng) thì 500 ERR_STORAGE_IO; việc dọn bản
//       ghi hỏng để dành cho pha 2. cancel chỉ xóa tệp bản ghi: có tệp (kể cả tệp
//       hỏng) thì canceled true, không có tệp thì false, xóa không được thì 500;
//       không đụng restore-staging (của backup_data) hay bản sao lưu an toàn. Đối
//       số của status, cancel là {} hoặc không có; mọi giá trị khác bị TỪ CHỐI
//       (Promise bị từ chối "call refused (the argument is not an empty object)"),
//       vì hợp đồng không có nhãn 400 cho hai lối vào này. Cũng bị từ chối: khung
//       gửi sai (origin khác, cửa sổ khác); bridge còn từ chối địa chỉ chưa hiện
//       thực như restore:start ("ipc address not implemented"). Lỗi lập trình
//       (ngoại lệ không phải lỗi hệ thống hay lỗi mạng) nổi lên thành lỗi thật,
//       không bị giả làm 500.
//   - id: restore_data-EXP-004
//     content: >
//       Cách dựng các ca hỏng trong kiểm thử (tests/restore_data.spec.ts). 424
//       thật: đặt sẵn một TỆP tên safety-backups ở chỗ thư mục phải có (mkdir báo
//       EEXIST). 500 thật ở bước 5: đặt sẵn một THƯ MỤC tên restore-pending.json.tmp
//       (mở tệp tạm báo EISDIR); bước 1 lúc đó vẫn qua, và việc có thêm đúng một
//       bản sao lưu an toàn chứng tỏ lỗi xảy ra ở bước 5. Một thư mục tên
//       restore-pending.json thì làm bước 1 hỏng (EPERM khi xóa), không có bản sao
//       lưu an toàn nào. 503 và 424 do backend: tests/fixtures/fake_backend_restore.py
//       (chạy qua cờ --ct-test-backend-script, chọn bằng CT_FAKE_RESTORE:
//       prepare500, preparebad, create500). 503 do không tới được và do hết hạn
//       chờ: kiểm Adapters trực tiếp với cổng đóng và với một máy chủ nhận kết
//       nối mà không trả lời (hạn chờ rút còn 300 ms trong bản sao cấu hình của ca
//       đó). Ca 409 bản mới hơn: lấy bản sao lưu thật rồi ghi lại manifest.json với
//       app_version 9.9.9 bằng zipfile của Python (interpreter của Backend).
//   - id: restore_data-EXP-005
//     content: >
//       Cho pha 2 (phiên 36) và phiên giao diện. (1) Mỗi lần prepare thành công
//       tạo thêm MỘT bản sao lưu an toàn trong safety-backups và không dọn bản cũ
//       (Project Owner bấm lặp trên trang thử, thấy bảy tệp); đúng đặc tả, nhưng
//       Orchestrator nên cân nhắc việc dọn ở pha 2. (2) Tên tệp bản sao lưu an
//       toàn dùng giờ máy theo giây và hậu tố -2, -3 khi trùng (việc của
//       backup_data). (3) Bản ghi chỉ được tin khi tệp chờ còn: backup_data xóa tệp
//       chờ mỗi lần prepare_restore đi qua bước 404, kể cả lần gọi từ nơi khác;
//       pha 2 phải kiểm staged_db_path còn tồn tại (f_restore.md mục 3, bước 2).
//       (4) Pha 1 không chạm data.db, data.db.lock hay tệp chờ: kiểm thử so inode
//       của data.db trước sau và GET /clients vẫn có khách thêm sau lúc sao lưu.
//   - id: restore_data-EXP-006
//     content: >
//       Pha 2, apply_pending_restore (phiên 36; f_restore.md mục 3). Services.applyPending
//       (RestoreDataService nhận thêm hàm log do Main tiêm, mặc định không làm gì): (1) không có
//       tệp bản ghi thì outcome none; (2) bản ghi đọc không được hoặc staged_db_path không còn là
//       tệp thì xóa bản ghi và discarded (xóa không được thì VẪN discarded, reason ghi thêm "the
//       pending record could not be removed"); (3) dừng backend qua backend_controller; (4) tạo
//       restore-previous, đổi tên data.db thành data-<YYYYMMDD-HHmmss>.db ở đó, trùng tên thì thêm
//       -2, -3 (Adapters.freePath, không ghi đè), chỉ rename; (5) đổi tên tệp chờ vào db_file_path;
//       (6) khởi động lại, chờ READY; (7) xóa bản ghi, restored. Hỏng ở 3-6: dừng backend (nếu còn
//       chạy), tệp đã chuyển vào được đổi tên sang data-<giờ>-failed.db trong restore-previous (không
//       xóa), tệp bước 4 đổi tên về db_file_path, khởi động lại, xóa bản ghi, rolled_back kèm
//       reason là lý do hỏng ĐẦU TIÊN. Hoàn tác cũng hỏng: xóa bản ghi rồi trả 500 ERR_RESTORE_FAILED
//       (details.reason, details.rollback_reason); Routers ném InProcessCallError mang nhãn và
//       error_body (endpoint_forms.in_process). Ba điều plan để mở, đã chọn: (a) hỏng ở bước 4 thì
//       chưa có tệp nào được dời, hoàn tác chỉ khởi động lại backend; (b) restored mà xóa bản ghi
//       không được: ghi log, vẫn trả restored (lần sau tệp chờ đã mất nên thành discarded, không hại
//       dữ liệu); (c) tên tệp hỏng là data-<giờ>-failed.db. Không chạm data.db.lock. Log mỗi bước
//       một dòng, "restore_data: apply: ..." rồi dòng cuối "restore_data: apply -> <outcome>".
//   - id: restore_data-EXP-007
//     content: >
//       backend_controller (tài nguyên from: main). Entities mô tả giao diện BackendController
//       {stop(), start()} (start trả ready hoặc failed kèm reason); Adapters nhận nó từ Main
//       (stopBackend, startBackend), Services không bao giờ chạm tiến trình. Main hiện thực nó bằng
//       BackendProcess.stop() và start(port cũ): MỘT lần khởi động, không thử lại; quá hạn thì kết
//       thúc tiến trình rồi trả failed. Dừng qua controller không gây FATAL vì BackendProcess.stop()
//       đặt stopping trước khi tiến trình thoát, nên onUnexpectedExit không chạy (phép cắn d của
//       EVIDENCE: dừng bằng kill không đánh dấu thì ứng dụng tự đóng bằng đường fatal). Controller
//       không có lối vào riêng (không ipc, không móc kiểm thử): A2, A4, A5 kiểm nó qua ứng dụng thật.
//   - id: restore_data-EXP-008
//     content: >
//       Cách dựng ca hỏng của pha 2 (tests/restore_apply.spec.ts) và phép đo chọn cách dựng. A4
//       (rolled_back): sau lần chuẩn bị, ghi đè tệp chờ restore-staging\data.db bằng một tệp văn bản.
//       Đo trước bằng script tạm trên Backend.py thật: tệp văn bản (36 byte) và tệp 4096 byte 0 đều làm
//       backend thoát mã 2 sau khoảng 1,8-2,0 s với "cannot open database ...: file is not a database",
//       không in READY; một tệp RỖNG thì backend vẫn lên (READY) vì tự tạo cấu trúc, nên không dùng được.
//       A5 (hoàn tác cũng hỏng): tests/fixtures/fake_backend_swap.py đếm số lần khởi động trong
//       fake-start-count.txt cạnh CT_DB_FILE_PATH, lần 1 READY, từ lần 2 thoát mã 2 trước READY; bản
//       ghi và hai tệp (OLD DATABASE, STAGED DATABASE) do test tự dựng, không có backend thật nào dính.
//   - id: restore_data-EXP-009
//     content: >
//       Kết quả đo trước khi viết (việc 2 của plan phiên 36), máy có AVG và ReasonLabs bật.
//       Cùng cổng: backend thật, thư mục dữ liệu tạm, cổng cố định, 20 vòng dừng (đóng stdin) rồi khởi
//       động lại ngay trên cùng cổng: 0 lần bị từ chối, READY 835-1045 ms, dừng 287-351 ms, mọi lần
//       thoát mã 0; thêm 20 vòng chỉ dừng rồi khởi động ngay: 0 hỏng (READY 772-959 ms). Đổi tên
//       data.db sang tên khác rồi đổi lại ngay sau khi tiến trình thoát, 20 vòng: 0 lần EBUSY hay
//       EPERM, mỗi lần 1-8 ms. Vì vậy không có vòng thử lại cho cổng hay đổi tên, và không cần sửa hợp
//       đồng. Hộp thoại thông báo của Electron không có cửa sổ cha, gọi sau whenReady và trước mọi
//       BrowserWindow: hiện được, đủ dấu tiếng Việt, có mặt trên thanh tác vụ, KHÔNG tự lên trên cùng
//       (Project Owner: "không tự nhiên chiếm cửa sổ đang hoạt động").
//
//   - id: restore_data-EXP-010
//     content: >
//       DSK-26: bước 8 của pha 2 có ba việc, mỗi việc hỏng cho một kết quả khác (phiên 38, f_restore.md mục 3
//       bước 8a-8c, 9a-9c). undo() trả null hoặc {stage, reason}: 8a (đổi tên tệp vừa chuyển vào sang -failed)
//       hỏng thì stage move_failed_aside, 8b (đưa tệp cũ về db_file_path) hỏng thì move_back, 8c (khởi động)
//       hỏng thì start. Mỗi lần đổi tên chỉ thử một lần (không vòng thử lại: phiên 36 đo 0/20 hỏng). Khi hoàn
//       tác cũng hỏng, applyPending xóa bản ghi rồi trả 500 ERR_RESTORE_FAILED; details giữ reason và
//       rollback_reason như cũ, thêm rollback_stage và previous_database_path: ở stage start là db_file_path (tệp
//       cũ đã về chỗ cũ), ở hai stage kia là đường dẫn tệp cũ trong restore-previous (moves.asidePath). Hợp đồng
//       không quy định hình dạng details; RollbackStage nằm ở entities.ts. Main chọn câu theo rollback_stage
//       (main-EXP-037). Không làm gì để chặn lần mở sau tạo cơ sở dữ liệu rỗng ở 9c (V1 chấp nhận, câu thông
//       báo là biện pháp duy nhất). Cách dựng ba ca ở tests/restore_undo.spec.ts: lớp ScriptedAdapters kế thừa
//       RestoreDataAdapters và làm moveFile hỏng ở lần gọi thứ N (lần 3 là 8a, lần 4 là 8b), controller không bao
//       giờ khởi động được, tệp thật trong thư mục tạm; lần 1 và 2 là hai lần đổi tên của bước 4 và 5.
// UNSOLVED_PROBLEMS: []
//
// EVIDENCE:
//   - claim: >
//       Phép đo trước khi viết (việc 2): vị trí tệp chờ, tệp hỏng có xóa tệp chờ
//       cũ không, thời gian các lời gọi.
//     how: >
//       Script tạm ngoài dự án (scratchpad), Node: chạy Backend.py thật
//       (CT_PORT, CT_DB_FILE_PATH trong thư mục tạm, CT_APP_VERSION 0.1.0), POST
//       /clients, POST /backups (manual) vào thư mục tạm, rồi POST
//       /backups/restore-preparations với tệp đó, với một tệp văn bản, với tệp
//       không tồn tại; sau mỗi lần liệt kê thư mục chứa data.db; thêm POST /backups
//       purpose pre_restore vào <thư mục db>/safety-backups và vào một tệp.
//     result: >
//       create 201 sau 88 ms; prepare hợp lệ 200 sau 39 ms, staged_db_path =
//       <thư mục db>\restore-staging\data.db (thư mục có data.db, data.db.lock,
//       restore-staging\data.db); prepare tệp văn bản 200 sau 16 ms với is_valid
//       false, reason "the archive cannot be read as a zip: BadZipFile ...",
//       staged_db_path null, và restore-staging\data.db BIẾN MẤT (đúng
//       backup_data-EXP-003); prepare tệp không tồn tại 404 sau 12 ms, thư mục
//       restore-staging còn nguyên; create pre_restore vào safety-backups 201
//       sau 39 ms (tên commission-tracker-pre_restore-<giờ>.ctbackup); create vào
//       một tệp 400 ERR_VALIDATION.
//     recorded_at: 2026-10-08T09:26:28+07:00
//   - claim: >
//       Mười sáu ca R1-R15 (R1 gồm R1a, R1b) của tests/restore_data.spec.ts đạt: ba
//       lối vào với backend thật và với backend giả, dữ liệu đang dùng không đổi.
//     how: >
//       cd Desktop; npm test (hoặc riêng npx playwright test
//       tests/restore_data.spec.ts). R2 (200, năm trường, tệp bản ghi sáu trường,
//       bản sao lưu an toàn qua được prepare_restore của backend, inode data.db
//       không đổi, GET /clients vẫn có khách thêm sau lúc sao lưu), R3 (status,
//       cancel true/false, tệp chờ và bản sao lưu an toàn còn), R4 (409: tệp văn
//       bản đuôi .ctbackup và bản app_version 9.9.9), R5 (yêu cầu mới thay yêu cầu
//       cũ; chuẩn bị hỏng không còn bản ghi), R6 (404 tệp và thư mục; 400 cho 10 đối
//       số sai, bản ghi cũ còn), R7 (424), R8 (500 ở bước 5), R9 (tệp bản ghi
//       không đọc được: 500 cho status, prepare; cancel), R10 (khung data: và cửa
//       sổ thứ hai bị từ chối), R11 (restore:start), R12 (bốn nút của trang thử), R13
//       503 backend giả trả 500, R14 503 sai hình dạng, R15 424 backend giả trả 500
//       cho create_backup.
//     result: >
//       restore_data.spec.ts: 16 passed (26 s) lúc viết; trong npm test đủ bộ 62
//       passed ở cả ba lượt liên tiếp (09:37:41-09:42:21, 09:42:21-09:46:58,
//       09:46:58-09:51:37; 4,6; 4,5; 4,6 phút), sau bộ không còn python.exe của
//       dự án. Chi tiết số liệu: R2 prepared_at lệch dưới 60 s so với đồng hồ test;
//       R8 có thêm đúng một bản sao lưu an toàn; R13 không có lời gọi POST /backups
//       nào tới backend giả và không tạo thư mục safety-backups; R15 tạo thư mục
//       nhưng không có tệp bản ghi.
//     recorded_at: 2026-10-08T14:59:36.1924815+07:00
//   - claim: >
//       Ba phép cắn của plan: bỏ bước xóa bản ghi cũ, không dừng khi
//       is_compatible false, status trả cả staged_db_path.
//     how: >
//       Sửa tạm services.ts bằng công cụ soạn tệp, npm run build, npx playwright
//       test tests/restore_data.spec.ts, khôi phục (grep BITE trong src và tests
//       không còn kết quả). (a) thay lời gọi deletePendingRecord ở bước 1 bằng một
//       giá trị cố định "absent"; (b) đổi điều kiện !is_valid || !is_compatible
//       thành !is_valid; (c) status trả read.record thay vì publicRecord.
//     result: >
//       (a) R5 hỏng ở "expect(fs.existsSync(pendingFile)).toBe(false)" (Received:
//       true: bản ghi của b còn sau chuẩn bị hỏng), 1 failed, 7 did not run, 8
//       passed. (b) R4 hỏng ở ca bản mới hơn (Expected 409, Received 503, vì tệp
//       chờ null bị bắt bởi nhánh thiếu dữ liệu), 1 failed, 8 did not run, 7
//       passed. (c) R3 hỏng ở so sánh sâu (thừa một khóa staged_db_path), 1 failed,
//       9 did not run, 6 passed. Không phép nào bị bộ phân loại quyền chặn. Khôi
//       phục thì 16 passed.
//     recorded_at: 2026-10-08T14:59:36.1924815+07:00
//   - claim: >
//       Bản đóng gói có workflow và Configs của nó, và chạy được đường chuẩn bị
//       thật: ca P10.
//     how: >
//       cd Desktop; xóa packaging\stage và release; ELECTRON_BUILDER_CACHE trỏ vào
//       %TEMP%\ct-eb-cache; npm run dist; liệt kê app.asar bằng
//       require('@electron/asar').listPackage; npm run test:packaged.
//     result: >
//       dist thoát mã 0 sau khoảng 2 phút (09:51:50-09:53:54, không gặp EXDEV). app.asar
//       có configs\desktop.json, configs\restore_data.json, dist\main.js, preload.js,
//       cross_cutting\native_dialogs\{native_dialogs,request_checks}.js,
//       cross_cutting\reminder_ticker\{reminder_ticker,toast_text}.js,
//       workflows\restore_data\{adapters,entities,routers,services}.js,
//       package.json. test:packaged: 10 passed (1,2 phút): P1-P9 và P10 (restore:status
//       trả { pending: null }; open_file đúng với hộp thoại thay thế, chọn và hủy;
//       backup thật do backend đóng gói tạo rồi prepare 200, status có đúng bản ghi
//       đó, cancel true, status null; đóng sạch mã 0).
//     recorded_at: 2026-10-08T14:59:36.1924815+07:00
//   - claim: >
//       Project Owner chạy trang thử với hộp thoại thật (việc 10), 2026-10-08.
//     how: >
//       cd Desktop; npm run probe; tệp .ctbackup do backend thật tạo trong thư mục
//       tạm (C:\Users\A\AppData\Local\Temp\ct-probe-archive\commission-tracker-manual-20261008-104738.ctbackup,
//       một khách); Project Owner bấm: Chọn tệp sao lưu, Chuẩn bị khôi phục, Xem trạng
//       thái, Hủy khôi phục, rồi dán các ô trả lời.
//     result: >
//       Hộp thoại: tiêu đề "Chọn tệp" kèm icon ứng dụng, có bộ lọc loại tệp (lời Project
//       Owner; chưa chép nguyên chữ của bộ lọc). Chọn tệp: {"status":200,"body":
//       {"canceled":false,"path":"...ct-probe-archive\\commission-tracker-manual-20261008-104738.ctbackup"}}.
//       Chuẩn bị: 200, năm trường (archive_app_version "0.1.0", archive_created_at
//       "2026-10-08T10:47:38+07:00", safety_backup_path trong ...\CommissionTracker\safety-backups\,
//       prepared_at "2026-10-08T14:57:51+07:00"). Xem trạng thái: 200 với "pending" có đúng
//       năm trường đó, không staged_db_path. Hủy: {"status":200,"body":{"canceled":true}}.
//       Lượt thứ nhất dán ra pending null và canceled false vì Project Owner bấm xen kẽ
//       nhiều lần (log Main có hàng chục lời gọi, mọi lời đều 200; lần bấm cuối là cancel,
//       status, cancel); không phải lỗi. Lượt có chuỗi sạch: bước "Xem trạng thái lần nữa
//       sau khi hủy" chưa được dán, nhưng ca R3 và P10 kiểm đúng điều đó. Một lần chạy
//       (14:36) cửa sổ thoát với mã 3221225477 (0xC0000005) sau ba lần
//       open-file trả "canceled"; xem NOTES.
//     recorded_at: 2026-10-08T14:59:36.1924815+07:00
//   - claim: >
//       Phiên 36, đo trước khi viết: cùng cổng x20, đổi tên data.db ngay sau khi thoát x20 và hộp
//       thoại không có cửa sổ cha (restore_data-EXP-009).
//     how: >
//       Script tạm ngoài dự án (scratchpad): measure_port_rename.cjs chạy Backend.py thật
//       (E:\CommissionTracker\Backend\env\Scripts\python.exe) với CT_DB_FILE_PATH trong thư mục tạm
//       và một cổng cố định; phần 1: 20 vòng (khởi động, chờ READY, đóng stdin, chờ thoát, đổi tên
//       data.db sang data.db.moved rồi về, khởi động lại ngay trên cùng cổng); phần 2: 20 vòng không
//       đổi tên. dialog_probe_main.cjs (electron.exe, Start-Process): dialog.showMessageBox không cửa
//       sổ cha sau app.whenReady(), trước mọi BrowserWindow; Project Owner nhìn.
//     result: >
//       Phần 1: 0 lần khởi động hỏng, 0 lần đổi tên hỏng, 0 lần thoát khác mã 0; READY 835-1045 ms,
//       dừng 287-351 ms, đổi tên đi và về 1-8 ms. Phần 2: 0 hỏng, READY 772-959 ms, dừng 276-323 ms.
//       Hộp thoại: có (windows before dialog: 0), đủ dấu tiếng Việt, hiện trên thanh tác vụ, không
//       tự lên trên cùng. Hộp thoại không được bấm nên script tự thoát sau 180 s (mã 3); lần đo này
//       không đo biểu tượng riêng (xem ảnh thật ở khối Project Owner). Lần đo hộp thoại chạy ngay sau
//       hai phần trên, không ghi giờ riêng.
//     recorded_at: 2026-10-08T16:05:25.9941781+07:00
//   - claim: >
//       Bảy ca mới của tests/restore_apply.spec.ts (A1, A2, A3a, A3b, A4, A5, A6) đạt, và bốn phép
//       cắn bắt được lỗi.
//     how: >
//       cd Desktop; npm run build; npx playwright test tests/restore_apply.spec.ts. Ca chạy ứng dụng
//       thật dùng Backend.py thật, trang thử, --ct-test-data-dir tạm và --ct-test-no-dialog (A5 dùng
//       fake_backend_swap.py và spawnMain). Phép cắn, mỗi phép sửa tạm một dòng, npm run build, chạy ca
//       liên quan, rồi khôi phục (grep BITE trong src và tests chỉ còn hai dòng chữ của khối checkpoint
//       cũ): (a) services.ts: bỏ lời gọi this.undo; (b) services.ts: không xóa bản ghi sau khi hoàn tác
//       thành công; (c) main.ts: chạy restore_trigger SAU khi cửa sổ nạp xong; (d) main.ts:
//       backendController.stop kết thúc tiến trình mà không đánh dấu dừng (child.kill, chờ 3 s).
//     result: >
//       7 passed (1,3 phút) lúc viết; không phép cắn nào bị bộ phân loại quyền chặn. A1: log
//       "restore_data: apply -> none" và "restore_trigger: apply_pending_restore -> none", không có
//       "restore dialog text", dòng restore_trigger đứng trước "opening the window", chỉ một backend.
//       A2: GET /clients ra đúng Khach A, Khach B (không có C); "restore dialog text" có archive_path và
//       safety_backup_path; không còn restore-pending.json; restore-previous có một tệp
//       data-<YYYYMMDD-HHmmss>.db, mở bằng sqlite3 chỉ đọc thấy A, B, C; bản sao lưu an toàn còn;
//       hai dòng "backend READY on port P" cùng P, hai backend, dòng "backend_controller: starting the
//       backend again on port P", backend đầu thoát mã 0, không FATAL, không "stopped unexpectedly";
//       restore:status ra pending null. A3a: discarded, reason "the staged database file is gone",
//       dữ liệu A, B, C không đổi, chỉ một backend; A3b: JSON hỏng, discarded, dữ liệu X không đổi. A4:
//       rolled_back, reason "the backend did not start on the restored database (it exited before READY
//       (exit code 2))", dữ liệu A, B, C còn, restore-previous có đúng một tệp data-...-failed.db chứa
//       nguyên văn tệp văn bản, ba backend, không FATAL; lần mở thứ ba "none", không hộp thoại. A5: FATAL
//       "Applying the pending restore failed: ERR_RESTORE_FAILED (500)", dòng "error dialog text" có
//       "Dữ liệu trước đó đã được đưa về chỗ cũ", mã thoát 1, không "opening the window", data.db là
//       "OLD DATABASE", tệp -failed là "STAGED DATABASE", không còn restore-pending.json, ba lần
//       khởi động, không python.exe của fake nào còn. A6: restored rồi none, dữ liệu A, B giữ nguyên,
//       restore-previous vẫn một tệp. Phép cắn: (a) A4 hỏng "TypeError: fetch failed ... ECONNREFUSED"
//       (backend không được dựng lại); (b) A4 hỏng ở "expect(fs.existsSync(pendingFile)).toBe(false)"
//       (Received: true); (c) A1 hỏng ở thứ tự: "Expected: > 927, Received: 572"; (d) A2 hỏng
//       "electronApplication.firstWindow: Target page, context or browser has been closed" (ứng dụng tự
//       đóng bằng đường fatal). Khôi phục cả bốn thì 7 passed.
//     recorded_at: 2026-10-08T19:09:25.3415976+07:00
//   - claim: >
//       Chạy toàn bộ phiên 36 với AVG và ReasonLabs bật: lint, npm test ba lượt liên tiếp, dist từ
//       trạng thái sạch, test:packaged, UI npm run e2e, UI/evidence không đổi.
//     how: >
//       cd Desktop; npm run lint; npm test (ba lần liên tiếp); xóa packaging\stage và release;
//       ELECTRON_BUILDER_CACHE trỏ vào %TEMP%\ct-eb-cache; npm run dist; liệt kê app.asar bằng
//       require('@electron/asar').listPackage; npm run test:packaged. cd UI; npm run build; npm run e2e
//       (CT_WALKTHROUGH_RUNNER không đặt; một lượt); git status --short evidence. Môi trường: Node
//       v24.14.1, npm 11.11.0, Electron v44.4.5, Python 3.13.12; Reason Cybersecurity 266240 và AVG
//       Antivirus 266240 (bật), Windows Defender 393472 (tắt); AVGSvc, rsEngineSvc, bốn rsAppUI chạy.
//     result: >
//       Mốc đầu phiên (15:58:49-16:03:43): npm ci (lần đầu hỏng EPERM vì trang thử của Project Owner còn
//       mở giữ node_modules\electron\dist\d3dcompiler_47.dll; chạy lại sau khi anh đóng thì đạt), lint
//       sạch, npm test 62 passed (4,7 phút), UI build đạt, git status trống. Cuối phiên: lint sạch,
//       không ngoại lệ eslint mới. npm test: 69 passed ở cả ba lượt (16:23:41-16:29:45, 5,9 phút;
//       16:29:59-16:35:56; 16:35:56-16:41:54), sau bộ không còn python.exe của dự án (62 ca cũ và 7
//       ca của restore_apply). npm run dist: thoát mã 0 (16:42:10-16:44:05). app.asar có
//       configs\desktop.json, configs\restore_data.json, dist\main.js, preload.js,
//       cross_cutting\native_dialogs\{native_dialogs,request_checks}.js,
//       cross_cutting\reminder_ticker\{reminder_ticker,toast_text}.js,
//       cross_cutting\restore_trigger\restore_trigger.js,
//       workflows\restore_data\{adapters,entities,routers,services}.js, package.json. test:packaged: 11
//       passed (16:44:25-16:45:50, 1,4 phút; P1-P10 và P11: chuẩn bị ở lần chạy thứ nhất, lần chạy thứ
//       hai cùng thư mục dữ liệu có đúng Khach A, một tệp data-*.db trong restore-previous, không còn
//       bản ghi, restore:status null, không FATAL). UI npm run e2e: 75 passed (5,4 phút,
//       16:45:57-16:51:33); git status --short evidence trống. Các số là của mã nguồn trước lần sửa cuối
//       của các khối checkpoint (chỉ đổi chú thích).
//     recorded_at: 2026-10-08T19:09:25.3415976+07:00
//   - claim: >
//       Project Owner chạy khứ hồi thật với hộp thoại thật (việc 9), 2026-10-08, thư mục dữ liệu cố
//       định C:\ct-owner-restore, tệp sao lưu trong C:\ct-owner-backup.
//     how: >
//       (1) UI: npm run walkthrough:app (mẫu D1), trang "Sao lưu", thư mục C:\ct-owner-backup, tạo bản
//       sao lưu commission-tracker-manual-20261008-185551.ctbackup. (2) npm --prefix
//       E:/CommissionTracker/Desktop run probe -- --data-dir C:/ct-owner-restore: "Chọn tệp sao lưu",
//       "Chuẩn bị khôi phục", đóng. (3) chạy lại đúng lệnh đó. (4) đọc hộp thoại, bấm "Đóng", đọc ô GET
//       /clients. Thêm lần chạy thứ ba (4.1) và đọc thư mục dữ liệu (4.2).
//     result: >
//       Lần 1: GET /clients [], dialog:open-file {"status":200,"body":{"canceled":false,"path":
//       "C:\\ct-owner-backup\\commission-tracker-manual-20261008-185551.ctbackup"}}, restore:prepare 200
//       với archive_created_at 2026-10-08T18:55:51+07:00, safety_backup_path
//       C:\ct-owner-restore\CommissionTracker\safety-backups\commission-tracker-pre_restore-20261008-190331.ctbackup,
//       prepared_at 2026-10-08T19:03:31+07:00; thoát mã 0 ("probe: app exited with code 0"). Lần 2:
//       hộp thoại "Khôi phục dữ liệu" (ảnh của Project Owner), một nút "Đóng", biểu tượng thông tin (chữ
//       "i" xanh) của Windows ở tiêu đề và nội dung, chữ nguyên văn: "Đã khôi phục dữ liệu từ bản sao
//       lưu:" / "C:\ct-owner-backup\commission-tracker-manual-20261008-185551.ctbackup" / dòng trống /
//       "Bản sao lưu an toàn của dữ liệu trước đó:" / "C:\ct-owner-restore\Commissi...\commission-tracker-pre_restore-20261008-190331.ctbackup"
//       (Windows tự rút gọn đường dẫn dài ở giữa bằng "..."; nội dung do Main gửi là đường dẫn đủ,
//       như dòng "restore dialog text" của kiểm thử). Sau "Đóng", GET /clients có đúng tám khách của
//       mẫu D1: An, Bảo, Dung, Hà (is_archived true), Nguyễn Thu Hà, Zoe, Ánh, Đức, cùng
//       updated_at 2026-10-08T18:53:06+07:00 (thời điểm tạo mẫu, không phải lúc lần chạy thứ nhất của
//       trang thử). Lần 3: không hộp thoại, dữ liệu giữ nguyên. Thư mục: restore-previous\
//       data-20261008-190504.db, safety-backups\commission-tracker-pre_restore-20261008-190331.ctbackup,
//       không còn restore-pending.json. Không được báo: hộp thoại có lên trên cùng hay không và biểu
//       tượng của thanh tác vụ (lần đo ở việc 2: không lên trên cùng); ô "Xem trạng thái" sau khi áp
//       dụng (A2 và P11 kiểm: pending null). Project Owner không báo lần thoát bất thường nào.
//     recorded_at: 2026-10-08T19:09:25.3415976+07:00
//   - claim: >
//       Không test hay lần chạy nào của phiên đụng thư mục dữ liệu thật
//       %APPDATA%\CommissionTracker.
//     how: >
//       PowerShell (script tạm ngoài dự án): liệt kê mọi tệp của %APPDATA%\CommissionTracker và
//       %APPDATA%\Commission Tracker với kích thước, LastWriteTimeUtc và (cho CommissionTracker) SHA-256,
//       chụp lúc 2026-10-08T15:53:24.3619521+07:00 (đầu phiên) và 2026-10-08T19:09:25.3415976+07:00 (cuối
//       phiên, sau npm test ba lượt, dist, test:packaged, UI e2e và các lần Project Owner chạy trang thử
//       với --ct-test-data-dir), so từng dòng bằng Compare-Object.
//     result: >
//       Cả hai thư mục: 69 dòng ở mỗi mốc, 0 dòng khác nhau (data.db, data.db.lock không đổi).
//     recorded_at: 2026-10-08T19:09:25.3415976+07:00
//   - claim: >
//       DSK-26 (phiên 38): ba cách hoàn tác hỏng cho ba kết quả khác nhau, mỗi cách mang rollback_stage và đường
//       dẫn tệp cũ trong details của ERR_RESTORE_FAILED; ba câu của Main đúng; ba phép cắn.
//     how: >
//       cd Desktop; npm run build; npx playwright test tests/restore_undo.spec.ts tests/restore_apply.spec.ts -g
//       "U[1-6]|A5". U1-U3: RestoreDataService với Adapters thật trên thư mục tạm, moveFile hỏng ở lần gọi chọn
//       trước (lần 3 là 8a, lần 4 là 8b), backend giả không bao giờ lên lại, gọi qua Routers
//       (registerRestoreDataRouters, applyPendingRestore) như Main. U4-U6: buildErrorDialog với desktop.json thật.
//       A5 là trường hợp 9a qua ứng dụng thật. Phép cắn: (a) tạm cho undo() luôn trả stage start; (b) tạm bỏ
//       {previous_database_path} khỏi câu move_back trong desktop.json; (c) tạm ném lỗi ở 8a trước removeRecord;
//       mỗi phép chạy tests/restore_undo.spec.ts rồi khôi phục tệp từ bản chép.
//     result: >
//       7 passed (A5, U1-U6). U1: 500 ERR_RESTORE_FAILED, rollback_stage start, previous_database_path là
//       db_file_path, data.db là OLD DATABASE, một tệp -failed chứa STAGED DATABASE, bản ghi đã xóa, hai lần
//       khởi động. U2: stage move_failed_aside, previous_database_path là tệp trong restore-previous (OLD
//       DATABASE), db_file_path vẫn là STAGED DATABASE, một lần khởi động, bản ghi đã xóa, câu 9b có đường dẫn đó.
//       U3: stage move_back, db_file_path không tồn tại, restore-previous có tệp cũ và tệp -failed, câu 9c có cả
//       hai đường dẫn, "Đừng nhập dữ liệu mới" và "dữ liệu trống". Phép cắn (a): U2 và U3 hỏng (Expected
//       "move_failed_aside"); (b): U3, U4, U6 hỏng; (c): U2 hỏng (bản ghi còn); sau khôi phục 6 passed. Ba
//       lượt có tải và một lượt không tải của npm test đều chạy các ca này (xem EVIDENCE của Main).
//     recorded_at: 2026-10-09T20:40:59.3234784+07:00
//
// NOTES:
//   - content: >
//       DSK-23 (0xC0000005 trên trang thử): phiên 36 KHÔNG lặp lại. Số lần mở hộp thoại thật: một lần
//       hộp thoại chọn thư mục (trang "Sao lưu"), một lần hộp thoại chọn tệp, và hai lần hộp thoại
//       thông báo (một lần đo ở việc 2, một lần "Khôi phục dữ liệu" của Project Owner); lần chạy thứ nhất của anh thoát mã 0;
//       anh không báo lần thoát bất thường nào. Chưa kiểm Windows Event Viewer vì không có lần sập nào
//       để đối chiếu.
//       Phiên 38 (2026-10-09): cũng KHÔNG lặp lại. Mọi lần chạy của phiên (npm test bốn lượt, test:packaged, UI
//       e2e) không có lần nào thoát mã 3221225477; các ca của phiên thay hộp thoại bằng mã giả hoặc dùng cờ
//       không hộp thoại, nên không có lần mở hộp thoại thật nào. DSK-25 đã đóng (audit phiên 37). DSK-23 chỉ còn
//       theo dõi; Orchestrator đóng nếu không lặp lại tới hết phiên này.
//     written_at: 2026-10-08
//   - content: >
//       Cho Orchestrator và phiên giao diện. (1) Hộp thoại kết quả của restore_trigger không có cửa sổ
//       cha và KHÔNG tự lên trên cùng (đo ở việc 2); trong lúc nó mở, Main chờ và chưa có cửa sổ ứng
//       dụng, nên người dùng không nhìn thấy hộp thoại có thể tưởng ứng dụng "đứng". Làm đúng plan; nếu
//       muốn khác (ví dụ một cửa sổ ẩn làm cha, hoặc hiện sau khi cửa sổ mở) thì cần quyết định của
//       Orchestrator. (2) Windows rút gọn đường dẫn dài ở giữa hộp thoại bằng dấu ba chấm; đường dẫn đủ
//       nằm trong dòng log "restore dialog text". (3) Mỗi lần restore:prepare tạo một bản sao lưu an
//       toàn, mỗi lần áp dụng thêm một tệp data-*.db trong restore-previous: không có chỗ nào dọn
//       (DSK-24, V2).
//     written_at: 2026-10-08
// ===WCA-CHECKPOINT-END===
/**
 * Services of restore_data, phase 1 ("prepare"): the only place a decision is
 * taken. The order of the steps, and the label of every answer, follow
 * .design/f_restore.md section 2 and api_contract.yaml
 * clause_d_desktop.restore_data (API Contract 5.0.0).
 *
 * Phase 2 (apply the pending restore at the next start, f_restore.md section 3)
 * is applyPending below; it is the in_process entry apply_pending_restore, called
 * by restore_trigger.
 */

import type { RestoreDataAdapters } from './adapters'
import type {
  ApplyReply,
  PendingRestoreRecord,
  RestoreCancellation,
  RestoreDataConfig,
  RestoreOutcome,
  RestoreReply,
  RestoreStatus,
  RollbackStage,
  StoredPendingRecord,
} from './entities'

/** What apply remembers about the files it has moved, so it can put them back. */
interface AppliedMoves {
  /** Name stem (data-<time>) of this attempt. */
  stem: string
  /** Where the live database was moved aside to; null before that step. */
  asidePath: string | null
  /** True once the staged file has been moved into db_file_path. */
  stagedMovedIn: boolean
}

/** Why putting the previous database back failed, and at which job. */
interface UndoFailure {
  stage: RollbackStage
  reason: string
}

/** The five fields of pending_restore_record: the stored record without
 * staged_db_path (internal, never returned). */
function publicRecord(stored: StoredPendingRecord): PendingRestoreRecord {
  return {
    archive_path: stored.archive_path,
    archive_app_version: stored.archive_app_version,
    archive_created_at: stored.archive_created_at,
    safety_backup_path: stored.safety_backup_path,
    prepared_at: stored.prepared_at,
  }
}

export class RestoreDataService {
  constructor(
    private readonly adapters: RestoreDataAdapters,
    private readonly config: RestoreDataConfig,
    private readonly log: (message: string) => void = () => undefined,
  ) {}

  private error(label: number, code: string, message: string, details: Record<string, unknown> | null): RestoreReply {
    return { status: label, body: { code, message, details } }
  }

  private storageError(label: number, message: string, reason: string): RestoreReply {
    return this.error(label, this.config.error_codes.storage_io, message, { reason })
  }

  private unavailable(reason: string): RestoreReply {
    return this.error(this.config.labels.service_unavailable, this.config.error_codes.service_unavailable, 'The backend could not prepare the archive.', { reason })
  }

  /** restore:prepare. Every answer other than the success one means that
   * nothing is pending. */
  async prepare(archivePath: string): Promise<RestoreReply> {
    const { labels, error_codes: codes } = this.config

    // 1. A new request replaces every earlier one, and a failed request leaves
    //    nothing pending: backup_data.prepare_restore removes its staging file
    //    each time it gets past its own existence check, so an older record
    //    could no longer be trusted.
    const cleared = await this.adapters.deletePendingRecord()
    if (cleared.kind === 'failed') return this.storageError(labels.storage_io, 'The earlier pending restore could not be removed.', cleared.reason)

    // 2. backup_data checks the archive and stages its database.
    const prepared = await this.adapters.prepareRestore(archivePath)
    if (prepared.kind === 'not_found') {
      return this.error(labels.not_found, codes.not_found, 'Archive file not found.', { archive_path: archivePath })
    }
    if (prepared.kind === 'failed') return this.unavailable(prepared.reason)
    const staging = prepared.staging
    if (!staging.is_valid || !staging.is_compatible) {
      return this.error(labels.incompatible_backup, codes.incompatible_backup, 'The archive is not a usable Commission Tracker backup.', { reason: staging.reason })
    }
    if (staging.app_version === null || staging.created_at === null || staging.staged_db_path === null) {
      return this.unavailable('the backend described a usable archive without its version, date or staged file')
    }

    // 3-4. The safety backup of the live database, in this workflow's own folder.
    const folder = await this.adapters.ensureFolder(this.adapters.safetyFolder)
    if (folder.kind === 'failed') return this.storageError(labels.safety_backup_failed, 'The safety backup folder could not be created.', folder.reason)
    const safety = await this.adapters.createSafetyBackup(this.adapters.safetyFolder)
    if (safety.kind === 'failed') return this.storageError(labels.safety_backup_failed, 'The safety backup could not be created.', safety.reason)

    // 5. Record the pending restore (atomic write). The safety backup stays if this fails.
    const stored: StoredPendingRecord = {
      archive_path: archivePath,
      archive_app_version: staging.app_version,
      archive_created_at: staging.created_at,
      safety_backup_path: safety.archive.archive_path,
      prepared_at: this.adapters.nowTimestamp(),
      staged_db_path: staging.staged_db_path,
    }
    const written = await this.adapters.writePendingRecord(stored)
    if (written.kind === 'failed') return this.storageError(labels.storage_io, 'The pending restore could not be recorded.', written.reason)

    // 6.
    return { status: labels.ok, body: publicRecord(stored) }
  }

  /** restore:status. An unreadable record is an error here; cleaning it up is
   * phase 2's job. */
  async status(): Promise<RestoreReply> {
    const read = await this.adapters.readPendingRecord()
    if (read.kind === 'unreadable') return this.storageError(this.config.labels.storage_io, 'The pending restore could not be read.', read.reason)
    const body: RestoreStatus = { pending: read.kind === 'record' ? publicRecord(read.record) : null }
    return { status: this.config.labels.ok, body }
  }

  /** restore:cancel: removes the record only. The staging file (backup_data's)
   * and the safety backup are left alone. */
  async cancel(): Promise<RestoreReply> {
    const removed = await this.adapters.deletePendingRecord()
    if (removed.kind === 'failed') return this.storageError(this.config.labels.storage_io, 'The pending restore could not be removed.', removed.reason)
    const body: RestoreCancellation = { canceled: removed.kind === 'deleted' }
    return { status: this.config.labels.ok, body }
  }

  // --- phase 2: apply (f_restore.md section 3) ------------------------------------

  private outcome(outcome: RestoreOutcome['outcome'], record: StoredPendingRecord | null, reason: string | null): ApplyReply {
    const body: RestoreOutcome = {
      outcome,
      archive_path: record === null ? null : record.archive_path,
      safety_backup_path: record === null ? null : record.safety_backup_path,
      reason,
    }
    this.log(`restore_data: apply -> ${outcome}`)
    return { status: this.config.labels.ok, body }
  }

  /** Steps 1-2 end: the record cannot be used. It is removed (when that fails
   * the answer is still `discarded`, and says so), live data is not touched. */
  private async discard(record: StoredPendingRecord | null, why: string): Promise<ApplyReply> {
    this.log(`restore_data: apply: discarding the pending restore: ${why}`)
    const removed = await this.adapters.deletePendingRecord()
    const reason = removed.kind === 'failed' ? `${why}; the pending record could not be removed (${removed.reason})` : why
    return this.outcome('discarded', record, reason)
  }

  /** Removes the record after an apply attempt; a failure is logged, not fatal. */
  private async removeRecord(): Promise<void> {
    const removed = await this.adapters.deletePendingRecord()
    if (removed.kind === 'failed') this.log(`restore_data: apply: the pending record could not be removed (${removed.reason})`)
    else this.log('restore_data: apply: the pending record is removed')
  }

  /** apply_pending_restore (in_process; called by restore_trigger). */
  async applyPending(): Promise<ApplyReply> {
    // 1. Nothing pending.
    const read = await this.adapters.readPendingRecord()
    if (read.kind === 'none') return this.outcome('none', null, null)
    // 2. An unusable record, or a staged file that is gone: drop it, touch nothing.
    if (read.kind === 'unreadable') return this.discard(null, `the pending record cannot be read (${read.reason})`)
    const record = read.record
    if (!(await this.adapters.isFile(record.staged_db_path))) {
      return this.discard(record, `the staged database file is gone (${record.staged_db_path})`)
    }

    this.log(`restore_data: apply: applying the pending restore of ${record.archive_path}`)
    const moves: AppliedMoves = { stem: `${this.config.files.previous_file_prefix}${this.adapters.nowFileStamp()}`, asidePath: null, stagedMovedIn: false }
    const failure = await this.swapIn(record, moves)
    if (failure === null) {
      // 7.
      await this.removeRecord()
      return this.outcome('restored', record, null)
    }

    // 8. Put the old database back.
    this.log(`restore_data: apply: failed, putting the previous database back: ${failure}`)
    const undoFailure = await this.undo(moves)
    await this.removeRecord()
    if (undoFailure === null) return this.outcome('rolled_back', record, failure)

    // 9. Putting back failed too. Which of the three jobs of step 8 failed, and
    //    where the previous database is now, tell the Main which sentence to show
    //    (DSK-26): the three cases are not the same for the person.
    this.log(`restore_data: apply -> failed (restore: ${failure}; put back failed at ${undoFailure.stage}: ${undoFailure.reason})`)
    return {
      status: this.config.labels.restore_failed,
      body: {
        code: this.config.error_codes.restore_failed,
        message: 'Applying the pending restore failed and the previous database could not be started again.',
        details: {
          reason: failure,
          rollback_reason: undoFailure.reason,
          rollback_stage: undoFailure.stage,
          previous_database_path: undoFailure.stage === 'start' ? this.adapters.dbFilePath : moves.asidePath,
        },
      },
    }
  }

  /** Steps 3-6. Null when the backend is READY on the restored database;
   * otherwise the reason of the first failure. */
  private async swapIn(record: StoredPendingRecord, moves: AppliedMoves): Promise<string | null> {
    const { files } = this.config
    // 3.
    await this.adapters.stopBackend()
    this.log('restore_data: apply: the backend is stopped')
    // 4. The live database is moved aside (kept), never overwritten.
    const folder = await this.adapters.ensureFolder(this.adapters.previousFolder)
    if (folder.kind === 'failed') return `the folder for the previous database could not be made (${folder.reason})`
    const aside = await this.adapters.freePath(this.adapters.previousFolder, moves.stem, files.previous_file_extension)
    const asideMove = await this.adapters.moveFile(this.adapters.dbFilePath, aside)
    if (asideMove.kind === 'failed') return `the live database could not be moved aside (${asideMove.reason})`
    moves.asidePath = aside
    this.log(`restore_data: apply: moved the live database aside to ${aside}`)
    // 5.
    const staged = await this.adapters.moveFile(record.staged_db_path, this.adapters.dbFilePath)
    if (staged.kind === 'failed') return `the staged database could not be moved into place (${staged.reason})`
    moves.stagedMovedIn = true
    this.log('restore_data: apply: moved the staged database into place')
    // 6.
    const started = await this.adapters.startBackend()
    if (started.kind === 'failed') return `the backend did not start on the restored database (${started.reason})`
    this.log('restore_data: apply: the backend is READY on the restored database')
    return null
  }

  /** Step 8, in the order 8a, 8b, 8c. Null when the old database is back and the
   * backend is READY on it; otherwise which job failed and why. A database that
   * was moved in is kept, with the failed suffix, never deleted. Each rename is
   * tried once (no retry: 0 of 20 failed when measured in session 36). */
  private async undo(moves: AppliedMoves): Promise<UndoFailure | null> {
    const { files } = this.config
    await this.adapters.stopBackend()
    // 8a. The staged database that was moved in goes aside.
    if (moves.stagedMovedIn) {
      const failedPath = await this.adapters.freePath(this.adapters.previousFolder, `${moves.stem}${files.failed_suffix}`, files.previous_file_extension)
      const put = await this.adapters.moveFile(this.adapters.dbFilePath, failedPath)
      if (put.kind === 'failed') return { stage: 'move_failed_aside', reason: `the restored database could not be moved out of the way (${put.reason})` }
      this.log(`restore_data: apply: moved the failed database to ${failedPath}`)
    }
    // 8b. The previous database goes back to db_file_path.
    if (moves.asidePath !== null) {
      const back = await this.adapters.moveFile(moves.asidePath, this.adapters.dbFilePath)
      if (back.kind === 'failed') return { stage: 'move_back', reason: `the previous database could not be put back (${back.reason})` }
      this.log('restore_data: apply: put the previous database back')
    }
    // 8c. The backend starts on it.
    const started = await this.adapters.startBackend()
    if (started.kind === 'failed') return { stage: 'start', reason: `the backend did not start on the previous database (${started.reason})` }
    this.log('restore_data: apply: the backend is READY on the previous database')
    return null
  }
}
