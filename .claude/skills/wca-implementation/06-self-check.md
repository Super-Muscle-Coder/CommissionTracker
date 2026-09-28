# GIAI ĐOẠN 6 — TỰ KIỂM TRƯỚC KHI COI MỘT WORKFLOW LÀ HOÀN TẤT

*Giai đoạn cuối cùng của một vòng triển khai, sau khi đã hoàn thành [Giai đoạn 4](04-implement.md) (và [Giai đoạn 5](05-edge-cases.md), nếu có trường hợp đặc biệt phát sinh). Xem [SKILL.md](SKILL.md) để biết toàn bộ các giai đoạn. Thuật ngữ dùng trong tệp này theo đúng định nghĩa tại [§0 của lý thuyết](wca_theory_compressed.md).*

| | |
|---|---|
| **Input** | Một workflow đã đi hết Giai đoạn 4 (và Giai đoạn 5, nếu có trường hợp đặc biệt phát sinh). |
| **Hành động** | Nhìn lại toàn bộ workflow vừa hoàn thành bằng một góc nhìn tổng thể, khác với góc nhìn chi tiết từng lớp đã dùng trong lúc viết, để phát hiện những sai lệch có thể đã bị bỏ sót khi đang tập trung vào từng phần nhỏ. |
| **Output** | Xác nhận workflow này đã hoàn tất — kèm bằng chứng chạy thật và đề xuất cập nhật `status` trong hợp đồng — hoặc một danh sách cụ thể những gì còn cần sửa trước khi có thể xác nhận. |

## Bước 6.1 — Nhìn lại từ góc độ hợp đồng, đối chiếu cả hai chiều

Khi vừa viết xong một workflow, góc nhìn tự nhiên nhất là nhìn vào chính code vừa viết và cảm thấy nó hợp lý — đây là một góc nhìn dễ bị thiên vị, vì nó chỉ kiểm tra xem code có nhất quán với chính nó hay không, không kiểm tra được liệu code có thực sự khớp với những gì đã cam kết trong hợp đồng.

Tư duy cần giữ ở bước này: tạm gác code sang một bên, mở lại đúng phần hợp đồng tương ứng với workflow này, rồi đọc lại từng điều khoản một, đối chiếu ngược lại xem code đã viết có phản ánh đúng, đầy đủ những gì hợp đồng đã quy định hay không — không phải hỏi "code có hợp lý không", mà hỏi "code có đúng với hợp đồng không".

⚠ Đối chiếu đúng cách, không đối chiếu quá mức: hợp đồng chỉ ghi hình dạng dữ liệu ở ranh giới, không ghi toàn bộ cấu trúc nội bộ (nguyên tắc hộp đen). Vì vậy, việc đối chiếu Entities với `type` trong hợp đồng là kiểm tra xem hợp đồng có phải một TẬP CON của Entities hay không — mọi trường đã cam kết trong `type` phải có mặt, đủ và đúng kiểu, nhưng Entities có thêm những trường khác phục vụ mục đích nội bộ (không có workflow nào tiêu thụ) không phải là sai lệch, không cần sửa. Nhưng tập con là quan hệ giữa hợp đồng và Entities, không phải giữa hợp đồng và dữ liệu thực sự đi qua ranh giới: dữ liệu đi ra phải mang đúng các trường của `type`, không hơn — xem lại quy tắc trường thừa theo ba vai ở [Giai đoạn 2](02-contract.md), Bước 2.3.

Đối chiếu cả hai chiều, không chỉ `output_guaranteed`: kiểm tra cả `input_expected` — dữ liệu mà code thực tế đang đọc vào có đúng từ nguồn (`from`) đã khai báo trong hợp đồng không? Đây chính là nơi phát hiện một lỗi tinh vi: nếu workflow này, hoặc một hạ tầng cắt ngang gọi tới nó, đang đọc dữ liệu qua đường tắt vào nội bộ của một workflow khác thay vì đúng nguồn đã cam kết, đây là dấu hiệu ranh giới đã bị vi phạm trong lúc viết code — dù bản thân workflow trông vẫn "chạy đúng" khi kiểm thử qua loa. Output dễ đối chiếu vì nó là kết quả cuối cùng, nhìn thấy ngay; input dễ bị bỏ sót vì nó ẩn bên trong logic xử lý, cần chủ động lật lại mới thấy.

