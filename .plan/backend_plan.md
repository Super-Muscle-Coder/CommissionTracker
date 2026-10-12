# ===WCA-PLAN===
# session_for: backend
# drafted_by: Orchestrator + Project Owner
# drafted_at: 2026-10-12T15:30:00+07:00
# contract: data_schema 10.0.1, api_contract 6.0.0 (approved)

## MỤC TIÊU PHIÊN NÀY

Phiên 42 của dự án, phiên backend thứ mười lăm, thuộc **chặng H: rà soát lại toàn bộ V1**. Đây là một **phiên kiểm độc lập** cho layer `Backend/`.

Bạn chưa từng thấy mã này được viết ra sao, và đó là lý do bạn được giao việc. Hãy đọc mã như một người kiểm, không phải người viết: không mặc định là mã đúng, không mặc định là mã sai. Mọi kết luận dựa trên tệp, dòng và lệnh chạy được.

Phiên có **hai pha**:
- **Pha 1 (plan này): chỉ đọc.** Đọc mã, chạy kiểm thử, làm phép cắn trên **bản sao nằm ngoài kho**. Không sửa tệp nào trong kho. Cuối pha 1, gửi báo cáo đầy đủ mọi phát hiện, rồi **dừng và chờ**.
- **Pha 2: vá.** Chỉ bắt đầu khi Project Owner mang tới quyết định của Orchestrator, kèm plan pha 2 (tệp này sẽ được ghi đè). Pha 2 gồm những phát hiện được chọn sửa, cộng vài việc đã biết của layer.

**Điểm dừng pha 1:** báo cáo có đủ các phần ở mục "BÁO CÁO PHA 1"; `git status --short` không đổi so với đầu phiên.

## CÂU HỎI CẦN TRẢ LỜI

Một câu hỏi lớn: **`Backend/` có theo đúng WCA (`wca-implementation` v2.3) và đúng hợp đồng không?** Chia thành bảy phần.

### K1 — Bố cục (`04-implement.md`, Bước 4.0; `CLAUDE.md` mục 4)
- Theo workflow trước, theo lớp sau. Mỗi workflow nghiệp vụ đủ năm lớp: Configs, Entities, Adapters, Services, Routers. Workflow nền tảng chỉ có lớp nó thật sự cần.
- `shared/`, nếu có, thỏa `05-edge-cases.md` Bước 5.3.
- `Backend.pyproj` khớp với thư mục thật (`CLAUDE.md` mục 5).

### K2 — Ranh giới giữa các lớp (lý thuyết §4, câu hỏi tự kiểm của từng thành phần)
Với **từng** workflow, đọc từng lớp và trả lời đúng câu hỏi tự kiểm in nghiêng của lớp đó trong `wca_theory_compressed.md` §4. Cụ thể:
- Entities chỉ mô tả hình dạng: không động từ, không điều kiện, không phép tính.
- Adapters chỉ làm một hành động kỹ thuật, không tự quyết trình tự. Dùng phép thử "công cụ hay quyết định" (§4, Adapters).
- Services là nơi duy nhất quyết định; không tự tạo Adapters; không gõ thẳng lệnh kỹ thuật (SQL, đọc tệp…) mà không qua Adapters.
- Routers chỉ kiểm định dạng (đúng những gì `type` mô tả) và chuyển giao. Mọi kiểm tra cần ý nghĩa nghiệp vụ hay dữ liệu đang lưu thuộc Services.
- Configs: không con số hay chuỗi nào có ý nghĩa bị gõ thẳng vào code.

### K3 — Main (`Backend/Backend.py`)
- Main chỉ đọc cấu hình, khởi tạo và ráp nối, quản lý vòng đời. Không có dòng logic nghiệp vụ nào.
- Thứ tự ráp nối khớp `.design/03_classification.md`.
- Tín hiệu sẵn sàng (`READY`) chỉ phát sau khi mọi workflow đã được ráp.
- Main không đọc tệp hợp đồng lúc chạy.

### K4 — Cô lập giữa các workflow (lý thuyết §4, workflow nghiệp vụ; `06-self-check.md` Bước 6.1)
- Không workflow nào nhập (`import`) mã nội bộ của workflow khác. Lời gọi sang workflow khác đi qua Adapters của bên gọi, tới đúng Routers của bên được gọi.
- Mỗi bảng thuộc đúng một workflow. Không workflow nào đọc hay ghi thẳng bảng của workflow khác, kể cả qua SQL thô. Hãy kiểm bằng cách tìm mọi câu SQL trong `Backend/` và đối chiếu tên bảng với workflow sở hữu.
- Dữ liệu nhận từ workflow khác được mô tả bằng Entities của chính bên nhận.
- `input_expected` của từng workflow: dữ liệu thật sự đọc vào đến từ đúng nguồn `from` đã khai.

