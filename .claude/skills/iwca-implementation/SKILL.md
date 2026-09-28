---
name: iwca-implementation
description: Hướng dẫn tổ chức và triển khai layer giao diện (frontend) theo iWCA — biến thể của Workflow-Centric Architecture cho giao diện, chia layer thành ba phân khu (logic, kit, màn hình) cùng một Main. Dùng khi xây dựng hoặc làm việc trên giao diện của một hệ thống mà ranh giới với phía sau đã được khai báo bằng hợp đồng (API Contract của WCA hoặc tài liệu API tương đương).
---

# iWCA Implementation — Điều phối

*Phiên bản bộ tài liệu: v1.0 (2026-09-26).*

**Điều kiện tiên quyết — hai điều, không bỏ qua điều nào:**

1. **Đã hiểu WCA.** iWCA không thay thế WCA, mà áp WCA vào bên trong một layer giao diện. Mọi thuật ngữ, nguyên lý và quy trình của WCA — workflow, năm lớp, Main, hợp đồng tối cao, checkpoint, Giai đoạn 0–6 — được dùng lại nguyên vẹn, không giải thích lại ở đây. Nếu chưa hiểu WCA, dừng lại và đọc skill `wca-implementation` trước, bắt đầu từ `wca_theory_compressed.md`.
2. **Đã đọc lý thuyết iWCA** — tệp [iwca_theory.md](iwca_theory.md) nằm cùng thư mục với skill này. Nó bổ sung thuật ngữ vào [§0 của lý thuyết WCA](../wca-implementation/wca_theory_compressed.md) và nêu những luật riêng của layer giao diện.

**Vị trí các tệp:** skill này điều phối lý thuyết iWCA (`iwca_theory.md`) và sáu tệp giai đoạn `i1`–`i6`, cùng đặt trong một thư mục với tệp này. Skill `wca-implementation` (từ phiên bản v2.3) được giả định nằm ở thư mục ngang hàng (`../wca-implementation/`); nếu không có ở đó, tìm trong thư mục `.claude/skills/` của dự án hoặc trong tài liệu dự án đã đính kèm. Không bao giờ làm tiếp một giai đoạn dựa trên trí nhớ khi chưa đọc được đúng tệp của giai đoạn đó; nếu không tìm được tệp, dừng lại và báo cho người giao việc.

**Thuật ngữ:** mọi thuật ngữ của WCA giữ đúng nghĩa đã định tại §0 của lý thuyết WCA. iWCA thêm một số thuật ngữ riêng, định nghĩa tại [§0 của lý thuyết iWCA](iwca_theory.md). Đặc biệt không dùng lẫn ba từ: **lớp** (năm thành phần bên trong một workflow), **phân khu** (ba vùng bên trong layer giao diện), **layer hệ thống** (nơi các workflow chạy). "Khối" đã có nghĩa riêng trong WCA (khối checkpoint), không dùng để gọi phân khu.

## iWCA đứng ở đâu so với WCA

Trong một hệ thống WCA, phần giao diện thường được chủ đích đặt ngoài WCA ([§7 của lý thuyết WCA](../wca-implementation/wca_theory_compressed.md)): với hợp đồng tối cao, nó là bên gọi `external`. iWCA **giữ nguyên** điều đó — hợp đồng tối cao của hệ thống không đổi một dòng nào khi giao diện áp dụng iWCA. Điều iWCA thay đổi là **bên trong** layer giao diện: thay vì tổ chức theo quy ước tùy ý của công nghệ, layer được chia thành ba phân khu có ranh giới rõ ràng, trong đó phân khu logic áp nguyên WCA.

Nói ngắn gọn: với hệ thống, giao diện vẫn là một khách gọi cửa từ bên ngoài. Với chính nó, giao diện là một layer có kỷ luật như mọi layer WCA khác.

## Các giai đoạn triển khai, theo đúng thứ tự