⚠ Một dạng cụ thể của lỗi tinh vi trên, đáng kiểm tra riêng: nếu `input_expected` của workflow này ghi `from` trỏ tới tên một workflow cụ thể (kể cả khi dữ liệu đó được một hạ tầng cắt ngang mang tới), dữ liệu thực tế PHẢI được lấy qua điểm giao tiếp chính thức mà workflow nguồn đó công bố — không được tự ý đọc thẳng từ nơi lưu trữ dữ liệu, dù về mặt vật lý dữ liệu đó có thể đang nằm chung một cơ sở dữ liệu với nhiều dữ liệu khác. Việc "tiện tay" đọc thẳng cơ sở dữ liệu vì cùng hạ tầng lưu trữ là một vi phạm ranh giới cô lập, dù code vẫn chạy đúng — đây là loại lỗi khó phát hiện nhất, vì hậu quả của nó (hai workflow ngầm phụ thuộc vào cùng một cấu trúc lưu trữ vật lý mà không qua hợp đồng) chỉ lộ ra khi một trong hai bên thay đổi cấu trúc lưu trữ nội bộ của mình trong tương lai.

Hai chỗ đối chiếu nữa thường bị bỏ qua vì chúng không nằm trong luồng xử lý chính:

- **Configs.** Mọi giá trị ranh giới trong Configs (kể cả những giá trị hiện thực hóa `shared_values` của hợp đồng) phải khớp đúng con số trong hợp đồng; mọi giá trị nội bộ phải có tên và nằm trong Configs của workflow, không còn con số nào gõ thẳng vào code.
- **Điểm giao tiếp.** Mỗi điểm giao tiếp của workflow trong API Contract có đúng một lối vào trong Routers, khớp `form`, `address`, `input` và từng nhãn kết quả trong `output`. Ngược lại, Routers không có lối vào nào mà có bên ngoài gọi tới nhưng hợp đồng không khai báo.
- **Cấu trúc lưu trữ.** Nếu workflow sở hữu dữ liệu trong nơi lưu trữ, cấu trúc lưu trữ đó do chính Adapters của workflow này tạo, và không workflow nào khác đọc hay ghi thẳng vào phần dữ liệu đó.

## Bước 6.2 — Nhìn lại từ góc độ ranh giới giữa các lớp, không phải từ góc độ từng lớp riêng lẻ

Trong lúc viết, việc giữ đúng ranh giới của từng lớp đã được kiểm tra liên tục (Bước 4.3). Ở đây, cần một góc nhìn khác: không xét từng lớp một cách tách biệt, mà xét toàn bộ workflow như một khối thống nhất, và tự hỏi liệu tổng thể năm lớp đó có tạo thành một luồng xử lý mạch lạc, đúng trình tự phụ thuộc đã xác lập ở [Giai đoạn 4](04-implement.md) (Bước 4.1 đến 4.5) hay không.

Một tín hiệu chẩn đoán đáng tin cậy ở bước này: nếu việc đọc lại toàn bộ workflow từ đầu tới cuối gây ra cảm giác phải nhảy qua nhảy lại nhiều lần giữa các lớp để hiểu trọn vẹn một hành vi duy nhất, đây là dấu hiệu ranh giới giữa các lớp chưa thực sự rõ ràng, dù từng lớp riêng lẻ khi xét độc lập có vẻ đúng vai trò.

## Bước 6.3 — Nhìn lại từ góc độ hệ thống, không phải từ góc độ workflow đơn lẻ

