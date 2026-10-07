# LỘ TRÌNH V1 — COMMISSION TRACKER

*Orchestrator + Project Owner, 2026-09-26. Tài liệu bền: **không** ghi đè mỗi phiên, khác với `.plan/<layer>_plan.md`. Ranh giới phạm vi ở `.design/v1_scope.md`. Hiện trạng chi tiết ở báo cáo mới nhất trong `.reviews/session_reports/`.*

## Nguyên tắc xếp thứ tự

Backend đã vững: tám workflow, 361 kiểm thử, tám bản audit độc lập. Chỗ yếu của nền tảng **không nằm trong code nghiệp vụ** mà nằm ở ba thứ chưa bao giờ được chứng minh: đường đi xuyên suốt, luật khởi động giữa hai Main, và việc đóng gói.

Vì vậy lộ trình này **không** đi theo hướng làm nốt backend rồi mới sang layer khác. Nó chứng minh nền tảng trước, bằng một lát cắt dọc mỏng nhất có thể, rồi mới xây tiếp.

Lý do cụ thể: nếu việc đóng gói buộc phải đổi cách Main tìm tệp cấu hình, thay đổi đó chạm vào **cả tám workflow**, vì tất cả đều nhận Configs từ Main. Phát hiện chuyện đó khi có tám workflow rẻ hơn nhiều so với khi có mười workflow cộng toàn bộ giao diện.

## Tổng quan các chặng

| Chặng | Nội dung | Layer | Phụ thuộc |
|---|---|---|---|
| A | Bàn cách làm việc cho phần ngoài WCA — **xong phần kiến trúc 2026-09-26** | — | Không |
| B | Lát cắt dọc: B0 backend CORS → B1 desktop Main → B2 layer `UI/` đầu tiên | backend, desktop, giao diện | A |
| C | Đóng gói thử thành tệp thực thi | cả hệ thống | B |
| D | Giao diện cho tám workflow đã xong | giao diện | B, C |
| E | `backup_data` | backend | Không (làm được song song) |
| F | `restore_data` hoặc hoãn sang V2 | backend + desktop | C, E |
| G | Hoàn thiện và đóng gói bản V1 | cả hệ thống | D, E |

Chặng E độc lập, có thể chen vào bất kỳ lúc nào nếu cần một phiên backend ngắn.

---

## Chặng A — Bàn cách làm việc cho phần ngoài WCA

**Đây là việc của Orchestrator và Project Owner, không phải một phiên coding agent.** Phải xong trước khi viết plan cho chặng B.

Giao diện React cố ý nằm ngoài WCA (lý thuyết §7). Hệ quả: `08-operating-protocol.md` không phủ nó. Không có hợp đồng nào ràng buộc nó ngoài việc nó gọi các điểm giao tiếp `http`. Không có năm lớp để đối chiếu. Giai đoạn 6 không áp dụng được. Mà đây lại là phần lớn nhất còn lại của V1.

**Những câu phải trả lời:**

- Plan cho một phiên giao diện trông như thế nào? Tiêu chí hoàn tất là gì, khi không có hợp đồng để đối chiếu?
- Bằng chứng thay cho EVIDENCE là gì? (Ảnh chụp màn hình? Project Owner tự bấm thử theo một danh sách? Kiểm thử tự động ở mức nào?)
- Checkpoint có áp dụng cho giao diện không, hay dùng một dạng ghi chú khác?
- Orchestrator audit một phiên giao diện bằng cách nào? Đọc code React và so với cái gì?
- Layer desktop **có** theo WCA (`clause_d_desktop`), nên nó vẫn dùng bộ máy cũ. Nhưng nó viết bằng JavaScript, không phải Python — bố cục năm lớp và khuôn checkpoint có cần điều chỉnh gì không?

**Đầu ra:** một tài liệu giao thức mới, có lẽ là `08-operating-protocol.md` thêm một phần, hoặc một tệp riêng cho phần ngoài WCA. Kèm quyết định tên thư mục cho hai layer mới, ghi vào bảng ở `CLAUDE.md` mục 4.

**Kết quả (2026-09-26).** Phần kiến trúc đã xong:

