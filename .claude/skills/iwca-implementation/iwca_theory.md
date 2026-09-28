# iWCA — WORKFLOW-CENTRIC ARCHITECTURE CHO LAYER GIAO DIỆN

*Tệp này giả định người đọc đã hiểu lý thuyết nền WCA ([wca_theory_compressed.md](../wca-implementation/wca_theory_compressed.md)). Nó không giải thích lại workflow, năm lớp, Main hay hợp đồng tối cao; nó chỉ nói những gì **khác** hoặc **thêm vào** khi đơn vị đang xây là một layer giao diện.*

## 0. THUẬT NGỮ BỔ SUNG

Mọi thuật ngữ trong §0 của lý thuyết WCA giữ nguyên nghĩa. Bảng dưới đây chỉ thêm những thuật ngữ mà iWCA cần. Cột tiếng Anh là thuật ngữ dùng khi bộ tài liệu được chuyển sang tiếng Anh, và là gốc của các định danh trong code.

| Thuật ngữ | Tiếng Anh | Định nghĩa |
|---|---|---|
| Layer giao diện | interface tier | Layer hệ thống chạy phần giao diện người dùng (ví dụ tiến trình renderer của một ứng dụng desktop, hay một ứng dụng web chạy trong trình duyệt). Với hợp đồng tối cao của hệ thống, nó là bên gọi `external` và không có Điều khoản; với chính nó, nó được tổ chức theo iWCA. |
| Hệ thống phía sau | backend system | Toàn bộ phần hệ thống nằm trong phạm vi hợp đồng tối cao — mọi layer có Điều khoản — nhìn từ vị trí của layer giao diện. Là bên duy nhất mà layer giao diện gọi tới, và chỉ qua những gì hợp đồng tối cao khai báo cho `external`. |
| Phân khu | zone | Một trong ba vùng bên trong layer giao diện: phân khu logic, phân khu kit, phân khu màn hình. Mỗi phân khu có đúng một trách nhiệm và một danh sách đóng những gì nó được phép phụ thuộc vào (§7). |
| Phân khu logic | logic zone | Nơi chứa các workflow giao diện, tổ chức đúng theo WCA: năm lớp, Main ráp nối. Không chứa mã giao diện, không phụ thuộc thư viện giao diện. |
| Phân khu kit | kit zone | Nơi chứa mọi quy định về hình thức: token và component trình bày. Không biết gì về nghiệp vụ. |
| Phân khu màn hình | screens zone | Nơi lắp phân khu logic với phân khu kit thành những gì người dùng nhìn thấy: layout, trang, hook màn hình. |
| Workflow giao diện | interface workflow | Workflow nằm trong phân khu logic, không phải workflow nền tảng. Nó hiện thực hóa phía bên gọi của một hoặc nhiều điểm giao tiếp mà hệ thống phía sau công bố cho `external`, và chuyển kết quả thành dữ liệu sẵn sàng hiển thị. Theo phân loại của WCA — chỉ có đúng hai loại workflow — nó là một **workflow nghiệp vụ**: nó phục vụ trực tiếp một hành động của người dùng, và luôn có đủ năm lớp. |
| Workflow đối ứng | counterpart workflow | Workflow của hệ thống mà workflow giao diện gọi tới điểm giao tiếp của nó. Theo mặc định, một workflow giao diện có đúng một workflow đối ứng và mang cùng tên. |
| Quyết định trình bày | presentation decision | Một quyết định chỉ ảnh hưởng tới việc dữ liệu được **hiển thị** thế nào, không ảnh hưởng tới việc dữ liệu **là** gì trong hệ thống. Là loại quyết định duy nhất Services của workflow giao diện được đưa ra (§5). |
| Quyết định nghiệp vụ | business decision | Một quyết định mà hợp đồng giao cho hệ thống phía sau: dữ liệu có hợp lệ về nghiệp vụ không, một con số được tính ra sao, một thao tác có được phép không. Phía giao diện không bao giờ đưa ra loại quyết định này (§5). |
| Kết quả lời gọi | call result | Kiểu dữ liệu cố định mà Adapters của workflow giao diện trả về cho Services. Có đúng bốn loại (§6). |
| Kết quả trình bày | view result | Kiểu dữ liệu cố định mà Services trả về cho Routers, và Routers trả về cho phân khu màn hình. Có đúng bốn loại (§6). |
| Token | token | Một giá trị trình bày có tên (một màu, một khoảng cách, một cỡ chữ, một thời lượng chuyển động). Là nguồn duy nhất của mọi giá trị trình bày trong layer. |
| Component kit | kit component | Một đơn vị trình bày tái sử dụng được trong phân khu kit: nhận props, hiển thị, gọi lại callback. Không gọi gì ra ngoài, không biết dữ liệu nghiệp vụ. |
| Layout | layout | Khung bố cục chung mà nhiều trang cùng nằm trong (thanh điều hướng, vùng nội dung, vùng thông báo). Thuộc phân khu màn hình. |
| Trang | page | Một màn hình người dùng điều hướng tới được. Thuộc phân khu màn hình, luôn đi cặp với đúng một hook màn hình. |
| Hook màn hình | screen hook | Đơn vị giữ trạng thái giao diện của một trang (đang tải, dữ liệu đang hiển thị, bản nháp của form, kết quả gần nhất) và gọi Routers. Không tính toán, không định dạng, không quyết định. |
| Giá trị khởi động | launch value | Giá trị mà Main của layer giao diện nhận từ môi trường chủ lúc khởi động (ví dụ địa chỉ của hệ thống phía sau, do một Main khác chọn lúc chạy). Với các workflow giao diện, đây là `environment_config` theo đúng nghĩa của WCA. |
| Môi trường chủ | host environment | Thứ đang chạy layer giao diện và có thể trao cho nó giá trị khởi động: tiến trình chính của ứng dụng desktop (qua script preload), trình duyệt, hay công cụ build. |
| Kịch bản bấm thử | walkthrough script | Danh sách có định dạng cố định các thao tác trên một trang cùng kết quả nhìn thấy được mong đợi — bằng chứng chạy thật của phân khu màn hình (xem [i6-self-check.md](i6-self-check.md)). |

⚠ Chữ **"nghiệp vụ"** xuất hiện trong hai thuật ngữ khác nhau và không được hiểu lẫn: "workflow nghiệp vụ" là **loại** workflow (đối lập với workflow nền tảng — phục vụ trực tiếp một hành động, có đủ năm lớp); "quyết định nghiệp vụ" là **loại** quyết định (đối lập với quyết định trình bày — xem §5). Một workflow giao diện là workflow nghiệp vụ, nhưng không bao giờ đưa ra quyết định nghiệp vụ. Không có mâu thuẫn ở đây: nó phục vụ hành động của người dùng, còn luật nghiệp vụ thì đã có chủ ở hệ thống phía sau.

