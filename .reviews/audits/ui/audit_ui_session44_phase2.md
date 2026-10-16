# Audit phiên 44, pha 2 — giao diện (chặng H, vá)

**Ngày audit:** 2026-10-16. **Người audit:** Orchestrator.
**Phiên được audit:** phiên 44, pha 2, `coding-agent@2026-10-16#1` (Project Owner xác nhận; AVG và RAV đều bật).
**Plan:** `.plan/ui_plan.md` (pha 2, 2026-10-16). Hợp đồng: Data Schema `10.0.1`, API Contract `6.2.0`.

## 1. Kết luận

**Pha 2 đạt.** Mọi việc ở nhóm A → D đều làm đúng plan, và mọi phép cắn tôi làm lại đều bị bắt (§3). `npm run check` cho 2043 ca. Tôi chạy lại trên Linux: 3/3 lượt đạt, khớp số của agent.

**Tiêu chí 5 (e2e ba lượt liên tiếp đạt 83/83) chỉ đạt một phần trên máy Project Owner.** Lượt 1 hỏng một ca, lượt 2 và 3 đạt. Trên Linux, tôi chạy e2e ba lượt liên tiếp, cả ba đạt 83/83, và `UI/evidence` không đổi. Ca hỏng trên Windows là do backend không trả lời, không phải do giao diện (§4). **Project Owner chọn chấp nhận (2026-10-16):** pha 2 đạt, mở ENV-11 để theo dõi.

Phiên 44 xong. Các mục đóng: R44-1 → R44-17 (ba mục R44-8, R44-13, R44-15 là ngoại lệ đã ghi ở §8 của đặc tả), UI-21, UI-22, UI-23. Các mục mở: UI-24 (thấp) và ENV-11 (trung bình).

## 2. Tôi tự kiểm lại

**Lấy mã.** Không có lệnh shell trên máy Project Owner (máy Linux trên thiết bị không khởi động được), nên tôi liệt kê thư mục `UI/` theo giờ sửa và lấy về 57 tệp sửa trong ngày. Bản sao `/home/claude/a44p2` dựng từ `git archive` của `b19ffab`, áp 57 tệp đó và xóa ba công cụ chẩn đoán. `git status` của bản sao cho 55 tệp sửa, 3 tệp xóa và 2 tệp mới; `git diff --stat` báo "58 files changed", khớp con số "58" của agent. `Desktop/src`, `Desktop/configs` trên máy đều có giờ sửa trước hôm nay, nên pha 2 không đụng tới Desktop.

| Lệnh | Kết quả |
|---|---|
| `npm run check` ×3 (Linux, Node 24.14.1) | 3/3 exit 0. `lint:contrast`: 19 + 13 cặp, 97 khai báo màu, 22 miễn trừ. `lint:layer`: 191 tệp. `lint:scope`: 221 tệp. Vitest: 44 tệp, **2043/2043** |
| `npm run e2e` ×3 liên tiếp (Linux, Xvfb; Desktop và Backend lấy từ bản sao phiên 43, mã giống hệt HEAD) | 83/83 cả ba lượt (3,4–3,8 phút); `UI/evidence` 140 tệp, băm không đổi |
| `check-ignore --no-index` 377 tệp được theo dõi dưới `UI/`, với `.gitignore` gốc và `UI/.gitignore` mới | không tệp nào bị bỏ qua; cả tệp giả định mới trong `backup_data/`, `pages/backup/` và `evidence/walkthroughs/backup/` cũng vậy |
| Khối checkpoint (12 khối) | đều đọc được YAML; `clause: external`; `UNSOLVED_PROBLEMS: []`; giờ ghi riêng từng khối, không trùng; không NOTE quá hạn (còn một NOTE ngày 2026-10-07 ở `main`) |
| `package-lock.json` | diff chỉ có hai dòng `version` |

Một chi tiết của bản sao: `npm run check` hỏng nếu thiếu `Desktop/configs/desktop.json`, vì `walkthrough_lib.test.ts` nạp `walkthrough_lib.mjs`, mà tệp này đọc cấu hình của Desktop ngay khi nạp. Trong kho thật tệp đó luôn có, nên đây không phải lỗi; tôi ghi vào UI-24.

