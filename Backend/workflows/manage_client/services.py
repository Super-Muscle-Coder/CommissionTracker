# ===WCA-CHECKPOINT-START===
# workflow: manage_client
# clause: clause_b_backend
# component: services
# last_updated_by: coding-agent@2026-09-28#3
# last_updated_at: 2026-09-28T21:45:00+07:00
#
# EXPERIENCES:
#   - id: manage_client-EXP-003
#     content: >
#       Quyết định nghiệp vụ nằm ở Services: đặt cờ lưu trữ bằng đúng giá trị
#       hiện có thì không lỗi và không đổi gì (giữ nguyên updated_at); sửa khách
#       hàng thay toàn bộ display_name, contacts, note nhưng giữ is_archived và
#       created_at; khách đã lưu trữ vẫn sửa được (hợp đồng không khai báo 409);
#       client_list xếp theo display_name (casefold) rồi theo client_id; thời
#       điểm lưu là giờ địa phương kèm độ lệch múi giờ, chính xác tới giây.
#   - id: manage_client-EXP-005
#     content: >
#       Nhãn 500 + ERR_STORAGE_IO (API Contract 2.0.0) có ở cả sáu điểm giao
#       tiếp, theo quy ước chung main-EXP-005: _storage_io() trong adapters.py
#       bọc insert, replace, fetch, fetch_summary, fetch_all_list_items (không
#       bọc ensure_storage); Routers bắt StorageIOError; get_client_summary
#       raise label=500. details.reason là thông điệp gốc của SQLite (ví dụ
#       "database is locked", "attempt to write a readonly database").
#     derived_from: manage_client-EXP-001
#   - id: manage_client-EXP-006
#     content: >
#       Phiên bản cấu trúc bảng giữ trong bảng riêng
#       manage_client_schema_version (đúng quy ước CLAUDE.md, mục 5; không dùng
#       PRAGMA user_version). Các bước nâng cấp nằm trong _STORAGE_UPGRADES
#       (adapters.py): chỉ thêm bước mới vào cuối, không sửa bước đã áp dụng.
#       DB có phiên bản mới hơn bản build hiểu được thì ensure_storage raise
#       StorageVersionError và Main thoát, không in READY. Bảng sở hữu: client,
#       client_contact (khóa ngoại chỉ trỏ vào client),
#       manage_client_schema_version. Bản build trước phiên backend #3 đặt tên
#       bảng phiên bản là client_schema_version: _rename_legacy_version_table()
#       chạy đầu ensure_storage, trong cùng giao dịch, chép giá trị phiên bản
#       sang bảng tên mới rồi DROP bảng cũ. Đây không phải một bước nâng cấp
#       cấu trúc (không đổi số phiên bản, bước 1 giữ nguyên). Nếu phần sau
#       của ensure_storage lỗi, cả việc đổi tên được ROLLBACK.
#     derived_from: manage_client-EXP-002
#   - id: manage_client-EXP-007
#     content: >
#       Kiểm tra định dạng ở Routers (Data Schema 8.0.0, client_input): cả ba
#       khóa của client_input đều bắt buộc (note được là null, nhưng khóa phải
#       có mặt, đúng 02-contract.md v2.1: không có trường tùy chọn), không nhận
#       khóa thừa ở bất kỳ cấp nào, kiểu chặt (không ép "true" thành true).
#       display_name 1..120 ký tự và not blank; contacts[].channel,
#       contacts[].value 1.. ký tự và not blank (xem manage_client-EXP-008);
#       note không có ràng buộc nào ngoài string|null. client_id sai định dạng:
#       ở PUT (có khai báo 400) trả 400 + ERR_VALIDATION, kiểm trước thân yêu
#       cầu; ở get_client và get_client_summary (không khai báo 400) trả 404 +
#       ERR_NOT_FOUND.
#     derived_from: manage_client-EXP-004
#   - id: manage_client-EXP-008
#     content: >
#       Luật not blank (clause_a_common.formats.not_blank, Data Schema 7.0.0,
#       CT-2 / BE-5) là ràng buộc của kiểu, nên nằm ở Routers: hàm _not_blank
#       trong routers.py, gắn bằng AfterValidator sau StringConstraints của
#       display_name, channel, value. Khoảng trắng là theo str.isspace (dùng
#       value.strip() không đối số). Luật chỉ kiểm, không đổi giá trị: giá trị
#       hợp lệ được lưu và trả lại nguyên văn ("  An  " vẫn là "  An  "), vì
#       hợp đồng ghi "It is a check only"; bỏ khoảng trắng là việc của giao
#       diện nếu nó muốn. Độ dài đếm trên giá trị gốc, nên 120 ký tự cộng một
#       dấu cách mỗi đầu (122) bị 400; hợp đồng giữ cách đọc này (Project Owner
#       xác nhận 2026-09-28), giao diện bỏ khoảng trắng trước khi gửi nên họa
#       sĩ không gặp. Vi phạm -> 400 ERR_VALIDATION "Invalid client_input.",
#       details.errors đúng một mục, loc chỉ đúng trường (ví dụ [client_input,
#       contacts, "0", channel]), msg "Value error, must not be blank"; riêng
#       chuỗi rỗng bị min_length bắt trước ("at least 1 character"), cùng loc.
#       Dữ liệu cũ không bị chuyển đổi: luật chỉ áp khi ghi. Mỗi workflow tự có
#       một hàm _not_blank riêng, giống hệt nhau ở manage_client,
#       manage_commission, manage_watermark_profile (quyết định của Project
#       Owner 2026-09-28: không tạo Backend/shared/, không import chéo, theo
#       tiền lệ mỗi workflow tự giữ _ID_PATTERN); sửa định nghĩa thì sửa cả
#       ba. Giới hạn đã biết, không vá ở V1: (1) str.strip của Python và
#       String.prototype.trim của JavaScript khác nhau ở vài ký tự hiếm, đo
#       trên Python 3.13.12 và Node 24.14.1: chỉ Python coi U+001C..U+001F và
#       U+0085 là khoảng trắng, chỉ JS coi U+FEFF là khoảng trắng. Backend là
#       bên quyết định; giao diện hiện thông báo 400 chung khi bị từ chối. (2)
#       Ký tự vô hình không phải khoảng trắng (ví dụ U+200B) vẫn qua luật này;
#       hợp đồng không cấm.
#
# UNSOLVED_PROBLEMS: []
#
# EVIDENCE:
#   - claim: >
#       Một vòng tạo -> xem -> sửa -> lưu trữ -> bỏ lưu trữ -> liệt kê qua HTTP
#       thật trên tiến trình Backend.py, cho ra đúng hình dạng client_detail
#       và client_list; dữ liệu còn sau khi khởi động lại; các nhãn 400 và
#       404 trả đúng error_body; không có /docs, /redoc, /openapi.json, /health.
#     how: >
#       cd Backend; env\Scripts\python.exe -m pytest -s -v
#       tests/test_backend_process.py -k lifecycle (Python 3.13.12 của
#       Backend/env; tiến trình thật, SQLite thật trong thư mục tạm). Kết quả
#       thô từng lời gọi được in ra (">>" là yêu cầu, "<<" là phản hồi).
#     result: >
#       POST /clients -> 201 {"client_id":"43bd5fd3-3ad8-43fb-b9e6-02731e6d5f1e",
#       "display_name":"Nguyễn Thu Hà","contacts":[{"channel":"facebook",
#       "value":"fb.com/thuha.art"}],"note":"Khách quen, thích tông pastel",
#       "is_archived":false,"created_at":"2026-09-24T18:54:34+07:00",
#       "updated_at":"2026-09-24T18:54:34+07:00"}; GET -> 200 trùng khớp; PUT ->
#       200 display_name "Thu Hà", 2 contacts, created_at giữ nguyên; PUT
#       archived true -> 200 is_archived true; false -> 200; GET /clients -> 200
#       2 phần tử, mỗi phần tử đúng 4 khóa. 400: display_name "" -> ERR_VALIDATION
#       "Invalid client_input."; thân "{not json" -> "Malformed request.";
#       archived "yes"; PUT /clients/not-an-id. 404: id không tồn tại (GET, PUT,
#       PUT archived), GET /clients/not-an-id; /docs, /redoc, /openapi.json,
#       /health -> 404 ERR_NOT_FOUND. Lần chạy 2 cùng tệp DB: GET /clients/{id}
#       -> 200 giống hệt phản hồi cuối lần 1, 82 khách.
#     recorded_at: 2026-09-24T18:54:43+07:00
#   - claim: >
#       get_client_summary (in_process) trả đúng client_summary và báo 404 qua
#       lỗi mang label và error_body.
#     how: >
#       Cùng lần chạy, sau khi tiến trình đã dừng: ráp nối lại đúng như Main
#       (Backend.wire_workflows) trên cùng tệp DB, rồi gọi hàm Routers
#       get_client_summary(client_id=...).
#     result: >
#       get_client_summary(client_id='43bd5fd3-3ad8-43fb-b9e6-02731e6d5f1e') ->
#       {'client_id': '43bd5fd3-3ad8-43fb-b9e6-02731e6d5f1e', 'is_archived': False};
#       id không tồn tại -> raised label=404 error_body={'code': 'ERR_NOT_FOUND',
#       'message': 'Client not found.', 'details': {'client_id': '0b7f5a3e-...'}}.
#     recorded_at: 2026-09-24T18:54:43+07:00
#   - claim: >
#       Lỗi lưu trữ thật cho ra 500 + error_body ERR_STORAGE_IO, ở cả http lẫn
#       in_process; hết lỗi thì hoạt động lại bình thường.
#     how: >
#       (1) cd Backend; env\Scripts\python.exe -m pytest -s -v
#       tests/test_backend_process.py -k commissions: trong lúc tiến trình
#       Backend.py thật đang chạy, một kết nối sqlite3 khác giữ BEGIN EXCLUSIVE
#       trên cùng tệp DB; backend hết busy_timeout (5000 ms). Sau đó ráp nối lại
#       như Main trên cùng tệp và gọi get_client_summary khi vẫn giữ khóa đó.
#       (2) env\Scripts\python.exe -m pytest -v workflows/manage_client/tests:
#       PRAGMA query_only = ON cho thao tác ghi, BEGIN EXCLUSIVE cho thao tác đọc.
#     result: >
#       (1) GET /clients -> 500 {"code":"ERR_STORAGE_IO","message":"Storage
#       failed.","details":{"reason":"database is locked"}}; POST /clients ->
#       500, cùng thân; get_client_summary -> raised label=500
#       error_body={'code': 'ERR_STORAGE_IO', 'message': 'Storage failed.',
#       'details': {'reason': 'database is locked'}}. (2) 32 passed, gồm POST,
#       PUT, PUT archived -> 500 với reason chứa "readonly" và không ghi gì;
#       GET /clients, GET /clients/{id} -> 500 "database is locked", nhả khóa
#       thì GET -> 200; một KeyError giả lập trong Adapters vẫn nổi lên thành
#       KeyError, không thành 500 ERR_STORAGE_IO.
#     recorded_at: 2026-09-24T18:51:50+07:00
#   - claim: >
#       Một cơ sở dữ liệu tạo bằng cấu trúc cũ (bảng phiên bản
#       client_schema_version) khởi động được bằng code mới: dữ liệu khách hàng
#       còn nguyên, chỉ còn bảng tên mới, phiên bản giữ là 1; khởi động lần hai
#       không đổi gì. Nếu khởi động lỗi thì việc đổi tên được hoàn tác.
#     how: >
#       cd Backend; env\Scripts\python.exe -m pytest -v workflows/manage_client -k legacy
#       (Python 3.13.12 của Backend/env). Cấu trúc cũ được dựng bằng SQL viết
#       cứng trong kiểm thử (không dùng code đang kiểm thử): ba bảng
#       client_schema_version (version 1), client, client_contact, một khách
#       đã lưu trữ có hai liên hệ. Sau đó mở bằng scaffold_backend, gọi
#       ClientRepository.ensure_storage() hai lần, rồi đọc qua GET /clients/{id}
#       của Routers thật. Trường hợp lỗi: bảng cũ mang version 99.
#     result: >
#       test_legacy_version_table_is_renamed_and_data_kept PASSED: GET -> 200
#       đúng từng khóa như lúc ghi (display_name "Legacy Mai", 2 contacts theo
#       thứ tự, note, is_archived true, created_at/updated_at gốc); POST
#       /clients mới -> 201; manage_client_schema_version = [(1,)]; bảng trong
#       DB = {client, client_contact, manage_client_schema_version}.
#       test_legacy_rename_is_rolled_back_when_start_up_fails PASSED:
#       StorageVersionError, bảng trong DB vẫn là {client, client_contact,
#       client_schema_version}.
#     recorded_at: 2026-09-24T20:25:01+07:00
#   - claim: >
#       create_client và edit_client trả 400 ERR_VALIDATION, details chỉ đúng
#       trường, và không ghi gì, khi display_name, contacts[].channel hoặc
#       contacts[].value là "", "   ", "\t\n", U+00A0 hoặc U+3000; giá trị có
#       khoảng trắng hai đầu được lưu và trả lại nguyên văn; note toàn khoảng
#       trắng hay rỗng, contacts rỗng, tên có dấu dài đúng 120 ký tự đều được
#       nhận; 120 ký tự cộng khoảng trắng hai đầu bị 400. Kiểm thử cắn.
#     how: >
#       cd Backend; env\Scripts\python.exe -m pytest -q workflows/manage_client
#       (Python 3.13.12 của Backend/env, Windows 11; HTTP qua TestClient tới
#       Routers thật, SQLite thật trong thư mục tạm). "Không ghi gì": sau POST
#       bị từ chối GET /clients không đổi; sau PUT bị từ chối GET
#       /clients/{id} bằng đúng bản trước. Bằng chứng cắn: tạm đổi dòng
#       "if not value.strip():" trong routers.py thành "if False and not
#       value.strip():", chạy pytest -q workflows/manage_client -k "blank or
#       padding or padded", rồi khôi phục và chạy lại.
#     result: >
#       70 passed (34 ca cũ + 36 ca mới: 15 ca tạo, 15 ca sửa, 6 ca hợp lệ và
#       biên). Khi tắt phép kiểm: 24 failed, 10 passed; 24 ca hỏng đúng là 4
#       dạng chỉ khoảng trắng x 3 trường x tạo/sửa; 6 ca "" vẫn đạt vì
#       min_length bắt trước. Khôi phục: 34 passed (cùng bộ lọc).
#     recorded_at: 2026-09-28T21:30:00+07:00
#   - claim: >
#       Trên tiến trình Backend.py thật, luật not blank chạy đúng qua HTTP và
#       giá trị hợp lệ được lưu nguyên văn.
#     how: >
#       Script tạm của phiên (không nằm trong dự án) khởi động
#       Backend\env\Scripts\python.exe Backend.py với CT_PORT trống, CT_DB_FILE_PATH
#       trong %TEMP%\ct_s18_*, chờ READY, gọi bằng urllib, đóng stdin.
#     result: >
#       POST display_name "　 " -> 400 {"code":"ERR_VALIDATION","message":
#       "Invalid client_input.","details":{"errors":[{"loc":["client_input",
#       "display_name"],"msg":"Value error, must not be blank"}]}}; POST
#       channel "\t" -> 400 loc ["client_input","contacts","0","channel"]; POST
#       {"display_name":"  An  ","contacts":[{"channel":" zalo","value":"0901 "}],
#       "note":"   "} -> 201, GET -> 200 cùng các giá trị nguyên văn; PUT
#       display_name " " -> 400 loc display_name; GET /clients -> 1 phần tử
#       "  An  ". Đóng stdin -> exit code 0, dòng đầu stdout b'READY\n'.
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
#       Đề xuất (Giai đoạn 6, Bước 6.6): chuyển status của manage_client
#       đang_triển_khai -> đã_hoàn_thiện. BE-5 đã áp dụng client_input của Data
#       Schema 8.0.0 (not blank cho display_name, contacts[].channel,
#       contacts[].value); bằng chứng ở EVIDENCE; không có UNSOLVED_PROBLEMS.
#       Coding agent không tự sửa hợp đồng.
#     written_at: 2026-09-28
# ===WCA-CHECKPOINT-END===
"""Services of manage_client: every business decision of the workflow."""

