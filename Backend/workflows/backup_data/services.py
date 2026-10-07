# ===WCA-CHECKPOINT-START===
# workflow: backup_data
# clause: clause_b_backend
# component: services
# last_updated_by: coding-agent@2026-10-07#1
# last_updated_at: 2026-10-07T10:29:51.1415583+07:00
#
# EXPERIENCES:
#   - id: backup_data-EXP-001
#     content: >
#       Đo trước khi viết (việc 2 của plan): sqlite3.Connection.backup() chạy
#       được bên trong SharedConnection.read(), nên không phải sửa
#       scaffold_backend và không phải mở kết nối thứ hai. Trên tệp 61,6 MB:
#       0,252 s, bản chụp mở được, PRAGMA integrity_check = ok, đủ 60000 dòng,
#       journal_mode delete (một tệp, không -wal/-shm). Một luồng gọi
#       transaction() sau 10 ms phải chờ hết bản chụp (lấy được khóa ở +0,233 s,
#       sau khi chụp xong ở +0,232 s); dòng nó ghi không có trong bản chụp và có
#       trong DB sống. Hệ quả: trong lúc chụp, mọi yêu cầu của backend (đọc lẫn
#       ghi) chờ; với DB cỡ vài MB là vài chục ms. VACUUM INTO không thử, vì
#       không chạy được trong giao dịch. Bẫy đã gặp: Connection.backup() thử lại
#       VÔ HẠN khi SQLite trả BUSY/LOCKED (một kết nối khác của tiến trình khác
#       giữ khóa tệp), và suốt thời gian đó người gọi vẫn giữ khóa của
#       db_connection, nên cả backend đứng yên (kiểm thử khóa DB đầu tiên treo
#       hơn 400 s). Adapters truyền progress=_stop_when_blocked, vốn ném
#       OperationalError khi nhận BUSY/LOCKED; SQLite đã chờ busy_timeout trước
#       khi trả BUSY, nên đó là "bỏ cuộc sau busy_timeout", ra 500
#       ERR_STORAGE_IO. Không thể gây lỗi này bằng monkeypatch: sqlite3.Connection
#       là kiểu bất biến.
#   - id: backup_data-EXP-002
#     content: >
#       Định dạng tệp sao lưu (chỉ workflow này biết): zip nén deflate, đuôi
#       .ctbackup, đúng hai thành phần, theo thứ tự manifest.json rồi data.db.
#       manifest = { format "commission-tracker-backup", format_version 1,
#       app_version, created_at, purpose, db_size_bytes, db_sha256 } với size và
#       sha256 của data.db. Zip vì thư viện chuẩn có sẵn (không thêm phụ thuộc),
#       mở được bằng công cụ bất kỳ nếu họa sĩ cần lấy tay DB ra, và có CRC cho
#       từng thành phần. sha256 và size trong manifest là bản kiểm thứ hai độc
#       lập với CRC của zip, và là thứ ràng buộc data.db với manifest. size_bytes
#       và sha256 trả về của POST /backups là của CHÍNH TỆP SAO LƯU (băm tệp tạm
#       trước khi đổi tên), không phải của data.db. Tên:
#       commission-tracker-<purpose>-<YYYYMMDD-HHMMSS>.ctbackup theo giờ máy từ
#       đồng hồ Main tiêm vào; trùng thì -2, -3... (tối đa max_name_attempts =
#       1000 lần thử, hết thì 500). Mọi giá trị này nằm ở configs.yaml, không có
#       giá trị ranh giới nào. Ghi nguyên tử: mkstemp trong CHÍNH thư mục đích
#       (cùng ổ đĩa), ghi zip vào đó, rồi đổi tên; Windows dùng os.rename (hỏng
#       với FileExistsError nếu tên đã có, không bao giờ ghi đè), nơi khác dùng
#       os.link rồi unlink. Chọn vậy thay vì os.replace vì os.replace ghi đè, và
#       thay vì os.link cho mọi nơi vì exFAT/FAT (ổ USB, nơi họa sĩ hay lưu bản
#       sao lưu) không có hard link. Hỏng giữa chừng: tệp tạm bị xóa (trong
#       Adapters khi ghi zip hỏng, trong Services khi đổi tên hỏng); bản chụp DB
#       nằm trong một thư mục tạm của hệ điều hành và luôn bị dọn.
#   - id: backup_data-EXP-003
#     content: >
#       Vị trí tệp chờ: <thư mục chứa tệp dữ liệu đang chạy>/restore-staging/data.db
#       (tên trong configs.yaml). Thư mục lấy qua PRAGMA database_list của chính
#       db_connection (Bước 5.6 cho phép đi qua tài nguyên của workflow nền
#       tảng), không đọc lại CT_DB_FILE_PATH, không đoán: Main đã trao đúng
#       một tài nguyên, và nó là thứ biết tệp thật đang mở. Cùng cây thư mục nên
#       cùng ổ đĩa, để restore_data sau này đổi tên nguyên tử. Ghi vào
#       data.db.part rồi os.replace, sau khi qua mọi kiểm tra. Quyết định ngoài
#       plan: MỖI lần prepare_restore đi qua bước 404 là xóa tệp chờ cũ trước, nên
#       staged_db_path = null luôn đi kèm "không có tệp chờ nào" (kể cả khi lần
#       trước hợp lệ), và chỉ có một tệp chờ. Cái giá: một lần chuẩn bị hỏng
#       hủy tệp chờ hợp lệ của lần trước; restore_data dùng đường dẫn của lần
#       trả lời gần nhất, nên không bị ảnh hưởng. Tệp chờ cùng thư mục với data.db
#       và data.db.lock nên một backend thứ hai chạy trên nó (khứ hồi) dùng
#       staging/data.db.lock của riêng nó.
#   - id: backup_data-EXP-004
#     content: >
#       Chia mã lỗi. 400 ERR_VALIDATION: Routers kiểm định dạng (thân JSON,
#       không thừa trường, đường dẫn tuyệt đối, purpose đúng hai giá trị), và
#       Services báo destination_dir không tồn tại hoặc không phải thư mục cũng
#       là 400 với details.errors[0].loc = [backup_request, destination_dir]
#       (create_backup không có nhãn 404, và ERR_VALIDATION là "outside its
#       allowed values"). 404 ERR_NOT_FOUND chỉ cho prepare_restore, khi
#       archive_path không phải tệp (không có, hay là thư mục). 500
#       ERR_STORAGE_IO: sqlite3.Error và OSError ở Adapters (quyền, đĩa đầy,
#       tệp khóa, không tạo được thư mục chờ). 200 cho MỌI kết luận về nội dung
#       tệp sao lưu: hỏng, lạ, thiếu, thừa, sai checksum, mới hơn. Lỗi của chính
#       tệp zip (BadZipFile, zlib.error, EOFError, NotImplementedError,
#       RuntimeError của zip mã hóa) là is_valid false, không phải 500; OSError
#       khi mở tệp (PermissionError) mới là 500. Lỗi lập trình vẫn nổi lên thành
#       lỗi thật, không bị giả làm 500 (main-EXP-005). Thứ tự kiểm của
#       prepare_restore: tên thành phần (có đường dẫn, rồi đúng hai tên) ->
#       manifest (JSON, đối tượng, format, format_version, app_version SemVer,
#       created_at có độ lệch giờ, purpose, size, sha) -> giải data.db vào tệp
#       chờ tạm, đọc tối đa db_size_bytes + 1 byte (chặn tệp dài hơn công bố,
#       tức bom nén) -> size -> sha256 -> integrity_check -> so phiên bản. Chỉ
#       tới được "hợp lệ nhưng không tương thích" khi mọi kiểm tra trước đó đạt.
#       Khi manifest đọc được thì app_version (nếu là chuỗi) và created_at (nếu
#       là timestamp) được trả kể cả khi tệp không hợp lệ; không đọc được thì null.
#   - id: backup_data-EXP-005
#     content: >
#       So phiên bản theo SemVer 2.0 (parse_semver, compare_semver ở Services,
#       vì "tương thích" là quyết định): lõi major.minor.patch so số; bản có
#       hậu tố tiền phát hành nhỏ hơn bản phát hành; định danh số so số và nhỏ
#       hơn định danh chữ; chuỗi định danh ngắn hơn là tiền tố thì nhỏ hơn; phần
#       +build bị bỏ. Cùng ngữ pháp với CT_APP_VERSION mà Main chấp nhận (không
#       kiểm số 0 đầu của định danh số tiền phát hành), để mọi giá trị Main nhận
#       đều qua được Services. Nó là bản sao có chủ đích của regex trong
#       Backend.py: workflow không import Main.
#   - id: backup_data-EXP-006
#     content: >
#       Giới hạn đã biết. (1) Không kiểm nội dung nghiệp vụ của data.db (Bước
#       5.6): "hợp lệ" nghĩa là đúng định dạng tệp, đúng checksum, và SQLite nói
#       integrity_check = ok; một DB hợp lệ nhưng thiếu bảng, hay do build có
#       bảng khác, vẫn qua, và việc nâng cấp bảng là của từng workflow lúc khởi
#       động (Data Schema, mandatory_rules). (2) integrity_check mở tệp chờ ở
#       chế độ chỉ đọc nên không đổi gì trong nó. (3) Một tệp sao lưu lớn thì
#       băm và giải nén chạy trong luồng của yêu cầu, không giữ khóa
#       db_connection (prepare_restore không đụng DB đang chạy); create_backup
#       thì giữ khóa suốt lúc chụp, không suốt lúc nén. (4) Không xóa, không
#       liệt kê bản sao lưu cũ, không có hạn mức dung lượng. (5) Chưa chạy nhánh
#       POSIX của publish (os.link) trên Linux. (6) wire_workflows trong Main
#       nhận app_version là tham số từ khóa tùy chọn và KHÔNG đăng ký backup_data
#       khi nó là None, vì 20 chỗ gọi trong kiểm thử cũ không truyền nó; main()
#       luôn truyền.
#
# UNSOLVED_PROBLEMS: []
#
# EVIDENCE:
#   - claim: >
#       Việc 2: chụp DB qua SharedConnection hiện có là chạy được và nhất quán,
#       và một luồng ghi chờ hết bản chụp.
#     how: >
#       Script ngoài mã dự án (thư mục scratchpad của phiên, measure_backup.py),
#       import workflows.scaffold_backend.adapters của dự án, Python 3.13.12 của
#       Backend/env, Windows 11: DB 61 599 744 byte (60000 dòng x 1 KB), chụp
#       bằng src.backup(dest) trong "with db.read()", rồi chụp lại với
#       pages=50 trong khi một luồng khác gọi db.transaction() sau 10 ms.
#     result: >
#       backup() trong read(): không lỗi, 0,252 s. Bản chụp: integrity_check
#       "ok", 60000 dòng, 61 599 744 byte, journal_mode delete. Luồng ghi:
#       yêu cầu lúc +0,010 s, có khóa lúc +0,233 s, bản chụp xong lúc +0,232 s
#       (chờ: True); bản chụp 60000 dòng, 0 dòng "late"; DB sống 60001 dòng.
#       PRAGMA database_list = [(0, 'main', <đường dẫn tuyệt đối của data.db>)].
#       Chạy lại lúc ghi checkpoint (bắt đầu 2026-10-07T10:29:49.7675789+07:00):
#       0,240 s, integrity ok, writer có khóa +0,221 s sau khi chụp xong +0,221 s.
#     recorded_at: 2026-10-07T10:29:51.1415583+07:00
#   - claim: >
#       create_backup và prepare_restore đúng hợp đồng qua HTTP, trên SQLite
#       thật: 104 ca của workflow đạt. create_backup 25 ca (201 đủ năm trường,
#       tên theo mẫu, size_bytes và sha256 khớp tệp trên đĩa, manifest và
#       data.db trong zip đúng, DB sống không đổi; ba lần cùng một giây ra ba
#       tên khác nhau và không ghi đè tệp có sẵn; pre_restore; 14 dạng yêu cầu
#       sai và destination_dir không tồn tại/là tệp/tương đối -> 400, không tạo
#       tệp; thân không phải JSON -> 400; lỗi ghi zip, lỗi đổi tên, khóa DB thật
#       -> 500 ERR_STORAGE_IO không còn tệp tạm; 15 yêu cầu ghi trong lúc sao
#       lưu đều 201 và bản sao lưu mở được, integrity ok; không có app_version
#       thì không đăng ký). prepare_restore 79 ca (7 thân sai và thân không phải
#       JSON -> 400; không có tệp, là thư mục -> 404; không đọc được tệp và
#       không tạo được thư mục chờ -> 500; không phải zip, rỗng, zip cắt cụt,
#       thiếu manifest, thiếu data.db, thành phần thừa, 5 tên thành phần là
#       đường dẫn, mục thư mục, 6 manifest không đọc được, 19 trường manifest
#       sai, thiếu trường, sha256 sai, size lệch +-100, data.db rác / hỏng một
#       trang / cắt đôi nhưng khớp checksum, data.db dài hơn công bố: mỗi ca
#       200, is_valid false, có reason đúng loại, không còn tệp chờ; 16 cặp
#       phiên bản SemVer gồm tiền phát hành, so số và so chữ; chuẩn bị hai lần
#       chỉ còn một tệp chờ, lần hỏng sau lần hợp lệ xóa tệp chờ; DB sống và tệp
#       sao lưu không đổi byte nào).
#     how: >
#       cd Backend; env\Scripts\python.exe -m pytest -q workflows/backup_data
#       (Python 3.13.12 của Backend/env, Windows 11, AVG và ReasonLabs bật, mọi
#       tệp trong thư mục tạm của pytest). Số ca theo hàm kiểm thử:
#       env\Scripts\python.exe -m pytest --collect-only -q workflows/backup_data
#     result: >
#       104 passed, 1 warning (DeprecationWarning của starlette.testclient)
#       in 29,75 s.
#     recorded_at: 2026-10-07T10:29:09.2410570+07:00
#   - claim: >
#       Khứ hồi trên hai tiến trình Backend.py thật: dữ liệu sao lưu rồi chuẩn
#       bị khôi phục, chạy một backend thứ hai trên staged_db_path, trả lại đúng
#       dữ liệu. Và tệp do bản mới hơn tạo ra thì hợp lệ nhưng không tương thích.
#     how: >
#       cd Backend; env\Scripts\python.exe -m pytest -v
#       workflows/backup_data/tests/test_backup_data.py::test_round_trip_a_second_backend_on_the_staging_file_serves_the_same_data
#       workflows/backup_data/tests/test_backup_data.py::test_an_archive_made_by_a_newer_build_is_valid_but_not_compatible
#       (tiến trình con thật sys.executable Backend.py, CT_* như Desktop,
#       stdin pipe; A: 3 khách có tên tiếng Việt và 3 đơn rồi POST /backups và
#       POST /backups/restore-preparations, ghi thêm một khách sau sao lưu; B:
#       CT_DB_FILE_PATH = staged_db_path; ca hai: CT_APP_VERSION 9.9.9 sao lưu,
#       rồi 0.1.0 chuẩn bị).
#     result: >
#       2 passed. B: GET /clients và GET /commissions bằng đúng (==) danh sách
#       đã đọc từ A trước khi sao lưu (3 và 3); khách ghi sau sao lưu không có
#       trong B; B nhận POST /clients (201); A vẫn có 4 khách. Staged path =
#       <thư mục data của A>/restore-staging/data.db. Cả hai tiến trình dừng mã
#       0 khi đóng stdin. Ca bản mới hơn: backup app_version "9.9.9";
#       chuẩn bị trên "0.1.0" -> is_valid true, is_compatible false,
#       staged_db_path null, reason nêu 9.9.9 và 0.1.0, không có thư mục chờ.
#     recorded_at: 2026-10-07T10:29:09.2410570+07:00
#   - claim: >
#       Ba phép cắn: mỗi kiểm tra có ca kiểm thử bắt được khi bị bỏ.
#     how: >
#       Sửa tạm services.py, chạy cd Backend; env\Scripts\python.exe -m pytest
#       -q workflows/backup_data, rồi khôi phục (Grep xác nhận không còn "if
#       False"): (a) "if digest.sha256 != manifest.db_sha256" thành "if False
#       and ..."; (b) "compare_semver(...) > 0" thành "< 0"; (c) "if integrity
#       != 'ok'" thành "if False and ...".
#     result: >
#       (a) 2 failed, 102 passed: test_database_whose_sha256_differs_from_the_manifest
#       và test_readable_manifest_still_reports_version_and_date_...; (b) 15 failed,
#       89 passed: 13 ca của test_compatible_means_not_newer_by_semver_precedence,
#       test_an_invalid_preparation_leaves_no_staging_file_even_after_a_valid_one
#       và test_an_archive_made_by_a_newer_build_is_valid_but_not_compatible; (c)
#       3 failed, 101 passed: data.db rác, hỏng một trang, và cắt đôi (cùng
#       checksum). Khôi phục: 104 passed. Phép thử bổ sung không thành ca cố định
#       vì nó treo: bỏ progress=_stop_when_blocked thì kiểm thử khóa DB không
#       kết thúc (đã thấy lúc phát triển, hơn 400 s phải dừng tay).
#     recorded_at: 2026-10-07T10:29:09.2410570+07:00
#   - claim: >
#       Toàn bộ kiểm thử backend đạt 3 lần liên tiếp với workflow mới ráp nối
#       (460 cũ + 104 mới); Desktop và giao diện vẫn đạt với backend mới.
#     how: >
#       cd Backend; env\Scripts\python.exe -m pytest -q (3 lần liên tiếp). cd
#       Desktop; npm test (Node v24.14.1, npm 11.11.0). cd UI; npm run e2e
#       (không đặt CT_WALKTHROUGH_RUNNER); git status --short UI/evidence.
#     result: >
#       pytest: 564 passed, 1 warning in 414,99 s / 382,19 s / 460,99 s
#       (09:52:02, 09:58:59, 10:05:23). Desktop npm test: 31 passed (3,9 phút).
#       UI npm run e2e: 70 passed (5,0 phút); git status --short UI/evidence
#       trống.
#     recorded_at: 2026-10-07T10:29:09.2410570+07:00
#   - claim: >
#       Bản đóng gói (Python nhúng) sao lưu và chuẩn bị khôi phục được;
#       %APPDATA% không bị đụng.
#     how: >
#       cd Desktop; xóa packaging\stage và release; npm run dist; npm run
#       test:packaged. Rồi chạy release\win-unpacked\Commission Tracker.exe
#       --ct-test-data-dir=<thư mục tạm> --ct-test-no-dialog, đọc cổng trong log
#       (stderr: "backend READY on port N"), POST /backups tới một thư mục tạm,
#       rồi POST /backups/restore-preparations với tệp vừa tạo (Invoke-WebRequest
#       trên 127.0.0.1); dừng ứng dụng. %APPDATA%\CommissionTracker chụp
#       (tên, kích thước, giờ ghi, SHA-256) trước phiên và sau cùng.
#     result: >
#       npm run dist: lần đầu hỏng ở bước đóng NSIS với EXDEV (đổi tên thư mục
#       cache của electron-builder, bẫy sandbox đã ghi từ phiên 15), win-unpacked
#       đã dựng xong; lần hai, ELECTRON_BUILDER_CACHE đặt vào thư mục tạm của
#       phiên, từ trạng thái sạch: exit 0, release\Commission Tracker Setup
#       0.1.0.exe. test:packaged: 8 passed (1,0 phút), "python processes of the
#       package after the suite: []". Đo tay: POST /backups -> 201
#       {"archive_path":"...\\commission-tracker-manual-20261007-102833.ctbackup",
#       "app_version":"0.1.0","size_bytes":3267,"sha256":"8c802324705b2a4d7eebde3046f2675e4975d4e9c981c43b569bfa5dfa6775d6",
#       "created_at":"2026-10-07T10:28:33+07:00"}; POST
#       /backups/restore-preparations -> 200 {"is_valid":true,"is_compatible":true,
#       "app_version":"0.1.0","created_at":"2026-10-07T10:28:33+07:00","reason":null,
#       "staged_db_path":"<thư mục data>\\CommissionTracker\\restore-staging\\data.db"}
#       (tệp chờ tồn tại); không còn tiến trình nào của gói sau khi dừng. Python
#       nhúng có đủ zipfile, zlib, hashlib. %APPDATA%\CommissionTracker: hai tệp,
#       data.db 114688 byte ghi 2026-09-28T21:09:42.7922654+07:00 SHA-256
#       B1996554853459435A6A6FB4B333C22C7160251337349379D13647F87ECF390B và
#       data.db.lock 0 byte, giống hệt ở đầu phiên (09:25:02) và cuối phiên
#       (10:28:43).
#     recorded_at: 2026-10-07T10:29:09.2410570+07:00
#
# NOTES:
#   - content: >
#       Đề xuất: backup_data từ đang_chờ_triển_khai lên đã_hoàn_thiện (Data
#       Schema 9.0.2 -> bản kế tiếp, Giai đoạn 6.6): đủ năm lớp (Entities,
#       Adapters, Services, Routers, Configs), ráp nối ở Main, hai điểm giao tiếp
#       đúng nhãn của API Contract 4.0.0, không UNSOLVED_PROBLEMS. Không tự sửa
#       hợp đồng. Chặn việc commit: .gitignore gốc dòng 258 (Backup*/) khớp
#       thư mục backup_data trên Windows (git bỏ qua hoa thường), nên cả
#       Backend/workflows/backup_data/ bị bỏ qua; cần một ngoại lệ trong
#       .gitignore trước khi Project Owner tạo commit.
#     written_at: 2026-10-07
# ===WCA-CHECKPOINT-END===
"""Services of backup_data: every business decision of the workflow.

Decided here: whether the destination is usable, what an archive is called and
what to do when that name is taken, what the manifest says, which findings make
an archive invalid, what "compatible" means (SemVer 2.0 precedence: an archive
is compatible when its app_version is not newer than the running one), and
that a new preparation replaces the previous staging file.

The Services never look inside the database: it is a block, handled by the
Adapters (05-edge-cases.md, Step 5.6).
"""

