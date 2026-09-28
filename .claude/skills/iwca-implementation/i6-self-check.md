# GIAI ĐOẠN I6 — TỰ KIỂM TRƯỚC KHI COI MỘT TRANG LÀ HOÀN TẤT

*Giai đoạn cuối của một vòng iWCA, sau khi đã hoàn thành [I3](i3-logic.md), [I4](i4-kit.md) và [I5](i5-screens.md) cho một trang. Xem [SKILL.md](SKILL.md) để biết toàn bộ các giai đoạn. Thuật ngữ dùng trong tệp này theo đúng định nghĩa tại §0 của [lý thuyết WCA](../wca-implementation/wca_theory_compressed.md) và của [lý thuyết iWCA](iwca_theory.md).*

| | |
|---|---|
| **Input** | Một trang đã đi hết I5, cùng các workflow giao diện và component kit mà nó dùng. |
| **Hành động** | Nhìn lại trang và mọi thứ nó dùng từ năm góc khác với góc nhìn lúc viết: hợp đồng, ranh giới giữa các phân khu, người dùng, checkpoint, và bằng chứng. |
| **Output** | Đề xuất chuyển trạng thái của trang trong bảng của [I1](i1-decompose.md) sang `hoàn_tất`, kèm bằng chứng — hoặc một danh sách cụ thể những gì còn phải sửa. |

Đơn vị hoàn tất của iWCA là **trang**, không phải workflow giao diện. Một workflow giao diện đúng từng dòng mà không trang nào dùng được thì người dùng không nhận được gì; một trang chỉ hoàn tất khi cả ba phân khu phía sau nó đều đúng. Với từng workflow giao diện mà trang dùng, [Giai đoạn 6 của WCA](../wca-implementation/06-self-check.md) vẫn áp dụng, với đúng những điểm khác đã ghi ở [§11 của lý thuyết iWCA](iwca_theory.md) — các bước dưới đây nói những gì thêm vào và những gì thay thế.

## Bước I6.1 — Nhìn lại từ góc độ hợp đồng

Tạm gác code sang một bên, mở hợp đồng tối cao và bảng của I1, đối chiếu ngược lại — không hỏi "code có hợp lý không", mà hỏi "code có đúng với hợp đồng và với bảng không":

- Với mỗi điểm giao tiếp mà các workflow giao diện của trang gọi tới: bảng nhãn kết quả trong Configs khớp `output` của hợp đồng **từng dòng**; đường dẫn và phương thức khớp `address`; Configs trỏ đúng phiên bản hợp đồng hiện hành. Nếu hợp đồng đã đổi phiên bản kể từ lúc viết, đọc changelog để biết điều gì đổi.
- Entities: dữ liệu gửi đi có đúng các trường hợp đồng liệt kê; dữ liệu nhận về được kiểm đủ mọi trường đã cam kết.
- Mọi điểm giao tiếp được gọi đều nằm trong bảng workflow giao diện của I1; không lời gọi nào tới một điểm giao tiếp nằm trong bảng loại trừ. Kiểm bằng cách tìm trong mã nguồn đường dẫn của từng điểm giao tiếp bị loại trừ, không bằng trí nhớ.
- Mọi mã lỗi mà các điểm giao tiếp khai báo đều có câu thông báo trong Configs (kiểm thử ở I3 đã khẳng định; ở đây xác nhận kiểm thử đó thực sự duyệt từ Configs).

## Bước I6.2 — Nhìn lại từ góc độ ranh giới giữa các phân khu

Lệnh kiểm tra bắt được mọi vi phạm của ma trận phụ thuộc — nếu nó đạt, phần máy kiểm được đã đúng. Bước này dành cho những gì **máy không kiểm được**, và vì vậy phải được đọc bằng mắt:

- **Services:** mỗi quyết định có qua được phép thử của [§5 lý thuyết iWCA](iwca_theory.md) không? Với mỗi dòng Services làm gì đó với dữ liệu, tự hỏi: nếu phía sau đổi luật này mà không đổi hợp đồng, dòng này có thành sai không?
- **Routers:** chỉ kiểm những gì `type` của hợp đồng mô tả? Có kiểm nào không viết trong `type` không?
- **Hook:** mọi dòng có viết lại được bằng ba động từ "gọi", "giữ", "chuyển" không?
- **Component kit mới:** có component nào mà tên prop, dù kiểu là chuỗi, thực chất đang mang một khái niệm nghiệp vụ và chỉ dùng được cho một loại dữ liệu không? (Máy chỉ bắt được kiểu, không bắt được ý nghĩa.)

