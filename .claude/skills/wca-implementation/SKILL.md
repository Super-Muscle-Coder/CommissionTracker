---
name: wca-implementation
description: Hướng dẫn triển khai một hệ thống phần mềm theo kiến trúc Workflow-Centric Architecture (WCA) — từ phân rã đề bài thành workflow, soạn hợp đồng tối cao, tới viết code cho từng workflow. Dùng khi xây dựng hệ thống mới theo WCA hoặc khi làm việc trên một hệ thống đã áp dụng WCA.
---

# WCA Implementation — Điều phối

*Phiên bản bộ tài liệu: v2.3 (2026-09-26).*

**Điều kiện tiên quyết:** đã hiểu lý thuyết nền WCA — tệp [wca_theory_compressed.md](wca_theory_compressed.md) nằm cùng thư mục với skill này, và được tài liệu nền của dự án (ví dụ `CLAUDE.md`) dẫn tới. Nếu chưa từng nghe tới WCA, chưa hiểu workflow là gì, dừng lại và đọc phần lý thuyết trước — skill này giả định kiến thức nền đã có sẵn, không giải thích lại từ đầu.

**Vị trí các tệp:** skill này điều phối một bộ tệp gồm lý thuyết nền (`wca_theory_compressed.md`), các tệp giai đoạn `00`–`06` và các giao thức `07`–`08`, cùng đặt trong một thư mục với tệp này. Nếu một tệp được dẫn tới không có cạnh skill này (ví dụ khi skill được nạp ở cấp tài khoản), tìm nó trong thư mục `.claude/skills/wca-implementation/` của dự án, hoặc trong tài liệu dự án đã được đính kèm. Không bao giờ làm tiếp một giai đoạn dựa trên trí nhớ khi chưa đọc được đúng tệp của giai đoạn đó; nếu không tìm được tệp, dừng lại và báo cho người giao việc.

**Thuật ngữ:** mọi thuật ngữ trong bộ tài liệu này (workflow, lớp, layer hệ thống, Main, Điều khoản, Mục, điểm giao tiếp, hạ tầng cắt ngang…) mang đúng một nghĩa, định nghĩa tại [§0 của lý thuyết](wca_theory_compressed.md). Đặc biệt không dùng lẫn "lớp" (năm thành phần bên trong một workflow) với "layer hệ thống" (nơi các workflow chạy).

## Các giai đoạn triển khai, theo đúng thứ tự

Đây là một quy trình tuần tự, không phải một tập tài liệu tham khảo rời rạc. Đọc đúng tệp tương ứng với giai đoạn đang ở, theo đúng thứ tự dưới đây.

| Giai đoạn | Khi nào dùng | Tệp |
|---|---|---|
| 0 — Chuẩn bị | Trước khi bắt đầu bất kỳ việc gì | [00-prep.md](00-prep.md) |
| 1 — Phân rã đề bài | Có một đề bài mới, cần xác định danh sách workflow | [01-decompose.md](01-decompose.md) |
| 2 — Soạn hợp đồng | Đã có danh sách workflow, cần soạn Data Schema và API Contract | [02-contract.md](02-contract.md) |
| 3 — Phân loại workflow | Đã có hợp đồng, cần xác nhận chính thức từng workflow là nền tảng hay nghiệp vụ | [03-classify.md](03-classify.md) |
| 4 — Triển khai workflow | Sẵn sàng viết code cho một workflow cụ thể | [04-implement.md](04-implement.md) |
| 5 — Trường hợp đặc biệt | Phát hiện cần logic dùng chung giữa nhiều workflow, cần xử lý một tác vụ bất đồng bộ, hoặc cần thao tác trên toàn bộ một nơi lưu trữ — thường gặp nhất giữa lúc triển khai, nhưng có thể sớm hơn, từ Giai đoạn 1–2, nếu tình huống ảnh hưởng tới hình dạng hợp đồng | [05-edge-cases.md](05-edge-cases.md) |
| 6 — Tự kiểm | Vừa hoàn thành một workflow, trước khi coi là xong và chuyển sang workflow tiếp theo — bao gồm cả bằng chứng chạy thật | [06-self-check.md](06-self-check.md) |

