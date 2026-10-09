# Audit phiên 37 — giao diện, chặng F: trang `restore`, workflow giao diện `restore_data`

- Orchestrator, 2026-10-09.
- Plan: `.plan/ui_plan.md` (phiên 37). Đặc tả: `.design/ui_decomposition.md`, mục "Chặng F — Khôi phục". Hợp đồng: Data Schema 10.0.1, API Contract 5.0.0.
- Mã kiểm: bản trên đĩa của Project Owner lúc 2026-10-09 15:47 (chưa commit), đặt lên `HEAD = 0b7a693`.

## 1. Kết luận

**Đạt.** Trang `restore` đúng đặc tả, workflow `restore_data` của giao diện chỉ dùng `ipc_bridge`, và cả bốn lời gọi được kiểm hình dạng đúng hợp đồng, kể cả việc mã lỗi khớp nhãn.

**Tôi tự chạy lại trên Linux:**
- `npm run check`: 1936 ×3, khớp số của agent;
- spec mới: 8/8 ×3;
- toàn bộ e2e: 83 ×2;
- `UI/evidence` không đổi.

Bốn phép cắn của tôi đều bị bắt.

**Lần chạy tay của Project Owner** (log trong tin nhắn) khớp từng bước với kịch bản.

**DSK-25 đóng:** mở bằng lối tắt thì hộp thoại kết quả lên trên cùng và có tiêu điểm.

**Đề xuất:** `restore` → `hoàn_tất`. Ghi vào `ui_decomposition.md` ngày 2026-10-09.

**Bài học của phiên 36 lần này được kiểm bằng cách khác:**
- `services.ts`, `main.tsx` và `kit/index.ts` được sửa sau lượt e2e (15:01–15:03), còn `navigation.ts` được sửa sau lần chạy tay (15:41).
- Tôi build lại `UI/` từ mã cuối và so với `UI/dist/assets/index-DFjds12l.js` mà Project Owner đã chạy lúc 15:31: **giống từng byte** (SHA-1 `c5ac8a39…`). Vite bỏ chú thích khi build, nên điều này chứng minh lần chạy tay của Project Owner chạy đúng mã cuối, và các lần sửa sau đó chỉ là chú thích.
- Lượt e2e của agent chạy trước các lần sửa đó; mã cuối đã được tôi chạy lại e2e trên Linux.

## 2. Tệp thay đổi

Chỉ trong `UI/`. Không có phụ thuộc mới, không có `eslint-disable`, không có ngoại lệ lint mới. Với `core.ignorecase=true`, `git check-ignore` không bỏ qua tệp mới nào, kể cả `UI/evidence/walkthroughs/restore/` (ENV-9).

| Tệp | Nội dung |
|---|---|
| `src/logic/workflows/restore_data/` (mới) | `configs.ts`, `entities.ts`, `adapters.ts`, `services.ts` (khối checkpoint), `routers.ts`, ba tệp kiểm thử |
| `src/screens/pages/restore/` (mới) | `Restore.tsx`, `use_restore.ts`, `walkthrough.yaml`, `tests/Restore.test.tsx` |
| `src/main.tsx`, `src/screens/logic_context.ts` | ráp `restore_data` với `ipc_bridge`; checkpoint `main` |
| `src/screens/navigation.ts` | khóa `restore`, mục thứ bảy "Khôi phục"; checkpoint `screens`, gồm `screens-EXP-055` (lần chạy tay) |
| `src/kit/components/ConfirmPanel/ConfirmPanel.module.css`, `src/kit/index.ts` | `white-space: pre-line`, `overflow-wrap: anywhere`; checkpoint `kit` |
| `src/screens/tests/app_root.test.tsx`, `fake_logic.tsx` | thêm mục "Khôi phục" |
| `tests/e2e/restore_walkthrough.spec.ts` (mới) | S1–S8 |
| `tests/e2e/backup_walkthrough.spec.ts`, `commission_list_…`, `progress_board_…` | chỉ thêm mục thứ bảy vào danh sách điều hướng mong đợi |
| `tests/e2e/walkthrough_harness.ts` | `closeKeepingData`, `reopen`; dọn thư mục kể cả khi ca hỏng |
| `tests/tools/walkthrough_app.mjs`, `walkthrough_lib.mjs` (+ `.d.mts`), `folder_dialog_stub.mjs` | `--keep`, `--reopen`; sửa chú thích của hàm thay hộp thoại |
| `UI/evidence/` | ảnh mới của `restore`; 128 tệp chụp lại bởi lượt có runner |

