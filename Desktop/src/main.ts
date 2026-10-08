// ===WCA-CHECKPOINT-START===
// workflow: main
// clause: clause_d_desktop
// component: main
// last_updated_by: coding-agent@2026-10-08#2
// last_updated_at: 2026-10-08T19:09:25.3415976+07:00
//
// EXPERIENCES:
//   - id: main-EXP-001
//     content: >
//       Nguồn hợp đồng của từng giá trị biên trong configs/desktop.json (JSON
//       không có chú thích nên ghi ở đây). boundary.loopback_host,
//       boundary.ui_origin, boundary.renderer_bridge: chép nguyên từ
//       data_schema.yaml 6.1.0 clause_a_common.shared_values cùng tên.
//       boundary.db_file_relative_to_app_data "CommissionTracker/data.db": phần
//       sau %APPDATA% của shared_values.db_file_path; Main ghép sau
//       app.getPath('appData') để có đường dẫn tuyệt đối cho CT_DB_FILE_PATH, ở
//       cả bản chạy từ mã nguồn lẫn bản đóng gói (không theo thư mục cài đặt,
//       không theo productName). backend.launch_env (CT_PORT, CT_DB_FILE_PATH,
//       CT_AI_SERVICE_BASE_URL, CT_APP_VERSION) và backend.ready_line "READY":
//       clause_a_common.mandatory_rules. CT_APP_VERSION là app.getVersion(), tức
//       "version" của package.json (0.1.0), ở cả bản đóng gói. Mọi giá trị khác
//       của tệp là giá trị nội bộ của Main: ready_timeout_ms 30000,
//       shutdown_timeout_ms 10000 (phải lớn hơn graceful_shutdown_timeout_s 5
//       của Backend/configs/backend.yaml), start_attempts 3, failure_exit_code
//       1, content_types, renderer.non_fatal_first_load_errors, mục packaged,
//       tên cờ kiểm thử và tên đối số của preload.
//   - id: main-EXP-002
//     content: >
//       Preload sandbox. Main trao hai giá trị qua
//       webPreferences.additionalArguments: tên bridge
//       (--ct-renderer-bridge=<renderer_bridge>) và
//       --ct-backend-base-url=http://127.0.0.1:<cổng>. Preload đọc process.argv
//       (có sẵn trong preload sandbox, đã kiểm bằng chạy thật) rồi gọi
//       contextBridge.exposeInMainWorld(tên, Object.freeze({backendBaseUrl})).
//       Preload chỉ được require('electron'), không đọc được
//       configs/desktop.json, nên hai tiền tố đối số được viết lại thành hằng
//       số trong preload.ts và phải trùng preload.arguments trong tệp cấu hình.
//       Kiểm thử 1 thấy bridge thì tức là hai nơi trùng nhau. Đo được: trong
//       renderer, Object.keys là ['backendBaseUrl'], Object.isFrozen là true,
//       typeof invoke/require/process đều là 'undefined', và gán đè
//       window.commissionTracker không đổi được giá trị. tsc xuất
//       "use strict" + exports cho preload.js và preload sandbox chạy được tệp
//       đó. Không dùng IPC đồng bộ: không cần kênh nào, nên không có kênh để
//       lộ ra. (Từ phiên 33 bridge có thêm invoke và preload nhận thêm đối số
//       --ct-ipc-addresses=: xem main-EXP-029.)
//   - id: main-EXP-003
//     content: >
//       protocol.handle('app'). Scheme được đăng ký standard, secure,
//       supportFetchAPI, corsEnabled trước 'ready'. Handler dựng lại đường dẫn
//       theo các bước: so host với phần sau app:// của ui_origin (khác thì
//       404), decodeURIComponent pathname (lỗi thì 404), từ chối \0, bỏ các
//       dấu / hay \ ở đầu, path.resolve vào thư mục gốc, rồi yêu cầu
//       path.relative không rỗng, không là '..', không bắt đầu bằng '..\' và
//       không tuyệt đối. Trình phân tích URL của Chromium đã tự gỡ '..' và
//       '%2e%2e' trước khi tới handler (thành /x và 404 vì không có tệp);
//       các dạng mà Chromium không gỡ (..%2f, ..%5c, dấu \ thật, đường dẫn ổ
//       đĩa tuyệt đối đã mã hóa) do phép kiểm path.relative chặn. Trong Node,
//       new URL('app://...').origin là "null" với scheme không đặc biệt: so
//       origin phải dựng lại từ protocol + '//' + host (originOf()).
//   - id: main-EXP-004
//     content: >
//       stdout của backend về theo từng mảnh bất kỳ: Main ghép vào bộ đệm,
//       tách theo '\n', bỏ '\r' cuối dòng, rồi mới so với ready_line. Dòng
//       READY thứ hai hay dòng lạ thì chỉ ghi log "backend stdout (unexpected)".
//       Backend giả fake_backend_ignore_stdin.py in "REA" rồi "DY\r\n" để kiểm
//       việc này. stderr của backend được chuyển tiếp nguyên văn ra stderr của
//       Main. Log của Main có tiền tố "[desktop-main] " và ghi ra stderr. Các
//       dòng mà kiểm thử và phép đo dựa vào: "running from source" hoặc
//       "running the packaged app (resources: ...)"; "backend started (pid N)
//       on port P: <interpreter> <script> in <thư mục làm việc>"; "backend
//       READY on port P"; "serving the interface from <thư mục> at
//       <ui_origin>"; "opening the window at ..."; "first load finished: ...".
//   - id: main-EXP-005
//     content: >
//       Cây tiến trình của backend, đo được trên Windows. (1) Chạy từ mã nguồn
//       (môi trường ảo): Main spawn Backend\env\Scripts\python.exe, đó là một
//       trình phóng; nó sinh một python.exe thật làm con, kèm một conhost.exe.
//       child.kill() (TerminateProcess) lên trình phóng thì con cũng chết theo,
//       vì trình phóng giữ con trong một job object có KILL_ON_JOB_CLOSE (ca 3
//       và 7 của npm test). (2) Bản đóng gói (Python nhúng): không còn trình
//       phóng. Cây là python.exe (con trực tiếp của tiến trình chính Electron,
//       ParentProcessId = PID của Main) cùng một conhost.exe; child.kill() tác
//       động thẳng lên python.exe thật. Ở cả hai trường hợp Main không kết thúc
//       cả cây và không gọi taskkill /T. Khi Main bị kết thúc đột ngột
//       (taskkill /F lên tiến trình chính), pipe stdin đóng và backend tự thoát:
//       với Python nhúng đo được 279 ms và 1649 ms ở hai lượt (ca P5 của npm
//       run test:packaged); các
//       tiến trình con khác của Electron và conhost cũng không còn.
//       Đọc cây tiến trình trên Windows: ParentProcessId KHÔNG đáng tin khi
//       PID bị tái sử dụng. Windows giữ nguyên ParentProcessId khi cha chết
//       và cấp lại PID cũ cho tiến trình mới, nên một tiến trình lạ tạo từ
//       trước (ví dụ bốn rsAppUI.exe của ReasonLabs ở lần P4 hỏng, DSK-1) có
//       thể mang ParentProcessId = PID của backend. tests/helpers.ts
//       buildTree(rows, rootPid) chỉ nhận con khi CreationDate của con không
//       sớm hơn của cha; stillAlive so cả PID, tên và CreationDate.
//       CreationDate lấy bằng $_.CreationDate.ToFileTimeUtc().ToString()
//       (FILETIME dạng chuỗi, so bằng BigInt): ConvertTo-Json mặc định chỉ
//       cho "\/Date(ms)\/", và FILETIME (~1,3e17) vượt Number.MAX_SAFE_INTEGER.
//   - id: main-EXP-006
//     content: >
//       Hộp thoại lỗi và kiểm thử. fatal(message) ghi "[desktop-main] FATAL:
//       <message>" ra stderr trước, rồi mới gọi dialog.showErrorBox (trừ khi
//       có cờ --ct-test-no-dialog), rồi shutdown(failure_exit_code). Kiểm thử
//       luôn truyền cờ đó và so nội dung dòng FATAL. Các lần chạy thoát trước
//       khi có cửa sổ (ca 2, 3, 5, 6, 9, 10) được Playwright Test spawn thẳng
//       electron.exe, vì _electron.launch ném lỗi khi ứng dụng thoát trước khi
//       có cửa sổ. Ca có cửa sổ dùng _electron.launch và đọc stderr qua
//       app.process(). shutdown() chỉ chạy một lần, dừng backend (đóng stdin,
//       chờ, rồi kết thúc) xong mới app.exit(code); before-quit bị
//       preventDefault cho tới lúc đó. Main ghi dòng "opening the window at
//       ..." ngay trước loadURL, để kiểm thử chứng minh được là không có cửa
//       sổ nào mở.
//   - id: main-EXP-007
//     content: >
//       Thứ tự khởi động: (1) cờ thư mục dữ liệu đặt appData và userData;
//       (2) requestSingleInstanceLock, khóa này tính theo userData nên mỗi
//       kiểm thử có thư mục dữ liệu riêng thì không va nhau, còn ca 9 dùng
//       chung một thư mục; (3) đăng ký scheme; (4) sau whenReady mới chọn cổng
//       AI (không khởi động dịch vụ AI) và cổng backend, rồi start backend,
//       chờ READY; (5) kiểm thư mục gốc renderer; (6) protocol.handle, gỡ menu
//       nếu là bản đóng gói, rồi BrowserWindow. Thư mục gốc được kiểm sau
//       READY, đúng thứ tự d→e của plan, nên khi thiếu UI/dist (hay thiếu
//       index.html, ca 10) thì backend được dừng êm với mã 0.
//       BackendProcess giữ port trên đối tượng và start(port) tạo tiến trình
//       mới mỗi lần, để restore_data sau này dừng rồi khởi động lại được trên
//       cùng cổng. Cổng bị chiếm (đo được): uvicorn báo WinError 10048 và
//       thoát mã 1; Main thử lại với cổng mới. Phiên 13 không đổi thứ tự này.
//   - id: main-EXP-008
//     content: >
//       Bố cục bản đóng gói và cách Main chọn đường dẫn (chặng C, plan phiên 13
//       D2, D3). resources/ của bản đóng gói có app.asar (chỉ dist/main.js,
//       dist/preload.js, configs/desktop.json, package.json), cùng ba thư mục
//       do electron-builder chép từ packaging/stage: python/ (Python nhúng
//       3.13.12 và Lib/site-packages), backend/ (Backend.py, configs/,
//       workflows/ không có tests/, kèm .pyc), ui/ (bản build của UI). Main
//       chọn theo app.isPackaged: chạy từ mã nguồn thì dùng backend.from_source
//       và renderer.root_dir tính theo thư mục Desktop/ như trước; bản đóng
//       gói thì dùng mục "packaged" của desktop.json, tính theo
//       process.resourcesPath. Trong gói, LAYER_ROOT của Main là
//       resources\app.asar và configs/desktop.json được đọc từ bên trong
//       asar. Ở bản đóng gói Main truyền Backend.py bằng đường dẫn tuyệt đối,
//       để CommandLine của tiến trình tự cho thấy script nào đang chạy
//       (Backend.py dùng __file__ nên LAYER_ROOT của backend vẫn đúng); chạy
//       từ mã nguồn vẫn truyền "Backend.py" tương đối như cũ. Khi
//       app.isPackaged, Main gọi Menu.setApplicationMenu(null) ngay trước khi
//       tạo cửa sổ (Q5b): không còn Ctrl+R hay DevTools; chạy từ mã nguồn giữ
//       menu. productName "Commission Tracker" làm userData mặc định khi chạy
//       từ mã nguồn đổi từ %APPDATA%\commission-tracker sang
//       %APPDATA%\Commission Tracker; CT_DB_FILE_PATH không đổi vì ghép từ
//       appData.
//   - id: main-EXP-009
//     content: >
//       Tệp python313._pth của Python nhúng (chỉ tồn tại trong
//       packaging/stage và trong gói, do packaging/prepare_runtime.mjs viết).
//       Đo được với tệp gốc ("python313.zip", "."): sys.path chỉ gồm
//       python313.zip và thư mục python\, thư mục của script KHÔNG được thêm,
//       sys.flags.isolated = 1 và ignore_environment = 1. Lỗi đầu tiên là
//       "ModuleNotFoundError: No module named 'uvicorn'"; thêm
//       Lib\site-packages thì lỗi thành "No module named 'workflows'"; thêm
//       ..\backend (tính theo thư mục của ._pth) thì Backend.py in READY và
//       thoát mã 0 khi stdin đóng. Nội dung cuối: python313.zip, .,
//       Lib\site-packages, ..\backend. Không bật "import site": site-packages
//       không có tệp .pth nào cần xử lý, và site sẽ thêm site-packages riêng
//       của người dùng (%APPDATA%\Python) vào sys.path. Nhờ ._pth, Python nhúng
//       bỏ qua PYTHONHOME và PYTHONPATH (ca P6 đạt với hai biến trỏ vào thư mục
//       không tồn tại), nên Main không phải lọc biến PYTHON* khỏi môi trường
//       của backend; Main vẫn truyền process.env như cũ. Không sửa Backend.py.
//       Bẫy khi viết ._pth bằng shell: printf biến "\b" trong "..\backend"
//       thành ký tự backspace; viết tệp bằng Node hay công cụ soạn tệp.
//   - id: main-EXP-010
//     content: >
//       Cờ kiểm thử ở bản đóng gói (D4, việc tồn Q1). Bản đóng gói bỏ qua năm
//       cờ có thể trỏ ra ngoài gói: renderer_root, backend_interpreter,
//       backend_script, backend_working_dir, first_backend_port (danh sách ở
//       packaged.ignored_test_flags). Mỗi cờ có mặt được ghi một dòng
//       "ignoring test flag <tiền tố>... in the packaged app" (không ghi giá
//       trị). Bản đóng gói vẫn nhận data_dir (không có nó, kiểm thử sẽ ghi vào
//       %APPDATA% thật) và no_dialog. Ca P3 truyền backend giả và thư mục giao
//       diện không tồn tại: app vẫn chạy bằng backend và giao diện trong gói.
//   - id: main-EXP-011
//     content: >
//       ERR_ABORTED (Q5a). Khi một điều hướng khác bắt đầu lúc lần nạp đầu
//       chưa xong (ví dụ page.reload() của Playwright, hay người dùng bấm
//       Ctrl+R khi chạy từ mã nguồn), promise của win.loadURL bị từ chối với
//       code "ERR_ABORTED", errno -3; code cũ coi đó là lỗi chết (FATAL, thoát
//       mã 1). Nay Main bỏ qua đúng các code trong
//       renderer.non_fatal_first_load_errors (["ERR_ABORTED"]), ghi "first load
//       of <url> was aborted (ERR_ABORTED, -3); continuing", và mọi lỗi nạp
//       khác vẫn là lỗi chết. Tái hiện ổn định: trang tests/fixtures/
//       slow_first_load chặn luồng 3 giây trong <head>, kiểm thử gọi
//       page.reload() ngay sau firstWindow(). Một trang tự gọi
//       location.reload() trong <head> KHÔNG tái hiện được (Electron 44 không
//       từ chối loadURL khi điều hướng do trang tự khởi sau khi đã commit).
//   - id: main-EXP-012
//     content: >
//       Renderer (chuyển từ NOTE "Cho phiên B2 (UI)" sau khi B2 xong). Main nạp
//       <ui_origin>/index.html từ thư mục gốc renderer; mọi đường dẫn của bản
//       build phải là tương đối hoặc tuyệt đối theo gốc (Vite: base './' hoặc
//       '/'), vì chúng được phục vụ dưới app://commission-tracker/.
//       Content-Type được đặt cho .html, .js, .mjs, .css, .svg, .png, .json;
//       đuôi khác (ví dụ .woff2, .ico) là application/octet-stream, muốn thêm
//       thì sửa renderer.content_types. Không có dự phòng kiểu SPA: đường dẫn
//       không có tệp cho 404, nên điều hướng nằm trong trạng thái, không nằm
//       trong URL. CSP do UI tự đặt bằng thẻ meta (connect-src
//       http://127.0.0.1:*); vì vậy từ renderer của giao diện thật không fetch
//       được app://... (kiểm thử phải dùng net.fetch ở tiến trình chính). Bridge
//       đọc từ window.commissionTracker.backendBaseUrl; từ phiên 33 có thêm
//       invoke (main-EXP-029).
//   - id: main-EXP-013
//     content: >
//       Công cụ đóng gói (npm run dist = build, rồi node
//       packaging/prepare_runtime.mjs, rồi electron-builder --win nsis --x64).
//       prepare_runtime.mjs: tải gói nhúng về packaging/cache, kiểm SHA-256
//       theo packaging/python_runtime.json (lần đầu tự ghi hash, sai thì dừng),
//       xóa và dựng lại packaging/stage, giải nén bằng python -m zipfile của
//       môi trường ảo, kiểm vcruntime140.dll và vcruntime140_1.dll, viết ._pth,
//       pip install --only-binary=:all: --no-compile --target
//       stage\python\Lib\site-packages -r Backend\requirements.txt, chép
//       Backend.py, configs/**, workflows/** (chỉ .py và .yaml, bỏ tests/,
//       __pycache__/, .pytest_cache/), compileall -f --invalidation-mode
//       unchecked-hash bằng chính Python nhúng, npm run build trong UI rồi chép
//       UI/dist (dừng nếu thiếu UI/node_modules), rồi kiểm thử khói: Backend.py
//       của stage phải in READY và thoát mã 0 khi stdin đóng. electron-builder
//       26.15.3 đóng gói được Electron 44.4.5. Nó gọi "npm list" qua
//       powershell.exe: thư mục WindowsPowerShell\v1.0 phải có trong PATH
//       (máy Project Owner từng thiếu; điều kiện build ở main-EXP-017). Dòng
//       log "signing with signtool.exe" xuất hiện dù
//       không có chứng chỉ; kết quả đo: bộ cài và Commission Tracker.exe là
//       NotSigned, python.exe giữ nguyên chữ ký PSF. pip --target sinh thêm
//       site-packages\bin\*.exe (trình phóng trỏ về môi trường ảo); từ phiên
//       14 (DSK-4) prepare_runtime xóa thư mục bin ngay sau pip install.
//   - id: main-EXP-014
//     content: >
//       Kiểm thử bản đóng gói (npm run test:packaged, playwright.packaged.config.ts,
//       tests/packaged/; npm test bỏ qua thư mục này). (1) _electron.launch với
//       executablePath có dấu cách chạy exe qua "cmd.exe /d /s /c": app.process()
//       là cmd.exe; PID của tiến trình chính lấy bằng app.evaluate(() =>
//       process.pid). Mã thoát của cmd.exe là mã thoát của exe. (2) Stderr chỉ
//       đọc được từ lúc launch() trả về, nên mất các dòng log đầu; ca cần
//       toàn bộ log (P3, công cụ đo) spawn exe trực tiếp và đóng cửa sổ bằng
//       taskkill /PID không có /F (WM_CLOSE, Main dừng êm). (3) Sau khi app đã
//       đóng, gọi app.process() sẽ ném lỗi: giữ tham chiếu từ lúc khởi chạy.
//       (4) Yêu cầu tới backend, kể cả preflight OPTIONS, được ghi bằng
//       netLog.startLogging(file, {captureMode: 'includeSensitive'}) rồi đọc
//       các sự kiện HTTP_TRANSACTION_SEND_REQUEST_HEADERS và
//       HTTP_TRANSACTION_READ_RESPONSE_HEADERS. (5) Thân POST của http là JSON
//       có khóa là tên đầu vào (api_contract endpoint_forms.http), ví dụ
//       {"client_input": {...}}.
//   - id: main-EXP-015
//     content: >
//       Thời gian khởi động của bản đóng gói (node
//       tests/packaged/measure_startup.cjs, phiên 14; máy có AVG và Reason
//       Cybersecurity bật, Defender tắt). Trong release\ (có ngoại lệ thư mục
//       của cả hai antivirus): dòng log đầu của Main sau 54-170 ms, backend
//       spawn sau 0,11-0,25 s, READY sau 0,7-1,0 s, cửa sổ nạp xong sau
//       0,84-1,16 s, kể cả lượt đầu của exe có hash mới (đợt A1, A2). Ở thư
//       mục đã cài không có ngoại lệ (đợt C): lượt đầu của exe mới, dòng log
//       đầu tới sau 64 s; các lượt sau 1,2-1,6 s, cửa sổ sau 4,1-4,5 s (khớp
//       số "bình thường" 1,3-1,6 s / 4,1 s của phiên 13, đo trước khi có
//       ngoại lệ). Phần chậm nằm TRƯỚC khi JavaScript của Main chạy: Win32
//       ghi tiến trình được tạo sau 4 ms nhưng lời gọi CreateProcess của bên
//       khởi chạy chỉ trả về sau 64 s (main-EXP-018). ready_timeout_ms 30000
//       tính từ lúc spawn backend nên không bị ảnh hưởng; người dùng chờ cửa
//       sổ lâu ở lần mở đầu tiên của mỗi exe mới. Không sửa được trong code.
//   - id: main-EXP-016
//     content: >
//       Log vòng đời của Main (phiên 14, việc 6a; chỉ thêm dòng, không đổi
//       hành vi). Dòng đầu tiên của mọi lần chạy: "main started: pid N, parent
//       pid P, process start <ISO của performance.timeOrigin>, argv [...]",
//       là mốc "JavaScript của Main đã chạy". Ở bản đóng gói argv che giá trị
//       của năm cờ bị bỏ qua (argvForLog, như main-EXP-010), vì P3 kiểm log
//       không chứa đường dẫn giả; --ct-test-data-dir vẫn hiện đủ. Thêm các
//       dòng "second-instance: another launch asked for this instance (argv
//       ..., working directory ...)", "window-all-closed", "before-quit
//       (shutdown started: x, backend running: y)", "received SIGINT" /
//       "received SIGTERM". Dòng khóa một-bản thất bại ("another instance is
//       already running...") và "backend (pid N) exited with code C (signal
//       S)" đã có từ trước. Không kiểm thử cũ nào phải sửa.
//   - id: main-EXP-017
//     content: >
//       Điều kiện build trên Windows (DSK-5). (1) PATH có
//       %SystemRoot%\System32\WindowsPowerShell\v1.0: electron-builder gọi
//       powershell.exe, thiếu thì "spawn powershell.exe ENOENT"; máy Project
//       Owner từng thiếu, và máy agent cũng thiếu, nên đây không phải chuyện
//       hiếm. prepare_runtime.mjs kiểm việc này đầu tiên và dừng với thông báo
//       nêu đúng thư mục cần thêm. (2) Antivirus: đặt ngoại lệ theo thư mục
//       cho Desktop\release và Desktop\packaging\stage (ENV-2). Có ngoại lệ,
//       5 lần dist trong phiên 14 chỉ một lần hỏng: electron-builder "EPERM:
//       rename release\win-unpacked.tmp -> win-unpacked" (lần dist thứ 6 của
//       phiên), vài giây sau không tệp nào trong win-unpacked.tmp còn bị giữ,
//       chạy lại cùng lệnh thì đạt. Tức ngoại lệ giảm nhưng không loại hẳn
//       lỗi này. (3) Không để chương trình nào mở tệp trong release (ENV-3).
//       (4) prepare_runtime.mjs xóa release\ ngay đầu (rồi packaging\stage),
//       thử 5 lần cách 3 s; không xóa được thì dừng, nêu tệp còn bị giữ (các
//       tệp còn sót sau lần xóa hỏng), gợi ý resmon (CPU, Associated Handles)
//       và ngoại lệ antivirus. Lỗi EPERM khi đổi tên nằm trong
//       electron-builder, sau bước này: gặp thì chạy lại npm run dist.
//   - id: main-EXP-018
//     content: >
//       Chẩn đoán DSK-2 và DSK-3 (phiên 14, đợt C, bản đã cài ở
//       %TEMP%\ct-install-14, không có ngoại lệ antivirus): ở lượt đầu của
//       exe mới, một thành phần ngoài ứng dụng giữ CreateProcess của Main thật
//       64 s (Win32 tạo tiến trình lúc +4 ms, spawn() của Node chỉ trả về lúc
//       +64006 ms, JavaScript của Main chạy lúc +64078 ms) và trong lúc đó
//       chạy một BẢN SAO: Commission Tracker.exe, CommandLine trùng từng ký
//       tự (cùng --ct-test-data-dir), ParentProcessId = PID của node chạy
//       script đo, dù script chỉ gọi spawn một lần. Bản sao xuất hiện lúc
//       +3,6 s, bản thân nó bị giữ tới khoảng +37,7 s (mới sinh gpu-process,
//       utility), khởi động backend riêng (python.exe của gói, +38,4 s), còn
//       sống ở +40,9 s và đã biến mất ở +64,0 s; Main thật chỉ chạy sau đó,
//       backend của nó khởi động ở +64,2 s. Đây là giả thuyết H1 của plan,
//       đúng với dữ liệu. Trong lượt này hai Main cùng thư mục dữ liệu cùng
//       tồn tại khoảng 37 s, nhưng Main thật chưa chạy JavaScript, và hai
//       backend không chạy chồng. Hành vi này khớp với cơ chế phân tích hành
//       vi trong hộp cát của antivirus (chạy exe lạ chưa ký thay người dùng
//       rồi mới thả bản thật), nhưng CHƯA xác định là AVG hay ReasonLabs.
//       Trong release\ có ngoại lệ (đợt A1, A2, B: 16 lượt) không thấy bản sao
//       nào. H2, H3, H4 bị loại cho lượt này: Main thật dừng êm (WM_CLOSE,
//       "standard input closed", mã 0), script chỉ spawn một lần, và Main
//       không làm gì trong 64 s đó vì JavaScript của nó chưa chạy.
//   - id: main-EXP-019
//     derived_from: main-PROB-001
//     content: >
//       Bản sao do antivirus chạy (chuyển từ main-PROB-001 theo DSK-12, plan
//       phiên 26: vấn đề đã có hướng xử lý ở mọi mặt; id cũ không dùng lại).
//       Hiện tượng: ở lần mở đầu của một Commission Tracker.exe mới ở thư mục
//       không có ngoại lệ antivirus, một thành phần ngoài ứng dụng chạy một
//       bản sao của exe với cùng dòng lệnh, có backend thật, trong khi giữ bản
//       thật lại (main-EXP-018). Ba mặt, mỗi mặt một nguồn. (1) Rủi ro dữ
//       liệu (hai backend cùng mở một data.db, bản sao dùng
//       %APPDATA%\CommissionTracker\data.db thật khi không có
//       --ct-test-data-dir): đã chặn ở backend bằng khóa trên
//       <db_file_path>.lock suốt đời tiến trình (BE-3, Data Schema 6.2.0,
//       phiên 15); Main không ngăn được một bản sao mà hệ điều hành đã cho
//       chạy, nên khóa là biện pháp duy nhất. (2) Độ trễ lần mở đầu (33-75 s):
//       đã chẩn đoán xong, phần chậm nằm trước khi JavaScript của Main chạy
//       (main-EXP-015, main-EXP-018); không sửa được trong code; hướng xử lý là
//       ký số exe ở chặng G (DSK-3, DSK-9), sau đó phải đo lại. (3) Đo lại
//       (ENV-5, 2026-09-28, bản đã cài, cả hai antivirus bật): tiến trình bị
//       giữ 75 s trước khi chạy dòng code đầu tiên, các lượt sau 4-5 s; không
//       thấy bản sao nào trong 15,9 s quan sát được, vì AVG chặn tiến trình
//       theo dõi lúc đó (DSK-14, đã vá ở phiên 26, main-EXP-022); bản thật chạy
//       đúng với khóa của phiên 15. Còn chưa biết: antivirus nào (AVG hay
//       ReasonLabs) tạo bản sao, và bản sao ghi thẳng vào tệp thật hay vào một
//       lớp ảo hóa. Cả hai đều không còn gây hại dữ liệu nhờ khóa ở (1). Lượt
//       thử của phiên 14 (attempt 1, coding-agent@2026-09-27#4): thêm log vòng
//       đời, dựng lại measure_startup.cjs, đo đợt A1, A2, B, C; tái lập ở C
//       lượt 1, có bản Main thứ hai và một backend thứ hai.
//   - id: main-EXP-020
//     content: >
//       Ngôn ngữ ứng dụng và định dạng ô ngày (DSK-15, phiên 26). Main gọi
//       app.commandLine.appendSwitch('lang', app.locale của desktop.json) ở đầu
//       main(), trước whenReady; giá trị cấu hình là "vi". Nguồn: electron.d.ts
//       của Electron 44.4.5, mục app.getLocale(): "To set the locale, you'll
//       want to use a command line switch at app startup"; Chromium đọc switch
//       lang lúc khởi động nên phải đặt trước 'ready'. Đo trên máy thật (Windows
//       11, vùng VN, preferredSystemLanguages ["en-US","vi"]): khi chưa đặt,
//       app.getLocale() = "en-US" và <input type="date"> hiện tháng/ngày/năm
//       ("11/30/2026" cho 2026-11-30); khi đặt "vi", getLocale(), navigator.
//       language và Intl.DateTimeFormat().resolvedOptions().locale đều là "vi"
//       và ô ngày hiện ngày/tháng/năm ("30/11/2026"). Kết quả như nhau ở bản
//       chạy từ mã nguồn lẫn bản đóng gói (gói giữ vi.pak, electronLanguages
//       vi và en-US). Điều đo được: Chromium theo switch lang chứ không theo
//       danh sách ngôn ngữ ưu tiên của hệ điều hành (vẫn đứng đầu là "en-US"
//       trong preferredSystemLanguages). Thay đổi này đổi cả navigator.language
//       và Intl mặc định của renderer; giao diện luôn ghi 'vi-VN' rõ ràng khi
//       định dạng ngày, tiền nên không bị ảnh hưởng. Ca 12 của npm test kiểm
//       getLocale(), navigator.language và Intl bằng giá trị trong config. Ca
//       đọc stderr qua launchMain không thấy dòng log "application language
//       set to ..." (stderr chỉ gắn sau khi launch(), main-EXP-014), nên ca đó
//       không so dòng này.
//   - id: main-EXP-021
//     content: >
//       Hộp thoại lỗi bằng tiếng Việt (DSK-13, phiên 26). Lời lẽ nằm trong
//       desktop.json, main.error_dialog: startup_summary, running_summary,
//       detail_label. buildErrorDialog(config, phase, detail) dựng nội dung:
//       câu tiếng Việt, một dòng trống, nhãn "Chi tiết kỹ thuật:", rồi đúng
//       thông điệp tiếng Anh mà dòng "FATAL:" ghi (dòng FATAL không đổi chữ).
//       phase 'startup' (mặc định: backend không lên, thiếu giao diện, lỗi nạp
//       cửa sổ) chọn startup_summary; 'running' (backend chết sau READY, chỉ
//       onUnexpectedExit) chọn running_summary. Khi có --ct-test-no-dialog,
//       thay cho hộp thoại, Main ghi một dòng "error dialog text: <JSON của
//       {title, content}>" ngay sau dòng FATAL, nên kiểm thử đọc được nội dung
//       mà không bấm; có hộp thoại thì dòng này không có. Câu không nhắc "tệp
//       nhật ký" như câu mẫu của plan, vì ứng dụng không ghi tệp nhật ký nào
//       (log của Main chỉ ra stderr); câu bảo gửi "nội dung chi tiết bên dưới".
//       Ảnh thật (không có --ct-test-no-dialog, thư mục giao diện không tồn
//       tại, --ct-test-data-dir tạm): Windows hiện dialog.showErrorBox với
//       tiêu đề cửa sổ là "Error" (cố định), còn tham số title
//       ("Commission Tracker") hiện làm dòng chữ xanh đầu nội dung. Muốn đổi
//       tiêu đề cửa sổ phải dùng showMessageBox, nằm ngoài DSK-13. Ca 13
//       (startup) và 14 (running) kiểm các nội dung đó.
//   - id: main-EXP-022
//     content: >
//       Công cụ đo không dùng chuỗi lệnh mã hóa (DSK-14, phiên 26).
//       tests/packaged/measure_startup.cjs viết script theo dõi tiến trình ra
//       tệp watch_processes.ps1 (UTF-8 có BOM, vì PowerShell 5.1 đọc tệp không
//       BOM theo ANSI) trong một thư mục tạm riêng ct-watch-*, chạy bằng
//       powershell.exe -NoProfile -NonInteractive -File <tệp>, và xóa thư mục
//       đó khi tiến trình theo dõi đã thoát. Chọn -File thay cho -Command vì
//       script dài nhiều dòng và có dấu nháy; cách này cũng không nhét cả script
//       vào dòng lệnh. -File chỉ chạy được khi execution policy cho phép tệp
//       cục bộ: máy Project Owner có CurrentUser và LocalMachine đều
//       RemoteSigned (tệp tạo cục bộ chạy được); nếu sau này đặt Restricted
//       hoặc AllSigned thì công cụ đo sẽ hỏng và cần Bypass ở mức tiến trình,
//       không phải ngoại lệ antivirus. Kết quả đo ở EVIDENCE.
//   - id: main-EXP-023
//     content: >
//       Dọn checkpoint (DSK-12, phiên 26). main-PROB-001 chuyển thành
//       main-EXP-019. Ghi chú "Dịch vụ AI không được khởi động ở V1" nay ghi
//       watermark để dành "V4 trở đi" (.design/product_versions.md; hợp đồng
//       không đổi). Ghi chú "Cách làm của phiên 13 so với plan" bị xóa: nó chỉ
//       liệt kê tệp thêm và thứ tự làm của phiên 13, những thứ đã có trong
//       mã nguồn và lịch sử git; không còn quyết định hay bài học nào chưa nằm
//       ở main-EXP-008 tới main-EXP-017. Ghi chú "Cách làm của phiên 14 so với
//       plan" giữ nguyên (ngoài phạm vi của plan này).
//
//   - id: main-EXP-024
//     content: >
//       Cờ --ct-test-show-inactive (DSK-18, phiên 30; test_flags.show_inactive,
//       chỉ bản chạy từ mã nguồn, bản đóng gói bỏ qua và ghi log như các cờ
//       khác). Có cờ: BrowserWindow tạo với show false, rồi win.once
//       ('ready-to-show') gọi showInactive() (electron.d.ts 44.4.5: showInactive
//       dòng 3632 "Shows the window but doesn't focus on it"; ready-to-show dòng
//       4706, không bắn khi paintWhenInitiallyHidden là false, mặc định true).
//       Không cờ: show true như cũ. Đo cái gì: win.isFocused() là chỉ báo TẤT
//       ĐỊNH (có cờ false, không cờ true); tiêu điểm của HỆ ĐIỀU HÀNH thì không:
//       Windows có khi không trao nền trước cho cửa sổ mới (không cờ: Electron
//       giành nền trước 0/5 lượt ở một lần đo, 1/5 ở lần khác), nên kiểm thử chỉ
//       khẳng định chủ nền trước sau lượt chạy không thuộc cây tiến trình
//       Electron khi có cờ, còn không cờ thì ghi số đo. Tiến trình PowerShell
//       phụ (tests/fixtures/foreground_holder.ps1) KHÔNG giành được nền trước
//       khi người dùng đang ở cửa sổ khác (helperWasInFront false hầu hết lượt):
//       khi đó cửa sổ người dùng đang dùng chính là "ứng dụng khác". Không dùng
//       phím giả để lách khóa nền trước, vì phím đó tới ứng dụng người đang gõ.
//       Ca không cờ chỉ yêu cầu focused true ở ít nhất 3/5 lượt: người dùng đổi
//       cửa sổ giữa chừng làm một lượt focused false (đo được).
//   - id: main-EXP-025
//     content: >
//       reminder_ticker trong Main (DSK-17, phiên 30; mã ở
//       src/cross_cutting/reminder_ticker/, khối checkpoint riêng ở đó). Main nạp
//       cấu hình reminder_ticker từ desktop.json (interval_ms 60000,
//       request_timeout_ms 10000, chữ thông báo), tiêm vào ticker địa chỉ
//       backend, hàm hiện toast (showWindowsToast: Notification, giữ trong
//       liveToasts tới close, failed hoặc click) và log. Khởi động ở cuối
//       startLayer, SAU khi backend READY và lần nạp đầu của cửa sổ (kể cả
//       ERR_ABORTED), trừ khi shutdown đã bắt đầu. Dừng: shutdown() gọi
//       await reminderTicker?.stop() TRƯỚC backend.stop(), nên mọi đường thoát
//       (window-all-closed, before-quit, SIGINT, SIGTERM, fatal) đều dừng ticker
//       trước. Bấm toast: bringWindowToFront() (dùng chung với second-instance;
//       khôi phục nếu thu nhỏ rồi focus; cửa sổ đã đóng thì không làm gì), log
//       "click (window brought to the front: true|false)". Cờ
//       --ct-test-reminder-interval-ms=<số nguyên dương> (chỉ bản chạy từ mã
//       nguồn; giá trị sai bị bỏ và ghi log). Log kiểm được: "reminder ticker
//       started", "reminder check #N: K notification(s)", "reminder toast:
//       {notification_id, title, body}", "reminder toast <id>: show|click|close|
//       failed", "reminder check #N failed: <lý do>", "reminder ticker stopped".
//   - id: main-EXP-026
//     content: >
//       Thông báo Windows và Application User Model ID (DSK-17, phiên 30, đo
//       trên máy Project Owner). Từ mã nguồn: isSupported() true ở mọi lượt.
//       (A) không đặt AUMID (mặc định của Electron): sự kiện show, Project Owner
//       thấy toast. (B) AUMID com.commissiontracker.desktop: show và close, thấy
//       toast, NHƯNG máy có sẵn bản cài cũ với lối tắt Start Menu (ngày
//       2026-09-28, đích ...\Programs\commission-tracker) nên AUMID này đã được
//       đăng ký. Ở lần demo đầu (ứng dụng thật, AUMID đã đặt bằng appId) bấm toast
//       KHÔNG tới tiến trình của demo: log không có click, cửa sổ demo không lên
//       (giả thuyết, chưa chứng minh trực tiếp: Windows chuyển cú bấm cho lối tắt
//       của bản cài cũ). (C) AUMID chưa
//       đăng ký ở đâu (com.commissiontracker.desktop.probe-unregistered): show
//       vẫn bắn nhưng Project Owner KHÔNG thấy toast. Kết luận: sự kiện show
//       không chứng minh toast hiện; AUMID không đăng ký thì toast vô hình. Quyết
//       định: chỉ bản đóng gói gọi app.setAppUserModelId(app.app_user_model_id
//       của desktop.json = appId của electron-builder.yml, có kiểm thử A4), vì
//       NSIS gắn lối tắt với đúng appId; từ mã nguồn giữ mặc định (A) và bấm toast
//       tới đúng tiến trình (click ghi log, cửa sổ lên trước, Project Owner xác
//       nhận). Bản đóng gói chạy từ release\win-unpacked (ca P8): show rồi click,
//       Project Owner bấm và xác nhận nội dung khớp; kết quả này bị nhiễu bởi bản
//       cài cũ (cùng AUMID đã đăng ký). Bản cài thật chưa đo vì plan cấm cài.
//   - id: main-EXP-027
//     content: >
//       Đóng gói thành phần cắt ngang (phát hiện lúc Project Owner mở bản đóng
//       gói). electron-builder.yml "files" liệt kê từng tệp của app.asar; module
//       mới dist/cross_cutting/reminder_ticker/*.js không có trong gói nên Main
//       đóng gói báo "Error: Cannot find module
//       './cross_cutting/reminder_ticker/reminder_ticker'" (hộp thoại "A
//       JavaScript error occurred in the main process") và mọi ca test:packaged
//       sẽ hỏng. Đã thêm dist/cross_cutting/**/*.js vào files; kiểm bằng
//       @electron/asar listPackage thấy reminder_ticker.js và toast_text.js. Bài
//       học: thêm thư mục dist mới cho Main thì phải thêm vào files, và chạy
//       test:packaged ngay sau khi đổi cấu trúc dist.
//   - id: main-EXP-028
//     content: >
//       Công cụ đo và demo của phiên 30 (tests/, không phải mã của Main):
//       tests/tools/toast_probe_main.cjs (một toast thử, in sự kiện show, click,
//       close, failed; tham số --aumid, --label, --seconds; electron.exe là
//       chương trình GUI nên phải chạy bằng Start-Process -Wait với
//       -RedirectStandardOutput), tests/tools/toast_demo.cjs (ứng dụng thật trên
//       dữ liệu tạm, nhịp 3 s, tạo đơn có hạn giao hôm nay và cài đặt nhắc việc;
//       không gọi check_due, nên toast là của ticker, khác walkthrough:app
//       --reminders của UI nơi công cụ tự gọi check_due có thể lấy mất nhắc việc
//       trước ticker), tests/fixtures/fake_backend_reminders.py (backend giả điều
//       khiển bằng CT_FAKE_CHECKS: ok, valid, two, mixed, http500, badshape,
//       notjson, slow:<ms>; ghi "check #n start (in flight: k)" để thấy lời gọi
//       chồng nhau), tests/fixtures/foreground_holder.ps1. Stderr của Main chỉ gắn
//       sau launch() (main-EXP-014): dòng "main started" bị mất, lấy PID Main bằng
//       app.evaluate(() => process.pid).
//   - id: main-EXP-029
//     content: >
//       invoke trong bridge và native_dialogs trong Main (phiên 33; lối vào ipc
//       đầu tiên, API Contract 4.0.0 endpoint_forms.ipc; mã của thành phần ở
//       src/cross_cutting/native_dialogs/, khối checkpoint riêng ở đó). Bridge
//       window.commissionTracker vẫn đóng băng và có đúng hai khóa:
//       backendBaseUrl và invoke(address, argument). Preload (sandbox, chỉ
//       require được 'electron') chuyển lời gọi sang ipcRenderer.invoke; renderer
//       không bao giờ chạm ipcRenderer. Danh sách địa chỉ đã hiện thực đi từ Main
//       sang preload qua đối số thứ ba của additionalArguments,
//       --ct-ipc-addresses=dialog:pick-folder (các địa chỉ cách nhau bằng dấu
//       phẩy); tên đối số nằm ở desktop.json preload.arguments.ipc_addresses và,
//       như hai đối số cũ, được viết lại thành hằng số trong preload.ts (phải
//       trùng). Địa chỉ ngoài danh sách (hay không phải chuỗi): preload trả
//       Promise bị từ chối "ipc address not implemented: <địa chỉ>", không gửi gì
//       sang Main; đó là lỗi lập trình của bên gọi, không phải một nhãn kết quả
//       của hợp đồng. Địa chỉ và tiêu đề của pick_folder nằm ở desktop.json
//       native_dialogs.pick_folder; danh sách địa chỉ của Main được dựng từ đó.
//       Thứ tự trong startLayer: backend READY, kiểm thư mục giao diện,
//       protocol.handle, rồi registerNativeDialogs (trình xử lý ipc), rồi mới tạo
//       BrowserWindow (.design/03_classification.md: native_dialogs sẵn sàng trước
//       khi mở cửa sổ). registerNativeDialogs nhận getMainWindow: () => mainWindow,
//       nên dùng đúng cửa sổ đang mở. Ca 1 của npm test khẳng định bridge nay có
//       keys ['backendBaseUrl','invoke'] và invoke 'function' (dòng cũ: keys
//       ['backendBaseUrl'], invoke 'undefined'); các khẳng định khác của ca 1
//       không đổi. Trang thử tests/fixtures/probe có thêm nút "Chọn thư mục" cho
//       Project Owner (npm run probe). electron-builder.yml không cần sửa:
//       dist/cross_cutting/**/*.js (main-EXP-027) đã phủ native_dialogs, và
//       @electron/asar listPackage xác nhận. Hộp thoại lỗi fatal của Main
//       (showErrorBox) và --ct-test-no-dialog không liên quan tới hộp thoại chọn
//       thư mục.
//   - id: main-EXP-030
//     derived_from: main-PROB-002
//     content: >
//       Hồ sơ Chromium %APPDATA%\Commission Tracker đổi giữa mốc đầu và cuối phiên
//       30 (chuyển từ vấn đề của phiên 30 theo DSK-19; id main-PROB-001 của vấn đề
//       đó trùng với id đã dùng ở phiên 26 nên đổi thành main-PROB-002 rồi đúc kết
//       ở đây). Nguồn đã được Project Owner xác nhận (2026-10-05): anh tự cài bản mới
//       đè lên bản cũ rồi mở thử, đúng các thời điểm 21:05 ngày 4/10 và 10:45 ngày
//       5/10 mà các dòng đổi mang. Đó là bản cài lỗi (thiếu dist\cross_cutting, Main
//       ném lỗi trước setPath, main-EXP-027), không phải kiểm thử; ba thí nghiệm có
//       kiểm soát của phiên 30 (một ca npm test, test:packaged P1 và P7) cho 0 dòng
//       đổi, khớp. Thư mục dữ liệu thật %APPDATA%\CommissionTracker (data.db,
//       data.db.lock) giống hệt (kích thước, thời điểm ghi, SHA-256). Cách đọc tiêu
//       chí "mốc %APPDATA% giống nhau": so cả hai thư mục; hồ sơ Chromium chỉ đổi khi
//       người vận hành mở ứng dụng không có --ct-test-data-dir (bản cài hoặc exe) giữa
//       hai mốc. Phiên 33: hai mốc giống hệt ở cả hai thư mục (69 dòng, 0 khác biệt). Phiên 35: cũng
//       69 dòng, 0 khác biệt giữa mốc đầu (09:21:07) và cuối (14:59:23).
//   - id: main-EXP-031
//     content: >
//       Ráp workflow restore_data (phiên 35, pha 1; mã và checkpoint riêng ở
//       src/workflows/restore_data/, khối restore_data). Main đọc
//       configs/restore_data.json (loadRestoreDataConfig; chỉ Main đọc, rồi trao giá trị:
//       đây là Configs của workflow, bố cục CLAUDE.md mục 4), tạo RestoreDataAdapters
//       (config, dbFilePath đã tính có tôn trọng --ct-test-data-dir, backendBaseUrl),
//       RestoreDataService và gọi registerRestoreDataRouters({ ipc: ipcMain, ... }) trong
//       startLayer: SAU backend READY, kiểm thư mục giao diện, protocol.handle và
//       registerNativeDialogs, TRƯỚC khi tạo BrowserWindow. Danh sách địa chỉ ipc cho preload
//       (--ct-ipc-addresses=) nay có năm địa chỉ: dialog:pick-folder, dialog:open-file
//       (desktop.json native_dialogs.open_file, tiêu đề "Chọn tệp"), restore:prepare,
//       restore:status, restore:cancel (restore_data.json addresses). Bridge vẫn đúng hai
//       khóa. Ca N14 (DSK-22) khẳng định cả pick-folder lẫn restore:status có câu trả lời
//       khi trang gọi ngay lúc nạp. Đóng gói: electron-builder.yml files thêm
//       dist/workflows/**/*.js và configs/restore_data.json (bài học main-EXP-027: thêm
//       thư mục dist mới cho Main thì phải thêm vào files); app.asar liệt kê được cả bốn
//       tệp của workflow; P10 chạy đường chuẩn bị thật trong gói. Main chưa có
//       backend_controller, restore_trigger: để phiên 36.
//   - id: main-EXP-032
//     content: >
//       Trang thử cho Project Owner (npm run probe, tests/fixtures/probe) có thêm bốn nút:
//       "Chọn tệp sao lưu" (open_file, bộ lọc ctbackup), "Chuẩn bị khôi phục",
//       "Xem trạng thái", "Hủy khôi phục"; mỗi nút ghi đè ô trả lời của chính nó nên bấm
//       xen kẽ nhiều lần dễ nhầm với "không có gì đổi" (đã xảy ra); log Main ghi từng lời gọi
//       "restore_data: <địa chỉ> -> <nhãn>". Trang thử riêng cho DSK-22 ở
//       tests/fixtures/invoke_on_load.
//   - id: main-EXP-033
//     content: >
//       Pha 2 của restore_data trong Main (phiên 36; thay câu "Main chưa có backend_controller,
//       restore_trigger" của main-EXP-031). (1) backendController: đối tượng {stop, start} tạo trong main()
//       từ BackendProcess và trao cho RestoreDataAdapters; stop() là backend.stop() (đóng stdin, chờ, quá
//       hạn thì kết thúc), start() là backend.start(backend.port) MỘT lần rồi đổi kết quả thành ready hoặc
//       failed kèm lý do (thoát trước READY với mã, lỗi spawn, quá hạn thì terminate). Không có vòng thử
//       lại. Không FATAL khi dừng qua nó vì BackendProcess.stop() đặt stopping trước khi tiến trình thoát;
//       start() đặt lại ready và stopping, và tiến trình cũ đã thoát xong (stop chờ exited) nên cờ không
//       lẫn sang tiến trình mới. (2) Thứ tự mới trong startLayer: backend READY, kiểm thư mục giao diện và
//       protocol.handle, native_dialogs, ráp restore_data và đăng ký ba địa chỉ ipc, RESTORE_TRIGGER (await,
//       hộp thoại thông báo không cửa sổ cha hoặc dòng "restore dialog text" khi có --ct-test-no-dialog),
//       danh sách địa chỉ ipc, cửa sổ, lần nạp đầu, reminder_ticker. (3) InProcessCallError (500
//       ERR_RESTORE_FAILED) do Main bắt và gọi fatal(..., 'restore_failed'): dòng "FATAL: Applying the
//       pending restore failed: ERR_RESTORE_FAILED (500): ..." giữ dạng cũ; hộp thoại dùng
//       main.error_dialog.restore_failed_summary, câu nói dữ liệu cũ đã được đưa về chỗ cũ. Lỗi khác của
//       restore_trigger là lỗi lập trình, đi vào đường "The app could not start" cũ. (4) Chữ hộp thoại kết
//       quả nằm ở desktop.json restore_trigger (danh sách đoạn {text, field, layout}); đường dẫn cấu hình
//       thư mục restore-previous nằm ở restore_data.json files. (5) Bản đóng gói không cần sửa
//       electron-builder.yml: dist\cross_cutting\**\*.js phủ restore_trigger, @electron/asar liệt kê được.
//       (6) Phép cắn d của phiên (dừng backend mà không đánh dấu) làm Main tự đóng bằng đường fatal.
//       tests/probe.cjs nhận npm run probe -- --data-dir <thư mục> để giữ thư mục dữ liệu giữa các lần
//       chạy (vẫn là cờ --ct-test-data-dir của Main; không có tùy chọn thì thư mục tạm mới như cũ).
//
// UNSOLVED_PROBLEMS: []
//
// EVIDENCE:
//   - claim: >
//       Môi trường của phiên 14: Node, npm, Python, Electron,
//       electron-builder, antivirus.
//     how: >
//       Từ Desktop: node --version; npm --version;
//       ..\Backend\env\Scripts\python.exe --version; npx electron --version;
//       npx electron-builder --version; where.exe powershell; PowerShell:
//       Get-CimInstance -Namespace root/SecurityCenter2 -ClassName
//       AntiVirusProduct | Select-Object displayName, productState.
//     result: >
//       v24.14.1; 11.11.0; Python 3.13.12; v44.4.5; 26.15.3 (TypeScript
//       6.0.3 và Playwright 1.63.0 không đổi từ phiên 13). Windows 11 Home
//       10.0.26200. where.exe powershell:
//       C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe. Antivirus:
//       Reason Cybersecurity 266240 và AVG Antivirus 266240 (bật), Windows
//       Defender 393472 (tắt); tiến trình AVGSvc, rsAppUI (4), rsEngineSvc
//       đang chạy trong suốt phiên. Riêng sandbox của phiên agent chặn đổi tên
//       trong %LOCALAPPDATA%\electron-builder\Cache (EXDEV ở bước NSIS, lần
//       dist đầu của phiên), nên các lệnh dist của phiên đặt
//       ELECTRON_BUILDER_CACHE vào một thư mục tạm; đây là môi trường của
//       agent, không phải điều kiện build của dự án.
//     recorded_at: 2026-09-27T20:28:06+07:00
//   - claim: >
//       Origin thật của renderer nạp từ app:// đúng bằng ui_origin, và
//       Chromium không đòi preflight Private/Local Network Access khi gọi
//       GET từ app://commission-tracker tới http://127.0.0.1:<cổng>: header
//       Origin gửi đi là app://commission-tracker, backend thật trả 200 và
//       renderer đọc được thân phản hồi.
//     how: >
//       cd Desktop; npm run build; npx playwright test -g "1. success path
//       with the real backend". Đây là ca 1, dùng Backend.py thật và
//       trang thử tests/fixtures/probe. Kiểm thử gắn
//       session.defaultSession.webRequest.onBeforeSendHeaders trong tiến trình
//       chính, bấm #rerun, rồi ghi method, URL và header Origin của mọi yêu cầu,
//       cùng toàn bộ console của renderer.
//     result: >
//       MEASURED requests to the backend:
//       [{"url":"http://127.0.0.1:58691/clients","method":"GET","origin":"app://commission-tracker"}]
//       (chỉ một yêu cầu GET, không có OPTIONS hay preflight nào).
//       location.origin = "app://commission-tracker". #status = 200, #body = [].
//       Console của renderer chỉ có cảnh báo "Electron Security Warning
//       (Insecure Content-Security-Policy)" của trang thử; không có lỗi CORS,
//       Private Network hay Local Network.
//     recorded_at: 2026-09-26T21:45:30+07:00
//   - claim: >
//       Mười bốn ca của npm test đạt trên Windows khi AVG và ReasonLabs bật:
//       mười một ca chạy Main từ mã nguồn (tests/desktop_main.spec.ts, dùng
//       processTree và stillAlive mới) và ba ca của buildTree
//       (tests/process_tree.spec.ts, không cần Electron). Sau cả bộ không còn
//       python.exe nào chạy Backend.py hay fake_backend_*.
//     how: >
//       cd Desktop; npm test (build rồi playwright test; workers 1;
//       tests/packaged/ bị bỏ qua qua testIgnore).
//     result: >
//       14 passed (1.6m), chạy trên mã nguồn cuối của phiên 14 lúc 20:58.
//       Log vòng đời mới (main-EXP-016) không làm hỏng ca nào; không sửa
//       kiểm thử cũ. Ca 1 tới 9 cho kết quả như phiên 10 (ca 3: "did not
//       write READY within 30000 ms; terminating it"; ca 7: đóng sau hơn 10000
//       ms, "did not exit within 10000 ms; terminating it"). Ca 10: "FATAL: The
//       interface files were not found: index.html is missing in <thư mục tạm
//       rỗng>.", backend exited with code 0, app thoát mã 1, không có "opening
//       the window". Ca 11: "first load of app://commission-tracker/index.html
//       was aborted (ERR_ABORTED, -3); continuing", không có FATAL, trang
//       #loaded hiện, đóng thoát mã 0. Sau cả bộ: "python processes of this
//       project after the suite: []".
//     recorded_at: 2026-09-27T20:58:40+07:00
//   - claim: >
//       DSK-1: ca kiểm thử buildTree với PID tái sử dụng hỏng trên logic cũ
//       (chỉ theo ParentProcessId) và đạt trên logic mới (CreationDate).
//     how: >
//       cd Desktop; npx playwright test tests/process_tree.spec.ts, chạy hai
//       lần: một lần sau khi tạm thay thân buildTree trong tests/helpers.ts
//       bằng đúng thuật toán của processTree phiên 13 (hàng đợi PID, chỉ so
//       ParentProcessId), một lần với helpers.ts mới. Dữ liệu giả: Main
//       (pid 100, t=1000), backend (200, t=2000), conhost (201), cháu (300,
//       cùng tick với cha), rsAppUI.exe (900, ParentProcessId 200, t=500) và
//       con của nó (901).
//     result: >
//       Logic cũ: 3 failed; buildTree(backend) =
//       [[200,"python.exe"],[900,"rsAppUI.exe"],[201,"conhost.exe"],[901,"rsAppUI.exe"],[300,"child.exe"]]
//       (đúng hiện tượng P4 của DSK-1). Logic mới: 3 passed; buildTree(backend)
//       = [[200,"python.exe"],[201,"conhost.exe"],[300,"child.exe"]].
//     recorded_at: 2026-09-27T20:31:30+07:00
//   - claim: >
//       DSK-5: prepare_runtime.mjs dừng ngay với thông báo rõ khi PATH thiếu
//       PowerShell, và khi một tệp trong release\ bị giữ thì nêu đúng tệp đó
//       sau 5 lần thử.
//     how: >
//       cd Desktop, PowerShell. (a) $env:Path = thư mục của node.exe (bỏ mọi
//       thứ khác) rồi node packaging/prepare_runtime.mjs. (b) Tạo
//       release\win-unpacked\resources\app.asar và release\other.txt; một
//       tiến trình PowerShell khác mở app.asar với FileShare None trong 25 s;
//       chạy node packaging/prepare_runtime.mjs.
//     result: >
//       (a) mã 1, không làm bước nào khác: "[prepare_runtime] ERROR:
//       powershell.exe is not in PATH; electron-builder needs it and would
//       stop with "spawn powershell.exe ENOENT". Add
//       C:\WINDOWS\System32\WindowsPowerShell\v1.0 to the Path variable
//       (System variables), open a new terminal, and run again." (b) mã 1 sau
//       12 s: 5 dòng "could not delete release (attempt i/5): EPERM; still
//       there: ...\release\win-unpacked\resources\app.asar" (other.txt đã bị
//       xóa), rồi "ERROR: ...\app.asar could not be deleted after 5
//       attempt(s) (EPERM): a program is holding it open. Close the app if it
//       is running from this folder. To find the program, open Resource
//       Monitor (resmon), tab CPU, "Associated Handles", and search for
//       "app.asar". If it is an antivirus, add E:\CommissionTracker\Desktop\
//       release to its folder exceptions. Then run again." Mọi lần dist sau
//       đó in "powershell.exe found in PATH" và "deleted release".
//     recorded_at: 2026-09-27T20:34:10+07:00
//   - claim: >
//       Ca 11 tái hiện được ERR_ABORTED: hỏng trên code cũ, đạt sau khi sửa.
//     how: >
//       cd Desktop; npm run build; npx playwright test -g "11\. first load
//       aborted", chạy 3 lần trước khi sửa main.ts và 3 lần sau khi sửa.
//     result: >
//       Trước khi sửa, 3/3 hỏng với "[desktop-main] FATAL: The app could not
//       start: ERR_ABORTED (-3) loading 'app://commission-tracker/index.html'"
//       rồi "exiting with code 1" (page.reload báo "Target page, context or
//       browser has been closed" hoặc "net::ERR_ABORTED"). Sau khi sửa, 3/3 đạt
//       với "[desktop-main] first load of app://commission-tracker/index.html
//       was aborted (ERR_ABORTED, -3); continuing", không có FATAL, đóng app
//       thoát mã 0. Phép thử đầu tiên bằng location.reload() trong <head>
//       không tái hiện được (không FATAL trên code cũ) nên đã bị thay.
//     recorded_at: 2026-09-27T14:26:30+07:00
//   - claim: >
//       npm run build và npm run lint sạch lỗi.
//     how: cd Desktop; npm run build; npm run lint
//     result: Cả hai lệnh kết thúc không có lỗi hay cảnh báo nào (mã nguồn cuối phiên 14).
//     recorded_at: 2026-09-27T20:56:50+07:00
//   - claim: >
//       Gói Python nhúng đúng bản python.org công bố, có đủ C runtime cần
//       thiết, và không cần DLL nào ngoài hệ điều hành.
//     how: >
//       cd Desktop; node packaging/prepare_runtime.mjs (in danh sách DLL và
//       hash). Hash công bố: bảng Files của
//       https://www.python.org/downloads/release/python-31312/ và digest trong
//       python-3.13.12-embed-amd64.zip.sigstore. DLL mà các .pyd, .dll, .exe
//       trong stage\python cần: đọc bảng import PE bằng một script Python đọc
//       thẳng tệp (không có công cụ ngoài).
//     result: >
//       python-3.13.12-embed-amd64.zip, 10941233 byte, SHA-256
//       76f238f606250c87c6beac75dccd35ee99070a13490555936abb6cb64ecce3d0, trùng
//       với SHA-256 python.org công bố và với digest SHA2_256 trong bundle
//       .sigstore. DLL trong gói: libcrypto-3.dll, libffi-8.dll, libssl-3.dll,
//       python3.dll, python313.dll, sqlite3.dll, vcruntime140.dll,
//       vcruntime140_1.dll (có cả hai tệp vcruntime). Import C runtime duy
//       nhất: vcruntime140.dll, vcruntime140_1.dll; mọi import khác là DLL hệ
//       thống hoặc api-ms-win-crt-* (UCRT có sẵn từ Windows 10). Hai .pyd nhị
//       phân của phụ thuộc: pydantic_core và _yaml. Mọi gói đều có wheel.
//     recorded_at: 2026-09-27T14:33:50+07:00
//   - claim: >
//       npm run dist chạy bằng một lệnh từ trạng thái đã xóa packaging/stage
//       và release, sinh bộ cài và win-unpacked đúng bố cục D2; không ký số.
//     how: >
//       cd Desktop; xóa packaging\stage và release; npm run dist. Rồi liệt kê
//       app.asar bằng require('@electron/asar').listPackage, liệt kê
//       release\win-unpacked\resources và locales, và
//       Get-AuthenticodeSignature cho bộ cài, Commission Tracker.exe và
//       resources\python\python.exe.
//     result: >
//       Phiên 14, AVG và ReasonLabs bật, có ngoại lệ thư mục (ENV-2). Sáu lần
//       dist: lần 1 hỏng ở NSIS với EXDEV (sandbox của agent, xem EVIDENCE môi
//       trường); T (20:38, 77 s), A1 (20:41, 68 s), A2 (20:43, 68 s) đạt; lần
//       cuối thứ nhất (20:54) hỏng sau 30 s với "EPERM: operation not
//       permitted, rename 'release\win-unpacked.tmp' -> 'release\win-unpacked'"
//       ở bước đóng gói của electron-builder (main-EXP-017), vài giây sau
//       không tệp nào trong win-unpacked.tmp còn bị giữ; chạy lại đúng lệnh
//       từ trạng thái sạch thì thoát mã 0 sau 61 s (20:56). Mọi lần đều in
//       "powershell.exe found in PATH", "deleted release", "deleted
//       packaging\stage", "removing site-packages\bin: fastapi.exe, httpx.exe,
//       idna.exe, py.test.exe, pygmentize.exe, pytest.exe, uvicorn.exe" và
//       kiểm thử khói "READY\n", mã 0, data.db được tạo; không còn cảnh báo
//       "author is missed" (DSK-7) và không còn dòng "signing ...
//       site-packages\bin\..." (DSK-4): chỉ ký python.exe, pythonw.exe,
//       Commission Tracker.exe, elevate.exe, trình gỡ và bộ cài. Đầu ra:
//       release\Commission Tracker Setup 0.1.0.exe và release\win-unpacked;
//       release\win-unpacked\resources\python\Lib\site-packages\bin không tồn
//       tại. Build cùng mã nguồn cho exe cùng SHA-256 (T và build cuối:
//       7defb3d7...5084). Bố cục app.asar, resources, locales và chữ ký như
//       phiên 13 (không đổi cấu hình electron-builder).
//     recorded_at: 2026-09-27T20:56:08+07:00
//   - claim: >
//       DSK-4: gói không còn site-packages\bin.
//     how: >
//       Sau npm run dist: Test-Path
//       release\win-unpacked\resources\python\Lib\site-packages\bin; đếm *.exe
//       trong resources\python; sau khi cài (đợt C), Test-Path
//       <thư mục cài>\resources\python\Lib\site-packages\bin.
//     result: >
//       False ở cả win-unpacked lẫn thư mục đã cài; resources\python chỉ còn 2
//       exe (python.exe, pythonw.exe). Log dist không còn dòng ký tệp nào
//       trong site-packages\bin.
//     recorded_at: 2026-09-27T20:56:10+07:00
//   - claim: >
//       Dung lượng (D7): thư mục đã cài dưới trần 400 MB.
//     how: >
//       Tổng kích thước tệp (Get-ChildItem -Recurse -File | Measure-Object -Sum
//       Length) của thư mục đã cài bằng bộ cài (việc 9) và của
//       release\win-unpacked; phần Electron là toàn bộ trừ resources\python,
//       resources\backend, resources\ui. Phần của pytest và httpx: cộng kích
//       thước các tệp trong RECORD của từng gói (kèm .pyc tương ứng), với tập
//       phụ thuộc lấy từ Requires-Dist.
//     result: >
//       Thư mục đã cài: 371,5 MB (389573499 byte), gồm Electron 320,6 MB
//       (Commission Tracker.exe 246 MB; app.asar 43324 byte; trình gỡ cài đặt
//       140040 byte), resources\python 50,0 MB (Python nhúng 20,2 MB,
//       site-packages 29,8 MB), resources\backend 0,6 MB, resources\ui 0,3 MB.
//       win-unpacked: 371,4 MB. Locale chỉ
//       còn en-US.pak và vi.pak (electronLanguages). pytest riêng 2,81 MB,
//       httpx riêng 0,61 MB; cộng mọi gói chỉ có mặt vì hai gói này (pytest,
//       httpx, pluggy, iniconfig, packaging, pygments, colorama, httpcore,
//       certifi) là 13,67 MB trên 29,07 MB của các gói. (Số liệu trên là của
//       phiên 13.) Phiên 14 (DSK-6), sau khi bỏ site-packages\bin: build lúc
//       20:56 có bộ cài 121412295 byte (115,8 MB), win-unpacked 388701422 byte
//       (370,7 MB), trong đó resources\python 51699404 byte; build cuối lúc
//       21:06, sau khi viết khối checkpoint này, có bộ cài 121417325 byte.
//       Số byte của bộ cài phiên 13 đúng ra là 121709519 (build cuối của
//       phiên đó), không phải 121703863. Mỗi lần sửa khối checkpoint này,
//       dist\main.js và app.asar đổi theo, nên bộ cài build lại có thể lệch
//       vài chục byte.
//     recorded_at: 2026-09-27T20:59:40+07:00
//   - claim: >
//       Thời gian khởi động và các tiến trình quanh lần mở bản đóng gói, đợt
//       A1, A2, B, C (DSK-2, DSK-3; main-EXP-015, main-EXP-018).
//     how: >
//       cd Desktop. A1, A2: npm run dist --
//       "-c.extraMetadata.ctBuildStamp=<nhãn>-<giờ>" (khóa này chỉ vào
//       package.json trong app.asar, để exe có hash mới mà không sửa mã
//       nguồn), ngay sau đó node tests/packaged/measure_startup.cjs 3
//       release/win-unpacked A1 (rồi A2). B: node
//       tests/packaged/measure_startup.cjs 10 release/win-unpacked B (build
//       A2). C: Start-Process "release\Commission Tracker Setup 0.1.0.exe"
//       -ArgumentList '/S','/D=%TEMP%\ct-install-14' -Wait (build A2), node
//       tests/packaged/measure_startup.cjs 3 %TEMP%\ct-install-14 C, rồi gỡ
//       im lặng. Mọi lượt có --ct-test-data-dir tạm. Log từng lượt và tóm tắt
//       của phiên 14 nằm ở test-results/startup/ và đã bị Playwright xóa khi
//       chạy npm test / test:packaged sau đó; số liệu dưới đây chép từ đầu ra
//       lúc đo. Công cụ nay ghi vào startup-logs/<nhãn>-run<N>.log và
//       startup-logs/<nhãn>-summary.json.
//     result: >
//       Số ms kể từ spawn: dòng log đầu / backend started / READY / cửa sổ.
//       A1 (exe 6f49062e...2b2d, hash mới): 155/241/993/1160; 59/116/712/888;
//       57/139/934/1112. A2 (exe 54d32d39...ddb9, hash mới): 170/247/871/1059;
//       75/152/773/931; 74/149/781/944. B (A2, 10 lượt): dòng đầu 54-87,
//       started 113-167, READY 704-825, cửa sổ 884-985. C (A2 đã cài, không
//       ngoại lệ): lượt 1: Main tạo lúc +4 ms, spawn() trả về lúc +64006,
//       64078/64165/65573/66968; lượt 2: 1172/1264/2643/4130; lượt 3:
//       1556/1663/3046/4491. Mọi lượt thoát mã 0, không FATAL, không
//       second-instance, không backend nào thoát mã 0 mà thiếu "standard
//       input closed", DSK-8 ("Failed to grant sandbox access") 0 lần,
//       "being used by another process" 0, "Failed to find real location" 0.
//       Bản Main thứ hai: chỉ ở C lượt 1: pid 23568, cha node.exe 10144 (cũng
//       là cha của Main thật 2560), CommandLine trùng, thấy từ +3574 tới
//       +40935 ms, có backend python.exe 19416 (cha 23568) từ +38386 tới
//       +40935 ms; ảnh chụp +64008 ms không còn cả hai; không có ảnh chụp nào
//       giữa +40935 và +64008 (lỗi pipe của công cụ, đã sửa sau lượt này).
//       Backend thật 27480 tạo lúc +64136 ms. Đợt A, B, C lượt 2-3: không có
//       bản Main hay backend thứ hai nào.
//     recorded_at: 2026-09-27T20:49:30+07:00
//   - claim: >
//       measure_startup.cjs phát hiện được một bản Main thứ hai không do
//       script khởi động (công cụ được chạy thử trước khi dùng, việc 6c).
//     how: >
//       Đối chứng dương: trong lúc node tests/packaged/measure_startup.cjs 1
//       release/win-unpacked Tpc đang chạy, một tiến trình PowerShell khác
//       (không phải script) chờ Main của lượt đó xuất hiện rồi chạy
//       Start-Process "<exe>" với cùng --ct-test-data-dir và
//       --ct-test-no-dialog.
//     result: >
//       Hai lần chạy thử trước khi sửa công cụ: (1) bản sao gặp khóa một-bản
//       và thoát sau khoảng 200 ms; Main của script ghi "second-instance:
//       another launch asked for this instance (argv [...])", công cụ báo
//       second_instance_events 1 và thoát mã 1; ảnh chụp 500 ms không kịp
//       thấy bản sao sống ngắn như vậy. (2) spawn của script bị giữ 1,3 s nên
//       bản sao giành khóa trước, Main của script ghi "another instance is
//       already running" và thoát; công cụ sập ở rmSync (EPERM, thư mục dữ
//       liệu còn bị bản sao giữ). Sau khi sửa (ảnh chụp ghi ra tệp, không sập
//       khi thư mục dữ liệu còn bị giữ, thêm data_folder_left và
//       still_running_at_end): lần chạy lại cho second_instance_events 1,
//       exit mã 0 của Main, script thoát mã 1. Nhánh bản sao sống lâu được
//       chứng minh bằng dữ liệu thật của đợt C lượt 1 (extra_main_instances
//       1, same_command_line true).
//     recorded_at: 2026-09-27T20:53:45+07:00
//   - claim: >
//       Quét antivirus bằng Microsoft Defender theo plan: không thực hiện được
//       trên máy này.
//     how: >
//       "C:\Program Files\Windows Defender\MpCmdRun.exe" -Scan -ScanType 3
//       -File <bộ cài>, rồi -File <release\win-unpacked>; đọc
//       %TEMP%\MpCmdRun.log. Trạng thái: Get-MpComputerStatus và
//       root/SecurityCenter2 AntiVirusProduct.
//     result: >
//       Cả hai lệnh: "CmdTool: Failed with hr = 0x80004005", mã thoát 2; log
//       ghi "WARN: Product/Feature disabled". Defender có (AMProductVersion
//       4.18.26060.3008) nhưng AMRunningMode "Not running", AntivirusEnabled
//       False; antivirus đang bật trên máy là AVG Antivirus và Reason
//       Cybersecurity (productState 266240). Chưa có kết quả quét nào. Trong
//       suốt phiên, AVG và Reason bật thời gian thực và không chặn hay cách ly
//       tệp nào của bộ cài, win-unpacked hay thư mục đã cài (các tệp còn nguyên
//       và chạy được); đây không phải một lượt quét.
//     recorded_at: 2026-09-27T15:05:02+07:00
//   - claim: >
//       npm run test:packaged đạt P1-P6 trên release\win-unpacked.
//     how: >
//       cd Desktop; npm run dist; npm run test:packaged
//       (playwright.packaged.config.ts, tests/packaged/packaged_app.spec.ts;
//       mọi ca có --ct-test-data-dir tạm và --ct-test-no-dialog).
//     result: >
//       Phiên 14: 6 passed (34.3s) trên build lúc 20:56 và 6 passed (36.8s)
//       trên build cuối lúc 21:06 (mã nguồn cuối, dist đạt ngay lần đầu),
//       AVG và ReasonLabs đang bật (AVGSvc, 4 rsAppUI, rsEngineSvc), với buildTree/stillAlive
//       mới (DSK-1); P5 lần này: backend biến mất sau 976 ms, cây lúc chạy
//       [Main, ba Commission Tracker.exe con, python.exe cha là Main,
//       conhost.exe cha là python.exe]. Phần còn lại như phiên 13. Phiên 13:
//       6 passed (52.1s) trên build cuối; lượt trước trên cùng mã nguồn (build
//       hỏng ở bước NSIS nhưng win-unpacked đã dựng xong) cũng 6 passed. P1:
//       isPackaged true, resourcesPath đúng, trang client_list của giao diện
//       thật với "Chưa có khách hàng nào đang hoạt động.", index.html phục vụ
//       qua app:// trùng tệp resources\ui\index.html, backend là
//       <win-unpacked>\resources\python\python.exe
//       <win-unpacked>\resources\backend\Backend.py (ExecutablePath và
//       CommandLine), data.db trong thư mục tạm, Menu.getApplicationMenu() là
//       null. P2 (Q2, lần đo preflight đầu tiên trên Windows), netLog: [OPTIONS
//       /clients, Origin app://commission-tracker,
//       Access-Control-Request-Method POST, 200, Access-Control-Allow-Origin
//       app://commission-tracker], [POST /clients, 201, cùng Allow-Origin],
//       [GET /clients, 200, cùng Allow-Origin]; renderer đọc được khách hàng
//       vừa tạo. P3: hai dòng "ignoring test flag --ct-test-renderer-root=...
//       in the packaged app" và "... --ct-test-backend-script=...", một lần thử
//       backend với python.exe và Backend.py trong gói, "serving the interface
//       from <win-unpacked>\resources\ui", log không chứa đường dẫn backend giả
//       hay thư mục giao diện giả. P4: đóng cửa sổ, "closing its standard
//       input", backend exited with code 0, Electron thoát mã 0, không còn
//       python.exe nào trong win-unpacked. P5: cây lúc chạy [Commission
//       Tracker.exe (Main), ba tiến trình con Commission Tracker.exe,
//       python.exe (cha là Main), conhost.exe (cha là python.exe)]; sau
//       taskkill /F lên Main, backend biến mất sau 279 ms (lượt trước 1649 ms),
//       cả cây không còn. P6: bỏ khỏi PATH C:\Python314, ...\Python\Python313,
//       ...\Python\Python311; PYTHONHOME và PYTHONPATH trỏ vào thư mục không
//       tồn tại (Electron thấy đúng hai giá trị này); P1 vẫn đạt. Sau cả bộ:
//       "python processes of the package after the suite: []".
//     recorded_at: 2026-09-27T20:57:00+07:00
//   - claim: >
//       Cài và gỡ im lặng bằng bộ cài thật: cài vào thư mục chỉ định,
//       Publisher = TGN (DSK-7), gỡ sạch, không đụng %APPDATA%.
//     how: >
//       PowerShell: Start-Process "release\Commission Tracker Setup 0.1.0.exe"
//       -ArgumentList '/S','/D=%TEMP%\ct-install-14b' -Wait; đọc DisplayName
//       và Publisher trong HKCU\Software\Microsoft\Windows\CurrentVersion\
//       Uninstall; Start-Process "<thư mục>\Uninstall Commission Tracker.exe"
//       -ArgumentList '/S','/currentuser' -Wait, rồi chờ thư mục biến mất.
//       Chụp mốc %APPDATA% sau đó.
//     result: >
//       Build cuối (20:56): bộ cài thoát mã 0 sau 34 s, có Commission
//       Tracker.exe trong thư mục chỉ định; DisplayName "Commission Tracker
//       0.1.0", Publisher "TGN". Trình gỡ thoát mã 0, thư mục cài bị xóa sau
//       6 s, không còn mục nào trong Uninstall. Cùng kết quả ở đợt C (build
//       A2, %TEMP%\ct-install-14: cài 50 s, Publisher "TGN", thư mục bị xóa
//       sau 33 s). Exe đã cài chạy được ở đợt C (xem EVIDENCE thời gian khởi
//       động), backend là <thư mục cài>\resources\python\python.exe.
//     recorded_at: 2026-09-27T21:00:10+07:00
//   - claim: >
//       Đường chạy từ mã nguồn không hỏng (roadmap chặng C, tiêu chí 4).
//     how: >
//       cd UI; npm run e2e. cd Desktop; npm run lint; npm test. (Phiên 14
//       không đổi Backend/ hay UI/, nên không chạy lại pytest của backend và
//       npm run check của UI; kết quả của hai lệnh đó là của phiên 13.)
//     result: >
//       Phiên 14, mã nguồn cuối: UI npm run e2e 4 passed (24.1s), gồm
//       walkthrough client_list S1-S3 và main_layout, với Main đã có log vòng
//       đời mới; lệnh này tự ghi lại ảnh và client_list-run.json trong
//       UI/evidence/walkthroughs/client_list như thiết kế của nó. Desktop: npm
//       run lint sạch, npm test 14 passed. Phiên 13: Backend 375 passed, 1
//       warning in 353.68s; UI npm run check đạt (vitest 6 tệp, 65 kiểm thử).
//     recorded_at: 2026-09-27T20:59:30+07:00
//   - claim: >
//       Không kiểm thử nào của phiên đụng tới %APPDATA%\CommissionTracker thật:
//       các lần chụp mốc giống hệt nhau.
//     how: >
//       PowerShell, cho %APPDATA%\CommissionTracker và %APPDATA%\Commission
//       Tracker (userData theo productName): nếu thư mục có thì liệt kê mọi
//       tệp với kích thước, LastWriteTimeUtc và SHA-256; không có thì ghi
//       "NOT-EXISTS <đường dẫn>"; thêm mọi thư mục *ommission* trong
//       %APPDATA%. Chụp ở đầu phiên, sau đợt C (sau khi gỡ), và cuối phiên
//       (sau việc 9); so nội dung ba tệp.
//     result: >
//       Ba lần chụp (20:28:06 đầu phiên, 20:50 sau đợt C, 21:00:10 cuối
//       phiên) giống hệt nhau: "NOT-EXISTS
//       C:\Users\A\AppData\Roaming\CommissionTracker" và "NOT-EXISTS
//       C:\Users\A\AppData\Roaming\Commission Tracker", không có thư mục
//       *ommission* nào khác. Mọi lần chạy ứng dụng trong phiên, kể cả bản
//       sao ở đợt C lượt 1, đều mang --ct-test-data-dir.
//     recorded_at: 2026-09-27T21:00:10+07:00
//   - claim: >
//       DSK-15: sau khi đặt ngôn ngữ ứng dụng là "vi" từ config, ô "Hạn giao"
//       của form đơn hàng và hai ô ngày của trang "Thu nhập" hiện ngày/tháng/
//       năm, ở bản chạy từ mã nguồn và ở bản đóng gói; trước đó hiện tháng/
//       ngày/năm.
//     how: >
//       Phiên 26, máy có AVG và ReasonLabs bật. Script tạm (không nằm trong dự
//       án) mở ứng dụng bằng Playwright _electron.launch với --ct-test-data-
//       dir tạm và --ct-test-no-dialog, backend thật, nạp mẫu thu nhập D5 qua
//       UI/tests/tools/walkthrough_lib.mjs (seedIncomeSample), in app.
//       getLocale(), navigator.language, Intl, rồi mở "Thu nhập", điền "Từ
//       ngày" 2026-10-01 và "Đến ngày" 2026-11-30, chụp vùng main; mở "Đơn
//       hàng" > "Thêm đơn hàng", điền "Hạn giao" 2026-11-30, chụp. Chạy 4 lần:
//       mã nguồn trước (chưa có dòng appendSwitch), mã nguồn sau, bản đóng gói
//       sau (npm run dist với "vi"), bản đóng gói trước (npm run dist với
//       app.locale tạm đặt "en-US", tức hành vi cũ; đã khôi phục "vi" ngay
//       sau). Ảnh ở Desktop/evidence/dsk15/{source,packaged}-{before,after}-
//       {income,commission-form}.png.
//     result: >
//       Trước (mã nguồn và gói): getLocale "en-US", navigator.language
//       "en-US", Intl "en-US"; ô ngày hiện "10/01/2026" và "11/30/2026" (trang
//       Thu nhập), "11/30/2026" (Hạn giao). Sau (mã nguồn và gói): getLocale
//       "vi", navigator.language "vi", Intl "vi"; ô ngày hiện "01/10/2026" và
//       "30/11/2026", "30/11/2026". Vậy ô ngày ĐÃ hiện ngày/tháng/năm. Kết
//       luận: Chromium theo switch lang, không theo vùng của Windows.
//       Kiểm thử tự động có bằng chứng cắn: ca 12 của npm test (getLocale,
//       navigator.language, Intl bằng app.locale của config) đạt với dòng
//       appendSwitch (MEASURED language: {"getLocale":"vi","navigatorLanguage"
//       :"vi","intlLocale":"vi"}); khi chú thích dòng đó và dịch lại, ca 12
//       hỏng với getLocale, navigatorLanguage, intlLocale đều "en-US" thay vì
//       "vi"; khôi phục dòng, ca 12 đạt lại.
//     recorded_at: 2026-10-02T16:14:19.0645803+07:00
//   - claim: >
//       DSK-13: hộp thoại lỗi có câu tiếng Việt trước, chi tiết kỹ thuật ở
//       dòng sau; dòng FATAL không đổi; nội dung kiểm được khi chạy với
//       --ct-test-no-dialog.
//     how: >
//       cd Desktop; npm run build; npx playwright test -g "(13|14)\. error".
//       Ca 13: thư mục giao diện không tồn tại (startup); ca 14: backend giả
//       chết sau READY (running). Bằng chứng cắn: (a) tạm đổi buildErrorDialog
//       để content chỉ còn chi tiết kỹ thuật, chạy lại; (b) tạm bỏ đối số
//       'running' ở onUnexpectedExit, chạy lại; khôi phục cả hai. Ảnh thật:
//       script tạm PowerShell chạy electron.exe . --ct-test-data-dir=<tạm>
//       --ct-test-renderer-root=<không tồn tại> (không có --ct-test-no-dialog),
//       đợi cửa sổ lớp #32770, chụp bằng PrintWindow rồi đóng bằng WM_CLOSE;
//       ảnh ở Desktop/evidence/dsk13/source-startup-dialog.png.
//     result: >
//       Ca 13 và 14 đạt: nội dung ca 13 là "Commission Tracker không khởi động
//       được. Hãy mở lại ứng dụng; nếu lỗi vẫn còn, hãy gửi nội dung chi tiết
//       bên dưới cho người hỗ trợ.\n\nChi tiết kỹ thuật:\nThe interface files
//       were not found: the folder <thư mục tạm>\no-such-ui-dist does not
//       exist."; ca 14 dùng câu "Commission Tracker gặp lỗi khi đang chạy và
//       phải đóng..." và chi tiết "The backend stopped unexpectedly (exit code
//       3). The app will close.". Cả hai so dòng FATAL: cũ, nguyên chữ. (a):
//       cả hai ca hỏng. (b): chỉ ca 14 hỏng, ca 13 đạt. Sau khi khôi phục: 2
//       passed. Ảnh thật: hộp thoại Windows có tiêu đề cửa sổ "Error",
//       dòng đầu "Commission Tracker", câu tiếng Việt, "Chi tiết kỹ thuật:" và
//       thông điệp tiếng Anh; app thoát mã 1 sau khi đóng hộp thoại, không đụng
//       %APPDATA%. Hai lần chụp trước bằng CopyFromScreen chụp trúng nội dung
//       riêng tư phía sau (hộp thoại chưa nằm trên cùng); đã xóa ngay, đổi sang
//       PrintWindow, không giữ ảnh nào ngoài ảnh hộp thoại.
//     recorded_at: 2026-10-02T16:14:19.0645803+07:00
//   - claim: >
//       DSK-14: measure_startup.cjs không còn dùng chuỗi lệnh mã hóa; tiến
//       trình theo dõi sống tới cuối mỗi lượt đo khi AVG và ReasonLabs bật.
//     how: >
//       cd Desktop; Grep chuỗi "EncodedCommand" trong tests/ (không còn lệnh
//       gọi; chỉ còn câu giải thích đã diễn đạt lại). Với AVGSvc và
//       rsEngineSvc đang chạy: node tests/packaged/measure_startup.cjs 3
//       release/win-unpacked A. Đọc startup-logs/A-run<N>.log, đếm các dòng
//       SNAPSHOT và so thời điểm ảnh chụp cuối với thời điểm Main thoát; kiểm
//       không còn thư mục %TEMP%\ct-watch-* và tiến trình powershell.exe nào
//       chạy watch_processes.ps1.
//     result: >
//       3 lượt, mã thoát 0, không FATAL, không bản Main thứ hai, không
//       second-instance. Số ms từ spawn (dòng log đầu / backend started / READY
//       / cửa sổ / Main thoát): lượt 1 68/129/707/883/1637, lượt 2
//       117/177/734/902/1514, lượt 3 94/151/722/882/2944. Số ảnh chụp tiến
//       trình: 14, 14, 17; ảnh chụp cuối ở +6145, +6117, +7611 ms, tức hơn 4
//       s sau khi Main thoát (công cụ theo dõi thêm 5 s sau khi thoát): tiến
//       trình theo dõi sống tới cuối. exe SHA-256 bd912a32c9b397ca40045a2d423
//       fbe80fed95df7929b4b8ba062eb67ee426b04 (build có app.locale "vi", chưa
//       có khối checkpoint cuối). Không còn thư mục ct-watch-* hay tiến trình
//       theo dõi sót. Cảnh báo AVG mới: coding agent không đọc được lịch sử
//       cảnh báo của AVG; nhờ Project Owner xác nhận (xem báo cáo cuối phiên).
//     recorded_at: 2026-10-02T16:14:19.0645803+07:00
//   - claim: >
//       Phiên 26, chạy toàn bộ với AVG và ReasonLabs bật: lint, npm test, npm
//       run dist từ trạng thái sạch, npm run test:packaged, UI npm run e2e;
//       mốc %APPDATA% không đổi.
//     how: >
//       cd Desktop; npm run lint; npm test; xóa packaging\stage và release rồi
//       npm run dist (ELECTRON_BUILDER_CACHE trỏ vào thư mục tạm: sandbox của
//       agent chặn đổi tên trong %LOCALAPPDATA%\electron-builder\Cache, EXDEV,
//       như phiên 14); npm run test:packaged; node tests/packaged/
//       measure_startup.cjs 3 release/win-unpacked A. cd UI; npm run e2e
//       (CT_WALKTHROUGH_RUNNER không đặt); git status --short UI/evidence.
//       Mốc %APPDATA%: PowerShell liệt kê mọi tệp của %APPDATA%\CommissionTracker
//       và %APPDATA%\Commission Tracker với kích thước, LastWriteTimeUtc,
//       SHA-256, chụp đầu phiên (15:56:45) và cuối phiên (16:26:40), so từng dòng.
//     result: >
//       lint sạch (lần đầu có một lỗi no-irregular-whitespace ở
//       measure_startup.cjs do ký tự BOM gõ thẳng vào mã; đã đổi sang
//       String.fromCharCode(0xfeff)). npm test 17 passed (1.9m: 14 ca cũ, ca
//       12 ngôn ngữ, ca 13 và 14 hộp thoại), sau bộ không còn python.exe của
//       dự án. npm run dist: thoát mã 0 sau 121 s, exe SHA-256 9dd525bc29325b16
//       8b2083d6f9cc74d80dd9413b578261402871beadb86d7e88. test:packaged: lần
//       đầu 5/6 hỏng (P1, P2, P4, P5, P6) vì packaged_app.spec.ts còn chờ câu
//       "Chưa có khách hàng nào đang hoạt động.", trong khi client_list của
//       giao diện (từ phiên 16) hiện "Chưa có khách hàng nào." khi rỗng; lỗi có
//       sẵn từ trước, không do ngôn ngữ ứng dụng; sửa một dòng chờ chữ trong
//       tests/packaged/packaged_app.spec.ts rồi 6 passed (38,0 s), sau bộ không
//       còn python.exe của gói. measure_startup.cjs 3 lượt: mã thoát 0, không
//       FATAL, không bản Main thứ hai; dòng log đầu 115/89/81 ms, READY
//       767/723/718, cửa sổ 942/917/889; ảnh chụp cuối ở +6151, +6098, +6132
//       ms (Main thoát ở +1557, +1502, +1568): tiến trình theo dõi sống tới
//       cuối. UI npm run e2e: 59 passed (3,4m); git status --short UI/evidence
//       trống. Mốc %APPDATA%: 70 dòng ở cả hai lần, 0 khác biệt (data.db
//       114688 byte, ghi 2026-09-28T14:09:42.7922654Z, SHA-256 B1996554...390B;
//       mọi lần chạy đều có --ct-test-data-dir tạm). Các kết quả trên là của
//       mã nguồn trước lần sửa cuối của khối checkpoint này (chỉ là chú thích,
//       nhưng làm dist\main.js và app.asar đổi như đã ghi ở main-EXP-017).
//     recorded_at: 2026-10-02T16:26:47.6226621+07:00
//   - claim: >
//       Phiên 30, môi trường: Node, npm, Electron, Python, antivirus.
//     how: >
//       Từ Desktop: node --version; npm --version; npx electron --version;
//       ..\Backend\env\Scripts\python.exe --version; PowerShell: Get-CimInstance
//       -Namespace root/SecurityCenter2 -ClassName AntiVirusProduct; Get-Process
//       AVGSvc,rsEngineSvc,rsAppUI.
//     result: >
//       v24.14.1; 11.11.0; v44.4.5; Python 3.13.12. Reason Cybersecurity 266240
//       và AVG Antivirus 266240 (bật), Windows Defender 393472 (tắt); AVGSvc,
//       rsEngineSvc, bốn rsAppUI đang chạy suốt phiên. Windows 11 Home. Mốc đầu
//       phiên: npm run lint sạch, npm test 17 passed (2,0 phút), UI npm run
//       build đạt, git status --short trống.
//     recorded_at: 2026-10-05T11:16:31.4746772+07:00
//   - claim: >
//       Thông báo Windows từ Electron 44.4.5 chạy từ mã nguồn: hiện được không
//       cần AUMID tự đặt; AUMID chưa đăng ký làm toast vô hình dù sự kiện show
//       vẫn bắn (main-EXP-026).
//     how: >
//       Từ Desktop: Start-Process node_modules\electron\dist\electron.exe
//       -ArgumentList tests\tools\toast_probe_main.cjs, "--label=...",
//       --seconds=14 (và --aumid=<id>) -RedirectStandardOutput <tệp> -Wait
//       -NoNewWindow; mỗi lượt hiện một toast thử, Project Owner nhìn màn hình.
//       Lượt A không --aumid, B --aumid=com.commissiontracker.desktop, C
//       --aumid=com.commissiontracker.desktop.probe-unregistered --seconds=40.
//     result: >
//       A: isSupported true, sự kiện show, không close trong 14 s; Project Owner
//       thấy toast. B: show, close sau khoảng 9,5 s; thấy toast (AUMID đã đăng ký
//       bởi lối tắt Start Menu của bản cài cũ ngày 2026-09-28). C: show nhưng
//       không thấy toast ("tôi còn chẳng thấy toast cơ"), không click, không
//       close. Sau khi đổi Main (AUMID chỉ khi đóng gói): npm run build; node
//       tests/tools/toast_demo.cjs; hai toast ("Sắp tới hạn giao: Tranh hạn hôm
//       nay" / "Hạn giao 04/10/2026 · nhắc trước 1 ngày" và "Tổng hợp định kỳ: 3
//       đơn đang mở" / "2 đơn có hạn giao · sớm nhất: Minh họa bìa sách
//       (01/01/2026)"), mỗi cái show rồi click "(window brought to the front:
//       true)"; Project Owner xác nhận: toast đúng chữ, cửa sổ lên trước, trang
//       "Nhắc việc" còn đủ hai nhắc việc. Lần demo đầu (AUMID đã đặt bằng appId):
//       show, close, không click, Project Owner bấm mà cửa sổ demo không lên.
//       Chưa chụp ảnh toast. Chưa đo bản cài thật (plan cấm cài).
//     recorded_at: 2026-10-05T11:16:31.4746772+07:00
//   - claim: >
//       DSK-18: có --ct-test-show-inactive thì cửa sổ hiện mà không nhận tiêu
//       điểm; không cờ thì như cũ; bản đóng gói bỏ qua cờ.
//     how: >
//       cd Desktop; npm run build; npx playwright test tests/show_inactive.spec.ts
//       (ca 15 có cờ, ca 16 không cờ, mỗi ca 5 lượt; _electron.launch, thư mục
//       dữ liệu tạm; chủ nền trước đọc bằng GetForegroundWindow qua
//       tests/fixtures/foreground_holder.ps1). Phép cắn: tạm đổi show:
//       !settings.showInactive thành show: true, chạy ca 15, khôi phục. Bản đóng
//       gói: ca P7 của npm run test:packaged.
//     result: >
//       Ca 15: 5/5 lượt visible true, focused false, nền trước không thuộc cây
//       Electron, log có "ready-to-show: showing the window without focus". Ca
//       16 (lần đo đầu): 5/5 focused true, Electron giành nền trước 0/5; (lần
//       khác) focused true 4/5 vì người dùng đổi cửa sổ, Electron giành nền trước
//       1/5. Phép cắn: ca 15 hỏng ở focused (5/5 lượt true, Electron giành nền
//       trước 2/5); khôi phục thì 2 passed. P7: log "ignoring test flag
//       --ct-test-show-inactive... in the packaged app", không có dòng ready-to-
//       show.
//     recorded_at: 2026-10-05T11:16:31.4746772+07:00
//   - claim: >
//       DSK-17 ráp vào Main: ticker khởi động sau READY và lần nạp đầu, lần kiểm
//       đầu chạy ngay, dừng trước backend; chi tiết ca và phép cắn ở EVIDENCE của
//       reminder_ticker.
//     how: >
//       cd Desktop; npm run build; npx playwright test tests/reminder_ticker.spec.ts
//       (C4 dừng trước backend, D2 lần kiểm đầu chạy ngay); npm run test:packaged
//       (P7, P8).
//     result: >
//       12 passed (52,3 s). D2: toast đầu 2056 ms sau khi cửa sổ mở, nhịp 600000
//       ms. Phép cắn: bỏ this.tick() đầu tiên thì D2 hỏng ("not seen within 20000
//       ms"); bỏ await reminderTicker?.stop() trong shutdown thì C4 hỏng (không có
//       dòng "reminder ticker stopped"); khôi phục thì đạt. Bản đóng gói: P7 đạt
//       (AUMID đặt từ config, lần kiểm đầu "0 notification(s)", một lần kiểm sau
//       hơn 2,5 s, ticker dừng trước backend), P8 đạt (show rồi click).
//     recorded_at: 2026-10-05T11:16:31.4746772+07:00
//   - claim: >
//       Gói không còn thiếu module của ticker (main-EXP-027); npm run dist từ
//       trạng thái sạch đạt.
//     how: >
//       cd Desktop; xóa packaging\stage và release; ELECTRON_BUILDER_CACHE trỏ
//       vào thư mục tạm (sandbox của agent chặn đổi tên trong
//       %LOCALAPPDATA%\electron-builder\Cache, như phiên 14 và 26); npm run dist;
//       node -e "require('@electron/asar').listPackage('release/win-unpacked/
//       resources/app.asar')" lọc dist.
//     result: >
//       Lần dist đầu (không đặt cache) hỏng ở bước giải nén NSIS (lỗi môi trường
//       của agent); với cache tạm thoát mã 0 sau khoảng 135 s. Trước khi sửa
//       electron-builder.yml, app.asar thiếu dist\cross_cutting và bản đóng gói
//       báo "Cannot find module" (Project Owner chụp hộp thoại). Sau khi sửa:
//       app.asar có dist\cross_cutting\reminder_ticker\reminder_ticker.js,
//       toast_text.js, dist\main.js, dist\preload.js. test:packaged: P1-P7
//       passed (1,6 phút), P8 lần đầu hỏng vì regex của chính ca đó (id toast là
//       UUID, không bắt đầu bằng n), sửa rồi P8 passed (25,6 s). Các số là của mã
//       nguồn trước lần sửa cuối của khối checkpoint này.
//     recorded_at: 2026-10-05T11:16:31.4746772+07:00
//   - claim: >
//       Phiên 35, chạy toàn bộ với AVG và ReasonLabs bật: lint, npm test ba lượt liên tiếp,
//       dist từ trạng thái sạch, test:packaged, UI npm run e2e, UI/evidence không đổi.
//     how: >
//       cd Desktop; npm run lint; npm test (ba lần liên tiếp); xóa packaging\stage và release;
//       ELECTRON_BUILDER_CACHE trỏ vào %TEMP%\ct-eb-cache; npm run dist; npm run test:packaged.
//       cd UI; npm run build; npm run e2e (CT_WALKTHROUGH_RUNNER không đặt; một lượt);
//       git status --short evidence. Môi trường: Node v24.14.1, npm 11.11.0, Electron v44.4.5,
//       Python 3.13.12; Reason Cybersecurity 266240 và AVG Antivirus 266240 (bật), Windows
//       Defender 393472 (tắt); AVGSvc, rsEngineSvc, bốn rsAppUI đang chạy.
//     result: >
//       Mốc đầu phiên (09:21-09:26, trên mã cũ): npm ci, lint sạch, npm test 40 passed (4,3
//       phút), UI build đạt, git status trống. Cuối phiên: lint sạch, không ngoại lệ eslint
//       mới. npm test: 62 passed ở cả ba lượt (09:37:41-09:42:21; 09:42:21-09:46:58;
//       09:46:58-09:51:37), sau bộ không còn python.exe của dự án (40 ca cũ, N1b, N10-N14 mới
//       ở native_dialogs, 16 ca của restore_data). npm run dist: thoát mã 0 (09:51:50-09:53:54,
//       không gặp EXDEV khi đặt cache vào thư mục tạm), app.asar liệt kê ở EVIDENCE của
//       restore_data. test:packaged: 10 passed (1,2 phút; P1-P10). UI npm run e2e: 75 passed
//       (5,9 phút); git status --short evidence trống. Các số là của mã nguồn trước lần sửa
//       cuối của các khối checkpoint (chỉ đổi chú thích).
//     recorded_at: 2026-10-08T14:59:36.1924815+07:00
//   - claim: >
//       Không test hay lần chạy nào của phiên đụng thư mục dữ liệu thật
//       %APPDATA%\CommissionTracker.
//     how: >
//       PowerShell (script tạm ngoài dự án): liệt kê mọi tệp của %APPDATA%\CommissionTracker
//       và %APPDATA%\Commission Tracker với kích thước, LastWriteTimeUtc và (cho
//       CommissionTracker) SHA-256, chụp lúc 2026-10-08T09:21:07 (đầu phiên) và
//       2026-10-08T14:59:23.1025430+07:00 (cuối phiên, sau npm test ba lượt, dist,
//       test:packaged, UI e2e và ba lần Project Owner chạy npm run probe với
//       --ct-test-data-dir tạm), so từng dòng bằng Compare-Object.
//     result: >
//       Cả hai thư mục: 69 dòng ở mỗi mốc, 0 dòng khác nhau. CommissionTracker: data.db
//       114688 byte, ghi 2026-09-28T14:09:42.7922654Z, SHA-256 B1996554...390B, và
//       data.db.lock; không đổi.
//     recorded_at: 2026-10-08T14:59:36.1924815+07:00
//   - claim: >
//       Phiên 36: backend_controller dừng rồi khởi động lại trên cùng cổng không gây FATAL; thứ tự mới
//       của startLayer; lối vào ipc vẫn đúng năm địa chỉ.
//     how: >
//       Số liệu đầy đủ ở EVIDENCE của restore_data (đo việc 2, A1-A6, bốn phép cắn, chạy toàn bộ, khứ
//       hồi thật của Project Owner) và của restore_trigger. Riêng Main: tests/restore_apply.spec.ts A2
//       (hai dòng "backend READY on port P" cùng P, dòng "backend_controller: starting the backend again
//       on port P", không FATAL, không "stopped unexpectedly"), A4 và A5 (khởi động thoát trước READY là
//       kết quả "failed", không FATAL ở A4), A1 (restore_trigger trước "opening the window"); ca 1 của
//       desktop_main.spec.ts và N14 của native_dialogs.spec.ts vẫn đạt (bridge hai khóa, năm địa chỉ).
//     result: >
//       npm test 69 passed ba lượt liên tiếp, test:packaged 11 passed (P11 đạt), dist từ trạng thái sạch
//       thoát mã 0, UI e2e 75 passed, UI/evidence không đổi, lint sạch không ngoại lệ mới. Mốc
//       %APPDATA% 69 dòng, 0 khác biệt.
//     recorded_at: 2026-10-08T19:09:25.3415976+07:00
//
// NOTES:
//   - content: >
//       Dịch vụ AI không được khởi động ở V1 (.design/v1_scope.md: watermark để
//       dành V4 trở đi, .design/product_versions.md). Main vẫn chọn một cổng
//       trống cho nó và trao CT_AI_SERVICE_BASE_URL=http://127.0.0.1:<cổng> cho
//       backend, vì backend bắt buộc có biến này (main-EXP-003 của backend).
//       Không tiến trình nào nghe trên cổng đó. Khi làm watermark (V4 trở đi),
//       Main khởi động clause_c_ai_service với CT_PORT là đúng cổng này (tìm
//       aiPort trong startBackend) và chờ READY theo luật "the app must run
//       without clause_c_ai_service".
//     written_at: 2026-09-26
//   - content: >
//       Desktop.esproj giữ nguyên JavaScriptTestFramework = Vitest: không chắc
//       Visual Studio có giá trị cho Playwright nên không đoán. Test Explorer của
//       Visual Studio có thể không thấy kiểm thử; chạy bằng npm test
//       (TestCommand). Đã đổi StartupCommand = npm start, BuildCommand = npm run
//       build, TestCommand = npm test, JavaScriptTestRoot = tests\. Phiên 13
//       và 14 không sửa tệp này.
//     written_at: 2026-09-26
//   - content: >
//       Cờ dòng lệnh chỉ dành cho kiểm thử (configs/desktop.json test_flags; lần
//       chạy bình thường không truyền cờ nào): --ct-test-renderer-root=,
//       --ct-test-data-dir= (đặt appData và userData, không bao giờ đụng
//       %APPDATA% thật), --ct-test-backend-interpreter=, --ct-test-backend-script=,
//       --ct-test-backend-working-dir=, --ct-test-first-backend-port= (ép cổng
//       của lần thử đầu, dùng cho ca 4), --ct-test-no-dialog. Chạy từ mã nguồn:
//       mọi cờ đều có hiệu lực; đường dẫn trong cờ tính theo thư mục hiện tại,
//       đường dẫn trong desktop.json tính theo thư mục Desktop/. Bản đóng gói:
//       chỉ --ct-test-data-dir= và --ct-test-no-dialog có hiệu lực, năm cờ kia
//       bị bỏ qua và ghi log (main-EXP-010).
//     written_at: 2026-09-27
//   - content: >
//       Cho Project Owner và phiên sau. (1) Lần mở đầu tiên của một exe mới ở
//       thư mục không có ngoại lệ antivirus có thể mất tới khoảng 64 giây mới
//       có cửa sổ, và trong lúc đó một bản sao của ứng dụng chạy
//       (main-EXP-015, main-EXP-018, main-EXP-019); người chạy thử cần được
//       dặn chờ. Màn hình chờ không giúp được, vì JavaScript của Main chưa
//       chạy trong khoảng chờ đó. Ký số là quyết định của Project Owner. (2)
//       Chưa có lượt quét antivirus nào (Defender tắt trên máy này). (3)
//       Phiên backend sau tách pytest và httpx khỏi requirements.txt sẽ bớt
//       khoảng 13,7 MB (D6). (4) npm run dist có thể hỏng vì antivirus giữ tệp
//       dù đã có ngoại lệ thư mục: phiên 13 gặp "spawn EPERM" ở bước NSIS,
//       phiên 14 gặp "EPERM ... rename win-unpacked.tmp" (1 trên 5 lần). Chạy
//       lại cùng lệnh; nếu lặp lại thường xuyên thì báo. Điều kiện build ở
//       main-EXP-017. (Nhận định cũ "máy bình thường không gặp" về PATH thiếu
//       PowerShell là sai và đã bỏ.)
//     written_at: 2026-09-27
//   - content: >
//       Cách làm của phiên 14 so với plan. Thứ tự: việc 6c cần một build
//       nhưng release\ chưa có, nên đã dist một lần (build T) trước khi chạy
//       thử công cụ; đợt A dùng hai build khác (A1, A2) có hash mới nhờ
//       -c.extraMetadata.ctBuildStamp, không sửa mã nguồn. Ngoài danh sách của
//       plan: stillAlive cũng so CreationDate (cùng nguyên nhân với DSK-1);
//       prepare_runtime dùng cùng hàm xóa có thử lại cho cả packaging\stage;
//       argv trong log của bản đóng gói che giá trị năm cờ bị bỏ qua (P3);
//       measure_startup đếm thêm second_instance_events (dòng second-instance
//       của Main), other_mains_in_folder, data_folder_left, và ghi vào
//       startup-logs/ (test-results/ bị Playwright dọn mỗi lần chạy). Tệp mới:
//       tests/process_tree.spec.ts. Sau khi chạm điểm dừng bắt buộc của việc 7
//       (đợt C lượt 1), phiên chỉ vá công cụ đo và làm việc 8-10, không đo
//       thêm DSK-2.
//     written_at: 2026-09-27
//   - content: >
//       Phiên 30: hai cờ kiểm thử mới trong desktop.json test_flags, cả hai chỉ
//       bản chạy từ mã nguồn (bản đóng gói bỏ qua và ghi log, nằm trong
//       packaged.ignored_test_flags): --ct-test-show-inactive (không giá trị) và
//       --ct-test-reminder-interval-ms=<số nguyên dương>. Bước giao diện của DSK-18
//       (thêm cờ vào launchArgs của công cụ kiểm thử UI và main_layout.spec.ts) là
//       việc của phiên giao diện sau (UI-18), không làm ở phiên desktop này.
//     written_at: 2026-10-05
//   - content: >
//       Cho phiên sau: (1) máy Project Owner có bản Commission Tracker đã cài (lối
//       tắt Start Menu ngày 2026-09-28) cùng AUMID com.commissiontracker.desktop,
//       nên mọi phép đo thông báo của bản đóng gói trên máy này bị nhiễu; đo sạch
//       cần máy không có bản cài, hoặc gỡ bản cài trước. (2) Bản đã cài từ bộ cài
//       build lúc 20:58 ngày 2026-10-04 thiếu dist\cross_cutting (main-EXP-027):
//       phải cài lại từ bộ cài build sau khi sửa. (3) npm run e2e của UI giờ hiện
//       toast Windows thật ở các lượt có reminder_list (ticker chạy trong mọi ứng
//       dụng e2e mở); đó là hành vi đúng.
//     written_at: 2026-10-05
// ===WCA-CHECKPOINT-END===
/**
 * Main of the desktop layer (clause_d_desktop).
 *
 * Logistics only: read configs/desktop.json, hold the single-instance lock,
 * choose ports on the loopback host, launch the backend as a child process
 * and wait for its READY line, serve the renderer from ui_origin, open the
 * window with the preload script, and stop the backend (close its stdin)
 * before the app exits (data_schema.yaml, clause_a_common.mandatory_rules).
 * It also starts the cross-cutting reminder_ticker once the backend is READY
 * and the window has loaded, and stops it before the backend. It registers the
 * cross-cutting entry native_dialogs (ipc) and wires the workflow restore_data
 * before the window opens (handing it the backend_controller, the lifecycle tool
 * that stops and starts the backend on the same port), runs the cross-cutting
 * restore_trigger once and waits for it (phase 2 of a restore), and hands the
 * preload script the ipc addresses that are implemented.
 */

