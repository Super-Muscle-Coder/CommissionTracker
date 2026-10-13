# ===WCA-PLAN===
# session_for: desktop
# drafted_by: Orchestrator + Project Owner
# drafted_at: 2026-10-13T10:25:41+07:00
# contract: data_schema 10.0.1, api_contract 6.1.0 (approved)

## MỤC TIÊU PHIÊN NÀY

Đây là phiên 43 của dự án và là phiên desktop thứ mười hai. Phiên thuộc **chặng H: rà soát lại toàn bộ V1**, và là **phiên kiểm độc lập** cho layer `Desktop/`.

Bạn chưa từng thấy mã này được viết ra sao. Đó là lý do bạn được giao việc. Hãy đọc mã như một người kiểm, không phải người viết: không mặc định mã đúng, cũng không mặc định mã sai. Mọi kết luận phải dựa trên tệp, dòng và lệnh chạy được.

Phiên có **hai pha**:
- **Pha 1 (plan này): chỉ đọc.** Bạn đọc mã, chạy kiểm thử, làm phép cắn trên **bản sao nằm ngoài kho**, và không sửa tệp nào trong kho. Cuối pha 1, bạn gửi báo cáo đầy đủ mọi phát hiện rồi **dừng và chờ**.
- **Pha 2: vá.** Pha này chỉ bắt đầu khi Project Owner mang tới quyết định của Orchestrator, kèm plan pha 2 (plan đó sẽ ghi đè tệp này). Pha 2 gồm những phát hiện được chọn sửa, cộng vài việc đã biết của layer.

**Điểm dừng pha 1:** báo cáo có đủ các phần ở mục "BÁO CÁO PHA 1", và `git status --short` không đổi so với đầu phiên.

## CÂU HỎI CẦN TRẢ LỜI

Một câu hỏi lớn: **`Desktop/` có theo đúng WCA (`wca-implementation` v2.3), đúng hợp đồng và đúng quy ước của dự án không?** Câu hỏi này chia thành tám phần.

Phạm vi gồm:
- Main: `src/main.ts`, `src/preload.ts`, `src/error_dialog.ts`;
- workflow `restore_data`;
- ba thành phần hạ tầng cắt ngang: `reminder_ticker`, `native_dialogs`, `restore_trigger`;
- `configs/`;
- kiểm thử trong `tests/`;
- `packaging/`, `electron-builder.yml`, `Desktop.esproj`.

### K1 — Bố cục (`04-implement.md`, Bước 4.0; `CLAUDE.md` mục 4, "Bố cục `Desktop/`")
- Bố cục thật khớp sơ đồ ở `CLAUDE.md` mục 4.
- `restore_data` có đủ năm lớp. Configs của nó là `configs/restore_data.json`; chỉ Main đọc tệp này rồi trao giá trị cho workflow.
- Hạ tầng cắt ngang không có năm lớp. Cách tổ chức bên trong của nó tự do, miễn không chứa quyết định nghiệp vụ (lý thuyết §5).
- Nếu có `shared/`, nó phải thỏa `05-edge-cases.md` Bước 5.3.
- `tests/fixtures/` không bao giờ được Main dùng khi chạy bình thường.
- `Desktop.esproj` chỉ khác mẫu ở các thuộc tính lệnh mà `CLAUDE.md` mục 5 cho phép.

### K2 — Ranh giới giữa các lớp của `restore_data` (lý thuyết §4, câu hỏi tự kiểm của từng thành phần)
Đọc từng lớp và trả lời đúng câu hỏi tự kiểm in nghiêng của lớp đó trong `wca_theory_compressed.md` §4:
- Entities chỉ mô tả hình dạng.
- Adapters chỉ làm một hành động kỹ thuật (đọc hay ghi tệp, gọi `http`, dùng công cụ quản lý vòng đời), không tự quyết trình tự. Dùng phép thử "công cụ hay quyết định".
- Services là nơi duy nhất ra quyết định. Services không tự tạo Adapters, và không gọi thẳng `fs`, `fetch` hay `child_process`.
- Routers chỉ kiểm định dạng (đúng những gì `type` mô tả) và chuyển giao.