## 3. Đối chiếu với đặc tả và hợp đồng

| Điểm | Kết quả |
|---|---|
| Bốn lời gọi, đúng địa chỉ và đối số (`{}`, `{ filters }`, `{ archive_path }`) | Đạt (`configs.ts`, `adapters.ts`) |
| Không có `prepare_restore`, `pre_restore`, `dialog:save-file`, watermark, `localStorage` trong `UI/src/` | Đạt. `grep` chỉ thấy các chữ đó trong chú thích checkpoint |
| Kiểm hình dạng | Đạt. Kiểm theo đúng thứ tự: Promise bị từ chối; khung `{status, body}`; nhãn có khai cho lối vào đó không; thân theo `ref`, hoặc `error_body` với `code` **đúng bằng** mã khai cho nhãn. `pending_restore_record` đủ năm trường, đường dẫn không rỗng, thời điểm đúng `formats.timestamp`. `open_file` dùng union theo `canceled` |
| Câu thông báo theo **nhãn**, không theo mã | Đạt, và cần thiết: 424 và 500 cùng mã `ERR_STORAGE_IO` nhưng câu khác. Có ca kiểm thử riêng cho điều này |
| Đọc lại trạng thái sau mọi lần chuẩn bị hay hủy không thành; câu của lần hỏng đầu giữ nguyên; đọc lại hỏng thì ẩn khung | Đạt. Trạng thái có ba giá trị `pending`, `none`, `unknown`, nên khi không biết thì trang không khẳng định "không có gì đang chờ" |
| Xác nhận trước khi chuẩn bị, có câu "sẽ được thay" khi đang có lần chờ; không xác nhận khi hủy | Đạt; Project Owner xác nhận ở A3.3, A3.6, A3.7 |
| Bảy mục điều hướng, sáu mục cũ giữ vị trí | Đạt |
| Kết quả pha 2 không do giao diện hiện | Đạt. Giao diện không có lối vào nào tới `apply_pending_restore` |

**Chấp nhận bốn chỗ agent tự quyết** (ghi vào lịch sử của `ui_decomposition.md`):
1. **`--keep` và `--reopen` của `walkthrough_app`.** Plan viết "`--reopen` đọc thư mục từ tệp phiên", nhưng tệp phiên bị xóa khi ứng dụng thoát. Đây là chỗ sai của plan, không phải của agent.
2. **Nút "Chọn tệp sao lưu" vẫn dùng được** khi `restore:status` bị từ chối hay vi phạm hợp đồng, như ở ca 500. Một lần chuẩn bị mới vẫn thay mọi lần cũ.
3. **Dòng chỉ báo "Đang hủy lần khôi phục đang chờ…"**: đặc tả không nêu chữ cho trạng thái này.
4. **`ConfirmPanel` thêm hai thuộc tính CSS** để xuống dòng giữa các câu và ngắt đường dẫn dài. Không đổi màu, không thêm component; phép kiểm tương phản vẫn đạt.

## 4. Những gì đã tự chạy lại

**Môi trường:** Linux, Node 24, Xvfb với icewm, Electron 44.4.5, `TZ=Asia/Ho_Chi_Minh`, `ELECTRON_DISABLE_SANDBOX=1`. Desktop ở `HEAD` (CAS36), không sửa.

