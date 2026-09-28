# ===WCA-CHECKPOINT-START===
# workflow: manage_watermark_profile
# clause: clause_b_backend
# component: services
# last_updated_by: coding-agent@2026-09-28#3
# last_updated_at: 2026-09-28T21:45:00+07:00
#
# EXPERIENCES:
#   - id: manage_watermark_profile-EXP-001
#     content: >
#       strength_presets là giá trị ranh giới dùng chung với
#       clause_c_ai_service (shared_values.watermark_strength_presets). Main đọc
#       configs.yaml rồi trao danh sách chuỗi vào Services; Services kiểm ngay
#       trong __init__ (_check_strength_presets) và raise
#       InvalidStrengthPresetsError nếu danh sách khác đúng [subtle, balanced,
#       robust]: rỗng, trùng, có giá trị lạ (thừa), thiếu, hoặc sai thứ tự.
#       wire_workflows để lỗi nổi lên, Main thoát mã 2 và không in READY, giống
#       stage_catalog của update_progress. Giá trị so sánh là hằng
#       _SHARED_STRENGTH_PRESETS trong services.py, hiện thực hóa
#       types.watermark_strength. Nếu hợp đồng đổi shared value thì phải sửa
#       cả configs.yaml lẫn hằng này.
#   - id: manage_watermark_profile-EXP-002
#     content: >
#       Quyết định nghiệp vụ ở Services: tạo cấp profile_id UUID v4, không bắt
#       display_name duy nhất; sửa thay toàn bộ năm trường, giữ profile_id;
#       không xóa, không lưu trữ hồ sơ (một watermark đã nhúng trỏ tới
#       profile_id mãi mãi), nên "đọc rồi ghi" khi sửa không cần giao dịch
#       chung. profile_list xếp theo display_name.casefold() rồi profile_id,
#       như client_list. Lưu ý: casefold so theo mã ký tự, nên tên bắt đầu bằng
#       chữ có dấu ("Ánh") đứng sau "z". created_at, updated_at chỉ là cột nội
#       bộ, không có trong watermark_profile_record.
#   - id: manage_watermark_profile-EXP-004
#     content: >
#       Lưu trữ: bảng watermark_profile và manage_watermark_profile_schema_version
#       (phiên bản 1), do ensure_storage() tạo lúc khởi động, các bước nâng cấp
#       ở _STORAGE_UPGRADES trong adapters.py (chỉ thêm vào cuối). Phiên bản
#       mới hơn bản build -> StorageVersionError, Main không in READY. Mọi thao
#       tác lúc chạy bọc _storage_io() -> StorageIOError -> 500 +
#       ERR_STORAGE_IO (main-EXP-005). list_strengths chỉ đọc Configs nên vẫn
#       200 khi DB lỗi. Workflow không gọi ai. Main ráp nối ở Order 4, sau
#       update_progress, và giữ get_watermark_profile trong in_process cho
#       apply_watermark, verify_watermark.
#   - id: manage_watermark_profile-EXP-005
#     content: >
#       Kiểm tra định dạng ở Routers (Data Schema 8.0.0, profile_input): đủ năm
#       khóa của profile_input (ba trường tự do được null nhưng khóa phải có),
#       không khóa thừa ở cả hai cấp, kiểu strict, display_name (bút danh)
#       1..80 ký tự (đếm theo ký tự như manage_client) và not blank (xem
#       manage_watermark_profile-EXP-006); không ràng buộc thêm cho legal_name,
#       contact, ownership_statement (không có luật not blank).
#       default_strength phải thuộc strength_options() của Services (tức là
#       Configs), sai thì 400 với loc [profile_input, default_strength].
#       profile_id sai định dạng: PUT trả 400 (có khai báo 400), kiểm trước
#       thân yêu cầu; GET và get_watermark_profile trả 404. Lối vào in_process
#       trả dict đúng 6 khóa, lỗi raise InProcessCallError (label, error_body)
#       theo main-EXP-004.
#     derived_from: manage_watermark_profile-EXP-003
#   - id: manage_watermark_profile-EXP-006
#     content: >
#       Luật not blank (clause_a_common.formats.not_blank; Data Schema 8.0.0,
#       CT-3 / BE-6) cho profile_input.display_name là ràng buộc của kiểu, nên
#       nằm ở Routers: hàm _not_blank trong routers.py, gắn bằng AfterValidator
#       sau StringConstraints(1..80). Khoảng trắng là theo str.isspace (dùng
#       value.strip() không đối số). Luật chỉ kiểm, không đổi giá trị: bút
#       danh hợp lệ được lưu và trả lại nguyên văn (" Mây " giữ hai dấu cách),
#       vì hợp đồng ghi "It is a check only". Độ dài đếm trên giá trị gốc: 80
#       ký tự cộng một dấu cách mỗi đầu bị 400 (Project Owner xác nhận cách
#       đọc này 2026-09-28). Vi phạm -> 400 ERR_VALIDATION "Invalid
#       profile_input.", details.errors đúng một mục loc [profile_input,
#       display_name], msg "Value error, must not be blank" (chuỗi rỗng: "at
#       least 1 character", cùng loc). Dữ liệu cũ không bị chuyển đổi. Hàm
#       _not_blank là bản riêng của workflow này, giống hệt bản của
#       manage_client và manage_commission (quyết định của Project Owner
#       2026-09-28: không tạo Backend/shared/, không import chéo); sửa định
#       nghĩa thì sửa cả ba. Giao diện V1 không có màn hình hồ sơ bút danh,
#       nên backend là nơi duy nhất giữ luật này. Giới hạn đã biết, không vá ở
#       V1: (1) chỉ Python coi U+001C..U+001F và U+0085 là khoảng trắng, chỉ
#       JavaScript (trim) coi U+FEFF là khoảng trắng (đo trên Python 3.13.12 và
#       Node 24.14.1); backend là bên quyết định. (2) Ký tự vô hình không phải
#       khoảng trắng (ví dụ U+200B) vẫn qua luật; hợp đồng không cấm.
#
# UNSOLVED_PROBLEMS: []
#
# EVIDENCE:
#   - claim: >
#       Trên tiến trình Backend.py thật với tệp SQLite thật: tạo hồ sơ đủ
#       trường, hồ sơ có ba trường tự do null và display_name đúng 80 ký tự ->
#       201, đúng 6 khóa; 400 ở cả POST và PUT cho display_name rỗng, 81 ký tự,
#       thiếu khóa contact, thừa khóa website, default_strength "strong",
#       legal_name là số, và PUT với profile_id sai định dạng; sửa -> 200, giữ
#       profile_id, thay đủ năm trường; sửa hồ sơ không có -> 404; GET có ->
#       200, không có -> 404, sai định dạng -> 404; list đúng thứ tự casefold;
#       list_strengths -> ["subtle","balanced","robust"]; khóa DB -> 500 ở bốn
#       điểm giao tiếp chạm DB, list_strengths vẫn 200; dữ liệu còn sau khi
#       khởi động lại; get_watermark_profile qua hàm Routers -> 200, 404, 500.
#     how: >
#       cd Backend; env\Scripts\python.exe -m pytest -s -v
#       tests/test_backend_process.py -k watermark_profiles (Python 3.13.12 của
#       Backend/env, Windows 11; tiến trình con thật khởi động bằng CT_*, cổng
#       trống ngẫu nhiên, DB trong thư mục tạm; ">>" là yêu cầu, "<<" là phản
#       hồi thô). Lỗi lưu trữ: một kết nối sqlite3 khác giữ BEGIN EXCLUSIVE trên
#       cùng tệp. get_watermark_profile: sau khi tiến trình dừng, ráp nối lại
#       đúng như Main (Backend.wire_workflows) trên cùng tệp rồi gọi hàm Routers.
#     result: >
#       POST đủ trường -> 201 {"profile_id":"26cc2672-88ba-4cd7-b9a4-c627f5f922b1",
#       "display_name":"Mây Vẽ","legal_name":"Nguyễn Thu Hà","contact":
#       "may.ve@example.com","ownership_statement":"Mọi tác phẩm thuộc quyền sở
#       hữu của Mây Vẽ.","default_strength":"balanced"}; POST "bút chì" với ba
#       trường null, subtle -> 201, legal_name/contact/ownership_statement null;
#       POST "Á"x80 -> 201. 12 lời gọi 400 ERR_VALIDATION "Invalid
#       profile_input." với loc lần lượt display_name ("at least 1 character",
#       "at most 80 characters"), contact ("Field required"), website ("Extra
#       inputs are not permitted"), default_strength ("must be one of
#       ['subtle', 'balanced', 'robust']"), legal_name ("Input should be a valid
#       string"); PUT /watermark-profiles/not-an-id -> 400 "profile_id must be a
#       lowercase UUID v4.". PUT sửa -> 200 {"profile_id":"26cc2672-...",
#       "display_name":"Mây","legal_name":null,"contact":"fb.com/may.ve",
#       "ownership_statement":"(c) Mây","default_strength":"robust"}; PUT id
#       không có -> 404 ERR_NOT_FOUND "Watermark profile not found."; GET ->
#       200 bằng đúng bản đã sửa; GET id không có, GET not-an-id -> 404. GET
#       list -> 200 thứ tự [bút chì, Mây, Á…]; GET /watermark-strengths -> 200
#       ["subtle","balanced","robust"]. Khi khóa: POST, GET list, GET, PUT ->
#       500 {"code":"ERR_STORAGE_IO","message":"Storage failed.","details":
#       {"reason":"database is locked"}}; /watermark-strengths -> 200; nhả khóa
#       -> list giống hệt. Đóng stdin -> exit code 0, stdout [b'READY\n']. Lần
#       chạy 2 cùng tệp -> GET và list giống hệt. get_watermark_profile(
#       profile_id='26cc2672-...') -> dict 6 khóa bằng đúng bản đã sửa; id
#       không có -> raised label=404 error_body {'code': 'ERR_NOT_FOUND',
#       'message': 'Watermark profile not found.', 'details': {'profile_id':
#       '0b7f5a3e-1d2c-4e5f-8a9b-0c1d2e3f4a5b'}}; khi khóa -> raised label=500
#       error_body {'code': 'ERR_STORAGE_IO', 'message': 'Storage failed.',
#       'details': {'reason': 'database is locked'}}. 1 passed.
#     recorded_at: 2026-09-24T22:35:01+07:00
#   - claim: >
#       strength_presets khác shared_values.watermark_strength_presets làm tiến
#       trình Backend.py thoát mã khác 0, không in READY.
#     how: >
#       cd Backend; env\Scripts\python.exe -m pytest -s -v
#       tests/test_backend_process.py -k strength_presets (Main thật, chạy bằng
#       python -c, WORKFLOW_CONFIG_FILES["manage_watermark_profile"] trỏ tới
#       một configs.yaml tạm chứa giá trị sai; không sửa tệp configs thật).
#     result: >
#       [subtle, robust] -> exit code 2, stdout=b'', "missing strength presets
#       ['balanced']"; [robust, balanced, subtle] -> exit code 2, stdout=b'',
#       "are out of order"; [] -> exit code 2, stdout=b'', "strength_presets is
#       empty"; [subtle, balanced, robust, robust] -> exit code 2, stdout=b'',
#       "duplicate strength presets ['robust']"; [subtle, balanced, robust,
#       strong] -> exit code 2, stdout=b'', "unknown strength presets
#       ['strong']". 5 passed.
#     recorded_at: 2026-09-24T22:35:01+07:00
#   - claim: >
#       Kiểm thử cấp workflow (ráp nối bằng Backend.wire_workflows trên SQLite
#       thật) đạt: 11 dạng profile_input sai -> 400 ở cả POST và PUT, không ghi
#       gì; 80 ký tự có dấu nhận, 81 từ chối; sửa thay đủ năm trường; thứ tự
#       list; id sai định dạng (400 ở PUT, 404 ở GET và in_process); 404;
#       in_process 200 và 404; sáu dạng strength_presets sai bị Services từ
#       chối và wire_workflows thất bại; bảng và phiên bản 1, khởi động lần hai
#       không đổi, phiên bản 99 -> StorageVersionError; khóa DB -> 500 ở 4 điểm
#       http và in_process, list_strengths 200; PRAGMA query_only -> 500
#       "readonly" khi ghi, không ghi gì; lỗi lập trình không thành 500.
#     how: >
#       cd Backend; env\Scripts\python.exe -m pytest -q workflows/manage_watermark_profile
#     result: >
#       33 passed.
#     recorded_at: 2026-09-24T22:31:00+07:00
#   - claim: >
#       create_profile và edit_profile trả 400 ERR_VALIDATION, details loc
#       [profile_input, display_name], và không ghi gì, khi bút danh là "",
#       "   ", "\t\n", U+00A0 hoặc U+3000; bút danh có khoảng trắng hai đầu
#       được lưu và trả lại nguyên văn (cả GET và list); legal_name "   ",
#       contact "\t", ownership_statement "" được nhận nguyên văn; bút danh có
#       dấu dài đúng 80 ký tự được nhận; 80 ký tự cộng khoảng trắng hai đầu bị
#       400. Kiểm thử cắn.
#     how: >
#       cd Backend; env\Scripts\python.exe -m pytest -q workflows/manage_watermark_profile
#       (Python 3.13.12, Windows 11; ráp nối bằng Backend.wire_workflows, HTTP
#       qua TestClient, SQLite thật). "Không ghi gì": sau POST bị từ chối GET
#       /watermark-profiles không đổi; sau PUT bị từ chối GET
#       /watermark-profiles/{id} bằng đúng bản trước. Bằng chứng cắn: tạm đổi
#       "if not value.strip():" trong routers.py thành "if False and not
#       value.strip():", chạy pytest -q workflows/manage_watermark_profile -k
#       "blank or padding or padded", rồi khôi phục và chạy lại.
#     result: >
#       47 passed (33 ca cũ + 14 ca mới: 5 tạo, 5 sửa, 4 hợp lệ và biên). Khi
#       tắt phép kiểm: 8 failed, 5 passed; 8 ca hỏng đúng là 4 dạng chỉ khoảng
#       trắng x tạo/sửa; 2 ca "" vẫn đạt vì min_length. Khôi phục: 13 passed.
#     recorded_at: 2026-09-28T21:30:00+07:00
#   - claim: >
#       Trên tiến trình Backend.py thật, bút danh trống bị từ chối ở POST và
#       PUT, bút danh hợp lệ có khoảng trắng hai đầu được lưu nguyên văn.
#     how: >
#       Script tạm của phiên (không nằm trong dự án) khởi động
#       Backend\env\Scripts\python.exe Backend.py với CT_PORT trống, CT_DB_FILE_PATH
#       trong %TEMP%\ct_s18_*, chờ READY, gọi bằng urllib, đóng stdin.
#     result: >
#       POST display_name "   " -> 400 {"code":"ERR_VALIDATION","message":
#       "Invalid profile_input.","details":{"errors":[{"loc":["profile_input",
#       "display_name"],"msg":"Value error, must not be blank"}]}}; POST
#       display_name " Mây ", legal_name " " -> 201 nguyên văn; PUT
#       display_name "\n" -> 400 cùng loc; GET /watermark-profiles -> 1 phần tử
#       vẫn " Mây ", legal_name " ". Đóng stdin -> exit code 0.
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
#       Đề xuất (Giai đoạn 6, Bước 6.6): chuyển status của
#       manage_watermark_profile đang_triển_khai -> đã_hoàn_thiện. BE-6 đã áp
#       dụng profile_input của Data Schema 8.0.0 (display_name not blank);
#       bằng chứng ở EVIDENCE; không có UNSOLVED_PROBLEMS. Coding agent không
#       tự sửa hợp đồng.
#     written_at: 2026-09-28
# ===WCA-CHECKPOINT-END===
"""Services of manage_watermark_profile: every business decision of the workflow."""