Thêm một câu hỏi cho **toàn bộ** `src/`: có con số, chuỗi, đường dẫn, tên kênh hay thời gian chờ nào mang ý nghĩa mà bị gõ thẳng vào code thay vì nằm trong `configs/`? Mỗi giá trị như vậy là ranh giới hay nội bộ (lý thuyết §4, Configs)?

### K3 — Main (`src/main.ts`, `src/preload.ts`, `src/error_dialog.ts`)

**Vai trò của Main:**
- Main chỉ đọc cấu hình, ráp nối và quản lý vòng đời. Main không có logic nghiệp vụ.
- Main không bao giờ gọi một workflow lúc hệ thống đang chạy. Bên gọi là hạ tầng cắt ngang.
- Main không đọc tệp hợp đồng lúc chạy.

**Thứ tự khởi động:**
- Khớp `.design/03_classification.md`, phần desktop.
- Khớp `trigger` của từng thành phần cắt ngang trong `api_contract.yaml`:
  - `restore_trigger` chạy sau khi backend sẵn sàng và `restore_data` đã ráp, trước khi mở cửa sổ, và Main chờ nó;
  - `reminder_ticker` chạy sau khi backend sẵn sàng;
  - `native_dialogs` có trước khi mở cửa sổ.

**Các luật bắt buộc về layer Python** (`data_schema.yaml`, `clause_a_common.mandatory_rules`):
- chạy layer Python thành tiến trình con, trao giá trị khởi động bằng biến môi trường;
- chọn cổng lúc chạy, chỉ trên `loopback_host`;
- coi dòng `READY` là tín hiệu sẵn sàng;
- dừng bằng cách đóng stdin, có hạn chờ;
- mỗi lúc chỉ một backend dùng tệp dữ liệu.

**Renderer** (`mandatory_rules`; `CLAUDE.md` mục 5, "Renderer, origin và CORS" và "Công nghệ theo layer", Desktop):
- chỉ nạp từ `ui_origin`, không bao giờ từ `file://` hay `http(s)`;
- trao đúng một giá trị khởi động, `backendBaseUrl`, qua đối tượng đóng băng `window.<renderer_bridge>`, cộng hàm `invoke`;
- renderer không chạm được `ipcRenderer`;
- `contextIsolation` và `sandbox` bật, `nodeIntegration` tắt;
- `app://` đăng ký với `standard`, `secure`, `supportFetchAPI`, `corsEnabled` trước `ready`, phục vụ bằng `protocol.handle`;
- ngoài các luật trên, ghi lại cách Main chặn renderer điều hướng hay mở cửa sổ mới, nếu có.

**Công cụ quản lý vòng đời:** công cụ trao cho `restore_data` (`backend_controller`) là thứ duy nhất Main tự tạo để trao cho workflow như một tài nguyên (lý thuyết §4, Main).

**Bản đóng gói:**
- Main chọn bộ đường dẫn theo `app.isPackaged`;
- chỉ nhận hai cờ kiểm thử `--ct-test-data-dir` và `--ct-test-no-dialog`, bỏ qua mọi cờ `--ct-test-*` khác (`CLAUDE.md` mục 5, "Đóng gói").

**Luật chạy không cần dịch vụ AI** (`mandatory_rules`, câu cuối): ghi lại cách Main xử lý giá trị khởi động liên quan tới `clause_c_ai_service`. V1 cố ý không có layer này, nên việc không khởi động nó không phải phát hiện. Chỉ ghi phát hiện khi có điều trái hợp đồng.

### K4 — Cô lập, quyền sở hữu dữ liệu, và hạ tầng cắt ngang (lý thuyết §4 workflow nghiệp vụ, §5; `06-self-check.md` Bước 6.1)
- `restore_data` và ba thành phần cắt ngang không nhập (`import`) mã nội bộ của nhau. Hạ tầng cắt ngang chạm workflow **chỉ qua Routers**:
  - `restore_trigger` qua Routers `in_process` của `restore_data`;
  - `reminder_ticker` qua lối vào `http` của backend.
