# Audit phiên 31 — giao diện, vá ngắn (UI-18 phần còn lại, UI-19)

- Orchestrator, 2026-10-07.
- Plan: `.plan/ui_plan.md` (phiên 31). Hợp đồng: Data Schema 9.0.2, API Contract 4.0.0.
- Mã kiểm: bản trên đĩa của Project Owner lúc 2026-10-07 08:45 (chưa commit), đặt lên `HEAD = 0814dfb`. `CAS30` đã có trong `HEAD`, và khớp từng tệp với mã Orchestrator audit ở phiên 30.

## 1. Kết luận

**Đạt.** Hai mục làm đúng plan. Mọi thứ chạy lại được trên Linux khớp báo cáo của agent. Hai phép cắn tái lập được.

Một quan sát mới, không chặn commit: số đo `ui18_launch_probe` của Project Owner sáng 7/10 khác số đo của agent (§5.1). Ghi thành UI-20, mức thấp.

## 2. Tệp thay đổi

Chỉ 7 tệp, đều trong `UI/`. Ngoài khối checkpoint, mã chạy trong `UI/src` không đổi.

| Tệp | Thay đổi |
|---|---|
| `tests/tools/walkthrough_lib.mjs` (+ `.d.mts`) | `showInactiveForRun()` là nơi duy nhất quyết định bật cờ: bật khi không có `CT_WALKTHROUGH_RUNNER`. `launchArgs` có thêm tùy chọn `showInactive`, mặc định tắt, đọc cờ từ `desktop.json`. Thêm hằng `SHOW_INACTIVE_LOG_LINE` |
| `tests/e2e/walkthrough_harness.ts` | truyền cờ; `expectShowInactiveState()` đọc log của Main: có cờ thì phải có dòng `ready-to-show`, chế độ ghi bằng chứng thì không được có |
| `tests/e2e/main_layout.spec.ts` | cùng luật, cùng khẳng định |
| `tests/tools/ui18_launch_probe.mjs` | thêm `--show-inactive`, thêm cột `isFocused()`, bỏ `-ExecutionPolicy Bypass` |
| `src/screens/tests/app_root.test.tsx` | `await vi.waitFor(() => expect(loadPending).toHaveBeenCalledTimes(3))` |
| `src/main.tsx` | chỉ khối checkpoint: main-EXP-031, 032 và EVIDENCE |

`walkthrough_app.mjs` và `window_guard.mjs` giống hệt `HEAD`. Không có `eslint-disable` mới; chữ "eslint-disable" mới xuất hiện chỉ nằm trong comment checkpoint, câu "Không eslint-disable".

## 3. Những gì đã tự chạy lại

**Linux**, Node 24, Xvfb với icewm, Desktop của `CAS30`.

| Hạng mục | Agent (Windows) | Project Owner (Windows, 7/10) | Orchestrator (Linux) |
|---|---|---|---|
| `npm run check` | 10/10, 1555 | 1/1, 1555 | 3/3, 1555 |
| `npm run e2e` | 10/10, 70 | 1/1, 70; log `main_layout` có dòng `ready-to-show` | **2/2, 70**; `UI/evidence` (120 tệp) giống hệt trước và sau |
| Phép cắn UI-18: harness không truyền cờ | 2 ca hỏng ở khẳng định mới | — | `client_list` S1 hỏng: "the desktop Main did not log that it showed the window without focus" |
| `app_root.test.tsx` | 50 lần: trước 1 hỏng, sau 0 | 1/1 | — |
| Phép cắn UI-19: mỗi lời gọi `loadPending` tới chậm 50 ms | bản cũ 3/3 hỏng, bản mới 3/3 đạt | — | **bản cũ 3/3 hỏng** ("called 3 times, but got 2"), **bản mới 3/3 đạt** |
| Khẳng định mới còn hỏng được không | — | — | đổi kỳ vọng thành 4 lần thì hỏng ("got 3"): `vi.waitFor` không làm ca luôn đạt |
| Checkpoint `main` | YAML hợp lệ, `UNSOLVED_PROBLEMS: []` | — | đọc diff: chỉ dòng comment đổi |
| Giờ trong checkpoint (BE-8) | `2026-10-05T22:41:41.97` | — | `main.tsx` ghi lúc 22:42:48 giờ máy: đúng quy ước |

## 4. Đối chiếu với plan

Khớp plan ở mọi chỗ:
- cờ đọc từ config, không gõ thẳng chuỗi;
- không bật ở chế độ ghi bằng chứng, không bật ở `walkthrough_app.mjs`;
- có kiểm tự động việc truyền cờ, có phép cắn;
- probe bỏ `-ExecutionPolicy`;
- UI-19 giữ nguyên khẳng định;
- check 10/10, e2e 10/10;
- Project Owner trả lời: "Không còn bị giành".