- **iWCA** — skill `iwca-implementation` v1.0: giao diện vẫn là bên gọi `external` với hợp đồng tối cao, nhưng bên trong được tổ chức theo ba phân khu (logic, kit, màn hình) cùng một Main; phân khu logic áp nguyên WCA. Trả lời bốn câu hỏi đầu: plan, bằng chứng (lệnh `check` + kịch bản bấm thử), checkpoint (Giao thức 07 cùng phần mở rộng), cách audit.
- **WCA v2.3** — quy tắc trường thừa theo ba vai (`02`), cùng bảng Giá trị mở rộng của Giao thức 07.
- **Layer desktop** theo WCA không cần điều chỉnh gì: `07` đã có tiền tố `//` và `component: cross_cutting`.
- **Hợp đồng 6.0.0** — `shared_values.ui_origin`, luật trao địa chỉ backend cho renderer, luật CORS.
- **Tên thư mục và công nghệ** — `Desktop/`, `UI/`, bộ công nghệ ghi ở `CLAUDE.md` mục 4 và mục 5.

**Phần vận hành cho layer giao diện — xong 2026-09-26, ở mức dự án:** `CLAUDE.md` mục 5, "Vận hành layer giao diện" (plan, bảng I1, trạng thái trang, kịch bản bấm thử, gom checkpoint). Khi đã chạy qua vài phiên giao diện mà không phải sửa, đưa phần này vào `08-operating-protocol.md` của skill.

---

## Chặng B — Lát cắt dọc

**Mục tiêu duy nhất: chứng minh đường đi từ đầu tới cuối có thật.** Không tính năng nào ngoài một danh sách chỉ đọc.

Chặng này chạm ba layer. `08-operating-protocol.md` quy định mỗi phiên theo layer chỉ làm trong một layer, nên chặng được chia thành các phiên dưới đây, theo đúng thứ tự.

### B-HĐ — Sửa hợp đồng (xong 2026-09-26)

Data Schema 6.0.0: `shared_values.ui_origin`, luật desktop Main chỉ nạp renderer từ `ui_origin` và trao cho nó đúng một giá trị khởi động (địa chỉ backend) qua preload, luật backend trả CORS cho `ui_origin` và không cho origin nào khác.

### B0 — Backend trả lời được renderer (phiên backend #9) — xong 2026-09-26

- **Phạm vi:** Main backend thêm CORS theo luật mới, chỉ cho `ui_origin` đọc từ cấu hình cấp layer. Không workflow nào bị động tới.
- **Tiêu chí hoàn tất:** yêu cầu từ `ui_origin` nhận header CORS, kể cả preflight và kể cả khi kết quả là một nhãn lỗi đã khai báo; yêu cầu từ origin khác không nhận `Access-Control-Allow-Origin` (Data Schema 6.0.1); mọi kiểm thử cũ vẫn đạt; có ít nhất một kiểm thử qua tiến trình backend thật.
- **Kết quả:** 375/375 kiểm thử đạt, Orchestrator chạy lại độc lập (`.reviews/audits/backend/audit_backend_session9.md`). Còn nợ cho **phiên backend kế tiếp**, việc nhỏ: viết lại `claim` của mục EVIDENCE CORS trong checkpoint Main backend cho đúng phạm vi đã chứng minh (6.0.1), và xóa NOTE stdin-pipe cùng NOTE cho B1 sau khi B1 đáp ứng.

### B1 — Desktop Main đầu tiên (phiên số 10, phiên desktop đầu tiên) — xong 2026-09-26