## 3. Phép cắn tôi làm lại

Mỗi phép làm trên bản sao. Xong thì khôi phục và xác nhận `git status` trống.

| Mục | Phép cắn | Kết quả |
|---|---|---|
| R44-1 | `kit/_v.tsx`: `fill="#ff0000"`; `width="16px"`; chuỗi `"rgb(1,2,3)"`; `fill="red"` | cả bốn đều làm `eslint` hỏng với thông báo R7 |
| R44-1 (giới hạn) | `` `${n}px` `` trong tệp kit | **lọt**: luật đọc từng đoạn chữ của template, nên đơn vị đứng sau một biểu thức thì không bị bắt. Plan không đòi; ghi vào UI-24 |
| R44-2 | thêm `// GET /watermark-profiles` vào `manage_client/adapters.ts`; thêm `// /artworks` vào `tests/e2e/playwright.config.ts` | `lint:scope` hỏng, báo đúng tệp, dòng và chuỗi |
| R44-3 (B8) | `backup_data/adapters.ts` gọi `dialog:save-file` | ca có sẵn `calls dialog:pick-folder…` hỏng |
| R44-3 | thêm `dialog:save-file` vào danh sách địa chỉ | hai ca mới của `scaffold_ui` hỏng |
| R44-4 (B6b) | `Caption` dùng `--color-action-text-disabled` | `lint:contrast` hỏng ("unlisted … is the foreground of no text pair") |
| R44-4 | viền `.input` của `TextField` đổi sang `--color-border` | `lint:contrast` hỏng |
| R44-5 (B6c) | `Caption` dùng `var(--base-gray-600)`; thêm `--y: var(--base-gray-600)` | `lint:style` hỏng ở cả hai |
| R44-6 (B2b) | Routers của `manage_client`: tên có chữ số thì `required` | 3 ca bảng hỏng |
| R44-7 | đổi nhãn `case` ở đúng tám nhánh (dòng tính trên mã của pha 1) | cả tám làm `vitest` thoát mã 1. Hai nhánh trang hỏng ở một khẳng định. Sáu nhánh hook hỏng qua lỗi chưa xử lý do `assertNever` ném ra; mọi ca vẫn báo "passed". Đúng như agent đã ghi |
| R44-14 | `shouldReloadClients` trả `true` cho `unreachable` | 2 ca Services hỏng |
| R44-16 | `isOwnDataDir` bỏ điều kiện tên | 2 ca hỏng |

Lần đầu cắn R44-7, tôi làm sai: đổi `case 'unreachable':` thành `case 'unreachable' as string:` thì giá trị vẫn y nguyên, nên không ca nào hỏng. Đổi thật nhãn (`'unreachableX'`) thì cả tám đều bị bắt như bảng trên.

## 4. Lượt e2e hỏng trên máy Project Owner — ENV-11

Lượt 1 (15:21:58): ca `client_list_walkthrough.spec.ts:38` (S2, cơ sở dữ liệu trống) chờ 30 giây chữ "Chưa có khách hàng nào." mà không thấy. Ba ca sau nó trong cùng nhóm `serial` không chạy. Log Desktop của ca này có hai dòng: backend đã in READY, rồi "reminder check #1 failed: no answer within 10000 ms". Như vậy chính Desktop cũng không được backend trả lời trong 10 giây. S2 là một lần khởi động ứng dụng mới với thư mục dữ liệu mới.

- Pha 2 không đổi gì ở đường đi giữa giao diện và backend, cũng không đổi Desktop hay Backend. Một backend im lặng hơn 10 giây không phải điều mã giao diện gây ra được.
- Trên Linux, ba lượt liên tiếp đều đạt với cùng mã.
- Trước đây đã thấy những lần chậm khó giải thích lúc khởi động khi AVG và RAV cùng bật (DSK-3; audit phiên 13: lượt đầu mất 33 giây). Đó mới là giả thuyết, chưa chứng minh được.
- Trace và `error-context.md` của lượt 1 đã bị lượt 2 ghi đè, nên không còn gì để đọc thêm. **Bài học cho plan sau:** mỗi lượt kiểm ổn định phải giữ thư mục kết quả riêng, ví dụ `npm run e2e -- --output=test-results/run<N>`.

