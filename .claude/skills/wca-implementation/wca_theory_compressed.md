# WCA — WORKFLOW-CENTRIC ARCHITECTURE

## 0. THUẬT NGỮ

Mỗi thuật ngữ dưới đây mang đúng một nghĩa trong toàn bộ bộ tài liệu. Khi một tài liệu khác dùng các từ này, nó dùng đúng nghĩa đã định ở đây. Cột tiếng Anh là thuật ngữ sẽ dùng khi bộ tài liệu được chuyển sang tiếng Anh.

| Thuật ngữ | Tiếng Anh | Định nghĩa |
|---|---|---|
| Workflow | workflow | Đơn vị chia mã nguồn của WCA. Có đúng hai loại: workflow nghiệp vụ và workflow nền tảng. |
| Workflow nghiệp vụ | business workflow | Workflow thực hiện một hành động nghiệp vụ đủ trọn vẹn để đứng một mình: có điểm bắt đầu, điểm kết thúc và một kết quả rõ ràng. Luôn có đủ năm lớp. |
| Workflow nền tảng | foundation workflow | Workflow chuẩn bị một điều kiện mà các workflow khác cần để có thể tồn tại. Không phục vụ yêu cầu nghiệp vụ nào. Chỉ có những lớp mà việc chuẩn bị của nó thực sự cần. |
| Tồn tại / vận hành | exist / operate | Một workflow **tồn tại** khi Main khởi tạo và ráp nối được nó. Một workflow **vận hành đúng** khi, lúc được kích hoạt, nó cho ra đúng kết quả đã cam kết. Mất điều kiện để tồn tại là dấu hiệu của sự phụ thuộc vào workflow nền tảng; mất điều kiện để vận hành đúng chỉ là phụ thuộc vào dữ liệu của một workflow khác. |
| Lớp | component layer | Một trong năm thành phần bên trong một workflow: Configs, Entities, Adapters, Services, Routers. |
| Layer hệ thống | system tier | Một đơn vị triển khai có code và vòng đời riêng, thường tương ứng một tiến trình hoặc một runtime (ví dụ: backend, dịch vụ AI, tiến trình chính của ứng dụng desktop). Nơi lưu trữ dữ liệu **không** phải một layer hệ thống: nó là tài nguyên do workflow nền tảng của layer sử dụng nó quản lý. |
| Main | main (composition root) | Điểm khởi tạo của **một** layer hệ thống. Mỗi layer hệ thống có đúng một Main. |
| Nơi lưu trữ | storage | Nơi dữ liệu được giữ lại qua các lần chạy (cơ sở dữ liệu, hệ thống tệp…). Là tài nguyên, không phải một layer hệ thống, không phải một workflow. Mỗi phần dữ liệu trong đó thuộc về đúng một workflow. |
| Hợp đồng tối cao | supreme contract | Nguồn đối chiếu duy nhất về ranh giới của mọi workflow. Gồm hai tệp: Data Schema và API Contract. |
| Data Schema | data schema | Hợp đồng dữ liệu: mỗi workflow mong muốn nhận gì, từ bên nào; cam kết trả ra gì, cho bên nào. |
| API Contract | API contract | Hợp đồng giao tiếp: mỗi workflow mở những điểm giao tiếp nào, bên nào được gọi, gọi vào thì nhận lại gì. |
| Điều khoản | clause | Phần hợp đồng dành cho một layer hệ thống. Riêng Điều khoản A dành cho các quy định chung. |
| Mục | item | Khai báo của một workflow bên trong một Điều khoản. |
| Ranh giới | boundary | Nơi dữ liệu đi vào hoặc đi ra một workflow. Đây là phần duy nhất mà hợp đồng quản lý. |
| Hộp đen | black box | Nguyên tắc xuyên suốt của hợp đồng: chỉ quản lý những gì đi qua ranh giới (hình dạng đầu vào/đầu ra, bên cung cấp/bên tiêu thụ), không bao giờ quản lý cách một workflow làm việc bên trong. Adapters cũng là một hộp đen đối với Services. |
| Bên cung cấp / bên tiêu thụ | provider / consumer | Bên cung cấp tạo ra và sở hữu một dữ liệu. Bên tiêu thụ nhận và dùng dữ liệu đó. |
| Điểm giao tiếp | endpoint | Một lối vào cụ thể của lớp Routers. Một workflow có thể có nhiều điểm giao tiếp. |
| Lối vào của hạ tầng cắt ngang | cross-cutting entry | Lối vào mà bên ngoài hệ thống gọi thẳng vào một thành phần hạ tầng cắt ngang, chỉ cho việc trình bày. Không phải điểm giao tiếp (hạ tầng cắt ngang không có Routers), nhưng được khai báo trong hợp đồng với cùng các trường. Xem §5. |
| Hình thức điểm giao tiếp | endpoint form | Cách một điểm giao tiếp được gọi: qua mạng, gọi hàm trong cùng tiến trình, qua kênh liên tiến trình… |
| Bên ngoài hệ thống | external | Mọi bên không thuộc phạm vi WCA của hệ thống: người dùng, phần giao diện được chủ đích đặt ngoài WCA, hệ thống của tổ chức khác. Trong hợp đồng, khi một bên như vậy gọi vào hệ thống, nó được ghi là `external`; dữ liệu nó mang tới được ghi nguồn gốc là `end_user` (người dùng) hoặc `third_party` (hệ thống của tổ chức khác). |
| Tài nguyên nền tảng | foundation resource | Thứ mà workflow nền tảng chuẩn bị (một kết nối cơ sở dữ liệu, một mô hình đã nạp…). Main trao nó cho các workflow cần dùng. |
| Tín hiệu sẵn sàng | readiness signal | Tín hiệu Main của một layer phát ra khi đã ráp nối và đăng ký xong mọi workflow, để Main khởi động nó biết layer đã nhận được lời gọi. Là việc giữa Main với Main, không phải điểm giao tiếp của workflow nào. |
| Hạ tầng cắt ngang | cross-cutting infrastructure | Thành phần đứng ngoài mọi workflow, chỉ làm việc kỹ thuật thuần túy (kích hoạt theo thời gian hoặc sự kiện, chuyển tiếp, trình bày), và luôn gọi vào workflow qua Routers. Xem §5. |
| Tiêm phụ thuộc | dependency injection | Main tạo ra công cụ rồi đưa vào nơi dùng nó, thay vì để nơi dùng tự tạo. |
| Phiên làm việc | session | Một lượt làm việc liên tục của một agent. Khi phiên đóng lại, agent không giữ được gì ngoài những gì đã được ghi ra tệp. |
| Checkpoint | checkpoint | Khối ghi chú chuẩn hóa trong code, lưu kinh nghiệm, vấn đề còn tồn đọng và bằng chứng, để bàn giao giữa các phiên làm việc. |

