# GIAI ĐOẠN 1 — PHÂN RÃ ĐỀ BÀI THÀNH WORKFLOW

*Giai đoạn thứ hai trong quy trình triển khai WCA, sau khi đã hoàn thành [Giai đoạn 0](00-prep.md). Xem [SKILL.md](SKILL.md) để biết toàn bộ các giai đoạn. Thuật ngữ dùng trong tệp này theo đúng định nghĩa tại [§0 của lý thuyết](wca_theory_compressed.md).*

| | |
|---|---|
| **Input** | Đề bài thô (mô tả hệ thống bằng ngôn ngữ tự nhiên — có thể là mô tả sơ sài từ một người không có chuyên môn kỹ thuật, hoặc một đặc tả chi tiết từ một lập trình viên có kinh nghiệm; cả hai dạng đề bài đều cần được phân rã theo đúng cách tư duy như nhau). |
| **Hành động** | Sáu bước tư duy theo đúng thứ tự bên dưới, đi từ toàn cảnh tới chi tiết, kết thúc bằng việc xác định rõ từng workflow nhận gì, cam kết trả ra gì, và chạy trong layer hệ thống nào. |
| **Output** | Danh sách workflow, mỗi workflow có tên, một câu mô tả, phân loại (nền tảng/nghiệp vụ), một câu lý do cho phân loại đó, bản ghi sơ bộ về input mong muốn cùng output cam kết của workflow đó, và layer hệ thống mà workflow thuộc về. |

## Bước 1.1 — Đọc toàn cảnh

Đọc trọn đề bài, chưa phân tích gì. Mục đích: nắm được hệ thống phục vụ ai, giải quyết vấn đề gì, ở tầm nhìn cao nhất, trước khi đi vào chi tiết bất kỳ hành động cụ thể nào.

## Bước 1.2 — Nhận diện mọi hành động nghiệp vụ có thể có

Đây không phải bước "liệt kê theo một công thức cố định", mà là bước tư duy: đọc đề bài với tâm thế của một người đang tìm ra **mọi việc hệ thống thực sự phải làm**, không chỉ những gì được viết thành câu tường minh.

Một hành động nghiệp vụ có thể xuất hiện dưới nhiều hình thức khác nhau trong văn bản đề bài — có thể là một câu mô tả rõ ràng, có thể ẩn trong một điều kiện, một ràng buộc, một giả định ngầm mà đề bài coi là hiển nhiên nên không nhắc tới. Nhiệm vụ ở bước này là đọc xuyên qua câu chữ để tìm ra toàn bộ hành động thật sự cần tồn tại, kể cả những hành động chưa từng được viết thành một câu riêng.

Kết quả của bước này chỉ là một danh sách thô, chưa cần chính xác tuyệt đối về ranh giới — mục tiêu là không bỏ sót, chấp nhận dư còn hơn thiếu. Bước này và Bước 1.3 quan trọng ngang nhau: bỏ sót một ứng viên ở đây thì bước sau không có gì để phân định; phân định sai ở bước sau thì danh sách thô ở đây cũng vô nghĩa.

## Bước 1.3 — Phân định ranh giới của từng workflow

Đây là bước tư duy quan trọng nhất, và không có một công thức cứng nào áp dụng đúng cho mọi trường hợp. Nguyên lý cốt lõi cần giữ trong đầu xuyên suốt bước này: một workflow là một hành động nghiệp vụ đủ trọn vẹn để đứng một mình — nó có thể bắt đầu, kết thúc, và mang lại một kết quả rõ ràng, mà không cần một hành động nào khác phải xảy ra cùng lúc hay cùng một cách mới có ý nghĩa.

Với mỗi ứng viên đã liệt kê ở Bước 1.2, và với mỗi cặp ứng viên có khả năng liên quan tới nhau, tự đặt ra những câu hỏi phù hợp với đúng bối cảnh cụ thể đang xét — không có một bộ câu hỏi cố định nào bao phủ được mọi tình huống. Một số câu hỏi thường hữu ích để tự vấn, tùy tình huống: hành động này có ý nghĩa nếu đứng một mình không, hay nó chỉ là một mảnh của một hành động lớn hơn? Hai hành động này có luôn phải xảy ra cùng nhau không, hay có tình huống chỉ cần một trong hai? Sự khác biệt giữa hai ứng viên này nằm ở bản chất nghiệp vụ, hay chỉ nằm ở hình thức tiếp nhận yêu cầu?

