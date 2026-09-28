# GIAI ĐOẠN 2 — SOẠN HỢP ĐỒNG TỐI CAO

*Giai đoạn thứ ba trong quy trình triển khai WCA, sau khi đã hoàn thành [Giai đoạn 1](01-decompose.md). Xem [SKILL.md](SKILL.md) để biết toàn bộ các giai đoạn. Thuật ngữ dùng trong tệp này theo đúng định nghĩa tại [§0 của lý thuyết](wca_theory_compressed.md).*

| | |
|---|---|
| **Input** | Danh sách workflow từ Giai đoạn 1: mỗi workflow đã có tên, mô tả, phân loại, lý do phân loại, layer hệ thống, và bản ghi sơ bộ về input mong muốn / output cam kết. |
| **Hành động** | Soạn hai tệp hợp đồng tối cao — Data Schema và API Contract — bao phủ đầy đủ danh sách workflow đó, theo đúng khung khai báo chuẩn, không có ngoại lệ về hình thức. |
| **Output** | Hai tệp hợp đồng hoàn chỉnh, mỗi workflow trong danh sách đều có một Mục tương ứng trong Data Schema, và mọi điểm giao tiếp mà có bên ngoài gọi tới đều có mặt trong API Contract. |

⚠ Tệp này khác các giai đoạn khác ở một điểm quan trọng: các bước tư duy (2.1 đến 2.3) vẫn là nơi cần suy luận theo bối cảnh, nhưng khung khai báo (Bước 2.4) là một đặc tả cố định, không có vùng xám, không có chỗ cho cách viết khác. Hợp đồng tối cao là nguồn sự thật duy nhất của toàn hệ thống — nếu hình thức của nó còn mơ hồ, mọi suy luận đúng đắn ở các giai đoạn sau cũng mất đi điểm neo để đối chiếu. Rõ ràng ở đây không đồng nghĩa với việc trói buộc nội dung vào một loại dự án hay một công nghệ cụ thể nào — khung khai báo được thiết kế để dùng được cho mọi dự án, bất kể workflow làm gì và chạy trên công nghệ nào. Nó chỉ có nghĩa là bất kỳ nội dung nào, thuộc bất kỳ hệ thống nào, cũng phải được viết đúng một hình thức duy nhất.

## Bước 2.1 — Xác định cấu trúc phân tầng

Hợp đồng không phải một danh sách phẳng các định nghĩa, mà là một cấu trúc ba tầng cố định: **Hợp đồng chứa Điều khoản, Điều khoản chứa Mục.**

Mỗi Điều khoản gắn với đúng một layer hệ thống. Layer hệ thống là một đơn vị triển khai có code và vòng đời riêng — thường tương ứng một tiến trình hoặc một runtime. Nơi lưu trữ dữ liệu không phải một layer hệ thống và không có Điều khoản riêng: nó là tài nguyên do workflow nền tảng của layer sử dụng nó quản lý. Nếu một phần hệ thống được chủ đích đặt ngoài WCA (xem [§7 của lý thuyết](wca_theory_compressed.md)), phần đó cũng không có Điều khoản; nó xuất hiện trong hợp đồng dưới vai trò bên gọi `external`.

Điều khoản A luôn dành cho các quy định áp dụng chung cho mọi layer, và **có mặt ở cả hai tệp** — mỗi tệp chứa những quy định chung thuộc đúng phạm vi của tệp đó (xem khung ở Bước 2.4). Mỗi workflow là một Mục, nằm bên trong đúng Điều khoản của layer nó thuộc về.

Số lượng Điều khoản tỉ lệ với số lượng layer hệ thống, không tỉ lệ với số lượng workflow — một layer có mười workflow vẫn chỉ cần đúng một Điều khoản. Một hệ thống chỉ có một layer vẫn có đủ hai Điều khoản: A và Điều khoản của layer đó.

Khóa của Điều khoản theo quy ước `clause_<chữ cái>_<tên layer>` (ví dụ `clause_b_backend`); riêng Điều khoản chung luôn là `clause_a_common`. Nhãn `tag` của mỗi Mục ghi đúng chữ cái đó (ví dụ `"[Clause B]"`).

Định dạng tệp: YAML, vì hợp đồng cần cả người và máy cùng đọc được liên tục, và cần viết được chú thích ngay trong văn bản. Hai tệp đặt tại một vị trí cố định trong dự án; vị trí đó được ghi trong tài liệu nền của dự án (ví dụ `CLAUDE.md`) để mọi agent tìm được mà không phải đoán.

## Bước 2.2 — Thiết lập cơ chế kiểm soát thay đổi

**Trạng thái toàn hợp đồng.** Đầu mỗi tệp có hai trường: số phiên bản (`schema_version` / `api_version`) và `contract_state: draft | approved`. Hợp đồng ở trạng thái `draft` là bản đang soạn: không ai được viết code dựa trên nó. Chỉ khi chuyển sang `approved` hợp đồng mới trở thành căn cứ triển khai.

**Trạng thái từng Điều khoản.** Mỗi Điều khoản có `lock_status: open | locked`. Khi một Điều khoản còn mở, mọi thay đổi đều được phép (vẫn phải ghi changelog). Khi đã khóa, các phần khác của hệ thống có thể đã phụ thuộc vào hình dạng hiện có, nên thay đổi được chia làm hai loại:

- **Thay đổi mở rộng** — được phép trên Điều khoản đã khóa, vì không bên nào đang phụ thuộc bị ảnh hưởng: thêm Mục mới; thêm output mới hoặc điểm giao tiếp mới vào một Mục; thêm tên vào `consumed_by` hoặc `called_by`; thêm trường vào `type` của một output (bên tiêu thụ cũ vẫn nhận đủ những gì đã được hứa, và bỏ qua trường mới — điều này chỉ đúng khi mọi bên tiêu thụ giữ quy tắc về trường thừa ở Bước 2.3).
- **Thay đổi phá vỡ** — mọi thay đổi còn lại: xóa hoặc đổi tên bất cứ thứ gì đã khai báo; đổi kiểu hoặc thu hẹp giá trị của một trường; thêm trường bắt buộc vào một input; đổi `from`; thêm kết quả mới vào một điểm giao tiếp đã có. Một thay đổi phá vỡ trên Điều khoản đã khóa chỉ được thực hiện khi Điều khoản được mở lại một cách tường minh, và changelog phải ghi rõ những bên tiêu thụ bị ảnh hưởng.