- **Phạm vi:** chuyển `Desktop/` từ mẫu React thành đúng bố cục ở `CLAUDE.md` mục 4. Main khởi động backend như tiến trình con, truyền đủ bốn biến `CT_*`, chờ đúng một dòng `READY` trên stdout, đăng ký giao thức `app://`, trao địa chỉ backend cho renderer qua preload, và khi đóng ứng dụng thì đóng stdin để backend dừng sạch với mã 0. Không làm `reminder_ticker`, không `native_dialogs`, không màn hình nào.
- **Cách kiểm khi chưa có giao diện:** cửa sổ nạp một trang thử nằm trong `Desktop/tests/`, chỉ hiển thị địa chỉ backend nó nhận được và kết quả một lời gọi `GET /clients`.
- **Bắt buộc đọc trước: NOTE trong checkpoint của Main backend** (`Backend/Backend.py`). Nó ghi đúng cái bẫy của phiên này: phải khởi động backend với stdin là **pipe** và giữ pipe mở suốt vòng đời. Nếu stdin là DEVNULL hoặc bị bỏ qua, backend gặp EOF ngay và tự dừng sau khi khởi động. Stdout chỉ chứa `READY`; mọi log đi ra stderr.
- **Bắt buộc đo:** header `Origin` mà backend thật sự nhận được từ trang nạp qua `app://`. Nếu khác `shared_values.ui_origin`, dừng và báo — sửa ở hợp đồng.
- **Tiêu chí hoàn tất:**
  1. Đóng cửa sổ → tiến trình backend thoát với mã 0, không còn tiến trình Python nào sót lại.
  2. Backend không khởi động được (ví dụ thiếu một biến `CT_*`) → ứng dụng báo lỗi rõ ràng cho người dùng, không treo, không im lặng.
  3. Cổng đã bị chiếm → desktop Main chọn được cổng khác, hoặc báo lỗi rõ ràng.
  4. Trang thử nhận đúng địa chỉ backend và đọc được `GET /clients` qua CORS.
  5. Origin đo được khớp hợp đồng.

### B2 — Layer `UI/` đầu tiên — chia hai phiên

Đầu vào đã có (2026-09-26): phần vận hành giao diện nằm ở `CLAUDE.md` mục 5 ("Vận hành layer giao diện"), và đầu ra I1 ở `.design/ui_decomposition.md`. Phần vận hành được ghi ở mức dự án chứ không phải trong skill `08`: để chạy thử trên dự án này trước, rồi mới đưa vào skill khi đã qua thực tế.

B2 được tách từ đầu thay vì chờ context đầy, vì riêng I2 (dựng khung đủ R1–R14, có bằng chứng từng luật cắn) đã là một khối việc trọn vẹn.

**B2a — Dựng khung layer (phiên số 11, phiên giao diện đầu tiên): iWCA I2 — xong 2026-09-27** (`.reviews/audits/ui/audit_ui_session11.md`). Ba chỗ hở của máy kiểm (R12, R13, R14) được vá ở đầu phiên 12.
- **Phạm vi:**
  - dọn mẫu;
  - chốt bố cục và công nghệ;
  - hiện thực hóa R1–R14 bằng máy, kèm bằng chứng từng luật cắn;
  - một lệnh `npm run check`;
  - workflow nền tảng `scaffold_ui` và `results`/`resources`;
  - Main, cùng khung tối thiểu của `kit` và `screens`;
  - ba khối checkpoint.

  Không có workflow giao diện nghiệp vụ nào; không có trang nào.
- **Tiêu chí hoàn tất:**
  1. `npm run check` đạt trên máy sạch (sau `npm ci`).
  2. Mỗi luật R1–R14 có bằng chứng cắn trong EVIDENCE của `main`.
  3. `npm start` của Desktop mở được `UI/dist`, và hiện khung chính rỗng.
  4. Main gặp bridge thiếu hoặc sai dạng thì hiện màn hình lỗi khởi động (kiểm thử dựng Main).

**B2b — Trang đầu tiên `client_list` (phiên số 12): iWCA I3 → I6 — xong 2026-09-27** (`.reviews/audits/ui/audit_ui_session12.md`); Project Owner đã tự chạy kịch bản bấm thử, trang `client_list` ở `hoàn_tất`. **Chặng B hoàn tất.**
- **Phạm vi:** workflow giao diện `manage_client` (chỉ `list_clients`), component kit cần thiết, trang `client_list`, kịch bản bấm thử.
- **Trước phiên (đã chốt 2026-09-27):** bước `unreachable` dùng fixture `switchable_backend.py` bọc `Backend.py` thật, tắt/bật được trên đúng cổng cũ (`CLAUDE.md` mục 5). Phiên bắt đầu bằng việc vá P1–P3 của máy kiểm (audit phiên 11).
- **Tiêu chí hoàn tất:**
  1. Bấm chạy ứng dụng → cửa sổ mở ra, danh sách khách hàng hiện đúng dữ liệu trong cơ sở dữ liệu, sắp đúng chữ cái tiếng Việt.
  2. Danh sách rỗng hiện đúng trạng thái rỗng, không phải lỗi.
  3. Đủ ba loại bằng chứng của iWCA I6.
  4. Project Owner tự chạy kịch bản bấm thử và xác nhận.