⚠ **Lớp**, **phân khu** và **layer hệ thống** là ba cấp khác nhau, lồng vào nhau: năm lớp nằm bên trong một workflow; các workflow giao diện nằm trong phân khu logic; ba phân khu nằm bên trong layer giao diện. Không dùng lẫn ba từ này. Không gọi phân khu là "tầng" hay "khối": "tầng" dễ lẫn với "hạ tầng cắt ngang" và cấu trúc ba tầng của hợp đồng, "khối" đã được dùng cho khối checkpoint.

## 1. TRỤC PHÂN ĐỊNH

Một giao diện làm ba việc có bản chất khác nhau: **nói chuyện với hệ thống** (gọi, nhận, hiểu kết quả), **trông như thế nào** (màu, khoảng cách, chữ, hình dạng component), và **ghép hai thứ đó lại thành một màn hình** (trang này hiện gì, bấm nút kia thì gọi gì). Cách tổ chức giao diện quen thuộc để cả ba việc lẫn trong cùng một tệp component — một tệp vừa gọi mạng, vừa định dạng tiền, vừa chứa mã màu, vừa quyết định khi nào hiện thông báo lỗi. iWCA tách ba việc đó thành ba phân khu, mỗi phân khu chỉ làm một việc.

Nếu đang cố ánh xạ phân khu logic thành "Model", phân khu màn hình thành "View" — dừng lại, giống như WCA đã cảnh báo với MVC. Phân khu logic không phải một model dữ liệu chung: nó chia theo workflow, mỗi workflow là một hệ sinh thái đóng kín. Phân khu kit không phải "View" của bất kỳ dữ liệu nào: nó không biết dữ liệu nghiệp vụ tồn tại.

Có một cách nhìn giúp neo iWCA vào chính lý thuyết WCA, thay vì coi nó là một phát minh tách rời. Trong WCA, hạ tầng cắt ngang ([§5 của lý thuyết WCA](../wca-implementation/wca_theory_compressed.md)) là thành phần chỉ làm việc kỹ thuật thuần túy — **kích hoạt** theo thời gian hoặc sự kiện, **chuyển tiếp**, **trình bày** — luôn gọi vào workflow qua Routers, và không bao giờ ra quyết định nghiệp vụ. Đó chính xác là vai trò của phân khu màn hình: nó kích hoạt khi người dùng bấm, chuyển tiếp dữ liệu người dùng nhập vào Routers, và trình bày kết quả. Phân khu kit là bộ công cụ trình bày mà nó dùng. Vì vậy mọi ràng buộc của hạ tầng cắt ngang trong WCA áp dụng trọn vẹn cho phân khu màn hình: nó quyết định **khi nào** gọi và hiển thị kết quả **ở đâu**, không quyết định **cái gì** là đúng.

*Đoạn code đang viết thuộc việc nào trong ba việc — nói chuyện với hệ thống, quy định hình thức, hay lắp ghép — và nó có đang lẫn sang việc thứ hai không?*

## 2. TINH THẦN: CỨNG Ở RANH GIỚI, MỀM BÊN TRONG

Giống WCA, iWCA siết chặt đúng những gì ở ranh giới và để tự do những gì bên trong.

**Cứng** — không ai được tự đổi, và phần lớn được máy kiểm (xem [i2-scaffold.md](i2-scaffold.md)):

- Ma trận phụ thuộc giữa các phân khu (§7).
- Hình dạng của hai kiểu kết quả (§6).
- Ranh giới giữa quyết định trình bày và quyết định nghiệp vụ (§5).
- Mọi thứ phân khu logic gửi tới hoặc nhận từ hệ thống phía sau phải khớp hợp đồng tối cao của hệ thống.
- Mọi giá trị trình bày đi ra từ token.

**Mềm** — thuộc quyền tự quyết của người triển khai: component kit được chia nhỏ ra sao, đặt tên biến thế nào, dùng thư viện kiểm dữ liệu nào trong Adapters, thứ tự các trường trên một form, một trang dùng bảng hay danh sách.

**Ẩn dụ: vẫn là chuỗi nhà hàng nhượng quyền của WCA, nhưng lần này nhìn vào phòng ăn.** Bếp (phân khu logic) nấu theo đúng công thức của tổng công ty và gửi món ra qua một ô chuyển món duy nhất (Routers). Kho đồ bày biện (phân khu kit) giữ bộ bát đĩa, khăn trải bàn, bảng màu và quy chuẩn trang trí của cả chuỗi — nó không biết hôm nay bếp nấu gì. Người phục vụ phòng ăn (phân khu màn hình) nhận món qua ô chuyển món, lấy đúng bát đĩa trong kho, bày lên bàn theo sơ đồ. Người phục vụ không vào bếp nêm thêm muối (không ra quyết định mà bếp chịu trách nhiệm), không tự mang bát đĩa của nhà mình tới (không tự đặt một mã màu ngoài token), và không đi vòng ra cửa sau để lấy món (không gọi thẳng ra mạng). Quản lý chi nhánh (Main) mở cửa, xếp người vào đúng vị trí, trao chìa khóa kho — rồi đứng ngoài.

*Điều đang cân nhắc thuộc về ranh giới giữa các phân khu — thứ phân khu khác sẽ phụ thuộc vào — hay thuộc về cách làm bên trong một phân khu?*

## 3. SƠ ĐỒ PHÂN KHU