Hai quyết định agent tự đưa ra, chấp nhận:
- **`main_layout.spec.ts` theo cùng luật "không cờ khi ghi bằng chứng":** spec này ghi ảnh vào `evidence/b2a`. Plan không nói rõ chỗ này, nhưng làm vậy là đúng ý plan.
- **Kiểm việc truyền cờ trong e2e, không trong `npm run check`:** vitest chỉ nạp `src/` và `tests/main/`; thêm ca vào `check` sẽ phải sửa `vite.config.ts`, ngoài phạm vi phiên. Khẳng định trên log của Main chạy ở mọi lượt e2e, nên vẫn kiểm được.

Hai chênh lệch nhỏ so với chữ của plan, chấp nhận:
- Phép cắn UI-19 làm **mọi** lời gọi tới chậm, không riêng lần thứ ba. Vẫn tất định, vẫn cắn đúng chỗ.
- `last_updated_by: coding-agent@2026-10-05#2`: phiên chạy tối 5/10, sau phiên 30 (`#1`), nên số thứ tự đúng.

## 5. Phát hiện

### 5.1 Số đo `ui18_launch_probe` của Project Owner khác của agent (thấp; UI-20)

Mỗi cấu hình đo 20 lần mở.

| Cấu hình | Người đo | Ứng dụng vào nền trước | `isFocused()` true |
|---|---|---|---|
| Không cờ | agent (5/10) | 0 | 20 (khoảng 2 s) |
| Không cờ | Project Owner (7/10) | 6 | 19 (khoảng 1,7–2 s) |
| Có cờ | agent | 2 (sau 3,0 s và 4,9 s) | 2 |
| Có cờ | Project Owner | **8** (sau 3,8–12,1 s) | **8**, cùng lúc |

Ở lượt có cờ của Project Owner, Orchestrator chia theo tiến trình đang giữ nền trước lúc mở (`before=`):
- `1784`, tức tiến trình phụ của probe giữ được nền trước: **1/10** lần bị kích hoạt (lần 19);
- `11488`, nhiều khả năng là cửa sổ PowerShell mà Project Owner gõ lệnh: **6/9** lần;
- `28208`: 1/1.

**Đọc số, có chừng mực:**
- Cờ chặn đúng việc kích hoạt **lúc hiện cửa sổ**. Không có lần nào bị kích hoạt ở khoảng 2 s như khi không cờ; mọi lần đều muộn 3,8–12 s.
- Việc kích hoạt muộn tập trung khi cửa sổ đang giữ nền trước là chính cửa sổ đã khởi chạy probe (PowerShell → node → Electron). Windows cho tiến trình được khởi chạy từ ứng dụng đang ở nền trước quyền lấy nền trước. Đây là **giả thuyết**, chưa đo trực tiếp.
- Cũng chưa biết ai gọi việc kích hoạt muộn đó: Electron, Chromium, hay thao tác của Project Owner trong lúc chờ (ví dụ bấm vào cửa sổ mới hiện).
- Trong 10 lượt e2e do agent khởi chạy, Project Owner làm việc ở ứng dụng khác và xác nhận không còn bị giành. Điều kiện đó khác điều kiện "đứng ở chính cửa sổ đã khởi chạy".

**Mức:** thấp. Tiêu chí đóng UI-18 (Project Owner xác nhận sau 10 lượt e2e) đã đạt. UI-20 chỉ cần khi Project Owner tự khởi chạy e2e từ cửa sổ dòng lệnh rồi ngồi gõ phím ngay ở đó.

**Việc cho sau, nếu cần:** ghi giờ sự kiện `focus` của `BrowserWindow` trong một công cụ đo, và chạy probe khi người dùng chắc chắn không chạm máy, để tách hai nguồn.

### 5.2 Sai sót nhỏ trong checkpoint (ghi nhận, không cần sửa riêng)

- main-EXP-031 ghi bảng đo "không cờ 0/20 vào nền trước". Số đo của Project Owner cho thấy con số này phụ thuộc mạnh vào ai đang giữ nền trước; checkpoint chưa nói điều kiện đó.
- Phiên giao diện sau, nếu chạm khối `main`, ghi thêm một dòng trỏ tới UI-20.

## 6. Việc tồn đọng

- **UI-18:** đóng 2026-10-05, phiên 31.
- **UI-19:** đóng 2026-10-05, phiên 31.
- **Mới:** UI-20 (thấp), §5.1.

## 7. Câu hỏi cho Project Owner

Trong lúc chạy `ui18_launch_probe.mjs --runs=20 --show-inactive` sáng nay, anh có bấm chuột hay gõ phím không, kể cả bấm vào cửa sổ ứng dụng vừa hiện? Câu trả lời giúp tách nguồn của UI-20, nhưng không chặn commit.

## 8. Trả lời của Project Owner (2026-10-07 09:12)

Trong lần đo `--show-inactive` sáng 7/10, Project Owner có bấm vào cửa sổ ứng dụng (nút chức năng, phóng to, thu nhỏ). Đó là nguồn của các lần kích hoạt muộn ở §5.1, không phải lỗi. UI-20 đóng. Lần đo tiêu điểm sau phải chạy khi không ai chạm máy.
