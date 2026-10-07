# CLAUDE.md — Commission Tracker

Tài liệu nền của dự án. Mọi agent làm việc trên thư mục này đọc tệp này đầu tiên, ở mỗi phiên. Tệp này chỉ chứa những gì **riêng của dự án**; mọi nguyên lý và quy trình WCA nằm trong bộ tài liệu WCA và được dẫn tới bên dưới, không chép lại ở đây.

## 1. Lý thuyết nền WCA

Dự án này được xây dựng theo kiến trúc Workflow-Centric Architecture (WCA). Lý thuyết nền — bao gồm bảng thuật ngữ bắt buộc dùng đúng nghĩa — được nạp nguyên văn dưới đây:

@.claude/skills/wca-implementation/wca_theory_compressed.md

Quy trình triển khai nằm trong skill `wca-implementation` (`.claude/skills/wca-implementation/`):

- `SKILL.md` — điều phối các giai đoạn.
- `00-prep.md` → `06-self-check.md` — các giai đoạn triển khai tuần tự.
- `07-checkpoint-protocol.md` — định dạng checkpoint.
- `08-operating-protocol.md` — giao thức vận hành mà dự án này dùng.

Phiên bản skill đang dùng: `wca-implementation` **v2.3**.

**Layer giao diện (`UI/`) được tổ chức bên trong theo iWCA** — skill `iwca-implementation` (`.claude/skills/iwca-implementation/`), dựng trên WCA. Với hợp đồng tối cao, giao diện vẫn là bên gọi `external` và không có Điều khoản; iWCA chỉ quản lý bên trong layer đó. Làm việc trên `UI/` thì đọc thêm `SKILL.md` và `iwca_theory.md` của skill này (đặc biệt §7 ma trận phụ thuộc và §11 những chỗ iWCA khác WCA), rồi đúng tệp giai đoạn `i1`–`i6` mà plan chỉ định. Phiên bản: `iwca-implementation` **v1.0**.

## 2. Mô hình vận hành

Dự án dùng đúng mô hình của `08-operating-protocol.md`: một **Orchestrator** (không viết code, làm việc ở một nơi khác, không trong thư mục này) điều phối nhiều phiên **coding agent** kế tiếp nhau. **Người vận hành** (Project Owner) là cầu nối giữa hai bên và là người quyết định cuối cùng.

Nếu bạn là coding agent:

- Đọc tài liệu theo đúng trình tự ở `08-operating-protocol.md`, Phần 1.
- Chỉ tạo và sửa tệp bên trong thư mục của layer mà plan phiên này giao (`Backend/`, `Desktop/` hoặc `UI/`). Không đụng tới thư mục của layer khác, kể cả khi nó trông như còn dang dở. Mọi thư mục bắt đầu bằng dấu chấm ở gốc dự án (`.claude/`, `.contracts/`, `.design/`, `.plan/`) là context: chỉ đọc, không sửa. Không đọc, không ghi `.reviews/` (của Orchestrator). Không sửa `CommissionTracker.slnx`. Được cập nhật tệp project Visual Studio của **chính layer mình làm** (`Backend/Backend.pyproj`, `Desktop/Desktop.esproj`, `UI/UI.esproj`), nhưng chỉ trong giới hạn ghi ở mục 5.
- Không bao giờ sửa `.contracts/data_schema.yaml` hay `.contracts/api_contract.yaml`, kể cả trường `status`. Nếu nghi hợp đồng thiếu hoặc sai, xử lý theo `08-operating-protocol.md`, Phần 4.
- Nếu hợp đồng đang ở `contract_state: draft` (hoặc còn nhãn DRAFT), **không viết code**. Dừng lại và báo người vận hành.
- Chỉ làm đúng phạm vi của plan phiên này (`.plan/<layer>_plan.md`) (xem `08-operating-protocol.md`, Phần 6).
- Viết checkpoint đúng khuôn `07-checkpoint-protocol.md`; không tự chạy công cụ gom checkpoint.
- **Git:** không chạy `git commit`, `git push`, `git reset`, `git checkout` hay lệnh nào đổi lịch sử hoặc trạng thái của kho. Được đọc (`git status`, `git diff`, `git log`). Project Owner tạo commit sau khi Orchestrator audit phiên đạt.

## 3. Dự án

**Commission Tracker** — ứng dụng desktop cá nhân, chạy hoàn toàn trên máy, cho họa sĩ vẽ commission: quản lý khách hàng, đơn hàng, tiến độ, thanh toán, thu nhập, nhắc việc, sao lưu và khôi phục dữ liệu. Về lâu dài còn có watermark ẩn để chứng minh quyền sở hữu tác phẩm khi có tranh chấp, nhưng phần đó **không thuộc V1** (xem bên dưới).

**Phạm vi V1** — chi tiết đầy đủ ở `.design/v1_scope.md`, đọc tệp đó khi cần biết ranh giới chính xác:

- V1 là bản đặt nền móng. Ba ưu tiên, theo đúng thứ tự này khi phải đánh đổi:
  1. **Nền tảng vững và linh hoạt** — xây đến đâu chắc đến đó, đủ chỗ mở rộng cho các phiên bản sau.
  2. **Dạng đơn giản nhất mà chạy đúng** — tính năng phải chạy được, dùng được, thật vững. Tiện ích phụ, tối ưu hiệu năng, gọt giao diện, thâu tóm mọi ca hiếm: **không** phải việc của V1.
  3. **Việc phức tạp để dành phiên bản sau** — không phải vì nó khó, mà vì xây nó trên một cái nền chưa được chứng minh là xây nhà trên cát.