import uuid
from dataclasses import replace
from datetime import datetime

# StorageIOError is raised by the Adapters and passes through unchanged;
# it is re-exported so the Routers depend on Services only.
from .adapters import ProfileRepository, StorageIOError  # noqa: F401
from .entities import ProfileInput, WatermarkProfile

# clause_a_common.shared_values.watermark_strength_presets (the values of
# clause_a_common.types.watermark_strength), shared with clause_c_ai_service:
# the configured strength_presets must be exactly this list, in this order.
_SHARED_STRENGTH_PRESETS = ("subtle", "balanced", "robust")


class InvalidStrengthPresetsError(ValueError):
    """The configured strength_presets differ from the shared value; the
    layer must not start."""


class ProfileNotFoundError(Exception):
    def __init__(self, profile_id: str) -> None:
        super().__init__(f"watermark profile {profile_id} does not exist")
        self.profile_id = profile_id


def _now() -> datetime:
    # Local wall-clock time with its UTC offset (clause_a_common.formats.timestamp).
    return datetime.now().astimezone().replace(microsecond=0)


def _check_strength_presets(presets: list[str]) -> None:
    expected = list(_SHARED_STRENGTH_PRESETS)
    if not presets:
        raise InvalidStrengthPresetsError(f"strength_presets is empty; expected {expected}")
    duplicates = sorted({p for p in presets if presets.count(p) > 1})
    if duplicates:
        raise InvalidStrengthPresetsError(f"duplicate strength presets {duplicates}; expected {expected}")
    unknown = [p for p in presets if p not in expected]
    if unknown:
        raise InvalidStrengthPresetsError(f"unknown strength presets {unknown}; expected {expected}")
    missing = [p for p in expected if p not in presets]
    if missing:
        raise InvalidStrengthPresetsError(f"missing strength presets {missing}; expected {expected}")
    if list(presets) != expected:
        raise InvalidStrengthPresetsError(f"strength presets {list(presets)} are out of order; expected {expected}")