Nguyên tắc đằng sau cách chia này: khóa tồn tại để bảo vệ **những gì bên khác đã phụ thuộc vào**, không phải để đóng băng toàn bộ nội dung.

**Trường `status` của mỗi Mục** phản ánh tiến độ triển khai, không phải một cam kết về ranh giới. Nó được cập nhật kể cả khi Điều khoản đã khóa và không tính là thay đổi Mục. Ai cập nhật và cập nhật dựa trên bằng chứng gì được quy định ở [Giai đoạn 6](06-self-check.md) và giao thức vận hành của dự án.

**Số phiên bản** `X.Y.Z` tăng theo loại thay đổi: tăng `X` khi có thay đổi phá vỡ; tăng `Y` khi có thay đổi mở rộng; tăng `Z` khi chỉ sửa câu chữ, chú thích, hoặc cập nhật `status`. Hai tệp có số phiên bản riêng, tăng độc lập với nhau.

**Changelog** nằm ở phần chú thích đầu tệp. Mỗi lần thay đổi, dù nhỏ, có một dòng theo dạng: `vX.Y.Z — [Clause X, THÊM | SỬA | XÓA] <nội dung> — <lý do>`.

## Bước 2.3 — Tách riêng hai loại hợp đồng, và nguyên tắc "hộp đen" xuyên suốt cả hai

Hợp đồng tối cao gồm hai tệp riêng biệt, không gộp chung: **Data Schema** và **API Contract**. Gộp chung khiến hợp đồng dài, các trường lẫn lộn, khó tra cứu. Data Schema trả lời *dữ liệu nào đi từ đâu tới đâu*; API Contract trả lời *đi bằng cửa nào, ai được gõ cửa*.

Cả hai loại hợp đồng cùng tuân theo đúng một nguyên tắc cốt lõi: **hợp đồng là hộp đen.** Nó chỉ quan tâm workflow này mong muốn nhận gì và cam kết trả ra gì — tuyệt đối không quan tâm, không quản lý cấu trúc dữ liệu nội bộ hay cách workflow xử lý bên trong để tạo ra kết quả đó. Nếu một workflow tự làm sai điều gì đó bên trong chính nó nhưng vẫn giữ đúng những gì đã cam kết ở ranh giới, hậu quả chỉ nằm gọn trong chính nó, không lan sang workflow khác.

Ẩn dụ: một nhà hàng cam kết với khách — "chúng tôi cần một chén cơm nguội và hai quả trứng, chúng tôi sẽ trả lại một bát cơm chiên trứng." Khách không cần biết nhà hàng dùng bao nhiêu gia vị, quy trình chế biến ra sao, đó là công thức riêng của nhà hàng. Khách chỉ quan tâm nguyên liệu mình đưa vào có đúng yêu cầu không, và sản phẩm nhận lại có đúng như đã hứa không. WCA khắt khe tuyệt đối ở đúng ranh giới này — nhưng hoàn toàn dễ dãi với những gì diễn ra bên trong, vì hai lập trình viên hay hai agent khác nhau đứng trước cùng một bài toán vẫn có thể chọn hai cách giải hoàn toàn khác nhau, miễn cùng cho ra đúng kết quả đã cam kết.

⚠ Hệ quả thứ nhất: hợp đồng KHÔNG BAO GIỜ định nghĩa lại cấu trúc chi tiết của Entities. Cấu trúc dữ liệu nội bộ hoàn toàn thuộc về code, không thuộc về hợp đồng. Nếu quy trình xử lý bên trong một workflow không tối ưu, không xử lý hết các trường hợp rủi ro, hay chứa lỗi — đó là rủi ro vận hành mà chính workflow đó tự gánh chịu, hợp đồng không có trách nhiệm và cũng không có khả năng bắt được loại lỗi này.

⚠ Hệ quả thứ hai: mỗi workflow là một hệ sinh thái đóng kín, kể cả khi nhiều workflow cùng chia sẻ một hạ tầng lưu trữ vật lý. Giống như các phòng ban trong cùng một công ty, dù làm việc chung một tòa nhà, mọi giao tiếp giữa các phòng ban vẫn phải đi qua đúng người phụ trách, không có cửa sau nào khác — dữ liệu do một workflow tạo ra và ghi vào nơi lưu trữ vẫn thuộc quyền sở hữu nghiệp vụ của workflow đó, không tự động trở thành "tài sản chung" chỉ vì nó nằm trong cùng một cơ sở dữ liệu với dữ liệu khác. Bất kỳ bên nào khác, kể cả hạ tầng cắt ngang, muốn lấy dữ liệu đó đều phải đi qua đúng điểm giao tiếp mà workflow sở hữu nó công bố — không được đọc thẳng vào nơi lưu trữ chỉ vì thuận tiện về mặt kỹ thuật. (Thao tác trên toàn bộ một nơi lưu trữ mà không diễn giải nội dung bên trong, như sao lưu hay khôi phục, là một trường hợp riêng — xem [Giai đoạn 5](05-edge-cases.md), Bước 5.6.)

### Hai trục mà hợp đồng siết chặt

Mọi khai báo về workflow trong hợp đồng phục vụ một trong hai trục, và chỉ hai trục đó (phần còn lại — số phiên bản, trạng thái, changelog — chỉ phục vụ việc kiểm soát thay đổi):

- **Trục đầu vào / đầu ra** — thể hiện qua `type`: hình dạng, định dạng, ràng buộc của thứ đi qua ranh giới.
- **Trục bên cung cấp / bên tiêu thụ** — thể hiện qua `from`, `consumed_by`, `called_by`: bên nào tạo ra, bên nào nhận, bên nào được gọi.

`from` và `consumed_by` ghi **nguồn gốc và đích đến theo nghĩa nghiệp vụ**: dữ liệu này là của workflow nào, được workflow nào dùng. Còn dữ liệu được **vận chuyển** bằng đường nào — bên tiêu thụ tự gọi lấy, bên cung cấp gửi tới, hay một thành phần hạ tầng cắt ngang lấy hộ rồi chuyển tiếp — được ghi ở API Contract qua `called_by`. Hai tệp bổ sung cho nhau, không lặp lại nhau.