import json
import re
from dataclasses import asdict
from datetime import datetime

# StorageIOError is raised by the Adapters and passes through unchanged; it is
# re-exported so the Routers depend on Services only.
from .adapters import (  # noqa: F401
    ArchiveFiles,
    ArchiveReadError,
    DatabaseSnapshots,
    StagingArea,
    StorageIOError,
    SystemClock,
)
from .entities import ArchiveRecord, ArchiveSettings, BackupRequest, Manifest, RestoreStaging

# data_schema.yaml, backup_request_record.purpose.
PURPOSES = ("manual", "pre_restore")

# Semantic Versioning 2.0.0: major.minor.patch, optional pre-release, optional
# build metadata. The same grammar the Main accepts for CT_APP_VERSION.
_SEMVER = re.compile(
    r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)"
    r"(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$"
)
_SHA256_HEX = re.compile(r"^[0-9a-f]{64}$")


def parse_semver(text: str) -> tuple[tuple[int, int, int], tuple[str, ...]] | None:
    """((major, minor, patch), pre-release identifiers) or None when `text`
    is not a semantic version. Build metadata is dropped: it takes no part in
    precedence."""
    match = _SEMVER.fullmatch(text)
    if match is None:
        return None
    core = (int(match.group(1)), int(match.group(2)), int(match.group(3)))
    pre = tuple(match.group(4).split(".")) if match.group(4) else ()
    return core, pre


