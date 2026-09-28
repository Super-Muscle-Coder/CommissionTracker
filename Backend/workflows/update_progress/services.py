# ===WCA-CHECKPOINT-START===
# workflow: update_progress
# clause: clause_b_backend
# component: services
# last_updated_by: coding-agent@2026-09-25#1
# last_updated_at: 2026-09-25T08:40:00+07:00
#
# EXPERIENCES:
#   - id: update_progress-EXP-001
#     content: >
#       Quyết định nghiệp vụ ở Services. Đơn có tồn tại chỉ biết qua
#       get_commission_summary (404 -> CommissionNotFoundError; 500 ->
#       StorageIOError), áp cho change_stage, get_stage, get_stage_history;
#       get_board không hỏi manage_commission. Đơn chưa đặt giai đoạn: get_stage
#       trả giai đoạn đầu của catalog, kind của nó, updated_at None, không ghi
#       gì; lịch sử []; không có trong board. Chuyển giai đoạn: giai đoạn hiện
#       tại (giai đoạn đầu nếu chưa đặt) có kind finished/cancelled, hoặc
#       to_stage trùng giai đoạn hiện tại -> InvalidTransitionError (409). Mọi
#       trường hợp khác được chuyển sang bất kỳ giai đoạn nào của catalog, kể
#       cả lùi lại. Mục lịch sử đầu có from_stage None (kể cả khi đơn đã được
#       coi là ở giai đoạn đầu); updated_at = changed_at của mục cuối. Không
#       đọc gì về thanh toán. Board xếp theo commission_id (hợp đồng không quy
#       định thứ tự).
#   - id: update_progress-EXP-002
#     content: >
#       Lưu trữ: bảng stage_change (một dòng mỗi lần chuyển, không bao giờ
#       UPDATE hay DELETE) và update_progress_schema_version (quy ước
#       CLAUDE.md, mục 5; bước nâng cấp trong _STORAGE_UPGRADES). Không có bảng
#       "giai đoạn hiện tại": giai đoạn hiện tại là dòng có position lớn nhất,
#       nên không thể lệch với lịch sử. Khóa chính (commission_id, position),
#       position đếm từ 1: lịch sử không thể rẽ nhánh kể cả khi code sai (hai
#       dòng cùng nối sau một dòng sẽ trùng khóa -> 500, không ghi). Mỗi dòng
#       lưu to_stage và to_kind lúc chuyển; kết quả trả ra và luật chuyển dùng
#       kind đã lưu, nên đơn ở giai đoạn đã bị bỏ khỏi catalog vẫn đọc được và
#       vẫn giữ luật finished/cancelled (to_stage mới thì phải có trong catalog
#       hiện tại). Không lưu gì về đơn ngoài commission_id, không khóa ngoại.
#   - id: update_progress-EXP-003
#     content: >
#       Đồng thời: Services hỏi manage_commission trước, rồi trong một
#       ProgressRepository.write_scope() (BEGIN IMMEDIATE + khóa của
#       SharedConnection, xem main-EXP-006) đọc dòng cuối, quyết định, thêm
#       dòng mới với from_stage = to_stage của dòng vừa đọc. Hai lời chuyển
#       đồng thời được xét lần lượt; lời sau được tính lại trên giai đoạn lời
#       trước vừa đặt (không trả 409 chỉ vì thua, chỉ 409 khi trên trạng thái
#       mới nó không hợp lệ: trùng giai đoạn, hoặc lời trước đã
#       delivered/cancelled). Đã kiểm bằng biến thể đọc ngoài giao dịch (thêm
#       trễ 0,2 s): 4 lời đồng thời cho [200, 500, 500, 500] do trùng khóa, nên
#       kiểm thử đòi 4 x 200 và chuỗi liền mạch bắt được lỗi này.
#   - id: update_progress-EXP-004
#     content: >
#       Configs và Routers: stage_catalog nằm ở configs.yaml, đúng mặc định và
#       thứ tự của hợp đồng; Main đọc, dựng list[StageOption] rồi trao vào. Luật
#       hợp lệ của catalog (không rỗng, tên không rỗng và không trùng, kind
#       thuộc stage_kind, giai đoạn đầu là active) nằm ở hàm khởi tạo của
#       Services (InvalidStageCatalogError); wire_workflows nổi lỗi, Main thoát
#       mã 2, không in READY. Routers kiểm tra định dạng: thân
#       {"stage_change": {"to_stage", "note"}}, strict, extra=forbid, đủ hai
#       khóa (note được null). to_stage ngoài catalog -> 400 ở Routers (ràng
#       buộc nằm trong type "a stage of stage_catalog", danh sách tên truyền qua
#       context như currency của manage_commission-EXP-005), nên kiểm tra này
#       đứng trước 404 của đơn không tồn tại. Services vẫn tra kind và trả
#       UnknownStageError (400) nếu thiếu. commission_id sai định dạng: PUT ->
#       400; GET -> 404. list_stages chỉ đọc Configs, không có nhãn 500.
#
# UNSOLVED_PROBLEMS: []
#
# EVIDENCE:
#   - claim: >
#       Trên tiến trình Backend.py thật với tệp SQLite thật: đơn mới (queued,
#       active, updated_at null; lịch sử []; không có trong board; chuyển sang
#       queued -> 409); queued -> sketch -> on_hold -> sketch -> delivered đều
#       200 với updated_at, sau delivered chuyển tiếp -> 409; đơn khác
#       cancelled rồi chuyển -> 409; 404 ở ba điểm có commission_id; to_stage
#       ngoài catalog, thiếu note, id sai định dạng ở PUT -> 400; id sai định
#       dạng ở GET -> 404; lịch sử đúng chuỗi; board đúng các đơn đã đặt giai
#       đoạn (3 khóa); list_stages đúng catalog theo thứ tự; hai lời chuyển
#       đồng thời giữ chuỗi liền; lỗi lưu trữ thật cho 500 (list_stages vẫn
#       200); dữ liệu còn sau khởi động lại; list_progress_board qua hàm
#       Routers đúng hình dạng, 500 khi khóa; catalog sai -> thoát mã 2, không
#       READY.
#     how: >
#       cd Backend; env\Scripts\python.exe -m pytest -s -v
#       tests/test_backend_process.py -k "progress or catalog" (Python 3.13.12
#       của Backend/env, Windows 11; tiến trình con thật khởi động bằng CT_*,
#       cổng trống ngẫu nhiên, DB trong thư mục tạm; ">>" là yêu cầu, "<<" là
#       phản hồi thô). Lỗi lưu trữ: một kết nối sqlite3 khác giữ BEGIN
#       EXCLUSIVE trên cùng tệp. Catalog sai: tiến trình con chạy Backend.main()
#       với WORKFLOW_CONFIG_FILES["update_progress"] trỏ tới một tệp YAML tạm.
#     result: >
#       GET /commissions/37fd536f-.../stage -> 200 {"commission_id":
#       "37fd536f-1df3-4eb6-97fc-9c46e934fef8","current_stage":"queued",
#       "stage_kind":"active","updated_at":null}; history -> 200 []; board ->
#       200 []; PUT queued -> 409 ERR_INVALID_TRANSITION details
#       {current_stage: queued, current_kind: active, to_stage: queued}. PUT
#       sketch, on_hold, sketch, delivered -> 200, updated_at
#       "2026-09-24T21:19:09+07:00", cuối cùng stage_kind "finished"; PUT
#       sketch, cancelled -> 409 (current_kind finished). Đơn e7f22f91-...:
#       cancelled -> 200, rồi sketch -> 409 (current_kind cancelled).
#       UNKNOWN_ID: PUT, GET stage, GET history -> 404 ERR_NOT_FOUND. PUT
#       "painting" -> 400 loc [stage_change, to_stage]; thiếu note -> 400 loc
#       [stage_change, note] "Field required"; PUT /commissions/not-an-id/stage
#       -> 400; GET not-an-id stage, history -> 404. History -> [(null,
#       sketch), (sketch, on_hold), (on_hold, sketch), (sketch, delivered)], mục
#       cuối changed_at bằng updated_at. Board -> 2 mục (delivered/finished,
#       cancelled/cancelled). Stages -> 11 mục đúng thứ tự queued ... cancelled.
#       Đồng thời: PUT sketch + PUT lineart trên f8eb9e45-... -> [200, 200],
#       chuỗi [(None, 'lineart'), ('lineart', 'sketch')]. Khi khóa: PUT stage,
#       GET stage, GET history -> 500 reason "manage_commission: Storage
#       failed. {'reason': 'database is locked'}"; GET /progress/board -> 500
#       reason "database is locked"; GET /progress/stages -> 200. Đóng stdin
#       -> exit code 0, stdout [b'READY\n']. Lần chạy 2 cùng tệp: stage và
#       history giống hệt; board 3 mục. list_progress_board() -> 3 mục, đúng 3
#       khóa; khi khóa -> raised label=500 error_body={'code':
#       'ERR_STORAGE_IO', ..., 'details': {'reason': 'database is locked'}}.
#       Catalog [on_hold, queued] -> exit code 2, stdout b'', stderr
#       "InvalidStageCatalogError: the first stage 'on_hold' must be of kind
#       'active'"; catalog trùng queued -> exit code 2, stdout b'', "duplicate
#       stages: ['queued']". 3 passed.
#     recorded_at: 2026-09-24T21:19:52+07:00
#   - claim: >
#       Kiểm thử cấp workflow (ráp nối bằng Backend.wire_workflows, lời gọi
#       sang manage_commission là thật) đạt: đơn mới không ghi gì khi đọc;
#       chuyển tới lui, on_hold, delivered và cancelled là cuối; 15 dạng thân
#       sai -> 400 và không ghi gì; 4 lời chuyển đồng thời tới 4 giai đoạn khác
#       nhau (trễ 0,2 s giữa đọc và ghi) -> 4 x 200, chuỗi liền; 4 lời cùng
#       sang sketch -> 1 x 200 + 3 x 409; cancelled đồng thời với lineart -> xét
#       lần lượt; kind đã lưu quyết định khi catalog đổi; 5 catalog sai làm
#       wire_workflows dừng; bảng không khóa ngoại, không có cột nào về đơn
#       ngoài commission_id; phiên bản bảng mới hơn -> StorageVersionError; khóa
#       DB -> 500 ở 4 điểm http và list_progress_board, list_stages vẫn 200;
#       ghi khi query_only -> 500, không ghi gì; lỗi lập trình không thành 500.
#     how: >
#       cd Backend; env\Scripts\python.exe -m pytest -q workflows/update_progress
#     result: >
#       38 passed.
#     recorded_at: 2026-09-24T21:05:00+07:00
#
# NOTES: []
# ===WCA-CHECKPOINT-END===
"""Services of update_progress: every business decision of the workflow."""