`consumed_by` chỉ liệt kê workflow. Việc một output được bên ngoài hệ thống (người dùng, giao diện đặt ngoài WCA) sử dụng thể hiện qua `called_by: [external]` của điểm giao tiếp trả ra nó, không thể hiện ở `consumed_by`. Vì vậy `consumed_by: none` có nghĩa là "không workflow nào tiêu thụ", không có nghĩa là "không ai dùng". Theo chiều ngược lại, dữ liệu do bên ngoài hệ thống mang vào được ghi nguồn gốc là `end_user` hoặc `third_party` trong Data Schema, và điểm giao tiếp nhận nó có `called_by: [external]` trong API Contract.

Khi một workflow **gửi** dữ liệu ra một hệ thống của tổ chức khác (ví dụ gọi một dịch vụ gửi tin nhắn), lời gọi đó là một hành động kỹ thuật trong Adapters của workflow, tuân theo tài liệu do bên thứ ba công bố; nó không được khai báo như một output trong hợp đồng nội bộ, vì hợp đồng nội bộ không quản lý được phía bên kia. Chỉ khi workflow **nhận** dữ liệu từ hệ thống đó, dữ liệu nhận về mới được khai báo với `from: third_party`.

### Mức độ chi tiết của `type` — hợp đồng ghi giao diện, không ghi công thức

Dù không ghi cấu trúc nội bộ, hợp đồng vẫn phải mô tả đủ chi tiết **hình dạng của chính input/output ở ranh giới** — đây không phải mâu thuẫn với nguyên tắc hộp đen, mà chính là nội dung cốt lõi mà hộp đen yêu cầu phải rõ ràng. Một workflow cam kết trả về "một vector 512 chiều" hay "một tệp ảnh định dạng PNG, dung lượng tối đa 20MB" — đây là hình dạng của sản phẩm giao ra, không phải công thức tạo ra nó, nên hoàn toàn cần được ghi đủ chi tiết trong trường `type`.

⚠ Ranh giới cụ thể: `type` chỉ gồm đúng phần dữ liệu mà bên tiêu thụ thực sự cần dùng tới, không liệt kê toàn bộ cấu trúc nội bộ mà workflow tạo ra output đó có thể có. Một trường dữ liệu chỉ tồn tại để phục vụ logic riêng của chính workflow sở hữu nó (ví dụ một bộ đếm số lần thử lại khi ghi dữ liệu) không bao giờ xuất hiện trong `type`, dù nó có thật trong Entities của workflow đó — vì không có workflow nào khác tiêu thụ nó.

Khi cùng một dữ liệu được các bên tiêu thụ khác nhau cần ở các mức chi tiết khác nhau (ví dụ một workflow chỉ cần mã và tên, còn giao diện cần toàn bộ thông tin), khai báo thành các output riêng, mỗi output đúng với nhu cầu của bên nhận nó. Việc này là hệ quả được mong đợi của nguyên tắc trên, không phải dấu hiệu thiết kế kém.

`consumed_by: none` không phải lý do để viết `type` sơ sài — hợp đồng cần giữ đúng form nhất quán ở mọi Mục, và một `type` chi tiết vẫn có giá trị khi cần rà soát lại sau này, dù hiện tại chưa có ai tiêu thụ.

Với `from: third_party`, `type` có thể tra cứu được từ tài liệu do bên thứ ba công bố. Với các nguồn còn lại, không có tài liệu công bố nào để tra — chính người soạn hợp đồng tự quy định `type`, rồi xác nhận lại thông qua viết, chạy thử, và sửa khi phát sinh vấn đề. Đây không phải thiếu sót của quy trình — dữ liệu nội bộ dự án vốn dĩ không có nguồn công bố nào khác ngoài chính quyết định của người tạo ra nó.

### Cú pháp của `type`

`type` là một chuỗi viết theo cú pháp tối thiểu dưới đây. Cú pháp cố ý đơn giản — đủ để hai bên đọc cùng một nghĩa, không nhằm thay thế một ngôn ngữ mô tả dữ liệu đầy đủ.

| Cú pháp | Nghĩa | Ví dụ |
|---|---|---|
| `string`, `integer`, `number`, `boolean`, `bytes` | Kiểu nguyên thủy | `integer` |
| `timestamp`, `date` | Thời điểm / ngày, theo định dạng khai báo trong `clause_a_common.formats` | `timestamp` |
| `object { tên: kiểu, … }` | Một đối tượng có **đúng** các trường đã liệt kê: mọi trường đều bắt buộc có mặt, bên gửi không gửi trường nào khác (bên nhận xử lý trường thừa ra sao: xem ⚠ ngay dưới bảng) | `object { id: string, total: integer }` |
| `list[kiểu]` | Danh sách các phần tử cùng kiểu | `list[string]` |
| `'a' \| 'b'` | Chỉ nhận một trong các giá trị liệt kê | `'incoming' \| 'refund'` |
| `kiểu\|null` | Giá trị có thể là `null`; khóa vẫn luôn có mặt | `date\|null` |
| `<tên kiểu>` | Một kiểu có tên, khai báo trong `clause_a_common.types` | `money` |
| `resource` | Một thứ được trao lúc khởi tạo và không có hình dạng dữ liệu: tài nguyên nền tảng (kết nối, mô hình đã nạp…) hoặc công cụ quản lý vòng đời do Main trao (`from: main`) | `resource` |
| `kiểu (ràng buộc)` | Ràng buộc bổ sung đặt trong ngoặc ngay sau kiểu | `string (1..120 ký tự)` |
| `… — mô tả` | Mô tả tự do, luôn đặt sau dấu gạch dài | `integer — số giây chờ tối đa` |

Một hình dạng được dùng lại ở nhiều Mục nên được khai báo một lần thành kiểu có tên trong `clause_a_common.types`, rồi các Mục tham chiếu tới tên đó.

⚠ Hợp đồng không có khái niệm "trường tùy chọn". Mọi trường liệt kê trong một `object { … }` đều phải có mặt, cả ở dữ liệu gửi vào lẫn dữ liệu trả ra; trường nào có thể không có giá trị thì ghi `kiểu|null`, và bên gửi vẫn phải gửi khóa đó với giá trị `null`. Như vậy hai bên không bao giờ phải đoán "thiếu khóa" nghĩa là gì.

⚠ **Trường thừa — một trường không được liệt kê trong `type`.** Quy tắc khác nhau tùy vai của bên đang xét, và mỗi vai chỉ có đúng một cách xử lý:

| Vai | Quy tắc |
|---|---|
| **Bên gửi** — mọi bên đưa dữ liệu qua ranh giới: bên gọi gửi input, workflow trả output | **Không bao giờ gửi** trường không được liệt kê — kể cả một trường có thật trong Entities của chính nó ([Giai đoạn 4](04-implement.md), Bước 4.2). Trường nội bộ lọt ra ranh giới là mời bên kia phụ thuộc vào thứ hợp đồng không hứa, và phá nguyên tắc hộp đen từ phía bên trong. |
| **Bên nhận input** — workflow được gọi, nhận dữ liệu bên gọi đưa vào điểm giao tiếp | **Từ chối** dữ liệu có trường thừa, bằng nhãn kết quả lỗi định dạng mà điểm giao tiếp đã khai báo. |
| **Bên tiêu thụ output** — bên nhận dữ liệu một workflow trả ra, kể cả bên ngoài hệ thống | **Bỏ qua** trường thừa: không từ chối, không coi là lỗi, và không truyền nó đi tiếp hay dùng nó vào việc gì. |

Hai quy tắc của bên nhận trông ngược nhau, nhưng là hai mặt của cùng một lý lẽ: **khắt khe ở chỗ hợp đồng không cho phép lớn lên, dễ dãi ở chỗ hợp đồng cho phép lớn lên.** Input không bao giờ lớn lên mà không phá vỡ — hợp đồng không có trường tùy chọn, nên mọi trường mới thêm vào input đều bắt buộc, và đó đã là thay đổi phá vỡ theo Bước 2.2 — nên từ chối trường thừa không làm mất gì, mà còn bắt được bên gọi viết sai tên trường ngay ở ranh giới. Output thì được phép lớn lên: thêm trường vào output là thay đổi mở rộng. Nếu bên tiêu thụ từ chối trường thừa, mọi thay đổi mở rộng như vậy lặng lẽ trở thành thay đổi phá vỡ, và việc phân loại thay đổi ở Bước 2.2 mất hết ý nghĩa.

### Giá trị của `from` — ý nghĩa chính xác

`from` của mỗi input nhận đúng một trong sáu giá trị dưới đây, hoặc một danh sách các giá trị đó khi cùng một input — cùng hình dạng — có thể đến từ nhiều nguồn:

| Giá trị | Ý nghĩa |
|---|---|
| `[tên_workflow_nguồn]` | Dữ liệu thuộc sở hữu của một workflow khác. Nếu nguồn là workflow nghiệp vụ, dữ liệu đi qua một điểm giao tiếp khai báo trong API Contract. Nếu nguồn là workflow nền tảng, đó là tài nguyên nền tảng, được Main trao khi khởi tạo. |
| `end_user` | Người dùng tương tác trực tiếp, qua bất kỳ giao diện nào. |
| `storage_layer` | Dữ liệu hạ tầng thuần túy, không thuộc quyền sở hữu nghiệp vụ của bất kỳ workflow nào (ví dụ một danh mục tĩnh nạp sẵn lúc khởi tạo). |
| `environment_config` | Giá trị workflow nhận từ Main lúc khởi tạo — dù Main đọc nó từ tệp cấu hình hay sinh ra lúc chạy (ví dụ một cổng mạng còn trống do Main của layer khởi động đầu tiên chọn). |
| `third_party` | Hệ thống của tổ chức khác, ngoài tầm kiểm soát của hợp đồng nội bộ. |
| `main` | Công cụ quản lý vòng đời do chính Main của layer tạo ra và trao cho workflow lúc khởi tạo (ví dụ công cụ dừng và khởi động lại một layer khác). `type` luôn là `resource`. |

Một workflow không cần input nào ghi `input_expected: none` — không tạo một input giả chỉ để có chỗ ghi `none`.

⚠ Phạm vi đúng của `from: main`: chỉ dành cho công cụ quản lý vòng đời, vì việc quản lý vòng đời thuộc về Main (xem [§4 của lý thuyết](wca_theory_compressed.md)). Mọi tài nguyên khác mà workflow cần nhận lúc khởi tạo phải do một workflow nền tảng chuẩn bị và ghi `from: <tên workflow nền tảng>`; một giá trị cấu hình ghi `from: environment_config`. Không dùng `from: main` để né việc tạo workflow nền tảng. Cũng không ghi một công cụ như vậy là `environment_config`: giá trị `environment_config` nằm trong Configs, còn công cụ do Main trao được đưa vào Adapters.

⚠ Phạm vi đúng của `from: storage_layer`: chỉ hợp lệ cho dữ liệu hạ tầng thuần túy. Nếu dữ liệu đang xét là output của một workflow khác, `from` phải ghi đúng tên workflow đó, không được ghi `storage_layer` — dù về mặt vật lý dữ liệu có nằm trong cùng một cơ sở dữ liệu với dữ liệu khác hay không. Nhầm lẫn giữa hai trường hợp này là cách phổ biến nhất khiến nguyên tắc hộp đen bị vi phạm một cách âm thầm, không bị phát hiện ngay.

⚠ Tài nguyên nền tảng cũng phải được khai báo ở cả hai chiều: workflow nền tảng ghi nó trong `output_guaranteed` với `consumed_by`, và **mỗi** workflow dùng nó ghi nó trong `input_expected` với `from: <tên workflow nền tảng>`. Thiếu một chiều thì phép thử ở [Giai đoạn 3](03-classify.md) không tra ra được sự phụ thuộc.

### Tham số của một lời gọi cũng là input

Mọi thứ bên gọi đưa vào một điểm giao tiếp lúc gọi — kể cả một mã định danh chỉ để chọn bản ghi nào, hay một khoảng thời gian để lọc — là input của workflow được gọi, và được khai báo trong `input_expected` của workflow đó, với `from` là nguồn gốc của giá trị ấy. Nếu bên gọi là người dùng, `from: end_user`. Nếu bên gọi là một workflow khác, giá trị đó là dữ liệu mà workflow gọi gửi đi: nó được khai báo thành một output của bên gọi, với `consumed_by` là workflow được gọi (đường push ở mục dưới). Một input có thể đến từ nhiều bên gọi cùng lúc, ghi `from` dạng danh sách.