```
                    Hợp đồng tối cao của hệ thống (API Contract)
                                   │  giao diện là bên gọi `external`
┌──────────────────────────────── Layer giao diện ────────────────────────────────┐
│  Main ── đọc giá trị khởi động, ráp nối, trao Routers cho phân khu màn hình     │
│                                                                                 │
│  Phân khu logic            Phân khu màn hình              Phân khu kit          │
│  ┌──────────────────┐      ┌──────────────────────┐      ┌──────────────────┐   │
│  │ workflow nền tảng│      │ layout               │      │ token            │   │
│  │ workflow giao diện│◀────│ trang + hook màn hình │────▶│ component kit    │   │
│  │  (5 lớp WCA)     │ chỉ  │                      │ chỉ  │                  │   │
│  └──────────────────┘ qua  └──────────────────────┘ qua  └──────────────────┘   │
│                      Routers                       lối công khai của kit        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

Chiều phụ thuộc đi **một chiều**: phân khu màn hình phụ thuộc vào hai phân khu kia; phân khu logic và phân khu kit không biết nhau, và không biết phân khu màn hình tồn tại. Main đứng trên cả ba, là nơi duy nhất nhìn thấy tất cả.

Đây là hệ quả trực tiếp của cách chia việc: phân khu logic có thể được kiểm thử trọn vẹn mà không cần dựng một giao diện nào; phân khu kit có thể được xem và chỉnh mà không cần hệ thống phía sau chạy; chỉ phân khu màn hình cần cả hai.

## 4. CÁC THÀNH PHẦN CỐT LÕI

**Main của layer giao diện** — Điểm khởi tạo duy nhất của layer: nhận giá trị khởi động từ môi trường chủ, khởi tạo workflow nền tảng, ráp nối từng workflow giao diện, trao tập hợp Routers cho phân khu màn hình, rồi dựng giao diện gốc.

Đứng trên cả ba phân khu, là tệp duy nhất được phép phụ thuộc vào cả ba và vào môi trường chủ. Mọi vai trò của Main trong WCA giữ nguyên: nó làm hậu cần, không làm nghiệp vụ, không làm trình bày. Một sai lệch ở đây — tự đặt một địa chỉ mặc định khi thiếu giá trị khởi động, hay để một workflow tự đọc biến môi trường — ảnh hưởng tới mọi màn hình ngay từ lúc mở ứng dụng. Khi không nhận được giá trị khởi động hợp lệ, Main không đoán và không lặng lẽ tiếp tục: nó dựng một màn hình lỗi khởi động bằng component kit, nói rõ điều gì thiếu, và không dựng phần còn lại của ứng dụng.

Về tín hiệu sẵn sàng ([§4 lý thuyết WCA](../wca-implementation/wca_theory_compressed.md)): layer giao diện thường được một Main khác mở ra (ví dụ tiến trình chính của ứng dụng desktop mở cửa sổ), nhưng Main đó hiếm khi cần chờ giao diện sẵn sàng. Main của layer giao diện chỉ phát tín hiệu sẵn sàng khi `mandatory_rules` của hợp đồng tối cao quy định, và đúng theo hình thức quy định ở đó; không tự đặt ra một tín hiệu không ai khai báo.

*Đoạn code này đang nhận, ráp nối và trao — hay đang tự quyết một giá trị, một câu chữ, một hành vi?*

---

**Phân khu logic** — Nơi giao diện nói chuyện với hệ thống và biến kết quả thành dữ liệu sẵn sàng hiển thị, tổ chức đúng theo WCA.

Đứng dưới Main, không biết phân khu kit và phân khu màn hình tồn tại. Viết bằng ngôn ngữ thuần của nền tảng (ví dụ tệp `.ts`, không phải `.tsx`), và **không phụ thuộc thư viện giao diện** — không import React, không dùng DOM. Ràng buộc này không phải hình thức: nó là điều kiện để toàn bộ phân khu được kiểm thử bằng một trình chạy kiểm thử thông thường, và là điều kiện để phân khu màn hình không thể giấu logic vào đây dưới dạng một hook. Đuôi tệp không tự giữ được ràng buộc này — một tệp `.ts` vẫn import được React — nên nó được giữ bằng máy (§7).

Bên trong phân khu, mỗi workflow giao diện có đủ năm lớp của WCA, với những điểm riêng sau:

- **Configs** — dữ liệu tĩnh, không chứa hàm, không đọc môi trường. Mỗi mục gắn đúng một nhãn: `[CONTRACT]` khi hiện thực hóa một điều khoản của hợp đồng tối cao (đường dẫn, phương thức, danh sách nhãn kết quả của điểm giao tiếp, kèm chỗ trỏ tới điều khoản đó), hoặc `[UI-ONLY]` khi là giá trị nội bộ của giao diện (câu thông báo cho từng mã lỗi, thời gian chờ). Hai nhãn này chính là hai loại giá trị ranh giới và giá trị nội bộ của [§4 lý thuyết WCA](../wca-implementation/wca_theory_compressed.md).
- **Entities** — chỉ khai báo kiểu, không có hàm. Mỗi kiểu mô tả dữ liệu ở ranh giới ghi rõ nó hiện thực hóa `type` nào của hợp đồng, và **giữ nguyên tên trường của hợp đồng**, không đổi sang quy ước đặt tên khác — một lớp chuyển tên ở ranh giới là một chỗ sinh lỗi mà không mang lại gì. Kiểu của dữ liệu đã sẵn sàng hiển thị (view model) cũng nằm ở đây, và được đặt tên tự do.
- **Adapters** — cầu nối duy nhất ra hệ thống phía sau, qua tài nguyên do workflow nền tảng chuẩn bị. Mỗi hàm gửi đúng một lời gọi, **kiểm hình dạng phản hồi lúc chạy** (không tin kiểu khai báo lúc biên dịch), và trả về một kết quả lời gọi (§6). Adapters không đổi mã lỗi, không so chuỗi thông báo để đoán nghĩa, không đặt câu chữ cho người dùng.
- **Services** — nơi duy nhất ra quyết định, và chỉ ra quyết định trình bày (§5). Nhận kết quả lời gọi, trả kết quả trình bày.
- **Routers** — lối vào duy nhất của workflow với phân khu màn hình. Nhận dữ liệu thô từ trang (chuỗi người dùng gõ vào ô nhập), kiểm và chuyển đổi định dạng, chuyển cho Services, trả kết quả trình bày. Routers re-export mọi kiểu mà phân khu màn hình cần, để phân khu màn hình không bao giờ phải nhìn vào lớp nào khác của workflow. ⚠ WCA đòi mọi điểm giao tiếp có bên ngoài gọi tới phải được khai báo trong API Contract. Lối vào của Routers trong phân khu logic được phân khu màn hình gọi tới, nhưng layer giao diện không có Điều khoản trong hợp đồng tối cao. iWCA thay việc khai báo đó bằng hai thứ: **kiểu của Routers**, do trình biên dịch kiểm ở mọi chỗ gọi, và **bảng trang của I1**, ghi trang nào dùng Routers của workflow nào. Đây là một ngoại lệ có chủ đích, ghi tại §11.

*Tệp này có đang import thứ gì của giao diện không? Và nếu tháo toàn bộ phân khu kit và phân khu màn hình ra, phân khu logic có còn chạy được kiểm thử của nó không?*

---

**Workflow nền tảng của layer giao diện** — Workflow chuẩn bị những tài nguyên mà mọi workflow giao diện cần để nói chuyện ra ngoài: một HTTP client đã gắn sẵn địa chỉ hệ thống phía sau và thời gian chờ, một cầu nối tới môi trường chủ đã bọc đúng các kênh được khai báo — tùy dự án cần gì.

Giữ đúng mọi luật của workflow nền tảng trong WCA: chỉ chuẩn bị tài nguyên chung, không mang ý nghĩa nghiệp vụ; Main trao tài nguyên cho workflow cần dùng. Điểm riêng của iWCA: đây là **nơi duy nhất** trong toàn layer được chạm tới API mạng trần (ví dụ `fetch`) và được bọc cầu nối liên tiến trình. Cầu nối liên tiến trình thường do môi trường chủ đặt sẵn (ví dụ một đối tượng mà script preload của ứng dụng desktop phơi ra trên `window`) — khi đó chính Main đọc nó, như mọi giá trị của môi trường chủ (R12), rồi trao cho workflow nền tảng như một giá trị khởi động; workflow nền tảng bọc nó lại thành tài nguyên chỉ gọi được đúng các kênh hợp đồng khai báo. Mọi workflow giao diện khác chỉ gọi ra ngoài qua tài nguyên này. Nhờ vậy, những việc như gắn địa chỉ, đặt thời gian chờ, phân biệt "không kết nối được" với "hệ thống trả lỗi" được làm đúng một lần, ở đúng một chỗ.

*Có đoạn code nào ngoài workflow nền tảng đang tự gọi ra mạng không?*

---

**Phân khu kit** — Nơi chứa mọi quy định về hình thức của layer: token và component kit.

Đứng độc lập, chỉ phụ thuộc vào chính nó và thư viện giao diện. Token là **nguồn duy nhất** của mọi giá trị trình bày: một mã màu, một số điểm ảnh, một thời lượng chuyển động xuất hiện ở bất kỳ đâu ngoài tệp token là một vi phạm. Component kit là component "câm": props vào, hiển thị, callback ra; props chỉ là kiểu cơ bản hoặc kiểu do chính kit khai báo, không bao giờ là kiểu dữ liệu nghiệp vụ. Kit cũng cung cấp các component bố cục (xếp chồng, xếp hàng, lưới, khung trang), để phân khu màn hình bố trí được mà không cần viết một dòng style nào.

Một sai lệch ở đây lan ra theo chiều ngược với phân khu logic: nó không làm hỏng dữ liệu, nhưng nó làm mục ruỗng tính nhất quán của cả ứng dụng một cách âm thầm — mỗi lần có người "chỉnh tạm" một khoảng cách ngay trong trang, ứng dụng có thêm một chỗ không đổi theo token nữa.

*Component này có đang biết một điều gì về nghiệp vụ không — một tên trường dữ liệu, một mã lỗi, một câu chữ cố định? Và giá trị trình bày này có truy ngược được về một token có tên không?*

---

**Phân khu màn hình** — Nơi lắp ráp: tạo layout, tạo trang, và trong mỗi trang, đổ dữ liệu từ Routers vào component kit.

Đứng trên cùng về chiều phụ thuộc, nhưng nhỏ nhất về quyền hạn. Như đã nói ở §1, nó đóng vai hạ tầng cắt ngang của layer giao diện: quyết định **khi nào** gọi Routers (khi trang mở, khi người dùng bấm, sau một khoảng thời gian), **giữ** kết quả, và **hiển thị** kết quả bằng component kit. Nó không gọi ra mạng, không tính toán, không định dạng, không viết style. Chữ cố định của giao diện — nhãn nút, tiêu đề trang, chú thích ô nhập — được phép nằm ở đây, vì đó là một phần của việc bày biện; còn chữ phụ thuộc vào kết quả (câu thông báo lỗi) do Services tạo ra.

Mỗi trang đi cặp với đúng một **hook màn hình**. Hook giữ trạng thái giao diện và gọi Routers; trang đọc trạng thái từ hook và dựng giao diện. Hook là chỗ dễ biến thành "Services thứ hai" nhất trong toàn layer, nên luật của nó phải được nhớ rõ: hook **gọi, giữ, và chuyển** — không tính, không định dạng, không quyết định.

*Nếu thay toàn bộ phân khu kit bằng một bộ component khác cùng props, trang này có phải sửa gì ngoài tên component không? Và nếu hook này bị xóa, có quyết định nào biến mất theo nó không — nếu có, quyết định đó đang nằm sai chỗ.*

## 5. QUYẾT ĐỊNH TRÌNH BÀY VÀ QUYẾT ĐỊNH NGHIỆP VỤ

Đây là ranh giới quan trọng nhất của iWCA, và là nơi một giao diện "chạy được" âm thầm trở thành nguồn sự thật thứ hai của hệ thống.

Services trong phân khu logic là nơi duy nhất ra quyết định của layer giao diện — nhưng mọi quyết định **nghiệp vụ** đã có chủ ở phía sau: hợp đồng tối cao giao chúng cho Services của các workflow hệ thống. Nếu phía giao diện cũng quyết định cùng một điều đó (tự tính số dư, tự kiểm một giới hạn nghiệp vụ trước khi gửi, tự suy ra một thao tác có được phép không), hệ thống có hai nơi cùng nắm một luật. Hôm nay hai nơi khớp nhau. Ngày phía sau đổi luật, phía giao diện vẫn giữ luật cũ, và không có hợp đồng nào bắt được sự lệch đó — vì hợp đồng không quản lý bên trong giao diện.

**Phép thử:** hình dung phía sau đổi quyết định này (đổi một giới hạn, đổi cách tính) mà không đổi hợp đồng. Nếu giao diện phải sửa theo mới còn đúng, thì giao diện đang nắm một quyết định nghiệp vụ — đưa nó về phía sau, hoặc bỏ nó đi. Nếu giao diện không cần sửa gì, đó là một quyết định trình bày.

**Quyết định trình bày — Services được đưa ra:**

- Sắp xếp, nhóm, lọc dữ liệu **để hiển thị** (ví dụ sắp tên theo thứ tự chữ cái của ngôn ngữ người dùng).
- Chuyển một giá trị thành dạng đọc được (một số tiền ở đơn vị nhỏ nhất thành chuỗi có dấu phân cách, một thời điểm thành ngày giờ địa phương).
- Chọn câu chữ cho người dùng ứng với một mã lỗi, từ Configs.
- Gom kết quả của nhiều lời gọi thành một dữ liệu cho một màn hình (ví dụ ghép tên khách hàng vào danh sách đơn hàng để hiển thị).
- Quyết định lời gọi nào cần làm, theo thứ tự nào, để có đủ dữ liệu cho một màn hình.

**Quyết định nghiệp vụ — Services không bao giờ đưa ra:**

- Kiểm một ràng buộc nghiệp vụ mà hợp đồng giao cho phía sau nhưng không ghi trong `type` — một điều kiện giữa hai trường, một điều kiện phụ thuộc dữ liệu đang lưu (số tiền có vượt giá đơn không, bản ghi có còn tồn tại không). Phía sau phán quyết những điều này và báo lại qua mã lỗi đã khai báo; phía giao diện chỉ hiển thị phán quyết đó.
- Tính ra một con số mà hợp đồng giao cho phía sau (một tổng, một số dư, một trạng thái suy ra).
- Suy ra thao tác nào hợp lệ từ dữ liệu, khi hợp đồng đã có điểm giao tiếp trả lời câu đó.

**Ranh giới chính xác của việc kiểm trước khi gửi.** Phía giao diện được kiểm đúng những gì `type` của hợp đồng mô tả, và chỉ những gì đó — cùng định nghĩa "kiểm định dạng" của Routers trong WCA:

- **Bắt buộc kiểm:** đủ trường, đúng kiểu nguyên thủy (chuỗi đọc được thành số nguyên, số, ngày, thời điểm), đúng một trong các giá trị liệt kê, số nguyên nằm trong khoảng an toàn mà hợp đồng quy định.
- **Được phép kiểm, không bắt buộc:** ràng buộc ghi ngay trong ngoặc của `type` (độ dài chuỗi, khoảng giá trị, số phần tử tối đa của danh sách). Những ràng buộc này là một phần của hợp đồng: phía sau không thể đổi chúng mà không đổi hợp đồng, nên kiểm chúng ở giao diện không tạo ra một nguồn sự thật thứ hai — với điều kiện chúng nằm trong Configs với nhãn `[CONTRACT]`, trỏ đúng điều khoản.
- **Không bao giờ kiểm:** bất cứ điều gì không viết trong `type`.

Phép thử ở trên phân định được cả ba: một ràng buộc viết trong `type` không thể bị phía sau đổi mà không đổi hợp đồng — nên nó qua phép thử; một ràng buộc không viết trong `type` thì có thể — nên nó trượt.

⚠ Kiểm trước khi gửi chỉ để báo lỗi sớm cho người dùng; nó không bao giờ thay thế phán quyết của phía sau. Một yêu cầu đã qua kiểm ở giao diện vẫn có thể bị phía sau từ chối, và giao diện phải hiển thị đúng sự từ chối đó.

*Nếu phía sau đổi luật này mà không đổi hợp đồng, dòng code này có trở thành sai không?*

## 6. HAI KIỂU KẾT QUẢ — ĐẶC TẢ CỐ ĐỊNH

Phần này là đặc tả, không phải gợi ý. Mọi layer theo iWCA dùng đúng hai kiểu dưới đây, đúng tên loại, đúng các trường; chỉ cú pháp khai báo đổi theo ngôn ngữ. Ví dụ dưới đây viết bằng TypeScript.

Cả hai kiểu, cùng những gì đi kèm chúng ở khối code bên dưới (`ErrorBody`, `INPUT_FORMAT_CODE`, `InputFormatCode`, `ResultMessages`, `assertNever`), đặt tại `logic/shared/results.<ext>`. iWCA định sẵn đúng hai tệp cho vị trí dùng chung của phân khu logic: tệp này, và `logic/shared/resources.<ext>` — nơi khai báo **giao diện lập trình** (chỉ kiểu, không có cài đặt) của các tài nguyên do workflow nền tảng chuẩn bị, để Adapters của mọi workflow giao diện biết tài nguyên mình nhận có hình dạng gì mà không phải import workflow nền tảng (điều R2 ở §7 cấm). Cả hai tệp thỏa đủ hai điều kiện của [Giai đoạn 5 WCA, Bước 5.3](../wca-implementation/05-edge-cases.md): giống nhau mãi mãi giữa mọi workflow giao diện, và hoàn toàn trung lập về nghiệp vụ. Mọi thứ khác muốn vào `logic/shared/` phải tự vượt qua đúng hai điều kiện đó.

```ts
// Hiện thực hóa clause_a_common.error_body của API Contract — hình dạng
// đổi theo đúng hợp đồng của từng hệ thống; đây là ví dụ.
export type ErrorBody = {
  code: string
  message: string
  details: Record<string, unknown> | null
}