- Desktop không đọc, không ghi bảng SQLite nào của backend. Đối chiếu việc `restore_data` thao tác trên tệp cơ sở dữ liệu với `description` của nó trong `data_schema.yaml` và với `.design/f_restore.md`: chỉ thao tác nguyên tệp, cùng tệp riêng của nó.
- Dữ liệu nhận từ backend được mô tả bằng Entities của chính Desktop.
- `input_expected` của `restore_data`: dữ liệu thật sự đọc vào đến từ đúng nguồn `from` đã khai (`end_user`, `backup_data`, `main`, `environment_config`).
- Hạ tầng cắt ngang **không ra quyết định nghiệp vụ** (không lọc, không chọn, không tính theo ý nghĩa dữ liệu) và không giữ dữ liệu nghiệp vụ. Đối chiếu từng thành phần với `description` của nó trong `api_contract.yaml`, `clause_a_common.cross_cutting`.

### K5 — Đối chiếu hợp đồng, cả hai chiều (`06-self-check.md` Bước 6.1; `02-contract.md` Bước 2.3, 2.4)

**Chiều được gọi:** gồm ba lối vào `ipc` của `restore_data`, lối vào `in_process` `apply_pending_restore`, và hai lối vào `ipc` của `native_dialogs`.
- Mỗi lối vào có **đúng một** chỗ xử lý, khớp `form`, `address`, `input` và **từng** nhãn trong `output`.
- Ngược lại, không có kênh `ipc` nào mà hợp đồng không khai. Liệt kê mọi `ipcMain.handle`, `ipcMain.on` và mọi địa chỉ preload cho phép.
- Phản hồi `ipc` đúng dạng `object { status, body }` của `endpoint_forms.ipc`.

**Đầu vào từ renderer** (`external`), theo quy tắc trường thừa và sai dạng (`02-contract.md` Bước 2.3):
- Ghi lại cách mỗi lối vào xử lý đầu vào thiếu, sai dạng, có trường thừa, hay không phải object.
- Lối vào chỉ khai nhãn 200 mà gặp đầu vào sai thì làm gì?
- Nếu luật của skill đòi từ chối mà hợp đồng không khai nhãn nào để từ chối, **đừng đề xuất trả một nhãn không khai báo**. Ghi phát hiện là "cần quyết định ở hợp đồng".

**Chiều gọi đi:** tìm **mọi** lời gọi `http` từ Desktop sang backend, với mỗi lời gọi:
- phương thức, đường dẫn, tên khóa trong thân khớp `api_contract.yaml`;
- lối vào đó có khai `called_by` gồm bên gọi này không;
- **mỗi** nhãn mà lối vào đó khai được xử lý tường minh, hoặc ánh xạ rõ sang một nhãn của chính Desktop; ghi rõ nhãn nào rơi vào nhánh "còn lại";
- thân phản hồi được kiểm hình dạng trước khi dùng.

**Phía dữ liệu:**
- `output_guaranteed` của `restore_data` khớp Entities. Dữ liệu đi ra ranh giới mang đúng các trường của `type`, không lọt trường nội bộ.
- `consumed_by`, `called_by` nhất quán với mã thật.
- Mọi giá trị ranh giới trong `configs/desktop.json` (`boundary`) và `configs/restore_data.json` (`addresses`, `labels`, `error_codes`, `backend_requests`) truy được về đúng dòng trong hợp đồng.
- Mọi mã lỗi dùng trong `Desktop/` có trong `clause_a_common.error_codes`.
- `restore_data` ở `đã_hoàn_thiện`, nên phải có bằng chứng tương ứng (K7).

### K6 — Ma trận, tự dựng
Tự dựng, không dựa vào tài liệu nào khác. Ghi rõ ô nào không có ca.