import { app, BrowserWindow, dialog, ipcMain, Menu, Notification, protocol } from 'electron'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import * as fs from 'node:fs'
import * as net from 'node:net'
import * as path from 'node:path'
import { registerNativeDialogs } from './cross_cutting/native_dialogs/native_dialogs'
import { ReminderTicker, type ReminderTickerConfig, type Toast } from './cross_cutting/reminder_ticker/reminder_ticker'
import { runRestoreTrigger, type RestoreTriggerText } from './cross_cutting/restore_trigger/restore_trigger'
import { RestoreDataAdapters } from './workflows/restore_data/adapters'
import type { BackendController, RestoreDataConfig } from './workflows/restore_data/entities'
import { InProcessCallError, registerRestoreDataRouters } from './workflows/restore_data/routers'
import { RestoreDataService } from './workflows/restore_data/services'

const LAYER_ROOT = path.resolve(__dirname, '..')
const CONFIG_FILE = path.join(LAYER_ROOT, 'configs', 'desktop.json')
const RESTORE_DATA_CONFIG_FILE = path.join(LAYER_ROOT, 'configs', 'restore_data.json')

// --- 1. configuration --------------------------------------------------------

interface DesktopConfig {
  boundary: {
    loopback_host: string
    ui_origin: string
    renderer_bridge: string
    db_file_relative_to_app_data: string
  }
  backend: {
    launch_env: { port: string; db_file_path: string; ai_service_base_url: string; app_version: string }
    from_source: { interpreter: string; script: string; working_dir: string }
    ready_line: string
    ready_timeout_ms: number
    shutdown_timeout_ms: number
    start_attempts: number
  }
  renderer: {
    root_dir: string
    entry_file: string
    window: { width: number; height: number }
    content_types: Record<string, string>
    default_content_type: string
    non_fatal_first_load_errors: string[]
  }
  preload: { arguments: { bridge_name: string; backend_base_url: string; ipc_addresses: string } }
  native_dialogs: { pick_folder: { address: string; title: string }; open_file: { address: string; title: string } }
  app: { locale: string; app_user_model_id: string }
  reminder_ticker: ReminderTickerConfig
  restore_trigger: RestoreTriggerText
  main: {
    failure_exit_code: number
    error_dialog_title: string
    error_dialog: { startup_summary: string; running_summary: string; restore_failed_summary: string; detail_label: string }
  }
  packaged: {
    backend: { interpreter: string; script: string; working_dir: string }
    renderer_root_dir: string
    ignored_test_flags: Array<keyof DesktopConfig['test_flags']>
  }
  test_flags: {
    renderer_root: string
    data_dir: string
    backend_interpreter: string
    backend_script: string
    backend_working_dir: string
    first_backend_port: string
    no_dialog: string
    show_inactive: string
    reminder_interval_ms: string
  }
}