from datetime import datetime

# StorageIOError is raised by the Adapters and passes through unchanged;
# it is re-exported so the Routers depend on Services only.
from .adapters import CommissionDirectory, ProgressRepository, StorageIOError  # noqa: F401
from .entities import ProgressEntry, ProgressState, StageChange, StageChangeRecord, StageOption

# clause_a_common.types.stage_kind
_STAGE_KINDS = ("active", "on_hold", "finished", "cancelled")
# A commission in a stage of one of these kinds cannot change stage.
_FINAL_KINDS = ("finished", "cancelled")


class InvalidStageCatalogError(ValueError):
    """The configured stage_catalog cannot be used; the layer must not start."""


class CommissionNotFoundError(Exception):
    def __init__(self, commission_id: str) -> None:
        super().__init__(f"commission {commission_id} does not exist")
        self.commission_id = commission_id


class UnknownStageError(Exception):
    def __init__(self, stage: str) -> None:
        super().__init__(f"{stage!r} is not a stage of the catalog")
        self.stage = stage


class InvalidTransitionError(Exception):
    def __init__(self, commission_id: str, current_stage: str, current_kind: str, to_stage: str) -> None:
        super().__init__(f"commission {commission_id} cannot move from {current_stage} ({current_kind}) to {to_stage}")
        self.commission_id = commission_id
        self.current_stage = current_stage
        self.current_kind = current_kind
        self.to_stage = to_stage


