# ===WCA-CHECKPOINT-START===
# workflow: manage_commission
# clause: clause_b_backend
# component: services
# last_updated_by: coding-agent@2026-09-25#1
# last_updated_at: 2026-09-25T08:40:00+07:00
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
#   - id: manage_commission-EXP-005
#     content: >
#       Kiểm tra định dạng ở Routers: thân {"commission_input": {...}} có đủ 7
#       khóa, strict, extra=forbid ở mọi cấp (kể cả agreed_price). client_id
#       phải là UUID v4 chữ thường (400 ở create/edit). currency phải nằm trong
#       supported_currencies: danh sách lấy từ service.currency_options() và
#       truyền vào Pydantic qua context lúc kiểm tra, sai -> 400 (ràng buộc
#       nằm trong type). deadline phải khớp YYYY-MM-DD và là ngày có thật.
#       amount_minor là int (không nhận bool, số thực, chuỗi), 0..2^53-1
#       (_MAX_BOUNDARY_INTEGER, theo luật số nguyên của clause_a_common, Data
#       Schema 2.0.0); 2^53 -> 400. commission_id sai định dạng: GET và
#       get_commission_summary (không khai báo 400) -> 404; PUT -> 400.
#       list_currencies chỉ trả Configs, không có nhãn 500.
#     derived_from: manage_commission-EXP-004
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
#       93 passed (manage_client và manage_commission cùng chạy).
#     recorded_at: 2026-09-24T20:10:00+07:00
#
# NOTES: []
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