/** What this run of the Main uses, after test flags (if any) are applied. */
interface RunSettings {
  backendCommand: BackendCommand
  rendererRoot: string
  dataDir: string | null
  firstBackendPort: number | null
  showDialogs: boolean
  /** Test flag (run from source only): the window appears without taking the
   * focus (DSK-18). False for a person opening the app, and always in the
   * packaged app. */
  showInactive: boolean
  /** Test flag (run from source only): the reminder ticker's interval, in ms
   * (DSK-17). Null: the interval of desktop.json. */
  reminderIntervalMs: number | null
}

interface BackendCommand {
  interpreter: string
  script: string
  workingDir: string
}

function loadConfig(): DesktopConfig {
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) as DesktopConfig
}

/** Configs of the restore_data workflow (configs/restore_data.json): only the
 * Main reads the file, then hands the values to the workflow. */
function loadRestoreDataConfig(): RestoreDataConfig {
  return JSON.parse(fs.readFileSync(RESTORE_DATA_CONFIG_FILE, 'utf8')) as RestoreDataConfig
}

function flagValue(argv: readonly string[], prefix: string): string | null {
  const hit = argv.find((arg) => arg.startsWith(prefix))
  return hit === undefined ? null : hit.slice(prefix.length)
}

/** Run from source: paths in desktop.json (from_source, renderer.root_dir)
 * are relative to the layer folder, and every test flag applies; paths given
 * on the command line are relative to the current directory.
 * Packaged app (resourcesPath not null): paths come from desktop.json
 * "packaged", relative to the app's resources folder, and the test flags
 * that could point outside the package are ignored (only data_dir and
 * no_dialog apply), so a run of the package always uses its own backend and
 * interface. */