Một tín hiệu chẩn đoán giống Bước 6.2 của WCA: nếu muốn hiểu một hành vi của trang mà phải nhảy qua lại giữa hook, Services và component nhiều lần, ranh giới đang chưa rõ ở đâu đó, dù từng phần riêng lẻ trông đúng vai trò.

## Bước I6.3 — Nhìn lại từ góc độ người dùng: kịch bản bấm thử

Kiểm thử tự động chứng minh các phân khu **được viết** đúng. Nó không chứng minh người dùng **nhìn thấy** đúng: một trang có thể qua mọi kiểm thử dựng trang mà vẫn đặt thông báo lỗi ở nơi không ai nhìn thấy, hay vẫn cho bấm nút khi đang gửi. Kịch bản bấm thử là bằng chứng chạy thật của phân khu màn hình, trên hệ thống phía sau thật.

**Định dạng cố định** của `walkthrough.yaml`, đặt cạnh trang. Như hợp đồng tối cao, không có trường tùy chọn: mọi trường đều có mặt, giá trị không có thì ghi `null`.

```yaml
page: <khóa của trang trong bảng điều hướng>
precondition: >
  <trạng thái của hệ thống phía sau và dữ liệu cần có trước khi bắt đầu>
steps:
  - id: S1                       # S<số>, tăng dần, không dùng lại số đã dùng
    setup: null                  # thao tác chuẩn bị ngoài giao diện cho riêng bước này, hoặc null
    action: >
      <người dùng làm gì trên trang, đủ cụ thể để người khác làm lại được>
    expect: >
      <người dùng nhìn thấy gì — mô tả thứ nhìn thấy được, không mô tả code>
    covers: [ok]                 # tập con của: ok, rejected_input, rejected_system, unreachable
```

**Luật phủ** — đây là phần cố định của bước này:

- Với **mỗi thao tác** của trang, hợp các `covers` của những bước dùng thao tác đó phải chứa `ok`; chứa `rejected_input` nếu thao tác nhận dữ liệu nhập; và chứa `rejected_system` nếu có ít nhất một mã lỗi đã khai báo mà người dùng gây ra được bằng thao tác bình thường.
- Mỗi trang có **ít nhất một** bước `unreachable`, với `setup` làm cho hệ thống phía sau không tới được (ví dụ dừng nó), và `expect` mô tả cả việc thực hiện lại thao tác sau khi hệ thống chạy lại.
- `contract_violation` **không** nằm trong kịch bản bấm thử — nó được chứng minh ở kiểm thử dựng trang (I5, Bước I5.4).

**Chạy kịch bản:** làm lần lượt từng bước, đúng thứ tự, trên bản giao diện đã qua lệnh kiểm tra, với hệ thống phía sau thật. Sau mỗi bước, chụp một ảnh màn hình, đặt tên `<khóa trang>-<id bước>`, ở vị trí dự án quy định. Ghi lại mỗi bước đạt hay không đạt, người chạy, thời điểm. Ai chạy kịch bản — người, hay agent qua công cụ điều khiển giao diện — do giao thức vận hành của dự án quy định; người chạy luôn được ghi tên.

Một bước không đạt thì trang chưa hoàn tất, kể cả khi mọi kiểm thử tự động đều đạt. Quay về giai đoạn tương ứng với chỗ sai.

## Bước I6.4 — Nhìn lại từ góc độ checkpoint

Giống Bước 6.5 của WCA, với đủ các khối checkpoint mà trang đã chạm tới: khối của từng workflow giao diện đã viết hoặc sửa; khối `kit` nếu đã thêm token hay component; khối `screens`; và khối `main` nếu đã đổi cách ráp nối hay cơ chế kiểm. Mọi phát hiện đã được mang về đúng khối theo [§8 lý thuyết iWCA](iwca_theory.md); vấn đề tồn đọng đã được giải quyết đã chuyển thành kinh nghiệm.

## Bước I6.5 — Nhìn lại từ góc độ bằng chứng

Trang chỉ được đề xuất `hoàn_tất` khi có đủ **ba** loại bằng chứng, mỗi loại ở đúng chỗ của nó:

| Bằng chứng | Chứng minh điều gì | Đặt ở đâu |
|---|---|---|
| Kết quả thô của lệnh kiểm tra, chạy trên mã hiện tại: kiểm kiểu, ma trận phụ thuộc, style, kiểm thử của phân khu logic (đủ ma trận phủ của I3) và kiểm thử dựng trang (đủ ma trận phủ của I5) | Các phân khu được viết đúng và đúng ranh giới | EVIDENCE của từng workflow giao diện liên quan, và của khối `screens` |
| Kết quả chạy kịch bản bấm thử, kèm ảnh chụp từng bước | Người dùng nhìn thấy đúng, trên hệ thống thật | EVIDENCE của khối `screens` |
| Bằng chứng mỗi luật của ma trận cắn (I2, Bước I2.5) — **còn hiệu lực** | Lệnh kiểm tra thực sự bắt được vi phạm | EVIDENCE của khối `main` |

**Bằng chứng chạy thật của từng workflow giao diện.** [Bước 6.6 của WCA](../wca-implementation/06-self-check.md) đòi mỗi workflow có Routers được kích hoạt ít nhất một lần qua đúng điểm giao tiếp thật, với dữ liệu thật hoặc gần thật. Kiểm thử của phân khu logic dùng HTTP client giả, nên **không** thỏa yêu cầu này. Với một workflow giao diện, yêu cầu đó được thỏa bằng những bước của kịch bản bấm thử có dùng Routers của workflow: trang gọi Routers, Routers đi qua Services và Adapters tới hệ thống phía sau thật. Mục EVIDENCE của workflow giao diện vì vậy ghi hai điều: kết quả thô của lệnh kiểm tra, **và** trang cùng id của những bước kịch bản đã kích hoạt workflow trên hệ thống thật. Một workflow giao diện mà không bước nào của bất kỳ kịch bản nào kích hoạt thì chưa có bằng chứng chạy thật, dù kiểm thử đạt hết.

Dòng cuối của bảng chỉ cần làm lại khi cấu hình của cơ chế kiểm đã thay đổi kể từ lần chứng minh gần nhất — nhưng khi đã thay đổi, phải làm lại cho đúng những luật bị ảnh hưởng. Một thay đổi cấu hình kiểm mà không chứng minh lại là cách nhanh nhất để một luật lặng lẽ biến mất.

Như mọi bằng chứng trong WCA: lệnh hay thao tác đã thực hiện, dữ liệu đầu vào, kết quả thô, thời điểm. Một dòng "đã bấm thử, ổn" không phải bằng chứng.

**Checklist:**

- [ ] Bảng nhãn kết quả trong Configs khớp hợp đồng từng dòng, trỏ đúng phiên bản hiện hành; đã đọc changelog nếu hợp đồng đã đổi.
- [ ] **Không lời gọi nào tới điểm giao tiếp nằm ngoài bảng của I1 hoặc nằm trong bảng loại trừ — đã tìm trong mã nguồn, không dựa vào trí nhớ.**
- [ ] Mỗi quyết định của Services đã qua phép thử của §5; Routers chỉ kiểm những gì `type` mô tả; hook qua phép thử ba động từ.
- [ ] Không component kit mới nào mang ngầm một khái niệm nghiệp vụ qua tên prop.
- [ ] Kịch bản bấm thử đúng định dạng, đạt luật phủ; mọi bước đã chạy trên hệ thống thật và đạt, có ảnh chụp, có tên người chạy.
- [ ] Mọi khối checkpoint trang đã chạm tới đều đã cập nhật, đúng khuôn.
- [ ] **Đủ ba loại bằng chứng, ở đúng chỗ; bằng chứng "luật cắn" còn hiệu lực với cấu hình kiểm hiện tại.**
- [ ] **Mỗi workflow giao diện mà trang dùng có ít nhất một bước kịch bản kích hoạt nó trên hệ thống thật, và EVIDENCE của workflow ghi đúng trang và id bước đó.**
- [ ] Đã đề xuất chuyển trạng thái trang sang `hoàn_tất`, kèm bằng chứng — không tự coi trang là xong khi còn thiếu bằng chứng.

⚠ Nếu trang này là trang cuối cùng trong bảng của I1 và mọi trang đều `hoàn_tất`, layer giao diện được coi là hoàn tất theo iWCA cho danh sách trang hiện tại. Nếu còn trang khác, quay lại I3 cho workflow giao diện của trang tiếp theo — hoặc I4, I5 nếu workflow đó đã có sẵn.

---

## Minh họa — tự kiểm trang `book_appointment_page`

⚠ Lưu ý trước khi đọc phần này: kịch bản dưới đây ngắn vì trang có đúng một thao tác. Một trang có nhiều thao tác sẽ có nhiều bước hơn — luật phủ tính theo từng thao tác, không tính theo cả trang.