- **Watermark ẩn để dành V4 trở đi** (lộ trình phiên bản ở `.design/product_versions.md`: V2 củng cố và trải nghiệm dùng, V3 diện mạo, V4 trở đi tính năng cao cấp). Ba workflow `apply_watermark`, `verify_watermark` và toàn bộ `clause_c_ai_service` giữ nguyên trong hợp đồng ở `status: đang_chờ_triển_khai`, nhưng V1 không triển khai. Lý do: chưa chốt engine, chưa có tập ảnh thử, chưa có quy trình đo độ bền. `manage_watermark_profile` đã xây xong và vẫn được ráp nối, nhưng **giao diện V1 không được có màn hình hồ sơ quyền sở hữu** — nếu có, họa sĩ sẽ điền thông tin cho một tính năng chưa tồn tại.
- **Không có trong V1:** watermark; kiểm tra trùng lặp ảnh qua Internet; làm mù AI chống train; đồng bộ online; nhiều người dùng.
- Đóng gói và kiểm thử cho **Windows** trước. Không viết code chỉ chạy được trên một hệ điều hành nếu có thể tránh.

**Công nghệ:** SQLite (nơi lưu trữ) — Python (backend; dịch vụ AI cho watermark, chạy thành tiến trình riêng) — Electron (tiến trình chính, layer desktop) + React (renderer, layer giao diện theo iWCA) — đóng gói thành bộ cài Windows chạy độc lập. Chi tiết theo layer ở mục 5.

## 4. Layer hệ thống và bố cục thư mục

Gốc dự án là thư mục chứa Solution Visual Studio `CommissionTracker.slnx`. Mọi đường dẫn trong tài liệu, plan và checkpoint đều tính từ gốc này.

**Code:** mỗi layer hệ thống theo WCA là một project Visual Studio riêng, nằm trong thư mục cùng tên ngay dưới gốc dự án. Thư mục đó chính là gốc của layer.

| Thư mục | Layer hệ thống | Khóa Điều khoản | Theo WCA? |
|---|---|---|---|
| `Backend/` | Backend Python — sở hữu toàn bộ dữ liệu nghiệp vụ và SQLite | `clause_b_backend` | Có |
| *(tạo sau)* | Dịch vụ AI Python — engine watermark, không giữ dữ liệu nghiệp vụ | `clause_c_ai_service` | Có |
| `Desktop/` | Tiến trình chính của Electron — Main của layer này khởi động, chờ sẵn sàng và dừng các tiến trình Python, nạp renderer | `clause_d_desktop` | Có |
| `UI/` | Giao diện React (renderer) | — (bên gọi `external`, không có Điều khoản) | **Theo iWCA** bên trong (skill `iwca-implementation`); với hợp đồng tối cao vẫn là bên gọi `external` |

Tên thư mục của các layer chưa có (dịch vụ AI) sẽ được ghi vào bảng này khi người vận hành tạo project tương ứng. Tên thư mục và tên tệp project viết đúng hoa thường như bảng trên ở mọi nơi — tài liệu, plan, checkpoint, lệnh EVIDENCE — vì Orchestrator chạy lại lệnh trên một hệ thống phân biệt hoa thường.

Bên trong mỗi thư mục layer theo WCA, bố cục theo mặc định của `04-implement.md`, Bước 4.0: `configs/`, `workflows/<tên_workflow>/{configs.yaml, entities, adapters, services, routers}`, `cross_cutting/<tên>/`, `shared/` (chỉ khi thỏa `05-edge-cases.md`, Bước 5.3). Riêng tệp Main của layer là **tệp khởi động mà Visual Studio tạo sẵn** cho project đó (`Backend/Backend.py` với layer backend), thay cho `main.<ext>` mặc định. Khối checkpoint của Main (`07-checkpoint-protocol.md`) nằm ở đầu tệp này. Mọi lệnh chạy của một layer đều chạy từ thư mục của layer đó (ví dụ `cd Backend` rồi `python Backend.py`).

Kiểm thử của một workflow đặt trong `workflows/<tên_workflow>/tests/`; kiểm thử cấp layer (ví dụ khởi động cả tiến trình) đặt trong `tests/` của layer.

**Bố cục `Desktop/`** (WCA). Main của layer là `src/main.ts` (dịch ra `dist/main.js`); khối checkpoint của Main nằm ở đầu tệp này. Script preload thuộc trách nhiệm của Main.

```
Desktop/
  Desktop.esproj
  package.json            # electron, typescript; "main": "dist/main.js"; không React, không Vite
  package-lock.json
  tsconfig.json           # tsc → CommonJS → dist/ (chỉ dịch src/)
  eslint.config.js
  playwright.config.ts    # kiểm thử cấp layer; Playwright tự dịch tests/ (trừ tests/packaged/)
  playwright.packaged.config.ts  # kiểm thử bản đóng gói: tests/packaged/ (npm run test:packaged)
  electron-builder.yml    # cấu hình đóng gói (chặng C): bộ cài NSIS
  packaging/
    prepare_runtime.mjs   # dựng packaging/stage/{python,backend,ui} cho bản đóng gói
    python_runtime.json   # phiên bản, URL, SHA-256 của gói Python nhúng
    cache/  stage/        # sinh ra khi build — không đưa vào mã nguồn
  release/                # đầu ra của electron-builder — không đưa vào mã nguồn
  configs/
    desktop.json          # cấu hình cấp layer — dữ liệu, không phải code; chỉ Main đọc
  src/
    main.ts               # Main
    preload.ts            # phơi đối tượng renderer_bridge cho renderer (data_schema clause_a_common)
    cross_cutting/        # reminder_ticker, native_dialogs — chặng D
    workflows/            # restore_data — chặng F, nếu thuộc V1
  tests/                  # kiểm thử cấp layer (Playwright): *.spec.ts, helpers.ts, probe.cjs (npm run probe)
    packaged/             # kiểm thử và công cụ đo trên release/win-unpacked (chặng C)
    tools/                # công cụ đo và demo chạy tay (ví dụ toast_demo.cjs, phiên 30) — không nằm trong npm test
    fixtures/             # trang thử và backend giả của kiểm thử — không bao giờ được Main dùng khi chạy bình thường
  dist/                   # đầu ra build, không đưa vào mã nguồn
```

**Bố cục `UI/`** (iWCA — đúng bố cục mặc định ở `i2-scaffold.md`, Bước I2.1). Main của layer là `src/main.tsx`.