function readRunSettings(config: DesktopConfig, argv: readonly string[], resourcesPath: string | null): RunSettings {
  const flags = config.test_flags
  const dataDir = flagValue(argv, flags.data_dir)
  const common = {
    dataDir: dataDir === null || dataDir === '' ? null : path.resolve(dataDir),
    showDialogs: !argv.includes(flags.no_dialog),
  }

  if (resourcesPath !== null) {
    const packaged = config.packaged
    for (const key of packaged.ignored_test_flags) {
      const prefix = flags[key]
      if (argv.some((arg) => arg.startsWith(prefix))) log(`ignoring test flag ${prefix}... in the packaged app`)
    }
    const fromResources = (p: string) => path.resolve(resourcesPath, p)
    const workingDir = fromResources(packaged.backend.working_dir)
    return {
      ...common,
      backendCommand: {
        interpreter: fromResources(packaged.backend.interpreter),
        // Absolute, so the process's command line shows which Backend.py runs.
        script: path.join(workingDir, packaged.backend.script),
        workingDir,
      },
      rendererRoot: fromResources(packaged.renderer_root_dir),
      firstBackendPort: null,
      showInactive: false,
      reminderIntervalMs: null,
    }
  }

  const fromLayer = (p: string) => path.resolve(LAYER_ROOT, p)
  const fromFlag = (prefix: string, fallback: string): string => {
    const value = flagValue(argv, prefix)
    return value === null || value === '' ? fallback : path.resolve(value)
  }
  const rawPort = flagValue(argv, flags.first_backend_port)
  const rawInterval = flagValue(argv, flags.reminder_interval_ms)
  const interval = rawInterval === null ? Number.NaN : Number(rawInterval)
  if (rawInterval !== null && !(Number.isInteger(interval) && interval > 0)) {
    log(`ignoring ${flags.reminder_interval_ms}${rawInterval}: not a positive whole number of milliseconds`)
  }
  const src = config.backend.from_source
  return {
    ...common,
    backendCommand: {
      interpreter: fromFlag(flags.backend_interpreter, fromLayer(src.interpreter)),
      script: fromFlag(flags.backend_script, src.script),
      workingDir: fromFlag(flags.backend_working_dir, fromLayer(src.working_dir)),
    },
    rendererRoot: fromFlag(flags.renderer_root, fromLayer(config.renderer.root_dir)),
    firstBackendPort: rawPort === null ? null : Number.parseInt(rawPort, 10),
    showInactive: argv.includes(flags.show_inactive),
    reminderIntervalMs: Number.isInteger(interval) && interval > 0 ? interval : null,
  }
}