**Bước I6.1:** `labels` của `createAppointment` trong Configs là `{ '201': 'ok', '400': 'ERR_VALIDATION' }` — khớp `output` của `create_appointment` từng dòng. Configs trỏ `api_contract.yaml v1.1.0`, đúng phiên bản hiện hành (phiên bản đã bổ sung quy ước truyền input, phát hiện ở I3). Bảng loại trừ rỗng. `ERR_VALIDATION` có câu thông báo; kiểm thử ở I3 duyệt `labels` trong Configs để tìm mã.

**Bước I6.2:** Services đưa ra đúng hai quyết định: định dạng thời điểm theo ngôn ngữ địa phương, và chọn câu cho `ERR_VALIDATION`. Cả hai qua phép thử của §5 — phía sau đổi luật gì cũng không làm chúng sai. Routers kiểm "không rỗng" và "đọc được thành thời điểm", đúng những gì `type` mô tả; không kiểm "thời điểm ở tương lai". Hook viết lại được bằng ba động từ. `Field` và `Notice` không mang khái niệm nào của lịch hẹn.

**Bước I6.3** — `walkthrough.yaml`:

```yaml
page: book_appointment_page
precondition: >
  Backend đang chạy với cơ sở dữ liệu thử rỗng. Giao diện mở ở trang /book.
steps:
  - id: S1
    setup: null
    action: >
      Nhập "u-1" vào ô Mã người dùng, chọn 01/10/2026 09:30 ở ô Thời điểm hẹn, bấm "Đặt lịch".
    expect: >
      Nút chuyển sang "Đang gửi…" và không bấm được; sau đó hiện thông báo thành công
      "Đã đặt lịch" cùng thời điểm hẹn viết bằng tiếng Việt theo giờ địa phương.
    covers: [ok]
  - id: S2
    setup: null
    action: >
      Nhập "u-1" vào ô Mã người dùng, để trống ô Thời điểm hẹn, bấm "Đặt lịch".
    expect: >
      Hiện câu lỗi ngay dưới ô Thời điểm hẹn; ô Mã người dùng vẫn còn "u-1";
      không có yêu cầu nào được gửi tới backend.
    covers: [rejected_input]
  - id: S3
    setup: >
      Dừng backend.
    action: >
      Nhập "u-1", chọn 01/10/2026 09:30, bấm "Đặt lịch". Khi thông báo hiện ra, khởi động
      lại backend rồi bấm "Thử lại".
    expect: >
      Lần đầu hiện thông báo "Không kết nối được" kèm nút "Thử lại", dữ liệu đã nhập còn nguyên.
      Sau khi bấm "Thử lại", hiện thông báo "Đã đặt lịch".
    covers: [unreachable, ok]
```

Luật phủ: thao tác duy nhất "đặt lịch" có `ok` (S1, S3), `rejected_input` (S2), và `unreachable` (S3). Về `rejected_system`: phía sau khai báo `ERR_VALIDATION`, nhưng với dữ liệu đã qua kiểm định dạng ở Routers, người dùng không có cách bình thường nào khiến phía sau trả mã này — nên luật không đòi một bước cho nó; kiểm thử dựng trang ở I5 đã chứng minh trang hiển thị đúng loại này. Nếu phía sau sau này quyết định từ chối lịch hẹn trong quá khứ bằng `ERR_VALIDATION`, người dùng gây ra được mã đó, và kịch bản phải thêm một bước.

Ba bước chạy trên backend thật, đều đạt; ba ảnh chụp `book_appointment_page-S1`, `-S2`, `-S3` đặt đúng vị trí dự án quy định.

**Bước I6.4:** Đã cập nhật khối checkpoint của `book_appointment`, `kit`, `screens`. Khối `main` không đổi vì cách ráp nối và cơ chế kiểm không đổi.

**Bước I6.5:** EVIDENCE của `book_appointment` ghi lệnh `npm run check` cùng kết quả thô (số kiểm thử đạt theo từng tệp), và bằng chứng chạy thật: `book_appointment_page`, bước S1 và S3, trên backend thật. EVIDENCE của `screens` ghi kết quả chạy `walkthrough.yaml` và vị trí ảnh chụp. Bằng chứng "luật cắn" ở khối `main` còn hiệu lực: cấu hình kiểm không đổi từ I2.

**Kết quả:** đề xuất chuyển `book_appointment_page` sang `hoàn_tất`. Bảng trang của I1 còn nhu cầu "xem lịch hẹn sắp tới" đang chờ hợp đồng — khi hợp đồng có điểm giao tiếp mới, quay lại I1 để thêm workflow và trang.