def _identifier_key(identifier: str) -> tuple[int, int, str]:
    # Numeric identifiers compare as numbers and rank below alphanumeric ones;
    # alphanumeric ones compare in ASCII order.
    if identifier.isascii() and identifier.isdigit():
        return (0, int(identifier), "")
    return (1, 0, identifier)


def compare_semver(left: str, right: str) -> int:
    """-1, 0 or 1: SemVer 2.0 precedence of two valid versions."""
    left_core, left_pre = parse_semver(left)  # type: ignore[misc]
    right_core, right_pre = parse_semver(right)  # type: ignore[misc]
    if left_core != right_core:
        return -1 if left_core < right_core else 1
    if left_pre == right_pre:
        return 0
    if not left_pre:
        return 1  # a release ranks above any of its pre-releases
    if not right_pre:
        return -1
    left_keys = [_identifier_key(i) for i in left_pre]
    right_keys = [_identifier_key(i) for i in right_pre]
    if left_keys == right_keys:
        return 0
    return -1 if left_keys < right_keys else 1  # a shorter list ranks below its extension


def _parse_timestamp(value: object) -> datetime | None:
    # data_schema.yaml formats.timestamp: ISO 8601 with a UTC offset.
    if not isinstance(value, str):
        return None
    try:
        moment = datetime.fromisoformat(value)
    except ValueError:
        return None
    return moment if moment.tzinfo is not None else None