function parseOrigin(origin: string): { scheme: string; host: string } {
  // "app://commission-tracker" -> scheme "app", host "commission-tracker"
  const match = /^([a-z][a-z0-9+.-]*):\/\/([^/]+)$/.exec(origin)
  if (match === null) throw new Error(`ui_origin is not <scheme>://<host>: ${origin}`)
  return { scheme: match[1], host: match[2] }
}

function originOf(rawUrl: string): string | null {
  // Node's URL gives origin "null" for non-special schemes such as app:, so
  // the origin is rebuilt from protocol and host.
  try {
    const url = new URL(rawUrl)
    return `${url.protocol}//${url.host}`
  } catch {
    return null
  }
}

function log(message: string): void {
  process.stderr.write(`[desktop-main] ${message}\n`)
}

// --- ports -------------------------------------------------------------------

function pickFreePort(host: string, avoid: readonly number[] = []): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.once('error', reject)
    server.listen(0, host, () => {
      const address = server.address()
      const port = typeof address === 'object' && address !== null ? address.port : 0
      server.close(() => {
        if (port === 0) reject(new Error('could not read the chosen port'))
        else if (avoid.includes(port)) pickFreePort(host, avoid).then(resolve, reject)
        else resolve(port)
      })
    })
  })
}

// --- backend child process (lifecycle tool) ----------------------------------