import uuid
from dataclasses import replace
from datetime import datetime

# StorageIOError is raised by the Adapters and passes through unchanged;
# it is re-exported so the Routers depend on Services only.
from .adapters import ClientRepository, StorageIOError  # noqa: F401
from .entities import Client, ClientInput, ClientListItem, ClientSummary


class ClientNotFoundError(Exception):
    def __init__(self, client_id: str) -> None:
        super().__init__(f"client {client_id} does not exist")
        self.client_id = client_id


def _now() -> datetime:
    # Local wall-clock time with its UTC offset (clause_a_common.formats.timestamp).
    return datetime.now().astimezone().replace(microsecond=0)


class ManageClientService:
    def __init__(self, repo: ClientRepository) -> None:
        self._repo = repo

    def create(self, client_input: ClientInput) -> Client:
        now = _now()
        client = Client(
            client_id=str(uuid.uuid4()),
            display_name=client_input.display_name,
            contacts=list(client_input.contacts),
            note=client_input.note,
            is_archived=False,
            created_at=now,
            updated_at=now,
        )
        self._repo.insert(client)
        return client

    def get(self, client_id: str) -> Client:
        client = self._repo.fetch(client_id)
        if client is None:
            raise ClientNotFoundError(client_id)
        return client

    def list_all(self) -> list[ClientListItem]:
        # Alphabetical by display name, so the list is stable for the UI.
        items = self._repo.fetch_all_list_items()
        return sorted(items, key=lambda i: (i.display_name.casefold(), i.client_id))

    def edit(self, client_id: str, client_input: ClientInput) -> Client:
        # Editing replaces the editable fields; archive state and creation
        # time are kept. Archived clients may be edited.
        current = self.get(client_id)
        edited = replace(
            current,
            display_name=client_input.display_name,
            contacts=list(client_input.contacts),
            note=client_input.note,
            updated_at=_now(),
        )
        self._repo.replace(edited)
        return edited

    def set_archived(self, client_id: str, is_archived: bool) -> Client:
        # Setting the flag to the value it already has is not an error and
        # changes nothing (updated_at is kept).
        current = self.get(client_id)
        if current.is_archived == is_archived:
            return current
        changed = replace(current, is_archived=is_archived, updated_at=_now())
        self._repo.replace(changed)
        return changed

    def get_summary(self, client_id: str) -> ClientSummary:
        summary = self._repo.fetch_summary(client_id)
        if summary is None:
            raise ClientNotFoundError(client_id)
        return summary