**Rủi ro chung của chặng:** đây là lần đầu hai Main nói chuyện với nhau mà không có Docker làm hộ phần mạng và vòng đời tiến trình. Backend đã có EVIDENCE cho phần của nó từ phiên #1, nhưng chưa ai kiểm cả hai đầu. Nếu phát hiện luật khởi động trong hợp đồng có chỗ chưa đủ, đó là **phát hiện tốt** — xử lý theo `08-operating-protocol.md`, Phần 4, không tự sửa hợp đồng.

---

## Chặng C — Đóng gói thử — phiên 13 xong 2026-09-27, chờ chạy trên máy khác

**Làm ngay sau chặng B, trước khi xây thêm giao diện.**

**Vấn đề cụ thể đã xác định.** `Backend/Backend.py` hiện có:

```python
LAYER_ROOT = Path(__file__).resolve().parent
```

Cả tám tệp `workflows/*/configs.yaml` cùng `configs/backend.yaml` được tìm qua đường dẫn đó. Trong bản đóng gói, `__file__` trỏ vào một chỗ khác, và các tệp dữ liệu phải được nhồi vào gói một cách tường minh. Thêm nữa, `requirements.txt` đang ghi môi trường đích là `Backend/env` — thư mục không tồn tại trong bản đóng gói.

**Tiêu chí hoàn tất:**

1. Ra được một tệp thực thi, chạy được trên một máy Windows **chưa cài Python**.
2. Mọi tệp `configs.yaml` được tìm thấy đúng trong bản đóng gói.
3. Cơ sở dữ liệu được tạo và đọc ghi đúng ở một vị trí hợp lý cho người dùng cuối (không phải trong thư mục cài đặt).
4. Toàn bộ kiểm thử vẫn đạt khi chạy từ mã nguồn (hôm nay: backend 375; `check` và `e2e` của `UI/`; `test` của `Desktop/`). Thay đổi cho việc đóng gói không được làm hỏng đường chạy cũ.
5. Ghi lại dung lượng gói. Ngân sách Project Owner đặt ra: 300–400 MB là trần, nhẹ hơn thì tốt hơn. V1 không có mô hình học sâu nên phần Python phải nhẹ. *Ghi chú của Orchestrator (2026-09-27):* bản thân Electron đã chiếm phần lớn dung lượng sau khi cài. Tôi không nhớ chắc con số của Electron 44, nên trần 400 MB áp cho thư mục đã cài, và phiên sẽ đo từng phần.

**Phiên 13 — xong 2026-09-27** (`.reviews/audits/desktop/audit_desktop_session13.md`). `npm run dist` sinh bộ cài NSIS 116 MB; thư mục đã cài 371 MB, dưới trần 400 MB; P1–P6 đạt trên bản đóng gói; đường chạy từ mã nguồn không hỏng. Biến thể Python đã chốt: gói nhúng python.org 3.13.12, có sẵn VC++ Runtime. **Chặng C chờ:** phiên 14 (desktop, phiên vá: DSK-1 tới DSK-6 trong `.plan/open_issues.md`), rồi chạy tay trên một máy Windows khác (tiêu chí 1). Project Owner đã chạy lại trên máy mình ngày 2026-09-27: `dist` đạt; `test:packaged` 5/6, P4 hỏng do lỗi của kiểm thử (DSK-1); còn một FATAL chưa giải thích (DSK-2) và độ trễ 33–36 s ở lần mở đầu (DSK-3).

**Phiên 14 (vá và chẩn đoán) — xong 2026-09-27** (`.reviews/audits/desktop/audit_desktop_session14.md`). Đã đóng DSK-1, 4, 5, 6, 7; đóng phần chẩn đoán DSK-3 (antivirus giữ exe lạ; hướng xử lý là ký số ở chặng G). DSK-2 thành việc liên layer: CT-1 (sửa hợp đồng, chờ duyệt) + BE-3 (khóa độc quyền `data.db`). **ENV-5 xong 2026-09-28:** lần mở đầu của exe mới bị giữ 75 s, không thấy bản sao, bản thật chạy đúng với khóa; DSK-2 đóng (`.reviews/runbooks/env4_env5_runbook.md`). **Chặng C chỉ còn chờ ENV-4 (máy khác).**

