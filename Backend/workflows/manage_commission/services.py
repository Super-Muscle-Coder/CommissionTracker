# ===WCA-CHECKPOINT-START===
# workflow: manage_commission
# clause: clause_b_backend
# component: services
# last_updated_by: coding-agent@2026-09-28#3
# last_updated_at: 2026-09-28T21:45:00+07:00
#
# EXPERIENCES:
#   - id: manage_commission-EXP-001
#     content: >
#       Quyết định nghiệp vụ ở Services. Tạo đơn: hỏi manage_client trước;
#       khách không có -> ClientNotFoundError (404), khách đã lưu trữ ->
#       ClientArchivedError (409). Sửa đơn, kiểm tra theo thứ tự: đơn có tồn
#       tại (404) -> currency giữ nguyên như lúc tạo (CurrencyChangeError, 409)
#       -> chỉ khi client_id đổi mới hỏi manage_client (404 / 409). Giữ nguyên
#       khách cũ thì vẫn sửa được dù khách đó đã bị lưu trữ sau khi tạo đơn.
#       Sửa thay toàn bộ các điều khoản đã thỏa thuận, giữ created_at, luôn đặt
#       lại updated_at. commission_list xếp theo updated_at giảm dần rồi
#       commission_id; commission_index gồm mọi đơn (kể cả của khách đã lưu
#       trữ), xếp theo commission_id. Thời điểm là giờ địa phương kèm độ lệch,
#       chính xác tới giây, như manage_client.
#   - id: manage_commission-EXP-002
#     content: >
#       Lưu trữ: bảng commission và manage_commission_schema_version (quy ước
#       CLAUDE.md, mục 5; bước nâng cấp trong _STORAGE_UPGRADES của
#       adapters.py, chỉ thêm vào cuối). client_id là TEXT thường, không có
#       khóa ngoại sang bảng của manage_client. agreed_price lưu thành hai cột
#       price_amount_minor (INTEGER) và price_currency; deadline là chuỗi ISO
#       YYYY-MM-DD hoặc NULL; reference_links là JSON (ensure_ascii=False) để
#       giữ thứ tự, không cần bảng phụ.
#   - id: manage_commission-EXP-003
#     content: >
#       Gọi sang manage_client nằm trong Adapter ClientDirectory, nhận hàm
#       get_client_summary do Main trao (in_process["get_client_summary"]),
#       theo quy ước main-EXP-004: label 404 -> None (Services quyết định 404),
#       label 500 -> StorageIOError của manage_commission (reason có tiền tố
#       "manage_client: "), lỗi khác nổi lên nguyên vẹn. Kết quả được chuyển
#       thành ClientSummary trong entities.py của chính workflow này.
#   - id: manage_commission-EXP-006
#     content: >
#       Kiểm tra định dạng ở Routers (Data Schema 8.0.0, commission_input): thân
#       {"commission_input": {...}} có đủ 7 khóa, strict, extra=forbid ở mọi
#       cấp (kể cả agreed_price). title 1..200 ký tự và not blank (xem
#       manage_commission-EXP-007); description, commission_type là
#       string|null, không có luật not blank. client_id
#       phải là UUID v4 chữ thường (400 ở create/edit). currency phải nằm trong
#       supported_currencies: danh sách lấy từ service.currency_options() và
#       truyền vào Pydantic qua context lúc kiểm tra, sai -> 400 (ràng buộc
#       nằm trong type). deadline phải khớp YYYY-MM-DD và là ngày có thật.
#       amount_minor là int (không nhận bool, số thực, chuỗi), 0..2^53-1
#       (_MAX_BOUNDARY_INTEGER, theo luật số nguyên của clause_a_common, Data
#       Schema 2.0.0); 2^53 -> 400. commission_id sai định dạng: GET và
#       get_commission_summary (không khai báo 400) -> 404; PUT -> 400.
#       list_currencies chỉ trả Configs, không có nhãn 500. PUT kiểm
#       commission_id trước thân yêu cầu.
#     derived_from: manage_commission-EXP-005
#   - id: manage_commission-EXP-007
#     content: >
#       Luật not blank (clause_a_common.formats.not_blank; Data Schema 8.0.0,
#       CT-3 / BE-6) cho commission_input.title là ràng buộc của kiểu, nên nằm
#       ở Routers: hàm _not_blank trong routers.py, gắn bằng AfterValidator sau
#       StringConstraints(1..200). Khoảng trắng là theo str.isspace (dùng
#       value.strip() không đối số). Luật chỉ kiểm, không đổi giá trị: tiêu đề
#       hợp lệ được lưu và trả lại nguyên văn (" Chân dung " vẫn giữ hai dấu
#       cách), vì hợp đồng ghi "It is a check only". Độ dài đếm trên giá trị
#       gốc: 200 ký tự cộng một dấu cách mỗi đầu bị 400 (Project Owner xác
#       nhận cách đọc này 2026-09-28; giao diện bỏ khoảng trắng trước khi gửi).
#       Vi phạm -> 400 ERR_VALIDATION "Invalid commission_input.",
#       details.errors đúng một mục loc [commission_input, title], msg "Value
#       error, must not be blank" (chuỗi rỗng: "at least 1 character", cùng
#       loc). Dữ liệu cũ không bị chuyển đổi. Hàm _not_blank là bản riêng của
#       workflow này, giống hệt bản của manage_client và
#       manage_watermark_profile (quyết định của Project Owner 2026-09-28:
#       không tạo Backend/shared/, không import chéo); sửa định nghĩa thì sửa
#       cả ba. Giới hạn đã biết, không vá ở V1: (1) chỉ Python coi
#       U+001C..U+001F và U+0085 là khoảng trắng, chỉ JavaScript (trim) coi
#       U+FEFF là khoảng trắng (đo trên Python 3.13.12 và Node 24.14.1); backend
#       là bên quyết định, giao diện hiện thông báo 400 chung. (2) Ký tự vô
#       hình không phải khoảng trắng (ví dụ U+200B) vẫn qua luật; hợp đồng
#       không cấm.
#
# UNSOLVED_PROBLEMS: []
#
# EVIDENCE:
#   - claim: >
#       Trên tiến trình Backend.py thật với tệp SQLite thật: tạo khách rồi tạo
#       đơn (201); khách không tồn tại (404), khách đã lưu trữ (409); currency
#       không hỗ trợ (400); amount_minor = 2^53-1 được nhận (201), 2^53 bị từ
#       chối (400); sửa số tiền (200) rồi đổi đơn vị tiền (409);
#       get_commission, list_commissions, list_currencies đúng hình dạng; dữ
#       liệu còn sau khi khởi động lại; lỗi lưu trữ thật cho 500 + error_body.
#     how: >
#       cd Backend; env\Scripts\python.exe -m pytest -s -v
#       tests/test_backend_process.py -k commissions (Python 3.13.12 của
#       Backend/env; tiến trình con thật khởi động bằng CT_*; ">>" là yêu cầu,
#       "<<" là phản hồi thô). Lỗi lưu trữ: một kết nối sqlite3 khác giữ BEGIN
#       EXCLUSIVE trên cùng tệp DB cho tới khi backend hết busy_timeout 5000 ms.
#     result: >
#       POST /commissions (VND 1500000) -> 201 commission_id
#       "ebd1c5e0-f194-4cc1-bd92-665317063ce8", đúng 10 khóa. Khách 0b7f5a3e-...
#       -> 404 ERR_NOT_FOUND "Client not found."; khách đã lưu trữ -> 409
#       ERR_CONFLICT "Client is archived."; currency EUR -> 400 ERR_VALIDATION
#       loc [commission_input, agreed_price, currency]. POST amount_minor
#       9007199254740991 USD -> 201 {"commission_id":"9051c48e-0478-469f-9b40-24c84a7fb2fa",
#       ..., "agreed_price":{"amount_minor":9007199254740991,"currency":"USD"}, ...};
#       POST amount_minor 9007199254740992 -> 400 ERR_VALIDATION loc
#       [commission_input, agreed_price, amount_minor] "Input should be less
#       than or equal to 9007199254740991". PUT amount_minor 1800000 -> 200,
#       created_at giữ nguyên; PUT currency USD -> 409 ERR_CONFLICT. GET
#       /commissions/{id} -> 200 đúng 10 khóa; GET /commissions -> 200 [2 phần
#       tử, đúng 6 khóa]; GET /currencies -> 200 ["VND","USD"]; GET id không
#       tồn tại và "not-an-id" -> 404. Khi khóa: GET/POST /clients, GET
#       /commissions, GET/PUT /commissions/{id} -> 500 {"code":"ERR_STORAGE_IO",
#       "message":"Storage failed.","details":{"reason":"database is locked"}};
#       POST /commissions -> 500, reason "manage_client: Storage failed.
#       {'reason': 'database is locked'}"; GET /currencies vẫn 200. Nhả khóa:
#       GET -> 200. Đóng stdin -> exit code 0, stdout [b'READY\n']. Lần chạy 2
#       cùng tệp: GET /commissions/{id} -> 200 giống hệt; GET /commissions -> 2
#       phần tử (vẫn còn 9007199254740991). 1 passed.
#     recorded_at: 2026-09-24T20:22:00+07:00
#   - claim: >
#       get_commission_summary và list_commission_index (in_process) trả đúng
#       commission_summary / commission_index, báo 404 và 500 qua lỗi mang
#       label và error_body.
#     how: >
#       Cùng lần chạy, sau khi tiến trình đã dừng: ráp nối lại đúng như Main
#       (Backend.wire_workflows) trên cùng tệp DB, gọi hàm Routers; sau đó giữ
#       BEGIN EXCLUSIVE từ một kết nối khác và gọi lại.
#     result: >
#       get_commission_summary(commission_id='ebd1c5e0-...') -> {'commission_id':
#       'ebd1c5e0-f194-4cc1-bd92-665317063ce8', 'title': 'Chân dung bán thân',
#       'agreed_price': {'amount_minor': 1800000, 'currency': 'VND'}, 'deadline':
#       '2026-10-15'}; list_commission_index() -> 2 phần tử, có phần tử trên;
#       id không tồn tại -> raised label=404 error_body={'code': 'ERR_NOT_FOUND',
#       'message': 'Commission not found.', ...}. Khi khóa: get_client_summary,
#       get_commission_summary, list_commission_index -> raised label=500
#       error_body={'code': 'ERR_STORAGE_IO', 'message': 'Storage failed.',
#       'details': {'reason': 'database is locked'}}.
#     recorded_at: 2026-09-24T20:22:00+07:00
#   - claim: >
#       Kiểm thử cấp workflow (ráp nối bằng Backend.wire_workflows, lời gọi
#       sang manage_client là thật) đạt: 34 dạng đầu vào sai -> 400 (kể cả
#       amount_minor 2^53 và 2^63); 2^53-1 được nhận, sửa lên 2^53 -> 400; sửa
#       sang khách không có / đã lưu trữ -> 404 / 409; khách lưu trữ sau vẫn
#       sửa được; commission_index có đơn của khách đã lưu trữ; bảng không có
#       khóa ngoại; phiên bản bảng mới hơn -> StorageVersionError; ghi khi
#       query_only -> 500 và không ghi gì; lỗi lập trình không thành 500.
#     how: >
#       cd Backend; env\Scripts\python.exe -m pytest -q workflows/manage_client workflows/manage_commission
#     result: >
#       143 passed (manage_client 70 và manage_commission 73 cùng chạy; gồm cả
#       các ca not blank của phiên 18).
#     recorded_at: 2026-09-28T22:05:00+07:00
#   - claim: >
#       create_commission và edit_commission trả 400 ERR_VALIDATION, details
#       loc [commission_input, title], và không ghi gì, khi title là "", "   ",
#       "\t\n", U+00A0 hoặc U+3000; tiêu đề có khoảng trắng hai đầu được lưu và
#       trả lại nguyên văn (cả GET và GET /commissions); description "   " và
#       commission_type "\t" được nhận nguyên văn; tiêu đề có dấu dài đúng 200
#       ký tự được nhận; 200 ký tự cộng khoảng trắng hai đầu bị 400. Kiểm thử
#       cắn.
#     how: >
#       cd Backend; env\Scripts\python.exe -m pytest -q workflows/manage_commission
#       (Python 3.13.12, Windows 11; ráp nối bằng Backend.wire_workflows, HTTP
#       qua TestClient, SQLite thật). "Không ghi gì": sau POST bị từ chối GET
#       /commissions không đổi; sau PUT bị từ chối GET /commissions/{id} bằng
#       đúng bản trước. Bằng chứng cắn: tạm đổi "if not value.strip():" trong
#       routers.py thành "if False and not value.strip():", chạy pytest -q
#       workflows/manage_commission -k "blank or padding or padded", rồi khôi
#       phục và chạy lại.
#     result: >
#       73 passed (59 ca cũ + 14 ca mới: 5 tạo, 5 sửa, 4 hợp lệ và biên). Khi
#       tắt phép kiểm: 8 failed, 5 passed; 8 ca hỏng đúng là 4 dạng chỉ khoảng
#       trắng x tạo/sửa; 2 ca "" vẫn đạt vì min_length. Khôi phục: 13 passed.
#     recorded_at: 2026-09-28T21:30:00+07:00
#   - claim: >
#       Trên tiến trình Backend.py thật, title trống bị từ chối ở POST và PUT,
#       tiêu đề hợp lệ có khoảng trắng hai đầu được lưu nguyên văn.
#     how: >
#       Script tạm của phiên (không nằm trong dự án) khởi động
#       Backend\env\Scripts\python.exe Backend.py với CT_PORT trống, CT_DB_FILE_PATH
#       trong %TEMP%\ct_s18_*, chờ READY, gọi bằng urllib, đóng stdin.
#     result: >
#       POST title " \t " -> 400 {"code":"ERR_VALIDATION","message":"Invalid
#       commission_input.","details":{"errors":[{"loc":["commission_input",
#       "title"],"msg":"Value error, must not be blank"}]}}; POST title
#       " Chân dung ", description "  " -> 201 nguyên văn; PUT title "　" ->
#       400 cùng loc; GET /commissions/{id} -> 200 vẫn " Chân dung ",
#       description "  ". Đóng stdin -> exit code 0.
#     recorded_at: 2026-09-28T21:33:15+07:00
#   - claim: >
#       Luật not blank của phiên 18 không làm hỏng workflow nào khác của
#       backend, cũng không làm hỏng desktop hay giao diện; không kiểm thử nào
#       đụng %APPDATA%\CommissionTracker thật.
#     how: >
#       Windows 11, Python 3.13.12 (Backend/env), Node 24.14.1. (1) cd Backend;
#       env\Scripts\python.exe -m pytest -q. (2) cd Desktop; npm test (backend
#       thật). (3) cd UI; npm run e2e. (4) Băm SHA-256, kích thước, thời điểm
#       sửa của mọi tệp trong %APPDATA%\CommissionTracker trước việc 1 và sau
#       (1)-(3).
#     result: >
#       (1) 445 passed (381 cũ + 64 mới), không sửa kiểm thử của workflow khác.
#       (2) 14 passed. (3) 17 passed. (4) giống hệt: data.db 114688 byte,
#       data.db.lock 0 byte, cùng băm và thời điểm.
#     recorded_at: 2026-09-28T22:05:00+07:00
#
# NOTES:
#   - content: >
#       Đề xuất (Giai đoạn 6, Bước 6.6): chuyển status của manage_commission
#       đang_triển_khai -> đã_hoàn_thiện. BE-6 đã áp dụng commission_input của
#       Data Schema 8.0.0 (title not blank); bằng chứng ở EVIDENCE; không có
#       UNSOLVED_PROBLEMS. Coding agent không tự sửa hợp đồng.
#     written_at: 2026-09-28
# ===WCA-CHECKPOINT-END===
"""Services of manage_commission: every business decision of the workflow."""

