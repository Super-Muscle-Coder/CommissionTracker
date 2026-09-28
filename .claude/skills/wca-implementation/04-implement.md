# GIAI ĐOẠN 4 — TRIỂN KHAI TỪNG WORKFLOW

*Giai đoạn thứ năm trong quy trình triển khai WCA, sau khi đã hoàn thành [Giai đoạn 3](03-classify.md). Xem [SKILL.md](SKILL.md) để biết toàn bộ các giai đoạn. Thuật ngữ dùng trong tệp này theo đúng định nghĩa tại [§0 của lý thuyết](wca_theory_compressed.md).*

| | |
|---|---|
| **Input** | Một workflow đã được phân loại chính thức từ Giai đoạn 3, cùng đúng phần hợp đồng tương ứng với nó từ Giai đoạn 2 (hợp đồng phải ở trạng thái `approved`). |
| **Hành động** | Viết đủ các lớp cần thiết cho workflow này, theo một thứ tự cụ thể, rồi ráp nối vào layer hệ thống của nó qua Main. |
| **Output** | Một workflow hoàn chỉnh, đã được ráp nối và sẵn sàng vận hành trong hệ thống. |

## Bước 4.0 — Đặt workflow vào đúng chỗ trong cây thư mục

Cách tổ chức thư mục phải phản ánh đúng trục phân định của WCA: **theo workflow trước, theo lớp sau**. Tổ chức theo lớp trước (một thư mục `entities/` chứa Entities của mọi workflow, một thư mục `services/` chứa Services của mọi workflow…) chính là lối chia theo vai trò kỹ thuật mà WCA không đi theo — nó rải một workflow ra khắp cây thư mục, và làm mờ ranh giới giữa các workflow ngay ở cấp tệp.

Bố cục mặc định:

```
<gốc dự án>/
  contracts/                     # data_schema.yaml, api_contract.yaml
  <layer>/                       # một thư mục cho mỗi layer hệ thống
    main.<ext>                   # Main của layer này
    configs/                     # giá trị cấu hình cấp layer (kể cả shared_values của hợp đồng)
    workflows/
      <tên_workflow>/
        configs.<ext>            # Configs của workflow: dữ liệu tĩnh, không phải code
        entities.<ext>
        adapters.<ext>
        services.<ext>           # khối checkpoint nằm ở đầu tệp này
        routers.<ext>
    cross_cutting/
      <tên_thành_phần>/          # mỗi thành phần hạ tầng cắt ngang một thư mục
    shared/                      # chỉ tồn tại khi thỏa đủ điều kiện ở Giai đoạn 5, Bước 5.3
```

Một dự án có thể chốt một bố cục khác trong tài liệu nền của nó, miễn giữ đúng hai điều: tổ chức theo workflow trước, và bố cục được chốt **trước** phiên viết code đầu tiên rồi giữ nhất quán về sau. Một workflow quá lớn có thể tách mỗi lớp thành nhiều tệp trong một thư mục con cùng tên lớp — ranh giới năm lớp mới là điều bắt buộc, không phải số lượng tệp.

## Bước 4.1 — Đối chiếu Configs với hợp đồng trước khi viết bất kỳ dòng nào

Trước khi gõ dòng code đầu tiên, xác định workflow này cần những giá trị cấu hình nào, và phân loại từng giá trị theo đúng hai loại đã định ở [§4 của lý thuyết](wca_theory_compressed.md):

- **Giá trị ranh giới** — tra `input_expected` của workflow trong hợp đồng, xem giá trị nào có `from: environment_config`, và tra `clause_a_common.shared_values`. Những giá trị này do hợp đồng quy định; Configs chỉ hiện thực hóa đúng chúng, không tự đặt.
- **Giá trị nội bộ** — mọi con số, ngưỡng, tham số mà workflow tự quyết định để làm việc (số lần thử lại, thời gian chờ, ngưỡng hội tụ). Chúng không có trong hợp đồng và không cần có, nhưng vẫn phải được đặt tên và nằm trong Configs của workflow, không gõ thẳng vào code.

Input `from: main` (công cụ quản lý vòng đời do Main trao) và tài nguyên nền tảng **không** phải giá trị cấu hình: chúng không nằm trong Configs mà được Main trao cho Adapters ở Bước 4.5.

Đây không phải bước viết code — Configs là dữ liệu tĩnh nằm trong tệp cấu hình, tự nó không có khả năng "đọc chính nó". Việc xác định ở bước này chỉ là đối chiếu và phân loại.