Hạ tầng cắt ngang không bao giờ là nguồn gốc của một input: nó chỉ chuyển tiếp. `from` luôn ghi bên thực sự tạo ra giá trị (một workflow, người dùng, hoặc hệ thống của tổ chức khác), không ghi tên thành phần hạ tầng cắt ngang đã mang giá trị đó tới.

Chỉ những input mà bên gọi đưa vào **lúc gọi** mới xuất hiện trong trường `input` của một điểm giao tiếp. Input `from: environment_config`, `from: main` và tài nguyên nền tảng được Main trao lúc khởi tạo; input `from: storage_layer` do chính workflow đọc qua Adapters của nó. Cả bốn đều không phải thứ bên gọi mang tới, nên không bao giờ nằm trong `input` của điểm giao tiếp nào.

### Mỗi cặp bên cung cấp → bên tiêu thụ phải có đường đi được khai báo

Với mỗi output có `consumed_by` khác `none`, và với mỗi workflow tiêu thụ trong danh sách đó, phải tồn tại ít nhất một trong ba đường đi sau (thường chỉ cần một):

1. **Trao qua Main** — bên cung cấp là workflow nền tảng: Main trao tài nguyên nền tảng khi khởi tạo. Không cần điểm giao tiếp.
2. **Bên tiêu thụ lấy về (pull)** — bên cung cấp có một điểm giao tiếp trả ra output đó (`ref`), và `called_by` của điểm giao tiếp ấy có tên bên tiêu thụ, hoặc có tên một thành phần hạ tầng cắt ngang lấy hộ rồi chuyển tiếp tới bên tiêu thụ.
3. **Bên cung cấp gửi tới (push)** — bên tiêu thụ có một điểm giao tiếp nhận input tương ứng (liệt kê trong `input`), và `called_by` của điểm giao tiếp ấy có tên bên cung cấp, hoặc có tên một thành phần hạ tầng cắt ngang chuyển tiếp dữ liệu từ bên cung cấp tới.

Không đường nào trong ba đường trên được bỏ qua chỉ vì hai bên "cùng hệ thống" hay "cùng chung dữ liệu".

## Bước 2.4 — Khung khai báo chuẩn, áp dụng đúng như sau cho mọi dự án, không ngoại lệ

⚠ Không có trường nào khác ngoài các trường liệt kê dưới đây. Mọi trường liệt kê đều bắt buộc, trừ khi được ghi rõ là tùy chọn.

### Đầu tệp (cả hai tệp)

```yaml
schema_version: X.Y.Z          # api_version ở tệp API Contract
contract_state: draft | approved
```

### Khung Điều khoản A của Data Schema

```yaml
clause_a_common:
  lock_status: open | locked
  mandatory_rules:               # list[string] — luật chung cho mọi layer của dự án này; [] nếu không có
    - "..."
  formats:                       # định dạng chuẩn cho các kiểu có định dạng được dùng trong hợp đồng
    timestamp: "..."             # bắt buộc nếu kiểu timestamp được dùng ở bất kỳ đâu
    date: "..."                  # bắt buộc nếu kiểu date được dùng ở bất kỳ đâu
    id: "..."                    # định dạng mã định danh dùng chung, nếu có
  types:                         # kiểu có tên, dùng lại trong type của mọi Mục; {} nếu chưa có
    [tên_kiểu]: "<type theo cú pháp ở Bước 2.3>"
  shared_values:                 # giá trị ranh giới mà hai layer trở lên phải thống nhất; {} nếu không có
    [tên_giá_trị]: { value: ..., used_by: [clause_x_..., clause_y_...] }
```

`shared_values` là nơi duy nhất ghi một giá trị mà nhiều layer phải hiểu giống hệt nhau. Configs của từng layer hiện thực hóa đúng giá trị này (workflow nhận nó qua `from: environment_config`), và [Giai đoạn 6](06-self-check.md) đối chiếu giá trị thật trong Configs với con số ở đây.

### Khung Mục của Data Schema

Mỗi workflow là một Mục trong Điều khoản đúng layer của nó:

```yaml
clause_[chữ]_[layer]:
  lock_status: open | locked

  [tên_workflow]:
    tag: "[Clause X]"
    workflow_type: nghiệp_vụ | nền_tảng
    status: đang_chờ_triển_khai | đang_triển_khai | đã_hoàn_thiện
    description: "..."
    input_expected:                # hoặc: input_expected: none
      [tên_input]: { type: ..., from: ... }
    output_guaranteed:
      [tên_output]: { type: ..., consumed_by: [...] | none }
```

`input_expected` và `output_guaranteed` là các ánh xạ không giới hạn số phần tử; `input_expected` được ghi `none` khi workflow không cần input nào. Tên input là duy nhất trong một Mục. Tên output là duy nhất trong toàn tệp, vì API Contract tham chiếu tới output bằng tên.

Không có `owner_workflow` (đã trùng với chính khóa `[tên_workflow]`). Không có `entities` hay bất kỳ trường nào định nghĩa lại cấu trúc dữ liệu nội bộ.

### Khung Điều khoản A của API Contract

```yaml
clause_a_common:
  lock_status: open | locked
  endpoint_forms:                # các hình thức điểm giao tiếp dự án dùng, kèm quy ước viết address
    [tên_hình_thức]: "<cách gọi, và address được viết thế nào>"
  error_codes:
    - code: ERR_...
      meaning: "..."
  error_body: "<type theo cú pháp ở Bước 2.3 — hình dạng dữ liệu trả về khi có lỗi>"
  cross_cutting:                 # mọi thành phần hạ tầng cắt ngang của hệ thống; {} nếu không có
    [tên_thành_phần]:
      layer: clause_x_...        # layer hệ thống nơi thành phần chạy
      trigger: "..."             # khi nào nó hoạt động
      description: "..."         # nó làm gì — chỉ việc kỹ thuật, không quyết định nghiệp vụ
      entries:                   # tùy chọn — chỉ khi bên ngoài hệ thống gọi thẳng vào thành phần này
        [tên_lối_vào]:
          form: [một khóa trong endpoint_forms]
          address: "..."
          called_by: [external]
          input: { [tên]: "<type>" } | none
          output:
            [nhãn_kết_quả]: { type: "<type>" | none }
            [nhãn_kết_quả]: { code: [mã trong error_codes] }
```