Một câu hỏi khác, ngày càng quan trọng khi đề bài mô tả sơ sài: ứng viên này có tạo ra một kết quả cụ thể mà một hành động khác cần dùng đến không, hay nó chỉ đơn thuần mô tả một trạng thái mà không có bất kỳ ai tiêu thụ? Nếu một "hành động" được liệt kê nhưng không hề tạo ra hay tiêu thụ bất cứ thứ gì, đây là dấu hiệu nó có thể chưa thực sự là một hành động nghiệp vụ, mà chỉ là một mô tả bối cảnh.

Một tình huống gặp rất thường xuyên, cần được cân nhắc có chủ đích thay vì theo quán tính: nhiều thao tác trên cùng một loại dữ liệu — tạo mới, sửa, xem, lưu trữ. Áp đúng phép thử "đứng một mình được không", mỗi thao tác đều có thể đứng một mình; nhưng gom chúng lại cũng có lý do chính đáng. Câu hỏi quyết định không phải "chúng có cùng một loại dữ liệu không" — gom theo loại dữ liệu chính là lối chia theo domain mà WCA không đi theo — mà là: các thao tác này có cùng một chủ sở hữu dữ liệu, cùng những quy tắc nghiệp vụ, cùng những bên tiêu thụ hay không? Khi cả ba cùng trùng, việc gom thành một workflow phản ánh đúng một ranh giới sở hữu duy nhất. Khi một thao tác mang quy tắc nghiệp vụ riêng, vòng đời riêng, hoặc có bên tiêu thụ khác biệt (ví dụ "hủy đơn" kéo theo hoàn tiền và dừng các nhắc nhở), đó là dấu hiệu nó xứng đáng tách thành workflow riêng. Dù chọn gom hay tách, ghi lý do vào cột lý do phân loại — quyết định này sẽ được các giai đoạn sau dựa vào.

Đây là những ví dụ về loại câu hỏi nên tự đặt ra, không phải một danh sách đóng cần trả lời tuần tự — bối cảnh thực tế của từng đề bài có thể đòi hỏi những câu hỏi khác hẳn, chưa từng được liệt kê ở đây.

## Bước 1.4 — Xác định workflow nền tảng và ghi lý do phân loại

Sau khi đã chốt được ranh giới các workflow nghiệp vụ, quay lại tự hỏi ở tầm hệ thống: có tồn tại một điều kiện nào phải được thỏa mãn trước khi bất kỳ workflow nghiệp vụ nào ở trên có thể tồn tại (được Main khởi tạo) không? Điều kiện đó thường không được đề bài nhắc tới tường minh, vì nó thuộc về hạ tầng vận hành, không phải nghiệp vụ mà người dùng cuối trực tiếp yêu cầu — đây chính là lý do bước này dễ bị bỏ sót nhất trong cả sáu bước, và cũng là lý do cần chủ động đi tìm, không chờ đề bài tự nhắc tới. Một workflow nền tảng thường không hiện diện thành một câu mô tả nào trong đề bài cả — nó chỉ hiện diện khi tự đặt câu hỏi "cần gì để những workflow kia chạy được".

⚠ Mức độ ảnh hưởng khi gỡ bỏ một workflow không phải tiêu chí để phân loại nó là nền tảng. Một workflow nghiệp vụ hoàn toàn có thể là nơi nhiều workflow khác phụ thuộc vào kết quả của nó, khiến việc gỡ nó gây ảnh hưởng lan rộng — nhưng nếu các workflow đó vẫn tồn tại được, chỉ là không còn nhận được thứ chúng cần để vận hành đúng, đây vẫn là workflow nghiệp vụ. Chỉ khi các workflow khác không còn cách nào để tồn tại — không thể được khởi tạo, dù có được gọi tới hay không — đây mới là dấu hiệu của workflow nền tảng (xem định nghĩa "tồn tại / vận hành" tại [§0 của lý thuyết](wca_theory_compressed.md)).

Với mỗi workflow trong danh sách cuối cùng, viết một câu lý do tường minh cho phân loại của nó. Việc buộc phải viết ra lý do, thay vì chỉ gắn nhãn, là cách tự kiểm tra xem phân loại đó có thực sự vững hay chỉ là một phỏng đoán chưa được suy nghĩ thấu đáo.

