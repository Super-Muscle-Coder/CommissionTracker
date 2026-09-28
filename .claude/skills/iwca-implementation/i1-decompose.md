# GIAI ĐOẠN I1 — PHÂN RÃ GIAO DIỆN

*Giai đoạn đầu tiên của iWCA, sau khi hợp đồng tối cao của hệ thống đã ở trạng thái `approved` (Giai đoạn 0–3 của WCA đã xong). Xem [SKILL.md](SKILL.md) để biết toàn bộ các giai đoạn. Thuật ngữ dùng trong tệp này theo đúng định nghĩa tại §0 của [lý thuyết WCA](../wca-implementation/wca_theory_compressed.md) và của [lý thuyết iWCA](iwca_theory.md).*

| | |
|---|---|
| **Input** | Hợp đồng tối cao của hệ thống (`contract_state: approved`); mô tả những gì người dùng cần làm và cần xem qua giao diện (đề bài, phạm vi phát hành, danh sách màn hình mong muốn). |
| **Hành động** | Sáu bước tư duy theo đúng thứ tự bên dưới: đọc hợp đồng từ phía bên gọi, ánh xạ nhu cầu vào điểm giao tiếp, xác định workflow giao diện, xác định workflow nền tảng và giá trị khởi động, xác định trang, rồi đối chiếu độ phủ. |
| **Output** | Bốn bảng: workflow giao diện, trang, giá trị khởi động, và các điểm giao tiếp bị loại trừ có chủ đích. Ghi vào một tài liệu thiết kế của dự án, ở vị trí tài liệu nền của dự án quy định. |

⚠ Hợp đồng ở trạng thái `draft` thì không bắt đầu giai đoạn này. Giao diện phân rã trên một hợp đồng chưa chốt là phân rã trên cát: mỗi lần hợp đồng đổi, bảng ánh xạ của giai đoạn này đổi theo.

## Bước I1.1 — Đọc hợp đồng từ phía bên gọi

Giai đoạn 1 của WCA đọc đề bài để tìm mọi việc hệ thống phải làm. Ở đây, câu hỏi hẹp hơn và cụ thể hơn: **từ vị trí của một bên gọi `external`, hệ thống cho phép làm gì?**

Mở API Contract, liệt kê mọi điểm giao tiếp có `external` trong `called_by`, gom theo workflow sở hữu nó. Thêm vào đó mọi lối vào trong `entries` của hạ tầng cắt ngang mà `external` được gọi. Với mỗi mục, ghi lại tên, `form`, `address`, `input`, và toàn bộ nhãn kết quả trong `output` — kể cả những nhãn lỗi hiếm gặp, vì phân khu logic sẽ phải xử lý đủ từng nhãn.

Danh sách này là **toàn bộ thực đơn** mà giao diện được gọi món. Không có món nào khác, dù trong bếp có nguyên liệu. Một điểm giao tiếp mang hình thức gọi trực tiếp trong tiến trình (`in_process`) hay chỉ dành cho một workflow khác thì không nằm trong thực đơn của giao diện — kể cả khi nó trả về đúng dữ liệu giao diện đang cần.

Đọc thêm `clause_a_common` của cả hai tệp hợp đồng: `error_body`, `error_codes`, `endpoint_forms`, `formats`, các `types` có tên, và `mandatory_rules`. Giao diện hiện thực hóa phía bên gọi của những quy định chung này — ví dụ luật về khoảng giá trị của số nguyên, hay luật về cách layer giao diện nhận địa chỉ của hệ thống phía sau.

## Bước I1.2 — Ánh xạ nhu cầu của người dùng vào điểm giao tiếp

Đọc mô tả những gì người dùng cần làm và cần xem. Với mỗi nhu cầu, tự hỏi: **nhu cầu này được đáp ứng bằng những điểm giao tiếp nào trong thực đơn của Bước I1.1?**

Có ba kết cục, và mỗi kết cục dẫn tới một hành động khác nhau:

- **Đáp ứng được** — ghi lại nhu cầu cùng các điểm giao tiếp tương ứng.
- **Đáp ứng được, nhưng phải ghép dữ liệu từ nhiều workflow của hệ thống** (ví dụ danh sách đơn hàng cần hiện tên khách hàng, mà tên khách hàng thuộc workflow khác) — vẫn đáp ứng được, ghi lại đủ các điểm giao tiếp; việc ghép dữ liệu để hiển thị là một quyết định trình bày, sẽ được đặt vào đúng một workflow giao diện ở Bước I1.3.
- **Không đáp ứng được bằng thực đơn hiện có** — dừng lại ở nhu cầu đó.