⚠ "Lớp" và "layer hệ thống" là hai khái niệm khác cấp. Năm lớp nằm **bên trong** một workflow; các workflow nằm **bên trong** một layer hệ thống. Không dùng lẫn hai từ này.

⚠ Chữ "bên ngoài" đứng một mình trong bộ tài liệu luôn có nghĩa là **bên ngoài workflow đang xét** — một workflow khác, hạ tầng cắt ngang, nơi lưu trữ, hay người dùng đều là "bên ngoài" theo nghĩa này. Khi muốn nói tới những bên không thuộc phạm vi WCA, bộ tài liệu luôn viết đủ là "bên ngoài hệ thống".

## 1. TRỤC PHÂN ĐỊNH

WCA chia mã nguồn theo hành động nghiệp vụ cụ thể (workflow), không theo vai trò kỹ thuật như MVC, không theo domain trừu tượng như DDD. Nếu đang cố map Entities thành Model, Routers thành Controller — dừng lại. Ranh giới ở đây đi theo một trục hoàn toàn khác.

## 2. TINH THẦN: CỨNG Ở HỢP ĐỒNG, MỀM Ở TRIỂN KHAI

WCA cứng ở cấp độ hợp đồng nhưng rất thoải mái ở cấp độ triển khai. Cả hai loại hợp đồng đều siết chặt đúng hai trục, và chỉ hai trục đó:

- **Đầu vào / đầu ra:** thứ đi vào và đi ra khỏi workflow có hình dạng, định dạng, chất lượng như thế nào.
- **Bên cung cấp / bên tiêu thụ:** bên nào cung cấp đầu vào, bên nào nhận đầu ra.

Mọi thứ nằm giữa hai đầu đó — cách tính toán, công cụ sử dụng, cách tổ chức code — là quyền tự quyết của người triển khai, miễn giữ đúng ranh giới giữa các lớp.

**Ẩn dụ: một chuỗi nhà hàng nhượng quyền.** Hợp đồng tối cao là bản hợp đồng nhượng quyền của tổng công ty. Nó quy định menu có đúng những món nào, mỗi món bưng ra phải đúng trọng lượng và thành phần đã công bố, và chi nhánh muốn mượn nguyên liệu của nhau thì phải đặt hàng qua đúng cửa giao nhận chính thức, không được tự vào kho của nhau lấy. Đây là điều duy nhất không được cãi: sai một ly là khách ăn ở chi nhánh A rồi sang chi nhánh B gọi món y hệt mà nhận một thứ khác hẳn. Còn bếp mỗi chi nhánh dùng bếp ga hay bếp từ, đầu bếp thuận tay nào, kê bàn thái rau ở góc nào — tổng công ty không can thiệp, miễn món ra đúng như hợp đồng đã hứa.

**Ví dụ xuyên suốt: workflow "phân loại khách hàng thành các nhóm" (K-Means).** Workflow nhận danh sách khách hàng, phân cụm, trả về khách nào thuộc nhóm nào.