## Bước 1.5 — Xác định input mong muốn và output cam kết cho từng workflow

Đây là bước không thể bỏ qua, dù đề bài có mô tả chi tiết đến đâu hay sơ sài đến đâu. Với mỗi workflow trong danh sách cuối cùng, tự hỏi hai câu hỏi tách biệt nhau:

Thứ nhất, workflow này **mong muốn** được cung cấp điều gì để bắt đầu hoạt động — dữ liệu đó đến từ đâu? Có thể từ người dùng cuối tương tác trực tiếp, từ kết quả mà một workflow khác đã tạo ra, từ dữ liệu hạ tầng thuần túy không thuộc workflow nào (ví dụ một danh mục tĩnh), từ một giá trị cấu hình, từ một công cụ quản lý vòng đời mà Main trao (ví dụ để dừng và khởi động lại một layer khác), hoặc từ một hệ thống của tổ chức khác không thuộc quyền kiểm soát của dự án. Dữ liệu đang nằm trong nơi lưu trữ mà do một workflow tạo ra thì nguồn của nó là chính workflow đó, không phải "nơi lưu trữ". Chữ "mong muốn" ở đây có chủ đích: workflow không tự kiểm soát được nguồn cung cấp đó có tới đúng lúc, đúng chất lượng hay không — nó chỉ có thể đặt ra kỳ vọng và chờ được đáp ứng.

Thứ hai, workflow này **cam kết** trả về điều gì sau khi xử lý xong — và nếu biết trước, kết quả đó sẽ được ai tiêu thụ tiếp theo? Chữ "cam kết" ở đây cũng có chủ đích, đối lập với "mong muốn": đây là phần duy nhất workflow tự kiểm soát hoàn toàn, tự chịu trách nhiệm đảm bảo đúng như đã hứa.

Một workflow hoàn toàn có thể mong muốn nhiều hơn một nguồn input, và cam kết nhiều hơn một output — không có giới hạn về số lượng ở bước này.

⚠ Việc ghi nhận input/output ở bước này chỉ cần đủ để xác định NGUỒN GỐC và ĐÍCH ĐẾN, chưa cần định dạng kỹ thuật chi tiết (kiểu dữ liệu cụ thể, cấu trúc từng trường) — mức độ chi tiết đó thuộc về Giai đoạn 2. Nhưng việc xác định "workflow này lấy gì từ đâu, đưa gì cho ai" là bắt buộc phải làm ở chính bước này, không được để trống rồi tính sau — vì đây chính là dữ liệu thô mà Giai đoạn 2 sẽ dùng để soạn hợp đồng, và cũng là công cụ để tự kiểm tra lại phân loại đã làm ở Bước 1.4: nếu một workflow "nghiệp vụ" không nhận gì từ ai — kể cả người dùng — và không trả gì cho ai — kể cả người dùng — đáng quay lại xem xét liệu nó có thực sự là một hành động nghiệp vụ, hay chỉ là một mảnh của workflow khác, hoặc một mô tả bối cảnh.

Nếu trong lúc xác định input/output phát hiện một hành động không khớp nhịp "tiếp nhận — xử lý — trả kết quả ngay" (ví dụ một việc phải xảy ra theo thời gian, sau khi người yêu cầu đã nhận phản hồi), ghi nhận ngay điều đó và tham khảo [Giai đoạn 5](05-edge-cases.md) từ bây giờ: ai khởi kích hành động đó sẽ ảnh hưởng trực tiếp tới hình dạng hợp đồng ở Giai đoạn 2, nên không đợi tới lúc viết code mới quyết định.

## Bước 1.6 — Gán từng workflow vào layer hệ thống

Hợp đồng ở Giai đoạn 2 được tổ chức theo layer hệ thống, nên mỗi workflow cần biết mình chạy ở đâu trước khi bước vào Giai đoạn 2. Bước này dựa trên các ranh giới công nghệ đã được quyết định cho dự án (ngôn ngữ, tiến trình, runtime) — nếu những ranh giới đó chưa được quyết định, đây là lúc phải quyết định, không để trôi sang Giai đoạn 2.

