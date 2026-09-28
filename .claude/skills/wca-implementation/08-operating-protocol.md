# GIAO THỨC 08 — VẬN HÀNH: PLAN, SỰ CỐ HỢP ĐỒNG, TRẠNG THÁI, GOM CHECKPOINT

*Đây không phải một giai đoạn trong quy trình triển khai tuần tự (00 → 06), và cũng khác [Giao thức 07](07-checkpoint-protocol.md) ở một điểm quan trọng: 07 áp dụng cho MỌI cách vận hành WCA, kể cả khi chỉ có một agent duy nhất, một mình, không có vai trò nào khác — nó là món quà đi kèm cho bất kỳ ai cần bàn giao giữa các phiên làm việc. Giao thức 08 này hẹp hơn: nó CHỈ áp dụng khi hệ thống được vận hành theo mô hình một Orchestrator (không code, sống xuyên suốt, không đóng phiên) điều phối cho nhiều phiên coding agent kế tiếp nhau, chạy tuần tự, không chạy song song. Nếu dự án chỉ có một agent duy nhất tự làm từ đầu tới cuối, không tách vai Orchestrator, giao thức này không cần áp dụng — bỏ qua, chỉ dùng 00-07. Xem [SKILL.md](SKILL.md) để biết vị trí của giao thức này trong toàn bộ bộ tài liệu. Thuật ngữ dùng trong tệp này theo đúng định nghĩa tại [§0 của lý thuyết](wca_theory_compressed.md).*

**Các vai trò trong giao thức này:** *Orchestrator* — agent điều phối, không viết code, sống xuyên suốt dự án. *Coding agent* — agent viết code, mỗi phiên một lần, kế tiếp nhau. *Người vận hành* — con người chịu trách nhiệm cuối cùng, là cầu nối giữa hai agent.

## Phần 1 — Trình tự đọc tài liệu đầu mỗi phiên

Trước khi bắt đầu bất kỳ công việc nào trong một phiên coding mới, đọc theo đúng thứ tự sau — không đảo thứ tự:

1. **Tài liệu nền của dự án** (ví dụ `CLAUDE.md`) — luật nền tảng, không đổi theo phiên; nó dẫn tới lý thuyết nền WCA, nêu vị trí hợp đồng, bố cục thư mục, và các quy ước riêng của dự án.
2. **SKILL.md và các tệp giai đoạn liên quan (00-07)** — kiến thức kiến trúc cần cho đúng công việc đang làm trong phiên này.
3. **Phần hợp đồng liên quan** — Mục của các workflow sẽ làm trong phiên này ở cả hai tệp, Điều khoản A của cả hai tệp, và Mục của mọi workflow mà chúng nhận dữ liệu từ hoặc gửi dữ liệu tới. Không cần đọc toàn bộ hợp đồng; cũng không được chỉ dựa vào phần hợp đồng mà Plan trích lại. Nếu hợp đồng đang ở `contract_state: draft`, dừng lại và báo cho người vận hành — không viết code dựa trên bản nháp.
4. **Checkpoint liên quan** (xem [07-checkpoint-protocol.md](07-checkpoint-protocol.md)) — checkpoint của Main của layer, rồi của các workflow sẽ làm hoặc sẽ gọi tới: trạng thái và kinh nghiệm để lại từ phiên trước.
5. **Plan của phiên này** (xem Phần 2 dưới đây), nếu có — chỉ đạo cụ thể cho phiên này.

⚠ Không đảo thứ tự 4 và 5: Plan được soạn DỰA TRÊN checkpoint, nên đọc checkpoint trước giúp hiểu vì sao Plan chỉ đạo như vậy, không chỉ nhận lệnh mà không rõ căn cứ. Đọc Plan mà không có checkpoint làm nền dễ khiến các chỉ đạo trong đó trở nên trừu tượng, khó áp dụng đúng ngữ cảnh.

## Phần 2 — Định dạng Plan

Plan là văn bản do Orchestrator và người vận hành cùng soạn trước mỗi phiên coding, dựa trên hai nguồn: hợp đồng (nguồn sự thật cấu trúc, đảm bảo công việc khớp 100% với những gì đã quy định) và checkpoint (trạng thái, vấn đề tồn đọng, kinh nghiệm để lại từ phiên trước, nhằm tránh lặp lại đúng những gì đã thất bại). Nói ngắn gọn: **Plan = Hợp đồng + Checkpoint**, diễn giải lại thành chỉ đạo hành động cụ thể cho một phiên.