### K5 — Đối chiếu hợp đồng, cả hai chiều (`06-self-check.md` Bước 6.1)
Với từng workflow trong `clause_b_backend`, trừ `apply_watermark` và `verify_watermark` (chưa triển khai, V4 trở đi):
- Mỗi điểm giao tiếp trong `api_contract.yaml` có **đúng một** lối vào trong Routers, khớp `form`, `address`, `input` và **từng** nhãn trong `output`. Ngược lại, không có lối vào nào mà hợp đồng không khai (tài liệu tự sinh của FastAPI phải tắt, `CLAUDE.md` mục 5).
- `output_guaranteed` là tập con của Entities; dữ liệu đi ra ranh giới mang đúng các trường của `type`, không lọt trường nội bộ.
- Quy tắc trường thừa theo ba vai (`02-contract.md` Bước 2.3): input có trường thừa bị từ chối; dữ liệu nhận từ workflow khác bỏ qua trường thừa.
- Mọi giá trị ranh giới trong Configs (kể cả `shared_values`, `mandatory_rules`) truy được về đúng dòng trong hợp đồng.
- `status` trong hợp đồng: mọi workflow `đã_hoàn_thiện` có bằng chứng tương ứng (K7).

### K6 — Ma trận lối vào × nhãn, tự dựng
Tự dựng, không dựa vào tài liệu nào khác: với mỗi lối vào `http` và `in_process` của backend mà V1 dùng (bỏ hai workflow watermark chưa triển khai), với **mỗi** nhãn kết quả của nó, chỉ ra ít nhất một ca kiểm thử khẳng định đích danh nhãn đó qua đúng lối vào thật. Ô nào không có ca thì ghi rõ.

`manage_watermark_profile` đang chạy nhưng V1 không ai gọi; vẫn dựng ma trận cho nó, ghi riêng.

### K7 — Checkpoint và bằng chứng (`07-checkpoint-protocol.md`; `06-self-check.md` Bước 6.5, 6.6)
- Mọi khối checkpoint trong `Backend/` đúng khuôn Giao thức 07: vị trí, khung, bốn mục, quy tắc ID, YAML hợp lệ.
- Không còn `UNSOLVED_PROBLEMS`. Không NOTES quá 14 ngày tính tới hôm nay (`CLAUDE.md` mục 5).
- **Mỗi mục EVIDENCE còn chạy lại được:** với mỗi mục, chạy lại đúng lệnh hoặc đúng ca kiểm thử nó nêu, và ghi đạt hay không. Mục nào nêu một thứ không còn tồn tại (ca đã đổi tên, lệnh không chạy được, con số đã khác) thì ghi rõ.
- Nội dung checkpoint có khớp với mã hiện tại không: một EXPERIENCES mô tả hành vi mà mã không còn làm là một phát hiện.

## VIỆC CẦN LÀM, THEO THỨ TỰ (PHA 1)

0. **Đọc tài liệu** theo `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md`, toàn bộ;
   - bộ skill `wca-implementation`: `wca_theory_compressed.md`, `SKILL.md`, `02-contract.md` (Bước 2.3, 2.4), `04-implement.md`, `05-edge-cases.md`, `06-self-check.md`, `07-checkpoint-protocol.md`, `08-operating-protocol.md`;
   - hợp đồng: `.contracts/data_schema.yaml` và `.contracts/api_contract.yaml`, phần `clause_a_common` và `clause_b_backend`, kèm changelog đầu mỗi tệp;
   - `.design/03_classification.md`;
   - toàn bộ `Backend/` (trừ `env/`, `__pycache__/`), mã lẫn kiểm thử;
   - plan này sau cùng.

   **Để giữ tính độc lập, ở pha 1 không đọc `.plan/open_issues.md` và `.plan/v1_roadmap.md`.** Hai tệp đó ghi các phát hiện cũ. Báo cáo pha 1 phải là cái nhìn của riêng bạn.

   Xác nhận Data Schema **`10.0.1`** và API Contract **`6.0.0`**, cả hai `approved`. Sai thì dừng lại và báo.

1. **Môi trường và mốc.**
   - Ghi phiên bản Python (`Backend\env\Scripts\python.exe --version`).
   - Ghi `git status --short` (chỉ đọc). Kết quả này phải giống hệt lúc cuối pha 1.
   - `cd Backend; env\Scripts\python.exe -m pytest -q`, **một lượt**: mốc **573**. Khác thì ghi rõ, không dừng.
   - Hỏi Project Owner hôm nay đã có phiên coding agent nào chạy chưa (để ghi định danh phiên `coding-agent@<ngày>#<số>` trong báo cáo).

2. **Đọc và trả lời K1 → K7**, theo thứ tự đó. Ghi phát hiện ngay khi thấy, kèm tệp và dòng.

