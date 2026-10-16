# ===WCA-PLAN===
# session_for: desktop
# drafted_by: Orchestrator + Project Owner
# drafted_at: 2026-10-16T18:27:53+07:00
# contract: data_schema 10.0.1, api_contract 6.2.0 (approved)

## MỤC TIÊU PHIÊN NÀY

Đây là phiên 45 của dự án, thuộc **chặng H, bước 3: dựng và kiểm bản cuối của V1**.

Ba phiên kiểm độc lập (42 backend, 43 desktop, 44 giao diện) đã sửa mã ở cả ba layer. Bộ cài `1.0.0` đang có ở `Desktop\release\` được dựng ở phiên 40, nên thiếu ba thứ:
- Starlette 1.3.1 (BE-12);
- mã Desktop của phiên 43;
- mã giao diện của phiên 44.

Phiên này dựng lại bộ cài từ mã hiện tại, rồi kiểm nó nhiều lượt. **Không sửa mã sản phẩm.** Việc sửa duy nhất là dọn checkpoint của Main (DSK-31 mục 2).

Bản cài cuối của phiên này là bản Project Owner dùng cho runbook cài đè và cho luồng của họa sĩ từ đầu tới cuối. Vì vậy nó phải được dựng từ **đúng mã nguồn cuối phiên**: checkpoint của Main nằm trong `dist/main.js` (`tsc` giữ comment, và `main.js` đi vào `app.asar`), nên sửa checkpoint sau khi dựng thì bộ cài không còn khớp với mã sẽ commit. Thứ tự ở mục "VIỆC CẦN LÀM" được sắp để tránh chuyện đó.

Đọc các mục sau trong `.plan/open_issues.md`: DSK-31, H-3, ENV-11, BE-12, DSK-3, ENV-10. Không đọc, không ghi `.reviews/`.

**Điểm dừng:**
- bộ cài cuối đã dựng từ mã cuối phiên;
- `test:packaged` đạt 3 lượt liên tiếp, cộng 1 lượt trên bản cuối;
- e2e của giao diện đạt 3 lượt, mỗi lượt giữ thư mục kết quả riêng;
- đã đo dung lượng bản cài;
- checkpoint của Main đúng Giao thức 07.

## VIỆC CẦN LÀM, THEO THỨ TỰ

0. **Đọc tài liệu** theo `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md` (mục 4 bố cục `Desktop/`; mục 5 phần Node, ENV-10 và phần đóng gói);
   - `08-operating-protocol.md`, `07-checkpoint-protocol.md`;
   - khối checkpoint Main ở đầu `Desktop/src/main.ts`;
   - `Desktop/packaging/prepare_runtime.mjs`, `Desktop/electron-builder.yml`, `Desktop/tests/packaged/packaged_app.spec.ts`;
   - các mục `open_issues` nêu trên;
   - plan này, sau cùng.

   Xác nhận Data Schema **`10.0.1`** và API Contract **`6.2.0`**, cả hai `approved`. Sai thì dừng lại và báo.

1. **Môi trường và mốc.**
   - Hỏi Project Owner ba điều:
     - số thứ tự phiên trong ngày, để ghi định danh;
     - antivirus đang ở trạng thái nào;
     - anh đã chép bộ cài `1.0.0` cũ (phiên 40) ra `E:\installer\` chưa. **Chưa chép thì dừng và chờ**, vì `npm run dist` sẽ ghi đè tệp đó.
   - Ghi phiên bản Node, npm, Electron, electron-builder.
   - Ghi `git status --short`. Phải trống, vì phiên 44 đã được commit.
   - Chụp mốc `%APPDATA%\CommissionTracker` và `%APPDATA%\Commission Tracker`: chỉ liệt kê tên và giờ sửa, không mở tệp.
   - **Không chạy `npm ci`.** Kiểm `Desktop\node_modules\electron\dist\electron.exe` và `UI\node_modules` có sẵn. Thiếu `electron.exe` thì làm theo `CLAUDE.md` mục 5 (ENV-10) và ghi vào báo cáo.
   - Ghi SHA-256 và kích thước của bộ cài cũ ở `Desktop\release\` trước khi bị ghi đè.

2. **DSK-31 mục 2: dọn NOTES của Main.** Hai NOTE trong khối checkpoint của `src/main.ts` ghi ngày 2026-10-05, sẽ hết hạn ngày 2026-10-19 (`CLAUDE.md` mục 5). Xem từng phần:
   - NOTE thứ nhất (hai cờ kiểm thử của phiên 30): cờ đã nằm trong `configs/desktop.json` và có ca kiểm thử. Còn giá trị thật thì chuyển thành EXPERIENCES (id mới), không thì xóa;
   - NOTE thứ hai:
     - mục (1), bản cài làm nhiễu phép đo thông báo: còn đúng thì chuyển thành EXPERIENCES;
     - mục (2), bản cài thiếu `dist\cross_cutting` ngày 2026-10-04: lỗi thời, xóa;
     - mục (3), e2e hiện toast thật: chuyển thành EXPERIENCES nếu chưa có chỗ nào ghi.

   Ghi trong báo cáo từng phần đi đâu. **Ở bước này chưa sửa EVIDENCE** (xem việc 7).

3. **Kiểm mã nguồn trước khi dựng.** Trong `Desktop/`:
   - `npm run lint`: sạch;
   - `npm test` **một lượt**: mốc **95**. Mã Desktop không đổi từ phiên 43, nên một lượt chỉ để xác nhận môi trường. Ca 15 và 16 của `show_inactive` hỏng vì Project Owner chuyển cửa sổ thì ghi riêng (DSK-30 mục 4); ca khác hỏng thì dừng và báo.

4. **Dựng bộ cài, lần 1.** Trong `Desktop/`: `npm run dist`.
   - Lệnh này tự dựng lại `packaging/stage/` từ đầu: cài phụ thuộc theo `Backend/requirements.txt`, chép backend, chạy `npm run build` của `UI/`, rồi chạy thử backend trong stage. Ghi đủ đầu ra của bước kiểm thử khói (smoke test).
   - **Kiểm Starlette:** liệt kê tên các thư mục `starlette-*.dist-info` và `fastapi-*.dist-info` trong `packaging\stage\python\` (chỉ liệt kê tên, không mở tệp nào trong `release\`). Phải có `starlette-1.3.1.dist-info` và không có bản Starlette nào khác. Khác thì dừng và báo.
   - Ghi tên, kích thước và SHA-256 của bộ cài mới.
   - pip cần mạng để tải gói. Hỏng vì mạng hay antivirus thì dừng và báo; không tắt antivirus, không đổi nguồn gói.
   - ⚠ Không liệt kê và không đọc vào bên trong tệp `.asar` (ENV-3).

5. **H-3: dung lượng.** Trên `release\win-unpacked\`, cộng kích thước mọi tệp; không mở `.asar`, chỉ đọc kích thước của nó như một tệp. Ghi:
   - tổng theo byte, MB (10⁶) và MiB;
   - tách riêng: Electron (mọi thứ ngoài `resources\`), `resources\python\`, `resources\backend\`, `resources\ui\`, `app.asar`;
   - kích thước bộ cài.

   Trần là **400 MB**, xét theo MB (10⁶ byte). Mốc cũ ở phiên 13: khoảng 371 MB. Vượt trần thì ghi rõ phần nào tăng, không tự cắt gì.

6. **Kiểm bản đóng gói và giao diện, nhiều lượt.** Theo đúng thứ tự, không chạy hai lệnh cùng lúc:
   - Trong `Desktop/`: `npm run test:packaged` **ba lượt liên tiếp**. Mốc **12**. Lượt đầu của exe mới có thể chậm khoảng 25–35 s do antivirus (DSK-3): ghi thời gian từng lượt, không nới thời gian chờ.
   - Trong `UI/`: `npm run e2e` **ba lượt liên tiếp**, **không đặt `CT_WALKTHROUGH_RUNNER`**, mỗi lượt giữ thư mục kết quả riêng: `npm run e2e -- --output=test-results/run1` (rồi `run2`, `run3`). Mốc **83**. Đây là phép đo lại của **ENV-11**.
     - Ghi đường dẫn thật của ba thư mục kết quả. Kiểm bằng `git -c core.ignorecase=true check-ignore -v` rằng git bỏ qua chúng.
     - Lượt nào hỏng thì **giữ nguyên** thư mục kết quả của lượt đó. Chép vào báo cáo: tên ca, lỗi, các dòng log Desktop và backend của đúng ca đó (dòng có `READY`, `reminder check`, `no answer`), cùng giờ.
     - Sau mỗi lượt, `UI/evidence/` không đổi.
   - Mọi lượt hỏng đều tính và phải báo. Không chạy lại cho tới khi đạt.

7. **Checkpoint của Main** theo Giao thức 07:
   - EVIDENCE cho việc 3 → 6: lệnh, số ca, số lượt, kết quả, và dung lượng của H-3;
   - **không** ghi SHA-256 của bộ cài vào checkpoint, vì bộ cài cuối sẽ được dựng lại sau bước này (việc 8). SHA-256 chỉ ghi trong báo cáo;
   - gộp các mục EVIDENCE cũ về `dist` và `test:packaged` thành một mục mốc hiện tại (Giao thức 07: không cộng dồn lịch sử);
   - **giờ ghi:** chép **nguyên** giá trị `Get-Date -Format o` lấy **ngay trước khi ghi khối**;
   - `UNSOLVED_PROBLEMS: []`.

   Không sửa khối checkpoint nào khác.

8. **Dựng bộ cài cuối, từ mã cuối phiên.**
   - Sau việc 7, mã nguồn không được đổi gì thêm. Ghi `git status --short`: chỉ còn `Desktop/src/main.ts`.
   - Chạy lại `npm run lint`, rồi `npm run dist`.
   - Kiểm lại Starlette như việc 4.
   - Ghi tên, kích thước, SHA-256 của bộ cài cuối.
   - Chạy `npm run test:packaged` **một lượt** trên bản cuối. Phải đạt 12/12.

   Đây là bộ cài Project Owner sẽ dùng. Nếu phải sửa gì sau bước này, kể cả một chữ trong checkpoint, thì làm lại việc 8.

## BÁO CÁO

Viết bằng tiếng Việt, ngắn gọn, theo `CLAUDE.md` mục 5. Báo cáo gồm:
1. Môi trường: phiên bản, antivirus, định danh phiên. Bộ cài cũ: SHA-256 và nơi Project Owner đã chép.
2. DSK-31 mục 2: từng phần của hai NOTE đi đâu.
3. `npm run lint`, `npm test`: kết quả.
4. Lần dựng 1: đầu ra smoke test, các `*.dist-info` của Starlette và FastAPI, SHA-256 bộ cài.
5. H-3: bảng dung lượng; đạt hay không so với trần.
6. Ba lượt `test:packaged`, ba lượt e2e: số đạt và hỏng, thời gian, tên ca hỏng; thư mục kết quả; với lượt hỏng, các dòng log đã chép.
7. Bộ cài cuối: tên, kích thước, SHA-256; `test:packaged` một lượt.
8. `git status --short` cuối phiên: chỉ `Desktop/src/main.ts`.
9. Mốc `%APPDATA%` đầu và cuối.
10. Chỗ nào đã dừng để báo, nếu có.

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG VÀ DỰ ÁN

- `version` của `Desktop/package.json` là `1.0.0` và giữ nguyên (`app_version` là semantic version theo hợp đồng; Project Owner quyết 2026-10-11).
- Bản đóng gói chỉ nhận hai cờ kiểm thử `--ct-test-data-dir` và `--ct-test-no-dialog`; `test:packaged` luôn truyền `--ct-test-data-dir` (`CLAUDE.md` mục 5).
- Python trong gói là gói nhúng 3.13.12, chạy `Backend.py` từ mã nguồn đã chép vào gói. Không đổi `python_runtime.json`.
- Không lối vào, nhãn, mã lỗi hay cờ nào được thêm, bớt hay đổi.

## CẢNH BÁO — điều KHÔNG được làm

- Không sửa tệp nào ngoài khối checkpoint của `Desktop/src/main.ts`. Được **chạy** `npm run build`, `npm run e2e` của `UI/`; không sửa `UI/`, không sửa `Backend/`.
- Không sửa `electron-builder.yml`, `prepare_runtime.mjs`, `python_runtime.json`, `package.json`, `package-lock.json`, `configs/`.
- Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`. Không đọc, không ghi `.reviews/`.
- ⚠ Không liệt kê và không đọc vào bên trong tệp `.asar` (ENV-3).
- Không cài bộ cài, không gỡ bản đã cài, không sửa registry. Việc cài là của Project Owner, sau phiên.
- Không chạy `npm ci`, `npm install`, `npm audit fix`. Không cài gói hay công cụ nào ngoài những gì `npm run dist` tự làm.
- Không chạy `git commit`, `push`, `reset`, `checkout`, `restore`, `stash`, `clean`, `tag` hay lệnh nào đổi trạng thái kho. Chỉ được đọc.
- ⚠ Không kiểm thử hay lần chạy nào được đụng `%APPDATA%\CommissionTracker` thật. Mọi lần mở ứng dụng phải kèm `--ct-test-data-dir`. Không tự mở exe bằng tay.
- Không tắt, gỡ hay đổi cấu hình phần mềm diệt virus.
- Không tắt luật lint, không thêm `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`.
- Không nới thời gian chờ, không thêm `retries`, `skip`, `fixme`.
- Không dùng sub-agent. Không chạy song song hai lệnh kiểm thử hay hai bản ứng dụng.
- Không xóa thư mục kết quả e2e của lượt hỏng. Chỉ xóa thư mục tạm do chính bạn tạo, gọi đích danh, không xóa theo mẫu tên.
- Gặp lỗi ở bất kỳ bước nào mà việc sửa cần đổi mã sản phẩm: dừng lại và báo.

## TIÊU CHÍ HOÀN TẤT

1. Bộ cài cũ đã được Project Owner chép ra trước khi dựng; SHA-256 của nó đã ghi.
2. DSK-31 mục 2 xong: không còn NOTE nào của Main ghi ngày 2026-10-05.
3. `npm run lint` sạch; `npm test` 95/95 (hoặc ca 15, 16 hỏng vì tiêu điểm, đã ghi riêng).
4. Bộ cài mới có `starlette-1.3.1.dist-info` và không có bản Starlette nào khác; smoke test đạt.
5. H-3 đã đo, so với trần 400 MB.
6. `test:packaged` 3 lượt liên tiếp, e2e 3 lượt liên tiếp, mỗi lượt e2e giữ thư mục kết quả riêng; mọi lượt đã báo; `UI/evidence/` không đổi.
7. Checkpoint Main: YAML hợp lệ, `UNSOLVED_PROBLEMS: []`, giờ ghi lấy ngay trước khi ghi.
8. Bộ cài cuối dựng sau mọi lần sửa, `test:packaged` 12/12 trên bản đó, SHA-256 đã ghi.
9. `git status --short` chỉ có `Desktop/src/main.ts`; mốc `%APPDATA%` giống đầu phiên.