Coding agent chỉ đọc Plan, không tự viết. Có hai loại phiên:

- **Phiên theo layer** — phiên thông thường, làm việc trong phạm vi một layer hệ thống. Plan đặt tại `plan.md` ở gốc layer đó (ví dụ `backend/plan.md`).
- **Phiên tích hợp** — phiên cần nhiều layer cùng chạy để kiểm chứng một điều mà không layer nào tự kiểm chứng được một mình (ví dụ bằng chứng thực nghiệm cho một tính năng trải qua hai layer). Plan đặt tại `integration_plan.md` ở gốc dự án, `session_for: integration/<tên>`, và mục MỤC TIÊU phải nêu rõ các layer liên quan cùng tiêu chí bằng chứng. Phiên tích hợp không viết workflow mới; nếu phát hiện cần sửa code của một layer, ghi lại và để một phiên theo layer xử lý.

Plan **ghi đè hoàn toàn ở mỗi phiên mới** — không cộng dồn, không giữ lại lịch sử Plan cũ trong cùng tệp. Lịch sử "đã làm gì" đã có checkpoint đảm nhiệm; Plan không cần và không nên gánh thêm việc đó.

Không cần trường version hay cơ chế đối chiếu phức tạp giữa Plan/checkpoint/hợp đồng. Cả ba đều do một bên (người vận hành + Orchestrator) quản lý, hai loại agent (Orchestrator và coding agent) chạy tuần tự, không song song — không có xung đột đọc/ghi đồng thời cần giải quyết bằng version. Version chỉ có giá trị khi nhiều bên đọc/ghi cùng lúc; điều kiện đó không xảy ra ở đây.

Coding agent được phép tự tạo sub-agent trong cùng phiên để chia việc, nhưng điều kiện "không song song" ở trên vẫn phải giữ ở cấp workflow: tại mỗi thời điểm, một workflow chỉ do đúng một agent viết; khối checkpoint chỉ do agent chính của phiên cập nhật, sau khi đã gom lại kết quả của các sub-agent.

### Khung Plan

```
# ===WCA-PLAN===
# session_for: <tên layer> | integration/<tên>
# drafted_by: Orchestrator + <người vận hành>
# drafted_at: <ISO 8601 timestamp>

## MỤC TIÊU PHIÊN NÀY
...

## VIỆC CẦN LÀM, THEO THỨ TỰ
...

## KẾ THỪA TỪ CHECKPOINT — vấn đề tồn đọng cần xử lý tiếp
...

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG
...

## CẢNH BÁO — điều KHÔNG được làm trong phiên này
...

## TIÊU CHÍ HOÀN TẤT PHIÊN
...
```

### Nội dung từng mục

**MỤC TIÊU PHIÊN NÀY** — một câu ngắn, trả lời "hôm nay làm gì, tới đâu thì dừng". Một phiên không bắt buộc phải hoàn thiện trọn một workflow; mục tiêu chỉ cần rõ điểm dừng. Ví dụ: *"Hoàn thiện workflow `book_appointment`: đủ năm lớp, ráp nối vào Main, qua Giai đoạn 6."*

**VIỆC CẦN LÀM, THEO THỨ TỰ** — cụ thể hóa trình tự của [Giai đoạn 4](04-implement.md) (Bước 4.0 đến 4.5: vị trí → Configs → Entities → Adapters và Services → Routers → ráp nối tại Main) áp dụng cho đúng workflow của phiên này, kèm gợi ý riêng nếu Orchestrator thấy cần đảo thứ tự hay bổ sung bước đặc thù. Đây là chỉ đạo hành động cho hôm nay, không phải nhắc lại luật chung đã có ở `04-implement.md`.

**KẾ THỪA TỪ CHECKPOINT** — không copy nguyên `UNSOLVED_PROBLEMS` từ checkpoint vào đây; diễn giải lại thành hành động cụ thể. Ví dụ: checkpoint có `next_suggested: "thử idempotency key"` → Plan viết *"Bước 3 hôm nay: triển khai idempotency key cho `send_reminder`, xem chi tiết 2 lần thử trước tại `send_reminder-PROB-003` trong checkpoint, không lặp lại lock ở Services (đã thử, thất bại)."*

**RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG** — không chép lại toàn bộ `data_schema.yaml`/`api_contract.yaml`; nêu bật đúng những điểm dễ vi phạm nhất cho phiên này. Ví dụ: *"`upcoming_appointments` có `from: book_appointment`, không phải `storage_layer` — nhớ lấy qua điểm giao tiếp `list_upcoming` của `book_appointment`, không đọc thẳng cơ sở dữ liệu."*

**CẢNH BÁO — điều KHÔNG được làm** — liệt kê phủ định, không phải hành động. Nơi tự nhiên nhất để nhắc quy tắc quay lui cụ thể cho tình huống hôm nay. Ví dụ: *"Không tự thêm trường mới vào `Appointment` entity dù thấy tiện — nếu cần trường mới, dừng lại, báo cho tôi để cập nhật hợp đồng trước."*

**TIÊU CHÍ HOÀN TẤT PHIÊN** — trả lời "khi nào coi là xong, được phép viết checkpoint và đóng phiên". Ví dụ, khớp với mục tiêu ở trên: *"Xong khi cả 5 lớp của `book_appointment` đã viết và đã ráp nối vào Main, đã tự kiểm theo Giai đoạn 6, mục EVIDENCE có bằng chứng chạy thật qua đúng điểm giao tiếp đã khai báo, và checkpoint mới đã ghi đủ theo Giao thức 07."* Tránh tình huống agent tự ý coi "gần xong" là "xong" khi context đang gần đầy.

## Phần 3 — Ranh giới quyền hạn với hợp đồng

Coding agent có thể đọc `02-contract.md`, `data_schema.yaml`, `api_contract.yaml` để tra cứu, tham khảo cách hiểu một điều khoản — không bao giờ được sửa đổi nội dung hai tệp hợp đồng, dù tự thấy chắc chắn đến đâu, kể cả trường `status`. Hợp đồng chỉ do Orchestrator và người vận hành soạn/sửa; chỉ người vận hành chuyển `contract_state` từ `draft` sang `approved`.

Hợp đồng chỉ được sửa khi không có phiên coding nào đang **thực thi** dựa trên nó — giống một hệ thống cần dừng hoạt động để bảo trì trước khi thay đổi cấu trúc lõi, không sửa "nóng" trong khi đang có bên phụ thuộc vào hình dạng cũ. Một phiên đang tạm dừng chờ Orchestrator theo Phần 4 được coi là không thực thi.

## Phần 4 — Xử lý khi phát hiện sự cố với hợp đồng giữa phiên

Khi coding agent, trong lúc code, nghi ngờ hợp đồng thiếu sót hoặc sai lệch, phân biệt trước tiên mức độ ảnh hưởng:

### Không chặn đường

Phần đang vướng không ngăn việc tiếp tục các phần khác của workflow hoặc phiên này. Ghi lại vào mục `NOTES` của checkpoint (xem [07-checkpoint-protocol.md](07-checkpoint-protocol.md)), tiếp tục công việc bình thường, không dừng phiên.

### Chặn đường

Không thể tiếp tục phần đang làm nếu thiếu điều hợp đồng chưa có. Dừng lại ngay tại đó — không đoán, không tự viết tạm một giá trị để "sửa sau" — báo cáo đầy đủ: đang làm gì, vướng ở đâu, vì sao cho rằng đây là vấn đề của hợp đồng. Coding agent được khuyến khích, không bắt buộc, kèm theo một hướng xử lý đề xuất nếu đã có ý tưởng — đây không phải vượt quyền, vì coding agent là bên trực tiếp chạm vào chi tiết code, thường thấy được những điều Orchestrator và người vận hành khó nhận ra khi chỉ nhìn ở tầng hợp đồng và checkpoint. Đề xuất này chỉ mang tính tham khảo, quyết định cuối vẫn thuộc về Orchestrator và người vận hành. Đưa báo cáo này cho Orchestrator.

Orchestrator, khi nhận báo cáo, **tự tra lại hợp đồng thật trước khi kết luận** — không mặc nhiên tin lời agent mô tả, và cũng không mặc nhiên cho rằng hợp đồng hiện tại đúng chỉ vì nó do Orchestrator/người vận hành soạn ra. Xác định đây là:

- **Sự cố thật** — hợp đồng thực sự thiếu/sai, bất kể lỗi đó xuất phát từ đâu: có thể do một quyết định thiết kế của Orchestrator hoặc người vận hành chưa tính hết một tình huống, không chỉ do "hợp đồng tự nó có vấn đề" một cách trừu tượng. Khi đã xác nhận, dừng công việc, Orchestrator và người vận hành cùng soạn bản vá phù hợp (có thể tham khảo hướng xử lý agent đã đề xuất, nếu có), cập nhật Plan nếu cần, rồi xác nhận cho coding agent tiếp tục trong cùng phiên — không cần đóng phiên chỉ vì một điều chỉnh hợp đồng nhỏ. Giữ nguyên context, phiên không đóng, chỉ tạm dừng trong lúc chờ.

- **Sự cố giả** — hợp đồng đã đủ, agent đọc sót hoặc hiểu sai. Orchestrator giải thích **tường tận** đúng điều khoản cho coding agent — không chỉ nói "không phải vậy" rồi cho qua, mà đảm bảo agent thực sự nắm được bản chất, hiểu được lý do đằng sau điều khoản đó, để hiểu lầm tương tự không lặp lại ở chính agent này trong những quyết định kế tiếp. Không sửa hợp đồng, không sửa Plan. Nếu đây là loại hiểu lầm có khả năng lặp lại ở agent khác, ghi một dòng ngắn vào checkpoint (`NOTES` hoặc `EXPERIENCES`) để phòng ngừa hiểu lầm tương tự về sau.

⚠ Chỉ khi việc sửa hợp đồng đủ lớn — ví dụ phát hiện ranh giới workflow bị vẽ sai từ Giai đoạn 1, cần xem xét lại nhiều quyết định, không chỉ một trường — mới cân nhắc đóng hẳn phiên. Lúc đó việc giữ phiên treo chờ không có lợi bằng việc ghi checkpoint đầy đủ và mở phiên mới sau khi hướng đi mới đã rõ. Với đa số trường hợp (một trường thiếu, một điểm giao tiếp cần thêm), tạm dừng và tiếp tục trong cùng phiên là lựa chọn tốt hơn — tránh mất context đã tích lũy chỉ vì một điều chỉnh nhỏ.

## Phần 5 — Orchestrator audit thực tế, không chỉ tin lời báo cáo

Checkpoint được sinh từ chính comment do coding agent tự viết — không có lớp kiểm chứng độc lập nào trước khi Orchestrator gom lại. Một coding agent có thể, dù không cố ý hay cố ý, báo cáo một workflow "đã hoàn thiện" trong khi thực tế chưa đúng như vậy — ví dụ kết quả kiểm thử đã bị gán cứng, hoặc một phần logic chỉ giả lập cho có mà không thực sự chạy được. Đây không phải tình huống giả định: cùng một dạng sự cố này đã từng xảy ra thật, khi một coding agent tự viết code, tự nối các phần với nhau, tự chạy kiểm thử, rồi tự báo cáo hoàn thành — nhưng khi audit trực tiếp mới phát hiện toàn bộ là giả mạo, không có gì thực sự chạy được.

Vì vậy, trước khi tin bất kỳ nội dung nào trong checkpoint nói một workflow đã hoàn thiện — đặc biệt trước khi dùng nó làm căn cứ soạn Plan cho phiên tiếp theo — Orchestrator tự xác nhận bằng cách nhìn trực tiếp vào thư mục dự án, không chỉ đọc lời agent tự khai:

- Các lớp cần thiết (đủ năm lớp với workflow nghiệp vụ) có thực sự tồn tại đúng như checkpoint mô tả, không chỉ là tệp rỗng hoặc code giả lập.
- Nếu checkpoint nói một bài kiểm thử đã đạt (ví dụ độ tin cậy watermark trên tranh mẫu), đối chiếu với mục EVIDENCE của checkpoint (xem [07-checkpoint-protocol.md](07-checkpoint-protocol.md)): lệnh đã chạy, dữ liệu đầu vào, kết quả thô, thời điểm. Mặc định là **yêu cầu bằng chứng**; tự chạy lại khi Orchestrator có điều kiện chạy code trên máy dự án, nếu không thì nhờ người vận hành chạy lại đúng lệnh trong `how` và gửi kết quả thô. Không chấp nhận một dòng khẳng định suông.
- Nếu phát hiện checkpoint và thực tế thư mục lệch nhau, đây là một dạng sự cố cần nêu rõ với người vận hành trước khi tiếp tục — không tự ý "sửa lại cho khớp" checkpoint để hợp lý hóa, và không im lặng bỏ qua.