`entries` chỉ có mặt khi bên ngoài hệ thống gọi thẳng vào thành phần hạ tầng cắt ngang cho một việc **trình bày** thuần túy mà chỉ layer nơi nó chạy làm được (ví dụ mở hộp thoại chọn tệp của hệ điều hành — xem [§5 của lý thuyết](wca_theory_compressed.md)). Mỗi lối vào có đúng các trường của một điểm giao tiếp, với một khác biệt: vì hạ tầng cắt ngang không sở hữu dữ liệu và không có Mục trong Data Schema, `input` và `output` ghi hình dạng trực tiếp theo cú pháp `type` ở Bước 2.3, thay vì trỏ tên sang Data Schema. Đây là chỗ duy nhất trong API Contract được ghi `type` trực tiếp. Nếu dữ liệu một lối vào trả về sau đó đi vào một workflow, nó đi vào như một input `from: end_user` qua điểm giao tiếp của chính workflow đó — không bao giờ chuyển thẳng từ lối vào này sang workflow.

`endpoint_forms` là chỗ duy nhất gắn hợp đồng với công nghệ, và do chính dự án khai báo. Ví dụ một dự án có thể khai báo `http` (address dạng `"<METHOD> <path>"`), `in_process` (address là tên hàm Routers), hay một kênh liên tiến trình — hình thức nào cũng được, miễn quy ước viết address được ghi rõ ở đây.

### Khung Mục của API Contract

Mỗi workflow có điểm giao tiếp là một Mục; toàn bộ điểm giao tiếp của cùng một workflow gom vào chung một Mục:

```yaml
clause_[chữ]_[layer]:
  lock_status: open | locked

  [tên_workflow]:
    tag: "[Clause X]"
    endpoints:
      [tên_endpoint]:              # tên định danh, duy nhất trong Mục — không phải địa chỉ
        form: [một khóa trong clause_a_common.endpoint_forms]
        address: "..."             # viết theo đúng quy ước của form
        called_by: [...]           # workflow | thành phần trong cross_cutting | external — không bao giờ là Main
        input: [...] | none        # tên các input trong input_expected của cùng workflow ở Data Schema
        output:
          [nhãn_kết_quả]: { ref: [tên_output] | "list[tên_output]" | none }
          [nhãn_kết_quả]: { code: [mã trong error_codes] }
```

**Nhãn kết quả** dùng quy ước mã trạng thái HTTP (200, 201, 400, 404…) cho **mọi** hình thức điểm giao tiếp, kể cả khi điểm giao tiếp không đi qua mạng: đây là một bộ nhãn quen thuộc để hai bên hiểu cùng một nghĩa, không phải một ràng buộc về công nghệ.

**`input`** chỉ liệt kê tên, không định nghĩa lại hình dạng — hình dạng đã có ở Data Schema. Đây là chỗ nối điểm giao tiếp với input, đối xứng với `ref` nối điểm giao tiếp với output.

**`ref`** trỏ tới đúng một output đã khai báo ở Data Schema, của chính workflow này. Nếu điểm giao tiếp trả về nhiều phần tử cùng hình dạng, viết `"list[tên_output]"` — có dấu ngoặc kép, vì trong YAML dấu `[` bên trong `{ … }` sẽ bị hiểu thành một danh sách. Quy tắc này áp dụng cho mọi giá trị `type` có chứa `[` hoặc `{`: luôn đặt trong ngoặc kép. Nếu điểm giao tiếp không trả dữ liệu, viết `none`.

⚠ Không có `method` riêng (đã nằm trong quy ước `address` của từng hình thức). Không có `implemented_by`, `owner_workflow`, `workflow_type`, `description` — đã có sẵn ở Data Schema, không định nghĩa lặp.

### Workflow nào có mặt trong API Contract

**Mọi điểm giao tiếp mà có bên ngoài gọi tới đều phải được khai báo** — dù bên gọi là người dùng, một workflow khác, hay hạ tầng cắt ngang, và dù điểm giao tiếp mang hình thức nào. Điểm giao tiếp là một phần của ranh giới: nếu hình dạng lời gọi thay đổi, bên gọi sẽ vỡ — nên nó thuộc phạm vi hợp đồng. Cùng lý do đó, lối vào mà bên ngoài hệ thống gọi thẳng vào hạ tầng cắt ngang được khai báo trong `entries` của thành phần đó.

`called_by` không bao giờ ghi Main: Main trao những gì workflow cần lúc khởi tạo, nhưng không gọi workflow nào lúc hệ thống đang chạy. Việc Main của một layer chờ layer khác sẵn sàng là tín hiệu giữa Main với Main (xem [§4 của lý thuyết](wca_theory_compressed.md)), không phải một điểm giao tiếp; hình thức của tín hiệu đó được ghi trong `clause_a_common.mandatory_rules` của Data Schema.

Hệ quả: một workflow **vắng mặt** trong API Contract khi và chỉ khi nó không có lớp Routers — tức là một workflow nền tảng chỉ được Main kích hoạt, không ai gọi lại. Một workflow nền tảng có Routers tối giản (xem [Giai đoạn 3](03-classify.md), Bước 3.3) thì có mặt như mọi workflow khác. Mỗi workflow vắng mặt được ghi một dòng chú thích nêu lý do ngay trong Điều khoản của nó. Mọi Điều khoản có trong Data Schema đều có Điều khoản cùng khóa trong API Contract — kể cả khi không workflow nào của layer đó có điểm giao tiếp, Điều khoản vẫn có mặt với `lock_status` và dòng chú thích.

## Bước 2.5 — Viết nội dung, giữ đúng kỷ luật không tùy tiện

Với từng workflow, điền vào đúng khung đã quy định ở Bước 2.4, đặt vào đúng Điều khoản đã xác định ở Bước 2.1, dựa trên bản ghi input/output sơ bộ đã có từ Giai đoạn 1. Với mỗi giá trị được viết vào, tự hỏi liệu nó có thực sự cần thiết cho đúng workflow này, hay đang được thêm vào vì cảm thấy hợp lý lúc viết — đây là bước hoàn toàn dựa vào sự tự giác, không có quy tắc máy móc nào thay được người viết ở đây.

Nếu trong lúc soạn phát hiện danh sách workflow cần thay đổi (thêm, bớt, đổi tên, đổi layer), áp dụng quy tắc quay lui: cập nhật lại đầu ra của Giai đoạn 1 để phản ánh thay đổi đó, không chỉ ghi nhận nó trong hợp đồng.