Với mỗi workflow, tự hỏi: năng lực mà nó cần để hoàn thành hành động (dữ liệu nó sở hữu, công cụ nó dùng) nằm ở layer nào? Nếu câu trả lời là "ở hai layer khác nhau" — ví dụ một hành động vừa cần dữ liệu do backend sở hữu, vừa cần một engine chỉ chạy trong một dịch vụ riêng — đây không phải một workflow nằm vắt qua hai layer, mà là tín hiệu cần quay lại Bước 1.3 để tách thành các workflow riêng ở từng layer, giao tiếp với nhau qua hợp đồng.

Layer nào cũng cần được soi lại bằng câu hỏi của Bước 1.4: layer này có điều kiện gì cần chuẩn bị trước khi các workflow của nó hoạt động được không? Nếu có, nó cần một workflow nền tảng riêng; nếu không có gì cần chuẩn bị, không tạo workflow nền tảng chỉ để cho đủ. Việc khởi động, chờ sẵn sàng và dừng các layer khác là việc của Main (xem [§4 của lý thuyết](wca_theory_compressed.md)), không phải một workflow.

**Checklist:**
- [ ] Đã đọc đề bài với tâm thế tìm ra hành động ẩn, không chỉ liệt kê những câu mô tả tường minh.
- [ ] Với mỗi workflow trong danh sách cuối cùng, có thể giải thích được vì sao nó xứng đáng đứng độc lập, không phải một mảnh của workflow khác.
- [ ] Đã tự đặt câu hỏi phù hợp cho từng cặp ứng viên có khả năng liên quan, không áp dụng máy móc một công thức cố định cho mọi trường hợp.
- [ ] **Đã chủ động tự hỏi liệu hệ thống có cần một điều kiện khởi tạo nào đó không, thay vì chỉ dừng lại ở những gì đề bài nhắc tới tường minh — đây là bước dễ bỏ sót nhất trong cả sáu bước.**
- [ ] Mọi workflow đều có kèm một câu lý do cho phân loại, không chỉ có nhãn đứng một mình.
- [ ] **Với mỗi workflow, đã ghi nhận rõ nó mong muốn nhận gì, từ nguồn nào, và cam kết trả ra gì, cho ai tiêu thụ — không có workflow nào bị bỏ trống phần này.**
- [ ] Với các nhóm thao tác trên cùng một loại dữ liệu, quyết định gom hay tách đã được đưa ra có chủ đích, kèm lý do, không theo quán tính.
- [ ] Mọi workflow đều đã được gán vào đúng một layer hệ thống; không có workflow nào cần năng lực của hai layer cùng lúc.

⚠ Quy tắc quay lui: nếu ở [Giai đoạn 2](02-contract.md) trở đi phát hiện danh sách workflow còn thiếu sót, sai ranh giới, hoặc thiếu thông tin input/output cần thiết để soạn hợp đồng, quay lại đúng Giai đoạn 1, thực hiện lại từ bước tương ứng cho phần đề bài liên quan tới phát hiện mới. Sau khi quay lui, cập nhật lại chính đầu ra của Giai đoạn 1 (bảng danh sách workflow) để phản ánh thay đổi — không chỉ ghi nhận thay đổi ở giai đoạn đang làm dở.

---

## Minh họa — áp dụng vào một bài toán cụ thể: hệ thống đặt lịch hẹn

⚠ Lưu ý trước khi đọc phần minh họa: đây chỉ là MỘT ví dụ cụ thể, không phải khuôn mẫu duy nhất. Một đề bài khác, một hệ thống khác, hoàn toàn có thể được phân rã thành một hình thái workflow khác hẳn, tùy vào bản chất thật của nghiệp vụ trong đề bài đó. Điều cần học từ phần minh họa này là cách tư duy đã trình bày ở sáu bước trên, không phải để ghi nhớ đúng ba workflow cụ thể dưới đây rồi áp dụng lại y hệt cho một bài toán khác.

Đề bài: *"Xây dựng một hệ thống cho phép người dùng đặt lịch hẹn với một dịch vụ. Hệ thống cần: người dùng đặt được một lịch hẹn mới, và hệ thống tự động gửi một tin nhắn nhắc nhở trước giờ hẹn."*

**Bước 1.1:** Hệ thống phục vụ người dùng cuối, mục đích là quản lý việc đặt lịch hẹn với một dịch vụ.

**Bước 1.2:** Đọc kỹ, nhận diện được hai hành động tường minh: "đặt lịch hẹn mới", "gửi tin nhắn nhắc nhở". Đề bài này không có điều kiện hay ràng buộc ẩn nào khác đáng chú ý (không nhắc tới đăng nhập, xác thực, hay bất kỳ bước trung gian nào khác).