```
UI/
  UI.esproj
  package.json            # react, vite, zod; vitest, testing-library, stylelint
  index.html              # điểm vào của Vite
  vite.config.ts          # không cấu hình dev server
  tsconfig*.json          # "strict": true
  eslint.config.js        # ma trận R1–R14 (iwca_theory.md §7)
  stylelint.config.js     # R7
  src/
    main.tsx              # Main — khối checkpoint `main`
    configs/layer_configs.ts
    logic/  shared/{results.ts, resources.ts}  workflows/<tên>/
    kit/    index.ts  tokens/tokens.css  styles/  components/
    screens/ navigation.ts  logic_context.ts  assert_never.ts  app_root.tsx  layouts/  pages/
  scripts/                # script kiểm tra riêng cho luật mà công cụ không diễn đạt được (nếu có)
  tests/e2e/              # kiểm thử chạy thật qua Desktop (Playwright); không nằm trong npm run check
  evidence/               # ảnh chụp bằng chứng (kịch bản bấm thử, e2e); được giữ lại, không ignore
  dist/                   # bản build tĩnh mà Desktop nạp qua app://; không đưa vào mã nguồn
```

`Desktop/` và `UI/` được tạo từ mẫu React + TypeScript của Visual Studio; phần mẫu thừa được dọn ở phiên đầu tiên của từng layer, theo plan của phiên đó. Giữ lại `CHANGELOG.md` mà Visual Studio sinh ra ở mỗi project.

**Context** (thư mục bắt đầu bằng dấu chấm, cùng cấp với Solution):

| Vị trí | Nội dung | Coding agent |
|---|---|---|
| `CLAUDE.md` | Tệp này | Đọc |
| `.claude/skills/wca-implementation/` | Skill WCA: lý thuyết nền, các giai đoạn 00–06, giao thức 07–08 | Đọc |
| `.claude/skills/iwca-implementation/` | Skill iWCA: tổ chức layer giao diện; lý thuyết `iwca_theory.md`, các giai đoạn `i1`–`i6` | Đọc (khi làm `UI/`) |
| `.contracts/data_schema.yaml`, `.contracts/api_contract.yaml` | Hợp đồng tối cao | Đọc, không bao giờ sửa |
| `.design/` | Đầu ra các giai đoạn thiết kế (ví dụ `.design/03_classification.md`: phân loại workflow và thứ tự ráp nối; `.design/ui_decomposition.md`: phân rã giao diện iWCA I1, gồm bảng trang và trạng thái trang) | Đọc |
| `.plan/<layer>_plan.md` | Plan của phiên theo layer (`08-operating-protocol.md`, Phần 2), ví dụ `.plan/backend_plan.md` | Đọc |
| `.plan/integration_<tên>_plan.md` | Plan của phiên tích hợp | Đọc |
| `.plan/open_issues.md` | Sổ tồn đọng theo layer (mã `DSK-*`, `BE-*`, `UI-*`, `ENV-*`); chỉ Orchestrator sửa. Plan trỏ tới mã ở đây | Đọc |
| `.reviews/` | Của Orchestrator và người vận hành: báo cáo audit theo layer (`audits/<layer>/`), prompt đã giao cho coding agent (`prompts/<layer>/`), báo cáo hiện trạng của từng phiên Orchestrator (`session_reports/`) | Không đọc, không ghi |

⚠ Một số công cụ tìm kiếm bỏ qua thư mục bắt đầu bằng dấu chấm theo mặc định. Khi cần đọc hợp đồng, plan hay thiết kế, mở trực tiếp theo đường dẫn ở bảng trên thay vì tìm bằng từ khóa.

## 5. Quy ước riêng của dự án

- **Ngôn ngữ:** tên định danh, code, comment trong code: tiếng Anh. Nội dung checkpoint và báo cáo gửi người vận hành: tiếng Việt; khóa YAML và định danh trong checkpoint giữ nguyên như `07-checkpoint-protocol.md`.
- **Tường thuật trong lúc làm việc:** mỗi bước thật sự làm việc (viết hay sửa một tệp, chạy một lệnh, chạy kiểm thử) được kể lại bằng đúng ba phần, tổng cộng một tới ba câu:
  1. **việc đang làm** — một câu;
  2. **căn cứ của quyết định** — điều khoản nào của hợp đồng, mục nào của plan, hay mục nào của checkpoint dẫn tới cách làm này; nếu có cách khác khả dĩ thì một câu nói vì sao không chọn; một tới hai câu;
  3. **kết quả** — đã xảy ra gì: đạt hay hỏng, con số kiểm thử, lỗi gặp phải.

  Phần căn cứ là bắt buộc, kể cả khi bước đó có vẻ hiển nhiên; một tường thuật chỉ có việc làm và kết quả là thiếu. Khi một bước thất bại, nói luôn nguyên nhân bạn cho là đúng trước khi thử lại. Viết gọn, một tới ba câu, không thành đoạn văn. Mục đích giống như phần `content` của EXPERIENCES trong checkpoint: người vận hành và Orchestrator đối chiếu được quyết định với hợp đồng mà không phải đọc lại toàn bộ code, nhất là khi có việc hỏng mà bạn không tự gỡ được.
- **Báo cáo cuối phiên gửi người vận hành:** ngắn gọn. Gồm: việc đã làm theo từng mục của plan, tệp đã tạo/sửa, lệnh để chạy lại EVIDENCE, việc đảo thứ tự (nếu có) và lý do, điều còn vướng hay cần quyết, đề xuất `status`. Không chép lại nội dung checkpoint: checkpoint đã nằm trong code, Orchestrator tự đọc.
- **`last_updated_by` trong checkpoint:** `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`, ví dụ `coding-agent@2026-09-25#1`.
- **Ngưỡng hết hạn của NOTES:** 14 ngày kể từ `written_at`.
- **Hình thức điểm giao tiếp** (khai báo chính thức trong `clause_a_common.endpoint_forms` của API Contract):
  - `http` — giữa giao diện và backend, giữa desktop và backend, giữa backend và dịch vụ AI, chỉ trên `127.0.0.1`.
  - `in_process` — giữa các workflow trong cùng một layer.
  - `ipc` — giữa giao diện và desktop.

  Mọi thứ giao diện cần từ Python đều phải là một điểm giao tiếp `http` có trong API Contract; giao diện không bao giờ gọi thẳng dịch vụ AI.
