# ===WCA-CHECKPOINT-START===
# workflow: record_payment
# clause: clause_b_backend
# component: services
# last_updated_by: coding-agent@2026-09-30#1
# last_updated_at: 2026-09-30T23:40:00+07:00
#
# EXPERIENCES:
#   - id: record_payment-EXP-001
#     content: >
#       Quyết định nghiệp vụ ở Services. Ghi nhận: hỏi manage_commission
#       (get_commission_summary) trước; không có -> CommissionNotFoundError
#       (404); currency khác agreed_price.currency của đơn ->
#       CurrencyMismatchError (422), kể cả currency ngoài supported_currencies
#       (Routers chỉ kiểm tra dạng ISO 4217 ba chữ in hoa). Không xét giai
#       đoạn của đơn, không gọi update_progress. Hủy: không có -> 404, đã hủy
#       -> PaymentAlreadyVoidedError (409); khoản chỉ được hủy, không xóa, không
#       sửa. Số dư luôn tính lại từ các khoản chưa hủy (incoming cộng, refund
#       trừ; outstanding bỏ các khoản tip, xem record_payment-EXP-005), bằng
#       int, theo currency của đơn và agreed_price hiện tại của đơn (sửa giá
#       đơn thì outstanding đổi theo); không lưu tổng nào.
#       received_net và outstanding có thể âm. payment_list: mọi khoản của
#       đơn, kể cả đã hủy, mới nhất trước theo thời điểm thật của paid_at
#       (datetime.timestamp(), không so chuỗi); hòa thì recorded_at mới hơn
#       trước, rồi payment_id. payment_ledger: mọi khoản chưa hủy của mọi đơn,
#       cũ nhất trước theo paid_at rồi payment_id (hợp đồng không quy định thứ
#       tự; chọn vậy để ổn định cho view_income_report).
#   - id: record_payment-EXP-002
#     content: >
#       Lưu trữ: bảng payment (một dòng mỗi khoản, không bao giờ DELETE, có
#       chỉ mục theo commission_id) và record_payment_schema_version (quy ước
#       CLAUDE.md, mục 5; bước nâng cấp trong _STORAGE_UPGRADES, chỉ thêm vào
#       cuối). commission_id là TEXT thường, không khóa ngoại sang bảng của
#       manage_commission. amount lưu thành amount_minor (INTEGER) và currency.
#       paid_at lưu chuỗi isoformat của datetime đã đọc (giữ độ lệch múi giờ
#       của người dùng; "Z" trở thành "+00:00"). Cột nội bộ không có trong
#       payment_record: recorded_at, voided_at. Hủy là một câu UPDATE ... WHERE
#       is_voided = 0 (mark_voided trả về rowcount == 1), nên hai lời hủy đồng
#       thời chỉ một lời thành công; Services vẫn đọc trước để phân biệt 404
#       với 409.
#   - id: record_payment-EXP-003
#     content: >
#       Kiểm tra định dạng ở Routers: thân POST /payments là {"commission_id",
#       "payment_input"}, strict, extra=forbid ở mọi cấp; payment_input đủ 6
#       khóa (note được null nhưng phải có mặt). commission_id sai định dạng ở
#       POST -> 400. amount_minor là int 1..2^53-1 (không nhận bool, số thực,
#       chuỗi). paid_at phải khớp YYYY-MM-DDTHH:MM[:SS[.f]] và kết thúc bằng Z
#       hoặc ±HH:MM với phút 00..59, là thời điểm có thật; thiếu độ lệch -> 400.
#       Phút của độ lệch phải chặn bằng regex: datetime.fromisoformat của
#       Python 3.13 đọc +07:60 thành +08:00 và +07:99 thành +08:39 mà không báo
#       lỗi (độ lệch từ 24 giờ trở lên thì nó tự từ chối). method là
#       chuỗi tự do nhưng không trống (từ Data Schema 9.0.0, xem
#       record_payment-EXP-007; trước đó nhận cả chuỗi rỗng). Ba điểm GET/PUT không khai báo 400: id thiếu
#       hoặc sai định dạng -> 404 (GET /payments không có commission_id cũng
#       404). Gọi sang manage_commission nằm trong Adapter CommissionDirectory
#       theo main-EXP-004: label 404 -> None, label 500 -> StorageIOError của
#       record_payment (reason có tiền tố "manage_commission: ").
#   - id: record_payment-EXP-004
#     content: >
#       Luật số nguyên tính ra (Data Schema 3.0.0, clause_a_common). Quyết định
#       ở Services, cận _MAX_COMPUTED_INTEGER = 2^53-1: received_net và
#       outstanding (công thức ở record_payment-EXP-005), tính trên các khoản
#       chưa hủy theo agreed_price hiện tại, mỗi số được xét riêng, phải có trị
#       tuyệt đối không quá cận; không cắt, không kẹp. record: 404 -> 422 -> rồi mới xét khoảng; vượt ->
#       BalanceOutOfRangeError (409 ERR_OUT_OF_RANGE, details {commission_id,
#       fields: tên các con số vượt}), không ghi gì. get_balance: vượt -> cùng
#       lỗi 409, không trả kết quả dở dang. void_payment không xét khoảng (một
#       khoản ghi nhầm luôn hủy được); list và ledger không mang con số tính ra
#       nên không xét. Đồng thời: Services hỏi manage_commission trước (không
#       lồng được vào giao dịch), rồi trong một PaymentRepository.write_scope()
#       (BEGIN IMMEDIATE + khóa của SharedConnection, xem main-EXP-006) đọc
#       các khoản của đơn, tính, raise hoặc insert. Hai lời ghi đồng thời được
#       xét lần lượt, lời sau thấy khoản của lời trước. Đã kiểm bằng biến thể
#       xét ngoài giao dịch (thêm trễ 0,2 s): 4 lời 2^53-1 đồng thời đều 201,
#       nên kiểm thử đòi [201, 409, 409, 409] bắt được lỗi này. Thông điệp
#       409 của record nói "nothing was written"; của get_balance thì không
#       (API Contract 3.0.1: thao tác đọc không có gì để ghi).
#   - id: record_payment-EXP-005
#     content: >
#       Luật tip (Data Schema 4.0.0). received_net = incoming - refund trên
#       mọi khoản chưa hủy, kể cả tip. outstanding = agreed - (incoming -
#       refund) trên các khoản chưa hủy có kind khác 'tip': tip, hoàn tip và
#       hủy một khoản tip không đổi số còn nợ. Hai số lấy trên hai tập khoản
#       khác nhau, nên record xét riêng từng số (_received_net,
#       _paid_toward_price). Trường hợp chỉ có từ 4.0.0: một tip hoặc một
#       khoản hoàn tip làm received_net vượt khoảng trong khi outstanding
#       không đổi -> 409 fields ["received_net"], không ghi gì. Một khoản hoàn
#       tip không bao giờ làm outstanding vượt. payment_ledger có thêm kind (6
#       khóa, ledger_entry_record). Cấu trúc bảng không đổi (kind đã có từ bước
#       nâng cấp 1).
#   - id: record_payment-EXP-006
#     content: >
#       Giới hạn đã biết, được chấp nhận: record đọc agreed_price qua
#       get_commission_summary trước khi mở giao dịch (không lồng được, xem
#       main-EXP-006). Nếu manage_commission sửa giá đơn đúng trong khoảng đó,
#       khoản vẫn được ghi theo giá cũ và số dư có thể vượt khoảng; khi đó
#       get_balance vẫn trả 409 (giống như sửa giá sau khi ghi). Hai lời record
#       đồng thời thì luôn đúng (record_payment-EXP-004).
#   - id: record_payment-EXP-007
#     content: >
#       Luật not blank (clause_a_common.formats.not_blank; Data Schema 9.0.0,
#       CT-4 / BE-7) cho payment_input.method là ràng buộc của kiểu, nên nằm ở
#       Routers: hàm _not_blank trong routers.py, gắn bằng AfterValidator sau
#       StringConstraints(min_length=1) trong _PaymentInputFormat. Khoảng trắng
#       theo str.isspace (value.strip() không đối số). Luật chỉ kiểm, không đổi
#       giá trị: method hợp lệ được lưu và trả lại nguyên văn (" MoMo " giữ hai
#       dấu cách), vì hợp đồng ghi "It is a check only"; không bỏ khoảng trắng
#       trước khi lưu. Hợp đồng không đặt độ dài tối đa cho method: không thêm.
#       note (string|null) không thuộc luật. Vi phạm -> 400 ERR_VALIDATION,
#       details.errors đúng một mục loc [payment_input, method] (msg "Value
#       error, must not be blank"; chuỗi rỗng: "String should have at least 1
#       character"). Thứ tự kiểm không đổi: định dạng trước, tra commission_id
#       sau, nên method trống kèm đơn không tồn tại vẫn 400, không 404. Hàm
#       _not_blank là bản riêng của workflow này, giống hệt bản của
#       manage_client, manage_commission, manage_watermark_profile (quyết định
#       của Project Owner 2026-09-28: không tạo Backend/shared/, không import
#       chéo); sửa định nghĩa thì sửa cả bốn. Ca kiểm thử cũ
#       test_method_is_free_text khẳng định record(method="") trả 201, trái
#       Data Schema 9.0.0: đã bỏ dòng đó, giữ dòng "Ví MoMo 🙂", và chuyển ""
#       sang các ca bị từ chối mới; đó là ca cũ duy nhất được sửa. Giới hạn đã
#       biết, không vá ở V1: (1) str.strip() của Python và String.prototype.trim
#       của JavaScript khác nhau ở vài ký tự hiếm (U+001C..U+001F, U+FEFF);
#       backend là bên quyết định. (2) Ký tự vô hình không phải khoảng trắng
#       (ví dụ U+200B) vẫn qua luật; hợp đồng không cấm. (3) Dữ liệu cũ không
#       bị chuyển đổi: khoản đã ghi trước phiên 23 với method trống vẫn còn
#       nguyên, vẫn được đọc, liệt kê, tính số dư, hủy bình thường; luật chỉ
#       áp khi ghi.
#
# UNSOLVED_PROBLEMS: []
#
# EVIDENCE:
#   - claim: >
#       Trên tiến trình Backend.py thật với tệp SQLite thật, cả bốn điểm giao
#       tiếp http cho đúng hình dạng và nhãn: ghi khoản cọc (201); lỗi 404,
#       422, 400 (amount_minor 0, 2^53, paid_at thiếu độ lệch); số dư đúng từng
#       bước kể cả outstanding âm khi trả dư; hủy (200), hủy lại (409), hủy
#       khoản không có (404), số dư sau hủy bỏ khoản đó; danh sách có khoản đã
#       hủy, mới nhất trước theo thời điểm thật với các độ lệch múi giờ khác
#       nhau; dữ liệu còn sau khi khởi động lại; lỗi lưu trữ thật cho 500 +
#       error_body.
#     how: >
#       cd Backend; env\Scripts\python.exe -m pytest -s -v
#       tests/test_backend_process.py -k payments (Python 3.13.12 của
#       Backend/env; tiến trình con thật khởi động bằng CT_*, cổng trống ngẫu
#       nhiên, DB trong thư mục tạm; ">>" là yêu cầu, "<<" là phản hồi thô).
#       Đơn VND agreed 1000000. Lỗi lưu trữ: một kết nối sqlite3 khác giữ
#       BEGIN EXCLUSIVE trên cùng tệp DB tới khi backend hết busy_timeout.
#     result: >
#       POST /payments cọc 500000 paid_at 2026-09-20T10:00:00+07:00 -> 201
#       {"payment_id":"aea2591c-3b53-46db-a42e-a9f8aff473ba","commission_id":
#       "7895ee8d-d6dd-49f0-8f62-0f3f30798d25","direction":"incoming","kind":
#       "deposit","amount":{"amount_minor":500000,"currency":"VND"},"method":
#       "bank_transfer","paid_at":"2026-09-20T10:00:00+07:00","note":"Cọc 50%",
#       "is_voided":false}. Đơn 0b7f5a3e-... -> 404 ERR_NOT_FOUND "Commission not
#       found."; USD -> 422 ERR_CURRENCY_MISMATCH details {"agreed_currency":
#       "VND","payment_currency":"USD"}; amount_minor 0 -> 400 "Input should be
#       greater than 0"; 9007199254740992 -> 400 "Input should be less than or
#       equal to 9007199254740991"; paid_at "2026-09-20T10:00:00" -> 400
#       "paid_at must be an ISO 8601 date and time with a UTC offset". Số dư
#       (agreed, received_net, outstanding): sau cọc (1000000, 500000, 500000);
#       +milestone 300000 paid_at 2026-09-22T08:30:00Z -> (1000000, 800000,
#       200000); +refund 100000 paid_at 2026-09-22T09:00:00-05:00 -> (1000000,
#       700000, 300000); +final 450000 -> (1000000, 1150000, -150000). PUT
#       /payments/145aa319-.../void -> 200 is_voided true, mọi khóa khác không
#       đổi; lần hai -> 409 ERR_CONFLICT "Payment is already voided."; id không
#       tồn tại -> 404 "Payment not found."; số dư -> (1000000, 700000,
#       300000). GET /payments?commission_id=... -> 200 thứ tự [final (hủy),
#       refund 09:00-05:00, milestone 08:30Z, cọc], is_voided [true, false,
#       false, false]; đơn không có -> 404. Khi khóa: POST /payments, GET
#       /payments, GET /payments/balance/{id} -> 500 {"code":"ERR_STORAGE_IO",
#       "message":"Storage failed.","details":{"reason":"manage_commission:
#       Storage failed. {'reason': 'database is locked'}"}}; PUT void -> 500
#       reason "database is locked"; nhả khóa -> số dư 200 như trước. Đóng
#       stdin -> exit code 0, stdout [b'READY\n']. Lần chạy 2 cùng tệp: GET
#       /payments -> 200 giống hệt danh sách lần 1; balance outstanding 300000.
#     recorded_at: 2026-09-24T20:22:00+07:00
#   - claim: >
#       Trên tiến trình Backend.py thật (Data Schema 4.0.0): đơn 1000000 VND
#       trả đủ rồi tip 100000 -> received_net 1100000, outstanding 0; hoàn
#       khoản tip -> received_net 1000000, outstanding vẫn 0; tip làm
#       received_net vượt khoảng -> 409, không ghi gì; list_payment_ledger có
#       đủ 6 khóa, gồm kind.
#     how: >
#       cd Backend; env\Scripts\python.exe -m pytest -s -v
#       tests/test_backend_process.py -k tip (Python 3.13.12 của Backend/env,
#       Windows 11; tiến trình con thật khởi động bằng CT_*, cổng trống ngẫu
#       nhiên, DB trong thư mục tạm; ">>" là yêu cầu, "<<" là phản hồi thô).
#       Sau khi tiến trình dừng: ráp nối lại đúng như Main
#       (Backend.wire_workflows) trên cùng tệp DB, gọi hàm Routers
#       list_payment_ledger(). Lỗi 500 của lối vào này: env\Scripts\python.exe
#       -m pytest -s -v tests/test_backend_process.py -k payments_balance
#       (ráp nối lại như Main trên tệp DB của lần chạy đó, rồi một kết nối
#       sqlite3 khác giữ BEGIN EXCLUSIVE và gọi lại).
#     result: >
#       Đơn 811767d5-...: final 1000000 -> 201; tip 100000 -> 201 kind "tip";
#       balance -> 200 {"agreed":{"amount_minor":1000000,...},"received_net":
#       {"amount_minor":1100000,"currency":"VND"},"outstanding":{"amount_minor":
#       0,"currency":"VND"}}; refund kind tip 100000 -> 201; balance ->
#       received_net 1000000, outstanding 0. Đơn USD 66265ca5-... agreed
#       2^53-1: final 9007199254740991 -> 201, balance outstanding 0; tip 1 ->
#       409 {"code":"ERR_OUT_OF_RANGE","message":"The commission's balance
#       would fall outside the integer range; nothing was written.","details":
#       {"commission_id":"66265ca5-...","fields":["received_net"]}}; GET
#       /payments -> 1 phần tử. Đóng stdin -> exit code 0, stdout
#       [b'READY\n']. list_payment_ledger() -> 4 phần tử, mỗi phần tử đúng 6
#       khóa, ví dụ {'payment_id': 'f67d8a47-...', 'commission_id':
#       '811767d5-...', 'direction': 'incoming', 'kind': 'tip', 'amount':
#       {'amount_minor': 100000, 'currency': 'VND'}, 'paid_at':
#       '2026-09-21T10:00:00+07:00'}; khoản hoàn tip có kind 'tip', direction
#       'refund'. 1 passed. Lần chạy -k payments_balance (22:05:55):
#       list_payment_ledger() -> 3 phần tử 6 khóa (deposit, milestone, refund
#       kind 'other'; khoản final đã hủy không có); khi khóa -> raised
#       label=500 error_body={'code': 'ERR_STORAGE_IO', 'message': 'Storage
#       failed.', 'details': {'reason': 'database is locked'}}. 1 passed.
#     recorded_at: 2026-09-24T22:05:55+07:00
#   - claim: >
#       Trên tiến trình Backend.py thật (API Contract 3.0.0): đơn giá 2^53-1,
#       khoản 2^53-1 thứ nhất 201, thứ hai 409 ERR_OUT_OF_RANGE và danh sách
#       vẫn một khoản; incoming 10 + refund 5 rồi hủy incoming: hủy 200,
#       get_balance 409; refund làm outstanding vượt khoảng -> 409, không ghi;
#       paid_at +07:60 -> 400; hai lời ghi 2^53-1 đồng thời -> một 201, một 409.
#     how: >
#       cd Backend; env\Scripts\python.exe -m pytest -s -v
#       tests/test_backend_process.py -k computed (Python 3.13.12 của
#       Backend/env, Windows 11; tiến trình con thật khởi động bằng CT_*, cổng
#       trống ngẫu nhiên, DB trong thư mục tạm; đơn USD; ">>" là yêu cầu, "<<"
#       là phản hồi thô; hai lời đồng thời xuất phát cùng lúc từ hai luồng, mỗi
#       luồng một httpx.Client).
#     result: >
#       Đơn 19547ee3-...: POST 9007199254740991 -> 201 caff187a-...; lần hai ->
#       409 {"code":"ERR_OUT_OF_RANGE","message":"The commission's balance
#       would fall outside the integer range; nothing was written.","details":
#       {"commission_id":"19547ee3-6243-499e-b403-46b437c07c3d","fields":
#       ["received_net"]}}; GET /payments -> 200, 1 phần tử. Đơn be815a3a-...:
#       incoming 10 -> 201, refund 5 -> 201, balance -> 200 received_net 5,
#       outstanding 9007199254740986; PUT void incoming -> 200 is_voided true;
#       balance -> 409 ERR_OUT_OF_RANGE fields ["outstanding"]. Đơn
#       fdb69cd8-...: refund 1 -> 409 fields ["outstanding"]; GET /payments ->
#       200 []. paid_at "2026-09-20T10:00:00+07:60" -> 400 loc [payment_input,
#       paid_at] "paid_at must be an ISO 8601 date and time with a UTC offset".
#       Đồng thời trên 9ee9d0c3-...: [201, 409], GET /payments -> 1 phần tử.
#       Đóng stdin -> exit code 0, stdout [b'READY\n']. 1 passed.
#     recorded_at: 2026-09-24T21:19:52+07:00
#   - claim: >
#       Kiểm thử cấp workflow (ráp nối bằng Backend.wire_workflows, lời gọi
#       sang manage_commission là thật) đạt: 38 dạng đầu vào sai -> 400 (kể cả
#       paid_at +07:60, +07:99, +24:00); "Z" và 2^53-1 được nhận; EUR cho đơn
#       VND -> 422; method tự do; số dư khi chưa có khoản, khi refund nhiều hơn
#       nhận, khi sửa giá đơn; luật số nguyên tính ra: khoản làm received_net
#       vượt -> 409, refund làm outstanding vượt -> 409 (không ghi), hủy luôn
#       200 rồi get_balance 409, sửa giá đơn làm outstanding vượt -> get_balance
#       409; 4 lời ghi 2^53-1 đồng thời với trễ 0,2 s giữa đọc và ghi -> [201,
#       409, 409, 409]; 8 lời hủy đồng thời chỉ 1 thành công; thứ tự theo thời
#       điểm thật; ledger bỏ khoản đã hủy; bảng không khóa ngoại; phiên bản
#       bảng mới hơn -> StorageVersionError; khóa DB -> 500 ở cả 5 điểm giao
#       tiếp; ghi khi query_only -> 500 và không ghi gì; lỗi lập trình không
#       thành 500. Thêm từ Data Schema 4.0.0: tip tính vào received_net, không
#       vào outstanding (trả đủ + tip -> outstanding 0; hoàn tip và hủy tip
#       không đổi outstanding; chỉ có tip -> outstanding = agreed); tip và
#       hoàn tip làm received_net vượt -> 409 fields ["received_net"], không
#       ghi; hoàn tip trên đơn agreed 2^53-1 chưa có khoản -> 201 (outstanding
#       không đổi); ledger có kind; 409 của get_balance không nói "written".
#     how: >
#       cd Backend; env\Scripts\python.exe -m pytest -q workflows/record_payment
#     result: >
#       69 passed.
#     recorded_at: 2026-09-24T21:55:00+07:00
#   - claim: >
#       Data Schema 9.0.0 (BE-7): POST /payments trả 400 ERR_VALIDATION khi
#       payment_input.method trống theo formats.not_blank, loc [payment_input,
#       method], không ghi gì, kể cả khi commission_id không tồn tại (vẫn 400,
#       không 404); method hợp lệ có khoảng trắng hai đầu được lưu và trả lại
#       nguyên văn; note không bị ảnh hưởng. Kiểm thử cũ không đổi, trừ đúng một
#       ca viết lại (record_payment-EXP-007).
#     how: >
#       cd Backend; env\Scripts\python.exe -m pytest -q workflows/record_payment
#       rồi env\Scripts\python.exe -m pytest -q (Python 3.13.12 của
#       Backend/env, Windows 11); cd Desktop; npm test (Node v24.14.1, npm
#       11.11.0); cd UI; npm run e2e (không đặt CT_WALKTHROUGH_RUNNER).
#       Bằng chứng cắn: tạm bỏ AfterValidator(_not_blank) khỏi method trong
#       _PaymentInputFormat, chạy lại workflows/record_payment, rồi khôi phục.
#       Phản hồi lỗi thật (TestClient trên DB tạm, ráp nối như Main): method ""
#       và "  ".
#     result: >
#       workflows/record_payment: 84 passed (69 cũ, đã tính ca viết lại, + 15
#       ca mới: 5 bị từ chối và không ghi gì, 5 method trống kèm đơn không tồn
#       tại vẫn 400, 3 method hợp lệ lưu nguyên văn, 2 note "   " và null).
#       Toàn bộ backend: 460 passed (445 + 15), 7 phút 30 giây. Desktop npm
#       test: 14 passed. UI npm run e2e: 54 passed; git status --short
#       UI/evidence trống. Bằng chứng cắn: bỏ AfterValidator -> 8 failed, 76
#       passed (4 ca "spaces", "tab_newline", "nbsp", "ideographic_space" ở
#       mỗi nhóm trong hai nhóm ca bị từ chối; ca "empty" không hỏng vì
#       min_length=1 vẫn chặn chuỗi rỗng); khôi phục -> 84 passed. Phản hồi:
#       method "" -> 400 {"errors":[{"loc":["payment_input","method"],"msg":
#       "String should have at least 1 character"}]}; method "  " -> 400
#       {"errors":[{"loc":["payment_input","method"],"msg":"Value error, must
#       not be blank"}]}. Dữ liệu cũ: một khoản có method "" ghi trực tiếp vào
#       bảng vẫn được GET /payments trả về với method "", get_balance 200, hủy
#       200. %APPDATA%\CommissionTracker\data.db trước và sau giống hệt: 114688
#       byte, ghi lúc 2026-09-28T21:09:42+07:00, SHA-256 B1996554...F390B.
#     recorded_at: 2026-09-30T23:40:00+07:00
#
# NOTES:
#   - id: record_payment-NOTE-001
#     written_at: 2026-09-30
#     content: >
#       Đề xuất theo Giai đoạn 6, Bước 6.6: record_payment chuyển
#       đang_triển_khai -> đã_hoàn_thiện ở Data Schema 9.0.0 (BE-7 đã áp dụng,
#       không còn UNSOLVED_PROBLEMS). Không tự sửa hợp đồng; Orchestrator xác
#       nhận theo 08 Phần 5 rồi đề xuất Data Schema 9.0.1.
# ===WCA-CHECKPOINT-END===
"""Services of record_payment: every business decision of the workflow."""