⚠ Configs mang một sức nặng dễ bị đánh giá thấp: một giá trị sai hoặc thiếu căn cứ ở đây không tự lộ ra ngay, mà âm thầm lan vào bất kỳ hành vi nào phụ thuộc vào đúng giá trị đó, thường chỉ lộ diện muộn, ở một nơi xa nguồn gốc thật của lỗi. Không có lớp nào khác trong workflow được phép tự ý đọc giá trị cấu hình trực tiếp — việc đọc thực sự xảy ra ở Main (xem Bước 4.5), các lớp còn lại chỉ nhận giá trị đã được chuẩn bị sẵn.

## Bước 4.2 — Định hình cấu trúc dữ liệu, khớp đúng phần ranh giới đã cam kết trong hợp đồng

Viết Entities sau khi đã rõ Configs, vì Adapters và Services phía sau cần một hình dạng dữ liệu cụ thể để thao tác.

⚠ Cần hiểu đúng bản chất của việc "khớp với hợp đồng" ở bước này — đây là điểm dễ hiểu lầm nhất trong toàn bộ Giai đoạn 4. Hợp đồng, theo đúng nguyên tắc hộp đen, chỉ ghi hình dạng của dữ liệu ở đúng ranh giới trao đổi (`input_expected`/`output_guaranteed`), không ghi toàn bộ cấu trúc Entities nội bộ. Vì vậy:

- Nếu output của workflow này được một workflow khác tiêu thụ, Entities tương ứng với output đó PHẢI chứa đủ những trường đã ghi trong `type` của hợp đồng — đây là phần bắt buộc đối chiếu.
- Nhưng Entities hoàn toàn có thể chứa thêm những trường khác mà hợp đồng không hề nhắc tới — miễn những trường đó chỉ phục vụ logic nội bộ của chính workflow này, không có workflow nào khác cần đọc. Việc Entities "thừa" so với hợp đồng theo cách này không phải sai lệch, không phải vi phạm — đó chính là phần dành cho tự do triển khai nội bộ mà nguyên tắc hộp đen cho phép.

Nói cách khác: đối chiếu ở bước này là kiểm tra hợp đồng có phải một TẬP CON của Entities hay không — không phải kiểm tra Entities có khớp CHÍNH XÁC từng trường với hợp đồng hay không. Thiếu một trường đã cam kết là vi phạm; thừa một trường phục vụ mục đích nội bộ là hoàn toàn hợp lệ.

⚠ Hợp lệ **ở bên trong**, không bao giờ ở ranh giới. Khi Entities được chuyển thành dữ liệu đi ra — ở Routers, hay khi trả về cho một lời gọi từ workflow khác — chỉ đúng các trường đã ghi trong `type` được đi ra; trường nội bộ ở lại bên trong (quy tắc của bên gửi, [Giai đoạn 2](02-contract.md), Bước 2.3). Tập con là quan hệ giữa hợp đồng và Entities, không phải giữa hợp đồng và dữ liệu đi qua ranh giới.

Dữ liệu mà workflow này **nhận** từ một workflow khác cũng được mô tả trong Entities của chính workflow này, khớp với `type` ở hợp đồng. ⚠ Không import Entities của workflow nguồn, kể cả khi hai bên có hình dạng giống hệt nhau: nếu import, hai workflow bị buộc chặt với nhau ở cấp code — workflow nguồn sửa một trường nội bộ là bên nhận vỡ theo, dù hợp đồng không hề đổi. Sự trùng lặp ở đây là chủ đích, đúng tinh thần [Giai đoạn 5](05-edge-cases.md), Bước 5.1.

Entities không phải một lớp phụ, dễ bỏ qua — nó là nơi hiện thực hóa cụ thể phần đã cam kết của Data Schema. Nếu Routers là nơi hiện thực hóa cam kết của API Contract (điểm giao tiếp), thì Entities chính là nơi hiện thực hóa cam kết của Data Schema (hình dạng dữ liệu ở ranh giới) — hai lớp này đóng vai trò đối xứng nhau, mỗi lớp là điểm neo trực tiếp giữa đúng một loại hợp đồng và code thật.

## Bước 4.3 — Viết Adapters và Services, giữ đúng ranh giới "làm gì" và "quyết định làm gì"