def _now() -> datetime:
    # Local wall-clock time with its UTC offset (clause_a_common.formats.timestamp).
    return datetime.now().astimezone().replace(microsecond=0)


def _check_catalog(catalog: list[StageOption]) -> None:
    if not catalog:
        raise InvalidStageCatalogError("stage_catalog is empty")
    names = [o.stage for o in catalog]
    if any(not isinstance(n, str) or not n for n in names):
        raise InvalidStageCatalogError("every stage name must be a non-empty string")
    duplicates = sorted({n for n in names if names.count(n) > 1})
    if duplicates:
        raise InvalidStageCatalogError(f"duplicate stages: {duplicates}")
    unknown = [o.kind for o in catalog if o.kind not in _STAGE_KINDS]
    if unknown:
        raise InvalidStageCatalogError(f"unknown stage kinds {unknown}; allowed: {list(_STAGE_KINDS)}")
    # A commission with no stage set counts as the first stage, of kind
    # 'active' (progress_entry_record, progress_state).
    if catalog[0].kind != "active":
        raise InvalidStageCatalogError(f"the first stage {catalog[0].stage!r} must be of kind 'active'")


class UpdateProgressService:
    def __init__(
        self,
        repo: ProgressRepository,
        commissions: CommissionDirectory,
        stage_catalog: list[StageOption],
    ) -> None:
        _check_catalog(stage_catalog)
        self._repo = repo
        self._commissions = commissions
        self._catalog = list(stage_catalog)
        self._kinds = {o.stage: o.kind for o in stage_catalog}

    def stage_options(self) -> list[StageOption]:
        return list(self._catalog)

    def _require_commission(self, commission_id: str) -> None:
        # Only manage_commission knows whether a commission exists.
        if self._commissions.fetch_summary(commission_id) is None:
            raise CommissionNotFoundError(commission_id)

    def _initial(self, commission_id: str) -> ProgressState:
        # No stage set yet: the first stage of the catalog, and no time.
        first = self._catalog[0]
        return ProgressState(commission_id, first.stage, first.kind, None)

    def state(self, commission_id: str) -> ProgressState:
        # Reading never writes anything.
        self._require_commission(commission_id)
        latest = self._repo.fetch_latest(commission_id)
        if latest is None:
            return self._initial(commission_id)
        return ProgressState(commission_id, latest.to_stage, latest.to_kind, latest.changed_at)

    def history(self, commission_id: str) -> list[StageChangeRecord]:
        # Oldest first; empty when no stage has been set.
        self._require_commission(commission_id)
        return self._repo.fetch_history(commission_id)

    def board(self) -> list[ProgressEntry]:
        # One entry per commission that has had a stage set; kinds as stored.
        records = self._repo.fetch_all_latest()
        records.sort(key=lambda r: r.commission_id)
        return [ProgressEntry(r.commission_id, r.to_stage, r.to_kind) for r in records]

    def change_stage(self, commission_id: str, change: StageChange) -> ProgressState:
        # The commission is checked before the write scope opens: a call to
        # another workflow cannot run inside it.
        self._require_commission(commission_id)
        to_kind = self._kinds.get(change.to_stage)
        if to_kind is None:
            raise UnknownStageError(change.to_stage)
        # Reading the current stage, deciding and appending happen in one
        # transaction: concurrent changes are judged one after the other, the
        # later one on the stage the earlier one set, so each change follows
        # the one before it and the history never breaks.
        with self._repo.write_scope() as scope:
            latest = scope.latest(commission_id)
            if latest is None:
                current_stage, current_kind = self._catalog[0].stage, self._catalog[0].kind
            else:
                # The stored kind decides, even if the catalog has changed since.
                current_stage, current_kind = latest.to_stage, latest.to_kind
            if current_kind in _FINAL_KINDS or change.to_stage == current_stage:
                raise InvalidTransitionError(commission_id, current_stage, current_kind, change.to_stage)
            record = StageChangeRecord(
                commission_id=commission_id,
                from_stage=latest.to_stage if latest is not None else None,
                to_stage=change.to_stage,
                note=change.note,
                changed_at=_now(),
                position=latest.position + 1 if latest is not None else 1,
                to_kind=to_kind,
            )
            scope.append(record)
        return ProgressState(commission_id, record.to_stage, record.to_kind, record.changed_at)