// Adapters → Services
export type CallResult<T> =
  | { kind: 'ok'; label: number; data: T }
  | { kind: 'declared_error'; label: number; error: ErrorBody }
  | { kind: 'unreachable'; reason: string }
  | { kind: 'contract_violation'; reason: string }

// Services → Routers → phân khu màn hình
export type ViewResult<V> =
  | { kind: 'ok'; view: V }
  | { kind: 'rejected'; origin: 'input' | 'system'; code: string; message: string; fieldErrors: Record<string, string> }
  | { kind: 'unreachable'; message: string }
  | { kind: 'contract_violation'; message: string }

// Mã của ViewResult 'rejected' khi origin = 'input'.
export const INPUT_FORMAT_CODE = 'INPUT_FORMAT'

// Lý do một ô nhập không qua kiểm định dạng ở Routers — danh sách đóng.
export type InputFormatCode =
  | 'required'          // thiếu giá trị bắt buộc
  | 'not_integer'       // không đọc được thành số nguyên, hoặc ngoài khoảng an toàn
  | 'not_number'        // không đọc được thành số
  | 'not_date'          // không đọc được thành ngày theo formats.date
  | 'not_timestamp'     // không đọc được thành thời điểm theo formats.timestamp
  | 'not_in_list'       // không thuộc các giá trị liệt kê của type
  | 'violates_type_constraint'  // vi phạm ràng buộc ghi trong ngoặc của type (§5)