**Adapters** là cầu nối kỹ thuật duy nhất ra bên ngoài workflow — mỗi hàm chỉ thực hiện đúng một hành động kỹ thuật cụ thể, không tự quyết định trình tự. Nếu Adapters cần một tài nguyên nền tảng (như kết nối cơ sở dữ liệu), nó nhận tài nguyên đó qua tham số, không tự đi tạo ra.

**Cấu trúc lưu trữ của dữ liệu mình sở hữu cũng là việc của Adapters.** Nếu workflow sở hữu một phần dữ liệu trong nơi lưu trữ dùng chung (một bảng, một thư mục…), việc tạo và nâng cấp cấu trúc của phần đó là một hành động kỹ thuật trong Adapters của chính workflow này, được Main gọi một lần khi khởi tạo workflow (Bước 4.5). Workflow nền tảng chỉ trao kết nối hay vị trí; nó không biết, và không được biết, cấu trúc dữ liệu của workflow nào.

**Gọi sang workflow khác cũng là việc của Adapters.** Với workflow đang viết, một workflow khác là "bên ngoài" giống như cơ sở dữ liệu hay một dịch vụ mạng. Khi hợp đồng ghi workflow này nhận dữ liệu `from` một workflow nghiệp vụ khác (đường pull), hoặc gửi dữ liệu tới một workflow khác (đường push), lời gọi đó nằm trong một hàm Adapter: hàm này gọi đúng điểm giao tiếp mà hợp đồng khai báo — đúng `form`, đúng `address` — và trả về dữ liệu đã chuyển thành Entities của chính workflow này — chỉ lấy đúng các trường mà hợp đồng cam kết, bỏ qua trường thừa nếu có (quy tắc của bên tiêu thụ output, [Giai đoạn 2](02-contract.md), Bước 2.3). Điểm gọi (một hàm Routers của workflow kia, hay một địa chỉ mạng) được Main trao cho Adapter, không phải Adapter tự đi tìm. Services không bao giờ biết bên kia là ai hay nằm ở đâu — nó chỉ biết có một Adapter trả về thứ nó cần.

⚠ Bên trong một hành động kỹ thuật, Adapters được hoàn toàn tự do lựa chọn cách thực hiện — dùng một thư viện có sẵn hay tự viết thuật toán riêng từ đầu — miễn giữ đúng input/output đã cam kết. Đây là một hộp đen khác, đứng thấp hơn hợp đồng: Services chỉ cần biết Adapters trả về đúng thứ đã hứa, không cần biết bên trong làm bằng cách nào. Chính nhờ ranh giới này, việc đổi công nghệ lõi sau này (đổi thư viện, viết lại thuật toán) chỉ cần sửa bên trong Adapters, không lan sang bất kỳ lớp nào khác.

Khi phân vân một đoạn xử lý thuộc Adapters hay Services, dùng phép thử ở [§4 của lý thuyết](wca_theory_compressed.md): hình dung thay đoạn đó bằng một cách làm khác. Nếu mọi cách làm đúng đắn đều phải cho ra cùng một kết quả, đó là công cụ (Adapters). Nếu các cách làm khác nhau cho ra những kết quả khác nhau mà đều có thể coi là hợp lý, thì chọn cách nào chính là chọn một ý nghĩa nghiệp vụ — đó là quyết định (Services).

**Services** là lớp duy nhất ra quyết định — điều phối Adapters theo đúng trình tự nghiệp vụ cần thiết. Nó không tự khởi tạo Adapters (phải nhận từ Main), không tự gọi thẳng một công nghệ ngoài (phải đi qua Adapters), và đặc biệt không tự đọc giá trị cấu hình trực tiếp — đọc cấu hình là một hành động kỹ thuật, thuộc về nơi chuẩn bị sẵn giá trị, không thuộc về nơi ra quyết định.

Trong suốt quá trình thực thi, Services dùng ba thứ mà không sở hữu bất kỳ thứ nào trong số đó: dữ liệu (từ Entities, không biết giá trị cụ thể từ đâu ngoài lời khai của Routers), công cụ (từ Adapters, không biết bên trong triển khai ra sao), và tham số (từ Configs qua Main, không tự bịa ra dù thấy hợp lý lúc viết). Services chỉ sở hữu đúng một thứ: logic quyết định dùng ba thứ đó theo trình tự nào. Mọi tham số mà logic này cần — kể cả những tham số nội bộ nó tự quyết giá trị, như số lần thử lại, ngưỡng thời gian chờ — không cần và không nên xuất hiện trong hợp đồng, nhưng vẫn được đặt trong Configs của workflow và trao vào qua Main, không gõ thẳng vào code.