⚠ Đây là bước có hậu quả nặng nề nhất nếu bị bỏ sót trong toàn bộ Giai đoạn 6: một workflow, dù được viết hoàn hảo tới đâu ở cả năm lớp bên trong nó, hoàn toàn vô dụng nếu nó chưa từng được kết nối vào hệ thống chung. Toàn bộ công sức đối chiếu hợp đồng (Bước 6.1) và rà soát ranh giới (Bước 6.2) sẽ trở nên vô nghĩa nếu bước này bị bỏ qua, vì không có cách nào để bất kỳ ai kích hoạt được workflow đó từ bên ngoài nó.

Tư duy cần giữ ở bước này: áp dụng đúng cách chẩn đoán đi từ ngoài vào trong ([§6 của lý thuyết](wca_theory_compressed.md)) — bắt đầu từ Main của layer mà workflow thuộc về — nơi đăng ký tập trung — kiểm tra xem workflow này có được phát hiện ngay ở bước đầu tiên của chuỗi chẩn đoán đó hay không. Đây chỉ là bước đầu tiên trong một chuỗi bốn bước chẩn đoán đầy đủ (đăng ký → Routers → Services → Adapters); ở đây, chỉ cần xác nhận đúng bước đầu tiên đó, không cần đi hết cả chuỗi, vì ba bước còn lại đã được đảm bảo qua Bước 6.1 và 6.2. Nếu workflow được một thành phần hạ tầng cắt ngang gọi tới, xác nhận thêm thành phần đó đã được khởi động và đã nhận đúng lối vào Routers của workflow này. Nếu layer của workflow được một Main khác khởi động, xác nhận Main của layer chỉ phát tín hiệu sẵn sàng sau khi workflow này đã được đăng ký; nếu workflow có input `from: main`, xác nhận công cụ đó thực sự do Main trao vào Adapters, không do workflow tự tạo.

## Bước 6.4 — Nhìn lại từ góc độ những quyết định đã đưa ra ở Giai đoạn 5, nếu có

Nếu workflow này liên quan tới một quyết định đã đưa ra ở [Giai đoạn 5](05-edge-cases.md) — dù quyết định được đưa ra từ lúc soạn hợp đồng hay giữa lúc viết code — xác nhận một lần nữa rằng quyết định đó (chấp nhận trùng lặp, tách một tác vụ ra hạ tầng cắt ngang, hay đặt một đoạn xử lý vào vị trí dùng chung) vẫn còn hợp lý sau khi toàn bộ workflow đã hoàn chỉnh, không chỉ hợp lý tại đúng thời điểm quyết định được đưa ra giữa chừng.

## Bước 6.5 — Nhìn lại từ góc độ checkpoint, xác nhận đã bàn giao đủ cho agent kế thừa

Bốn bước trên xác nhận workflow đúng với hợp đồng và đúng với chính nó. Bước này xác nhận một điều khác: nếu phiên này đóng lại ngay bây giờ, agent kế thừa có đủ thông tin để tiếp tục mà không phải dò lại từ đầu hay không.

Mở lại tệp chứa checkpoint của workflow này (mặc định ở đầu tệp Services, hoặc Adapters nếu workflow không có Services) — xem [07-checkpoint-protocol.md](07-checkpoint-protocol.md) để biết định dạng chuẩn. Đối chiếu, không phải tự cảm nhận: mọi vấn đề phát sinh trong suốt quá trình viết cả năm lớp, kể cả những vấn đề phát hiện ở Entities, Adapters, hay Routers, đã được mang về và ghi tại đúng khối checkpoint duy nhất này chưa — không còn rải rác hay bỏ sót ở nơi khác.

Nếu một vấn đề tồn đọng từ checkpoint trước đã được giải quyết trong phiên này, xác nhận nó đã được chuyển hóa thành một mục kinh nghiệm mới, không còn nằm lại ở mục vấn đề tồn đọng dưới bất kỳ hình thức nào.