type StartOutcome =
  | { kind: 'ready' }
  | { kind: 'exited'; code: number | null; signal: NodeJS.Signals | null }
  | { kind: 'spawn_error'; message: string }
  | { kind: 'timeout' }

interface BackendProcessOptions {
  command: BackendCommand
  env: (port: number) => NodeJS.ProcessEnv
  readyLine: string
  readyTimeoutMs: number
  shutdownTimeoutMs: number
  onUnexpectedExit: (code: number | null, signal: NodeJS.Signals | null) => void
}

/**
 * One backend child process at a time. The port stays on the object, so the
 * backend can be stopped and started again on the same port
 * (restore_data.backend_controller, wired in main()).
 */
class BackendProcess {
  port: number | null = null
  private child: ChildProcessWithoutNullStreams | null = null
  private exited: Promise<number | null> | null = null
  private ready = false
  private stopping = false

  constructor(private readonly options: BackendProcessOptions) {}

  get running(): boolean {
    return this.child !== null && this.child.exitCode === null && this.child.signalCode === null
  }

  start(port: number): Promise<StartOutcome> {
    const { command, readyLine, readyTimeoutMs } = this.options
    this.port = port
    this.ready = false
    this.stopping = false
    // stdin is a pipe kept open for the whole life of the backend: closing
    // it is the stop signal (clause_a_common.mandatory_rules).
    const child = spawn(command.interpreter, [command.script], {
      cwd: command.workingDir,
      env: this.options.env(port),
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    })
    this.child = child
    child.stdin.on('error', () => {
      // EPIPE when the backend is already gone; its exit is reported below.
    })
    child.stderr.on('data', (chunk: Buffer) => process.stderr.write(chunk))

    this.exited = new Promise((resolve) => {
      child.once('exit', (code, signal) => {
        log(`backend (pid ${child.pid}) exited with code ${code}${signal ? ` (signal ${signal})` : ''}`)
        resolve(code)
      })
      child.once('error', () => {
        if (child.pid === undefined) resolve(null)
      })
    })

    return new Promise((resolve) => {
      let settled = false
      let pending = ''
      const finish = (outcome: StartOutcome) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(outcome)
      }
      const timer = setTimeout(() => finish({ kind: 'timeout' }), readyTimeoutMs)

      child.once('spawn', () =>
        log(`backend started (pid ${child.pid}) on port ${port}: ${command.interpreter} ${command.script} in ${command.workingDir}`),
      )
      child.once('error', (err) => finish({ kind: 'spawn_error', message: err.message }))
      child.once('exit', (code, signal) => {
        if (!this.ready) finish({ kind: 'exited', code, signal })
        else if (!this.stopping) this.options.onUnexpectedExit(code, signal)
      })

      // stdout arrives in arbitrary chunks: split on line ends, never compare
      // raw chunks.
      child.stdout.setEncoding('utf8')
      child.stdout.on('data', (chunk: string) => {
        pending += chunk
        let end: number
        while ((end = pending.indexOf('\n')) >= 0) {
          const line = pending.slice(0, end).replace(/\r$/, '')
          pending = pending.slice(end + 1)
          if (!this.ready && line === readyLine) {
            this.ready = true
            log(`backend READY on port ${port}`)
            finish({ kind: 'ready' })
          } else {
            log(`backend stdout (unexpected): ${JSON.stringify(line)}`)
          }
        }
      })
    })
  }

  /** Close stdin, wait for the backend to exit on its own, terminate it after
   * the shutdown timeout. Resolves with its exit code (null if terminated or
   * never started). */
  async stop(): Promise<number | null> {
    const child = this.child
    const exited = this.exited
    if (child === null || exited === null) return null
    this.stopping = true
    if (!this.running) return exited
    log(`stopping backend (pid ${child.pid}): closing its standard input`)
    child.stdin.end()
    const timedOut = Symbol('timeout')
    let timer: NodeJS.Timeout | undefined
    const result = await Promise.race([
      exited,
      new Promise<typeof timedOut>((resolve) => {
        timer = setTimeout(() => resolve(timedOut), this.options.shutdownTimeoutMs)
      }),
    ])
    clearTimeout(timer)
    if (result !== timedOut) return result
    log(`backend (pid ${child.pid}) did not exit within ${this.options.shutdownTimeoutMs} ms; terminating it`)
    return this.terminate()
  }

  /** Terminate the backend now (used after a timeout). */
  async terminate(): Promise<number | null> {
    const child = this.child
    const exited = this.exited
    if (child === null || exited === null) return null
    this.stopping = true
    if (this.running) child.kill()
    return exited
  }
}