**Phiên 26 (desktop, dọn dẹp và vá nhỏ) — xong 2026-10-02** (`.reviews/audits/desktop/audit_desktop_session26.md`): đóng DSK-12, DSK-13, DSK-15 (ngôn ngữ ứng dụng `vi`, ô ngày hiện ngày/tháng/năm, có ảnh trên bản đóng gói) và phần mã của DSK-14; mở DSK-16 (`test:packaged` phải có trong tiêu chí chặng G).

**Data Schema 6.2.0 (2026-09-27):** thêm luật một backend cho một tệp dữ liệu (CT-1). **Phiên 15 (backend) — xong 2026-09-28** (`.reviews/audits/backend/audit_backend_session15.md`): BE-3 (luật mới), BE-1 và BE-2 đều đã đóng. Backend có 381 kiểm thử. **Phiên 16 (D1) — xong 2026-09-28**; audit (`.reviews/audits/ui/audit_ui_session16.md`) thấy e2e không tất định (UI-4) và luật trống chỉ có ở giao diện (UI-5 → CT-2). **Data Schema 7.0.0 (2026-09-28):** CT-2 đã duyệt và ghi. **Phiên 17 (vá D1) — xong 2026-09-28**, audit đạt (`.reviews/audits/ui/audit_ui_session17.md`; e2e 6/6 trên Linux). Project Owner chạy tay ba kịch bản xong ngày 2026-09-28: **ba trang D1 `hoàn_tất`, D1 xong về phía giao diện.** **Data Schema 8.0.0 (2026-09-28):** CT-3. **Phiên 18 (backend, BE-5 và BE-6) — xong 2026-09-28**, audit đạt (`.reviews/audits/backend/audit_backend_session18.md`; 445/445 chạy lại hai lần). Backend có 445 kiểm thử. **Data Schema 8.0.1 (2026-09-28):** `manage_client`, `manage_commission`, `manage_watermark_profile` về `đã_hoàn_thiện`. **I1 của D2 đã làm lại** (`ui_decomposition.md`, mục "Chặng D2 — Đơn hàng"): tiêu đề not blank (CT-3), văn bản tùy chọn để trống gửi `null`, luật đọc và hiện số tiền. **Phiên 19 (D2, kèm UI-8) — xong 2026-09-29**; audit (`.reviews/audits/ui/audit_ui_session19.md`) xác nhận đúng chức năng và đóng UI-8, nhưng e2e không tất định trên máy thứ hai (UI-9). Ba trang D2 giữ `đang_làm` cho tới khi vá UI-9; Project Owner đã chạy tay ba kịch bản D2 ngày 2026-09-29, không bất thường. **Phiên 20 (D3, kèm UI-9) — xong 2026-09-29**; audit (`.reviews/audits/ui/audit_ui_session20.md`) xác nhận D3 đúng đặc tả và đóng UI-9, nhưng tìm ra một lỗi không tất định khác của spec (UI-10). Năm trang D2 và D3 giữ `đang_làm` cho tới khi vá UI-10. **Phiên 21 (vá UI-10) — xong 2026-09-29**, audit đạt (`.reviews/audits/ui/audit_ui_session21.md`). Project Owner chạy tay các bước D3 ngày 2026-09-29, không có vấn đề: **năm trang D2 và D3 `hoàn_tất`; chặng D2 và D3 xong về phía giao diện.** Mở UI-11 (chụp ảnh hết giờ trên Windows, chưa rõ nguyên nhân, không chặn). **Việc tiếp theo: phiên 22 (D4, thanh toán; kèm thu dữ liệu UI-11)**, plan phát hành 2026-09-29. **Data Schema 9.0.0 (2026-09-30):** CT-4, `payment_input.method` not blank; `record_payment` tạm `đang_triển_khai`, phía backend là BE-7 (phiên backend ngắn sau phiên 22).

