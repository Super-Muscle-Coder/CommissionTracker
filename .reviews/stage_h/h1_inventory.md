# Chặng H, bước 1: kiểm kê (phần 1, câu hỏi 1 và 2)

**Ngày:** 2026-10-12. **Người làm:** Orchestrator.
**Trạng thái mã:** commit `9b647f4` (sau phiên 41).
**Căn cứ:** `.plan/v1_roadmap.md`, mục "Chặng H"; `.design/v1_scope.md`; `.plan/open_issues.md`; hợp đồng (Data Schema `10.0.1`, API Contract `5.0.0`).

**Quyết định mở đầu (Project Owner, 2026-10-12):** ENV-4 (phần F của runbook) chạy song song với chặng H. Chặng H bước 3 vẫn chạy lại máy sạch trên bản cuối.

Phần này chỉ kiểm kê. Không có dòng mã nào được sửa. Mỗi chỗ thiếu có một mã đề xuất (`H-…`) và một mức: **cao** (V1 chưa được coi là xong nếu chưa xử lý), **trung bình**, **thấp**.

---

## 1. Câu hỏi 1: đúng phạm vi

### 1.1 Mục 2 của `v1_scope.md`: có trong sản phẩm

| Hạng mục | Trong sản phẩm | Bằng chứng hôm nay |
|---|---|---|
| Tám workflow backend nghiệp vụ | có, cả tám ráp nối | `Backend/workflows/`; 573 kiểm thử (audit phiên 41) |
| `backup_data` | có | `đã_hoàn_thiện`; e2e trang `backup` qua `prepare_restore` |
| Desktop Main: khởi động, chờ `READY`, dừng backend | có | Desktop `npm test` ca 1–9 |
| `reminder_ticker`, `native_dialogs` | có | Desktop `npm test`; `test:packaged` P7–P10; toast thật ở runbook E1 |
| Giao diện cho các tính năng | có, 15 trang | bảng trang của `.design/ui_decomposition.md` |
| Đóng gói Windows | có | bộ cài `1.0.0`; `test:packaged` 12 |
| `restore_data` | có (hướng B) | `đã_hoàn_thiện`; P11, A2–A5 |

**H-1 (thấp, Orchestrator):** bảng mục 2 của `v1_scope.md` vẫn ghi "Chưa làm" cho sáu dòng. Chỉ cột trạng thái lỗi thời, ranh giới không đổi. Việc: cập nhật cột trạng thái. Không cần Project Owner duyệt nội dung vì phạm vi không đổi.

### 1.2 Mục 3: không có gì lọt vào

- Không có thư mục `apply_watermark`, `verify_watermark` trong `Backend/workflows/`. Chưa có layer dịch vụ AI. `Desktop/src` chỉ nhắc watermark trong chú thích, và Main không khởi động dịch vụ AI.
- Không có đồng bộ online, nhiều người dùng hay kiểm tra ảnh qua Internet.
- **Không có màn hình hồ sơ quyền sở hữu:** đúng về nội dung. Grep `UI/src` và `UI/tests` không thấy lời gọi nào tới `/watermark-profiles`, `/watermark-strengths`. Thanh điều hướng có bảy mục, không có mục nào như vậy.

**H-2 (cao, giao diện): ràng buộc này chưa được kiểm bằng máy.** Lộ trình đòi "kiểm bằng máy, không bằng mắt". Hiện nó chỉ được kiểm bằng grep do agent tự chạy rồi ghi vào EVIDENCE của `navigation.ts`, tức là một lần chạy tay. `npm run check` không có bước nào chặn. Việc: thêm vào `npm run check` một bước làm hỏng lệnh khi mã nguồn hay kiểm thử của `UI/` chứa đường dẫn `/watermark-profiles`, `/watermark-strengths`, `/artworks`, `/verifications`. Kèm phép cắn: thêm một chuỗi như vậy thì `check` hỏng. Lý do mức cao: đây là ràng buộc cứng duy nhất của V1 mà lộ trình nêu đích danh là phải kiểm bằng máy.

### 1.3 Trạng thái trong hợp đồng và trạng thái trang

- `clause_b_backend`: chín workflow V1 (`scaffold_backend` cùng tám workflow nghiệp vụ và `backup_data`) đều `đã_hoàn_thiện`. `apply_watermark`, `verify_watermark` ở `đang_chờ_triển_khai`. Đạt.
- `clause_c_ai_service`: cả ba workflow ở `đang_chờ_triển_khai`. Đạt.
- `clause_d_desktop.restore_data`: `đã_hoàn_thiện`. Đạt.
- Cả 15 trang trong `.design/ui_decomposition.md` đều `hoàn_tất`, mỗi trang có ngày, phiên audit và lần Project Owner chạy tay. Đạt.