- **Main** — quản lý tổng của chi nhánh: mở cửa, bật bếp, kiểm tra kho, rồi mới cho các khu nhận khách. Main đọc cấu hình, khởi tạo kết nối cơ sở dữ liệu, ráp nối workflow cho sẵn sàng. Main không viết dòng nào tính khoảng cách hay chọn số cụm. Nếu thấy quản lý đang đứng chiên trứng, có gì đó đã sai.
- **Configs** — bảng công thức chuẩn dán trong bếp: số cụm K = 5, ngưỡng hội tụ 0.001, nằm trong tệp cấu hình, đọc ra được, có tên. Không phải một con số `5` gõ thẳng vào giữa code khiến sau này không ai biết vì sao nó là 5.
- **Entities** — hình dạng cái tô, không phải món ăn: một "Khách hàng" có `id`, `chi_tieu_thang`, `tan_suat_mua`. Chỉ là khai báo cấu trúc, không có phép tính nào.
- **Adapters** — người đi chợ: cầm danh sách, mua đúng thứ được yêu cầu, mang về, không tự đổi thịt bò thành thịt gà. Một Adapter đọc dữ liệu khách hàng thô và trả về nguyên xi. Một Adapter khác thực hiện thuật toán phân cụm — dùng thư viện có sẵn hay tự cài đặt là quyền của Adapter.
- **Services** — đầu bếp chính, người duy nhất ra quyết định: chuẩn hóa dữ liệu bằng z-score hay min-max, lấy K từ Configs, danh sách rỗng thì xử lý thế nào, gọi Adapter nào trước, Adapter nào sau. Toàn bộ "trí tuệ" nghiệp vụ nằm ở đây.
- **Routers** — người phục vụ, cổng duy nhất khách được bước vào: điểm giao tiếp `POST /customers/segment` chỉ kiểm tra yêu cầu có đúng định dạng không, rồi chuyển cho Services. Không tự quyết "danh sách rỗng thì trả cụm mặc định" — đó là quyết định nghiệp vụ, thuộc về Services.

**Cứng** (hợp đồng quyết định, không ai được tự đổi): điểm giao tiếp `POST /customers/segment` nhận gì, trả gì; đầu ra "khách hàng đã phân nhóm" có đúng những trường đã hứa; bên nào được gọi điểm giao tiếp đó.

**Mềm** (bên trong workflow tự quyết định): thuật toán phân cụm dùng thư viện nào; chuẩn hóa bằng cách nào; đặt tên biến, chia hàm nhỏ ra sao.

*Điều đang cân nhắc thuộc về ranh giới — thứ bên khác sẽ nhìn thấy và phụ thuộc vào — hay thuộc về cách làm bên trong?*

## 3. SƠ ĐỒ PHÂN TẦNG

Hợp đồng tối cao đứng trên cùng, là nguồn đối chiếu duy nhất cho mọi quyết định liên quan tới ranh giới giữa các workflow. Main hiện thực hóa đúng những gì hợp đồng quy định — đọc cấu hình, khởi tạo và ráp nối mọi workflow lại với nhau — không tự chứa logic nghiệp vụ. Main không đọc tệp hợp đồng lúc chạy: hợp đồng là căn cứ để viết code và cấu hình, không phải dữ liệu mà hệ thống nạp vào. Bên dưới Main, hệ thống chia thành workflow nền tảng (chuẩn bị điều kiện cho những workflow cần tới nó) và workflow nghiệp vụ (phục vụ trực tiếp từng yêu cầu cụ thể, độc lập về mã nguồn với nhau). Bên trong mỗi workflow nghiệp vụ là năm lớp: Configs, Entities, Adapters, Services, Routers. Một workflow nền tảng chỉ có những lớp mà việc chuẩn bị của nó thực sự cần.

Năm lớp **ngang hàng về tầm quan trọng**: trong một workflow nghiệp vụ, không lớp nào được bỏ, workflow tê liệt nếu thiếu bất kỳ lớp nào. Nhưng chúng **không ngang hàng về chiều phụ thuộc**: Entities là hình dạng mà các lớp khác dựa vào; Adapters thao tác trên hình dạng đó; Services điều phối Adapters; Routers chuyển giao cho Services; Configs cung cấp giá trị cho các lớp cần tới, thông qua Main.

**Hệ thống nhiều layer.** Khi hệ thống gồm nhiều layer hệ thống (ví dụ một backend và một dịch vụ AI chạy thành hai tiến trình riêng), sơ đồ trên lặp lại **bên trong từng layer**: mỗi layer có Main riêng, workflow nền tảng riêng (nếu có gì cần chuẩn bị) và workflow nghiệp vụ riêng. Các layer chỉ nói chuyện với nhau qua những điểm giao tiếp đã khai báo trong API Contract. Hợp đồng tối cao thì chỉ có một cho cả hệ thống, mỗi layer một Điều khoản.

## 4. CHÍN THÀNH PHẦN CỐT LÕI

**Hợp đồng tối cao** — Văn bản quy định cấu trúc dữ liệu ở ranh giới và cách các thành phần giao tiếp với nhau, là nguồn đối chiếu duy nhất cho mọi quyết định liên quan tới ranh giới.