## Bước 6.6 — Nhìn lại từ góc độ bằng chứng, trước khi đề xuất coi workflow là hoàn thiện

Năm bước trên đều là việc đọc lại — đọc hợp đồng, đọc code, đọc checkpoint. Đọc lại cho thấy workflow **được viết** đúng; nó chưa cho thấy workflow **chạy** đúng. Một workflow chỉ được coi là hoàn thiện khi có bằng chứng chạy thật, ở mức mà bản chất của workflow đó đòi hỏi:

- Với mọi workflow có Routers: ít nhất một lần được kích hoạt qua đúng điểm giao tiếp thật đã khai báo (không gọi thẳng vào Services để "thử cho nhanh"), với dữ liệu thật hoặc gần thật, và cho ra đúng kết quả đã cam kết.
- Với workflow nền tảng không có Routers: được Main khởi tạo thật, và tài nguyên nền tảng nó chuẩn bị được ít nhất một workflow dùng thành công.
- Với workflow mà tính đúng đắn mang tính thống kê hay cảm quan (một mô hình học máy, một thuật toán xử lý ảnh, một ngưỡng chất lượng) — một lần chạy thành công không phải bằng chứng. Bằng chứng là con số đo được trên một tập dữ liệu mẫu đủ đại diện, cùng với cách đo.

Bằng chứng phải là thứ người khác kiểm lại được: lệnh hoặc thao tác đã thực hiện, dữ liệu đầu vào, kết quả thô thu được, thời điểm. Một dòng khẳng định "đã chạy thử, ổn" trong checkpoint không phải bằng chứng.

Khi mọi bước từ 6.1 tới 6.6 đều đạt, kết quả của Giai đoạn 6 là một **đề xuất** chuyển `status` của workflow trong hợp đồng sang `đã_hoàn_thiện`, kèm bằng chứng. Trường `status` được cập nhật kể cả khi Điều khoản đã khóa (xem [Giai đoạn 2](02-contract.md), Bước 2.2). Ai thực hiện việc cập nhật đó do giao thức vận hành của dự án quy định; nếu chỉ có một agent làm việc một mình, chính agent đó cập nhật, sau khi đã tự đặt bằng chứng vào checkpoint.

**Checklist:**