**Plan phiên 13 (2026-09-27):** đã hoàn tất; đã được thay bằng plan phiên 14. Tóm tắt các quyết định:
- chỉ đo gói nhúng của python.org, bản 3.13.12; chỉ xét biến thể khác nếu gói này không đạt;
- bố cục trong gói: `resources/{python,backend,ui}`; Main chọn đường dẫn theo `app.isPackaged`;
- bản đóng gói bỏ qua năm cờ kiểm thử trỏ ra ngoài gói, và giữ hai cờ `data_dir` và `no_dialog`;
- bộ cài NSIS `oneClick`, cài theo người dùng, không tự mở ứng dụng sau khi cài, gỡ cài đặt không xóa dữ liệu; `appId` là `com.commissiontracker.desktop`;
- tiêu chí 1 (máy chưa cài Python) do Project Owner chạy tay sau phiên.

**Hướng đã chọn (2026-09-26):** electron-builder, bộ cài NSIS; Python trong gói là một bản Python nhúng chạy `Backend.py` từ mã nguồn, nên `LAYER_ROOT` vẫn đúng mà không phải sửa. Biến thể Python nhúng (gói của python.org hay bản dựng độc lập) chốt ở chặng này sau khi đo dung lượng, thời gian khởi động và một lượt quét antivirus. Gói nhúng của python.org không kèm Microsoft C Runtime — bộ cài phải lo phần đó. *(2026-09-27: câu trước chưa được kiểm với bản 3.13; phiên 13 phải liệt kê DLL trong gói, rồi dừng và báo nếu thiếu.)*

**Rủi ro đã nhận diện thêm (2026-09-27):** `Backend.py` import `from workflows…`, tức là nó dựa vào việc thư mục chứa script nằm trong `sys.path`. Với Python nhúng, tệp `._pth` quyết định toàn bộ `sys.path`. Nhiều khả năng thư mục script không được tự thêm vào, nên `._pth` trong gói phải trỏ tới `backend/`. Việc này sửa ở bước đóng gói, không sửa `Backend.py`.

**Nếu vẫn phải đổi cách Main tìm cấu hình:** đó là thay đổi ở Main, không phải ở workflow. Tám workflow nhận Configs từ Main nên chúng không cần sửa. Nhưng phải chạy lại toàn bộ kiểm thử và cập nhật EVIDENCE toàn layer của Main.

---

## Chặng D — Giao diện cho tám workflow đã xong

*Từ 2026-09-28:* hướng giao diện V1 theo `.design/product_versions.md` và `.design/ui_decomposition.md` §7: giao diện tối, gọn gàng, không gọt diện mạo.

Phần lớn nhất của V1. Chia thành nhiều phiên, mỗi phiên một nhóm màn hình, theo iWCA: trước mỗi phiên, Orchestrator làm I1 cho các trang của phiên đó; phiên làm I3 → I6. Thứ tự đề nghị, theo đúng luồng làm việc thật của họa sĩ:

| Phiên | Màn hình | Dựa trên workflow |
|---|---|---|
| D1 | Khách hàng: danh sách, thêm, sửa, lưu trữ — **phiên 16** xong 2026-09-28 (`client_list`, `client_detail`, `client_form`; kèm UI-1..3 và token giao diện tối); **phiên 17** vá sau audit (UI-4, CT-2 phía giao diện, tương phản 3:1, hàng nút và focus của form), xong 2026-09-28. Phần backend của CT-2 (BE-5) xong ở phiên 18 | `manage_client` |
| D2 | Đơn hàng: danh sách, thêm, sửa, xem chi tiết — **phiên 19**, vá ở phiên 20 (UI-9) và 21 (UI-10); **`hoàn_tất` 2026-09-29** | `manage_commission` |
| D3 | Tiến độ: đổi giai đoạn, xem lịch sử, bảng tiến độ — **phiên 20**, vá ở phiên 21 (UI-10); **`hoàn_tất` 2026-09-29** | `update_progress` |
| D4 | Thanh toán: ghi khoản, hủy khoản, xem số dư — **phiên 22** (`payment_list`, `payment_form`, phần Thanh toán của `commission_detail`); **`hoàn_tất` 2026-09-30**. Phần backend của CT-4 (BE-7): **phiên 23** (backend) xong 2026-09-30, audit đạt; Data Schema 9.0.1 duyệt 2026-09-30 | `record_payment` |
| D5 | Báo cáo thu nhập — **phiên 24** xong 2026-10-01, audit đạt về chức năng (`income_report`, mục điều hướng "Thu nhập"); CT-5 duyệt (Data Schema 9.0.2); **`hoàn_tất` 2026-10-01** (Project Owner chạy tay). **Phiên 25** (giao diện, vá ngắn) xong 2026-10-01, audit đạt: CT-5 trong Configs, UI-12 đóng, thí nghiệm UI-11 cho thấy cửa sổ thu nhỏ làm treo | `view_income_report` |
| D6 | Nhắc việc: cài đặt, danh sách chờ, xác nhận — phần giao diện là **phiên 27**, xong 2026-10-03, audit đạt (`reminder_list`, `reminder_settings`, mục điều hướng "Nhắc việc"); **`hoàn_tất` 2026-10-03** (Project Owner chạy tay). **Phiên 28** (giao diện, vá ngắn: UI-11 bước 4, UI-13, UI-15) xong 2026-10-04, audit đạt; UI-11 và UI-15 đóng; `reminder_ticker` (desktop, gọi `check_due` và hiện thông báo Windows) làm ở **phiên 30** (desktop, DSK-17, kèm DSK-18; plan phát hành 2026-10-04, `.plan/desktop_plan.md`), sau phiên 29 (giao diện, vá ngắn: UI-16, UI-17, UI-18; xong 2026-10-04, audit đạt). **Phiên 30** (desktop: `reminder_ticker` DSK-17, cờ `--ct-test-show-inactive` DSK-18) xong 2026-10-05, audit đạt (`.reviews/audits/desktop/audit_desktop_session30.md`); Project Owner xác nhận toast thật. **D6 xong hẳn 2026-10-05; chặng D hoàn tất.** | `send_reminder` |

**Ràng buộc chung cho mọi phiên của chặng này:**

- ⚠ **Không có màn hình hồ sơ quyền sở hữu** (`/watermark-profiles`). Endpoint đó đang chạy thật nhưng thuộc V2. Xem `.design/v1_scope.md`, mục 3.1.
- Theo ưu tiên 2 của V1: chạy đúng trước, đẹp sau. Không animation, không tối ưu render, không tính năng phụ mà hợp đồng không có.
- Giao diện là nơi sắp xếp tên có dấu tiếng Việt. Backend trả về thứ tự theo mã ký tự (`casefold`), nên "Ánh" đứng sau "z"; giao diện tự sắp lại cho đúng thứ tự chữ cái tiếng Việt.
- Mọi thứ giao diện cần từ Python phải là một điểm giao tiếp `http` có trong `api_contract.yaml`. Nếu thiếu, dừng lại và báo — không gọi tắt, không thêm endpoint không khai báo.
- Giao diện phải xử lý được mọi nhãn kết quả mà hợp đồng khai báo cho endpoint nó gọi, kể cả `500`. Không giả định chỉ có đường thành công.

---

## Chặng E — `backup_data`

Một phiên backend ngắn, độc lập, không chặn ai. Chen vào bất cứ lúc nào.

Workflow này thao tác trên cả tệp cơ sở dữ liệu qua `db_connection`, không đọc bảng của workflow nào. Hợp đồng đã có `backup_request_record`, `backup_archive_record` và `restore_staging`. Lưu ý: `restore_staging` là output của `backup_data` nhưng do `restore_data` tiêu thụ — nên phần đó vẫn phải làm đúng dù `restore_data` chưa tồn tại.

**Chia phiên (2026-10-07):**
1. **Phiên 32 (backend):** workflow `backup_data`, cả hai điểm giao tiếp `create_backup` và `prepare_restore`. Plan ở `.plan/backend_plan.md`. **Xong 2026-10-07, audit đạt** (`.reviews/audits/backend/audit_backend_session32.md`); backend 564 kiểm thử; chạy được trên bản đóng gói. Chờ CT-6 (`backup_data` lên `đã_hoàn_thiện`). `prepare_restore` vẫn làm ngay dù chặng F chưa quyết: phương án `restore_data` đầy đủ hay phương án đơn giản ("chuẩn bị rồi mở lại ứng dụng", `.design/v1_scope.md` mục 4) đều cần bước kiểm tệp sao lưu và chuẩn bị tệp đó.
2. **Phiên 33 (desktop):** `native_dialogs.pick_folder`, lối vào `ipc` đầu tiên (thêm `invoke` vào bridge theo API Contract 4.0.0). Plan phát hành 2026-10-07 (`.plan/desktop_plan.md`); chỉ `pick_folder`, `open_file` và `save_file` để dành tới khi có trang dùng. **Xong 2026-10-07, audit đạt** (`.reviews/audits/desktop/audit_desktop_session33.md`); Desktop 40 kiểm thử, `test:packaged` 9; DSK-19 đóng; mở DSK-22 (thấp).
3. **Phiên giao diện:** làm lại I1 cho sao lưu, rồi trang sao lưu gọi `create_backup`.