---

## 2. Câu hỏi 2: không nhảy cóc

### 2.1 Tiêu chí "xong khi" của từng chặng

"Bằng chứng hôm nay" là ca kiểm thử hay bản ghi chạy tay còn trong kho. Mọi bộ kiểm thử sẽ chạy lại nhiều lượt ở câu hỏi 3 và bước 3. Bảng này chỉ trả lời: tiêu chí đó **có** bằng chứng tái lập được hay không.

| Chặng | Tiêu chí | Bằng chứng | Kết quả |
|---|---|---|---|
| A | Giao thức cho phần ngoài WCA | iWCA v1.0, `CLAUDE.md` mục 5 | đạt (tài liệu) |
| B0 | CORS cho `ui_origin`, kể cả preflight và nhãn lỗi; origin khác không có header | `Backend/tests/test_cors.py`, ca qua tiến trình thật | đạt |
| B1 | 1. đóng thì backend thoát mã 0, không sót · 2. backend không khởi động được thì báo rõ · 3. cổng bị chiếm · 4. trang thử đọc `GET /clients` · 5. origin khớp | Desktop `desktop_main.spec.ts` ca 1–9; P2 trên bản đóng gói | đạt |
| B2a | 1. `check` đạt sau `npm ci` · 2. R1–R14 có bằng chứng cắn · 3. Desktop mở `UI/dist` · 4. bridge sai thì màn hình lỗi | `npm run check`; EVIDENCE của `UI/src/main.tsx`; kiểm thử dựng Main | 1, 3, 4 đạt. **2: phép cắn chỉ được ghi ở phiên 11–12, chưa chạy lại.** Chuyển sang câu hỏi 4 (H-6) |
| B2b | danh sách đúng, sắp chữ tiếng Việt; rỗng; ba loại bằng chứng I6; Project Owner chạy tay | e2e và kiểm thử của `client_list`; bản ghi chạy tay 2026-09-28 | đạt |
| C | 1. chạy trên máy chưa cài Python | ENV-4 | **chưa: đang chạy song song** |
| C | 2. tìm thấy mọi `configs.yaml` · 3. dữ liệu ở `%APPDATA%` | `test:packaged` P1, P6 | đạt |
| C | 4. đường chạy từ mã nguồn không hỏng | ba bộ kiểm thử | đạt (chạy lại ở câu 3) |
| C | 5. dung lượng dưới 400 MB | đo một lần ở phiên 13 (371 MB, bản `0.1.0` cũ) | **H-3 (thấp):** chưa đo lại trên bản `1.0.0`; không kiểm thử nào đo. Đo ở bước 3 trên bản cuối |
| D | mọi trang `hoàn_tất`; không màn hình hồ sơ; xử lý mọi nhãn kết quả kể cả `500` | bảng trang; H-2; ma trận nhãn | trang đạt; ràng buộc: H-2; nhãn: câu hỏi 3 |
| E | tạo sao lưu từ giao diện, tệp qua `prepare_restore` | e2e `backup` (phiên 34) | đạt |
| F | khứ hồi; tệp hỏng hay mới hơn bị từ chối; áp dụng hỏng thì hoàn tác; trang `hoàn_tất`; DSK-26 đóng | Desktop A2–A5, R-cases; P11; bản ghi chạy tay 2026-10-09 | đạt |
| G | DSK-21 tiêu chí 1, 2, 3, 5 | phiên 40 (V1, P12); runbook mục "Kết quả" | đạt |
| G | DSK-21 tiêu chí 4 | BE-11 (hướng A), phiên 41 | đạt cho bản 1.0 |
| G | `test:packaged` (DSK-16) | 12 đạt ở phiên 40 | đạt (chạy lại ở bước 3) |
| G | máy sạch | ENV-4 | **chưa: đang chạy song song** |

### 2.2 Sổ tồn đọng: mọi mục chưa đóng

Lộ trình đòi: mỗi mục hoặc đóng có ngày và phiên, hoặc ghi rõ là V2 trở đi kèm lý do, được Project Owner chấp nhận. Dưới đây là toàn bộ mục chưa đóng, kèm đề xuất. **Tôi chưa sửa sổ tồn đọng:** chờ anh duyệt cả bảng, rồi ghi một lượt.