class ManageWatermarkProfileService:
    def __init__(self, repo: ProfileRepository, strength_presets: list[str]) -> None:
        _check_strength_presets(strength_presets)
        self._repo = repo
        self._strength_presets = list(strength_presets)

    def strength_options(self) -> list[str]:
        return list(self._strength_presets)

    def create(self, profile_input: ProfileInput) -> WatermarkProfile:
        # display_name need not be unique: the contract does not ask for it.
        now = _now()
        profile = WatermarkProfile(
            profile_id=str(uuid.uuid4()),
            display_name=profile_input.display_name,
            legal_name=profile_input.legal_name,
            contact=profile_input.contact,
            ownership_statement=profile_input.ownership_statement,
            default_strength=profile_input.default_strength,
            created_at=now,
            updated_at=now,
        )
        self._repo.insert(profile)
        return profile

    def get(self, profile_id: str) -> WatermarkProfile:
        profile = self._repo.fetch(profile_id)
        if profile is None:
            raise ProfileNotFoundError(profile_id)
        return profile

    def list_all(self) -> list[WatermarkProfile]:
        # Alphabetical by display name, so the list is stable for the UI.
        profiles = self._repo.fetch_all()
        return sorted(profiles, key=lambda p: (p.display_name.casefold(), p.profile_id))

    def edit(self, profile_id: str, profile_input: ProfileInput) -> WatermarkProfile:
        # Editing replaces all five fields; profile_id is kept. Profiles are
        # never deleted (an embedded watermark points to its profile_id
        # forever), so the profile cannot vanish between read and write.
        current = self.get(profile_id)
        edited = replace(
            current,
            display_name=profile_input.display_name,
            legal_name=profile_input.legal_name,
            contact=profile_input.contact,
            ownership_statement=profile_input.ownership_statement,
            default_strength=profile_input.default_strength,
            updated_at=_now(),
        )
        self._repo.replace(edited)
        return edited
