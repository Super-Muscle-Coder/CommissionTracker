# GIAO THỨC 07 — CHECKPOINT: LƯU TRỮ KÝ ỨC VÀ KINH NGHIỆM VẬN HÀNH

*Đây không phải một giai đoạn trong quy trình triển khai tuần tự (00 → 06). Đây là một giao thức định dạng, áp dụng xuyên suốt trong lúc thực hiện [Giai đoạn 4](04-implement.md) và được kiểm tra tại [Giai đoạn 6](06-self-check.md). Giống vai trò của hợp đồng tối cao đối với dữ liệu và điểm giao tiếp, tài liệu này là nguồn chuẩn duy nhất cho định dạng checkpoint — không có chỗ cho biến thể tùy ý theo từng agent. Giao thức này thuộc nhóm kiến trúc: nó áp dụng cho mọi cách vận hành, kể cả khi chỉ có một agent duy nhất tự làm việc qua nhiều phiên. Xem [SKILL.md](SKILL.md) để biết vị trí của giao thức này trong toàn bộ bộ tài liệu. Thuật ngữ dùng trong tệp này theo đúng định nghĩa tại [§0 của lý thuyết](wca_theory_compressed.md).*

## Mục đích

Mỗi phiên làm việc của một coding agent là hữu hạn — context window đầy dần, phiên đóng lại, một agent khác mở ra. Nếu không có gì lưu lại, agent kế thừa buộc phải đọc lại toàn bộ hợp đồng và một phần codebase chỉ để biết "đang ở đâu, đã thử gì, còn vướng gì" — tốn thời gian của người vận hành và tốn context của chính agent đó trước khi nó kịp làm việc thật.

Checkpoint giải quyết đúng vấn đề này, với một ràng buộc quan trọng: nó không phải một cuốn nhật ký cộng dồn theo thời gian. Nội dung của nó luôn được giữ ở dạng tinh gọn nhất có thể tại bất kỳ thời điểm nào — vấn đề đã giải quyết không nằm lại đó dưới dạng lịch sử, mà được chuyển hóa thành một dòng kinh nghiệm cô đọng; vấn đề chưa giải quyết được giữ lại dưới dạng một chuỗi các lần thử đã biết, để agent kế thừa không lặp lại đúng những gì đã thất bại. Qua nhiều thế hệ agent, hệ thống tích lũy được một dạng tri thức vận hành mà không một agent đơn lẻ nào có thể có ngay từ đầu — thứ chỉ hình thành được qua thời gian, không phải qua sức mạnh của một model đơn lẻ.

## Vị trí bắt buộc

Mỗi workflow có đúng một khối checkpoint, nằm trong đúng một tệp, ở đầu tệp, trước mọi code khác:

- **Mặc định:** tệp Services của workflow đó (theo bố cục ở [Giai đoạn 4](04-implement.md), Bước 4.0, ví dụ `<layer>/workflows/<tên_workflow>/services.py`) — vì Services là lớp duy nhất "ra quyết định" trong năm lớp, và là lớp được viết ở vị trí trung tâm trong trình tự Giai đoạn 4, nơi agent có tầm nhìn đầy đủ nhất về toàn bộ workflow tại một thời điểm.
- **Dự phòng:** nếu workflow không có lớp Services (trường hợp một số workflow nền tảng tối giản, theo Bước 3.3 của Giai đoạn 3), khối checkpoint chuyển sang đầu tệp Adapters.

Mỗi thành phần hạ tầng cắt ngang cũng có đúng một khối checkpoint riêng, ở đầu tệp chính của thành phần đó. Nó không phải workflow, nhưng nó cũng có vấn đề, kinh nghiệm, và agent kế thừa cũng cần biết về chúng.

