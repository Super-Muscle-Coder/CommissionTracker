# ===WCA-CHECKPOINT-START===
# workflow: main
# clause: clause_b_backend
# component: main
# last_updated_by: coding-agent@2026-10-07#1
# last_updated_at: 2026-10-07T10:29:51.1415583+07:00
#
# EXPERIENCES:
#   - id: main-EXP-001
#     content: >
#       Dùng chung một kết nối SQLite giữa các luồng: uvicorn chạy endpoint
#       đồng bộ trên nhiều luồng, nên kết nối được mở với check_same_thread=False
#       và isolation_level=None (module sqlite3 không tự mở giao dịch), rồi bọc
#       trong SharedConnection có một RLock chung. Mọi Adapters chỉ chạm DB bên
#       trong "with db.transaction() as conn" (BEGIN IMMEDIATE ... COMMIT,
#       ROLLBACK khi có ngoại lệ) hoặc "with db.read() as conn" (BEGIN DEFERRED).
#       Hai khối giữ khóa suốt thời gian chạy nên câu lệnh của các request
#       không bao giờ xen kẽ. Quy tắc cho mọi workflow: không giữ conn hay
#       cursor ra ngoài khối, không lồng hai khối vào nhau (BEGIN lồng sẽ lỗi),
#       gom các câu lệnh cần nguyên tử vào đúng một khối transaction(). Chọn
#       cách này thay vì mở mỗi luồng một kết nối vì hợp đồng trao đúng một
#       tài nguyên db_connection, và vì backup_data sau này cần một điểm duy
#       nhất để chụp ảnh nhất quán toàn bộ DB.
#     derived_from: scaffold_backend-EXP-001
#   - id: main-EXP-002
#     content: >
#       Chặn phản hồi 422 mặc định của FastAPI (quy ước cho mọi workflow backend):
#       Routers khai báo tham số đường dẫn và query là str, thân request là
#       "payload: Any = Body(default=None)", rồi tự kiểm tra định dạng bằng
#       Pydantic (chỉ ở Routers, strict=True, extra=forbid) và tự trả đúng
#       nhãn đã khai báo của từng điểm giao tiếp. Main (create_http_app) có
#       thêm lưới an toàn: RequestValidationError (ví dụ thân không phải JSON)
#       thành 400 + ERR_VALIDATION; HTTPException của Starlette (đường dẫn hay
#       phương thức không khai báo) giữ nguyên mã trạng thái nhưng trả error_body.
#       Tài liệu tự sinh đã tắt (docs_url, redoc_url, openapi_url = None).
#       Workflow có điểm giao tiếp không khai báo 400 thì không được để
#       FastAPI tự kiểm tra kiểu của bất kỳ tham số nào.
#     derived_from: scaffold_backend-EXP-003
#   - id: main-EXP-003
#     content: >
#       Giao thức giữa các Main trên Windows: select() không dùng được với pipe,
#       nên một luồng daemon gọi os.read(stdin) lặp tới khi gặp EOF rồi đặt
#       server.should_exit = True. READY được in trong override của
#       uvicorn.Server.startup, ngay sau khi started=True (socket đã lắng nghe;
#       mọi workflow đã đăng ký trước khi tạo server). READY ghi thẳng
#       b"READY\n" vào sys.stdout.buffer (không có \r). Stdout không có gì
#       khác: log dùng logging ra stderr, access_log=False, log_config=None.
#       Ctrl+C: uvicorn tắt êm rồi phát lại SIGINT, sinh ra KeyboardInterrupt;
#       Main bắt ngoại lệ này rồi thoát mã 0. Lỗi bind cổng: uvicorn gọi
#       sys.exit(1), không có READY. Giá trị khởi động thiếu hoặc sai định dạng:
#       thoát với startup_failure_exit_code (2) trong configs/backend.yaml, không
#       tạo tệp DB.
#     derived_from: scaffold_backend-EXP-004
#   - id: main-EXP-004
#     content: >
#       Quy ước của điểm giao tiếp in_process trong layer: hàm Routers nhận
#       tham số từ khóa, trả về dữ liệu thuần (dict, list của dict), không trả
#       Entities, để bên gọi tự chuyển thành Entities của chính nó. Với nhãn
#       khác 2xx, hàm raise một lỗi mang thuộc tính label (int) và error_body
#       (dict đúng clause_a_common.error_body). Bên gọi (Adapters của nó)
#       nhận diện lỗi qua hai thuộc tính này, không import kiểu lỗi của
#       workflow được gọi. Main giữ các lối vào này trong dict trả về từ
#       wire_workflows, theo tên address, rồi trao cho Adapters của bên gọi.
#     derived_from: manage_client-EXP-001
#   - id: main-EXP-005
#     content: >
#       Quy ước nhãn 500 + ERR_STORAGE_IO (API Contract 2.0.0) cho mọi workflow
#       có lưu trữ: Adapters bọc mọi khối db.transaction()/db.read() của
#       thao tác lúc chạy trong một context manager chỉ đổi sqlite3.Error và
#       OSError thành StorageIOError (lớp lỗi riêng của từng workflow, khai
#       báo trong adapters.py, Services re-export để Routers chỉ phụ thuộc
#       Services). Routers bắt đúng StorageIOError: http trả 500 + error_body
#       {code: ERR_STORAGE_IO, message, details: {reason}}; in_process raise
#       lỗi label=500 cùng error_body đó. Adapter gọi sang workflow khác đổi
#       label 500 nhận về thành StorageIOError của chính nó. Không có handler
#       chung ở Main: một lỗi lập trình (KeyError...) vẫn nổi lên thành lỗi
#       thật, không bị giả làm lỗi lưu trữ. ensure_storage() lúc khởi động
#       không bọc: lỗi ở đó làm Main thoát, không in READY. Điểm giao tiếp chỉ
#       đọc Configs (list_currencies...) không bắt lỗi này vì không chạm DB.
#       Cách gây lỗi thật để kiểm thử: kết nối khác giữ BEGIN EXCLUSIVE trên
#       cùng tệp (backend hết busy_timeout -> "database is locked", cả đọc lẫn
#       ghi), hoặc PRAGMA query_only = ON trên kết nối (chỉ chặn ghi).
#   - id: main-EXP-006
#     content: >
#       Khuôn "kiểm tra rồi ghi" nguyên tử cho mọi workflow của layer: khi một
#       quyết định của Services phải dựa trên dữ liệu đang lưu mà hai lời gọi
#       đồng thời có thể cùng đổi (tổng tiền, giai đoạn hiện tại...), Adapters
#       cấp một context manager write_scope() bọc _storage_io() và
#       db.transaction(), yield một đối tượng scope chỉ có các thao tác
#       đọc/ghi cần thiết trên kết nối của giao dịch đó. Services đọc, quyết
#       định, raise (rollback, không ghi gì) hoặc ghi, tất cả trong khối with.
#       Mọi lời gọi in_process sang workflow khác phải xong TRƯỚC khi mở scope:
#       bên được gọi tự mở db.read(), và BEGIN lồng trong giao dịch đang mở sẽ
#       lỗi (main-EXP-001). Vì một tiến trình chỉ có một kết nối và mọi khối
#       giữ chung một RLock, các scope được xét lần lượt. Dữ liệu lấy từ
#       workflow khác trước scope có thể cũ đi trong lúc chờ; ghi chú cụ thể ở
#       checkpoint của workflow liên quan. Dùng ở record_payment-EXP-004 và
#       update_progress-EXP-003.
#   - id: main-EXP-008
#     content: >
#       Quy ước cho workflow không có lưu trữ (view_income_report là workflow
#       đầu tiên như vậy; sau này có verify_watermark): Main không trao
#       db_connection và không gọi ensure_storage; workflow không có bảng, kể
#       cả bảng phiên bản. Adapters chỉ bọc các lối vào in_process do Main
#       trao (main-EXP-004). Nhãn 500 + ERR_STORAGE_IO vẫn áp dụng: Adapters
#       đổi label 500 nhận về thành StorageIOError của chính workflow (reason
#       có tiền tố tên workflow được gọi), Routers trả 500 như main-EXP-005.
#       Nhiều lời gọi in_process liên tiếp không nằm chung một giao dịch
#       (main-EXP-006), nên với workflow chỉ đọc, kết quả có thể lệch một thao
#       tác ghi xen giữa; ghi NOTE ở checkpoint của workflow.
#       Kỹ thuật kiểm thử dùng chung của layer để gây lỗi lưu trữ thật cho
#       đúng một lời gọi trong chuỗi: trong lúc backend chạy, KIỂM THỬ (không
#       bao giờ là code workflow) mở một kết nối sqlite3 riêng trên cùng tệp
#       và ALTER TABLE <bảng của workflow bị gọi> RENAME TO <tên khác>. Các lời
#       gọi trước đó vẫn thành công; lời gọi chạm bảng đó gặp "no such table"
#       và trả 500. Đổi tên lại là hết lỗi. Ví dụ với view_income_report: đổi
#       tên stage_change làm lời gọi thứ hai (update_progress) lỗi, đổi tên
#       payment làm lời gọi thứ ba (record_payment) lỗi. BEGIN EXCLUSIVE chỉ
#       làm lỗi lời gọi đầu tiên, vì khóa chặn mọi bảng.
#     derived_from: main-EXP-007
#   - id: main-EXP-009
#     content: >
#       Đồng hồ cho workflow mà quyết định phụ thuộc thời gian (send_reminder là
#       workflow đầu tiên như vậy): đọc giờ và múi giờ của máy là thao tác kỹ
#       thuật, nên đặt trong Adapters (SystemClock: now, at_local, to_local).
#       Main tạo nó trong wire_workflows rồi tiêm vào Services. Để kiểm thử cấp
#       workflow dùng đồng hồ giả mà không đổi tiến trình thật, wire_workflows
#       có tham số từ khóa (reminder_clock=None). Main không bao giờ truyền nó,
#       và không có biến CT_* nào điều khiển đồng hồ: None nghĩa là
#       SystemClock. Bẫy trên Windows: datetime.astimezone() báo OSError với
#       thời điểm trước 1970 hoặc sau năm 3000. Nếu OSError đó xảy ra bên trong
#       khối _storage_io, nó bị nhận nhầm thành 500 ERR_STORAGE_IO. Vì vậy đồng
#       hồ tự xử lý lỗi này (dùng độ lệch hiện tại), và phép tính thời gian
#       không đặt trong khối lưu trữ nếu tránh được.
#   - id: main-EXP-010
#     content: >
#       CORS cho renderer (Data Schema 6.0.0): create_http_app(layer_cfg) gắn
#       CORSMiddleware của Starlette với đúng một origin là ui_origin trong
#       configs/backend.yaml, method GET/POST/PUT và header Content-Type (cũng
#       trong tệp đó, mục http_server), không credentials. main() và mọi kiểm
#       thử dựng app qua đúng hàm này. Không có route OPTIONS: middleware tự
#       trả lời preflight. Yêu cầu không có header Origin đi qua nguyên vẹn.
#       Phản hồi lỗi cũng phải mang header CORS, vì nếu thiếu thì trình duyệt
#       không cho renderer đọc phản hồi, và renderer chỉ thấy một lỗi mạng
#       chung chung, không đọc được error_body. Như vậy nó không phân biệt được
#       400, 404, 409 hay 500 ERR_STORAGE_IO với việc backend không chạy. Điều
#       này tự đúng vì middleware nằm ngoài các exception handler của Main và
#       ngoài Routers. Giới hạn đã kiểm thật: một ngoại lệ lập trình không ai
#       bắt tới được ServerErrorMiddleware, lớp ngoài cùng của Starlette, nằm
#       ngoài CORSMiddleware. Khi đó phản hồi là 500 text/plain "Internal
#       Server Error" không có header CORS, và renderer thấy nó như lỗi kết
#       nối. Không vá bằng một handler chung (xem main-EXP-005). Starlette
#       luôn trả thêm bốn header safelisted của CORS trong
#       Access-Control-Allow-Headers; không phải mở mọi header.
#   - id: main-EXP-011
#     content: >
#       Bên khởi động backend phải cho stdin là pipe và giữ pipe mở suốt vòng
#       đời (luật dừng: đóng stdin là tín hiệu dừng). Nếu stdin là DEVNULL, bị
#       bỏ qua, hay bị đóng ngay (subprocess.run không có input), backend gặp
#       EOF và tự dừng ngay sau khởi động, có khi trước khi kịp in READY. Stdout
#       chỉ có b"READY\n"; mọi log ra stderr. Desktop Main làm đúng như vậy từ
#       phiên 10 (Desktop/src/main.ts: "stdin is a pipe kept open for the whole
#       life of the backend"; EVIDENCE P4 của checkpoint Main desktop: đóng cửa
#       sổ -> "closing its standard input" -> backend thoát mã 0). Kiểm thử
#       nào cần backend chạy tới READY cũng phải giữ stdin mở như vậy
#       (tests/test_database_ownership.py, run_to_exit).
#   - id: main-EXP-012
#     content: >
#       CORS đã được đo trên renderer thật, không chỉ mô phỏng header Origin
#       (checkpoint Main desktop, clause_d_desktop): Origin thật của renderer
#       nạp từ app:// là app://commission-tracker, đúng bằng ui_origin
#       (EVIDENCE "Origin thật của renderer...", phiên 10). GET từ app:// tới
#       127.0.0.1 không có preflight Private/Local Network Access nào, nên
#       backend không cần trả header cho loại preflight đó (cùng EVIDENCE).
#       POST có preflight OPTIONS -> 200 rồi POST -> 201, cả hai mang
#       Access-Control-Allow-Origin: app://commission-tracker, trên Windows
#       (EVIDENCE "npm run test:packaged đạt P1-P6", ca P2, phiên 13 và 14).
#       Nếu sau này đo ra origin khác thì sửa ui_origin ở hợp đồng; backend chỉ
#       đổi một dòng trong configs/backend.yaml. Middleware cũng trả lời
#       preflight cho đường dẫn không khai báo; hợp đồng (6.0.1) không cấm.
#   - id: main-EXP-013
#     content: >
#       Quyền sở hữu tệp dữ liệu (Data Schema 6.2.0): Main giữ một khóa hệ điều
#       hành, không chờ, trên tệp khóa riêng <db_file_path>.lock đặt cạnh
#       data.db (msvcrt.locking LK_NBLCK trên byte 0 ở Windows, fcntl.flock
#       LOCK_EX|LOCK_NB ở POSIX), suốt đời tiến trình. Thứ tự trong main():
#       kiểm biến CT_* -> tạo thư mục (ensure_database_folder) -> giành quyền ->
#       scaffold_backend mở DB; dừng: server dừng -> db.close() -> nhả khóa
#       (LK_UNLCK/LOCK_UN rồi đóng fd) -> thoát. Không dùng PRAGMA
#       locking_mode=EXCLUSIVE hay giao dịch giữ mở trên data.db, vì chúng chặn
#       mọi kết nối khác (kiểm thử, backup API của backup_data sau này); tệp
#       khóa riêng không đụng tới data.db hay -journal. fd của os.open không
#       được kế thừa sang tiến trình con (PEP 446), nên không tiến trình con
#       nào giữ khóa hộ. Không giành được sau retry_window_ms (2000, nhịp
#       retry_interval_ms 50) -> một dòng ERROR ra stderr "cannot start:
#       database <path> is in use by another backend process", không gì ra
#       stdout, thoát database_in_use_exit_code = 3 (khác 0 dừng sạch, 1
#       uvicorn không bind được cổng hay ngoại lệ Python không bắt, 2
#       startup_failure_exit_code); không mở, không tạo data.db. Chỉ errno của
#       "đang bị khóa" (EACCES, EAGAIN/EWOULDBLOCK, EDEADLOCK) mới là mã 3; lỗi
#       I/O khác khi tạo tệp khóa -> mã 2, để log không nói sai lý do. Số đo
#       trên Windows 11 (2026-09-27, Backend.py thật giữ khóa, 20 lần mỗi kiểu,
#       thử khóa mỗi 1 ms): dừng sạch -> khóa rảnh ngay lần thử đầu, tối đa
#       0,58 ms sau khi thấy tiến trình thoát; bị giết (TerminateProcess) -> trung
#       vị 3,25 ms, tối đa 5,5 ms, tối đa 4 lần thử. Cửa sổ 2 s lớn hơn số xấu
#       nhất khoảng 360 lần mà vẫn nhỏ hơn hẳn ready_timeout_ms 30 s của
#       desktop (3 lần thử của desktop -> khoảng 3 x 2,7 s rồi báo lỗi). Tệp
#       khóa được để lại sau khi tiến trình dừng (chỉ khóa mất): backup_data và
#       restore_data sau này làm việc trên nguyên data.db, bỏ qua data.db.lock,
#       và không xóa nó khi một backend có thể đang chạy. Kiểm thử ca "B tới
#       trước khi data.db tồn tại": một tiến trình giữ khóa bằng chính
#       Backend.take_database_ownership mà không mở DB (Main thật chỉ ở giữa
#       bước 2a và 2b vài ms), B thoát mã 3 và thư mục chỉ còn data.db.lock.
#       Nhánh POSIX (fcntl) chưa chạy trên Linux trong phiên 15.
#   - id: main-EXP-014
#     content: >
#       Phụ thuộc của layer tách hai tệp: requirements.txt chỉ có gói lúc chạy
#       (fastapi, starlette, pydantic, uvicorn, PyYAML), là thứ
#       Desktop/packaging/prepare_runtime.mjs cài vào bản đóng gói;
#       requirements-dev.txt = -r requirements.txt + pytest + httpx, cài vào
#       Backend/env. Không tệp nào ngoài tests/ và workflows/*/tests/ được import
#       pytest hay httpx; thêm phụ thuộc lúc chạy mới thì ghi vào
#       requirements.txt, công cụ kiểm thử thì ghi vào requirements-dev.txt.
#   - id: main-EXP-015
#     content: >
#       Ráp nối backup_data (phiên 32), Order 2 ngay sau manage_client, trong
#       wire_workflows: Main đọc configs.yaml của nó (thêm vào
#       WORKFLOW_CONFIG_FILES), dựng ArchiveSettings và StagingSettings từ hai
#       mục archive và staging, rồi trao cho Services: DatabaseSnapshots,
#       ArchiveFiles và StagingArea (cả ba nhận db_connection hoặc giá trị từ
#       Configs), đồng hồ máy (BackupClock, bản SystemClock riêng của
#       backup_data), và app_version, chính giá trị main() đã đọc và kiểm từ
#       CT_APP_VERSION (launch.app_version). Main không chứa dòng logic sao lưu
#       nào. wire_workflows có thêm hai tham số từ khóa: app_version và
#       backup_clock. app_version KHÔNG có giá trị mặc định: None nghĩa là không
#       đăng ký backup_data. Lý do: 20 chỗ gọi wire_workflows(app, db, configs)
#       trong kiểm thử của các workflow khác không truyền nó và không được sửa;
#       đặt "0.0.0" làm mặc định thì bịa ra một phiên bản. Hệ quả: quên truyền ở
#       main() sẽ làm mất hai điểm giao tiếp mà không báo lỗi (test_backup_is_not_wired_without_app_version
#       và mọi kiểm thử tiến trình thật của backup_data bắt được). backup_clock
#       giống reminder_clock (main-EXP-009): Main không bao giờ truyền, chỉ
#       kiểm thử của workflow truyền đồng hồ giả. Bước 5.6 được giữ: backup_data
#       chỉ chạm db_connection (chụp, và hỏi PRAGMA database_list), không có
#       lời gọi in_process nào, không có bảng, không gọi ensure_storage.
#       Bản đóng gói tự có workflow mới vì prepare_runtime chép mọi .py và .yaml
#       dưới workflows/ (trừ tests); Python nhúng có zipfile, zlib, hashlib
#       (đo ở EVIDENCE của backup_data).
#
# UNSOLVED_PROBLEMS: []
#
# EVIDENCE:
#   - claim: >
#       Backend.py khởi động bằng bốn biến CT_*, in đúng một dòng READY sau khi
#       đã lắng nghe, thoát mã 0 khi stdin đóng hoặc khi nhận SIGINT; thiếu
#       hoặc sai một biến thì thoát mã khác 0, không in READY, không tạo DB.
#     how: >
#       cd Backend; env\Scripts\python.exe -m pytest -s -v
#       tests/test_backend_process.py::test_process_lifecycle_crud_errors_and_restart
#       tests/test_backend_process.py::test_missing_or_malformed_launch_value_exits_nonzero_without_ready
#       tests/test_backend_process.py::test_ctrl_c_stops_cleanly_with_exit_code_0
#       (chọn đúng ba hàm theo node ID, không dùng -k, để lệnh không chọn thêm
#       kiểm thử của workflow mới; Python 3.13.12 của
#       Backend/env, Windows 11; tiến trình con thật: sys.executable Backend.py,
#       cwd=Backend, stdin/stdout là pipe, CT_DB_FILE_PATH là tệp tạm tuyệt
#       đối, cổng trống ngẫu nhiên). Ctrl+C được mô phỏng bằng
#       signal.raise_signal(SIGINT) bên trong tiến trình, sau khi đã in READY.
#     result: >
#       Lần chạy 1 và lần chạy 2: stdout đúng bằng [b'READY\n'], đóng stdin cho
#       "exit code 0". 8 trường hợp (thiếu CT_PORT, CT_DB_FILE_PATH,
#       CT_AI_SERVICE_BASE_URL, CT_APP_VERSION; CT_PORT=abc;
#       CT_DB_FILE_PATH=relative/data.db;
#       CT_AI_SERVICE_BASE_URL=http://localhost:9000; CT_APP_VERSION=v1): mọi
#       trường hợp đều "exit code 2, stdout=b''", stderr ví dụ "cannot start:
#       CT_PORT is missing". SIGINT cho "exit code 0". Tổng: 10 passed.
#     recorded_at: 2026-09-25T09:29:28+07:00
#   - claim: >
#       Toàn bộ kiểm thử của layer đạt với interpreter của dự án, với tám
#       workflow đã ráp nối: scaffold_backend, manage_client, manage_commission,
#       record_payment, update_progress và manage_watermark_profile (Order 4),
#       view_income_report và send_reminder (Order 6), và với bước giành quyền
#       tệp dữ liệu của Main (Data Schema 6.2.0).
#     how: >
#       cd Backend; env\Scripts\python.exe -m pytest -q (Python 3.13.12 của
#       Backend/env, Windows 11; môi trường cài bằng requirements-dev.txt)
#     result: >
#       Phiên 15, trước khi sửa: 375 passed in 351.40s. Sau khi sửa: 381
#       passed, 1 warning (DeprecationWarning của starlette.testclient về
#       anyio.abc.BlockingPortal, không liên quan code dự án) in 407.44s (375
#       kiểm thử cũ + 6 kiểm thử trong tests/test_database_ownership.py).
#     recorded_at: 2026-09-27T22:08:30+07:00
#   - claim: >
#       Backend trả CORS cho ui_origin và không cho origin nào khác
#       (clause_a_common.mandatory_rules, Data Schema 6.0.1): GET và phản hồi
#       lỗi đã khai báo (400, 404, 409, 500 ERR_STORAGE_IO) mang
#       Access-Control-Allow-Origin = ui_origin; preflight POST/PUT (kể cả
#       đường dẫn có {id}) với content-type thành công; DELETE hay header lạ bị
#       từ chối; origin khác không nhận Access-Control-Allow-Origin; yêu cầu không có Origin
#       giữ nguyên; 500 thô của ngoại lệ lập trình không có header CORS; tiến
#       trình Backend.py thật trả đúng header.
#     how: >
#       cd Backend; env\Scripts\python.exe -m pytest -s -v
#       tests/test_cors.py::test_ui_origin_matches_nothing_else_in_config
#       tests/test_cors.py::test_allowed_methods_are_exactly_those_of_the_registered_routes
#       tests/test_cors.py::test_get_from_ui_origin_carries_allow_origin
#       tests/test_cors.py::test_preflight_from_ui_origin_allows_declared_method
#       tests/test_cors.py::test_preflight_refuses_undeclared_method_and_header
#       tests/test_cors.py::test_declared_errors_from_ui_origin_keep_error_body_and_carry_allow_origin
#       tests/test_cors.py::test_other_origins_receive_no_cors_headers
#       tests/test_cors.py::test_request_without_origin_is_unchanged
#       tests/test_cors.py::test_known_limit_uncaught_exception_raw_500_has_no_cors_headers
#       tests/test_cors.py::test_real_process_answers_cors_for_ui_origin_only
#       (theo node ID, không dùng -k; Python 3.13.12 của Backend/env, Windows
#       11; app dựng bằng create_http_app + wire_workflows như main(); ca cuối
#       là tiến trình con thật sys.executable Backend.py, stdin là pipe, chờ
#       READY). Origin khác: http://127.0.0.1:<cổng trống>, null,
#       app://commission-trackex.
#     result: >
#       14 passed in 3.53s. Tiến trình thật: GET /clients với Origin
#       app://commission-tracker cho 200, access-control-allow-origin
#       'app://commission-tracker', vary 'Origin'. Preflight PUT
#       /clients/{id} cho 200, allow-methods 'GET, POST, PUT', allow-headers
#       'Accept, Accept-Language, Content-Language, Content-Type'. PUT
#       /clients/{id không tồn tại} cho 404 ERR_NOT_FOUND và vẫn có
#       allow-origin. Origin http://127.0.0.1:<cổng khác> cho allow-origin
#       None. Đóng stdin cho exit code 0, stdout [b'READY\n']. 500 ERR_STORAGE_IO
#       (bảng client bị đổi tên) có allow-origin. Ngoại lệ lập trình cho 500
#       text/plain 'Internal Server Error', allow-origin None.
#     recorded_at: 2026-09-26T20:29:55+07:00
#   - claim: >
#       Mỗi lúc chỉ một backend dùng một tệp dữ liệu (Data Schema 6.2.0,
#       main-EXP-013): backend thứ hai trên cùng CT_DB_FILE_PATH thoát mã 3 sau
#       cửa sổ thử lại, không READY, một dòng ERROR nêu đúng lý do và đường dẫn,
#       trong khi backend thứ nhất vẫn phục vụ; khi chủ đang giữ quyền mà
#       data.db chưa có, backend thứ hai không tạo ra nó; quyền được nhả khi
#       dừng sạch và khi bị giết; hai tệp khác nhau không chặn nhau; kết nối
#       SQLite khác vẫn đọc và backup API vẫn chép được data.db trong lúc
#       backend chạy. Kiểm thử cắn: bỏ bước giành quyền thì ca 1 hỏng.
#     how: >
#       cd Backend; env\Scripts\python.exe -m pytest -s -v
#       tests/test_database_ownership.py (Python 3.13.12 của Backend/env,
#       Windows 11, AVG và ReasonLabs bật; tiến trình Backend.py thật, stdin là
#       pipe giữ mở, DB trong tmp_path, cổng trống ngẫu nhiên). Chứng minh
#       cắn: tạm thay lời gọi take_database_ownership trong main() bằng
#       DatabaseOwnership(os.open(os.devnull, os.O_RDONLY), "") rồi chạy
#       "tests/test_database_ownership.py::test_second_backend_on_same_file_exits_with_own_code",
#       sau đó khôi phục. Số đo độ trễ nhả khóa: script đo (không thuộc dự án)
#       khởi động Backend.py thật 20 lần cho mỗi kiểu dừng (đóng stdin; kill()
#       = TerminateProcess), rồi từ tiến trình đo thử msvcrt.locking LK_NBLCK
#       trên data.db.lock mỗi 1 ms, bấm giờ từ lúc wait() trả về.
#     result: >
#       6 passed in 19.73s. Ca 1: backend thứ hai "exited after 2.72 s (retry
#       window 2.00 s)", exit code 3, stdout b'', stderr "ERROR backend.main:
#       cannot start: database <tmp>\CommissionTracker\data.db is in use by
#       another backend process"; A GET /clients 200, đóng stdin -> 0, stdout
#       [b'READY\n']. Ca 2: thư mục sau lần thử của B chỉ có ['data.db.lock'];
#       khi bên giữ nhả, C READY và tạo data.db. Ca 3: C READY 0.76 s sau khi
#       khởi động, ngay sau khi A thoát mã 0. Ca 4: A bị giết, exit code 1,
#       khóa rảnh 4.52 ms sau khi thấy A thoát (6.82 ms sau kill()), C READY
#       0.79 s. Ca 5: hai backend trên hai tệp cùng READY, cùng trả 200. Ca 6:
#       kết nối khác đọc 1 client, bản chép bằng backup API có 1 client. Bỏ
#       bước giành quyền: B in READY trên cùng tệp, "exit code 0,
#       stdout=b'READY\n'", ca 1 FAILED (assert 0 == 3); khôi phục thì 6
#       passed. Số đo 20+20 lần: dừng sạch, khóa rảnh ngay lần thử đầu, 0,16 /
#       0,37 / 0,58 ms (nhỏ nhất / trung vị / lớn nhất) sau wait(); bị giết,
#       1,68 / 3,25 / 5,5 ms, tối đa 4 lần thử; mã thoát 0 và 1.
#     recorded_at: 2026-09-27T22:00:30+07:00
#   - claim: >
#       requirements.txt chỉ còn phụ thuộc lúc chạy; requirements-dev.txt đủ để
#       chạy kiểm thử và không cài thêm gì vào Backend/env; không tệp chạy thật
#       nào import pytest hay httpx; bản đóng gói không còn gói kiểm thử và
#       vẫn qua phép thử khói.
#     how: >
#       cd Backend; Get-ChildItem -Recurse -Filter *.py -File | Where-Object {
#       $_.FullName -notmatch '\\env\\' -and $_.FullName -notmatch '\\tests\\' }
#       | Select-String -Pattern '^\s*(import|from)\s+(pytest|httpx|_pytest)\b'
#       (PowerShell); env\Scripts\python.exe -m pip install -r
#       requirements-dev.txt. cd Desktop; node packaging/prepare_runtime.mjs,
#       trước và sau khi tách, rồi tổng Length của mọi tệp trong
#       packaging\stage\python\Lib\site-packages (Get-ChildItem -Recurse -File
#       -Force | Measure-Object Length -Sum) và danh sách thư mục ở đó.
#     result: >
#       Select-String: không dòng nào. pip: mọi gói "Requirement already
#       satisfied", không gói nào được cài. prepare_runtime: "smoke test
#       passed: stdout "READY\n", exit code 0, database created" cả hai lần.
#       site-packages: trước 30 482 043 byte (29.1 MB, 1894 tệp), sau 16 148 295
#       byte (15.4 MB, 782 tệp), nhẹ đi 14 333 748 byte; không còn pytest,
#       _pytest, httpx, httpcore, pygments, pluggy, iniconfig, certifi,
#       colorama, packaging (idna còn, là phụ thuộc lúc chạy của anyio).
#     recorded_at: 2026-09-27T22:05:00+07:00
#   - claim: >
#       Backend mới (bước giành quyền, bộ phụ thuộc mới) chạy đúng với desktop,
#       bản đóng gói và giao diện; fixture tắt/bật của giao diện bật lại backend
#       trên cùng tệp mà không vướng khóa.
#     how: >
#       cd Desktop; npm test. npm run dist (ELECTRON_BUILDER_CACHE đặt vào một
#       thư mục tạm vì sandbox của phiên agent, như phiên 14; lần đầu EXDEV,
#       lần hai EPERM khi đổi tên thư mục 7zip vừa giải nén trong cache mới,
#       lần ba đạt), rồi npm run test:packaged. cd UI; npm run e2e. Rồi chạy
#       UI/tests/fixtures/switchable_backend.py (cwd Backend, CT_* với thư mục
#       tạm) và ghi down/up vào switchable_backend.control ba vòng.
#     result: >
#       Desktop npm test: 14 passed (1.8m). dist: exit 0, bộ cài 116 726 762
#       byte, win-unpacked\resources\backend\Backend.py có
#       take_database_ownership, không có thư mục tests, site-packages 16 148
#       295 byte. test:packaged: 6 passed (40.3s), "python processes of the
#       package after the suite: []". UI e2e: 4 passed (22.7s); client_list S3
#       covers [unreachable, ok]. Fixture: ba vòng "down in 0.41-0.56 s, up
#       again in 1.02-1.13 s", mỗi lần bật là một "READY on port" ngay lần
#       đầu, không có "restart attempt ... failed" hay ERROR; fixture thoát mã 0.
#       Mốc %APPDATA%\CommissionTracker: không tồn tại trước và sau phiên.
#     recorded_at: 2026-09-27T22:21:00+07:00
#
# NOTES: []
# ===WCA-CHECKPOINT-END===
"""Main of the backend layer (clause_b_backend).

Logistics only: read configuration, prepare the foundation resource, wire
and register the workflows in the order of .design/03_classification.md
(Step 3.2), serve HTTP on the loopback host, signal READY, and stop when the
desktop Main closes standard input (data_schema.yaml,
clause_a_common.mandatory_rules).

Run from this folder:  python Backend.py   (launch values come from CT_* env vars)
"""