Đứng trên cùng sơ đồ phân tầng, trước cả Main. Không có nó, ranh giới workflow chỉ còn là hình thức — không gì đảm bảo các phần khác nhau của hệ thống, do những tác nhân khác nhau viết ra, sẽ khớp đúng khi ghép lại. Mọi sai lệch bắt nguồn từ đây sẽ lan ra toàn hệ thống, vì mọi thành phần khác đều lấy nó làm căn cứ. Hợp đồng gồm hai tệp tách biệt — Data Schema và API Contract — có hình thức khai báo cố định cho mọi dự án, bất kể công nghệ; hình thức đó được quy định chi tiết ở [02-contract.md](02-contract.md).

Hợp đồng chỉ quan tâm workflow này mong muốn nhận gì và cam kết trả gì — tuyệt đối không quan tâm, không quản lý cách nó xử lý bên trong để tạo ra kết quả đó. Nếu một workflow tự làm sai cấu trúc dữ liệu nội bộ của chính nó nhưng vẫn giữ đúng những gì đã cam kết ở ranh giới, hậu quả chỉ nằm gọn trong chính nó, không lan sang nơi khác — đây là hệ quả trực tiếp của tính cô lập, áp dụng ngay ở tầng hợp đồng.

*Giá trị hoặc quyết định trong đoạn code này có đang được tự bịa ra ngay tại chỗ, hay nó đang phản ánh đúng một điều khoản đã tồn tại trong hợp đồng từ trước? Và nếu đang mô tả cấu trúc dữ liệu nội bộ của một workflow, câu hỏi đó có thực sự thuộc phạm vi mà hợp đồng cần biết, hay đang lấn vào phần mà nó không nên can thiệp?*

---

**Main** — Điểm khởi tạo của một layer hệ thống: đọc cấu hình, khởi tạo và ráp nối các workflow, quản lý vòng đời.

Đứng ngay dưới hợp đồng, trên mọi workflow của layer đó. Không sở hữu logic nghiệp vụ của bất kỳ workflow nào, chỉ đọc và lắp ráp. Một sai lệch ở đây — tự định nghĩa giá trị thay vì đọc từ nơi đã quy định, hoặc khởi tạo sai thứ tự — ảnh hưởng tới toàn bộ layer ngay từ thời điểm khởi động, trước khi bất kỳ workflow nào kịp hoạt động.

Main làm khâu hậu cần — đọc, ráp nối, đăng ký — không làm khâu quyết định nghiệp vụ. Nó đưa công cụ đã chuẩn bị sẵn cho các workflow dùng, nhưng không tự quyết định các workflow đó sẽ dùng công cụ ấy ra sao.

Mỗi layer hệ thống có đúng một Main. Trong hệ thống nhiều layer, Main của layer được khởi động đầu tiên chịu trách nhiệm khởi động, chờ sẵn sàng và dừng các layer còn lại — đó vẫn là quản lý vòng đời, không phải nghiệp vụ, nên nó thuộc về Main chứ không thuộc về một workflow. Một giá trị Main sinh ra lúc chạy (ví dụ một cổng mạng còn trống) rồi truyền cho layer khác, đối với bên nhận, vẫn là một giá trị cấu hình.

Việc chờ một layer sẵn sàng diễn ra **giữa Main với Main**, không qua workflow nào: một layer chỉ sẵn sàng khi Main của nó đã ráp nối và đăng ký xong mọi workflow, và chỉ Main đó biết điều này. Vì vậy Main của layer được khởi động phát ra một **tín hiệu sẵn sàng** khi đã xong, còn Main khởi động nó thì chờ tín hiệu đó. Hình thức tín hiệu do dự án chọn và ghi trong luật chung của hợp đồng, vì mọi layer phải cùng tuân theo.

Khi một workflow cần dùng chính công cụ quản lý vòng đời của Main (ví dụ để dừng rồi khởi động lại một layer khác), Main trao công cụ đó cho workflow lúc khởi tạo, như trao một tài nguyên. Ngoài việc ráp nối các lớp của chính workflow (tạo Adapters rồi tiêm vào Services…), thứ duy nhất Main tự tạo ra để trao cho workflow như một tài nguyên là công cụ quản lý vòng đời; mọi tài nguyên dùng chung khác do workflow nền tảng chuẩn bị. Main là **nguồn** của những gì nó trao lúc khởi tạo, nhưng không bao giờ là **bên gọi** một workflow lúc hệ thống đang chạy.

*Đoạn code này đang đọc một giá trị đã có sẵn hoặc đang ráp nối các thành phần lại với nhau, hay đang tự quyết định một giá trị hoặc một hành vi nghiệp vụ?*

---

**Workflow nền tảng** — Loại workflow đặc biệt, tồn tại để chuẩn bị điều kiện cho các workflow khác có thể tồn tại, không phục vụ yêu cầu nghiệp vụ nào — trong phần lớn trường hợp chỉ cần chạy một lần lúc hệ thống khởi động, nhưng bản chất quyết định vai trò của nó không nằm ở tần suất chạy.

Đứng giữa Main và các workflow nghiệp vụ; những workflow nghiệp vụ cần tới điều kiện mà nó chuẩn bị phụ thuộc vào nó theo một chiều duy nhất, không có chiều ngược lại. Một sự cố ở đây không dừng ở chính nó — những gì phụ thuộc vào nó không thể được khởi tạo, bất kể những phần đó có tự thân hoàn chỉnh tới đâu.