**Checklist:**

- [ ] Mọi workflow trong danh sách từ Giai đoạn 1 đều có đúng một Mục trong Data Schema, đặt đúng Điều khoản của layer nó thuộc về.
- [ ] Cả hai tệp có đủ phần đầu tệp (`schema_version`/`api_version`, `contract_state`) và Điều khoản A đúng khung.
- [ ] Mọi Mục trong cả hai tệp đều viết đúng khung ở Bước 2.4 — không thiếu trường bắt buộc, không thêm trường ngoài khung.
- [ ] Mỗi Điều khoản đều có `lock_status`.
- [ ] Mọi `type` viết đúng cú pháp ở Bước 2.3; hình dạng dùng lại nhiều lần đã được khai báo thành kiểu có tên.
- [ ] Với mỗi `type` đã viết, xác nhận nó đủ chi tiết để bên tiêu thụ đọc đúng dữ liệu, nhưng không mở rộng thành một định nghĩa Entities đầy đủ — chỉ gồm đúng phần dữ liệu thực sự được tiêu thụ.
- [ ] **Với mỗi giá trị `from: storage_layer` đã viết, xác nhận dữ liệu đó thực sự không thuộc sở hữu của bất kỳ workflow nào — nếu nó là output của một workflow cụ thể, đã sửa lại `from` thành đúng tên workflow đó.**
- [ ] **`from` và `consumed_by` khớp nhau ở cả hai chiều: mỗi tên trong `consumed_by` đều có một input `from` trỏ ngược lại, và ngược lại — kể cả với tài nguyên nền tảng.**
- [ ] **Với mỗi cặp bên cung cấp → bên tiêu thụ, xác nhận có ít nhất một trong ba đường đi (trao qua Main, pull, push) được khai báo.**
- [ ] Mọi giá trị mà hai layer trở lên phải thống nhất đều nằm trong `shared_values`, không bị ghi rải rác ở từng Điều khoản.
- [ ] Mọi thành phần hạ tầng cắt ngang xuất hiện trong `called_by` đều đã được khai báo trong `cross_cutting`, và không có `from` nào ghi tên một thành phần hạ tầng cắt ngang.
- [ ] Mỗi input `from: end_user`, `from: third_party`, hoặc đến từ workflow khác theo đường push, đều xuất hiện trong `input` của ít nhất một điểm giao tiếp; không điểm giao tiếp nào liệt kê trong `input` một input mà bên gọi không mang tới (`environment_config`, `main`, `storage_layer`, tài nguyên nền tảng).
- [ ] Mỗi input `from: main` là một công cụ quản lý vòng đời, có `type: resource`; không có tài nguyên nào khác được ghi `from: main`.
- [ ] Không `called_by` nào ghi Main. Nếu hệ thống có nhiều layer, hình thức tín hiệu sẵn sàng giữa các Main đã được ghi trong `mandatory_rules`.
- [ ] Mỗi lối vào mà bên ngoài hệ thống gọi thẳng vào hạ tầng cắt ngang đều đã có trong `entries` của thành phần đó, chỉ phục vụ việc trình bày.
- [ ] Mọi tham số mà bên gọi đưa vào một điểm giao tiếp đều đã được khai báo thành input của workflow được gọi.
- [ ] Mọi điểm giao tiếp có bên ngoài gọi tới đều có mặt trong API Contract; mỗi workflow vắng mặt có dòng chú thích nêu lý do; mọi Điều khoản của Data Schema đều có Điều khoản cùng khóa trong API Contract.
- [ ] Đã tự rà lại từng giá trị đã viết ở Bước 2.5, xác nhận không có chi tiết nào được thêm vào một cách tùy tiện.

⚠ Quy tắc quay lui: nếu ở [Giai đoạn 4](04-implement.md) trở đi phát hiện cần một giá trị, một điểm giao tiếp chưa có trong hợp đồng, không tự ý thêm vào code trước — quay lại Giai đoạn 2, bổ sung theo đúng khung đã quy định, rồi mới viết code phản ánh đúng bổ sung đó.

---

## Minh họa — áp dụng vào hệ thống đặt lịch hẹn

⚠ Lưu ý trước khi đọc phần này: cấu trúc phân tầng cụ thể dưới đây (số lượng Điều khoản, các hình thức điểm giao tiếp, các luật chung) là một cách hiện thực hóa cho đúng một bài toán nhỏ — một hệ thống khác có thể cần nhiều Điều khoản hơn, hình thức điểm giao tiếp khác hẳn. Nhưng khung khai báo của từng phần, dù hệ thống nào, đều phải giữ đúng các trường đã quy định ở Bước 2.4, không thay đổi.

Ba workflow từ Giai đoạn 1, cùng một layer `backend`: `scaffold` (nền tảng — nhận chuỗi kết nối từ cấu hình, chuẩn bị kết nối cho `book_appointment` và `send_reminder`), `book_appointment` (nghiệp vụ — nhận thông tin người dùng và thời điểm hẹn từ người dùng, cam kết trả bản ghi lịch hẹn cho `send_reminder`), `send_reminder` (nghiệp vụ — nhận danh sách lịch hẹn sắp tới **từ chính `book_appointment`**, cam kết trả xác nhận đã gửi, hiện chưa ai tiêu thụ). Một thành phần hạ tầng cắt ngang, `background_jobs`, quét định kỳ: lấy lịch hẹn sắp tới từ `book_appointment` rồi chuyển cho `send_reminder` (xem [Giai đoạn 5](05-edge-cases.md)).

**`data_schema.yaml`**