import errno
import logging
import os
import re
import sqlite3
import sys
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlsplit

import uvicorn
import yaml
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from workflows.backup_data.adapters import ArchiveFiles, DatabaseSnapshots, StagingArea
from workflows.backup_data.adapters import SystemClock as BackupClock
from workflows.backup_data.entities import ArchiveSettings, StagingSettings
from workflows.backup_data.routers import create_backup_data_routers
from workflows.backup_data.services import BackupDataService
from workflows.manage_client.adapters import ClientRepository
from workflows.manage_client.routers import create_manage_client_routers
from workflows.manage_client.services import ManageClientService
from workflows.manage_commission.adapters import ClientDirectory, CommissionRepository
from workflows.manage_commission.routers import create_manage_commission_routers
from workflows.manage_commission.services import ManageCommissionService
from workflows.manage_watermark_profile.adapters import ProfileRepository
from workflows.manage_watermark_profile.routers import create_manage_watermark_profile_routers
from workflows.manage_watermark_profile.services import ManageWatermarkProfileService
from workflows.record_payment.adapters import CommissionDirectory, PaymentRepository
from workflows.record_payment.routers import create_record_payment_routers
from workflows.record_payment.services import RecordPaymentService
from workflows.scaffold_backend import adapters as scaffold_backend_adapters
from workflows.send_reminder.adapters import ReminderRepository, ReminderSources, SystemClock
from workflows.send_reminder.routers import create_send_reminder_routers
from workflows.send_reminder.services import SendReminderService
from workflows.update_progress.adapters import CommissionDirectory as ProgressCommissionDirectory
from workflows.update_progress.adapters import ProgressRepository
from workflows.update_progress.entities import StageOption
from workflows.update_progress.routers import create_update_progress_routers
from workflows.update_progress.services import UpdateProgressService
from workflows.view_income_report.adapters import IncomeSources
from workflows.view_income_report.routers import create_view_income_report_routers
from workflows.view_income_report.services import ViewIncomeReportService