- [ ] Đã đối chiếu lại toàn bộ workflow với đúng phần hợp đồng tương ứng, không chỉ tự đánh giá dựa trên cảm nhận về code.
- [ ] Đã xác nhận hợp đồng là một TẬP CON của Entities — mọi trường đã cam kết trong `type` đều có mặt, đủ và đúng kiểu — chứ không đòi hỏi Entities khớp chính xác tuyệt đối, không hơn không kém, với hợp đồng.
- [ ] Dữ liệu đi ra ranh giới (output của Routers, kết quả trả cho lời gọi từ workflow khác) mang đúng các trường của `type`, không lọt trường nội bộ; input có trường thừa bị từ chối; dữ liệu nhận từ workflow khác bỏ qua trường thừa.
- [ ] Đã đối chiếu `input_expected` trong hợp đồng, xác nhận dữ liệu code thực tế đọc vào đúng từ nguồn đã khai báo — không đi tắt qua nội bộ một workflow khác.
- [ ] Giá trị ranh giới trong Configs khớp hợp đồng (kể cả `shared_values`); giá trị nội bộ đều có tên, không có con số gõ thẳng vào code.
- [ ] Mỗi điểm giao tiếp trong API Contract có đúng một lối vào trong Routers, khớp `form`, `address`, `input`, `output` — và không có lối vào nào bên ngoài gọi tới mà hợp đồng không khai báo.
- [ ] **Nếu `from` trỏ tới tên một workflow cụ thể, đã xác nhận dữ liệu thực sự được lấy qua điểm giao tiếp chính thức của workflow đó — không đọc thẳng nơi lưu trữ chỉ vì cùng chung hạ tầng vật lý.**
- [ ] Đọc lại toàn bộ workflow từ đầu tới cuối, có thể hiểu được luồng xử lý một cách mạch lạc, không cần nhảy qua nhảy lại nhiều lần giữa các lớp để nắm được một hành vi duy nhất — đây chính là tín hiệu chẩn đoán, không chỉ là một cảm giác thoáng qua.
- [ ] Xác nhận workflow này sẽ được phát hiện ngay ở bước đầu tiên (đăng ký tại Main của layer) nếu áp dụng cách chẩn đoán đi từ ngoài vào trong.
- [ ] Nếu có tín hiệu sẵn sàng giữa các Main, nó chỉ được phát sau khi workflow này đã được đăng ký; công cụ `from: main` (nếu có) được Main trao, không do workflow tự tạo.
- [ ] Nếu có quyết định nào được đưa ra ở Giai đoạn 5, đã xác nhận lại quyết định đó vẫn còn hợp lý sau khi workflow đã hoàn chỉnh.
- [ ] Checkpoint của workflow này đã được viết hoặc cập nhật, đúng định dạng tại [07-checkpoint-protocol.md](07-checkpoint-protocol.md).
- [ ] Mọi vấn đề, phát hiện đáng lưu lại ở bất kỳ lớp nào trong năm lớp đã được tập trung về đúng khối checkpoint duy nhất, không còn rải rác nơi khác.
- [ ] Nếu có vấn đề tồn đọng nào từ checkpoint trước đã được giải quyết trong phiên này, đã chuyển hóa nó thành một mục kinh nghiệm mới và xóa khỏi mục vấn đề tồn đọng.
- [ ] **Có bằng chứng chạy thật qua đúng điểm giao tiếp đã khai báo, ở mức mà bản chất workflow đòi hỏi, và bằng chứng đó kiểm lại được — không chỉ là một dòng khẳng định.**
- [ ] Đã đưa ra đề xuất cập nhật `status`, kèm bằng chứng — không tự coi workflow là hoàn thiện khi chưa có bằng chứng.

⚠ Nếu workflow này là workflow cuối cùng trong danh sách từ [Giai đoạn 1](01-decompose.md), và mọi workflow đều đã qua được Giai đoạn 6 với `status: đã_hoàn_thiện` trong hợp đồng, hệ thống được coi là hoàn tất theo đúng chuẩn WCA. Nếu còn workflow khác trong danh sách chưa triển khai, quay lại [Giai đoạn 4](04-implement.md) cho workflow tiếp theo.

---

## Minh họa — áp dụng vào hệ thống đặt lịch hẹn, kiểm tra lại workflow `send_reminder`

⚠ Lưu ý trước khi đọc phần này: workflow được chọn để minh họa ở đây là `send_reminder`, chính là workflow đã đi qua Giai đoạn 5 — để Bước 6.4 có nội dung thật để xác nhận, thay vì chỉ là một bước trống. Với một hệ thống khác, số lượng chi tiết cần đối chiếu ở mỗi bước có thể nhiều hơn hoặc ít hơn, tùy vào độ phức tạp thật của workflow đó.

**Bước 6.1:** Mở lại `data_schema.yaml`, mục `send_reminder` — đối chiếu `output_guaranteed`: hợp đồng ghi `reminder_log` có `type: "object { appointment_id: string, sent_at: timestamp }"`. Kiểm tra Entities thực tế của `send_reminder`: nếu nó chứa đúng hai trường này, hợp đồng được thỏa mãn — dù Entities có thêm bất kỳ trường nội bộ nào khác (ví dụ một mã theo dõi log nội bộ), điều đó không phải sai lệch.