⚠ Nếu trong lúc viết Adapters, Entities (Bước 4.2), hay Routers (Bước 4.4) phát hiện một vấn đề kỹ thuật, một giới hạn, hay một điều đáng lưu lại cho agent kế thừa, không viết comment giải thích tại chỗ phát hiện. Toàn bộ những gì phát sinh ở bất kỳ lớp nào trong workflow đều được mang về và ghi tại đúng một khối checkpoint duy nhất, đặt ở đầu tệp Services (xem [07-checkpoint-protocol.md](07-checkpoint-protocol.md)) — vì Services là lớp duy nhất có tầm nhìn đầy đủ về toàn bộ workflow tại thời điểm nó được viết, đúng vai trò "nơi duy nhất ra quyết định" đã nói ở trên. Nếu workflow không có Services (một số workflow nền tảng tối giản), khối checkpoint chuyển sang đầu tệp Adapters. Điều phát hiện ra mà thuộc về cả layer — không riêng workflow nào, ví dụ cách dùng chung một tài nguyên nền tảng hay giao thức giữa các Main — ghi vào checkpoint của Main (xem [07-checkpoint-protocol.md](07-checkpoint-protocol.md)).

## Bước 4.4 — Hoàn thiện Routers, điểm tiếp nhận cuối cùng

Routers chỉ kết nối những gì đã hoàn chỉnh ở các lớp trước với các điểm tiếp nhận kích hoạt. Mỗi điểm giao tiếp khai báo cho workflow này trong API Contract có đúng một lối vào tương ứng trong Routers — đúng `form`, đúng `address`, nhận đúng các input đã liệt kê trong `input`, trả về đúng các kết quả đã liệt kê trong `output`. Một workflow có nhiều điểm giao tiếp, mang nhiều hình thức, vẫn chỉ có một lớp Routers.

Việc Routers được phép làm là kiểm tra tính hợp lệ về định dạng của đầu vào — đúng kiểu, đủ trường bắt buộc, đúng cú pháp, đúng những gì `type` trong hợp đồng mô tả (xem định nghĩa ở [§4 của lý thuyết](wca_theory_compressed.md)), kể cả từ chối input có trường thừa (quy tắc của bên nhận input, [Giai đoạn 2](02-contract.md), Bước 2.3) — và chuyển đổi định dạng ở ranh giới (ví dụ đọc một chuỗi thời gian thành kiểu thời gian của ngôn ngữ), rồi chuyển giao cho Services và trả kết quả về đúng nhãn kết quả đã khai báo. Một kiểm tra cần tới dữ liệu đang lưu hay tới ý nghĩa nghiệp vụ (bản ghi này có tồn tại không, giá trị này có vượt giới hạn nghiệp vụ không) không phải kiểm tra định dạng — nó thuộc Services; Routers chỉ chuyển kết quả mà Services trả về thành đúng nhãn kết quả, kể cả khi đó là một lỗi. ⚠ Đây là ranh giới hay bị xóa nhòa nhất trong thực tế: nếu cảm thấy cần viết thêm bất kỳ điều kiện xử lý nào ngoài việc kiểm tra và chuyển đổi định dạng, đây là dấu hiệu logic nghiệp vụ đang bị viết nhầm chỗ — quay lại Services để bổ sung, không viết trực tiếp tại đây.

Routers nhận Services đã được Main chuẩn bị sẵn, không tự tạo Services.

## Bước 4.5 — Ráp nối tại Main, hoàn tất việc đưa workflow vào hệ thống

Viết xong năm lớp chưa có nghĩa là workflow đã sẵn sàng vận hành — nếu chưa được ráp nối vào Main của layer nó thuộc về, toàn bộ công sức ở các bước trên vẫn vô dụng, vì không có cách nào kích hoạt workflow đó từ bên ngoài nó.

Các việc cần làm tại Main, theo đúng thứ tự:

1. **Đọc giá trị cấu hình** mà workflow này cần (đã xác định ở Bước 4.1), cả giá trị ranh giới lẫn giá trị nội bộ — Main là nơi duy nhất đọc tệp cấu hình, ép giá trị thành đúng định dạng.
2. **Khởi tạo workflow nền tảng, đúng thứ tự đã xác định ở Giai đoạn 3** — đảm bảo mọi workflow nền tảng mà workflow này phụ thuộc vào đã được gọi dậy và sẵn sàng trước, bằng đúng giá trị cấu hình vừa đọc.
3. **Khởi tạo Adapters** — dùng tài nguyên nền tảng từ bước 2 và công cụ quản lý vòng đời mà Main tự tạo (nếu hợp đồng ghi workflow có input `from: main`), và trao cho các Adapter gọi sang workflow khác đúng điểm gọi của workflow đó (vì vậy workflow được gọi phải được ráp nối trước workflow gọi nó). Nếu workflow sở hữu dữ liệu trong nơi lưu trữ, gọi hành động chuẩn bị cấu trúc lưu trữ của Adapters ngay tại đây, trước khi workflow nhận bất kỳ lời gọi nào.
4. **Khởi tạo Services, tiêm Adapters và giá trị cấu hình vào** — vì Services bị cấm tự khởi tạo Adapters hay tự đọc cấu hình, Main là nơi duy nhất hợp lý để ráp các mảnh này lại với nhau. Đây gọi là tiêm phụ thuộc.
5. **Khởi tạo Routers với Services vừa tạo, rồi đăng ký** — với điểm giao tiếp qua mạng, đăng ký vào hệ thống mạng của layer; với điểm giao tiếp gọi trực tiếp, giữ lại lối vào đó để trao cho bên gọi (bước 3 của workflow khác, hoặc bước 6).
6. **Khởi động hạ tầng cắt ngang**, sau khi mọi workflow mà nó gọi tới đã được đăng ký — trao cho nó đúng các lối vào Routers nó cần.

Trong một hệ thống nhiều layer, việc chờ sẵn sàng diễn ra giữa các Main (xem [§4 của lý thuyết](wca_theory_compressed.md)):

- Main của một layer **được** khởi động, sau bước 6, phát tín hiệu sẵn sàng theo đúng hình thức ghi trong `clause_a_common.mandatory_rules` của Data Schema.
- Main của layer được khởi động đầu tiên khởi động các layer khác, truyền cho chúng giá trị cấu hình cần thiết, chờ tín hiệu sẵn sàng của chúng trước khi mở cửa nhận yêu cầu, và dừng chúng khi hệ thống tắt. Nếu một workflow cần dùng chính công cụ quản lý vòng đời đó (hợp đồng ghi `from: main`), Main trao công cụ cho Adapters của workflow ở bước 3.

Không workflow nào có điểm giao tiếp chỉ để trả lời "layer đã sẵn sàng chưa": Routers của một workflow không biết cả layer đã ráp nối xong hay chưa.

⚠ Nếu bước 3 phát hiện hai workflow nghiệp vụ gọi lẫn nhau, không có thứ tự ráp nối nào tự nhiên cả — đây là tín hiệu nên xem lại ranh giới giữa hai workflow đó ở [Giai đoạn 1](01-decompose.md), không phải một bài toán ráp nối cần mẹo. Chỉ khi xem lại mà cả hai chiều gọi đều thực sự chính đáng, mới ráp nối bằng cách tạo đủ cả hai workflow trước, rồi mới trao điểm gọi cho nhau.

⚠ Main không tự viết logic nghiệp vụ ở bất kỳ việc nào trong các việc trên — nó chỉ làm khâu hậu cần: đọc, khởi tạo theo đúng thứ tự, ráp nối, đăng ký. Nếu thấy mình đang viết một điều kiện xử lý dữ liệu ngay trong Main, đây là dấu hiệu logic đang bị đặt sai chỗ, cần chuyển về Services.

**Checklist:**