// --- renderer files (app:// protocol) ----------------------------------------

/** Maps an app:// URL to a file inside the renderer root, or null (404). */
function resolveRendererFile(rawUrl: string, host: string, root: string, entry: string): string | null {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }
  if (url.host !== host) return null
  let decoded: string
  try {
    decoded = decodeURIComponent(url.pathname)
  } catch {
    return null
  }
  if (decoded.includes('\0')) return null
  const relative = decoded.replace(/^[/\\]+/, '')
  const target = path.resolve(root, relative === '' ? entry : relative)
  const inside = path.relative(root, target)
  if (inside === '' || inside === '..' || inside.startsWith(`..${path.sep}`) || path.isAbsolute(inside)) return null
  return target
}

function registerRendererProtocol(config: DesktopConfig, scheme: string, host: string, root: string): void {
  const { entry_file, content_types, default_content_type } = config.renderer
  protocol.handle(scheme, async (request) => {
    const file = resolveRendererFile(request.url, host, root, entry_file)
    if (file !== null) {
      try {
        const data = await fs.promises.readFile(file)
        const type = content_types[path.extname(file).toLowerCase()] ?? default_content_type
        return new Response(data, { status: 200, headers: { 'content-type': type } })
      } catch {
        // missing file or a folder: 404 below
      }
    }
    return new Response('Not Found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } })
  })
}

/** Describes what is missing, or null when the renderer root is usable. */
function missingRendererFiles(root: string, entry: string): string | null {
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    return `The interface files were not found: the folder ${root} does not exist.`
  }
  const entryPath = path.join(root, entry)
  if (!fs.existsSync(entryPath) || !fs.statSync(entryPath).isFile()) {
    return `The interface files were not found: ${entry} is missing in ${root}.`
  }
  return null
}