| Mã | Nội dung ngắn | Đề xuất | Lý do |
|---|---|---|---|
| ENV-4 | máy sạch | **chặng H, đang chạy** | quyết định 2026-10-12 |
| DSK-3 | chờ 25–80 s ở lần mở đầu sau mỗi lần cài | **đóng: chấp nhận ở V1** | Project Owner quyết 2026-10-11 không ký số (`v1_scope.md` §3.4) |
| DSK-9 | các mục đã chấp nhận: đua SIGINT lúc khởi động (Q4), điều hướng thay thế sau `ERR_ABORTED` (Q-C2) | **V2** | chưa từng xảy ra khi dùng thật; ký số và biểu tượng đã có quyết định riêng |
| DSK-8 | lỗi sandbox mạng của Chromium với thư mục tạm | **đóng nếu ENV-4 không thấy**; nếu thấy thì mở lại | chỉ quan sát, ứng dụng vẫn chạy; phiên 14 đo 0 lần |
| BE-4 | `data.db.lock` khi sao lưu, khôi phục | **đóng** | sao lưu dùng backup API của SQLite nên chỉ chép `data.db`; khôi phục chỉ di chuyển `data.db` (phiên 32, 36) |
| DSK-11 | desktop chưa diễn giải mã thoát 3 | **V2** | muốn làm phải đưa cơ chế vào hợp đồng trước (rà soát 2026-09-28) |
| BE-8 | giờ sai trong checkpoint `record_payment` | **chặng H, phiên vá backend** | còn sót đúng một dòng: `record_payment/services.py:301`, `recorded_at: 2026-09-30T23:40:00+07:00` |
| DSK-16 | `test:packaged` phải chạy khi đổi chữ trang mở đầu | **đóng: thành quy ước** | quy ước đã có trong plan; tiêu chí chặng G đã có `test:packaged` |
| DSK-20 | bấm toast trong Action Center | **V2** | đặc tả V1 không đòi |
| DSK-24 | bản sao lưu an toàn tích lũy | **V2** | đúng đặc tả V1; trang Khôi phục đã nói rõ |
| DSK-30 | mục 3 (in log của Main khi ca `spawnMain` hỏng), mục 6 (backend giả theo dõi mọi kết nối), mục 7 (ca 6 khẳng định thêm dòng stderr) | **chặng H, phiên vá desktop** | thuộc câu hỏi 3, phần ổn định |
| ENV-10 | `npm ci` làm mất tệp chạy Electron | **cần anh:** chạy `echo $env:ELECTRON_SKIP_BINARY_DOWNLOAD` trong PowerShell, gửi tôi kết quả | quyết cách ghi vào `CLAUDE.md` |
| UI-22 | ba NOTES quá hạn ở `UI/src/main.tsx` | **chặng H, phiên vá giao diện** | máy quét xác nhận: ba NOTES ngày 2026-09-27 đã quá 14 ngày; là chỗ quá hạn duy nhất trong 28 khối checkpoint |
| UI-21 | `.gitignore` của `UI/` và `main-EXP-033` | **chặng H, phiên vá giao diện** | việc nhỏ, cùng phiên với UI-22 |
| UI-5 | luật trống chỉ có ở giao diện | **đóng** | còn ghi "BE-5 còn mở", nhưng BE-5 đã đóng ở phiên 18 |
| ENV-7 | `npm audit` báo lỗ hổng | **đóng phần npm** | chạy lại hôm nay: `npm audit --omit=dev` = 0 ở cả `UI/` và `Desktop/`; còn lại chỉ ở công cụ phát triển (UI 6 high, Desktop 8 moderate và 1 high), không vào bản đóng gói |
| ENV-8 | máy Project Owner có bản cài cũ lẫn lộn | **đóng** | runbook 2026-10-11 cài lại từ đầu: sau B1 chỉ còn một bản; toast đo lại ở E1 |

### 2.3 Phát hiện mới khi kiểm kê

**H-4 (trung bình, backend): Starlette 1.0.0 trong bản đóng gói có năm lỗ hổng đã công bố.** `pip-audit -r Backend/requirements.txt` chạy hôm nay báo: CVE-2026-48710 (Host header, sửa ở 1.0.1), CVE-2026-48818 (`StaticFiles` trên Windows, 1.1.0), CVE-2026-48817 (`HTTPEndpoint`, 1.1.0), CVE-2026-54283 (giới hạn form urlencoded, 1.3.1), CVE-2026-54282 (`request.url`, 1.3.0). Khác với ENV-7, đây là phụ thuộc lúc chạy, nằm trong gói.