import uuid
from datetime import datetime

# StorageIOError is raised by the Adapters and passes through unchanged;
# it is re-exported so the Routers depend on Services only.
from .adapters import CommissionDirectory, PaymentRepository, StorageIOError  # noqa: F401
from .entities import CommissionBalance, CommissionSummary, LedgerEntry, Money, Payment, PaymentInput


class CommissionNotFoundError(Exception):
    def __init__(self, commission_id: str) -> None:
        super().__init__(f"commission {commission_id} does not exist")
        self.commission_id = commission_id


class PaymentNotFoundError(Exception):
    def __init__(self, payment_id: str) -> None:
        super().__init__(f"payment {payment_id} does not exist")
        self.payment_id = payment_id


class PaymentAlreadyVoidedError(Exception):
    def __init__(self, payment_id: str) -> None:
        super().__init__(f"payment {payment_id} is already voided")
        self.payment_id = payment_id


class CurrencyMismatchError(Exception):
    def __init__(self, agreed: str, paid: str) -> None:
        super().__init__(f"the commission is agreed in {agreed}; a payment in {paid} is not accepted")
        self.agreed = agreed
        self.paid = paid


class BalanceOutOfRangeError(Exception):
    """received_net or outstanding of a commission falls outside the integer
    range of clause_a_common (with the payment being recorded, or as stored)."""

    def __init__(self, commission_id: str, fields: list[str]) -> None:
        super().__init__(f"{', '.join(fields)} of commission {commission_id} would fall outside the integer range")
        self.commission_id = commission_id
        self.fields = fields