- [ ] Workflow nằm đúng vị trí trong cây thư mục theo bố cục đã chốt của dự án — tổ chức theo workflow trước, theo lớp sau.
- [ ] Đã đối chiếu hợp đồng để biết rõ workflow này cần giá trị cấu hình nào, và đã phân loại từng giá trị là giá trị ranh giới (theo hợp đồng) hay giá trị nội bộ (có tên, nằm trong Configs của workflow).
- [ ] Không còn con số hay chuỗi cố định nào mang ý nghĩa cấu hình bị gõ thẳng vào code.
- [ ] Đã viết đủ các lớp cần thiết theo đúng phân loại đã xác định ở Giai đoạn 3.
- [ ] **Với mỗi output được workflow khác tiêu thụ, đã xác nhận Entities chứa ĐỦ các trường đã ghi trong `type` của hợp đồng — không thiếu trường nào đã cam kết. Các trường khác mà Entities có thêm, phục vụ mục đích nội bộ, không bị coi là sai lệch.**
- [ ] **Dữ liệu nhận từ workflow khác được mô tả bằng Entities của chính workflow này; không có dòng import nào trỏ vào mã nguồn của workflow khác.**
- [ ] **Trường thừa xử lý đúng ba vai (Giai đoạn 2, Bước 2.3): dữ liệu đi ra chỉ mang đúng các trường của `type`, không lọt trường nội bộ; input có trường thừa bị Routers từ chối; dữ liệu nhận từ workflow khác bỏ qua trường thừa.**
- [ ] **Mọi lời gọi sang workflow khác đều nằm trong Adapters và đi đúng điểm giao tiếp đã khai báo trong API Contract.**
- [ ] Nếu workflow sở hữu dữ liệu trong nơi lưu trữ, cấu trúc lưu trữ đó do Adapters của chính workflow này tạo và nâng cấp, được Main gọi khi khởi tạo — không nằm ở workflow nền tảng hay ở workflow khác.
- [ ] Với mỗi lớp, có thể giải thích được vì sao nội dung của nó thuộc đúng vai trò của lớp đó — kể cả Adapters (chỉ thực hiện, không quyết định trình tự) và Services (chỉ quyết định, không tự chạm vào kỹ thuật hay cấu hình).
- [ ] **Mọi vấn đề hoặc điều đáng lưu lại phát hiện trong lúc viết Entities, Adapters, hay Routers đã được mang về ghi tại đúng khối checkpoint duy nhất ở Services (hoặc Adapters nếu không có Services), không viết rải rác tại nơi phát hiện.**
- [ ] Mỗi điểm giao tiếp trong API Contract có đúng một lối vào trong Routers, khớp `form`, `address`, `input`, `output`; Routers không chứa điều kiện xử lý nghiệp vụ nào ngoài kiểm tra và chuyển đổi định dạng.
- [ ] Đã hoàn tất ráp nối tại Main theo đúng thứ tự — đọc cấu hình, khởi tạo workflow nền tảng, khởi tạo Adapters (kể cả điểm gọi sang workflow khác), tiêm vào Services, khởi tạo và đăng ký Routers, khởi động hạ tầng cắt ngang (nếu có) — không bỏ sót việc nào.
- [ ] Nếu layer này được một Main khác khởi động, Main của nó phát tín hiệu sẵn sàng đúng hình thức trong `mandatory_rules`, sau khi mọi workflow và hạ tầng cắt ngang đã sẵn sàng. Nếu workflow có input `from: main`, công cụ đó được trao cho Adapters, không nằm trong Configs.
- [ ] Nếu có nhiều hơn một hành động trong cùng workflow cần dùng chung một đoạn xử lý, đã cân nhắc đưa vào đúng chỗ hợp lý mà không phá vỡ ranh giới với các workflow khác.

⚠ Quy tắc quay lui: nếu trong lúc viết phát hiện thiếu một chi tiết trong hợp đồng, quay lại [Giai đoạn 2](02-contract.md) để bổ sung trước khi tiếp tục viết code. Nếu phát hiện workflow này cần dùng chung logic với một workflow khác, cần xử lý một tác vụ không đồng bộ, hoặc cần thao tác trên toàn bộ một nơi lưu trữ, tạm dừng ở đây và chuyển sang [Giai đoạn 5](05-edge-cases.md) trước khi quay lại hoàn thiện workflow này.

---

## Minh họa — áp dụng vào hệ thống đặt lịch hẹn, triển khai workflow `book_appointment`

⚠ Lưu ý trước khi đọc phần này: các lớp cụ thể dưới đây chỉ minh họa cách các bước tư duy ở trên được hiện thực hóa cho đúng một workflow của một bài toán nhỏ. Ngôn ngữ lập trình, thư viện, cách tổ chức chi tiết bên trong mỗi lớp hoàn toàn có thể khác đi tùy vào công nghệ và kiến trúc thật của một hệ thống khác. Điều không được khác đi là ranh giới giữa các lớp và cách Main ráp nối chúng.

**Bước 4.0 — vị trí:**