- **Renderer, origin và CORS** (Data Schema 6.0.0 → 6.1.0, `clause_a_common`): desktop Main chỉ nạp renderer từ `shared_values.ui_origin` và trao cho nó đúng một giá trị khởi động — địa chỉ backend, thuộc tính `backendBaseUrl` của đối tượng đóng băng `window.<shared_values.renderer_bridge>` do preload phơi ra; hàm `invoke` cho các mục `ipc` chỉ thêm vào đối tượng đó khi có mục `ipc` đầu tiên (API Contract 4.0.0); backend trả CORS, kể cả preflight, cho `ui_origin`, và không cấp `Access-Control-Allow-Origin` cho origin nào khác. Giá trị `ui_origin` là `app://commission-tracker`; phiên B1 đã đo header `Origin` thật và khớp. Nếu sau này đo ra khác thì sửa ở hợp đồng, không vá trong code.
- **Công nghệ theo layer** (đã chốt; đổi phải được người vận hành duyệt):
  - Backend (`Backend/`): Python 3.13, dùng môi trường ảo `Backend/env` mà Visual Studio đã tạo (interpreter: `Backend/env/Scripts/python.exe`; mọi lệnh chạy và kiểm thử dùng interpreter này); máy chủ `http` bằng FastAPI trên uvicorn; `sqlite3` của thư viện chuẩn; kiểm thử bằng pytest + httpx; phụ thuộc khóa phiên bản trong `Backend/requirements.txt`: chỉ phụ thuộc lúc chạy, là thứ bản đóng gói cài. Công cụ kiểm thử (`pytest`, `httpx`) nằm trong `Backend/requirements-dev.txt`; môi trường phát triển cài bằng `env\Scripts\python.exe -m pip install -r requirements-dev.txt`. Tính từ phiên 15, Main backend giữ khóa trên tệp `<db_file_path>.lock` suốt đời tiến trình (Data Schema 6.2.0, `main-EXP-013`). Môi trường Python do người vận hành chuẩn bị; không cài thêm bản Python khác. Ghi rõ interpreter và phiên bản đã dùng vào EVIDENCE. Tắt tài liệu tự sinh của FastAPI (`/docs`, `/redoc`, `/openapi.json`) vì đó là lối vào không khai báo trong hợp đồng.
  - Desktop (`Desktop/`): **Electron 44**, TypeScript dịch bằng `tsc` ra CommonJS (không bundler); kiểm thử cấp layer bằng Playwright ở chế độ Electron (chế độ này Playwright xếp là thử nghiệm — nếu gây trở ngại thì báo, không tự đổi công cụ). Cửa sổ renderer luôn bật `contextIsolation` và `sandbox`, không bật `nodeIntegration`. Giao thức `app://` được đăng ký với `standard`, `secure`, `supportFetchAPI`, `corsEnabled` trước sự kiện `ready`, và phục vụ tệp bằng `protocol.handle`. Khi chạy từ mã nguồn, Main khởi động backend bằng `Backend/env/Scripts/python.exe Backend.py` với thư mục làm việc `Backend/`, và nạp renderer từ `UI/dist/`; hai đường dẫn này nằm trong `configs/desktop.json`, không gõ thẳng vào code.
  - Giao diện (`UI/`): **React** + **TypeScript** ở chế độ `strict`, build bằng **Vite** ra tệp tĩnh (không dùng dev server, không hot reload); **CSS Modules** cộng biến CSS làm token, không dùng framework CSS; không dùng thư viện điều hướng ở V1 (bảng `navigation.ts` cộng trạng thái); **Zod** để kiểm hình dạng phản hồi trong Adapters; **Vitest** cho phân khu logic, **Testing Library** + jsdom cho kiểm thử dựng trang; ESLint (typescript-eslint, plugin React) và stylelint giữ ma trận phụ thuộc R1–R14. Mọi lệnh kiểm tra gom vào một lệnh `npm run check` (iWCA, Bước I2.4).
  - Node: **Node 24 LTS**, do người vận hành cài; không cài bản Node khác. Phụ thuộc npm khóa bằng `package-lock.json` của từng layer; ghi phiên bản Node, npm và các gói chính vào EVIDENCE.
  - Dịch vụ AI: chốt khi soạn plan của phiên đầu tiên cho layer đó (phiên bản làm watermark, V4 trở đi).
  - Đóng gói (chặng C, phiên 13 — đã làm): **electron-builder** 26.15.3, bộ cài NSIS (`npm run dist` trong `Desktop/`; kiểm thử bản đóng gói bằng `npm run test:packaged`). Chi tiết ở checkpoint Main của `Desktop/src/main.ts` (main-EXP-008 tới main-EXP-015).
    - Python trong gói là **gói nhúng của python.org, bản 3.13.12**. Nó chạy `Backend.py` từ mã nguồn đã chép vào gói, nên `LAYER_ROOT = Path(__file__)` vẫn đúng.
    - Bố cục trong gói: `resources/python/`, `resources/backend/` (không có kiểm thử), `resources/ui/`.
    - Main chọn giữa đường dẫn chạy từ mã nguồn và đường dẫn của bản đóng gói theo `app.isPackaged`. Cả hai bộ đường dẫn nằm trong `configs/desktop.json`.
    - Bản đóng gói chỉ nhận hai cờ kiểm thử, `--ct-test-data-dir` và `--ct-test-no-dialog`, và bỏ qua mọi cờ `--ct-test-*` khác.
    - Kiểm thử bản đóng gói (`npm run test:packaged`) luôn truyền `--ct-test-data-dir`.