- **(a) Chiều được gọi:** với mỗi lối vào ở K5 và **mỗi** nhãn của nó, chỉ ra ít nhất một ca khẳng định đích danh nhãn đó qua đúng lối vào thật. Với `ipc`, ca phải đi qua `invoke` của renderer, không gọi thẳng hàm bên trong.
- **(b) Chiều gọi đi:** với mỗi lối vào backend mà Desktop gọi và **mỗi** nhãn lối vào đó khai, chỉ ra ca cho backend trả đúng nhãn đó (backend thật hay backend giả trong `tests/fixtures/` đều được), và khẳng định Desktop phản ứng ra sao.
- **(c) Tình huống bất thường cấp layer**, suy ra từ `mandatory_rules` và từ `.design/f_restore.md` §3. Ví dụ:
  - backend không bao giờ in `READY`;
  - backend chết ngay sau `READY` hoặc khi đang chạy;
  - backend thoát mã khác 0;
  - backend không thoát khi stdin đóng;
  - thư mục dữ liệu không dùng được;
  - mở bản ứng dụng thứ hai;
  - máy tắt giữa từng bước của lần khôi phục.

  Với mỗi tình huống: có ca hay không, ca nào. Phiên này không viết ca mới.

### K7 — Checkpoint và bằng chứng (`07-checkpoint-protocol.md`; `06-self-check.md` Bước 6.5, 6.6)
- Mọi khối checkpoint trong `Desktop/src/` (năm khối) đúng khuôn Giao thức 07: vị trí, khung, bốn mục, quy tắc ID, YAML hợp lệ.
- Không còn `UNSOLVED_PROBLEMS`. Không có NOTES quá 14 ngày tính tới hôm nay (`CLAUDE.md` mục 5).
- **Mỗi mục EVIDENCE**, xếp vào một trong ba loại:
  1. **chạy lại được ở pha 1**, vì nằm trong `npm test`, `npm run lint` hay `npm run test:packaged`: ghi ca hay lệnh tương ứng và kết quả ở lượt chạy của bạn;
  2. **không chạy lại ở pha 1**, vì cần dựng lại bộ cài, cần cài đặt, cần Project Owner chạy tay, cần công cụ đo trong `tests/tools/` hay `tests/packaged/measure_startup.cjs`, hoặc phụ thuộc trạng thái antivirus: ghi lý do;
  3. **nêu một thứ không còn tồn tại** (ca đã đổi tên, lệnh không chạy được, con số đã khác): ghi rõ.
- Nội dung checkpoint, comment trong mã và tệp cấu hình phải khớp mã và hợp đồng hiện tại. Một EXPERIENCES hay một comment mô tả hành vi, lối vào hay tệp không còn tồn tại là một phát hiện.

### K8 — An toàn và độ tin cậy của kiểm thử (`CLAUDE.md` mục 5; tiêu chí ổn định của chặng H)
- **Mọi** lần khởi chạy Electron trong `tests/`, `tests/packaged/` và `tests/tools/` đều truyền `--ct-test-data-dir`. Chỉ ra chỗ khởi chạy và cách truyền.
- Không kiểm thử nào đọc hay ghi `%APPDATA%\CommissionTracker` thật, registry, hay thư mục ngoài thư mục tạm của chính nó.
- Thư mục tạm của kiểm thử được dọn đúng chỗ, không dọn theo mẫu tên.
- Ca không có khẳng định thật, hoặc luôn đạt bất kể mã sản phẩm.
- Ca phụ thuộc thứ tự, thời gian ngủ cố định hay tiêu điểm cửa sổ, có thể hỏng khi máy bận. Ghi tệp và dòng. Hỏng ở lượt chạy của bạn thì ghi cả lỗi.

## VIỆC CẦN LÀM, THEO THỨ TỰ (PHA 1)