Thứ nó chuẩn bị — tài nguyên nền tảng — được Main trao cho những workflow cần dùng, không phải được các workflow đó tự đi lấy. Một layer không có gì cần chuẩn bị thì không cần workflow nền tảng: không tạo workflow nền tảng chỉ để cho đủ hình thức.

Workflow nền tảng chuẩn bị tài nguyên **chung** (một kết nối, một vị trí lưu trữ, một mô hình đã nạp), không chuẩn bị gì mang ý nghĩa nghiệp vụ của workflow khác. Ví dụ, nó mở kết nối tới nơi lưu trữ, nhưng không tạo cấu trúc lưu trữ (bảng, thư mục…) cho dữ liệu mà các workflow nghiệp vụ sở hữu — việc đó thuộc về chính workflow sở hữu dữ liệu.

Workflow nền tảng không bắt buộc có đủ năm lớp. Nó có lớp nào là do việc chuẩn bị của nó cần lớp đó: thường có Configs (giá trị nó cần) và Adapters (thao tác kỹ thuật để chuẩn bị); có Services khi việc chuẩn bị có quyết định cần đưa ra; có Routers chỉ khi một workflow hay một thành phần hạ tầng cắt ngang cần gọi lại nó sau lúc khởi động (ví dụ yêu cầu nạp lại tài nguyên đã chuẩn bị). Câu hỏi "layer đã sẵn sàng chưa" không phải lý do để có Routers: đó là tín hiệu giữa Main với Main (xem Main ở trên).

*Đoạn code này đang phục vụ trực tiếp một yêu cầu cụ thể của người dùng, hay nó đang chuẩn bị điều kiện để những đoạn code khác hoạt động được?*

---

**Workflow nghiệp vụ** — Đơn vị tổ chức trung tâm của WCA, mỗi workflow tự chứa trọn vẹn năm lớp để hoàn thành một hành động nghiệp vụ cụ thể.

Đứng ngang hàng với các workflow nghiệp vụ khác, độc lập về mặt mã nguồn. Một sai lệch ở đây — thiếu một lớp, hoặc gọi thẳng vào nội bộ của một workflow khác thay vì đi qua điểm vào chính thức của nó — phá vỡ đúng ranh giới cô lập là giá trị cốt lõi của toàn bộ kiến trúc, kéo theo sự phụ thuộc chéo không kiểm soát được giữa các phần vốn dĩ nên tách biệt.

Dữ liệu một workflow tạo ra thuộc quyền sở hữu của chính nó, kể cả khi nhiều workflow cùng lưu dữ liệu trong một nơi lưu trữ vật lý: mỗi phần dữ liệu (bảng, tệp…) thuộc về đúng một workflow, và chỉ workflow đó được đọc, ghi, hay đổi cấu trúc của phần dữ liệu ấy. Workflow khác muốn đọc dữ liệu đó — hay muốn nó thay đổi — phải gọi qua điểm giao tiếp mà workflow sở hữu công bố. Việc tạo và nâng cấp cấu trúc lưu trữ cho phần dữ liệu của mình cũng là việc của chính workflow sở hữu (một hành động kỹ thuật trong Adapters của nó), không phải của workflow nền tảng. Đối với workflow đang gọi, một workflow khác cũng là "bên ngoài" giống như cơ sở dữ liệu hay một dịch vụ mạng: lời gọi đi qua Adapters của bên gọi, tới đúng Routers của bên được gọi, và dữ liệu nhận về được mô tả bằng Entities của chính bên gọi — không mượn code nội bộ của bên được gọi.

Mức độ ảnh hưởng khi gỡ bỏ một workflow nghiệp vụ không phải tiêu chí để đánh giá nó có phải nền tảng hay không — một workflow nghiệp vụ hoàn toàn có thể là nơi nhiều workflow khác phụ thuộc vào dữ liệu đầu ra của nó, và việc gỡ nó gây ảnh hưởng lan rộng, nhưng đó là ảnh hưởng tới khả năng vận hành đúng của các workflow khác, không phải khả năng tồn tại của chúng. Bản chất của sự phụ thuộc — tồn tại hay chỉ vận hành — mới là điều phân định, không phải quy mô ảnh hưởng.

*Đoạn code này đang gọi thẳng vào một phần nội bộ của workflow khác, hay đang đi qua đúng điểm tiếp nhận chính thức của nó? Và nếu đang cân nhắc gỡ bỏ một workflow, hậu quả thực sự là các workflow khác không còn tồn tại được, hay chúng vẫn tồn tại nhưng không còn nhận được thứ chúng cần để vận hành?*

---

**Configs** — Nơi mọi giá trị cấu hình mà workflow dùng tới được đặt tên và đặt ra ngoài code. Giá trị cấu hình là giá trị workflow nhận lúc được khởi tạo và không đổi trong suốt vòng đời của nó.