if os.name == "nt":
    import msvcrt
else:
    import fcntl

LAYER_ROOT = Path(__file__).resolve().parent
LAYER_CONFIG_FILE = LAYER_ROOT / "configs" / "backend.yaml"

# Workflows whose Configs the Main reads, in wiring order.
WORKFLOW_CONFIG_FILES = {
    "scaffold_backend": LAYER_ROOT / "workflows" / "scaffold_backend" / "configs.yaml",
    "manage_client": LAYER_ROOT / "workflows" / "manage_client" / "configs.yaml",
    "backup_data": LAYER_ROOT / "workflows" / "backup_data" / "configs.yaml",
    "manage_commission": LAYER_ROOT / "workflows" / "manage_commission" / "configs.yaml",
    "record_payment": LAYER_ROOT / "workflows" / "record_payment" / "configs.yaml",
    "update_progress": LAYER_ROOT / "workflows" / "update_progress" / "configs.yaml",
    "manage_watermark_profile": LAYER_ROOT / "workflows" / "manage_watermark_profile" / "configs.yaml",
    "view_income_report": LAYER_ROOT / "workflows" / "view_income_report" / "configs.yaml",
    "send_reminder": LAYER_ROOT / "workflows" / "send_reminder" / "configs.yaml",
}

_SEMVER = re.compile(
    r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)"
    r"(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$"
)