0. **Đọc tài liệu** theo `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md`, toàn bộ;
   - bộ skill `wca-implementation`: `wca_theory_compressed.md`, `SKILL.md`, `02-contract.md` (Bước 2.3, 2.4), `04-implement.md`, `05-edge-cases.md`, `06-self-check.md`, `07-checkpoint-protocol.md`, `08-operating-protocol.md`;
   - hợp đồng:
     - `.contracts/data_schema.yaml`: `clause_a_common` và `clause_d_desktop`, cộng các mục của `clause_b_backend` mà Desktop gọi tới hay nhận dữ liệu từ;
     - `.contracts/api_contract.yaml`: `clause_a_common` (gồm `endpoint_forms` và `cross_cutting`), `clause_d_desktop`, cộng các lối vào backend mà Desktop gọi;
     - changelog đầu mỗi tệp;
   - `.design/03_classification.md`, `.design/f_restore.md`;
   - toàn bộ `Desktop/` (trừ `node_modules/`, `dist/`, `release/`, `packaging/cache/`, `packaging/stage/`, `test-results/`, `startup-logs/`), cả mã lẫn kiểm thử, fixture và công cụ;
   - plan này, sau cùng.

   **Để giữ tính độc lập, ở pha 1 không đọc `.plan/open_issues.md` và `.plan/v1_roadmap.md`.** Hai tệp đó ghi các phát hiện cũ, còn báo cáo pha 1 phải là cái nhìn của riêng bạn. Không đọc mã `Backend/` hay `UI/` để tìm phát hiện của layer đó. Chỉ đọc đúng chỗ cần để hiểu một lời gọi của Desktop, và ghi lại chỗ đã đọc.

   Xác nhận Data Schema **`10.0.1`** và API Contract **`6.1.0`**, cả hai `approved`. Sai thì dừng lại và báo.

1. **Môi trường và mốc.**
   - Ghi phiên bản Node, npm, Electron (theo `node_modules`), Python (`Backend\env\Scripts\python.exe --version`).
   - Hỏi Project Owner hai điều: hôm nay đã có phiên coding agent nào chạy chưa (để ghi định danh phiên); trạng thái antivirus.
   - Ghi `git status --short` (chỉ đọc). Kết quả này phải giống hệt lúc cuối pha 1.
   - Chụp mốc, chỉ liệt kê tên và giờ sửa, không mở tệp: `%APPDATA%\CommissionTracker` và `%APPDATA%\Commission Tracker`.
   - Kiểm hai điều kiện. **Không chạy `npm ci`.**
     - `Desktop\node_modules\electron\dist\electron.exe` có. Nếu thiếu, làm theo `CLAUDE.md` mục 5 (ENV-10) rồi ghi lại.
     - `UI\dist\index.html` có. Nếu thiếu, dừng lại và báo, không tự build `UI/`.
   - Trong `Desktop/`:
     - `npm run lint`: phải sạch;
     - `npm test`, **một lượt**: mốc **79**. Khác thì ghi rõ số đạt, số hỏng, tên ca và lỗi, không dừng;
     - `npm run test:packaged`, **một lượt**, trên `release\win-unpacked` hiện có: mốc **12**. **Không chạy `npm run dist`.** Bản đóng gói này dựng ngày 2026-10-11, trước khi backend đổi ở phiên 42. Hỏng ca nào thì ghi rõ, và ghi bạn có cho là do bản dựng cũ không, kèm lý do.
   - Không chạy hai lệnh kiểm thử cùng lúc.

2. **Đọc và trả lời K1 → K8**, theo thứ tự đó. Ghi phát hiện ngay khi thấy, kèm tệp và dòng.