Rủi ro thực tế mà tôi thấy là **rất thấp**. Backend chỉ nghe trên `127.0.0.1`. Grep `Backend/` không thấy chỗ nào dùng `StaticFiles`, `HTTPEndpoint`, `request.form` hay `request.url`. Mọi đầu vào là JSON qua route của FastAPI. Vẫn đề xuất nâng lên bản đã vá, vì gói được phát cho người khác và không ai muốn phải giải thích một CVE đã biết. **Điều tôi không nắm chắc:** FastAPI `0.136.1` có chấp nhận Starlette `1.3.x` không. Phiên vá sẽ kiểm bằng cách cài thử và chạy 573 kiểm thử. Đổi phiên bản phụ thuộc cần anh duyệt (`CLAUDE.md` mục 5). Có ba hướng: nâng ngay trong chặng H; để V2; hoặc giữ nguyên và ghi lý do.

**H-5 (thấp, Orchestrator): tài liệu nền lỗi thời.** `CLAUDE.md` mục 6 còn vài gạch đầu dòng cũ: "460 kiểm thử", "Backend còn `backup_data`", "Ba chỗ của nền tảng chưa được chứng minh". Mục "Việc dọn dẹp cần làm kèm" của lộ trình cũng đã cũ. Tôi dọn sau khi chốt bước 1.

### 2.4 Rà nhanh checkpoint (một phần của câu hỏi 4)

Máy quét đọc 28 khối checkpoint: Backend 10, Desktop 5, UI 13.
- Không khối nào còn `UNSOLVED_PROBLEMS`.
- NOTES quá hạn: chỉ ba NOTES ở `UI/src/main.tsx` (UI-22).
- Việc kiểm đúng khuôn Giao thức 07 và EVIDENCE còn chạy lại được nằm ở câu hỏi 4.

---

## 3. Câu hỏi 3 và 4: cách làm đề xuất (chờ Project Owner chốt)

**Câu hỏi 3: kiểm thử đủ mọi trường hợp.**
- **Ma trận lối vào × nhãn:** Orchestrator tự dựng từ `api_contract.yaml`. Với mỗi lối vào V1 dùng, đối chiếu mỗi nhãn kết quả, cộng "không tới được" và "vi phạm hợp đồng" ở phía bên gọi, với ca kiểm thử chỉ đích danh trong ba layer. Ô trống thành việc cho phiên vá. Đây là việc tiếp theo của tôi, không cần anh.
- **Tình huống bất thường:** tôi đối chiếu tám tình huống trong lộ trình với các ca đã có. Theo những gì tôi đã thấy qua các audit: "backend chết giữa chừng", "mở hai bản", "antivirus bật" đã có ca. "Thư mục dữ liệu không ghi được", "đóng giữa lúc đang ghi", "ổ đầy", "tắt máy giữa lúc khôi phục" cần xem lại; hai mục cuối lộ trình đã ghi "nếu dựng được".
- **Ổn định (cần anh chốt):** tôi đề xuất **3 lượt liên tiếp** cho mỗi bộ (Backend pytest, Desktop `npm test` và `test:packaged`, UI `npm run check` và `npm run e2e`) trên máy anh, trong lúc anh dùng máy bình thường. Lượt hỏng vẫn tính và phải báo, như các phiên gần đây.
- **Luồng của họa sĩ từ đầu tới cuối:** một runbook anh chạy tay trên bản đóng gói cuối, ở cuối chặng.

**Câu hỏi 4: mã theo đúng hai skill.** Lộ trình đề nghị một **phiên kiểm độc lập**, chưa từng thấy mã được viết ra sao. Đề xuất của tôi:
- ba phiên Claude Code mới, mỗi layer một phiên (`Backend/` và `Desktop/` theo WCA, `UI/` theo iWCA), vì một phiên khó đọc hết cả ba layer trong một context;
- phiên chỉ đọc, không sửa tệp nào, chạy được kiểm thử và phép cắn trên bản sao; báo cáo trả trong chat, anh mang về, tôi lưu và đối chiếu;
- plan của mỗi phiên do tôi soạn: danh mục kiểm theo `06-self-check.md` và ma trận R1–R14, nhưng **không** kèm audit cũ, để phiên không bị dẫn dắt.

**H-6 (trung bình, câu hỏi 4):** chạy lại phép cắn R1–R14 của `UI/`. Bằng chứng cắn chỉ được ghi ở phiên 11–12 và chưa chạy lại kể từ đó. Giao cho phiên kiểm độc lập của `UI/`.

---

## 4. Những gì cần anh

1. Duyệt bảng 2.2: đóng, V2, hay vào chặng H, từng mục.
2. H-4 Starlette: nâng ngay trong chặng H, để V2, hay giữ nguyên.
3. Câu hỏi 3: số lượt ổn định (đề xuất 3).
4. Câu hỏi 4: ba phiên kiểm độc lập chỉ đọc, như mục 3.
5. ENV-10: kết quả `echo $env:ELECTRON_SKIP_BINARY_DOWNLOAD`.