```yaml
# =============================================================================
# DATA SCHEMA — HỆ THỐNG ĐẶT LỊCH HẸN
# =============================================================================
# Clause A = Chung. Clause B = Layer backend (MỞ).
#
# Changelog:
#   v1.0.0 — [Toàn tệp, THÊM] Khởi tạo hợp đồng.
#   v1.0.1 — [Clause B, SỬA] send_reminder.input_expected.upcoming_appointments
#            đổi from: storage_layer thành from: book_appointment — dữ liệu
#            lịch hẹn thuộc quyền sở hữu của book_appointment, không phải
#            dữ liệu hạ tầng chung, nên không được đọc thẳng từ nơi lưu trữ.
# =============================================================================

schema_version: 1.0.1
contract_state: approved

clause_a_common:
  lock_status: locked
  mandatory_rules:
    - "Dữ liệu do một workflow tạo ra chỉ được lấy qua điểm giao tiếp mà workflow đó công bố."
  formats:
    timestamp: "ISO 8601, có múi giờ"
    date: "ISO 8601, chỉ ngày"
    id: "UUID v4, chuỗi chữ thường"
  types:
    appointment_record: "object { appointment_id: string, user_id: string, scheduled_at: timestamp }"
  shared_values: {}

clause_b_backend:
  lock_status: open

  scaffold:
    tag: "[Clause B]"
    workflow_type: nền_tảng
    status: đã_hoàn_thiện
    description: "Khởi tạo kết nối tới nơi lưu trữ lịch hẹn khi layer backend khởi động"
    input_expected:
      connection_string: { type: string, from: environment_config }
    output_guaranteed:
      db_connection:
        type: "resource — kết nối đang mở tới nơi lưu trữ lịch hẹn"
        consumed_by: [book_appointment, send_reminder]

  book_appointment:
    tag: "[Clause B]"
    workflow_type: nghiệp_vụ
    status: đang_triển_khai
    description: "Người dùng đặt một lịch hẹn mới"
    input_expected:
      db_connection: { type: resource, from: scaffold }
      user_id: { type: string, from: end_user }
      scheduled_at: { type: timestamp, from: end_user }
    output_guaranteed:
      # type ghi đúng những trường mà send_reminder thực sự cần đọc —
      # không liệt kê thêm bất kỳ trường nội bộ nào khác mà book_appointment
      # có thể đang dùng riêng cho chính nó.
      appointment:
        type: appointment_record
        consumed_by: [send_reminder]

  send_reminder:
    tag: "[Clause B]"
    workflow_type: nghiệp_vụ
    status: đang_chờ_triển_khai
    description: "Gửi tin nhắn nhắc nhở trước giờ hẹn; được background_jobs kích hoạt, không phải book_appointment"
    input_expected:
      db_connection: { type: resource, from: scaffold }
      # from: book_appointment — dữ liệu này là output do book_appointment
      # sở hữu. Nó được background_jobs lấy qua điểm giao tiếp của
      # book_appointment rồi chuyển tới đây (đường vận chuyển ghi ở
      # API Contract), không được đọc thẳng từ nơi lưu trữ.
      upcoming_appointments:
        type: "list[appointment_record]"
        from: book_appointment
    output_guaranteed:
      # consumed_by: none — hiện chưa workflow nào tiêu thụ, nhưng vẫn ghi
      # type đầy đủ để giữ đúng form nhất quán và phục vụ rà soát về sau.
      reminder_log:
        type: "object { appointment_id: string, sent_at: timestamp }"
        consumed_by: none
```

**`api_contract.yaml`**

```yaml
# =============================================================================
# API CONTRACT — HỆ THỐNG ĐẶT LỊCH HẸN
# =============================================================================
# Cùng quy ước Clause như data_schema.yaml.
#
# Changelog:
#   v1.0.0 — [Toàn tệp, THÊM] Khởi tạo hợp đồng.
#   v1.0.1 — [Clause B, THÊM] book_appointment.list_upcoming — để
#            background_jobs lấy lịch hẹn sắp tới đúng cách, không đọc
#            thẳng từ nơi lưu trữ.
# =============================================================================

api_version: 1.0.1
contract_state: approved

clause_a_common:
  lock_status: locked
  endpoint_forms:
    http: "Gọi qua mạng. address có dạng '<METHOD> <path>'."
    in_process: "Gọi hàm Routers trong cùng tiến trình. address là tên hàm."
  error_codes:
    - code: ERR_VALIDATION
      meaning: "Đầu vào thiếu hoặc sai định dạng"
    - code: ERR_NOT_FOUND
      meaning: "Không tìm thấy tài nguyên"
  error_body: "object { code: string, message: string, details: object|null }"
  cross_cutting:
    background_jobs:
      layer: clause_b_backend
      trigger: "Mỗi 5 phút, trong suốt thời gian layer backend chạy"
      description: "Lấy lịch hẹn sắp tới từ book_appointment rồi chuyển cho send_reminder. Không lọc, không quyết định."

clause_b_backend:
  lock_status: open
  # scaffold không xuất hiện — workflow nền tảng không có Routers,
  # chỉ Main kích hoạt một lần khi khởi động.

  book_appointment:
    tag: "[Clause B]"
    endpoints:
      create_appointment:
        form: http
        address: "POST /appointments"
        called_by: [external]
        input: [user_id, scheduled_at]
        output:
          201: { ref: appointment }
          400: { code: ERR_VALIDATION }
      list_upcoming:
        form: in_process
        address: "list_upcoming_appointments"
        called_by: [background_jobs]
        input: none
        output:
          200: { ref: "list[appointment]" }

  send_reminder:
    tag: "[Clause B]"
    endpoints:
      send_for_upcoming:
        form: in_process
        address: "send_reminders"
        called_by: [background_jobs]
        input: [upcoming_appointments]
        output:
          200: { ref: "list[reminder_log]" }
```

**Đối chiếu lại:**

- **Cấu trúc ba tầng (Bước 2.1):** thể hiện qua `clause_a_common` và `clause_b_backend` ở cả hai tệp.
- **Kiểm soát thay đổi (Bước 2.2):** thể hiện qua `contract_state`, `lock_status` và changelog.
- **Nguyên tắc hộp đen (Bước 2.3):** `appointment_record` chỉ ghi đúng ba trường mà `send_reminder` tiêu thụ.
- **`from` và `consumed_by` khớp hai chiều:** kể cả `db_connection`, được khai báo ở cả `scaffold` lẫn hai workflow dùng nó.
- **Ba đường đi:**
  - `db_connection` được trao qua Main.
  - `appointment` → `send_reminder` đi theo đường pull: `background_jobs` gọi `list_upcoming` rồi chuyển tiếp qua `send_for_upcoming`. `from: book_appointment` ghi nguồn gốc nghiệp vụ, còn `called_by` ghi đường vận chuyển.
- **Workflow vắng mặt trong API Contract:** chỉ có `scaffold`, vì nó không có Routers. `send_reminder` có mặt, vì `background_jobs` gọi tới nó — điểm giao tiếp không đi qua mạng vẫn là một phần của ranh giới.