- **Tệp project Visual Studio của layer.** Với `Desktop/Desktop.esproj` và `UI/UI.esproj` (hệ project JavaScript của Visual Studio): tệp không liệt kê từng tệp nguồn; chỉ được sửa các thuộc tính lệnh (`BuildCommand`, `StartupCommand`, `TestCommand`, `ShouldRunBuildScript`, `ShouldRunNpmInstall`, `BuildOutputFolder`, `JavaScriptTestRoot`, `JavaScriptTestFramework`) khi plan của phiên cho phép, không sửa gì khác. Với `Backend/Backend.pyproj`: sau khi tạo, đổi tên hay xóa tệp và thư mục, cập nhật các mục `<Compile Include>` (tệp `.py`), `<Content Include>` (tệp khác như `.yaml`, `.txt`, `.ini`) và `<Folder Include>` để Solution Explorer khớp với thư mục thật. Không liệt kê `env/`, `__pycache__/`, `.pytest_cache/`. Không sửa bất kỳ thiết lập nào khác trong tệp (interpreter, tệp khởi động, framework kiểm thử, thư mục làm việc…).

  Đường dẫn trong tệp này dùng dấu chéo ngược của Windows (`workflows\send_reminder\services.py`). Sửa tệp bằng công cụ soạn thảo tệp trực tiếp, không viết một script rồi chạy qua shell: dấu chéo ngược bị shell và chuỗi của Python nuốt mất một tầng, nên script thường không sửa được gì hoặc ghi sai đường dẫn. Cách này đã làm hỏng việc ở phiên 4, 5, 6 và 7. Cùng lý do đó, đừng nối nội dung vào tệp bằng heredoc của shell; viết thẳng bằng công cụ soạn thảo tệp.
- **Phiên bản cấu trúc lưu trữ của từng workflow:** mỗi workflow sở hữu bảng thì tự quản lý phiên bản cấu trúc bảng của mình bằng một bảng riêng `<tên_workflow>_schema_version` (một dòng, một cột `version`), cùng danh sách các bước nâng cấp theo thứ tự trong Adapters của nó. Chỉ thêm bước mới vào cuối, không sửa bước đã áp dụng. Không dùng `PRAGMA user_version`, vì giá trị đó là của chung cả cơ sở dữ liệu. Gặp phiên bản mới hơn bản build hiểu được thì dừng khởi động, không in `READY`. Mẫu tham khảo: `Backend/workflows/manage_commission/adapters.py`.
- **Vận hành layer giao diện (`UI/`, iWCA).** `08-operating-protocol.md` áp dụng nguyên vẹn; những điểm dưới đây là cách dự án này điền các chỗ mà iWCA để cho "giao thức vận hành của dự án" quy định.
  - **Plan:** `.plan/ui_plan.md`, `session_for: ui`, đúng khung 08 Phần 2. Plan nêu rõ phiên làm giai đoạn nào của iWCA (I2, hoặc I3 → I6 cho những trang nào).
  - **Đầu ra I1:** bảng workflow giao diện, bảng trang, giá trị khởi động và bảng loại trừ nằm ở `.design/ui_decomposition.md`. Chỉ Orchestrator sửa tệp này; coding agent chỉ đọc. Phiên cần một trang, một lời gọi hay một giá trị khởi động chưa có trong bảng thì dừng và báo (iWCA I1, quy tắc quay lui), không tự thêm.
  - **Trạng thái trang** (`chưa_làm | đang_làm | hoàn_tất`), tương đương `status` của hợp đồng (iWCA §11, D6):
    - chuyển `chưa_làm` → `đang_làm` khi plan của phiên đầu tiên chạm tới trang đó được phát hành;
    - chuyển sang `hoàn_tất` khi coding agent đề xuất theo I6, **và** Orchestrator đã audit, **và** Project Owner đã tự chạy kịch bản bấm thử.

    Việc đổi trạng thái do Orchestrator ghi vào bảng; coding agent chỉ đề xuất.
  - **Nhóm token bổ sung** (iWCA I4, bảng nhóm token: dự án thêm nhóm ở tài liệu nền): `font-family`, cho phông chữ, ví dụ `--base-font-family-sans` và `--font-family-body`. Giá trị là một chồng phông hệ thống có sẵn trên Windows, có dấu tiếng Việt; không nhúng tệp phông (Desktop không phục vụ `.woff2`).
  - **Checkpoint của workflow nền tảng `scaffold_ui`** nằm ở đầu `src/logic/workflows/scaffold_ui/adapters.ts`, vì workflow này không có Services (Giao thức 07, vị trí dự phòng). Tổng cộng layer có bốn khối trở lên: `main`, `kit`, `screens` và một khối cho mỗi workflow.
  - **Kịch bản bấm thử** (`walkthrough.yaml`, I6.3): coding agent chạy trước, có ghi tên người chạy và ảnh chụp từng bước; Project Owner chạy lại bằng tay trước khi trang được đánh dấu `hoàn_tất`. Ảnh chụp đặt ở `UI/evidence/walkthroughs/<khóa trang>/<khóa trang>-<id bước>.png`. **Bước `unreachable`:** Desktop V1 thoát khi backend chết, nên bước này dùng fixture `UI/tests/fixtures/switchable_backend.py`, chạy qua cờ `--ct-test-backend-script` của Desktop. Fixture khởi động `Backend.py` thật làm tiến trình con, và tắt/bật nó trên đúng cổng cũ theo một tệp điều khiển (`down`/`up`) đặt cạnh `CT_DB_FILE_PATH`. Công cụ `npm run walkthrough:app` và `npm run walkthrough:backend -- down|up` trong `UI/` dùng cho cả kiểm thử tự động lẫn Project Owner chạy tay.
  - **Chạy ứng dụng thật:** `npm run build` trong `UI/` sinh ra `UI/dist/`, rồi `npm start` trong `Desktop/`. Phiên giao diện được **chạy** Desktop và Backend, kể cả với cờ `--ct-test-*` của Desktop (liệt kê trong `Desktop/configs/desktop.json`), nhưng không sửa tệp nào trong hai thư mục đó. Script và fixture riêng mà giao diện cần để kiểm thử thì nằm trong `UI/tests/`.
  - **Checkpoint:** mọi khối trong `UI/` có `clause: external` (iWCA §8); khối `main` ở `src/main.tsx`, khối `kit` ở `src/kit/index.ts`, khối `screens` ở `src/screens/navigation.ts`. Khi gom checkpoint (08 Phần 8), Orchestrator gom các khối `external` thành một bản tóm tắt riêng, cạnh bản tóm tắt của từng Điều khoản.
  - **Hướng giao diện V1:** giao diện tối là chủ đạo; gọn gàng, không dày thông tin; theo các nguyên tắc tối thiểu ở `.design/ui_decomposition.md` mục 7. Không gọt giao diện, không hiệu ứng: diện mạo thuộc V3 (`.design/product_versions.md`).
  - ⚠ **Không có màn hình hồ sơ quyền sở hữu ở V1** (`.design/v1_scope.md` mục 3.1): không trang, không workflow giao diện, không lời gọi nào tới `/watermark-profiles` hay `/watermark-strengths`, dù các endpoint đó đang chạy thật.