⚠ Kết cục thứ ba là điểm quay lui quan trọng nhất của toàn bộ iWCA. Khi một nhu cầu không có điểm giao tiếp nào đáp ứng, **không** tìm cách xoay xở phía giao diện: không gọi một địa chỉ không khai báo "vì biết phía sau có", không suy ra dữ liệu từ những gì có sẵn bằng cách tính toán lại một quyết định nghiệp vụ, không để lại một chỗ trống "sẽ nối sau". Ghi rõ nhu cầu, lý do không đáp ứng được, và đưa về Giai đoạn 2 của WCA để hợp đồng tối cao được bổ sung — hoặc để người quyết định phạm vi xác nhận nhu cầu đó không thuộc đợt phát hành này.

Theo chiều ngược lại, có những điểm giao tiếp nằm trong thực đơn mà giao diện **cố ý không dùng** — vì phạm vi phát hành chưa bao gồm tính năng đó, vì một quyết định sản phẩm, vì một ràng buộc từ bên ngoài. Ghi chúng vào bảng loại trừ, kèm lý do. Một điểm giao tiếp bị loại trừ mà không ghi lý do sẽ bị người làm sau tưởng là việc còn sót, và làm nốt.

## Bước I1.3 — Xác định workflow giao diện

Mặc định đơn giản và dễ truy vết nhất: **mỗi workflow của hệ thống có điểm giao tiếp được giao diện dùng thì có đúng một workflow giao diện đối ứng, mang cùng tên.** Workflow giao diện đó chứa phía bên gọi của mọi điểm giao tiếp thuộc workflow đối ứng mà giao diện dùng. Khi một người đọc thấy `manage_client` trong phân khu logic, họ biết ngay nó nói chuyện với `manage_client` của hệ thống.

Mặc định này không phải một luật cứng; nó là điểm xuất phát, và có hai tình huống đáng cân nhắc lại.

**Một quyết định trình bày cần dữ liệu của nhiều workflow hệ thống.** Ví dụ trang danh sách đơn hàng cần ghép tên khách hàng. Tự hỏi: quyết định ghép này phục vụ màn hình của workflow giao diện nào? Quyết định thuộc về workflow đó, và Adapters của nó gọi luôn điểm giao tiếp của workflow hệ thống kia. Điều này nghĩa là hai workflow giao diện có thể cùng gọi một điểm giao tiếp — một sự trùng lặp có chủ đích, đúng tinh thần [Giai đoạn 5 WCA, Bước 5.1](../wca-implementation/05-edge-cases.md): hai workflow giao diện hôm nay cùng cần danh sách khách hàng, nhưng một cái cần để hiện tên, một cái cần để chọn khách cho đơn mới, và hai nhu cầu đó có thể đổi theo hai hướng khác nhau. ⚠ Không bao giờ để phân khu màn hình tự ghép dữ liệu của hai workflow giao diện — ghép dữ liệu là một quyết định, và phân khu màn hình không ra quyết định.

**Một nhu cầu hoàn toàn không cần hệ thống phía sau** — ví dụ nhớ trang người dùng xem lần cuối, hay một tùy chọn hiển thị chỉ sống trong giao diện. Đây vẫn có thể là một workflow giao diện, không có workflow đối ứng, tự sở hữu dữ liệu của nó qua Adapters (ví dụ lưu trữ cục bộ). Trước khi tạo nó, tự hỏi: dữ liệu này có thực sự chỉ thuộc về giao diện, hay nó là dữ liệu nghiệp vụ đang tìm đường né hợp đồng? Nếu mất nó khi cài lại ứng dụng mà người dùng coi là mất mát thật, nó thuộc về hệ thống phía sau.

Ghi loại của mỗi workflow theo đúng hai giá trị của WCA: `nền_tảng` cho workflow nền tảng ở Bước I1.4, `nghiệp_vụ` cho mọi workflow giao diện (xem §0 của lý thuyết iWCA — một workflow giao diện là workflow nghiệp vụ, dù nó không bao giờ đưa ra quyết định nghiệp vụ). Không có loại thứ ba.