Project Owner chấp nhận pha 2 và mở **ENV-11**: đo lại ở chặng H bước 3, mỗi lượt giữ thư mục kết quả riêng. Nếu lặp lại, đọc log backend của đúng ca đó.

## 5. Đánh giá những chỗ agent nêu (báo cáo §7) và điều tôi thấy thêm

- **`afterContactRowsChange` luôn trả `null`.** Hàm chỉ có `void saved; return null`. Hành vi giữ nguyên như plan đòi; quyết định đã ở Services, dù nội dung của nó chưa có gì. Chấp nhận.
- **R44-14, phần `shouldReloadClients`:** hook chỉ gọi hàm này trong nhánh `case 'rejected'`. Nếu sau này Services đổi quyết định (ví dụ tải lại cả khi `unreachable`), hook sẽ không theo, nên quyết định vẫn còn dính một phần vào hook. Phép cắn của tôi bị ca Services bắt, nhưng hành vi của trang thì không đổi. Mức thấp, ghi vào UI-24.
- **Miễn trừ của `check_contrast.mjs`:** 22 mục, mỗi mục gồm tệp, selector, token và lý do; miễn trừ nào không còn khớp khai báo nào thì làm lệnh hỏng. Viền của nút thứ cấp được miễn, đúng với §7.1 (danh sách viền phải đạt 3:1 không có viền nút). Chấp nhận.
- **Luật tương phản kiểm token, không kiểm nền:** agent đã nói rõ giới hạn này. Phép cắn B6b và phép đổi viền đều bị bắt. Chấp nhận như một giới hạn của V1.
- **`lint:scope` so chuỗi nguyên văn:** ghép chuỗi (`'/watermark-' + 'profiles'`) sẽ lọt. Mục tiêu là chặn việc thêm vào do sơ ý, không phải chặn người cố tình lách. Chấp nhận.
- **R44-9:** trường `contract` của Configs đã ghi `6.2.0` / `10.0.1`. Còn 10 comment ghi "as declared in api_contract.yaml 4.0.0" (hay 5.0.0) cho bảng lời gọi. Chữ của plan cho phép giữ câu ghi lúc một luật ra đời, nên agent không sai. Nhưng các câu này giống một chỗ trỏ tới phiên bản hiện hành hơn. Ghi vào UI-24.
- **R44-17:** lệnh ngủ được giữ, kèm lý do ở comment và ở `main-EXP-038`. Đúng với đính chính của plan.
- **Giờ checkpoint:** 12 khối ghi trong khoảng 15:40:24–15:41:12, cách nhau 0,4 giây. Giờ sửa tệp trên máy khớp với các giờ đó. Khối `screens` ghi lại lần hai và agent đã báo. Sau khi sửa checkpoint, agent chạy thêm một lượt `npm run check`. Đạt.

## 6. Việc tồn đọng

Ghi vào `.plan/open_issues.md`:
- **đóng** (2026-10-16, phiên 44 pha 2): bảng R44, UI-21, UI-22, UI-23;
- **mở UI-24** (thấp; làm khi một phiên giao diện chạm lại các tệp này, không mở phiên riêng):
  1. hook `commission_form` gọi `shouldReloadClients` với mọi kết quả, không chỉ trong nhánh `rejected`;
  2. 10 comment bảng lời gọi trong Configs ghi API Contract hiện hành;
  3. luật R7 của kit bắt cả đơn vị đứng sau biểu thức trong template, hoặc ghi rõ giới hạn này vào EXPERIENCES của `kit`;
  4. `walkthrough_lib.mjs` chỉ đọc cấu hình Desktop khi cần, để `npm run check` không phụ thuộc tệp của layer khác lúc nạp;
- **mở ENV-11** (trung bình): backend không trả lời quá 10 giây ngay sau READY, ở một lần khởi động trong e2e trên máy Project Owner.

Tiếp theo theo lộ trình: chặng H bước 3, gồm dựng lại bộ cài (Starlette 1.3.1, mã phiên 43 và 44), `test:packaged`, H-3, mục 1 của DSK-31, và đo ENV-11.