# clause_a_common.mandatory_rules (Data Schema 3.0.0): a computed integer in
# any output lies within -(2^53-1)..2^53-1; it is never rounded, clamped or
# wrapped.
_MAX_COMPUTED_INTEGER = 2**53 - 1


def _now() -> datetime:
    # Local wall-clock time with its UTC offset (clause_a_common.formats.timestamp).
    return datetime.now().astimezone().replace(microsecond=0)


def _signed(payment: Payment) -> int:
    # Money received counts up, money refunded counts down.
    return payment.amount.amount_minor if payment.direction == "incoming" else -payment.amount.amount_minor


def _counts_toward_price(payment: Payment) -> bool:
    # Data Schema 4.0.0: a tip is a gift on top of the agreed price, not a
    # payment of it; neither a tip nor the refund of a tip changes what is
    # still owed.
    return payment.kind != "tip"


def _received_net(payments: list[Payment]) -> int:
    # Every non-voided payment, tips included.
    return sum(_signed(p) for p in payments if not p.is_voided)


def _paid_toward_price(payments: list[Payment]) -> int:
    # Non-voided payments whose kind is not 'tip'.
    return sum(_signed(p) for p in payments if not p.is_voided and _counts_toward_price(p))


def _out_of_range(agreed_minor: int, received_net: int, paid_toward_price: int) -> list[str]:
    # Names of the computed amounts that cannot be represented. The two are
    # computed over different payments, so each is checked on its own.
    fields = []
    if abs(received_net) > _MAX_COMPUTED_INTEGER:
        fields.append("received_net")
    if abs(agreed_minor - paid_toward_price) > _MAX_COMPUTED_INTEGER:
        fields.append("outstanding")
    return fields