- **Bằng chứng cho watermark:** không workflow watermark nào được đề xuất `đã_hoàn_thiện` nếu chưa có mục EVIDENCE đo trên tranh vẽ mẫu thật. Mục đó phải có: tỷ lệ giải mã đúng sau chụp màn hình, sau lưu lại và sau nén kiểu mạng xã hội, cùng kết quả đánh giá độ vô hình bằng mắt thường. Việc đo cần cả backend lẫn dịch vụ AI cùng chạy, nên thuộc một phiên tích hợp.

## 6. Hiện trạng

- Hợp đồng đã được **duyệt** (`contract_state: approved`): Data Schema `9.0.2`, API Contract `4.0.0`. Bản 9.0.2 (2026-10-01, CT-5) đưa luật "ngày bắt đầu không sau ngày kết thúc" của `view_income_report` vào `type` của `period_to`; giá trị chấp nhận không đổi. Bản 9.0.1 (2026-09-30) đưa `record_payment` trở lại `đã_hoàn_thiện` sau phiên 23 (BE-7). Bản 9.0.0 (2026-09-30, CT-4) thu hẹp `payment_input.method` thành not blank. Bản 8.0.1 (2026-09-28) đưa `manage_client`, `manage_commission`, `manage_watermark_profile` trở lại `đã_hoàn_thiện` sau phiên 18. Bản 7.0.0 (2026-09-28, CT-2) thu hẹp `client_input`: `display_name`, `channel`, `value` đều **not blank** (`formats.not_blank`). Bản 8.0.0 (2026-09-28, CT-3) làm tương tự cho `commission_input.title` và bút danh `profile_input.display_name`. Ba workflow đó đã tạm về `đang_triển_khai` cho tới khi backend áp dụng (BE-5, BE-6, phiên 18), rồi trở lại `đã_hoàn_thiện` ở bản 8.0.1. Bản 6.2.0 (2026-09-27) thêm luật: mỗi lúc chỉ một tiến trình backend được dùng tệp dữ liệu (phát hiện ở phiên desktop 13 và 14; backend hiện thực ở phiên 15). Bản 6.0.0 (2026-09-26) thêm `shared_values.ui_origin` và hai luật về renderer và CORS; bản 6.0.1 làm rõ luật CORS với origin khác (audit phiên B0); bản 6.1.0 thêm `shared_values.renderer_bridge` (tên đối tượng preload phơi cho renderer), và API Contract 4.0.0 cho lời gọi `ipc` đi qua hàm `invoke` của đối tượng đó. Phần của backend đã xong ở phiên B0. Mọi Điều khoản vẫn **mở** (`lock_status: open`). Riêng `clause_c_ai_service` không được khóa trước khi có EVIDENCE về độ bền của watermark.
- **Quản lý phiên bản (từ 2026-09-28):** git ở gốc dự án, đẩy lên `https://github.com/Super-Muscle-Coder/CommissionTracker` (public). Quy ước: mỗi phiên coding agent đã audit đạt là một commit do Project Owner tạo. Commit xen kẽ hai loại, phân biệt bằng tiền tố của thông điệp (Project Owner chốt 2026-09-28): `OS - <nội dung>` cho thay đổi của phiên Orchestrator (audit, plan, prompt, hợp đồng, đặc tả, sổ tồn đọng); `CAS<số phiên> - <nội dung>` cho sản phẩm của một phiên coding agent, chỉ sau khi audit đạt và Project Owner duyệt, ví dụ `CAS19 - UI: D2 commissions`. Hai loại không gộp chung một commit. Orchestrator kiểm bằng cách clone kho. Kho có `.gitattributes` (`* text=auto`) và `.gitignore` gốc.
- Giai đoạn 3 đã xong: `.design/03_classification.md`.
- Đã xong: phiên backend #1 → #9 (audit của Orchestrator xác nhận). Tám workflow đã xây xong: `scaffold_backend`, `manage_client`, `manage_commission`, `update_progress`, `record_payment`, `view_income_report`, `manage_watermark_profile`, `send_reminder`. Cả tám workflow `đã_hoàn_thiện` (Data Schema 9.0.1). Phiên #9 (B0) thêm CORS cho renderer ở Main backend. Tính tới phiên 23: 460 kiểm thử backend đạt; không còn `UNSOLVED_PROBLEMS` ở khối checkpoint nào.
- Backend còn `backup_data` (thuộc V1) và `apply_watermark`, `verify_watermark` (để dành V4 trở đi).
- **Desktop Main đã có (phiên 10, B1):** `npm start` trong `Desktop/` khởi động backend, chờ `READY`, nạp renderer qua `app://`, trao `backendBaseUrl` qua `window.commissionTracker`, dừng backend sạch khi đóng. Origin đo được đúng bằng `ui_origin`. Chưa có workflow nào của desktop; thành phần cắt ngang đầu tiên, `reminder_ticker`, có từ phiên 30. Từ phiên 12, `npm run build` trong `UI/` rồi `npm start` trong `Desktop/` mở ứng dụng thật với trang `client_list`. Trang thử của Desktop vẫn chạy bằng `npm run probe`.
- **Ba chỗ của nền tảng chưa được chứng minh** (chi tiết ở báo cáo hiện trạng mới nhất của Orchestrator): đường đi xuyên suốt từ giao diện tới backend; luật khởi động và dừng giữa hai Main (backend đã làm phần của nó, desktop chưa tồn tại); và việc đóng gói thành tệp thực thi. Về đóng gói, hướng đã chọn (Python nhúng chạy mã nguồn, mục 5) giữ `LAYER_ROOT = Path(__file__)` đúng như hiện tại; điều này sẽ được kiểm ở chặng C, chưa được chứng minh.
- Thứ tự hiển thị có dấu tiếng Việt (ví dụ "Ánh" sau "z" trong `client_list`, `profile_list`) do giao diện tự sắp xếp; backend không đổi.
- **Lộ trình V1: `.plan/v1_roadmap.md`** (bền, không ghi đè). Chặng A (cách làm việc cho phần giao diện) đã xong phần kiến trúc: iWCA, WCA v2.3, hợp đồng 6.x, bộ công nghệ ở mục 5. Chặng B chia thành B0 (backend: CORS — **xong**) → B1 (desktop Main đầu tiên — **xong**) → B2 (layer `UI/` đầu tiên, tách B2a: dựng khung I2 ở phiên 11 — **xong**, và B2b: trang `client_list` ở phiên 12 — **xong**; chặng B hoàn tất 2026-09-27). Chặng C (đóng gói thử): phiên 13 và 14 (desktop) **xong** 2026-09-27; ENV-5 (đo lại lần mở đầu) **xong** 2026-09-28; chặng chỉ còn chờ việc chạy tay trên một máy Windows khác (ENV-4). **Mọi việc tồn đọng, theo layer: `.plan/open_issues.md`.** Phiên 14 (desktop, vá và chẩn đoán) **xong** 2026-09-27; `.plan/desktop_plan.md` giữ plan phiên 14 đã hoàn tất. Plan của từng phiên nằm ở `.plan/<layer>_plan.md` và bị ghi đè mỗi phiên. Phiên 16 (D1: ba trang khách hàng) **xong** 2026-09-28, audit tìm ra UI-4, UI-5; phiên 17 (vá D1) **xong** 2026-09-28, audit đạt, Project Owner chạy tay xong: ba trang D1 `hoàn_tất`; `.plan/ui_plan.md` giữ plan phiên 17 đã hoàn tất; UI có 241 kiểm thử; Phiên 15 (backend: BE-1, BE-2, BE-3) **xong** 2026-09-28; backend có 381 kiểm thử. Phiên 18 (backend: BE-5 và BE-6, luật not blank của Data Schema 7.0.0 và 8.0.0) **xong** 2026-09-28, audit đạt; backend có 445 kiểm thử; ba workflow về `đã_hoàn_thiện` ở Data Schema 8.0.1. `.plan/backend_plan.md` giữ plan phiên 18 đã hoàn tất. Phiên 19 (chặng D2: `commission_list`, `commission_detail`, `commission_form`; kèm UI-8) **xong** 2026-09-29; audit xác nhận chức năng và đóng UI-8, nhưng e2e không tất định (UI-9), nên ba trang D2 giữ `đang_làm`; UI có 555 kiểm thử, e2e 32. Project Owner đã chạy tay ba kịch bản D2 (2026-09-29). Phiên 20 (chặng D3: `progress_board`, `stage_change`, phần Tiến độ của `commission_detail`; kèm UI-9) **xong** 2026-09-29; audit xác nhận chức năng, đóng UI-9, nhưng tìm ra UI-10 (spec khẳng định `role="status"` không lọc), nên năm trang D2 và D3 giữ `đang_làm`; UI có 780 kiểm thử, e2e 42. Phiên 21 (vá UI-10) **xong** 2026-09-29, audit đạt; `npm run check` có thêm bước `lint:e2e`. Project Owner chạy tay các bước D3 (2026-09-29): năm trang D2, D3 `hoàn_tất`. Mở UI-11 (chụp ảnh e2e hết giờ trên Windows). Data Schema 9.0.0 (2026-09-30, CT-4): `payment_input.method` not blank; 9.0.1 đưa `record_payment` về `đã_hoàn_thiện` sau BE-7. Phiên 22 (chặng D4: `payment_list`, `payment_form`, phần Thanh toán của `commission_detail`; kèm thu dữ liệu UI-11) **xong** 2026-09-30, audit đạt (`.reviews/audits/ui/audit_ui_session22.md`); Project Owner chạy tay D4 (2026-09-30): `payment_list`, `payment_form`, `commission_detail` `hoàn_tất`; UI có 1100 kiểm thử, e2e 54; `.plan/ui_plan.md` giữ plan phiên 22 đã hoàn tất. UI-11 vẫn mở, đã có trace và nhật ký thời gian chụp ảnh. Phiên 23 (backend, BE-7: `record_payment` áp not blank cho `method`) **xong** 2026-09-30, audit đạt (`.reviews/audits/backend/audit_backend_session23.md`); backend có 460 kiểm thử; `.plan/backend_plan.md` giữ plan phiên 23 đã hoàn tất. Data Schema 9.0.1 (`record_payment` về `đã_hoàn_thiện`) được Project Owner duyệt 2026-09-30. Phiên 24 (chặng D5: trang `income_report`, mục điều hướng "Thu nhập"; kèm thu dữ liệu UI-11) **xong** 2026-10-01, audit đạt về chức năng (`.reviews/audits/ui/audit_ui_session24.md`); UI có 1303 kiểm thử, e2e 59; `.plan/ui_plan.md` giữ plan phiên 24 đã hoàn tất. `income_report` chờ Project Owner chạy tay. CT-5 (luật thứ tự ngày nằm ngoài `type`, lỗi đặc tả của Orchestrator) duyệt phương án A: Data Schema 9.0.2. Phiên 25 (giao diện, vá ngắn) **xong** 2026-10-01, audit đạt (`.reviews/audits/ui/audit_ui_session25.md`): CT-5 trong Configs, UI-12 đóng; thí nghiệm UI-11: chỉ cửa sổ Electron bị thu nhỏ làm lệnh chụp treo, không cờ Chromium nào chữa được; chờ Project Owner trả lời có thu nhỏ cửa sổ khi e2e chạy không. `.plan/ui_plan.md` giữ plan phiên 25 đã hoàn tất. Project Owner chạy tay D5 (2026-10-01): `income_report` `hoàn_tất`; chặng D5 xong về phía giao diện. Phiên 26 (desktop: DSK-15 ngôn ngữ ứng dụng `vi` nên ô ngày hiện ngày/tháng/năm, DSK-13 hộp thoại lỗi tiếng Việt, DSK-14 công cụ đo không dùng `-EncodedCommand`, DSK-12 dọn checkpoint Main) **xong** 2026-10-02, audit đạt (`.reviews/audits/desktop/audit_desktop_session26.md`); Desktop có 17 kiểm thử; `.plan/desktop_plan.md` giữ plan phiên 26 đã hoàn tất. Mở DSK-16 (`test:packaged` phải chạy khi giao diện đổi chữ trang mở đầu). Phiên 27 (giao diện, chặng D6 nhắc việc: `reminder_list`, `reminder_settings`, mục "Nhắc việc"; kèm UI-11 bước 3 ghi trạng thái cửa sổ, và xem lại ảnh có ô ngày) **xong** 2026-10-03, audit đạt (`.reviews/audits/ui/audit_ui_session27.md`); UI có 1550 kiểm thử, e2e 69; `.plan/ui_plan.md` giữ plan phiên 27 đã hoàn tất. Project Owner chạy tay D6 (2026-10-03): `reminder_list`, `reminder_settings` `hoàn_tất`. Giao diện không gọi `check_due`. UI-11: mọi lần hết giờ chụp ảnh đều ở cửa sổ đang bị thu nhỏ, do người vận hành thu nhỏ trong lúc dùng máy; Project Owner chọn phương án A (công cụ kiểm thử tự mở lại cửa sổ), bỏ quy ước không thu nhỏ. UI-14 đóng (máy đặt giờ kiểu 12 giờ; V1 chấp nhận). Mở UI-13 (lỗi trùng mốc nhảy dòng), UI-15 (dữ liệu mẫu D6 phải chịu được `reminder_ticker`), ENV-7 (`npm audit`, chỉ công cụ phát triển). Phiên 28 (giao diện, vá ngắn: UI-11 bước 4, UI-13, UI-15) **xong** 2026-10-04, audit đạt (`.reviews/audits/ui/audit_ui_session28.md`); UI có 1555 kiểm thử, e2e 70; `.plan/ui_plan.md` giữ plan phiên 28 đã hoàn tất. UI-11 đóng: công cụ kiểm thử tự mở lại cửa sổ bị thu nhỏ (`UI/tests/tools/window_guard.mjs`), người vận hành dùng máy bình thường khi e2e chạy. UI-13, UI-15 đóng. Mở UI-16 (`main.test.tsx` hỏng ngắt quãng trên Windows khi máy tải), UI-17 (dọn dẹp), UI-18 (cửa sổ e2e mở lại thì giành tiêu điểm của người đang dùng máy). Phiên 29 (giao diện, vá ngắn: UI-18, UI-16, UI-17) **xong** 2026-10-04, audit đạt phần trong `UI/` (`.reviews/audits/ui/audit_ui_session29.md`); `.plan/ui_plan.md` giữ plan phiên 29 đã hoàn tất. UI-16, UI-17 đóng. UI-18 đóng phần mở lại cửa sổ (`showInactive()`); phần giành tiêu điểm lúc khởi động chuyển sang DSK-18 (Desktop, chờ Project Owner chọn). Mở UI-19 (`app_root.test.tsx` hỏng ngắt quãng). Project Owner chọn phương án A cho DSK-18 (2026-10-04). Phiên 30 (desktop: `reminder_ticker` DSK-17 ở `Desktop/src/cross_cutting/reminder_ticker/`, cờ `--ct-test-show-inactive` DSK-18) **xong** 2026-10-05, audit đạt (`.reviews/audits/desktop/audit_desktop_session30.md`); Desktop có 31 kiểm thử, `test:packaged` 8; `.plan/desktop_plan.md` giữ plan phiên 30 đã hoàn tất. DSK-17, DSK-18 đóng; D6 xong hẳn, chặng D hoàn tất. Mở DSK-19 (dọn checkpoint phiên 30; Project Owner đã xác nhận nguồn của `main-PROB-001` là bản cài lỗi), DSK-20 (V2), ENV-8 (Project Owner gỡ hẳn rồi cài lại), DSK-21 (cài bản mới đè bản cũ: chưa có quy định và kiểm thử; đề xuất đưa vào tiêu chí chặng G, chờ duyệt). DSK-21 được duyệt 2026-10-05: năm tiêu chí cài đè vào chặng G. Phiên 31 (giao diện, vá ngắn: phần còn lại của UI-18, tức e2e truyền cờ `--ct-test-show-inactive` trừ chế độ ghi bằng chứng, và UI-19) **xong** 2026-10-05, audit đạt (`.reviews/audits/ui/audit_ui_session31.md`); UI vẫn 1555 kiểm thử, e2e 70; `.plan/ui_plan.md` giữ plan phiên 31 đã hoàn tất. UI-18, UI-19 đóng; UI-20 mở rồi đóng ngay 2026-10-07: các lần kích hoạt muộn trong lần đo của Project Owner là do anh bấm vào cửa sổ, không phải lỗi. Tiếp theo: chặng E (`backup_data`). UI-11: giả thuyết datalist bị bác, nghi cửa sổ Electron ngừng vẽ; có thí nghiệm đề xuất. DSK-15 nâng mức, đề xuất phiên desktop trước D6. Quy ước: agent lấy giờ bằng lệnh khi ghi checkpoint (BE-8). Quy ước viết plan: ký tự vô hình ghi bằng mã (`U+00A0`), không dán ký tự thật (Q23-2). Từ phiên 19 (UI-8 đã đóng), `npm run e2e` không đặt `CT_WALKTHROUGH_RUNNER` không ghi vào `UI/evidence/`.