## Hai nhóm tài liệu — kiến trúc và vận hành

Bộ tài liệu này chia làm hai nhóm khác bản chất, không chỉ khác về hình thức trình bày:

**Nhóm kiến trúc (lý thuyết nền + Giai đoạn 0-6 + Giao thức 07)** — mô tả cách triển khai đúng chuẩn WCA và cách bàn giao giữa các phiên làm việc. Nhóm này **phổ quát**: đúng cho bất kỳ dự án nào áp dụng WCA, bất kể có một agent hay nhiều agent, có tách vai Orchestrator hay không. Một agent làm việc một mình, tự mở lại phiên nhiều lần, không có ai khác hỗ trợ, vẫn dùng đủ và đúng toàn bộ nhóm này — kể cả Giao thức 07 (checkpoint), vì checkpoint chỉ cần điều kiện "có đứt gãy giữa các phiên", không cần điều kiện "có nhiều vai trò". Nhóm này là single source of truth cho khái niệm WCA, ít sửa đổi, và mang đi được tới bất kỳ dự án nào.

**Nhóm vận hành (Giao thức 08 trở đi)** — mô tả cách một đội hình cụ thể (ví dụ một Orchestrator không code, phối hợp với các phiên coding agent kế tiếp nhau) tổ chức công việc dựa trên nhóm kiến trúc ở trên. Nhóm này **linh động theo từng dự án**: chỉ có ý nghĩa khi đúng mô hình vận hành giả định trong đó thực sự tồn tại. Một dự án khác — nhiều agent chạy song song, không có Orchestrator, hay một agent duy nhất không bao giờ đóng phiên — sẽ cần một giao thức vận hành khác hẳn, hoặc không cần giao thức nào trong nhóm này cả.

| Giao thức | Nhóm | Khi nào dùng | Tệp |
|---|---|---|---|
| 07 — Checkpoint | Kiến trúc | Trong lúc viết code (Giai đoạn 4) và trước khi coi workflow hoàn tất (Giai đoạn 6) — bất kể cách vận hành | [07-checkpoint-protocol.md](07-checkpoint-protocol.md) |
| 08 — Vận hành: Plan, xử lý sự cố hợp đồng, cập nhật trạng thái, gom checkpoint | Vận hành | Chỉ khi hệ thống dùng mô hình một Orchestrator điều phối nhiều phiên coding agent tuần tự | [08-operating-protocol.md](08-operating-protocol.md) |

⚠ Không nhét nội dung của nhóm vận hành vào bất kỳ tệp nào thuộc nhóm kiến trúc (00-07), kể cả khi có vẻ tiện lợi lúc viết. Nếu dự án đổi cách vận hành, nhóm kiến trúc phải giữ nguyên không đổi; chỉ nhóm vận hành mới cần viết lại hoặc thay bằng một giao thức khác.

## Quy tắc quay lui tổng quát

Nếu ở bất kỳ giai đoạn nào phát hiện thiếu sót, sai lệch, hoặc một chi tiết chưa từng được xử lý ở một giai đoạn trước, quay lại đúng giai đoạn đó để xử lý trước — không vá tạm ngay tại giai đoạn hiện tại, không bỏ qua rồi tính sau. Mỗi tệp giai đoạn cụ thể nêu rõ quy tắc quay lui riêng cho tình huống của giai đoạn đó.

Quay lui có thể được thực hiện ngay tại chỗ, không nhất thiết phải dừng mọi việc đang làm — nhưng bắt buộc để lại dấu vết: đầu ra của giai đoạn được quay lại phải được cập nhật để phản ánh thay đổi (ví dụ bảng danh sách workflow của Giai đoạn 1, hay changelog của hợp đồng), không chỉ ghi nhận thay đổi ở giai đoạn đang làm dở. Một thay đổi chỉ tồn tại ở giai đoạn sau mà không có dấu vết ở giai đoạn gốc là cách nhanh nhất để hai tài liệu bắt đầu nói hai điều khác nhau.