// Câu thông báo chung mà mọi Services cần để dựng ViewResult. Cấu hình cấp
// layer hiện thực hóa kiểu này; Main trao nó cho từng Services.
export type ResultMessages = {
  unreachable: string
  contractViolation: string
  inputSummary: string
  input: Record<InputFormatCode, string>
}

// Nhánh cuối của mọi phép phân nhánh trên kind: nếu còn loại nào chưa được
// xử lý, trình biên dịch báo lỗi tại đây.
export function assertNever(x: never): never {
  throw new Error(`Unhandled result kind: ${JSON.stringify(x)}`)
}
```

**Ý nghĩa chính xác của từng loại trong `CallResult`** — Adapters phân loại, không ai khác:

| `kind` | Khi nào | Trường |
|---|---|---|
| `ok` | Nhận được một nhãn kết quả mà hợp đồng khai báo **trả dữ liệu** cho điểm giao tiếp này — `{ ref: … }`, hay `{ type: … }` với lối vào của hạ tầng cắt ngang — và thân phản hồi khớp đúng hình dạng đó. | `label`: nhãn nhận được. `data`: dữ liệu đã kiểm, dưới dạng Entities; `null` khi nhãn khai báo `ref: none` hoặc `type: none`. |
| `declared_error` | Nhận được một nhãn kết quả mà hợp đồng khai báo **trả lỗi** cho điểm giao tiếp này — `{ code: … }` — thân phản hồi khớp `error_body`, và `code` trong thân đúng là mã đã khai báo cho nhãn đó. | `label`, `error`: nguyên vẹn, không đổi mã, không đổi câu. |
| `unreachable` | Không nhận được phản hồi nào: không kết nối được, quá thời gian chờ, kết nối bị ngắt giữa chừng. | `reason`: mô tả kỹ thuật, dành cho người sửa lỗi, không dành cho người dùng. |
| `contract_violation` | Nhận được phản hồi, nhưng nó không khớp hợp đồng: nhãn không được khai báo cho điểm giao tiếp này, thân phản hồi sai hình dạng, một số nguyên nằm ngoài khoảng hợp đồng quy định, một mã lỗi không có trong danh sách hoặc không khớp nhãn. | `reason`: chỉ rõ chỗ lệch (nhãn nào, trường nào, giá trị nào). |

Phân loại dựa trên **cách hợp đồng khai báo nhãn**, không dựa trên giá trị số của nhãn. Khung hợp đồng ([Giai đoạn 2 WCA, Bước 2.4](../wca-implementation/02-contract.md)) cho phép mọi nhãn mang hoặc `ref`/`type`, hoặc `code`; một nhãn 200 khai báo `code` là một lỗi đã khai báo, một nhãn 409 khai báo `ref` là một kết quả trả dữ liệu. Quy ước "2xx là thành công" của HTTP không được dùng thay cho hợp đồng.

⚠ `contract_violation` không phải một lỗi để xử lý khéo, mà là một phát hiện: hoặc hệ thống phía sau đang vi phạm hợp đồng, hoặc Adapters đang hiện thực hóa sai hợp đồng. Không bao giờ "cứu" một phản hồi lệch hợp đồng bằng cách đoán nghĩa của nó — đó chính là cách một giao diện âm thầm bắt đầu phụ thuộc vào hành vi không được hứa.

**Ý nghĩa chính xác của từng loại trong `ViewResult`** — Services tạo ra, trừ một trường hợp của Routers:

| `kind` | Khi nào | Trường |
|---|---|---|
| `ok` | Thao tác thành công. | `view`: dữ liệu sẵn sàng hiển thị; `null` nếu thao tác không trả dữ liệu. |
| `rejected` | Thao tác không thành công vì một lý do đã được gọi tên: `origin: 'input'` khi Routers phát hiện dữ liệu nhập sai định dạng trước khi gọi đi; `origin: 'system'` khi phía sau trả một `declared_error` — bất kể mã nào hợp đồng khai báo, kể cả lỗi lưu trữ của phía sau. | `code`: mã lỗi của hợp đồng khi `system`; luôn là `INPUT_FORMAT_CODE` khi `input`. `message`: câu cho người dùng — từ Configs của workflow khi `system`, từ `ResultMessages.inputSummary` khi `input`. `fieldErrors`: câu lỗi theo từng ô nhập (khi `input`, lấy từ `ResultMessages.input`), `{}` nếu không gắn được với ô nào. |
| `unreachable` | Lời gọi không tới được hệ thống phía sau. | `message`: từ `ResultMessages.unreachable`. |
| `contract_violation` | Phản hồi lệch hợp đồng. | `message`: từ `ResultMessages.contractViolation`. Chi tiết kỹ thuật (`reason`) được Adapters ghi ra kênh chẩn đoán ngay lúc phân loại, không bao giờ đưa lên màn hình. |

Như hợp đồng tối cao của WCA, hai kiểu này **không có trường tùy chọn**: mọi trường liệt kê luôn có mặt; trường có thể không có giá trị ghi rõ `null` hoặc `{}`. Không có loại thứ năm. Một tình huống không khớp bốn loại là dấu hiệu nó đã bị phân loại sai ở Adapters, không phải dấu hiệu cần thêm loại.

Phân khu màn hình xử lý `ViewResult` bằng một phép phân nhánh **đầy đủ** trên `kind`, kết thúc bằng một nhánh chứng minh không còn loại nào khác (ví dụ `assertNever(r)` với tham số kiểu `never`). Thiếu một nhánh thì trình biên dịch báo lỗi. Nhờ vậy, luật "giao diện xử lý mọi kết quả có thể xảy ra" không phụ thuộc vào trí nhớ của người viết. Vì R8 (§7) chỉ cho phân khu màn hình import **kiểu** từ phân khu logic, phân khu màn hình có bản `assertNever` riêng của nó (mặc định `screens/assert_never.<ext>`) — một sự trùng lặp có chủ đích, cùng lý do hai layer hệ thống không dùng chung code.

## 7. MA TRẬN PHỤ THUỘC — ĐẶC TẢ CỐ ĐỊNH

Phần này cũng là đặc tả. Đường dẫn dưới đây theo bố cục mặc định ở [i2-scaffold.md](i2-scaffold.md), Bước I2.1; một dự án đổi bố cục thì ánh xạ lại đường dẫn, không đổi luật. **Mọi luật trong bảng phải được một công cụ kiểm bằng máy** — luật nào chỉ nằm trong tài liệu sẽ mòn dần qua các phiên làm việc. Cách chọn công cụ nằm ở I2.

| Mã | Vùng | Luật |
|---|---|---|
| R1 | `logic/**` | Không import thư viện giao diện (ví dụ `react`, `react-dom`), không import `kit/**`, `screens/**`, Main. |
| R2 | `logic/workflows/<A>/**` | Chỉ import tệp trong chính workflow `<A>` và `logic/shared/**`. Không import workflow giao diện khác — một lời gọi sang workflow giao diện khác (hiếm) đi qua Adapters, với lối vào do Main trao, đúng như WCA. |
| R3 | `logic/shared/**` | Không import `logic/workflows/**`. |
| R4 | `logic/**` | Không dùng API của môi trường chủ và trình duyệt: `window`, `document`, `navigator`. |
| R5 | `logic/**` | API mạng trần (ví dụ `fetch`, `XMLHttpRequest`, `WebSocket`) chỉ được dùng trong `adapters` của workflow nền tảng. Cầu nối liên tiến trình do môi trường chủ đặt sẵn không bao giờ được phân khu logic tự lấy ra: Main đọc nó (R12) và trao cho workflow nền tảng. API lưu trữ cục bộ (ví dụ `localStorage`) chỉ được dùng trong `adapters` — máy kiểm được đến mức "chỉ trong một tệp `adapters`"; việc đó có đúng là `adapters` của workflow sở hữu dữ liệu hay không được kiểm bằng mắt ở I6. |
| R6 | `kit/**` | Không import `logic/**`, `screens/**`, Main. |
| R7 | `kit/**` | Giá trị trình bày thô (mã màu, tên màu, hàm màu, đơn vị độ dài tuyệt đối, thời lượng) chỉ xuất hiện trong tệp token. |
| R8 | `screens/**` | Từ phân khu logic, chỉ được import **kiểu** (không import giá trị) và chỉ từ `logic/workflows/*/routers`. Routers thật được nhận qua ngữ cảnh do Main cung cấp. |
| R9 | `screens/**` | Từ phân khu kit, chỉ import qua lối công khai của kit (`kit/index`), không import sâu vào tệp bên trong. |
| R10 | `screens/**` | Không có tệp style, không dùng prop `style`, không dùng prop `className`. Bố cục dựng bằng component bố cục của kit; props của chúng nhận **tên token**, không nhận giá trị. |
| R11 | `screens/**` | Không dùng API mạng, kênh liên tiến trình, lưu trữ cục bộ, hay giá trị của môi trường chủ. |
| R12 | toàn layer | Chỉ Main được đọc giá trị khởi động từ môi trường chủ (ví dụ một đối tượng toàn cục do preload đặt, biến môi trường lúc build). |
| R13 | toàn layer | Mọi phép phân nhánh trên `kind` của `ViewResult` hoặc `CallResult` phải đầy đủ (§6). |
| R14 | toàn layer | Chỉ Main — và tệp kiểm thử, vốn đóng vai Main khi dựng workflow để kiểm — được import **giá trị** từ tệp Configs của workflow (`logic/workflows/*/configs`) và từ cấu hình cấp layer (`configs/**`). Mọi nơi khác chỉ được import **kiểu** từ các tệp đó. Đây là hiện thực hóa bằng máy của luật "chỉ Main đọc cấu hình" trong WCA, cần thiết vì Configs của layer giao diện là một tệp mã nguồn (§11), nên bất kỳ tệp nào cũng có thể import nó nếu không bị cấm. |

Một vài luật trông có vẻ khắt khe quá mức — R10 cấm cả `className` trong phân khu màn hình. Lý do: một khi `className` được phép, style sẽ quay lại phân khu màn hình qua một tệp CSS "chỉ để căn lề một chút", và R7 mất tác dụng ngay tại nơi cần nó nhất. Cái giá của R10 là phân khu kit phải có đủ component bố cục — một cái giá đáng trả, vì nó chỉ phải trả một lần.

## 8. MỞ RỘNG GIAO THỨC 07 CHO LAYER GIAO DIỆN

[Giao thức 07](../wca-implementation/07-checkpoint-protocol.md) áp dụng nguyên vẹn cho layer giao diện — định dạng khung, bốn mục nội dung, quy tắc định danh — với đúng ba điểm mở rộng dưới đây. Ba điểm này chỉ có hiệu lực bên trong một layer theo iWCA. Hai giá trị mới (điểm 1 và 2) đã được ghi vào bảng **Giá trị mở rộng** của Giao thức 07 — nơi duy nhất liệt kê mọi giá trị hợp lệ của `clause` và `component` — nên một công cụ gom checkpoint viết theo 07 nhận diện được chúng.

1. **Trường `clause`** của mọi khối checkpoint trong layer giao diện là `external`, vì layer này không có Điều khoản trong hợp đồng tối cao.
2. **Trường `component`** nhận thêm hai giá trị `kit` và `screens`, cho hai khối checkpoint mới:

   | Khối checkpoint của | `workflow` | `component` | Vị trí |
   |---|---|---|---|
   | Mỗi workflow giao diện | tên workflow | `services` (hoặc `adapters` nếu không có Services) | đầu tệp `services` (hoặc `adapters`) của workflow |
   | Main | `main` | `main` | đầu tệp Main |
   | Phân khu kit | `kit` | `kit` | đầu tệp lối công khai `kit/index` |
   | Phân khu màn hình | `screens` | `screens` | đầu tệp bảng điều hướng `screens/navigation` |

   Định danh theo đúng công thức của 07: `kit-EXP-001`, `screens-PROB-002`.
3. **Kinh nghiệm thuộc về đâu:** điều chỉ đúng với một workflow giao diện ghi ở checkpoint của workflow đó; quy ước về token, component và cách dùng kit ghi ở checkpoint `kit`; quy ước về trang, hook, điều hướng và cách lắp ghép ghi ở checkpoint `screens`; điều thuộc về cả layer (giá trị khởi động, cách ráp nối, cơ chế kiểm tra bằng máy) ghi ở checkpoint `main`.

Tệp style (ví dụ CSS) không có chú thích dòng, nên không bao giờ chứa khối checkpoint — lý do các khối của phân khu kit và phân khu màn hình đặt ở tệp mã nguồn.

## 9. CHẨN ĐOÁN TỪ NGOÀI VÀO TRONG

Khi một màn hình không hoạt động như mong đợi, đi theo đúng thứ tự, dừng ở bước đầu tiên phát hiện sai — cùng tinh thần [§6 của lý thuyết WCA](../wca-implementation/wca_theory_compressed.md):

1. **Main** — Main có dựng được ứng dụng không, hay đang hiện màn hình lỗi khởi động? Giá trị khởi động có đúng không? Workflow giao diện của màn hình này đã được ráp nối và đưa vào ngữ cảnh chưa?
2. **Điều hướng** — trang đã được đăng ký trong bảng điều hướng chưa?
3. **Trang và hook** — hook có gọi đúng hàm Routers, đúng lúc không? Trang có hiển thị đúng nhánh `kind` không?
4. **Routers** — dữ liệu thô có qua được kiểm định dạng không, có tới được Services không?
5. **Services** — quyết định trình bày có đúng không?
6. **Adapters** — lời gọi có đúng điểm giao tiếp của hợp đồng không, và `kind` trả về có phân loại đúng không?
7. **Hệ thống phía sau** — chỉ khi sáu bước trên đều đúng, vấn đề mới nằm ngoài layer giao diện.

Một kết quả `contract_violation` rút ngắn chuỗi này: nó chỉ thẳng vào ranh giới giữa bước 6 và bước 7. Mở hợp đồng tối cao ra đối chiếu trước khi sửa bất kỳ dòng nào — bên nào lệch thì bên đó sai, và nếu chưa rõ bên nào lệch, đó là một câu hỏi cho người giữ hợp đồng, không phải cho người đang sửa giao diện.

## 10. RANH GIỚI ÁP DỤNG

iWCA phát huy tốt nhất khi ba điều kiện cùng đúng: giao diện gọi một hệ thống có hợp đồng rõ ràng, giao diện có nhiều màn hình, và nhiều người hay nhiều phiên làm việc cùng động vào nó theo thời gian. Khi đó, chi phí năm lớp cho mỗi workflow và một phân khu kit riêng được trả lại bằng khả năng kiểm tra, thay thế, và bàn giao.

iWCA không đáng giá cho một màn hình thử nghiệm dùng một lần. Nó cũng bắt đầu phải trả giá khi giao diện tự có một lõi xử lý nặng tại chỗ — một trình vẽ, một trình dựng đồ họa, một bộ lọc ảnh chạy trong trình duyệt. Lõi đó không phải "quyết định trình bày" theo nghĩa của §5, cũng không phải "gọi hệ thống"; nó là chính cái lõi xử lý dùng chung mà [§7 của lý thuyết WCA](../wca-implementation/wca_theory_compressed.md) đã cảnh báo. Khi gặp tình huống đó, quyết định đặt lõi ấy ở đâu phải được đưa ra có chủ đích và ghi rõ, không được để nó lọt vào hook màn hình.

Khi hệ thống phía sau không theo WCA và chỉ có một tài liệu API công bố, iWCA vẫn áp dụng được: tài liệu đó đóng vai hợp đồng, được đối xử như dữ liệu `from: third_party` trong WCA. Cái giá là `contract_violation` sẽ xuất hiện nhiều hơn — và đó là điều tốt, vì nó cho thấy chính xác chỗ tài liệu và thực tế không khớp.

*Nhìn lại giao diện đang xây: nó chủ yếu gọi hệ thống rồi trình bày, hay nó đang tự xử lý nhiều tới mức tự thân nó là một hệ thống?*

## 11. ĐỐI CHIẾU VỚI WCA — NHỮNG CHỖ iWCA KHÁC, VÀ VÌ SAO

iWCA áp WCA vào layer giao diện, nhưng layer giao diện có một đặc điểm mà mọi layer WCA khác không có: nó không có Điều khoản trong hợp đồng tối cao. Một số luật của WCA dựa vào Điều khoản đó, nên không áp được nguyên xi. Bảng dưới đây là danh sách **đóng** mọi chỗ iWCA khác một luật của WCA. Một khác biệt không có mặt ở đây là một sai lệch cần sửa, không phải một ngoại lệ.

| # | Luật của WCA | iWCA làm gì thay | Vì sao |
|---|---|---|---|
| D1 | Mọi điểm giao tiếp mà có bên ngoài gọi tới đều được khai báo trong API Contract ([Giai đoạn 2](../wca-implementation/02-contract.md)) | Lối vào của Routers trong phân khu logic — được phân khu màn hình gọi — không khai báo trong hợp đồng tối cao. Khai báo của chúng là **kiểu của Routers** (trình biên dịch kiểm ở mọi chỗ gọi) cùng **bảng trang của I1** (trang nào dùng Routers của workflow nào). | Layer giao diện không có Điều khoản. Ranh giới này nằm trong cùng một layer, cùng một ngôn ngữ, và không bên nào ngoài layer phụ thuộc vào nó; kiểu do trình biên dịch kiểm giữ ranh giới chặt hơn một tệp khai báo mà không công cụ nào đối chiếu với code. |
| D2 | Mỗi điểm giao tiếp của workflow trong API Contract có đúng một lối vào trong Routers ([Giai đoạn 4](../wca-implementation/04-implement.md), Bước 4.4) | Lối vào của Routers ánh xạ theo **thao tác của trang**, không một-một với điểm giao tiếp; Adapters mới ánh xạ một-một với điểm giao tiếp mà workflow gọi. | Hệ quả của D1: Routers của workflow giao diện không phục vụ bên gọi từ hệ thống phía sau, mà phục vụ trang. |
| D3 | Configs là dữ liệu tĩnh nằm trong tệp cấu hình, không phải code; chỉ Main đọc ([§4 lý thuyết WCA](../wca-implementation/wca_theory_compressed.md)) | Configs là một tệp mã nguồn chỉ chứa dữ liệu tĩnh (không hàm, không đọc môi trường). "Chỉ Main đọc" được giữ bằng máy qua R14. | Cần chú thích `[CONTRACT]`/`[UI-ONLY]` ngay cạnh từng giá trị và cần kiểu của giá trị cho trình biên dịch — định dạng dữ liệu thuần như JSON không có cả hai. Cái giá là một tệp mã nguồn có thể bị import từ bất cứ đâu, nên R14 là bắt buộc. |
| D4 | Vị trí dùng chung của layer mặc định là `<layer>/shared/`, chỉ tồn tại khi thỏa Bước 5.3 ([Giai đoạn 5](../wca-implementation/05-edge-cases.md)) | Vị trí dùng chung nằm trong phân khu logic (`logic/shared/`), và iWCA định sẵn đúng hai tệp của nó (§6). Phân khu màn hình tự có bản `assertNever` riêng. | Chỉ phân khu logic dùng những thứ này; đặt ở cấp layer sẽ mời phân khu kit và phân khu màn hình dùng chung code với phân khu logic, phá ma trận phụ thuộc. Hai tệp định sẵn tự thỏa Bước 5.3. |
| D5 | Hạ tầng cắt ngang được khai báo trong `cross_cutting` của API Contract; tổ chức bên trong của nó là tự do ([§5 lý thuyết WCA](../wca-implementation/wca_theory_compressed.md)) | Phân khu màn hình đóng vai hạ tầng cắt ngang của layer giao diện (§1) nhưng không khai báo trong hợp đồng, và tổ chức bên trong của nó là **bắt buộc**: trang, hook màn hình, bảng điều hướng. | Không khai báo: cùng lý do D1. Tổ chức bắt buộc: đây là phần lớn nhất của layer, nơi logic dễ trượt vào nhất; để tự do thì ranh giới "gọi, giữ, chuyển" không có chỗ để kiểm. |
| D6 | Tiến độ triển khai ghi ở trường `status` của Mục trong hợp đồng; đơn vị hoàn tất là workflow ([Giai đoạn 6](../wca-implementation/06-self-check.md)) | Tiến độ ghi ở cột trạng thái của bảng trang (I1); đơn vị hoàn tất là **trang**. | Không có Mục nào để ghi `status`. Và người dùng nhận được giá trị theo trang, không theo workflow — một workflow giao diện đúng mà không trang nào dùng thì không mang lại gì. |
| D7 | Bằng chứng chạy thật: kích hoạt qua đúng điểm giao tiếp thật, với dữ liệu thật hoặc gần thật ([Giai đoạn 6](../wca-implementation/06-self-check.md), Bước 6.6) | Với workflow giao diện, bằng chứng chạy thật là những bước của kịch bản bấm thử kích hoạt nó trên hệ thống phía sau thật; kiểm thử với HTTP client giả chứng minh hình dạng, không chứng minh chạy thật. | Yêu cầu của WCA giữ nguyên; iWCA chỉ nói rõ cách thỏa nó ở layer giao diện, và cấm coi kiểm thử với tài nguyên giả là bằng chứng chạy thật. |
| D8 | Trường `clause` của checkpoint là khóa Điều khoản; `component` nhận `services`, `adapters`, `cross_cutting`, `main` ([Giao thức 07](../wca-implementation/07-checkpoint-protocol.md)) | `clause: external`; `component` nhận thêm `kit`, `screens` (§8). Ba giá trị này được ghi trong bảng Giá trị mở rộng của Giao thức 07. | Layer giao diện không có Điều khoản; phân khu kit và phân khu màn hình cần một nơi ghi kinh nghiệm riêng, tách khỏi checkpoint `main`. Ghi vào chính 07 để 07 vẫn là nguồn duy nhất liệt kê mọi giá trị hợp lệ. |

**Những gì iWCA không thay đổi**, để không ai phải đoán: hợp đồng tối cao của hệ thống (không một dòng nào đổi khi giao diện áp dụng iWCA); phân loại đúng hai loại workflow; năm lớp và vai trò của từng lớp; vai trò và thứ tự việc của Main; nguyên tắc hộp đen và quy tắc trường thừa ở [Giai đoạn 2, Bước 2.3](../wca-implementation/02-contract.md); quy tắc quay lui; định dạng checkpoint ngoài hai trường ở D8; yêu cầu mọi bằng chứng phải kiểm lại được.