**Bước 1.3:** Tự hỏi: "đặt lịch" và "gửi nhắc nhở" có luôn xảy ra cùng một thời điểm không? Không — việc nhắc nhở xảy ra sau, tại một thời điểm hoàn toàn khác với lúc đặt lịch, và về mặt logic, một lịch hẹn hoàn toàn có thể tồn tại mà chưa từng có tin nhắn nhắc nhở nào được gửi (nếu người dùng hủy trước giờ hẹn). Đây là dấu hiệu rõ ràng cho hai workflow tách biệt.

**Bước 1.4:** Tự hỏi tiếp: có điều kiện nào cần thỏa mãn trước khi hai workflow trên hoạt động không? Đề bài không hề nhắc tới điều này — nhưng chủ động đặt câu hỏi vẫn phát hiện ra: cần một nơi lưu trữ lịch hẹn, và hệ thống cần kết nối được tới đó trước khi ghi nhận hoặc đọc bất kỳ lịch hẹn nào.

**Bước 1.5:** Với `book_appointment` — mong muốn nhận thông tin người dùng và thời điểm hẹn từ chính người dùng cuối; cam kết trả về một bản ghi lịch hẹn đã tạo, và bản ghi này sẽ được `send_reminder` tiêu thụ sau này. Với `send_reminder` — mong muốn nhận danh sách lịch hẹn sắp tới; dữ liệu này là lịch hẹn do `book_appointment` tạo ra và sở hữu, nên nguồn của nó là `book_appointment`, không phải "nơi lưu trữ" nói chung (dù về mặt vật lý nó nằm trong nơi lưu trữ); đồng thời ghi nhận ngay rằng việc nhắc nhở xảy ra theo thời gian, sau khi đặt lịch — một tình huống của [Giai đoạn 5](05-edge-cases.md); cam kết trả về một xác nhận đã gửi tin nhắn, hiện tại chưa có workflow nào khác cần tiêu thụ kết quả này. Với `scaffold` — không mong muốn nhận gì từ một workflow nào, chỉ cần một giá trị cấu hình cố định (đường dẫn tới nơi lưu trữ); cam kết trả về một kết nối sẵn sàng, được cả `book_appointment` lẫn `send_reminder` tiêu thụ.

**Bước 1.6:** Hệ thống chỉ có một layer — một backend duy nhất — nên cả ba workflow cùng thuộc layer `backend`. Layer này có đúng một điều kiện cần chuẩn bị (kết nối tới nơi lưu trữ), đã được `scaffold` đảm nhận.

**Kết quả áp dụng, đầu ra của Giai đoạn 1 cho ví dụ này:**

| Tên workflow | Layer | Mô tả một câu | Phân loại | Lý do phân loại | Mong muốn nhận (từ đâu) | Cam kết trả (cho ai) |
|---|---|---|---|---|---|---|
| `scaffold` | backend | Khởi tạo kết nối tới nơi lưu trữ lịch hẹn khi hệ thống khởi động. | Nền tảng | Nếu xóa, cả `book_appointment` lẫn `send_reminder` đều không có kết nối để được khởi tạo — mất khả năng tồn tại. | Đường dẫn kết nối (từ cấu hình) | Kết nối sẵn sàng (cho `book_appointment`, `send_reminder`) |
| `book_appointment` | backend | Người dùng đặt một lịch hẹn mới. | Nghiệp vụ | Phục vụ trực tiếp một yêu cầu cụ thể từ người dùng, có thể xóa mà các workflow khác không ngừng hoạt động. | Thông tin người dùng, thời điểm hẹn (từ người dùng cuối) | Bản ghi lịch hẹn (cho `send_reminder`) |
| `send_reminder` | backend | Gửi tin nhắn nhắc nhở trước giờ hẹn đã đặt, được kích hoạt bởi một cơ chế bên trong hệ thống chứ không phải bởi `book_appointment`. | Nghiệp vụ | Là một hành động độc lập về mặt thời điểm, có thể xóa mà `book_appointment` vẫn hoạt động bình thường. | Danh sách lịch hẹn sắp tới (từ `book_appointment`) | Xác nhận đã gửi (hiện chưa ai tiêu thụ) |