Với mỗi workflow giao diện, viết một câu mô tả **quyết định trình bày chính** mà nó đưa ra. Nếu không viết được câu nào — workflow chỉ gọi rồi trả nguyên dữ liệu — nó vẫn là một workflow hợp lệ (Services của nó mỏng, có khi chỉ chọn câu thông báo cho mã lỗi), nhưng đừng cố bịa ra một quyết định để Services có việc làm.

## Bước I1.4 — Xác định workflow nền tảng và giá trị khởi động

Tự hỏi giống hệt Bước 1.4 của WCA: trước khi bất kỳ workflow giao diện nào tồn tại được, cần chuẩn bị điều gì? Với một layer giao diện, câu trả lời gần như luôn gồm: một cách gọi tới hệ thống phía sau (một HTTP client đã biết địa chỉ), và — nếu API Contract có lối vào `external` tới hạ tầng cắt ngang của một layer khác qua kênh liên tiến trình — một cầu nối tới môi trường chủ đã bọc đúng các kênh đó. Gom chúng vào một workflow nền tảng duy nhất của layer, trừ khi có lý do rõ ràng để tách.

Từ đó, liệt kê **giá trị khởi động** mà Main cần nhận để workflow nền tảng chuẩn bị được tài nguyên. Một cầu nối liên tiến trình do môi trường chủ đặt sẵn (ví dụ đối tượng mà script preload phơi ra) cũng là một giá trị khởi động — Main đọc nó rồi trao cho workflow nền tảng ([§4 và R5, R12 ở §7 lý thuyết iWCA](iwca_theory.md)) — và cũng phải trả lời đủ ba câu dưới đây. Với mỗi giá trị, trả lời ba câu, không bỏ câu nào:

1. Giá trị này là gì, định dạng ra sao?
2. Môi trường chủ trao nó cho layer giao diện **bằng cách nào** (một đối tượng do preload đặt, biến môi trường lúc build, tham số trên địa chỉ trang…)?
3. Căn cứ của cách trao đó nằm ở đâu trong hợp đồng tối cao?

⚠ Câu thứ ba hay bị bỏ qua nhất. Khi giá trị khởi động do một Main khác sinh ra lúc chạy (ví dụ địa chỉ của hệ thống phía sau với một cổng mạng được chọn lúc khởi động), cách trao giá trị đó là một **ranh giới giữa hai layer**: nếu Main bên kia đổi cách trao, giao diện hỏng. Ranh giới như vậy phải nằm trong hợp đồng — thường là một luật trong `clause_a_common.mandatory_rules`. Nếu hợp đồng không nói gì, đó là một chỗ hở của hợp đồng: quay lui về Giai đoạn 2 của WCA, không tự quy ước với Main bên kia. Chỉ khi giá trị được cố định lúc triển khai và không layer nào sinh ra nó lúc chạy (ví dụ giao diện web được phục vụ cùng nguồn với hệ thống phía sau), nó mới là một giá trị cấu hình thuần của layer giao diện.

## Bước I1.5 — Xác định trang và layout

Từ các nhu cầu ở Bước I1.2, xác định những trang người dùng điều hướng tới. Với mỗi trang, ghi lại: mục đích một câu, những workflow giao diện mà nó dùng Routers, layout nó nằm trong, và **trạng thái** của trang.

Trạng thái nhận đúng một trong ba giá trị `chưa_làm | đang_làm | hoàn_tất` — cùng tinh thần trường `status` của hợp đồng tối cao, vì layer giao diện không có Mục nào trong hợp đồng để ghi trạng thái. Một trang chỉ chuyển sang `hoàn_tất` khi đã qua [I6](i6-self-check.md) với đủ bằng chứng; ai cập nhật trường này do giao thức vận hành của dự án quy định, như với `status` của WCA.

Câu hỏi cần tự đặt ở bước này không phải "trang này trông ra sao" — đó là việc của I4 và I5 — mà là: **trang này cần những lối vào nào của phân khu logic?** Một trang dùng Routers của nhiều workflow giao diện là bình thường (ví dụ trang tạo đơn hàng dùng `manage_commission` để gửi, và dùng một danh sách chọn khách hàng). Nhưng nếu một trang cần **kết hợp** dữ liệu từ hai workflow giao diện thành một thứ mới để hiển thị, đó là dấu hiệu quyết định kết hợp đó chưa có chủ — quay lại Bước I1.3 để giao nó cho đúng một workflow giao diện.