Đứng ở vị trí đặc biệt so với bốn lớp còn lại — nó không chứa code, nó là dữ liệu tĩnh mà mọi lớp khác trong workflow đều có thể cần tới. Một giá trị sai hoặc thiếu căn cứ ở đây không tự lộ ra ngay lập tức, mà âm thầm lan vào bất kỳ hành vi nào phụ thuộc vào đúng giá trị đó, thường chỉ lộ diện muộn, ở một nơi xa nguồn gốc thật của lỗi.

Giá trị trong Configs có hai loại, phân biệt bằng một câu hỏi: bên ngoài workflow có nhìn thấy hoặc phụ thuộc vào giá trị này không?

- **Giá trị ranh giới** — ảnh hưởng tới thứ bên khác nhận được hoặc phải khớp theo (ví dụ độ dài một mã mà hai layer cùng phải hiểu giống nhau, hay số cụm K nếu bên tiêu thụ dựa vào đúng số nhóm đó). Loại này là điều khoản của hợp đồng: Configs hiện thực hóa đúng giá trị đã quy định, không tự đặt.
- **Giá trị nội bộ** — chỉ phục vụ cách workflow tự làm việc (ngưỡng hội tụ, số lần thử lại, thời gian chờ). Loại này thuộc quyền tự quyết của workflow và không xuất hiện trong hợp đồng — nhưng vẫn phải có tên và nằm trong Configs, không phải một con số gõ thẳng vào code.

Dù thuộc loại nào, việc đọc giá trị cấu hình chỉ xảy ra ở Main; các lớp khác nhận giá trị đã được chuẩn bị sẵn. Giá trị mà Main cần cho cả layer (ví dụ giá trị hiện thực hóa một điều khoản mà nhiều layer phải thống nhất, hay giá trị Main dùng để khởi động) nằm ở cấu hình cấp layer; Configs của một workflow chỉ chứa giá trị riêng của workflow đó. Một workflow chưa cần giá trị nào vẫn có Configs — rỗng — để giá trị đầu tiên xuất hiện sau này có sẵn chỗ đứng, không bị gõ thẳng vào code.

*Giá trị này là giá trị ranh giới — vậy nó có truy ngược được về một điều khoản cụ thể trong hợp đồng không? Hay là giá trị nội bộ — vậy nó đã có tên và nằm trong Configs chưa, hay đang là một con số không ai giải thích được?*

---

**Entities** — Định nghĩa cấu trúc dữ liệu thuần túy của một workflow, không chứa logic xử lý, không thao tác vào/ra.

Đứng ở tầng nền của cả workflow, mọi lớp khác đều dựa vào hình dạng dữ liệu mà nó mô tả để hoạt động đúng. Một sai lệch ở đây không dừng lại ở chính nó — nó lan truyền theo đúng chiều phụ thuộc, ảnh hưởng nặng nhất tới lớp trực tiếp thao tác với dữ liệu đó, rồi tiếp tục lan ra bất kỳ lớp nào phía sau còn phụ thuộc vào kết quả của lớp đó.

Entities là của riêng workflow sở hữu nó. Khi workflow nhận dữ liệu từ một workflow khác, nó tự mô tả hình dạng dữ liệu đó trong Entities của chính mình, khớp với hợp đồng — không dùng lại Entities của workflow nguồn. Sự trùng lặp này là chủ đích: hai bên chỉ ràng buộc với nhau qua hợp đồng, không qua code.

*Đoạn code vừa viết chỉ mô tả hình dạng dữ liệu, hay nó đang chứa một động từ hành động, một điều kiện, một phép tính?*

---

**Adapters** — Cầu nối kỹ thuật cấp thấp duy nhất giữa một workflow và thế giới bên ngoài nó, đơn nhiệm, không tự quyết định trình tự xử lý.

Đứng giữa Entities và Services, là nơi duy nhất workflow chạm tới công nghệ, hệ thống bên ngoài. "Thế giới bên ngoài" bao gồm mọi thứ không phải logic của chính workflow: nơi lưu trữ, hệ thống tệp, mạng, thư viện hay engine của bên thứ ba, và cả Routers của các workflow khác. Nếu Adapters tự ý quyết định trình tự thay vì chỉ thực hiện đúng một hành động kỹ thuật, ranh giới giữa "làm gì" và "quyết định làm gì" bị xóa nhòa, kéo logic điều phối lẫn vào một nơi vốn chỉ nên chứa thao tác thuần túy.

Bên trong một hành động kỹ thuật, Adapters được tự do lựa chọn cách thực hiện — dùng một công cụ đã có sẵn hay tự xây dựng từ đầu — miễn giữ đúng input và output đã cam kết. Đây là một hộp đen khác, đứng thấp hơn hợp đồng: Services chỉ cần biết Adapters trả về đúng thứ đã hứa, không cần biết bên trong làm bằng cách nào.