3. **Phép cắn**, chỉ trên bản sao ngoài kho. Mục đích là kiểm xem kiểm thử có thật sự bắt được những vi phạm quan trọng nhất không.

   **Dựng bản sao** ở `%TEMP%\ct_review_desktop\`. Giữ đúng cấu trúc anh em, vì `tests/helpers.ts` và `configs/desktop.json` tìm `Backend` và `UI\dist` theo đường dẫn tương đối:
   - `Desktop\`, gồm cả `node_modules\`, bỏ `dist\`, `release\`, `packaging\cache\`, `packaging\stage\`, `test-results\`, `startup-logs\`;
   - `Backend\`, gồm cả `env\`, bỏ `__pycache__\` và `.pytest_cache\`;
   - `UI\dist\`.

   Dùng `robocopy` có `/XD` cho các thư mục bỏ. Không dùng liên kết tượng trưng hay junction trỏ về kho.

   **Kiểm bản sao.** Chạy `%TEMP%\ct_review_desktop\Backend\env\Scripts\python.exe -c "import sys, fastapi; print(sys.prefix)"`.
   - Nếu không chạy được, sửa **trong bản sao** hai chỗ cho trỏ thẳng tới interpreter thật `E:\CommissionTracker\Backend\env\Scripts\python.exe`: `BACKEND_PYTHON` trong `tests\helpers.ts` và `backend.from_source.interpreter` trong `configs\desktop.json`. Ghi lại việc này.
   - Trước khi cắn, chạy trong bản sao đúng những tệp spec bạn sẽ dùng, để có mốc của bản sao.

   **Làm ít nhất năm phép cắn** do bạn tự chọn, mỗi phép một vi phạm khác loại, trong đó ít nhất một phép ở Main, một ở `restore_data`, một ở một thành phần cắt ngang. Ví dụ:
   - một Routers của `restore_data` trả nhãn khác với hợp đồng cho một trường hợp đã khai;
   - preload cho đi qua một địa chỉ `ipc` không khai báo;
   - Main mở cửa sổ trước khi `restore_trigger` xong;
   - Main dừng backend bằng cách giết tiến trình thay vì đóng stdin;
   - `reminder_ticker` tự bỏ một thông báo (ra quyết định nghiệp vụ);
   - một giá trị ranh giới trong `configs/desktop.json` bị đổi;
   - `restore_data` bỏ bước sao lưu an toàn trước khi chuẩn bị.

   Với mỗi phép, ghi: sửa gì, ở đâu; ca nào bắt được, hay không ca nào bắt được. **Một phép cắn không bị bắt là một phát hiện.**

   **Dọn bản sao khi xong:** xóa đúng `%TEMP%\ct_review_desktop\`, gọi đích danh. Không xóa theo mẫu tên. Không đụng thư mục tạm nào khác, kể cả thư mục `ct-desktop-test-*` mà kiểm thử để lại.

4. **Kết thúc pha 1.**
   - `git status --short` phải giống hệt bước 1.
   - Mốc `%APPDATA%` phải giống bước 1.
   - Gửi báo cáo rồi **dừng**. Không tự bắt đầu sửa gì, kể cả việc nhỏ.

## BÁO CÁO PHA 1

Viết bằng tiếng Việt, ngắn gọn, theo `CLAUDE.md` mục 5. Báo cáo gồm sáu phần:

1. **Môi trường:**
   - phiên bản Node, npm, Electron, Python, trạng thái antivirus;
   - kết quả `lint`, `npm test`, `test:packaged`;
   - `git status --short` và mốc `%APPDATA%`, đầu và cuối.
2. **Bảng phát hiện.** Mỗi dòng một phát hiện:

   | Mã | Mức | Phần (K1–K8) | Vị trí (tệp:dòng) | Điều bị vi phạm (trích dẫn skill, hợp đồng hoặc `CLAUDE.md`) | Bằng chứng (lệnh, trích mã) | Đề xuất sửa | Ước lượng (nhỏ / vừa / lớn) |
   |---|---|---|---|---|---|---|---|

   Mã đặt `R43-1`, `R43-2`… Ba mức:
   - **cao:** sai hợp đồng, sai hay mất dữ liệu người dùng, ranh giới cô lập bị phá, hoặc kiểm thử có thể đụng dữ liệu thật;
   - **trung bình:** sai skill nhưng hành vi bên ngoài vẫn đúng; hoặc thiếu ca cho một ô quan trọng;
   - **thấp:** checkpoint, comment, tài liệu, đặt tên.

   Phát hiện cần sửa hợp đồng thì ghi rõ "cần quyết định ở hợp đồng" ở cột đề xuất.

   Phần nào không có phát hiện thì ghi "không có", kèm một câu nói đã kiểm những gì.
3. **Ma trận K6:**
   - (a), (b): số ô, số ô có ca, danh sách ô thiếu;
   - (c): bảng từng tình huống, có ca hay không.
4. **EVIDENCE (K7):** bảng từng mục, ghi khối nào, loại 1, 2 hay 3, và kết quả hoặc lý do.
5. **Phép cắn:** bảng từng phép và kết quả. Ghi cả việc dựng bản sao và việc dọn.
6. **Những gì bạn không kiểm được**, và vì sao.

Không có phát hiện nào là kết quả hợp lệ, nếu bạn đã kiểm đủ. Đừng tạo phát hiện cho đủ số, và cũng đừng bỏ qua một điều vì nó "nhỏ".

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG

- Hợp đồng chỉ quản lý ranh giới (nguyên tắc hộp đen). Cách làm bên trong một workflow không phải phát hiện, trừ khi nó phá một luật của skill, của hợp đồng hay của `CLAUDE.md`.
- Desktop là bên được gọi qua `ipc` (renderer là `external`) và qua `in_process` (`restore_trigger`). Desktop là bên gọi qua `http` tới backend.
- `clause_d_desktop` không có workflow nền tảng (`.design/03_classification.md`).
- `clause_c_ai_service` và hai workflow watermark của backend ở `đang_chờ_triển_khai`, cố ý chưa có mã (V4 trở đi). Việc Desktop không khởi động dịch vụ AI không phải phát hiện.
- API Contract 6.0.0 đã bỏ `native_dialogs.save_file`. 6.1.0 thêm luật tham số truy vấn thừa cho `http` (không liên quan tới `ipc`).

## CẢNH BÁO — điều KHÔNG được làm trong pha 1

- **Không sửa, không tạo, không xóa tệp nào trong kho**, kể cả checkpoint, kể cả lỗi chính tả. Các thư mục build mà git bỏ qua (`Desktop\dist\`, `test-results\`) được sinh lại khi chạy kiểm thử; đó không phải sửa kho.
- Phép cắn chỉ làm trên bản sao ở `%TEMP%\ct_review_desktop\`, không bao giờ trên `E:\CommissionTracker\`. Không tạo junction hay liên kết tượng trưng.
- Không chạy `npm ci`, `npm install`, `npm run dist`, `npm audit fix`. Không cài gói, linter hay công cụ nào. Muốn dùng một công cụ chưa có thì ghi vào phần 6 của báo cáo.
- Không build `UI/`, không chạy kiểm thử của `Backend/` hay `UI/`.
- Không chạy `npm start`, `npm run probe`, công cụ trong `tests/tools/` hay `tests/packaged/measure_startup.cjs`. Ứng dụng chỉ được chạy qua `npm test` và `npm run test:packaged`, ở kho hay ở bản sao.
- Không đọc `.plan/open_issues.md`, `.plan/v1_roadmap.md` ở pha 1. Không đọc, không ghi `.reviews/`.
- Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`.
- Không chạy `git commit`, `push`, `reset`, `checkout`, `restore`, `stash`, `clean`, `tag` hay lệnh nào đổi trạng thái kho. Chỉ được đọc.
- ⚠ Không kiểm thử hay lần chạy nào được đụng `%APPDATA%\CommissionTracker` thật.
- Không cài bộ cài, không gỡ bản đã cài, không sửa registry.
- Không tắt, gỡ hay đổi cấu hình phần mềm diệt virus.
- Không dùng sub-agent. Không chạy song song hai lệnh kiểm thử hay hai bản ứng dụng.
- Không tăng thời gian chờ, không thêm `retries` hay `skip`, kể cả trong bản sao, trừ khi đó chính là phép cắn và bạn ghi rõ.
- Chỉ xóa đúng thư mục bạn tạo, gọi đích danh.
- Phép cắn nào bị bộ phân loại quyền chặn thì ghi lại rồi đi tiếp, không tìm đường vòng.

## TIÊU CHÍ HOÀN TẤT PHA 1

1. Đã trả lời đủ K1 → K8.
2. Đã chạy `lint`, `npm test` và `test:packaged`, mỗi lệnh một lượt, và đã ghi kết quả, kể cả ca hỏng.
3. Đã làm ít nhất năm phép cắn trên bản sao ngoài kho (ít nhất một ở Main, một ở `restore_data`, một ở hạ tầng cắt ngang), và đã xóa đúng thư mục bản sao.
4. `git status --short` và mốc `%APPDATA%` cuối pha 1 giống hệt đầu phiên.
5. Báo cáo có đủ sáu phần ở mục "BÁO CÁO PHA 1".
