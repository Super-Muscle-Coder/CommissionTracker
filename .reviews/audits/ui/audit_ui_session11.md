# Audit phiên 11 (B2a, phiên giao diện đầu tiên) — `coding-agent@2026-09-27#1`

*Orchestrator, 2026-09-27. Theo `08-operating-protocol.md`, Phần 5. Plan: `.plan/ui_plan.md` (iWCA I2).*

## Kết luận

**B2a được chấp nhận, kèm ba chỗ hở của máy kiểm phải vá ở đầu phiên 12.**

Công việc thật và đúng phạm vi. Báo cáo trung thực: mọi con số tôi chạy lại đều khớp, và không có tệp nào ngoài `UI/` bị sửa.

Chất lượng phiên này cao hơn mức plan đòi. Chính bằng chứng "luật cắn" của agent đã tìm ra hai lỗi thật trong cấu hình kiểm (R8, R3). Agent sửa cả hai, rồi chứng minh lại.

Tuy vậy, khi tôi tự dò thêm những biến thể agent chưa thử, **ba vi phạm vẫn lọt qua `npm run check`** (P1–P3 bên dưới). Không cái nào nằm trong code đang có; cả ba là chỗ hở của máy kiểm. Theo quy tắc quay lui của I2, chỗ hở phải được vá, và phải chứng minh luật cắn, **trước** khi viết workflow đầu tiên. Tôi đưa việc này vào đầu plan phiên 12, thay vì mở một phiên riêng.

## Tôi kiểm lại độc lập

Linux, **Node 24.14.1** (đúng bản trên máy Project Owner), cài từ đúng `package-lock.json` của agent bằng `npm ci`.

| Kiểm | Kết quả |
|---|---|
| `npm ci` | Sạch, không có peer dependency lỗi |
| `npm run check` | Đạt: `tsc -b`, ESLint, stylelint, `check_layer` (22 tệp), Vitest **24/24** (7 `http_client` + 17 Main) |
| `npm run build` | Tên tệp đầu ra **giống hệt** bản build trên Windows của Project Owner (`index-Dr4QsNbP.css`, `index-w1KJSoMi.js`): build tái lập được |
| e2e qua Desktop thật (Electron 44.4.5, Xvfb, backend thật) | **Đạt**: khung chính hiện ra, console renderer rỗng, backend thoát mã 0, Electron thoát mã 0 |
| Đối chứng e2e: bỏ thẻ CSP khỏi `dist/index.html` | e2e **hỏng** vì bắt được "Electron Security Warning (Insecure Content-Security-Policy)". Phép kiểm CSP cắn thật, đúng như phép đối chứng của agent |
| Bốn khối checkpoint (`main`, `kit`, `screens`, `scaffold_ui`) | Parse được bằng YAML; `clause: external`; không có `UNSOLVED_PROBLEMS` |
| Phạm vi | `CLAUDE.md`, `.slnx`, `.contracts/`, `Desktop/`, `Backend/` không đổi (theo thời điểm sửa đổi). Không có tệp tạm nào trong `src/` |

Project Owner cũng đã tự chạy `npm run check` (24/24) và `npm run e2e` (đạt) trên Windows. Kết quả khớp.

**Bằng chứng cắn, tôi làm lại riêng:** 20 ca, gồm R1–R14 cùng chiều ngược của R5 và R8. Cả 20 cho đúng kết quả mong đợi, và thông báo lỗi chỉ đúng vào vi phạm.

Đối chiếu đặc tả:

- **`results.ts`** khớp **đúng từng dòng** đặc tả §6 của `iwca_theory.md`: đủ bốn `kind` của mỗi kiểu, đủ các thứ đi kèm (`ErrorBody`, `INPUT_FORMAT_CODE`, `InputFormatCode`, `ResultMessages`, `assertNever`), không trường tùy chọn.
- **Main** làm đúng năm việc theo thứ tự. Nhánh duy nhất là màn hình lỗi khởi động. Bridge được kiểm định dạng chặt, có 10 ca sai dạng trong kiểm thử.
- **`http_client`** làm đúng ba việc và không phân loại phản hồi.