Đây là một quy trình tuần tự. Đọc đúng tệp tương ứng với giai đoạn đang ở, theo đúng thứ tự.

| Giai đoạn | Khi nào dùng | Tệp |
|---|---|---|
| I1 — Phân rã giao diện | Có danh sách màn hình cần làm và hợp đồng của hệ thống đã `approved`; cần xác định workflow giao diện, trang, và ánh xạ tới điểm giao tiếp | [i1-decompose.md](i1-decompose.md) |
| I2 — Dựng khung layer | Trước phiên viết code đầu tiên của layer giao diện: bố cục, Main, workflow nền tảng, cơ chế kiểm tra bằng máy | [i2-scaffold.md](i2-scaffold.md) |
| I3 — Triển khai phân khu logic | Viết một workflow giao diện: năm lớp, ráp nối vào Main | [i3-logic.md](i3-logic.md) |
| I4 — Triển khai phân khu kit | Thêm token hoặc component mà màn hình cần | [i4-kit.md](i4-kit.md) |
| I5 — Triển khai phân khu màn hình | Viết layout, trang, hook màn hình, lắp logic với kit | [i5-screens.md](i5-screens.md) |
| I6 — Tự kiểm | Vừa hoàn thành một trang (cùng các workflow và component nó dùng), trước khi coi là xong — bao gồm cả bằng chứng | [i6-self-check.md](i6-self-check.md) |

I1 và I2 làm một lần cho cả layer (I1 được làm lại mỗi khi có màn hình mới cần thêm vào danh sách). I3, I4, I5 lặp lại cho từng trang, theo đúng thứ tự đó: logic trước, kit sau, màn hình cuối — vì màn hình là nơi lắp hai phân khu kia, nó không thể xong trước khi hai thứ nó lắp tồn tại.

**Quan hệ với các giai đoạn của WCA:**

- Giai đoạn 0–3 của WCA (chuẩn bị, phân rã, soạn hợp đồng, phân loại) áp dụng cho **hệ thống**, và phải đã xong trước I1. iWCA không soạn hợp đồng tối cao; nó đọc hợp đồng đó.
- Giai đoạn 4 và 6 của WCA áp dụng cho **từng workflow trong phân khu logic**; I3 và I6 ghi phần khác biệt.
- Giai đoạn 5 của WCA (logic dùng chung, tác vụ theo thời gian) áp dụng cho phân khu logic như với mọi layer.
- Giao thức 07 (checkpoint) áp dụng, cộng một phần mở rộng nhỏ ghi tại [§8 của lý thuyết iWCA](iwca_theory.md) và đã được ghi nhận trong bảng Giá trị mở rộng của chính Giao thức 07.

⚠ Mọi chỗ iWCA khác một luật của WCA đều được liệt kê đủ, kèm lý do, tại [§11 của lý thuyết iWCA](iwca_theory.md). Một khác biệt không có mặt ở §11 là một sai lệch, không phải một ngoại lệ — kể cả khi nó nằm trong một tệp giai đoạn của iWCA.

## Quy tắc quay lui tổng quát

Giữ nguyên quy tắc quay lui của WCA: phát hiện thiếu sót thuộc giai đoạn nào thì quay về đúng giai đoạn đó, không vá tạm tại chỗ, và cập nhật đầu ra của giai đoạn được quay lại.

⚠ Riêng với iWCA, có một đường quay lui vượt ra ngoài layer giao diện và cần nhớ rõ nhất: **khi giao diện cần một thứ mà hợp đồng của hệ thống không có** — một điểm giao tiếp, một trường dữ liệu, một mã lỗi — đường quay lui đi thẳng về Giai đoạn 2 của WCA, tức là về hợp đồng tối cao, không bao giờ được vá bằng cách để giao diện tự suy đoán, tự bịa, hay gọi một lối vào không khai báo. Giao diện là bên gọi; bên gọi không có quyền tự định nghĩa cánh cửa mà nó gõ.