| Hạng mục | Agent (Windows) | Orchestrator (Linux) | Kết quả |
|---|---|---|---|
| `npm run check` | 1936 | **1936 ×3**, mã thoát 0 | khớp |
| `restore_walkthrough.spec.ts` | 10/10 lần, mỗi lần 8 đạt | **8/8 ×3** | khớp |
| `npm run e2e` | 83, 5/5 lượt có runner, thêm 1 lượt không đặt biến | **83 ×2** không đặt biến; `UI/evidence` giống hệt; không thư mục tạm nào còn lại | khớp |
| Bản build so với bản Project Owner chạy | — | `index-DFjds12l.js` giống từng byte | mã chạy tay chính là mã cuối |
| Checkpoint `restore_data` | — | 6 EXPERIENCES, 3 EVIDENCE, `UNSOLVED_PROBLEMS: []` | đạt |
| Checkpoint `main`, `kit`, `screens` | — | 35, 22, 55 EXPERIENCES; không trùng id; `UNSOLVED_PROBLEMS: []` | đạt; xem §5.2 |
| Giờ (BE-8) | `Get-Date -Format o` | bốn khối, 15:01:21 tới 15:41:37, có phần lẻ bảy chữ số | đúng quy ước |

Chỉ chạy được trên Windows, Orchestrator dựa vào số của agent: `dist`, `test:packaged` 11/11, mốc `%APPDATA%`.

**Phép cắn của Orchestrator,** chạy bằng Vitest trên bản sao:

| Phép cắn | Ca bắt được |
|---|---|
| (a) đọc lại trạng thái luôn trả `unknown` | 4 ca của `prepare` (500, 503, 400 giữ bản ghi cũ, hỏng mà không còn gì chờ) |
| (b) bỏ kiểm `code` khớp nhãn | 4 ca vi phạm hợp đồng của `prepare` và `cancel` |
| (c) bỏ câu "Lần khôi phục đang chờ sẽ được thay bằng lần này." | 2 ca (Routers và Services) |
| (e) câu của 424 thay bằng câu của 500 | ca "424 và 500 nói khác nhau", và một ca của đọc lại |

## 5. Phát hiện

### 5.1 DSK-25 đóng

Project Owner mở bản đóng gói bằng lối tắt: hộp thoại "Khôi phục dữ liệu" hiện trước cửa sổ ứng dụng và có tiêu điểm (Enter đóng được). Đóng hộp thoại thì ứng dụng mở, dữ liệu đúng là dữ liệu của tệp sao lưu.

Khi mở từ một tiến trình khác (script, `npm`), hộp thoại không lên trên cùng; đó chỉ là cách chạy của kiểm thử và công cụ, không phải cách họa sĩ dùng. Đóng 2026-10-09, phiên 37.

### 5.2 NOTES của `main` (giao diện) sắp hết hạn (UI-22, thấp)

Khối `main` của `UI/` còn sáu NOTES ghi ngày 2026-09-27, 09-28, 09-29 và 10-07. Ba NOTES ngày 09-27 hết hạn 14 ngày vào 2026-10-11. Phiên giao diện kế tiếp, hoặc chặng H, xem lại: chuyển thành EXPERIENCES hoặc xóa. Cùng loại việc với NOTES của Main desktop đã gộp vào DSK-26.

### 5.3 Ghi nhận

- Việc 2 đo trước khi viết, và phát hiện một điều plan không lường trước: tệp điều khiển của fixture còn `down` thì lần mở lại tắt backend ngay. Harness và `--reopen` đều đặt lại `up` trước khi mở lại.
- Bộ gom log của harness bắt dòng `restore dialog text` 5/5 lần. Spec vẫn dùng dữ liệu và tệp làm khẳng định chính, đúng bài học DSK-27.
- Các bước bấm tay của agent dùng tệp `demo..ctbackup`, một tệp văn bản đặt đuôi `.ctbackup`, cho bước 409. Log của Desktop ghi `restore:prepare -> 409`, rồi `restore:status -> 200`, đúng luật đọc lại.

## 6. Trạng thái

- `restore` → **`hoàn_tất`**: agent đề xuất theo I6, Orchestrator đã audit, Project Owner đã chạy tay.
- **Chặng F:** mọi tiêu chí đạt, trừ DSK-26. Từ CT-8, việc đóng DSK-26 là điều kiện để chặng F xong. Chặng F xong sau phiên 38.
- Hợp đồng không đổi.

## 7. Commit

```
git add UI
git commit -m "CAS37 - UI: stage F restore page"
git add .reviews/audits/ui/audit_ui_session37.md .design/ui_decomposition.md .plan/open_issues.md .plan/v1_roadmap.md CLAUDE.md
git commit -m "OS - Audit session 37; restore page done; DSK-25 closed; UI-22"
git push
```