import uuid
from dataclasses import replace
from datetime import datetime

# StorageIOError is raised by the Adapters and passes through unchanged;
# it is re-exported so the Routers depend on Services only.
from .adapters import ClientDirectory, CommissionRepository, StorageIOError  # noqa: F401
from .entities import Commission, CommissionInput, CommissionListItem, CommissionSummary


class CommissionNotFoundError(Exception):
    def __init__(self, commission_id: str) -> None:
        super().__init__(f"commission {commission_id} does not exist")
        self.commission_id = commission_id


class ClientNotFoundError(Exception):
    def __init__(self, client_id: str) -> None:
        super().__init__(f"client {client_id} does not exist")
        self.client_id = client_id


class ClientArchivedError(Exception):
    def __init__(self, client_id: str) -> None:
        super().__init__(f"client {client_id} is archived")
        self.client_id = client_id


class CurrencyChangeError(Exception):
    def __init__(self, agreed: str, requested: str) -> None:
        super().__init__(f"agreed currency is {agreed}; it cannot become {requested}")
        self.agreed = agreed
        self.requested = requested


def _now() -> datetime:
    # Local wall-clock time with its UTC offset (clause_a_common.formats.timestamp).
    return datetime.now().astimezone().replace(microsecond=0)


class ManageCommissionService:
    def __init__(
        self,
        repo: CommissionRepository,
        clients: ClientDirectory,
        supported_currencies: list[str],
    ) -> None:
        self._repo = repo
        self._clients = clients
        self._supported_currencies = list(supported_currencies)

    def currency_options(self) -> list[str]:
        return list(self._supported_currencies)

    def _require_active_client(self, client_id: str) -> None:
        # A commission may only belong to a known, non-archived client.
        client = self._clients.fetch_summary(client_id)
        if client is None:
            raise ClientNotFoundError(client_id)
        if client.is_archived:
            raise ClientArchivedError(client_id)

    def create(self, commission_input: CommissionInput) -> Commission:
        self._require_active_client(commission_input.client_id)
        now = _now()
        commission = Commission(
            commission_id=str(uuid.uuid4()),
            client_id=commission_input.client_id,
            title=commission_input.title,
            description=commission_input.description,
            commission_type=commission_input.commission_type,
            agreed_price=commission_input.agreed_price,
            deadline=commission_input.deadline,
            reference_links=list(commission_input.reference_links),
            created_at=now,
            updated_at=now,
        )
        self._repo.insert(commission)
        return commission

    def get(self, commission_id: str) -> Commission:
        commission = self._repo.fetch(commission_id)
        if commission is None:
            raise CommissionNotFoundError(commission_id)
        return commission

    def list_all(self) -> list[CommissionListItem]:
        # Most recently changed first, so the UI shows current work on top.
        items = self._repo.fetch_all_list_items()
        return sorted(items, key=lambda i: (-i.updated_at.timestamp(), i.commission_id))

    def edit(self, commission_id: str, commission_input: CommissionInput) -> Commission:
        # Editing replaces every agreed term; creation time is kept.
        # Checks, in order: the commission exists; the currency is the one
        # fixed at creation (only the amount may change); a new client_id
        # must name a known, non-archived client. Keeping the same client is
        # allowed even if that client was archived after creation.
        current = self.get(commission_id)
        requested = commission_input.agreed_price.currency
        if requested != current.agreed_price.currency:
            raise CurrencyChangeError(current.agreed_price.currency, requested)
        if commission_input.client_id != current.client_id:
            self._require_active_client(commission_input.client_id)
        edited = replace(
            current,
            client_id=commission_input.client_id,
            title=commission_input.title,
            description=commission_input.description,
            commission_type=commission_input.commission_type,
            agreed_price=commission_input.agreed_price,
            deadline=commission_input.deadline,
            reference_links=list(commission_input.reference_links),
            updated_at=_now(),
        )
        self._repo.replace(edited)
        return edited

    def get_summary(self, commission_id: str) -> CommissionSummary:
        summary = self._repo.fetch_summary(commission_id)
        if summary is None:
            raise CommissionNotFoundError(commission_id)
        return summary

    def list_index(self) -> list[CommissionSummary]:
        # Every commission, including those of archived clients.
        return sorted(self._repo.fetch_all_summaries(), key=lambda s: s.commission_id)