## Phát hiện

### P1 — R13 chỉ bắt `switch`; phân nhánh bằng `if` hoặc toán tử `? :` trên `kind` lọt qua (mức: trung bình)

Ca thử: trong Services, `if (r.kind === 'ok') return 'a'; return 'b'` trên một `ViewResult` → `npm run check` **đạt**.

R13 viết "mọi phép phân nhánh trên `kind` … phải đầy đủ". `switch-exhaustiveness-check` chỉ nhìn thấy `switch`. Phiên 12 sẽ viết Services và hook đầu tiên phân nhánh trên `kind`, nên đây đúng là chỗ sắp dùng tới.

**Vá:** cấm so sánh trực tiếp với `.kind` (`===`, `!==`, và `? :` dựa trên so sánh đó) trong `logic/**` và `screens/**`, qua `no-restricted-syntax`. Như vậy mọi phân nhánh trên `kind` buộc phải đi qua `switch`, nơi luật đầy đủ đã cắn. Adapters, khi phân nhánh trên `Transport.kind`, cũng theo luật này. Chứng minh cắn bằng một ca `if` và một ca `? :`.

### P2 — R12: kit đọc được bridge qua `document.defaultView` (mức: trung bình)

Ca thử: trong `src/kit/`, `Reflect.get(document.defaultView ?? {}, 'commissionTracker')` → **đạt**.

Vùng kit cấm `window`, `globalThis`, `self`… nhưng cho dùng `document`, vì component có thể cần. Qua `defaultView`, kit chạm được tới đúng đối tượng mà chỉ Main được đọc. Vùng `screens` và `logic` không bị, vì R11 và R4 đã cấm `document`. `configs` cũng hở tương tự, nhưng ít thực tế hơn.

**Vá:** cấm truy cập thuộc tính `defaultView` (và tương tự `ownerDocument.defaultView`) ở mọi vùng trừ Main, bằng `no-restricted-syntax` theo tên thuộc tính. Chứng minh cắn.

`claim` của EVIDENCE R12 trong checkpoint `main` ("ngoài Main không đọc giá trị của môi trường chủ") hiện rộng hơn phần đã chứng minh. Sửa `claim` cùng lúc với việc vá.

### P3 — R14: giá trị cấu hình bị "rửa" qua một thư mục `tests/` (mức: thấp đến trung bình)

Ca thử:

- `src/screens/tests/leak.ts` re-export `LAYER_CONFIGS`;
- `src/screens/xb.ts`, một tệp chạy thật, import `./tests/leak` → **đạt**.

Ngoại lệ R14 cho tệp kiểm thử được khai báo theo mẫu đường dẫn (`**/tests/**`, `*.test.*`). Vì vậy mọi tệp nằm trong thư mục `tests/` đều được miễn, kể cả khi nó không phải kiểm thử, và code chạy thật import được nó.

**Vá:** cấm tệp chạy thật (ngoài `tests/` và `*.test.*`) import bất cứ gì từ `**/tests/**` hay `*.test.*`. Chứng minh cắn.

### Không phải phát hiện

Tôi đã thử một tệp `.js` trong `screens/` dùng `fetch`, được một tệp `.ts` import. `tsc` chặn ở TS7016, vì không có `allowJs`. Máy kiểm hiện tại đủ cho trường hợp này.

## Câu hỏi của agent — quyết định của Orchestrator

1. **Khối checkpoint thứ tư ở `scaffold_ui/adapters.ts`:** agent làm **đúng**. Giao thức 07 đòi mỗi workflow một khối, và plan của tôi thiếu chỗ này. Đã ghi vào `CLAUDE.md` mục 5.
2. **`startup_error_layout`:** agent làm **đúng**, theo I2.6. Lỗi là ở `ui_decomposition.md` §5 của tôi; đã sửa: màn hình lỗi khởi động không phải layout, không phải đích điều hướng.
3. **Token phông chữ:** đồng ý.
   - Bảng nhóm token của I4 cho phép dự án thêm nhóm ở tài liệu nền, nên tôi đã thêm nhóm **`font-family`** vào `CLAUDE.md` mục 5.
   - Giá trị là một chồng phông hệ thống có dấu tiếng Việt. Không nhúng tệp phông, vì Desktop không phục vụ `.woff2`.
   - Phiên 12 đặt token này; ảnh chụp hiện dùng phông có chân mặc định.