log = logging.getLogger("backend.main")


# --- 1. configuration --------------------------------------------------------

def load_yaml(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data or {}


class LaunchValueError(Exception):
    pass


@dataclass(frozen=True)
class LaunchValues:
    port: int
    db_file_path: str
    ai_service_base_url: str
    app_version: str


def read_launch_values(environ, names: dict, loopback_host: str) -> LaunchValues:
    def required(key: str) -> str:
        value = environ.get(names[key])
        if value is None or value == "":
            raise LaunchValueError(f"{names[key]} is missing")
        return value

    raw_port = required("port")
    if not raw_port.isdigit() or not 1 <= int(raw_port) <= 65535:
        raise LaunchValueError(f"{names['port']} must be an integer in 1..65535, got {raw_port!r}")

    db_file_path = required("db_file_path")
    if not os.path.isabs(db_file_path):
        raise LaunchValueError(f"{names['db_file_path']} must be an absolute path, got {db_file_path!r}")

    ai_service_base_url = required("ai_service_base_url")
    try:
        parts = urlsplit(ai_service_base_url)
        ai_port = parts.port
    except ValueError:
        ai_port = None
        parts = None
    if (
        parts is None
        or parts.scheme != "http"
        or parts.hostname != loopback_host
        or ai_port is None
        or parts.path not in ("", "/")
        or parts.query
        or parts.fragment
    ):
        raise LaunchValueError(
            f"{names['ai_service_base_url']} must be http://{loopback_host}:<port>, got {ai_service_base_url!r}"
        )

    app_version = required("app_version")
    if not _SEMVER.fullmatch(app_version):
        raise LaunchValueError(f"{names['app_version']} must be a semantic version, got {app_version!r}")

    return LaunchValues(int(raw_port), db_file_path, ai_service_base_url.rstrip("/"), app_version)


# --- ownership of the database file ------------------------------------------
# clause_a_common.mandatory_rules (Data Schema 6.2.0): at most one backend uses
# db_file_path at a time. The Main holds a non-blocking exclusive OS lock on a
# separate lock file next to the database file, for the whole life of the
# process. The database file itself is never locked, so other SQLite
# connections (tests, backup_data) are not blocked. The OS drops the lock when
# the process ends, however it ends.

# errno values of "another handle holds the lock" (msvcrt: EACCES/EDEADLOCK;
# flock: EWOULDBLOCK/EAGAIN, EACCES on some systems). Any other OSError is a
# real I/O failure, not "in use".
_LOCK_HELD_ERRNOS = {errno.EACCES, errno.EAGAIN, errno.EWOULDBLOCK, getattr(errno, "EDEADLOCK", errno.EDEADLK)}


def _try_lock(fd: int) -> bool:
    try:
        if os.name == "nt":
            msvcrt.locking(fd, msvcrt.LK_NBLCK, 1)  # byte 0; the position of a new fd is 0
        else:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError as exc:
        if exc.errno in _LOCK_HELD_ERRNOS:
            return False
        raise
    return True


class DatabaseOwnership:
    """The lock held on the lock file. release() is idempotent."""

    def __init__(self, fd: int, lock_path: str) -> None:
        self._fd: int | None = fd
        self.lock_path = lock_path

    def release(self) -> None:
        if self._fd is None:
            return
        fd, self._fd = self._fd, None
        try:
            # Unlock explicitly before closing: on Windows the release of a
            # lock left to the OS happens "depending on system resources".
            if os.name == "nt":
                msvcrt.locking(fd, msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(fd, fcntl.LOCK_UN)
        except OSError:
            pass
        finally:
            os.close(fd)


def take_database_ownership(
    db_file_path: str, *, lock_file_suffix: str, retry_window_ms: int, retry_interval_ms: int
) -> DatabaseOwnership | None:
    """Lock <db_file_path><suffix>, retrying for retry_window_ms. None when
    another process keeps it. Never opens nor creates the database file. The
    folder must exist. Raises OSError on a real I/O failure."""
    lock_path = db_file_path + lock_file_suffix
    # os.open fds are not inherited by child processes (PEP 446).
    fd = os.open(lock_path, os.O_RDWR | os.O_CREAT, 0o644)
    deadline = time.monotonic() + retry_window_ms / 1000
    try:
        while not _try_lock(fd):
            if time.monotonic() >= deadline:
                os.close(fd)
                return None
            time.sleep(retry_interval_ms / 1000)
    except BaseException:
        os.close(fd)
        raise
    return DatabaseOwnership(fd, lock_path)


# --- HTTP server of the layer ------------------------------------------------

def _error_json(label: int, code: str, message: str, details: dict | None = None) -> JSONResponse:
    # clause_a_common.error_body
    return JSONResponse(status_code=label, content={"code": code, "message": message, "details": details})


def create_http_app(layer_cfg: dict) -> FastAPI:
    """The layer's HTTP application. layer_cfg is configs/backend.yaml as
    read by the Main."""
    # Generated docs are undeclared entries: disabled.
    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

    # CORS for the renderer (clause_a_common.mandatory_rules): exactly one
    # origin, no credentials. The middleware sits inside Starlette's
    # ServerErrorMiddleware and outside the exception handlers below, so every
    # declared response and every error_body carries the headers; an uncaught
    # exception (raw 500) does not. It answers preflights itself: no OPTIONS
    # route exists. A request without an Origin header passes through untouched.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(layer_cfg["ui_origin"])],
        allow_methods=[str(m) for m in layer_cfg["http_server"]["cors_allow_methods"]],
        allow_headers=[str(h) for h in layer_cfg["http_server"]["cors_allow_headers"]],
        allow_credentials=False,
    )

    # Safety net: endpoints validate their own inputs, but a body that is not
    # JSON at all is rejected by FastAPI before the endpoint runs. Answer
    # with the contract's 400 instead of FastAPI's 422.
    @app.exception_handler(RequestValidationError)
    async def _request_validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        errors = [{"loc": [str(p) for p in e.get("loc", ())], "msg": str(e.get("msg", ""))} for e in exc.errors()]
        return _error_json(400, "ERR_VALIDATION", "Malformed request.", {"errors": errors})

    # Undeclared paths / methods: keep the status, but answer with error_body.
    @app.exception_handler(StarletteHTTPException)
    async def _http_exception(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = "ERR_NOT_FOUND" if exc.status_code == 404 else "ERR_VALIDATION"
        return _error_json(exc.status_code, code, str(exc.detail))

    return app


class _LayerServer(uvicorn.Server):
    async def startup(self, sockets=None) -> None:
        await super().startup(sockets=sockets)
        # started is set only once the socket is listening; every workflow
        # was registered before the server was created.
        if self.started and not self.should_exit:
            sys.stdout.buffer.write(b"READY\n")
            sys.stdout.buffer.flush()


def _stop_when_stdin_closes(server: uvicorn.Server) -> None:
    # select() does not work on pipes on Windows: block on os.read in a
    # daemon thread; EOF (the desktop Main closed our stdin) asks the server
    # to stop.
    try:
        fd = sys.stdin.fileno()
    except (AttributeError, ValueError, OSError):
        log.warning("no usable standard input; the layer can only be stopped by a signal")
        return

    def watch() -> None:
        try:
            while os.read(fd, 4096):
                pass
        except OSError:
            pass
        log.info("standard input closed; stopping")
        server.should_exit = True

    threading.Thread(target=watch, name="stdin-watch", daemon=True).start()


# --- wiring of the workflows -------------------------------------------------

def wire_workflows(
    app: FastAPI, db, configs: dict, *, app_version: str | None = None, reminder_clock=None, backup_clock=None
) -> dict:
    """Wire business workflows in the order of .design/03_classification.md,
    Step 3.2. Returns the in_process entries kept for later callers.

    app_version: the CT_APP_VERSION the Main read at launch, handed to
    backup_data. main() always passes it. It has no default value: when it is
    None, backup_data is not wired (the workflow tests of the other workflows
    call this function without it).
    reminder_clock, backup_clock: the clocks handed to send_reminder's and
    backup_data's Services. The Main never passes them: the machine clock is
    used. Only workflow tests pass a fake clock here."""
    in_process = {}

    # Order 2: manage_client
    client_repo = ClientRepository(db)
    client_repo.ensure_storage()
    client_service = ManageClientService(client_repo)
    client_router, get_client_summary = create_manage_client_routers(client_service)
    app.include_router(client_router)
    in_process["get_client_summary"] = get_client_summary

    # Order 2: backup_data — storage-level operation: no table, no call to any
    #          workflow. Its Adapters receive db_connection; its Services the
    #          running app_version and the machine clock.
    if app_version is not None:
        backup_cfg = configs["backup_data"]
        archive_settings = ArchiveSettings(**backup_cfg["archive"])
        chunk_bytes = int(backup_cfg["io_chunk_bytes"])
        backup_service = BackupDataService(
            DatabaseSnapshots(db, chunk_bytes),
            ArchiveFiles(archive_settings, chunk_bytes),
            StagingArea(db, StagingSettings(**backup_cfg["staging"]), archive_settings.temp_suffix, chunk_bytes),
            backup_clock if backup_clock is not None else BackupClock(),
            archive_settings,
            app_version,
        )
        app.include_router(create_backup_data_routers(backup_service))

    # Order 3: manage_commission — its Adapters receive get_client_summary.
    supported_currencies = [str(c) for c in configs["manage_commission"]["supported_currencies"]]
    commission_repo = CommissionRepository(db)
    commission_repo.ensure_storage()
    commission_service = ManageCommissionService(
        commission_repo, ClientDirectory(in_process["get_client_summary"]), supported_currencies
    )
    commission_router, get_commission_summary, list_commission_index = create_manage_commission_routers(
        commission_service
    )
    app.include_router(commission_router)
    in_process["get_commission_summary"] = get_commission_summary
    in_process["list_commission_index"] = list_commission_index

    # Order 4: record_payment — its Adapters receive get_commission_summary.
    payment_repo = PaymentRepository(db)
    payment_repo.ensure_storage()
    payment_service = RecordPaymentService(
        payment_repo, CommissionDirectory(in_process["get_commission_summary"])
    )
    payment_router, list_payment_ledger = create_record_payment_routers(payment_service)
    app.include_router(payment_router)
    in_process["list_payment_ledger"] = list_payment_ledger  # for view_income_report

    # Order 4: update_progress — its Adapters receive get_commission_summary.
    #          The Services refuse an unusable stage_catalog: the layer then
    #          does not start.
    stage_catalog = [
        StageOption(stage=entry["stage"], kind=entry["kind"])
        for entry in configs["update_progress"]["stage_catalog"]
    ]
    progress_repo = ProgressRepository(db)
    progress_repo.ensure_storage()
    progress_service = UpdateProgressService(
        progress_repo, ProgressCommissionDirectory(in_process["get_commission_summary"]), stage_catalog
    )
    progress_router, list_progress_board = create_update_progress_routers(progress_service)
    app.include_router(progress_router)
    in_process["list_progress_board"] = list_progress_board  # for view_income_report, send_reminder

    # Order 4: manage_watermark_profile — calls no one. The Services refuse
    #          strength_presets that differ from the shared value: the layer
    #          then does not start.
    strength_presets = [str(p) for p in configs["manage_watermark_profile"]["strength_presets"]]
    profile_repo = ProfileRepository(db)
    profile_repo.ensure_storage()
    profile_service = ManageWatermarkProfileService(profile_repo, strength_presets)
    profile_router, get_watermark_profile = create_manage_watermark_profile_routers(profile_service)
    app.include_router(profile_router)
    in_process["get_watermark_profile"] = get_watermark_profile  # for apply_watermark, verify_watermark

    # Order 5: apply_watermark (later session)

    # Order 6: view_income_report — no storage, no db_connection; its Adapters
    #          receive the three in_process entries wired above. Its Configs
    #          are empty. (verify_watermark: later session)
    income_service = ViewIncomeReportService(
        IncomeSources(
            in_process["list_commission_index"],
            in_process["list_progress_board"],
            in_process["list_payment_ledger"],
        )
    )
    app.include_router(create_view_income_report_routers(income_service))

    # Order 6: send_reminder — its Adapters receive list_commission_index and
    #          list_progress_board, and the machine clock. Its Configs are
    #          empty. Called by reminder_ticker (desktop layer) over http.
    reminder_repo = ReminderRepository(db)
    reminder_repo.ensure_storage()
    reminder_service = SendReminderService(
        reminder_repo,
        ReminderSources(in_process["list_commission_index"], in_process["list_progress_board"]),
        reminder_clock if reminder_clock is not None else SystemClock(),
    )
    app.include_router(create_send_reminder_routers(reminder_service))

    return in_process


# --- lifecycle ---------------------------------------------------------------

def main() -> int:
    layer_cfg = load_yaml(LAYER_CONFIG_FILE)
    server_cfg = layer_cfg["http_server"]
    failure_code = int(layer_cfg["startup_failure_exit_code"])
    logging.basicConfig(
        stream=sys.stderr,
        level=server_cfg["log_level"].upper(),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    # 1. Read configuration: launch values, then every workflow's Configs.
    try:
        launch = read_launch_values(os.environ, layer_cfg["launch_env"], layer_cfg["loopback_host"])
    except LaunchValueError as exc:
        log.error("cannot start: %s", exc)
        return failure_code
    configs = {name: load_yaml(path) for name, path in WORKFLOW_CONFIG_FILES.items()}

    # 2a. Ownership of the database file, before it is opened or created
    #     (clause_a_common.mandatory_rules). Only the folder is created first.
    ownership_cfg = layer_cfg["database_ownership"]
    try:
        scaffold_backend_adapters.ensure_database_folder(launch.db_file_path)
        ownership = take_database_ownership(
            launch.db_file_path,
            lock_file_suffix=str(ownership_cfg["lock_file_suffix"]),
            retry_window_ms=int(ownership_cfg["retry_window_ms"]),
            retry_interval_ms=int(ownership_cfg["retry_interval_ms"]),
        )
    except OSError as exc:
        log.error("cannot take ownership of database %s: %s", launch.db_file_path, exc)
        return failure_code
    if ownership is None:
        log.error("cannot start: database %s is in use by another backend process", launch.db_file_path)
        return int(ownership_cfg["database_in_use_exit_code"])

    try:
        return _run(layer_cfg, launch, configs, failure_code)
    finally:
        # Released after db.close() (in _run), before the process exits.
        ownership.release()


def _run(layer_cfg: dict, launch: LaunchValues, configs: dict, failure_code: int) -> int:
    server_cfg = layer_cfg["http_server"]

    # 2b. Foundation workflow (order 1): scaffold_backend -> db_connection.
    try:
        db = scaffold_backend_adapters.open_connection(launch.db_file_path, **configs["scaffold_backend"])
    except (OSError, sqlite3.Error) as exc:
        log.error("cannot open database %s: %s", launch.db_file_path, exc)
        return failure_code

    try:
        # 3-5. Business workflows: Adapters (and their storage), Services, Routers.
        app = create_http_app(layer_cfg)
        try:
            wire_workflows(app, db, configs, app_version=launch.app_version)
        except Exception:
            log.exception("cannot wire workflows")
            return failure_code

        # 7. Serve on the loopback host; READY once listening.
        server = _LayerServer(
            uvicorn.Config(
                app,
                host=layer_cfg["loopback_host"],
                port=launch.port,
                lifespan="off",
                log_config=None,
                access_log=False,
                log_level=server_cfg["log_level"],
                timeout_graceful_shutdown=server_cfg["graceful_shutdown_timeout_s"],
            )
        )
        _stop_when_stdin_closes(server)
        try:
            server.run()
        except KeyboardInterrupt:
            # Ctrl+C when run by hand: uvicorn re-raises the captured signal
            # after a graceful shutdown.
            pass
        if not server.started:
            return failure_code
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