3. **Phép cắn**, chỉ trên bản sao. Mục đích: kiểm xem kiểm thử có thật sự bắt được những vi phạm quan trọng nhất không.
   - Chép `Backend\` sang một thư mục tạm **ngoài kho**, ví dụ `$env:TEMP\ct_review_backend\` (dùng `robocopy` hoặc `Copy-Item -Recurse`; có thể bỏ `env\` rồi dùng interpreter gốc `E:\CommissionTracker\Backend\env\Scripts\python.exe`).
   - Làm **ít nhất năm** phép cắn do bạn tự chọn, mỗi phép một vi phạm khác loại, ví dụ:
     - một Routers tự quyết một điều kiện nghiệp vụ;
     - một workflow đọc thẳng bảng của workflow khác;
     - một nhãn kết quả bị đổi;
     - Main phát `READY` trước khi ráp xong một workflow;
     - một giá trị ranh giới trong Configs bị đổi.
   - Với mỗi phép: sửa gì, ở đâu; ca nào bắt được; hay không ca nào bắt được. **Một phép cắn không bị bắt là một phát hiện.**
   - Xóa thư mục tạm khi xong.

4. **Kết thúc pha 1.**
   - `git status --short`: phải giống hệt bước 1.
   - Gửi báo cáo, rồi **dừng**. Không tự bắt đầu sửa gì, kể cả việc nhỏ.

## BÁO CÁO PHA 1

Bằng tiếng Việt, ngắn gọn, theo `CLAUDE.md` mục 5, gồm:

1. **Môi trường:** phiên bản Python; số đạt của `pytest`; `git status --short` đầu và cuối.
2. **Bảng phát hiện.** Mỗi dòng một phát hiện:

   | Mã | Mức | Phần (K1–K7) | Vị trí (tệp:dòng) | Điều bị vi phạm (trích dẫn skill hoặc hợp đồng) | Bằng chứng (lệnh, trích mã) | Đề xuất sửa | Ước lượng (nhỏ / vừa / lớn) |
   |---|---|---|---|---|---|---|---|

   Mã đặt `R42-1`, `R42-2`… Mức:
   - **cao:** sai hợp đồng hoặc sai dữ liệu người dùng, hoặc ranh giới cô lập bị phá;
   - **trung bình:** sai skill nhưng hành vi bên ngoài vẫn đúng;
   - **thấp:** checkpoint, tài liệu, đặt tên.

   Không có phát hiện ở một phần thì ghi "không có", kèm một câu nói đã kiểm những gì.
3. **Ma trận K6:** số ô, số ô có ca, danh sách ô thiếu. Không cần liệt kê ca của từng ô đã đủ.
4. **EVIDENCE (K7):** bảng từng mục EVIDENCE, khối nào, chạy lại đạt hay không.
5. **Phép cắn:** bảng từng phép, kết quả.
6. **Những gì bạn không kiểm được** và vì sao.

Không có phát hiện nào là kết quả hợp lệ, nếu bạn đã kiểm đủ. Đừng tạo phát hiện cho đủ số. Cũng đừng bỏ qua một điều vì nó "nhỏ".

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG

- Hợp đồng chỉ quản lý ranh giới (nguyên tắc hộp đen). Cách làm bên trong một workflow không phải phát hiện, trừ khi nó phá một luật của skill hay của hợp đồng.
- Mỗi workflow backend chỉ tạo và nâng cấp bảng của chính nó (`clause_a_common.mandatory_rules`).
- `apply_watermark`, `verify_watermark` và `clause_c_ai_service` ở `đang_chờ_triển_khai`, cố ý chưa có mã (V4 trở đi). Việc chúng không có mã không phải phát hiện.

## CẢNH BÁO — điều KHÔNG được làm trong pha 1

- **Không sửa, không tạo, không xóa tệp nào trong kho**, kể cả checkpoint, kể cả lỗi chính tả.
- Phép cắn chỉ làm trên bản sao ngoài kho. Không làm trên `E:\CommissionTracker\Backend\`.
- Không đọc `.plan/open_issues.md`, `.plan/v1_roadmap.md` ở pha 1. Không đọc, không ghi `.reviews/`.
- Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`.
- Không chạy `git commit`, `push`, `reset`, `checkout`, `restore`, `stash` hay lệnh nào đổi trạng thái kho. Chỉ được đọc.
- ⚠ Không kiểm thử hay lần chạy nào được đụng `%APPDATA%\CommissionTracker` thật.
- Không tắt, gỡ hay đổi cấu hình phần mềm diệt virus. Không sửa registry, không cài bộ cài.
- Không cài thêm gói nào, không thêm linter hay công cụ kiểm kiểu. Muốn dùng một công cụ chưa có thì ghi vào phần 6 của báo cáo.
- Không dùng sub-agent. Không chạy song song hai lệnh kiểm thử.

## TIÊU CHÍ HOÀN TẤT PHA 1

1. Đã trả lời đủ K1 → K7.
2. Đã làm ít nhất năm phép cắn trên bản sao ngoài kho, và đã xóa bản sao.
3. `git status --short` cuối pha 1 giống hệt đầu phiên.
4. Báo cáo có đủ sáu phần ở mục "BÁO CÁO PHA 1".