class DestinationInvalidError(Exception):
    """destination_dir does not exist or is not a folder."""

    def __init__(self, destination_dir: str) -> None:
        super().__init__(f"destination_dir {destination_dir!r} is not an existing folder")
        self.destination_dir = destination_dir


class ArchiveNotFoundError(Exception):
    """archive_path names no file."""

    def __init__(self, archive_path: str) -> None:
        super().__init__(f"archive_path {archive_path!r} is not an existing file")
        self.archive_path = archive_path


class _Invalid(Exception):
    """A finding that makes the archive invalid. Never leaves the Services."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


class _Incompatible(Exception):
    """A valid archive made by a newer build. Never leaves the Services."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


class BackupDataService:
    def __init__(
        self,
        snapshots: DatabaseSnapshots,
        archives: ArchiveFiles,
        staging: StagingArea,
        clock: SystemClock,
        settings: ArchiveSettings,
        app_version: str,
    ) -> None:
        # clock: the machine clock (SystemClock) in the real process; tests
        # may hand over another object with a now() method.
        if parse_semver(app_version) is None:
            raise ValueError(f"app_version must be a semantic version, got {app_version!r}")
        self._snapshots = snapshots
        self._archives = archives
        self._staging = staging
        self._clock = clock
        self._s = settings
        self._app_version = app_version

    # --- create_backup ---------------------------------------------------------

    def create_backup(self, request: BackupRequest) -> ArchiveRecord:
        if not self._archives.directory_exists(request.destination_dir):
            raise DestinationInvalidError(request.destination_dir)
        now = self._clock.now()
        with self._snapshots.take() as snapshot:
            manifest = Manifest(
                format=self._s.format,
                format_version=self._s.format_version,
                app_version=self._app_version,
                created_at=now.isoformat(),
                purpose=request.purpose,
                db_size_bytes=snapshot.digest.size_bytes,
                db_sha256=snapshot.digest.sha256,
            )
            temp = self._archives.write_temp_archive(request.destination_dir, asdict(manifest), snapshot.path)
            try:
                digest = self._archives.digest_of(temp)
                final = self._publish_unique(temp, request.destination_dir, request.purpose, now)
            except BaseException:
                self._archives.discard(temp)
                raise
        return ArchiveRecord(
            archive_path=final,
            app_version=self._app_version,
            size_bytes=digest.size_bytes,
            sha256=digest.sha256,
            created_at=now,
        )

    def _publish_unique(self, temp: str, directory: str, purpose: str, now: datetime) -> str:
        # <prefix>-<purpose>-<YYYYMMDD-HHMMSS>[-2, -3, ...]<extension>: the
        # first name nobody holds. An existing file is never replaced.
        base = f"{self._s.file_name_prefix}-{purpose}-{now.strftime(self._s.file_name_time_format)}"
        for attempt in range(1, self._s.max_name_attempts + 1):
            name = base + ("" if attempt == 1 else f"-{attempt}") + self._s.extension
            final = self._archives.publish(temp, directory, name)
            if final is not None:
                return final
        raise StorageIOError(f"no free archive name after {self._s.max_name_attempts} attempts in {directory}")

    # --- prepare_restore -------------------------------------------------------

    def prepare_restore(self, archive_path: str) -> RestoreStaging:
        if self._archives.path_kind(archive_path) != "file":
            raise ArchiveNotFoundError(archive_path)
        # One staging file at a time, and the latest answer defines it: an
        # earlier one is dropped now, so "staged_db_path is null" always
        # means "no staging file exists".
        self._staging.clear()

        found: dict[str, str | None] = {"app_version": None, "created_at": None}
        in_progress = None

        def verdict(is_valid: bool, is_compatible: bool, reason: str | None) -> RestoreStaging:
            return RestoreStaging(
                archive_path=archive_path,
                is_valid=is_valid,
                is_compatible=is_compatible,
                app_version=found["app_version"],
                created_at=found["created_at"],
                reason=reason,
                staged_db_path=None,
            )

        try:
            manifest = self._read_manifest(archive_path, found)
            paths = self._staging.prepare()
            in_progress = paths
            digest = self._archives.extract_component(
                archive_path, self._s.database_name, paths.in_progress, manifest.db_size_bytes
            )
            if digest.size_bytes != manifest.db_size_bytes:
                raise _Invalid(
                    f"{self._s.database_name} is {digest.size_bytes} bytes (at least; read was cut "
                    f"there), the manifest says {manifest.db_size_bytes}"
                )
            if digest.sha256 != manifest.db_sha256:
                raise _Invalid(f"{self._s.database_name} does not match the SHA-256 in the manifest")
            integrity = self._staging.integrity_verdict(paths.in_progress)
            if integrity != "ok":
                raise _Invalid(f"{self._s.database_name} fails the database integrity check: {integrity}")
            if compare_semver(manifest.app_version, self._app_version) > 0:
                raise _Incompatible(
                    f"the archive was made by app_version {manifest.app_version}, which is newer "
                    f"than the running {self._app_version}"
                )
            self._staging.promote(paths)
            in_progress = None
            return RestoreStaging(
                archive_path=archive_path,
                is_valid=True,
                is_compatible=True,
                app_version=found["app_version"],
                created_at=found["created_at"],
                reason=None,
                staged_db_path=paths.final,
            )
        except _Invalid as exc:
            return verdict(False, False, exc.reason)
        except _Incompatible as exc:
            return verdict(True, False, exc.reason)
        except ArchiveReadError as exc:
            return verdict(False, False, f"the archive cannot be read as a zip: {exc}")
        finally:
            if in_progress is not None:
                self._staging.discard(in_progress)

    def _read_manifest(self, archive_path: str, found: dict[str, str | None]) -> Manifest:
        s = self._s
        names = self._archives.list_components(archive_path)
        if any("/" in n or "\\" in n or ".." in n or ":" in n for n in names):
            raise _Invalid("a component name contains a path")
        if len(names) != 2 or set(names) != {s.manifest_name, s.database_name}:
            raise _Invalid(
                f"the components must be exactly {s.manifest_name} and {s.database_name}; "
                f"found {list(names)[:5]}"
            )
        raw = self._archives.read_component(archive_path, s.manifest_name, s.manifest_max_bytes)
        if len(raw) > s.manifest_max_bytes:
            raise _Invalid(f"{s.manifest_name} is larger than {s.manifest_max_bytes} bytes")
        try:
            data = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, ValueError, RecursionError):
            raise _Invalid(f"{s.manifest_name} is not valid JSON") from None
        if not isinstance(data, dict):
            raise _Invalid(f"{s.manifest_name} is not a JSON object")

        # The manifest is readable: whatever it says about version and date
        # is reported, even when the archive is then found invalid.
        if isinstance(data.get("app_version"), str):
            found["app_version"] = data["app_version"]
        if _parse_timestamp(data.get("created_at")) is not None:
            found["created_at"] = data["created_at"]

        version = data.get("format_version")
        if data.get("format") != s.format or isinstance(version, bool) or version != s.format_version:
            raise _Invalid(
                f"unknown archive format {data.get('format')!r} version {data.get('format_version')!r}"
            )
        if not isinstance(data.get("app_version"), str) or parse_semver(data["app_version"]) is None:
            raise _Invalid("the manifest app_version is not a semantic version")
        if found["created_at"] is None:
            raise _Invalid("the manifest created_at is not a timestamp with a UTC offset")
        if data.get("purpose") not in PURPOSES:
            raise _Invalid("the manifest purpose is not one of the known purposes")
        size = data.get("db_size_bytes")
        if isinstance(size, bool) or not isinstance(size, int) or size < 0:
            raise _Invalid("the manifest db_size_bytes is not a non-negative integer")
        sha = data.get("db_sha256")
        if not isinstance(sha, str) or _SHA256_HEX.fullmatch(sha) is None:
            raise _Invalid("the manifest db_sha256 is not a lowercase hex SHA-256")
        return Manifest(
            format=data["format"],
            format_version=data["format_version"],
            app_version=data["app_version"],
            created_at=data["created_at"],
            purpose=data["purpose"],
            db_size_bytes=size,
            db_sha256=sha,
        )