Chặng E xong khi họa sĩ tạo được tệp sao lưu từ giao diện, và tệp đó qua được `prepare_restore`.

---

## Chặng F — `restore_data`, hoặc hoãn sang V2

**Chưa quyết.** Xem `.design/v1_scope.md`, mục 4. Chỉ quyết sau khi chặng C xong, vì `restore_data` là điều phối vòng đời tiến trình — đúng loại việc mà một nền tảng chưa được chứng minh sẽ làm hỏng.

---

## Chặng G — Hoàn thiện V1

Đóng gói bản chính thức. Chạy thử trên một máy sạch. Kiểm tra lần cuối theo `.design/v1_scope.md`: mọi thứ trong mục 2 đã xong, không có gì ở mục 3 lọt vào.

**Cài bản mới đè lên bản cũ** (DSK-21; Project Owner duyệt 2026-10-05). Người dùng cập nhật bằng cách chạy bộ cài mới, không gỡ bản cũ trước. Tiêu chí:
1. Quy ước số phiên bản: mỗi bản phát hành tăng `version` của `Desktop/package.json` (hiện vẫn `0.1.0` từ đầu).
2. Cài bản N+1 đè bản N khi ứng dụng **đóng**: không cần gỡ; dữ liệu còn nguyên; ứng dụng mở được; lối tắt Start Menu và thông báo Windows còn chạy.
3. Cài đè khi ứng dụng **đang mở**: bộ cài báo hoặc tự đóng ứng dụng; không để lại bản cài nửa vời; không còn `python.exe` của backend sót lại.
4. Dữ liệu do bản N tạo, có bước nâng cấp cấu trúc ở bản N+1: lần mở đầu của N+1 nâng cấp đúng.
5. Cài bản cũ hơn đè bản mới: hoặc bị chặn, hoặc backend dừng với hộp thoại tiếng Việt rõ ràng; không hỏng dữ liệu.

Cách làm: Orchestrator soạn runbook cho Project Owner chạy tay, gộp với ENV-4 (máy sạch); phần nào cần đổi mã (số phiên bản, hành vi khi đang mở) thì vào một phiên desktop trước khi chạy runbook. Tự cập nhật (auto-update) vẫn ngoài V1. `npm run test:packaged` là tiêu chí của chặng này (DSK-16).

---

## Việc dọn dẹp cần làm kèm

**Sổ tồn đọng: `.plan/open_issues.md`** (từ 2026-09-27) gom mọi việc tồn theo layer. Những mục dưới đây được giữ để làm lịch sử.

Ba việc nhỏ, gộp vào phiên nào cũng được:

1. **Ba NOTE còn lại trong checkpoint sẽ hết hạn 2026-10-08** (`CLAUDE.md` mục 5: ngưỡng 14 ngày kể từ `written_at`, cả ba ghi ngày 2026-09-24). Quan trọng nhất là NOTE ở Main backend về stdin phải là pipe — nó là thông điệp dành riêng cho chặng B. Lộ trình này đã chép lại nội dung đó nên kiến thức không mất, nhưng khi chặng B xong thì NOTE ấy nên được chuyển thành một mục EXPERIENCES.
2. **`.plan/backend_plan.md` hiện giữ plan phiên 18 (BE-5, BE-6), đã hoàn tất.** Mỗi phiên backend ghi đè tệp này.
3. **`.reviews/` đã được Project Owner sắp lại (2026-09-26):** `audits/<layer>/`, `prompts/<layer>/`, `session_reports/`. Xong.