Layout thường ít: một khung chính có điều hướng, đôi khi một khung cho màn hình lỗi khởi động hay màn hình đơn lẻ. Không tạo layout cho từng trang.

## Bước I1.6 — Đối chiếu độ phủ

Đây là bước kiểm tra chéo, không phải bước tư duy mới. Đối chiếu bốn bảng đã có với thực đơn ở Bước I1.1 và danh sách nhu cầu ở Bước I1.2:

- Mọi điểm giao tiếp trong thực đơn, hoặc được ít nhất một workflow giao diện dùng, hoặc nằm trong bảng loại trừ kèm lý do. Không có điểm giao tiếp nào ở trạng thái "chưa rõ".
- Không workflow giao diện nào dùng một điểm giao tiếp nằm ngoài thực đơn.
- Mọi nhu cầu hoặc đã có trang đáp ứng, hoặc đã được đưa về hợp đồng tối cao hay người quyết định phạm vi ở Bước I1.2.
- Mọi trang chỉ dùng Routers của những workflow giao diện đã có trong bảng.
- Mọi giá trị khởi động đã trả lời đủ ba câu ở Bước I1.4.

**Checklist:**

- [ ] Hợp đồng tối cao ở trạng thái `approved` trước khi bắt đầu.
- [ ] Đã liệt kê đủ mọi điểm giao tiếp và lối vào hạ tầng cắt ngang có `external` trong `called_by`, kèm toàn bộ nhãn kết quả.
- [ ] **Mọi nhu cầu không có điểm giao tiếp đáp ứng đã được dừng lại và đưa về Giai đoạn 2 của WCA hoặc người quyết định phạm vi — không có nhu cầu nào được "xoay xở" phía giao diện.**
- [ ] Mọi điểm giao tiếp cố ý không dùng đều có trong bảng loại trừ, kèm lý do.
- [ ] Mỗi workflow giao diện có một workflow đối ứng (hoặc được ghi rõ là không có, kèm lý do), và một câu mô tả quyết định trình bày chính.
- [ ] Mọi quyết định ghép dữ liệu của nhiều workflow hệ thống đều đã có đúng một workflow giao diện làm chủ; không có quyết định nào bị để cho phân khu màn hình.
- [ ] **Mỗi giá trị khởi động trả lời đủ ba câu — là gì, trao bằng cách nào, căn cứ ở đâu trong hợp đồng — và giá trị nào do một Main khác sinh ra lúc chạy thì cách trao nó đã có trong hợp đồng.**
- [ ] Mỗi trang ghi rõ những workflow giao diện nó dùng, layout nó nằm trong, và trạng thái (`chưa_làm` khi mới thêm vào bảng).
- [ ] Đã đối chiếu độ phủ ở Bước I1.6, không còn điểm giao tiếp nào ở trạng thái "chưa rõ".

⚠ Quy tắc quay lui: nếu ở I3 trở đi phát hiện một trang cần một lối vào chưa có, một workflow giao diện cần gọi một điểm giao tiếp chưa có trong bảng, hay một giá trị khởi động chưa được xác định, quay lại đúng bước của I1 để cập nhật bảng trước — và nếu điểm giao tiếp đó chưa có trong hợp đồng, đi tiếp về Giai đoạn 2 của WCA. Không thêm lời gọi vào code trước khi nó có mặt trong bảng.

---

## Minh họa — giao diện cho hệ thống đặt lịch hẹn

⚠ Lưu ý trước khi đọc phần này: ví dụ dùng tiếp hệ thống đặt lịch hẹn trong phần minh họa của WCA, để thấy giao diện đứng ở đâu so với hợp đồng đã soạn ở Giai đoạn 2 của WCA. Đây là một bài toán rất nhỏ; một giao diện thật có nhiều workflow giao diện, nhiều trang, và bảng loại trừ dài hơn nhiều. Điều cần học là cách tư duy của sáu bước, không phải số lượng dòng trong bảng.

Mô tả nhu cầu: *"Người dùng đặt được một lịch hẹn mới. Người dùng xem được danh sách lịch hẹn sắp tới của mình."*