Phép thử để phân định một đoạn xử lý thuộc Adapters hay Services: hình dung thay đoạn đó bằng một cách làm khác. Nếu mọi cách làm đúng đắn đều phải cho ra cùng một kết quả — chỉ khác nhau về công cụ, tốc độ, kỹ thuật — đoạn đó là một **công cụ**, thuộc Adapters. Nếu các cách làm khác nhau cho ra những kết quả khác nhau mà cách nào cũng có thể coi là hợp lý, thì việc chọn cách nào chính là chọn một ý nghĩa nghiệp vụ — đoạn đó là một **quyết định**, thuộc Services. Ví dụ: chạy thuật toán phân cụm với dữ liệu và số cụm cho trước là công cụ; chọn chuẩn hóa dữ liệu bằng z-score hay min-max — hai cách cho ra hai kiểu phân nhóm khác nhau — là quyết định.

*Đoạn code này chỉ thực hiện đúng một lệnh gọi kỹ thuật cụ thể, hay nó đang tự quyết định làm gì tiếp theo dựa trên một điều kiện?*

---

**Services** — Lớp duy nhất chứa logic nghiệp vụ thực sự của một workflow, điều phối các Adapters theo đúng trình tự cần thiết.

Đứng giữa Adapters và Routers, là nơi duy nhất workflow ra quyết định. Nếu nó tự khởi tạo Adapters thay vì nhận từ Main, hoặc tự gọi thẳng một công nghệ ngoài thay vì đi qua Adapters, ranh giới trách nhiệm giữa các lớp sụp đổ, khiến việc kiểm soát hay thay thế từng phần trở nên khó khăn hơn nhiều so với khi ranh giới được giữ nguyên vẹn.

Services dùng dữ liệu, công cụ, và tham số mà các lớp khác cung cấp, nhưng không sở hữu bất kỳ thứ nào trong số đó — nó chỉ sở hữu logic quyết định dùng chúng ra sao.

*Đoạn code này có đang tự gõ thẳng một lệnh kỹ thuật, hay tự tạo ra một Adapters mới, thay vì gọi tới một Adapters đã được truyền vào?*

---

**Routers** — Điểm vào duy nhất của một workflow, tiếp nhận kích hoạt từ bên ngoài workflow và chuyển giao cho Services, hình thức cụ thể linh hoạt tùy bối cảnh.

Đứng ở lớp ngoài cùng, là cổng duy nhất hợp lệ để bất kỳ ai — người dùng, một workflow khác, hay một thành phần hạ tầng cắt ngang — kích hoạt workflow này. Hình thức của cổng đó co giãn theo đúng nhu cầu thực tế: một điểm giao tiếp qua mạng khi bên gọi nằm ở tiến trình khác, hoặc chỉ một hàm được gọi trực tiếp khi bên gọi nằm cùng tiến trình — nhưng dù mang hình thức nào, nó vẫn là cổng duy nhất, không có ngoại lệ đi tắt. Nếu nó tự quyết định kết quả dựa trên điều kiện nghiệp vụ, hoặc nếu có một con đường nào khác đi vòng qua nó để chạm thẳng vào Services, ranh giới "điểm vào duy nhất" bị phá vỡ, mở ra khả năng workflow bị kích hoạt hoặc thao túng theo những cách không thể kiểm soát hay truy vết được.

Việc duy nhất Routers được tự làm trước khi chuyển giao là kiểm tra **tính hợp lệ về định dạng** của đầu vào — đúng kiểu, đủ trường bắt buộc, đúng cú pháp, đúng những gì `type` trong hợp đồng mô tả — và chuyển đổi định dạng ở ranh giới (ví dụ đọc một chuỗi thời gian thành kiểu thời gian của ngôn ngữ). Mọi kiểm tra cần tới ý nghĩa nghiệp vụ hay tới dữ liệu đang lưu (khách hàng này có tồn tại không, số tiền có vượt giá đơn không) là quyết định, thuộc Services.

"Duy nhất" nói về lớp, không nói về số lượng lối vào: Routers của một workflow có thể có nhiều điểm giao tiếp, và các điểm giao tiếp đó có thể mang nhiều hình thức cùng lúc (ví dụ một điểm qua mạng cho người dùng, một hàm gọi trực tiếp cho workflow khác). Mọi điểm giao tiếp mà có bên ngoài gọi tới đều phải được khai báo trong API Contract.

*Đoạn code này có đang tự quyết định kết quả trả về dựa trên một điều kiện nghiệp vụ, hay nó chỉ đang kiểm tra tính hợp lệ về định dạng rồi chuyển giao?*

## 5. THÀNH PHẦN PHỤ TRỢ: HẠ TẦNG CẮT NGANG

Không phải mọi tác vụ đều khớp với nhịp "tiếp nhận — xử lý — trả kết quả" của một workflow. Một tác vụ chạy theo thời gian (quét định kỳ), chạy sau khi người yêu cầu đã nhận phản hồi, hay chỉ làm cầu chuyển tiếp giữa các phần của hệ thống, cần một chỗ đứng ngoài mọi workflow: hạ tầng cắt ngang.