```
backend/
  main.py
  configs/backend.env
  workflows/
    scaffold/…
    book_appointment/
      configs.yaml
      entities.py
      adapters.py
      services.py
      routers.py
    send_reminder/…
  cross_cutting/
    background_jobs/…
```

**Bước 4.1 — đối chiếu Configs:** Tra cứu Giai đoạn 2, `book_appointment` không có input nào `from: environment_config`, và `shared_values` rỗng — nó không có giá trị ranh giới nào. Giá trị cấu hình ranh giới duy nhất trong layer thuộc về `scaffold` (`connection_string`), nằm ở cấu hình cấp layer:

```env
# backend/configs/backend.env
STORAGE_CONNECTION_STRING=appointments.db
```

`book_appointment` có một giá trị nội bộ: số lần thử lại khi ghi lịch hẹn gặp lỗi tạm thời. Giá trị này không có trong hợp đồng, nhưng vẫn phải có tên:

```yaml
# backend/workflows/book_appointment/configs.yaml
max_insert_retries: 3
```

**Bước 4.2 — Entities:**

```python
# backend/workflows/book_appointment/entities.py
from dataclasses import dataclass
from datetime import datetime

@dataclass
class Appointment:
    appointment_id: str
    user_id: str
    scheduled_at: datetime
    # Trường dưới đây KHÔNG có trong type đã khai báo ở hợp đồng — nó
    # chỉ phục vụ logic nội bộ của chính book_appointment, send_reminder
    # không đọc trường này. Đây không phải sai lệch với hợp đồng, vì hợp
    # đồng chỉ cam kết TỐI THIỂU ba trường kia — Entities được phép có thêm.
    _internal_retry_count: int = 0
```

Ba trường `appointment_id`, `user_id`, `scheduled_at` khớp đúng với kiểu `appointment_record` mà hợp đồng dùng cho `output_guaranteed.appointment` — đây là phần bắt buộc. Trường `_internal_retry_count` không nằm trong hợp đồng, và điều đó hoàn toàn hợp lệ.

**Bước 4.3 — Adapters (chỉ thực hiện) và Services (chỉ quyết định):**

```python
# backend/workflows/book_appointment/adapters.py
from .entities import Appointment

class AppointmentRepository:
    def __init__(self, db_connection):
        # Nhận tài nguyên nền tảng đã sẵn sàng từ Main — không tự đọc
        # cấu hình, không tự tạo kết nối.
        self._db = db_connection

    def ensure_storage(self) -> None:
        # Cấu trúc lưu trữ của dữ liệu mà book_appointment sở hữu — do chính
        # workflow này tạo, không phải scaffold.
        self._db.execute(
            "CREATE TABLE IF NOT EXISTS appointments ("
            "appointment_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, scheduled_at TEXT NOT NULL)"
        )

    def insert(self, appointment: Appointment) -> None:
        self._db.execute(
            "INSERT INTO appointments (appointment_id, user_id, scheduled_at) VALUES (?, ?, ?)",
            (appointment.appointment_id, appointment.user_id, appointment.scheduled_at),
        )

    def list_upcoming(self, now) -> list[Appointment]:
        rows = self._db.execute(
            "SELECT appointment_id, user_id, scheduled_at FROM appointments WHERE scheduled_at > ?",
            (now,),
        ).fetchall()
        return [Appointment(*row) for row in rows]
```

```python
# backend/workflows/book_appointment/services.py
# ===WCA-CHECKPOINT-START===
# … (khối checkpoint theo 07-checkpoint-protocol.md)
# ===WCA-CHECKPOINT-END===
import sqlite3
import uuid
from datetime import datetime, timezone
from .adapters import AppointmentRepository
from .entities import Appointment

class BookAppointmentService:
    def __init__(self, repo: AppointmentRepository, max_insert_retries: int):
        # Nhận Adapters và tham số đã sẵn sàng từ Main — không tự khởi
        # tạo Adapters, không tự đọc cấu hình.
        self._repo = repo
        self._max_insert_retries = max_insert_retries

    def book(self, user_id: str, scheduled_at: datetime) -> Appointment:
        appointment = Appointment(
            appointment_id=str(uuid.uuid4()),
            user_id=user_id,
            scheduled_at=scheduled_at,
        )
        for attempt in range(self._max_insert_retries):
            try:
                self._repo.insert(appointment)
                return appointment
            except sqlite3.OperationalError:  # ví dụ: cơ sở dữ liệu is locked
                appointment._internal_retry_count = attempt + 1
        raise RuntimeError("could not store appointment")

    def upcoming(self) -> list[Appointment]:
        return self._repo.list_upcoming(datetime.now(timezone.utc))
```