Main của mỗi layer hệ thống cũng có đúng một khối checkpoint riêng, ở đầu tệp Main. Đây là nơi của những gì thuộc về **cả layer**, không thuộc riêng workflow nào: cách các workflow dùng chung một tài nguyên nền tảng, giao thức khởi động/dừng giữa các Main, quy ước kỹ thuật mà mọi workflow của layer phải theo. Nội dung loại này không được ghi nhờ vào checkpoint của một workflow, kể cả workflow nền tảng: đặt sai chỗ, agent làm workflow khác sẽ không biết mà tìm, còn checkpoint của workflow bị lẫn những điều không phải của nó. Ngược lại, điều chỉ đúng với một workflow thì ghi ở checkpoint của workflow đó, không đưa lên Main.

⚠ Dù workflow phát sinh vấn đề, kinh nghiệm, hay ghi chú ở bất kỳ lớp nào trong năm lớp — Entities, Adapters, Services, hay Routers — toàn bộ nội dung đó được tập trung về đúng MỘT khối checkpoint duy nhất tại vị trí đã định ở trên. Không viết checkpoint rải rác theo từng lớp, và dù tệp Services chứa bao nhiêu hàm, chỉ có đúng một khối checkpoint cho toàn bộ workflow — không viết theo từng hàm.

## Định dạng khung

Checkpoint được bao bọc bởi một cặp thẻ ranh giới cố định, độc lập với cú pháp comment của từng ngôn ngữ lập trình. Mỗi dòng bên trong bắt đầu bằng ký tự comment hợp lệ của ngôn ngữ đang dùng (`#` cho Python, `//` cho JS/TS…) theo sau là **đúng một dấu cách**. Sau khi bỏ tiền tố đó ở mọi dòng, phần còn lại giữa hai thẻ **phải là YAML hợp lệ** — để một công cụ trích xuất duy nhất (tìm thẻ bằng regex, bỏ tiền tố comment, parse bằng một YAML parser chuẩn) hoạt động được trên mọi ngôn ngữ mà không cần logic riêng cho từng loại tệp.

```
# ===WCA-CHECKPOINT-START===
# workflow: <tên workflow, hoặc tên thành phần hạ tầng cắt ngang>
# clause: <khóa Điều khoản trong hợp đồng, ví dụ clause_b_backend>
# component: services            # hoặc adapters (vị trí dự phòng), cross_cutting, main
# last_updated_by: <định danh phiên làm việc>
# last_updated_at: <ISO 8601 timestamp>
#
# EXPERIENCES: []
#
# UNSOLVED_PROBLEMS: []
#
# EVIDENCE: []
#
# NOTES: []
# ===WCA-CHECKPOINT-END===
```

Năm trường đầu khối là bắt buộc, không có ngoại lệ — đây là những gì dùng để biết checkpoint này thuộc về ai và mới tới đâu, trước khi đọc nội dung bên trong bốn mục:

| Trường | Giá trị |
|---|---|
| `workflow` | Tên workflow đúng như khóa của Mục trong hợp đồng; với hạ tầng cắt ngang, đúng tên khai báo trong `cross_cutting` của API Contract; với Main, là `main`. |
| `clause` | Khóa Điều khoản trong hợp đồng (ví dụ `clause_b_backend`), không phải nhãn `tag`. Với hạ tầng cắt ngang, là Điều khoản của layer nơi nó chạy. Với Main, là Điều khoản của layer đó. Hoặc một giá trị trong bảng [Giá trị mở rộng](#giá-trị-mở-rộng). |
| `component` | `services`, `adapters`, `cross_cutting`, hoặc `main`. Hoặc một giá trị trong bảng [Giá trị mở rộng](#giá-trị-mở-rộng). |
| `last_updated_by` | Định danh của phiên làm việc đã cập nhật lần cuối. Dự án quy định dạng cụ thể trong tài liệu nền của nó; nếu không quy định, dùng `<vai trò>@<ngày>#<số thứ tự phiên trong ngày>` (ví dụ `coding-agent@2026-09-25#1`). |
| `last_updated_at` | Thời điểm cập nhật lần cuối, ISO 8601. |

Bốn mục nội dung luôn có mặt, kể cả khi rỗng (`[]`), để công cụ trích xuất không phải đoán mục nào vắng vì chưa có gì hay vì bị quên.

## Bốn mục nội dung

### EXPERIENCES — kinh nghiệm đã đúc kết

Nội dung tĩnh. Một khi đã viết, chỉ thay đổi khi có một bản đúc kết tốt hơn thay thế, không đổi theo mỗi phiên. Mỗi mục có định danh riêng theo công thức `<workflow>-EXP-<số>`, đánh số tăng dần, không tái sử dụng số đã dùng dù mục đó có bị viết lại sau này.

```
# EXPERIENCES:
#   - id: book_appointment-EXP-001
#     content: >
#       Khi tạo Appointment trùng scheduled_at cho cùng user, DB không tự
#       chặn — phải validate ở Services trước khi insert, không dồn
#       xuống Adapters (Adapters không được tự quyết định).
#     derived_from: book_appointment-PROB-003    # tùy chọn — xem giải thích bên dưới
```

`derived_from` là trường tùy chọn, dùng để truy vết nguồn gốc của một kinh nghiệm. Nó trỏ tới một trong hai loại id: id của **vấn đề** đã được giải quyết và đúc kết thành kinh nghiệm này, hoặc id của một **kinh nghiệm cũ** mà mục này thay thế — ví dụ khi một kinh nghiệm được chuyển sang khối checkpoint khác (như từ một workflow lên Main) và vì thế mang id mới. Kinh nghiệm cũ đã được chuyển hay viết lại thì bị xóa khỏi khối cũ; id của nó không được dùng lại.

### UNSOLVED_PROBLEMS — chuỗi vấn đề đang mở

Đây là nội dung duy nhất được phép "sống" qua nhiều phiên — mỗi agent gặp lại vấn đề này chỉ được PHÉP THÊM một lượt thử mới vào cuối `attempts`, không được sửa hay xóa lượt thử của agent trước, dù nó có vẻ sai hay thừa. Chỉ agent thực sự giải quyết được vấn đề mới có quyền xóa toàn bộ mục này và chuyển nó thành một mục mới trong EXPERIENCES.

```
# UNSOLVED_PROBLEMS:
#   - id: send_reminder-PROB-003
#     description: >
#       Gửi reminder bị trùng 2 lần nếu server restart giữa lúc lượt quét
#       đang chạy.
#     attempts:
#       - attempt: 1
#         agent: coding-agent@2026-09-20#1
#         tried: Thêm lock ở tầng Service.
#         result: Thất bại — restart làm mất lock in-memory.
#       - attempt: 2
#         agent: coding-agent@2026-09-21#1
#         tried: DB-level lock qua reminder_log.
#         result: >
#           Giảm tần suất trùng nhưng chưa loại hẳn khi 2 instance chạy
#           đồng thời.
#     next_suggested: >
#       Cân nhắc idempotency key thay vì lock (đề xuất từ attempt 2,
#       chưa ai thử).
```

`next_suggested` là trường duy nhất trong mục này được **ghi đè** thay vì cộng thêm: mỗi khi một lượt thử mới được thêm vào `attempts`, `next_suggested` bắt buộc được viết lại để phản ánh đề xuất mới nhất. Một vấn đề mà phiên này không đụng tới thì giữ nguyên, không cần cập nhật. Agent đọc mục này nên đọc `next_suggested` trước tiên; chỉ cần tra ngược vào `attempts` khi `next_suggested` chưa đủ rõ hoặc cần hiểu vì sao các hướng cũ thất bại.

### EVIDENCE — bằng chứng chạy thật

Nơi đặt bằng chứng mà [Giai đoạn 6](06-self-check.md), Bước 6.6 yêu cầu trước khi đề xuất coi workflow là hoàn thiện. Mỗi mục là một khẳng định kèm cách kiểm lại được. Chỉ giữ bằng chứng mới nhất cho mỗi khẳng định: khi chạy lại, ghi đè mục cũ cùng khẳng định, không cộng dồn lịch sử.

```
# EVIDENCE:
#   - claim: >
#       send_for_upcoming chỉ tạo reminder_log cho lịch hẹn đã tới lúc nhắc.
#     how: >
#       Chạy một lượt background_jobs trên DB thử có 3 lịch hẹn
#       (1 đã tới lúc, 2 chưa) — lệnh: python -m cross_cutting.background_jobs --once
#     result: >
#       Đúng 1 reminder_log được tạo, appointment_id khớp lịch hẹn đã tới lúc.
#     recorded_at: 2026-09-22T10:15:00+07:00
```

### NOTES — ghi chú ngắn hạn

Nội dung duy nhất được phép tự hết hạn mà không cần ai xóa tường minh. Mỗi ghi chú bắt buộc có `written_at`. Ghi chú quá ngưỡng hết hạn có thể được lọc bỏ một cách cơ học khi gom checkpoint, không cần xin duyệt. Ngưỡng hết hạn do dự án quy định trong tài liệu nền của nó.

```
# NOTES:
#   - content: >
#       Trước khi sửa tệp này, kiểm tra lại điểm giao tiếp list_upcoming
#       trong api_contract.yaml — vừa được thêm ở phiên trước (v1.0.1).
#     written_at: 2026-09-20
```

## Quy tắc định danh (ID)

Mọi định danh trong EXPERIENCES và UNSOLVED_PROBLEMS đều theo công thức `<tên>-<loại>-<số thứ tự>`, trong đó `<tên>` là giá trị của trường `workflow` ở đầu khối (tên workflow, tên thành phần hạ tầng cắt ngang, hoặc `main`), `<loại>` là `EXP` hoặc `PROB` (ví dụ `send_reminder-PROB-003`, `book_appointment-EXP-001`). Định danh duy nhất trong phạm vi một khối checkpoint, không cần một bộ đếm trung tâm nào theo dõi toàn hệ thống — vì mỗi workflow chỉ có đúng một khối checkpoint, việc trùng số giữa hai khối khác nhau không gây nhầm lẫn. Các layer khác nhau đều có khối `main`, nên một định danh như `main-EXP-001` luôn được đọc cùng trường `clause` của khối chứa nó.

## Giá trị mở rộng

Một skill đi kèm, dựng trên WCA cho một loại layer riêng, có thể cần thêm giá trị cho `clause` hoặc `component` — vì layer đó có đặc điểm mà các giá trị trên không diễn đạt được. Việc đó được phép với ba điều kiện:

1. Skill đi kèm khai báo giá trị mới, ý nghĩa và vị trí của khối checkpoint dùng giá trị đó, trong chính tài liệu của nó.
2. Giá trị mới chỉ có hiệu lực bên trong phạm vi mà skill đi kèm quy định — không bao giờ dùng ở một layer không theo skill đó.
3. Giá trị mới được ghi vào bảng dưới đây. Tệp này là nơi duy nhất liệt kê **mọi** giá trị hợp lệ của `clause` và `component`; một giá trị không có ở đây, dù skill nào khai báo, là một khối sai khuôn.

Mọi quy định khác của giao thức này — thẻ ranh giới, năm trường đầu khối, bốn mục nội dung, quy tắc định danh — không thay đổi theo giá trị mở rộng.

| Skill đi kèm | Phạm vi | Trường | Giá trị | Ý nghĩa và vị trí |
|---|---|---|---|---|
| `iwca-implementation` | Layer giao diện tổ chức theo iWCA | `clause` | `external` | Layer giao diện không có Điều khoản trong hợp đồng tối cao; mọi khối checkpoint của layer đó dùng giá trị này. |
| `iwca-implementation` | Layer giao diện tổ chức theo iWCA | `component` | `kit` | Khối checkpoint của phân khu kit, ở đầu tệp lối công khai `kit/index`. `workflow: kit`. |
| `iwca-implementation` | Layer giao diện tổ chức theo iWCA | `component` | `screens` | Khối checkpoint của phân khu màn hình, ở đầu tệp bảng điều hướng `screens/navigation`. `workflow: screens`. |

Chi tiết của các giá trị iWCA: §8 của lý thuyết iWCA (`iwca_theory.md` trong skill `iwca-implementation`).

## Gom và đối chiếu checkpoint

Người viết code chỉ có trách nhiệm viết checkpoint đúng khuôn đã định ở trên. Việc gom checkpoint của nhiều workflow, đối chiếu chúng với hợp đồng, và xử lý khi hai bên mâu thuẫn là trách nhiệm của bên điều phối công việc, và **cách làm cụ thể thuộc giao thức vận hành của dự án** (ví dụ [08-operating-protocol.md](08-operating-protocol.md)), không thuộc giao thức định dạng này.

Hai nguyên tắc sau đúng với mọi cách vận hành, kể cả khi chỉ có một agent:

- Khi checkpoint và hợp đồng nói hai điều khác nhau (ví dụ hợp đồng ghi `status: đã_hoàn_thiện` nhưng checkpoint vẫn còn UNSOLVED_PROBLEMS, hoặc còn thiếu EVIDENCE), đó là một mâu thuẫn cần được nêu ra, không tự ý phán quyết bên nào đúng.
- Checkpoint không bao giờ là nơi sửa hợp đồng. Nếu nội dung checkpoint cho thấy hợp đồng cần thay đổi, đó là một đề xuất, xử lý theo quy tắc quay lui về [Giai đoạn 2](02-contract.md).

## Checklist tuân thủ

- [ ] Mỗi workflow, mỗi thành phần hạ tầng cắt ngang, và Main của mỗi layer có đúng một khối checkpoint, ở đúng vị trí (Services; Adapters nếu không có Services; tệp chính nếu là hạ tầng cắt ngang; tệp Main nếu là Main), không rải rác theo lớp hay theo hàm.
- [ ] Kinh nghiệm thuộc về cả layer nằm ở checkpoint của Main, không nằm nhờ trong checkpoint của một workflow; kinh nghiệm chỉ đúng với một workflow nằm ở checkpoint của workflow đó.
- [ ] Sau khi bỏ tiền tố comment, nội dung giữa hai thẻ parse được bằng một YAML parser chuẩn.
- [ ] Đủ năm trường bắt buộc ở đầu khối, đúng giá trị như bảng ở phần Định dạng khung — hoặc một giá trị có trong bảng Giá trị mở rộng, dùng đúng phạm vi của nó — và đủ bốn mục nội dung (kể cả mục rỗng).
- [ ] Mọi mục trong `EXPERIENCES` và `UNSOLVED_PROBLEMS` có định danh đúng công thức `<workflow>-<loại>-<số>`, không trùng lặp trong phạm vi workflow.
- [ ] Mọi mục trong `UNSOLVED_PROBLEMS` có `attempts` là một chuỗi chỉ được thêm vào, không có lượt thử nào của agent trước bị sửa hoặc xóa.
- [ ] Với mỗi vấn đề vừa được thêm lượt thử trong phiên này, `next_suggested` đã được viết lại, phản ánh đúng đề xuất mới nhất, không còn trỏ tới một hướng đã được thử và ghi nhận thất bại.
- [ ] Mọi mục trong `EVIDENCE` có đủ `claim`, `how`, `result`, `recorded_at`, và `how` đủ cụ thể để người khác chạy lại được.
- [ ] Mọi mục trong `NOTES` có `written_at`.
- [ ] Nếu một vấn đề trong `UNSOLVED_PROBLEMS` vừa được giải quyết trong phiên này, đã được chuyển hóa thành một mục mới trong `EXPERIENCES` và xóa khỏi `UNSOLVED_PROBLEMS`, không giữ lại cả hai.