4. **Bốn gói ngoài danh sách và `jsdom` 29.1.1:** chấp nhận. Đó là peer dependency bắt buộc, và `jsdom` 30 đòi Node 24.15 trong khi máy đang chạy 24.14.1.
5. **Desktop thoát mã 1 khi lần nạp đầu bị hủy:** ghi nhận thành **Q5 của Desktop** (danh sách tồn ở audit phiên 10). Desktop hiện coi mọi lỗi của `loadURL` lần đầu, kể cả `ERR_ABORTED`, là lỗi chết.
   - Trong sản phẩm, việc này chỉ xảy ra nếu người dùng bấm tải lại (menu mặc định của Electron có Ctrl+R) đúng lúc đang nạp lần đầu. Rất khó xảy ra.
   - Để phiên desktop sau: bỏ qua `ERR_ABORTED` khi đã có lần nạp mới thay thế, và gỡ menu mặc định (tải lại, DevTools) ở bản đóng gói, chặng C.

## Nhận xét khác

- **Ghi nhận tốt:**
  - Agent tìm ra lỗi R8: mẫu phủ định kiểu gitignore không gỡ được tệp con khi thư mục cha đã bị cấm. Chuyển sang regex.
  - Agent tìm ra lỗi R3: `typescript-eslint` bỏ qua cả một `import type` nếu nó khớp một mẫu `allowTypeImports` bất kỳ. Tách mẫu thành hai khóa luật.
  - Agent tự thêm lệnh cấm `import()` động, vì các luật import không nhìn thấy nó.

  Đây đúng là loại lỗi mà một luật chỉ nằm trong tài liệu sẽ không bao giờ lộ ra. Tất cả đã được ghi thành `main-EXP-002`, nên phiên sau không phải tìm lại.
- **Chẩn đoán e2e trung thực:** e2e hỏng 3 trên 4 lần. Agent không che bằng cách chạy lại cho tới khi may mắn đạt, mà tìm ra nguyên nhân: `page.reload()` hủy lần nạp đầu. Sau khi sửa, đạt 5/5, và có phép đối chứng CSP. Đó là cách làm đúng.
- **`http_client` trả `body: null` cho cả thân rỗng lẫn thân không phải JSON.** Adapters của phiên 12 vẫn phân loại được `contract_violation`, vì hợp đồng không có nhãn `ref: none` nào, nên một thân `null` luôn sai hình dạng. Nhưng `reason` sẽ không nói được "thân không phải JSON". Chấp nhận ở V1; ghi lại để khi có nhãn `ref: none` thì xem lại.
- **Thiếu font-family** là đúng theo I4, không phải lỗi của agent.
- **Trạng thái trang:** `client_list` giữ `chưa_làm` trong `.design/ui_decomposition.md`. Nó chuyển sang `đang_làm` khi plan phiên 12 được phát hành.

## Đề xuất

- **B2a: chấp nhận.** `.plan/v1_roadmap.md` đã ghi B2a xong.
- **Phiên 12 (B2b) bắt đầu bằng việc vá P1–P3**, mỗi luật có bằng chứng cắn mới, và sửa `claim` của EVIDENCE R12, R13, R14. Sau đó mới tới workflow `manage_client` và trang `client_list`.
- **Trước phiên 12:** chốt cơ chế cho bước `unreachable` của kịch bản bấm thử (roadmap B2b) và đặt token `font-family`.
- **Tồn của Desktop** (Q1–Q5): không chặn gì; gộp vào phiên desktop kế tiếp.
- **Tồn của Backend:** xóa hai NOTE mà B1 đã đáp ứng; viết lại `claim` của EVIDENCE CORS cho khớp 6.0.1.