**Bước 4.4 — Routers:**

```python
# backend/workflows/book_appointment/routers.py
from datetime import datetime
from fastapi import APIRouter
from .services import BookAppointmentService

def _to_appointment_record(a) -> dict:
    # Chỉ đúng ba trường của appointment_record trong hợp đồng — trường nội bộ
    # _internal_retry_count của Entities không bao giờ đi ra ranh giới.
    return {"appointment_id": a.appointment_id, "user_id": a.user_id, "scheduled_at": a.scheduled_at.isoformat()}

def create_book_appointment_router(service: BookAppointmentService):
    router = APIRouter()

    # Điểm giao tiếp create_appointment — form: http, address: "POST /appointments"
    @router.post("/appointments", status_code=201)
    def create_appointment(user_id: str, scheduled_at: str):
        # Chỉ kiểm tra và chuyển đổi định dạng ở ranh giới, rồi chuyển giao.
        return _to_appointment_record(service.book(user_id, datetime.fromisoformat(scheduled_at)))

    # Điểm giao tiếp list_upcoming — form: in_process, address: "list_upcoming_appointments"
    def list_upcoming_appointments():
        return [_to_appointment_record(a) for a in service.upcoming()]

    return router, list_upcoming_appointments
```

Router nhận Service đã được Main chuẩn bị qua tham số, không tự tạo. Hai điểm giao tiếp, hai hình thức, cùng một lớp Routers — mỗi điểm khớp đúng một Mục trong API Contract. Router chỉ đọc chuỗi thời gian thành kiểu thời gian và, theo chiều ngược lại, dựng dữ liệu đi ra với đúng các trường của `type` (chuyển đổi định dạng ở hai chiều), không tự kiểm tra bất kỳ điều kiện nghiệp vụ nào.

**Bước 4.5 — Ráp nối tại Main:**

```python
# backend/main.py
import os
import yaml
from fastapi import FastAPI
from workflows.scaffold.services import ScaffoldService
from workflows.book_appointment.adapters import AppointmentRepository
from workflows.book_appointment.services import BookAppointmentService
from workflows.book_appointment.routers import create_book_appointment_router

def startup() -> FastAPI:
    app = FastAPI()

    # 1. Đọc cấu hình — giá trị ranh giới cấp layer, và giá trị nội bộ của workflow
    connection_string = os.environ["STORAGE_CONNECTION_STRING"]
    with open("workflows/book_appointment/configs.yaml") as f:
        book_cfg = yaml.safe_load(f)

    # 2. Khởi tạo workflow nền tảng, đúng thứ tự (ở đây chỉ có scaffold)
    db_connection = ScaffoldService(connection_string).initialize()

    # 3. Khởi tạo Adapters bằng tài nguyên nền tảng, chuẩn bị cấu trúc lưu trữ riêng
    appointment_repo = AppointmentRepository(db_connection)
    appointment_repo.ensure_storage()

    # 4. Khởi tạo Services, tiêm Adapters và giá trị cấu hình
    book_service = BookAppointmentService(appointment_repo, book_cfg["max_insert_retries"])

    # 5. Khởi tạo Routers với Services vừa tạo, rồi đăng ký
    book_router, list_upcoming_appointments = create_book_appointment_router(book_service)
    app.include_router(book_router)

    # 6. Khởi động hạ tầng cắt ngang — trao lối vào list_upcoming_appointments
    #    (và lối vào của send_reminder, ráp nối tương tự) cho background_jobs.
    #    Xem Giai đoạn 5.

    return app
```

Đối chiếu lại toàn bộ chuỗi: hợp đồng khai báo `connection_string` → tệp cấu hình cấp layer chứa giá trị thật; giá trị nội bộ `max_insert_retries` có tên trong Configs của workflow → Main đọc cả hai, không lớp nào khác tự đọc → Main khởi tạo Adapters bằng tài nguyên nền tảng và để chính Adapters của `book_appointment` chuẩn bị bảng dữ liệu của nó, rồi tiêm vào Services → Main tạo Routers **với chính Services đó** rồi đăng ký. Không có lớp nào tự ý vượt qua ranh giới của chính nó trong suốt chuỗi này, và không có đối tượng nào được tạo ra ở Main mà không được dùng tới.