**Bước I1.1:** Mở `api_contract.yaml` của hệ thống đặt lịch hẹn. Chỉ có đúng một điểm giao tiếp có `external` trong `called_by`: `book_appointment.create_appointment` — `form: http`, `address: "POST /appointments"`, `input: [user_id, scheduled_at]`, nhãn kết quả `201 → appointment`, `400 → ERR_VALIDATION`. Điểm giao tiếp `list_upcoming` của cùng workflow có `form: in_process` và `called_by: [background_jobs]` — không thuộc thực đơn của giao diện, dù nó trả về đúng danh sách lịch hẹn. Hạ tầng cắt ngang `background_jobs` không có `entries`. `error_body` là `object { code: string, message: string, details: object|null }`.

**Bước I1.2:** Nhu cầu "đặt lịch hẹn mới" được đáp ứng bởi `create_appointment`. Nhu cầu "xem lịch hẹn sắp tới" **không** có điểm giao tiếp nào đáp ứng. Cám dỗ ở đây rất rõ: phía sau đã có `list_upcoming`, chỉ cần mở nó ra qua mạng. Nhưng đó là việc của hợp đồng, không phải của giao diện. Dừng nhu cầu này lại, đưa về Giai đoạn 2 của WCA với đề xuất: thêm vào `book_appointment` một điểm giao tiếp `http` cho `external`, nhận `user_id`, trả danh sách lịch hẹn của người đó. Trong lúc chờ, giao diện chỉ phân rã phần đặt lịch. Không có điểm giao tiếp nào cần loại trừ.

**Bước I1.3:** Một workflow giao diện `book_appointment`, đối ứng với `book_appointment` của hệ thống. Quyết định trình bày chính: chọn câu thông báo tiếng Việt cho `ERR_VALIDATION`, và hiển thị thời điểm hẹn vừa tạo theo giờ địa phương của người dùng.

**Bước I1.4:** Giao diện là một ứng dụng web được phục vụ cùng nguồn với backend. Cần một workflow nền tảng `scaffold_ui` chuẩn bị HTTP client. Giá trị khởi động duy nhất: địa chỉ gốc của backend. Nó được cố định lúc triển khai — không Main nào sinh ra nó lúc chạy — nên nó là một giá trị cấu hình lúc build của layer giao diện, không cần căn cứ trong hợp đồng. (Nếu backend được một Main khác khởi động với một cổng chọn lúc chạy, câu trả lời sẽ khác hẳn: cách trao địa chỉ đó phải có trong `mandatory_rules`.)

**Bước I1.5:** Một trang `book_appointment_page` — cho người dùng nhập thời điểm hẹn và gửi — dùng Routers của workflow giao diện `book_appointment`, nằm trong layout chính `main_layout`.

**Bước I1.6:** Thực đơn có một điểm giao tiếp, đã được dùng. Nhu cầu thứ hai đã được đưa về hợp đồng. Trang duy nhất chỉ dùng Routers của workflow giao diện đã có trong bảng.

**Kết quả áp dụng, đầu ra của I1 cho ví dụ này:**

*Workflow giao diện*

| Tên | Loại (theo WCA) | Workflow đối ứng | Điểm giao tiếp gọi tới | Quyết định trình bày chính | Trang dùng |
|---|---|---|---|---|---|
| `scaffold_ui` | `nền_tảng` | — | — | — (chuẩn bị HTTP client) | — |
| `book_appointment` | `nghiệp_vụ` | `book_appointment` | `create_appointment` | Câu thông báo cho `ERR_VALIDATION`; hiển thị thời điểm hẹn theo giờ địa phương | `book_appointment_page` |

*Trang*

| Tên | Mục đích | Workflow giao diện dùng | Layout | Trạng thái |
|---|---|---|---|---|
| `book_appointment_page` | Người dùng đặt một lịch hẹn mới | `book_appointment` | `main_layout` | `chưa_làm` |

*Giá trị khởi động*

| Tên | Là gì | Trao bằng cách nào | Căn cứ trong hợp đồng |
|---|---|---|---|
| `backend_base_url` | Địa chỉ gốc của backend, dạng `https://<host>` | Biến môi trường lúc build | Không cần — cố định lúc triển khai, không layer nào sinh ra lúc chạy |

*Điểm giao tiếp loại trừ có chủ đích:* không có.

*Nhu cầu đưa về hợp đồng tối cao:* "xem lịch hẹn sắp tới" — cần một điểm giao tiếp `http` cho `external` trên `book_appointment`.