// --- lifecycle ---------------------------------------------------------------

/** process.argv for the log. The packaged app does not show the values of
 * the test flags it ignores (as in readRunSettings): they must not appear in
 * its log at all. */
function argvForLog(config: DesktopConfig, argv: readonly string[], packaged: boolean): string[] {
  if (!packaged) return [...argv]
  const ignored = config.packaged.ignored_test_flags.map((key) => config.test_flags[key])
  return argv.map((arg) => {
    const prefix = ignored.find((p) => arg.startsWith(p))
    return prefix === undefined ? arg : `${prefix}...`
  })
}

/** When the failure happened: before the window finished loading
 * ('startup'), after the app was up ('running'), or when applying a pending
 * restore failed and the previous database could not be started either
 * ('restore_failed'). Picks the sentence. */
type FailurePhase = 'startup' | 'running' | 'restore_failed'

/** Text of the error dialog: a Vietnamese sentence first, the technical
 * message (the one logged after "FATAL:") after it. Wording is in
 * configs/desktop.json (main.error_dialog). */
function buildErrorDialog(config: DesktopConfig, phase: FailurePhase, detail: string): { title: string; content: string } {
  const text = config.main.error_dialog
  const summary = phase === 'startup' ? text.startup_summary : phase === 'running' ? text.running_summary : text.restore_failed_summary
  return { title: config.main.error_dialog_title, content: `${summary}\n\n${text.detail_label}\n${detail}` }
}

function main(): void {
  const config = loadConfig()
  const resourcesPath = app.isPackaged ? process.resourcesPath : null
  // First line of every run: the moment the Main's JavaScript runs, and
  // which process this is (start-up time and duplicate instances, DSK-2/3).
  log(
    `main started: pid ${process.pid}, parent pid ${process.ppid}, process start ` +
      `${new Date(performance.timeOrigin).toISOString()}, argv ${JSON.stringify(argvForLog(config, process.argv, resourcesPath !== null))}`,
  )
  const settings = readRunSettings(config, process.argv, resourcesPath)
  log(resourcesPath === null ? 'running from source' : `running the packaged app (resources: ${resourcesPath})`)
  const { loopback_host: host, ui_origin: uiOrigin } = config.boundary
  const origin = parseOrigin(uiOrigin)

  // Application language (DSK-15): Chromium reads the "lang" switch at start,
  // so it is set before 'ready' (Electron 44 app.getLocale(): "To set the
  // locale, use a command line switch at app startup"). It decides the
  // format of <input type="date"> in the renderer.
  app.commandLine.appendSwitch('lang', config.app.locale)
  log(`application language set to ${config.app.locale}`)

  // Windows toasts (DSK-17). Packaged app only: the Application User Model ID
  // is the appId of electron-builder.yml, which the NSIS installer also gives
  // the Start Menu shortcut, so the toast and the installed app share one
  // identity (a click then reaches this process). Run from source it is left at
  // Electron's default: measured (desktop session 30, EVIDENCE), an ID that no
  // shortcut registers makes the toast invisible although 'show' fires.
  if (resourcesPath !== null) {
    app.setAppUserModelId(config.app.app_user_model_id)
    log(`application user model id set to ${config.app.app_user_model_id}`)
  }

  // Test flag only: keep the database and Chromium's profile out of the
  // user's real app-data folder. Must happen before the instance lock, which
  // is keyed on userData.
  if (settings.dataDir !== null) {
    app.setPath('appData', settings.dataDir)
    app.setPath('userData', path.join(settings.dataDir, 'electron-user-data'))
  }

  // a. One instance only: two instances would mean two backends writing the
  //    same SQLite file.
  if (!app.requestSingleInstanceLock()) {
    log('another instance is already running; exiting without starting the backend')
    app.quit()
    return
  }

  // b. Before 'ready': the renderer's scheme.
  protocol.registerSchemesAsPrivileged([
    {
      scheme: origin.scheme,
      privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
    },
  ])

  let mainWindow: BrowserWindow | null = null
  let shutdownStarted = false
  let reminderTicker: ReminderTicker | null = null
  // Toasts still alive: a Notification that is garbage collected can lose its
  // events, so each one is kept until it closes, fails or is clicked.
  const liveToasts = new Set<Notification>()

  /** Brings the window back: restores it when minimized, then focuses it. The
   * second launch and a click on a toast both use it. False when no window. */
  function bringWindowToFront(): boolean {
    if (mainWindow === null) return false
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
    return true
  }

  /** The reminder_ticker's toast: a Windows notification whose click only
   * brings the window to the front (nothing is opened, nothing acknowledged). */
  function showWindowsToast(toast: Toast): void {
    if (!Notification.isSupported()) {
      log(`reminder toast ${toast.notificationId} not shown: notifications are not supported on this system`)
      return
    }
    const notification = new Notification({ title: toast.title, body: toast.body })
    liveToasts.add(notification)
    notification.on('show', () => log(`reminder toast ${toast.notificationId}: show`))
    notification.on('click', () => {
      log(`reminder toast ${toast.notificationId}: click (window brought to the front: ${bringWindowToFront()})`)
      liveToasts.delete(notification)
    })
    notification.on('close', () => {
      log(`reminder toast ${toast.notificationId}: close`)
      liveToasts.delete(notification)
    })
    notification.on('failed', (_event, error) => {
      log(`reminder toast ${toast.notificationId}: failed (${error})`)
      liveToasts.delete(notification)
    })
    notification.show()
  }

  const launchEnv = config.backend.launch_env
  const dbFilePath = path.join(app.getPath('appData'), ...config.boundary.db_file_relative_to_app_data.split('/'))
  let aiServiceBaseUrl = ''

  const backend = new BackendProcess({
    command: settings.backendCommand,
    env: (port) => ({
      ...process.env,
      [launchEnv.port]: String(port),
      [launchEnv.db_file_path]: dbFilePath,
      [launchEnv.ai_service_base_url]: aiServiceBaseUrl,
      [launchEnv.app_version]: app.getVersion(),
    }),
    readyLine: config.backend.ready_line,
    readyTimeoutMs: config.backend.ready_timeout_ms,
    shutdownTimeoutMs: config.backend.shutdown_timeout_ms,
    onUnexpectedExit: (code, signal) =>
      fatal(`The backend stopped unexpectedly (exit code ${code}${signal ? `, signal ${signal}` : ''}). The app will close.`, 'running'),
  })

  // The lifecycle tool handed to restore_data (data_schema.yaml
  // restore_data.backend_controller, from: main). Logistics only: it stops and
  // starts the one backend; when to do either is the workflow's decision. A stop
  // through it is not an "unexpected exit": BackendProcess.stop() marks the stop
  // before the process ends, so onUnexpectedExit (and its FATAL) does not fire.
  const backendController: BackendController = {
    stop: async () => {
      await backend.stop()
    },
    start: async () => {
      const port = backend.port
      if (port === null) return { kind: 'failed', reason: 'the backend has never been started, so there is no port to start it on' }
      log(`backend_controller: starting the backend again on port ${port}`)
      const outcome = await backend.start(port)
      switch (outcome.kind) {
        case 'ready':
          return { kind: 'ready' }
        case 'timeout':
          log(`backend did not write ${config.backend.ready_line} within ${config.backend.ready_timeout_ms} ms; terminating it`)
          await backend.terminate()
          return { kind: 'failed', reason: `no ${config.backend.ready_line} within ${config.backend.ready_timeout_ms} ms` }
        case 'exited':
          return { kind: 'failed', reason: `it exited before ${config.backend.ready_line} (exit code ${outcome.code}${outcome.signal ? `, signal ${outcome.signal}` : ''})` }
        case 'spawn_error':
          return { kind: 'failed', reason: `it could not be launched: ${outcome.message}` }
      }
    },
  }

  // h. Stop: the app exits only after the backend has exited.
  async function shutdown(exitCode: number): Promise<void> {
    if (shutdownStarted) return
    shutdownStarted = true
    // The ticker goes first: it calls the backend, so it must be gone before
    // the backend is stopped (reminder_ticker is cross-cutting, WCA §5).
    await reminderTicker?.stop()
    await backend.stop()
    log(`exiting with code ${exitCode}`)
    app.exit(exitCode)
  }

  function fatal(message: string, phase: FailurePhase = 'startup'): void {
    // Logged first, so the message can be checked without a click.
    log(`FATAL: ${message}`)
    const box = buildErrorDialog(config, phase, message)
    if (settings.showDialogs) dialog.showErrorBox(box.title, box.content)
    // No dialog (test flag): the text it would have shown goes to the log, so
    // tests can check it without a click (DSK-13).
    else log(`error dialog text: ${JSON.stringify(box)}`)
    void shutdown(config.main.failure_exit_code)
  }

  app.on('second-instance', (_event, argv, workingDirectory) => {
    log(
      `second-instance: another launch asked for this instance ` +
        `(argv ${JSON.stringify(argvForLog(config, argv, resourcesPath !== null))}, working directory ${workingDirectory})`,
    )
    bringWindowToFront()
  })
  app.on('window-all-closed', () => {
    log('window-all-closed')
    void shutdown(0)
  })
  app.on('before-quit', (event) => {
    log(`before-quit (shutdown started: ${shutdownStarted}, backend running: ${backend.running})`)
    if (shutdownStarted && !backend.running) return
    event.preventDefault()
    void shutdown(0)
  })
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      log(`received ${signal}`)
      void shutdown(0)
    })
  }

  // c-d. Ports, then the backend; retry on a new port while it exits before
  //      READY.
  async function startBackend(): Promise<string | null> {
    const attempts = config.backend.start_attempts
    // The AI Service is not started in V1, but the backend requires its
    // address: a port is reserved and handed over anyway.
    const aiPort = await pickFreePort(host)
    aiServiceBaseUrl = `http://${host}:${aiPort}`
    let lastFailure = ''
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const port =
        attempt === 1 && settings.firstBackendPort !== null ? settings.firstBackendPort : await pickFreePort(host, [aiPort])
      log(`backend start attempt ${attempt}/${attempts} on port ${port}`)
      const outcome = await backend.start(port)
      if (outcome.kind === 'ready') return null
      if (outcome.kind === 'timeout') {
        log(`backend did not write ${config.backend.ready_line} within ${config.backend.ready_timeout_ms} ms; terminating it`)
        await backend.terminate()
        return `The backend did not become ready within ${config.backend.ready_timeout_ms / 1000} seconds.`
      }
      lastFailure =
        outcome.kind === 'exited'
          ? `exit code ${outcome.code}${outcome.signal ? `, signal ${outcome.signal}` : ''}`
          : `could not be launched: ${outcome.message}`
      log(`backend start attempt ${attempt}/${attempts} failed (${lastFailure})`)
    }
    return `The backend could not start after ${attempts} attempts (last: ${lastFailure}).`
  }

  async function startLayer(): Promise<void> {
    const backendFailure = await startBackend()
    if (backendFailure !== null) return fatal(backendFailure)

    // e. Renderer files.
    const missing = missingRendererFiles(settings.rendererRoot, config.renderer.entry_file)
    if (missing !== null) return fatal(missing)
    registerRendererProtocol(config, origin.scheme, origin.host, settings.rendererRoot)
    log(`serving the interface from ${settings.rendererRoot} at ${uiOrigin}`)

    // Packaged app: no default menu, so no reload shortcut and no developer
    // tools. Run from source keeps it.
    if (app.isPackaged) Menu.setApplicationMenu(null)

    // Cross-cutting entry native_dialogs (ipc): its handler is registered
    // before the window opens (.design/03_classification.md), so the first
    // invoke from the renderer already has an answerer.
    registerNativeDialogs({
      uiOrigin,
      pickFolder: config.native_dialogs.pick_folder,
      openFile: config.native_dialogs.open_file,
      getMainWindow: () => mainWindow,
      log: (message) => log(message),
    })

    // Workflow restore_data: the Main reads its Configs, builds Adapters
    // (handing over the backend_controller), Services and Routers, and registers
    // the three ipc handlers (phase 1: prepare, status, cancel), also before the
    // window opens. Wiring only: every decision is the workflow's.
    const backendBaseUrl = `http://${host}:${backend.port}`
    const restoreConfig = loadRestoreDataConfig()
    const restoreData = registerRestoreDataRouters({
      ipc: ipcMain,
      service: new RestoreDataService(
        new RestoreDataAdapters({ config: restoreConfig, dbFilePath, backendBaseUrl, backendController }),
        restoreConfig,
        (message) => log(message),
      ),
      config: restoreConfig,
      uiOrigin,
      getMainWindow: () => mainWindow,
      log: (message) => log(message),
    })

    // Cross-cutting restore_trigger (phase 2: apply a pending restore): once,
    // now that the backend is READY and restore_data is wired, and before the
    // window opens (nothing else calls the backend yet, so the backend can be
    // stopped and started again). The Main waits for it, message box included.
    try {
      await runRestoreTrigger({
        applyPendingRestore: () => restoreData.applyPendingRestore(),
        text: config.restore_trigger,
        showDialog: settings.showDialogs,
        showMessageBox: async (box) => {
          // No parent window: it is not open yet.
          await dialog.showMessageBox({ type: 'info', title: box.title, message: box.content, buttons: [box.closeButton], defaultId: 0, noLink: true })
        },
        log: (message) => log(message),
      })
    } catch (err) {
      // 500 ERR_RESTORE_FAILED: the restored database and the previous one both
      // failed to start. The previous database is back at db_file_path.
      if (err instanceof InProcessCallError) return fatal(`Applying the pending restore failed: ${err.message}`, 'restore_failed')
      throw err
    }
    if (shutdownStarted) return

    // The ipc addresses implemented here; the preload relays only these.
    const ipcAddresses = [
      config.native_dialogs.pick_folder.address,
      config.native_dialogs.open_file.address,
      restoreConfig.addresses.request_restore,
      restoreConfig.addresses.get_restore_status,
      restoreConfig.addresses.cancel_restore,
    ]

    // f-g. Window; the preload script receives the launch value and the
    //      implemented ipc addresses.
    const args = config.preload.arguments
    const win = new BrowserWindow({
      width: config.renderer.window.width,
      height: config.renderer.window.height,
      // Without the test flag the window shows itself (and takes the focus) as
      // before. With it, it stays hidden until it can be painted, then
      // showInactive() (DSK-18).
      show: !settings.showInactive,
      webPreferences: {
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
        preload: path.join(__dirname, 'preload.js'),
        additionalArguments: [
          `${args.bridge_name}${config.boundary.renderer_bridge}`,
          `${args.backend_base_url}${backendBaseUrl}`,
          `${args.ipc_addresses}${ipcAddresses.join(',')}`,
        ],
      },
    })
    mainWindow = win
    if (settings.showInactive) {
      win.once('ready-to-show', () => {
        log('ready-to-show: showing the window without focus (test flag)')
        win.showInactive()
      })
    }
    win.on('closed', () => {
      if (mainWindow === win) mainWindow = null
    })
    win.webContents.on('will-navigate', (event) => {
      if (originOf(event.url) !== uiOrigin) {
        log(`blocked navigation to ${event.url}`)
        event.preventDefault()
      }
    })
    win.webContents.setWindowOpenHandler(({ url }) => {
      log(`blocked new window for ${url}`)
      return { action: 'deny' }
    })
    const entryUrl = `${uiOrigin}/${config.renderer.entry_file}`
    log(`opening the window at ${entryUrl}`)
    try {
      await win.loadURL(entryUrl)
      log(`first load finished: ${entryUrl}`)
    } catch (err) {
      // A first load aborted by another navigation (a reload started before
      // it finished) is not a failure: the newer navigation carries on. Any
      // other load error stays fatal.
      const { code, errno } = err as { code?: unknown; errno?: unknown }
      if (typeof code !== 'string' || !config.renderer.non_fatal_first_load_errors.includes(code)) throw err
      log(`first load of ${entryUrl} was aborted (${code}, ${String(errno)}); continuing`)
    }

    // i. Cross-cutting infrastructure, after the backend is READY and the
    //    window has had its first load (also when that load was aborted).
    if (shutdownStarted) return
    reminderTicker = new ReminderTicker({
      backendBaseUrl,
      config: { ...config.reminder_ticker, interval_ms: settings.reminderIntervalMs ?? config.reminder_ticker.interval_ms },
      showToast: showWindowsToast,
      log: (message) => log(message),
    })
    reminderTicker.start()
  }

  app
    .whenReady()
    .then(startLayer)
    .catch((err: unknown) => fatal(`The app could not start: ${err instanceof Error ? err.message : String(err)}`))
}

main()