## Phần 6 — Quyền linh hoạt của coding agent trước Plan

Plan là chỉ đạo, không phải mệnh lệnh tuyệt đối không được đặt câu hỏi. Orchestrator soạn Plan dựa trên hợp đồng và checkpoint tại thời điểm đó, nhưng có thể không lường hết mọi chi tiết thực tế — đúng như hợp đồng hay checkpoint cũng có thể sai và từng được sửa lại khi phát hiện vấn đề. Coding agent được quyền tự điều chỉnh khi thực tế cho thấy Plan chưa hợp lý, trong giới hạn sau:

**Được phép, không cần dừng lại xin phép trước:**
- Tự đảo thứ tự các việc liệt kê trong mục "VIỆC CẦN LÀM, THEO THỨ TỰ" nếu phát hiện lý do chính đáng (ví dụ một phụ thuộc giữa hai phần việc mà Plan không lường trước) — miễn ghi rõ vào checkpoint cuối phiên: đã đảo thứ tự gì, vì sao, để Orchestrator biết khi soạn Plan kế tiếp.

**Không được tự ý, cần báo cáo như một sự cố (tương tự Phần 4, áp dụng cho Plan thay vì hợp đồng):**
- Bỏ hẳn một phần việc đã ghi trong Plan mà không thực hiện.
- Tự thêm việc nằm ngoài phạm vi Plan.
- Vi phạm bất kỳ điều nào trong mục "CẢNH BÁO — điều KHÔNG được làm" của Plan, dù thấy có lý do hợp lý — mục này tồn tại chính vì Orchestrator đã lường trước đây là những điểm dễ sai, nên cần xác nhận lại với Orchestrator trước khi phá lệ, không tự quyết một mình.

Ranh giới ở đây là **trình tự** (linh hoạt được) khác với **phạm vi công việc** (không tự ý đổi) — đảo thứ tự làm A trước hay B trước không thay đổi kết quả cuối cùng phải đạt, nhưng bỏ việc hoặc thêm việc thì có.

## Phần 7 — Cập nhật `status` trong hợp đồng

`status` của một workflow trong hợp đồng chỉ đổi khi có căn cứ, và chỉ do Orchestrator cùng người vận hành thực hiện:

- `đang_chờ_triển_khai` → `đang_triển_khai`: khi Plan của phiên đầu tiên chạm tới workflow đó được phát hành.
- `đang_triển_khai` → `đã_hoàn_thiện`: khi coding agent đã đề xuất theo [Giai đoạn 6](06-self-check.md), Bước 6.6, **và** Orchestrator đã tự xác nhận theo Phần 5 — các lớp cần thiết tồn tại thật, EVIDENCE kiểm lại được, không còn UNSOLVED_PROBLEMS chặn đường.
- Ngược lại về `đang_triển_khai`: khi phát hiện một workflow đã được đánh dấu hoàn thiện nhưng thực tế không đúng như vậy.

Như đã quy định ở [Giai đoạn 2](02-contract.md), Bước 2.2, cập nhật `status` không tính là thay đổi Mục và được phép kể cả khi Điều khoản đã khóa. Mỗi lần đổi vẫn ghi một dòng changelog.

## Phần 8 — Gom checkpoint

Orchestrator là bên duy nhất gom checkpoint. Coding agent không tự chạy công cụ gom, chỉ có trách nhiệm viết checkpoint đúng khuôn tại [07-checkpoint-protocol.md](07-checkpoint-protocol.md).

Khi gom, Orchestrator:

1. Đọc hợp đồng trước, để biết cần tìm checkpoint ở đâu: workflow nào không có Services (vị trí dự phòng tại Adapters), thành phần hạ tầng cắt ngang nào đã được khai báo, và tệp Main của mỗi layer (vị trí do tài liệu nền của dự án quy định).
2. Chỉ lấy đúng các tệp cần thiết (không quét toàn bộ codebase), trích nội dung giữa hai thẻ ranh giới, bỏ tiền tố comment, parse bằng YAML. Một khối không parse được là một phát hiện cần báo lại, không tự sửa.
3. Đối chiếu nội dung checkpoint với trạng thái hiện tại của hợp đồng (`status` của workflow, số phiên bản hợp đồng) — nếu phát hiện mâu thuẫn, nêu ra, không tự ý phán quyết bên nào đúng.
4. Lọc bỏ các mục NOTES đã quá ngưỡng hết hạn mà dự án quy định — đây là thao tác cơ học, không cần xin duyệt.
5. Gộp các checkpoint theo đúng Điều khoản trong hợp đồng, sinh ra một bản tóm tắt riêng cho mỗi Điều khoản, đặt tại vị trí dự án quy định trong tài liệu nền.
6. Nếu quá trình đối chiếu cho thấy cần cập nhật hợp đồng, chỉ được ĐỀ XUẤT thay đổi — không tự ghi vào hợp đồng. Chỉ được ghi sau khi người vận hành xác nhận đồng ý.

## Checklist tuân thủ

- [ ] Trước khi bắt đầu công việc, đã đọc đúng thứ tự: tài liệu nền của dự án → SKILL.md/tài liệu liên quan → phần hợp đồng liên quan → checkpoint → Plan; và đã xác nhận hợp đồng ở trạng thái `approved`.
- [ ] Không có sửa đổi nào được thực hiện trực tiếp lên `02-contract.md`, `data_schema.yaml`, hay `api_contract.yaml` bởi coding agent, kể cả trường `status`.
- [ ] Nếu phiên có sub-agent, mỗi workflow chỉ do đúng một agent viết tại mỗi thời điểm, và checkpoint chỉ do agent chính cập nhật.
- [ ] Mọi thay đổi `status` trong hợp đồng đều có căn cứ theo Phần 7 và có dòng changelog.
- [ ] Khi gom checkpoint, mọi khối không parse được hoặc mâu thuẫn với hợp đồng đều đã được nêu ra với người vận hành, không bị tự sửa cho khớp.
- [ ] Với mỗi sự cố hợp đồng phát hiện trong phiên, đã phân loại đúng chặn đường hay không chặn đường trước khi quyết định dừng hay tiếp tục.
- [ ] Với mỗi sự cố được báo cáo lên Orchestrator, đã xác nhận rõ đây là sự cố thật hay sự cố giả trước khi hành động, không mặc nhiên tin theo báo cáo của agent, và cũng không mặc nhiên cho rằng hợp đồng hiện tại đúng chỉ vì đó là quyết định trước đó của Orchestrator/người vận hành.
- [ ] **Nếu coding agent có đề xuất hướng xử lý kèm báo cáo sự cố, đề xuất đó đã được Orchestrator xem xét nghiêm túc như một nguồn thông tin, không bị bỏ qua chỉ vì không tới từ Orchestrator hay người vận hành.**
- [ ] **Nếu là sự cố giả, đã xác nhận agent thực sự hiểu tường tận bản chất điều khoản, không chỉ được thông báo kết luận "không phải vậy" rồi tiếp tục.**
- [ ] Nếu là sự cố thật, hợp đồng và Plan đã được cập nhật trước khi coding agent tiếp tục — không để agent code dựa trên phỏng đoán về việc hợp đồng "sắp" được sửa ra sao.
- [ ] Nếu là sự cố giả, đã cân nhắc ghi một dòng phòng ngừa vào checkpoint khi hiểu lầm đó có khả năng lặp lại ở agent khác.
- [ ] Plan của phiên hiện tại phản ánh đúng checkpoint và hợp đồng tại thời điểm phiên bắt đầu — không chứa giả định về một thay đổi hợp đồng chưa thực sự được ghi.
- [ ] **Trước khi dùng checkpoint làm căn cứ soạn Plan tiếp theo, Orchestrator đã tự xác nhận qua thư mục thật (không chỉ tin lời agent) rằng nội dung checkpoint khớp với thực tế, đặc biệt với mọi khẳng định "đã hoàn thiện".**
- [ ] **Nếu coding agent đã tự đảo thứ tự công việc so với Plan, checkpoint cuối phiên có ghi rõ lý do — và không có việc nào trong Plan bị bỏ qua hoặc có việc ngoài Plan bị tự ý thêm vào mà không báo cáo.**