Hạ tầng cắt ngang **chỉ được làm việc kỹ thuật thuần túy**: kích hoạt theo thời gian hoặc sự kiện, chuyển tiếp dữ liệu, trình bày kết quả. Nó **không được ra quyết định nghiệp vụ** — không lọc, không chọn, không tính toán dựa trên ý nghĩa của dữ liệu nghiệp vụ; những việc đó thuộc Services của một workflow. Nó **luôn đi qua Routers** khi chạm vào bất kỳ workflow nào, dù để lấy dữ liệu hay để kích hoạt xử lý, và dù nó nằm cùng hay khác layer hệ thống với workflow đó. Nó được khai báo trong hợp đồng như mọi bên gọi khác.

Thông thường hạ tầng cắt ngang ở vai bên gọi. Ngoại lệ duy nhất: bên ngoài hệ thống có thể gọi thẳng vào nó cho một việc **trình bày** thuần túy mà chỉ layer nơi nó chạy làm được (ví dụ mở hộp thoại chọn tệp của hệ điều hành). Khi đó, lối vào ấy là một phần của ranh giới — bên gọi sẽ vỡ nếu nó thay đổi — nên được khai báo trong hợp đồng với đủ hình dạng như một điểm giao tiếp. Dữ liệu lối vào ấy trả về, nếu sau đó đi vào một workflow, đi vào như dữ liệu từ bên ngoài hệ thống, qua điểm giao tiếp của chính workflow đó.

Điều đứng ngoài workflow chỉ là phần **kích hoạt và chuyển tiếp**. Công việc nghiệp vụ mà một tác vụ chạy theo thời gian thực hiện — ví dụ quyết định lịch hẹn nào cần nhắc và gửi lời nhắc — vẫn là một workflow nghiệp vụ đủ năm lớp, được hạ tầng cắt ngang gọi tới qua Routers.

Hạ tầng cắt ngang không có năm lớp; cách tổ chức bên trong của nó là tự do, miễn không chứa quyết định nghiệp vụ. Nó được Main của layer nơi nó chạy khởi động, sau khi các workflow mà nó gọi tới đã sẵn sàng. Nó có thể giữ trạng thái kỹ thuật của riêng nó (ví dụ thời điểm của lượt chạy gần nhất), nhưng không giữ và không tự tạo ra dữ liệu nghiệp vụ: mọi dữ liệu nó chuyển tới một workflow đều có nguồn gốc ở một workflow khác hoặc ở bên ngoài hệ thống. Khi một workflow muốn giao việc cho hạ tầng cắt ngang (ví dụ muốn một việc xảy ra sau), nó làm việc đó qua Adapters của mình, như mọi thao tác kỹ thuật ra bên ngoài khác.

*Thành phần này đang chỉ quyết định **khi nào** gọi và **chuyển** kết quả đi đâu, hay đang quyết định **cái gì** là đúng về mặt nghiệp vụ?*

## 6. CHẨN ĐOÁN TỪ NGOÀI VÀO TRONG

Khi một workflow không hoạt động như mong đợi, đi từ ngoài vào trong, theo đúng thứ tự, dừng ở bước đầu tiên phát hiện sai:

1. **Đăng ký** — Main đã ráp nối và đăng ký workflow này chưa? Một workflow chưa được đăng ký thì không ai kích hoạt được, dù bên trong hoàn hảo.
2. **Routers** — điểm giao tiếp có nhận được kích hoạt, và có chuyển giao đúng cho Services không?
3. **Services** — quyết định nghiệp vụ và trình tự điều phối có đúng không?
4. **Adapters** — hành động kỹ thuật có trả về đúng thứ đã hứa không?

Thứ tự này có chủ đích: lỗi ở vòng ngoài che khuất mọi vòng bên trong, nên bắt đầu từ bên trong thì dễ mất công sửa một thứ vốn chưa từng được gọi tới.

## 7. RANH GIỚI ÁP DỤNG

WCA không phải một kiến trúc toàn năng. Nó khai thác tốt nhất khi các workflow trong hệ thống có thể đứng độc lập, ít cần chạm tới nhau. Khi nhiều workflow buộc phải cùng dựa vào một lõi xử lý phức tạp dùng chung, kiến trúc này không sụp đổ, nhưng bắt đầu phải trả một cái giá — và cái giá đó lớn hay nhỏ phụ thuộc vào việc lõi dùng chung đó nặng tới đâu, thay đổi thường xuyên tới đâu. Một tín hiệu cụ thể của cái giá này: một workflow phải gom dữ liệu từ nhiều workflow khác trên hầu hết mọi lượt xử lý của nó.

Một phần hệ thống có thể được chủ đích đặt ngoài WCA — ví dụ một tầng giao diện chỉ hiển thị và chuyển yêu cầu, được tổ chức theo quy ước thông thường của công nghệ đó, hoặc theo iWCA (skill `iwca-implementation` — áp WCA vào bên trong một layer giao diện mà không đổi vai `external` của nó). Khi đó phần ấy là **bên ngoài hệ thống** đối với phần theo WCA, và ranh giới giữa hai phần chính là API Contract. Quyết định này phải được ghi rõ, không được ngầm hiểu.

*Nhìn lại hệ thống đang xây: các workflow trong đó thực sự tách biệt với nhau, hay chúng liên tục cần chạm vào cùng một thứ để hoạt động đúng?*