class RecordPaymentService:
    def __init__(self, repo: PaymentRepository, commissions: CommissionDirectory) -> None:
        self._repo = repo
        self._commissions = commissions

    def _require_commission(self, commission_id: str) -> CommissionSummary:
        summary = self._commissions.fetch_summary(commission_id)
        if summary is None:
            raise CommissionNotFoundError(commission_id)
        return summary

    def record(self, commission_id: str, payment_input: PaymentInput) -> Payment:
        # Any stage of the commission is accepted (a refund on a cancelled
        # commission is normal); existence, currency and the integer range
        # of the resulting balance are checked. The commission is read
        # before the write scope opens: a call to another workflow cannot
        # run inside it.
        commission = self._require_commission(commission_id)
        agreed_currency = commission.agreed_price.currency
        if payment_input.amount.currency != agreed_currency:
            raise CurrencyMismatchError(agreed_currency, payment_input.amount.currency)
        payment = Payment(
            payment_id=str(uuid.uuid4()),
            commission_id=commission_id,
            direction=payment_input.direction,
            kind=payment_input.kind,
            amount=payment_input.amount,
            method=payment_input.method,
            paid_at=payment_input.paid_at,
            note=payment_input.note,
            is_voided=False,
            recorded_at=_now(),
            voided_at=None,
        )
        # Range check and insert in one transaction: two concurrent calls
        # are judged one after the other, the second one seeing the first
        # one's entry. Raising inside the scope writes nothing.
        # A tip moves received_net only; any other kind moves both amounts.
        with self._repo.write_scope() as scope:
            with_payment = scope.fetch_for_commission(commission_id) + [payment]
            fields = _out_of_range(
                commission.agreed_price.amount_minor, _received_net(with_payment), _paid_toward_price(with_payment)
            )
            if fields:
                raise BalanceOutOfRangeError(commission_id, fields)
            scope.insert(payment)
        return payment

    def list_for_commission(self, commission_id: str) -> list[Payment]:
        # Every entry, voided ones included, newest first by the real
        # instant of paid_at (offsets may differ); ties: latest recorded
        # first, then payment_id, so the order is stable.
        self._require_commission(commission_id)
        payments = self._repo.fetch_for_commission(commission_id)
        payments.sort(key=lambda p: p.payment_id)
        payments.sort(key=lambda p: (p.paid_at.timestamp(), p.recorded_at.timestamp()), reverse=True)
        return payments

    def void(self, payment_id: str) -> Payment:
        # Entries are voided, never deleted or edited. Voiding twice is a
        # conflict.
        current = self._repo.fetch(payment_id)
        if current is None:
            raise PaymentNotFoundError(payment_id)
        if current.is_voided:
            raise PaymentAlreadyVoidedError(payment_id)
        if not self._repo.mark_voided(payment_id, _now()):
            # Voided by a concurrent call between the read and the write.
            raise PaymentAlreadyVoidedError(payment_id)
        voided = self._repo.fetch(payment_id)
        if voided is None:  # entries are never deleted
            raise PaymentNotFoundError(payment_id)
        return voided

    def balance(self, commission_id: str) -> CommissionBalance:
        # Always computed from the non-voided entries, never stored.
        # received_net counts tips, outstanding does not (Data Schema 4.0.0).
        # Both may be negative. They can still leave the integer range
        # through a void or an edited agreed price (neither is refused for
        # it): then no balance is returned at all.
        commission = self._require_commission(commission_id)
        agreed = commission.agreed_price
        payments = self._repo.fetch_for_commission(commission_id)
        received_net = _received_net(payments)
        paid_toward_price = _paid_toward_price(payments)
        fields = _out_of_range(agreed.amount_minor, received_net, paid_toward_price)
        if fields:
            raise BalanceOutOfRangeError(commission_id, fields)
        return CommissionBalance(
            commission_id=commission_id,
            agreed=agreed,
            received_net=Money(amount_minor=received_net, currency=agreed.currency),
            outstanding=Money(amount_minor=agreed.amount_minor - paid_toward_price, currency=agreed.currency),
        )

    def ledger(self) -> list[LedgerEntry]:
        # Every non-voided entry of every commission, oldest first by the
        # real instant of paid_at, then payment_id.
        entries = [p for p in self._repo.fetch_all() if not p.is_voided]
        entries.sort(key=lambda p: (p.paid_at.timestamp(), p.payment_id))
        return [
            LedgerEntry(
                payment_id=p.payment_id,
                commission_id=p.commission_id,
                direction=p.direction,
                kind=p.kind,
                amount=p.amount,
                paid_at=p.paid_at,
            )
            for p in entries
        ]