Đối chiếu tiếp `input_expected` — hợp đồng khai báo `upcoming_appointments` với `from: book_appointment` (không phải `storage_layer` — dữ liệu này là output do `book_appointment` sở hữu, xem lại Giai đoạn 2). Kiểm tra code thực tế: `background_jobs` phải lấy danh sách qua điểm giao tiếp `list_upcoming` mà `book_appointment` đã công bố trong `api_contract.yaml`, rồi chuyển vào `send_for_upcoming` của `send_reminder`; tuyệt đối không được tự ý đọc thẳng bảng dữ liệu trong cơ sở dữ liệu, dù về mặt vật lý cả `book_appointment` lẫn `send_reminder` đều dùng chung một kết nối do `scaffold` cung cấp. Nếu code phát hiện đang truy vấn thẳng cơ sở dữ liệu thay vì gọi qua điểm giao tiếp đó, đây là dấu hiệu cần sửa ngay, dù workflow vẫn "chạy được" khi thử nghiệm — lỗi này chỉ thực sự gây hậu quả khi `book_appointment` sau này đổi cấu trúc lưu trữ nội bộ của nó.

Đồng thời đối chiếu `api_contract.yaml` — `send_reminder` có đúng một điểm giao tiếp, `send_for_upcoming`, `form: in_process`, `called_by: [background_jobs]`, nhận `upcoming_appointments`, trả `list[reminder_log]`. Routers của `send_reminder` phải có đúng một lối vào khớp như vậy, và không có điểm giao tiếp HTTP nào.

**Bước 6.2:** Đọc lại từ điểm kích hoạt (`send_for_upcoming`, một hàm gọi trực tiếp) xuống Service xuống Adapter — luồng xử lý rõ ràng: nhận danh sách lịch hẹn sắp tới, Services quyết định lịch hẹn nào đã tới lúc nhắc, gửi tin nhắn qua Adapter, ghi lại nhật ký đã gửi. Không cần nhảy qua nhảy lại để hiểu.

**Bước 6.3:** Kiểm tra điểm đăng ký tập trung của hệ thống — xác nhận `send_reminder` đã được Main ráp nối, và `background_jobs` đã được khởi động với đúng lối vào `send_for_upcoming` của nó, dù mang hình thức Routers khác với `book_appointment` (một hàm được gọi trực tiếp, không phải một điểm giao tiếp HTTP).

**Bước 6.4:** Quyết định đã đưa ra ở Giai đoạn 5 là: tách việc quét định kỳ ra thành hạ tầng cắt ngang, đứng ngoài cả `book_appointment` lẫn `send_reminder`, chỉ khởi kích chứ không sở hữu logic gửi nhắc nhở, và lấy dữ liệu lịch hẹn qua đúng điểm giao tiếp `list_upcoming` của `book_appointment` — không đi tắt qua cơ sở dữ liệu dù cùng chung hạ tầng lưu trữ. Xác nhận lại: quyết định này vẫn hợp lý sau khi `send_reminder` đã hoàn chỉnh — logic gửi tin nhắn và ghi nhật ký vẫn hoàn toàn nằm trong Services của `send_reminder`, còn `background_jobs` chỉ giữ đúng vai trò gọi tới hai điểm giao tiếp chính thức (của `book_appointment` để lấy dữ liệu, của `send_reminder` để kích hoạt gửi), không chứa và không cần biết bất kỳ logic nội bộ nào của cả hai workflow đó.

**Bước 6.6:** Bằng chứng: chạy một lượt quét của `background_jobs` trên cơ sở dữ liệu thử với ba lịch hẹn (một đã tới lúc nhắc, hai chưa), ghi lại lệnh đã chạy, ba bản ghi đầu vào, và kết quả thô — đúng một `reminder_log` được tạo, cho đúng lịch hẹn đã tới lúc. Bằng chứng này được đặt vào checkpoint, cùng đề xuất chuyển `status` sang `đã_hoàn_thiện`.

**Kết quả:** `send_reminder` được xác nhận hoàn tất, đồng thời xác nhận nó nhất quán với đúng quyết định đã đưa ra ở Giai đoạn 5. Đây là workflow cuối cùng trong danh sách từ Giai đoạn 1 — hệ thống đặt lịch hẹn được coi là hoàn tất theo đúng chuẩn WCA.