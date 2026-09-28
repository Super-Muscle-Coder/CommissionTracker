# ===WCA-CHECKPOINT-START===
# workflow: send_reminder
# clause: clause_b_backend
# component: services
# last_updated_by: coding-agent@2026-09-25#2
# last_updated_at: 2026-09-25T09:35:00+07:00
#
# EXPERIENCES:
#   - id: send_reminder-EXP-001
#     content: >
#       Quyết định về thời gian nằm hết ở Services. Tóm tắt định kỳ: nhịp tính
#       lại mỗi lần kiểm tra từ updated_at (lúc lưu, tới giây), không lưu mốc
#       đầu. Ngày mốc đầu là ngày sớm nhất, trong 8 ngày kể từ ngày lưu (giờ
#       địa phương), có at_time (và weekday nếu theo tuần) >= updated_at. Mốc
#       k = ngày đầu + k*every ngày (hoặc k*every*7) lúc at_time, theo giờ
#       tường địa phương. Mỗi lần kiểm tra chỉ xét mốc gần nhất <= bây giờ; sinh
#       nếu mốc đó mới hơn digest_handled_through, rồi ghi nó là đã xử lý, kể
#       cả khi không có đơn mở (không sinh gì, và mốc đó không bao giờ sinh
#       lại). Lưu cài đặt đặt digest_handled_through = NULL, và nhịp mới bắt
#       đầu >= lúc lưu nên không mốc cũ nào quay lại. Đơn mở = không có trên
#       board, hoặc stage_kind khác finished/cancelled. upcoming xếp theo
#       (deadline, commission_id).
#   - id: send_reminder-EXP-002
#     content: >
#       Nhắc hạn chót: đã sinh được nhớ theo khóa (commission_id, deadline,
#       lead_hours), là khóa chính của reminder_deadline_sent. Đổi hạn chót tạo
#       khóa mới nên được nhắc lại. Thêm mốc báo trước cũng tạo khóa mới.
#       {1 day} và {24 hours} cùng một khóa. Lúc kết thúc = at_local(00:00 của
#       ngày sau hạn chót); due = kết thúc - lead_hours theo thời điểm thật.
#       Điều kiện sinh: due <= now < kết thúc. Hạn chót 9999-12-31 (ngày sau
#       tràn) coi như chưa bao giờ kết thúc; due tính từ 00:00 của chính ngày
#       đó + (24 - lead_hours) giờ. Mốc mà due rơi trước năm 1 (OverflowError)
#       bị bỏ qua, không 500 (xem send_reminder-EXP-006).
#   - id: send_reminder-EXP-003
#     content: >
#       Đồng thời theo main-EXP-006: now lấy trước; hai lời gọi in_process
#       (list_commission_index, list_progress_board) xong trước; sau đó trong
#       một ReminderRepository.write_scope() đọc cài đặt, khóa đã sinh và
#       digest_handled_through, quyết định, ghi thông báo, khóa và mốc đã xử
#       lý. Nếu tách đọc và ghi thành hai giao dịch (biến thể thử ở scratchpad,
#       trễ 0,2 s), 4 check_due đồng thời gây trùng; khóa chính của
#       reminder_deadline_sent chặn lại bằng 500 UNIQUE. Kiểm thử đồng thời bắt
#       được lỗi này. Thứ tự trả ra (check_due và list_pending): due_at theo
#       thời điểm thật, rồi deadline trước periodic_digest, rồi commission_id,
#       rồi lead dài trước, rồi notification_id.
#   - id: send_reminder-EXP-004
#     content: >
#       Đồng hồ là Adapter SystemClock (now tới giây, at_local: giờ tường ->
#       thời điểm, to_local: thời điểm -> độ lệch địa phương lúc đó). Main tạo
#       nó trong wire_workflows; kiểm thử cấp workflow truyền FakeClock (+07:00
#       cố định) qua wire_workflows(..., reminder_clock=...). Trên Windows,
#       astimezone() báo OSError cho thời điểm trước 1970 hoặc sau năm 3000.
#       SystemClock khi đó dùng độ lệch hiện tại, vì một OSError trong khối
#       _storage_io sẽ bị nhận nhầm thành ERR_STORAGE_IO.
#   - id: send_reminder-EXP-005
#     content: >
#       Lưu trữ: reminder_settings (tối đa một dòng, id = 1; lead_times là JSON
#       có thứ tự; thêm cột nội bộ digest_handled_through),
#       reminder_deadline_sent, reminder_notification (không bao giờ xóa;
#       nội dung được chốt lúc sinh, kể cả title và upcoming dạng JSON;
#       acknowledged_at NULL = đang chờ), send_reminder_schema_version (quy ước
#       CLAUDE.md, mục 5). Không khóa ngoại, không đọc bảng của workflow khác.
#       acknowledge chạy trong một giao dịch: UPDATE ... WHERE acknowledged_at IS
#       NULL rồi SELECT; lần hai trả acknowledged_at của lần đầu. Routers kiểm
#       tra mọi ràng buộc trong type của reminder_settings_record (strict,
#       extra=forbid, đủ khóa, at_time bằng regex, weekday null đúng khi theo
#       ngày, 1..5 lead_times, không hai lead trùng độ dài), kể cả khi loại đó
#       đang tắt. acknowledge: id sai định dạng -> 404 (không khai báo 400).
#   - id: send_reminder-EXP-006
#     content: >
#       Khóa "đã nhắc" (đơn, hạn chót, độ dài mốc) nhớ theo từng ngày hạn chót,
#       không theo lần đổi: đổi hạn A -> B nhắc lại các mốc của B, nhưng đổi
#       về A thì các mốc của A đã nhắc không nhắc lại (không xóa khóa cũ khi
#       đổi hạn). Đây là luật chính thức của send_reminder.description từ
#       Data Schema 5.1.0, không phải lỗi cần sửa. Cũng từ 5.1.0, mỗi mốc báo
#       trước tối đa 365 ngày / 8760 giờ, kiểm ở Routers (_LeadTimeFormat,
#       vượt cận -> 400): không có cận, mốc rất lớn (tới 2^53-1 giờ) làm due_at
#       rơi trước năm 0001, không có timestamp hợp lệ và bị lặng lẽ bỏ qua.
#       Với cận này, hạn chót chưa kết thúc trừ tối đa một năm luôn biểu diễn
#       được, nên đường OverflowError ở Services không còn chạm tới qua điểm
#       giao tiếp. Nó vẫn được giữ làm phòng thủ; kiểm thử của nó ghi mốc vượt
#       cận thẳng vào reminder_settings của chính workflow.
#     derived_from: send_reminder-EXP-002
#
# UNSOLVED_PROBLEMS: []
#
# EVIDENCE:
#   - claim: >
#       Trên tiến trình Backend.py thật, tệp SQLite thật, đồng hồ thật (plan
#       phiên backend #7, mục 1-10): cài đặt mặc định với updated_at null; 8
#       dạng thân sai -> 400; lưu hợp lệ -> 200 và còn nguyên sau khởi động
#       lại; nhắc hạn chót 1 ngày và 3 ngày: đơn hạn hôm nay (active và
#       on_hold) mỗi đơn đúng 2 lời nhắc, due_at đúng công thức; đơn đã hủy,
#       đơn hạn hôm qua, đơn không hạn thì không; lần hai trả []; đổi hạn chót
#       sang ngày mai thì mốc 3 ngày được nhắc lại; list_pending đúng thứ tự;
#       acknowledge hai lần cùng acknowledged_at; 404 cho id không có và id sai
#       định dạng; tóm tắt theo ngày ở phút kế tiếp -> đúng một bản, có đơn quá
#       hạn, lần hai trả []; sau khởi động lại không giao lại lời nhắc nào;
#       hai check_due đồng thời không trùng; lỗi lưu trữ thật -> 500.
#     how: >
#       cd Backend; env\Scripts\python.exe -m pytest -s -v
#       tests/test_backend_process.py -k reminders (Python 3.13.12 của
#       Backend/env, Windows 11, múi giờ máy +07:00; tiến trình con thật khởi
#       động bằng CT_*, cổng trống ngẫu nhiên, DB trong thư mục tạm; ">>" là
#       yêu cầu, "<<" là phản hồi thô). Hôm nay theo giờ máy là 2026-09-25.
#       Đơn: A hạn hôm nay, B hạn hôm nay on_hold, C hạn hôm nay cancelled, D
#       hạn hôm qua, E không hạn. Hai lời đồng thời xuất phát cùng lúc từ hai
#       luồng, mỗi luồng một httpx.Client. Lỗi lưu trữ: một kết nối sqlite3
#       khác giữ BEGIN EXCLUSIVE trên cùng tệp.
#     result: >
#       GET settings -> 200 {"settings":{"periodic":{"enabled":false,"every":1,
#       "unit":"weeks","at_time":"09:00","weekday":1},"deadline":{"enabled":
#       false,"lead_times":[{"amount":1,"unit":"days"}]}},"updated_at":null}. 8
#       PUT sai -> 400 ERR_VALIDATION ("weekday must be null when unit =
#       'days'", "weekday is required when unit = 'weeks'", "two lead_times
#       have the same duration", "at least 1 item", "at most 5 items", at_time
#       pattern, "greater than or equal to 1", at_time "Field required"). PUT
#       hợp lệ -> 200 updated_at "2026-09-25T08:39:54+07:00". check_due ->
#       [A 3 days due 2026-09-23T00:00:00+07:00, B 3 days 09-23T00:00, A 1 day
#       09-25T00:00, B 1 day 09-25T00:00]; lần hai -> []. A đổi hạn sang
#       2026-09-26 -> [A 3 days, deadline 2026-09-26, due
#       2026-09-24T00:00:00+07:00]. pending -> 5 mục theo due_at. ack
#       387169db-... -> 200 acknowledged_at "2026-09-25T08:39:54+07:00"; sau
#       1,1 s ack lại -> giống hệt; không còn trong pending; UNKNOWN_ID và
#       not-an-id -> 404 ERR_NOT_FOUND. Cài đặt tóm tắt at_time "08:40" lưu lúc
#       08:39:55 -> check_due trước mốc [] ; sau mốc -> [{"kind":
#       "periodic_digest","due_at":"2026-09-25T08:40:00+07:00","deadline_item":
#       null,"digest":{"open_count":4,"upcoming":[D 2026-09-24, B 2026-09-25,
#       A 2026-09-26]}}]; lần hai []. Đóng stdin -> exit code 0, stdout
#       [b'READY\n']. Lần chạy 2 cùng tệp: settings và pending (5 mục) giống
#       hệt; check_due -> []. Đơn F hạn hôm nay, hai check_due đồng thời ->
#       [] và [F 3 days, F 1 day]. Khi khóa: POST /reminders/checks -> 500
#       reason "manage_commission: Storage failed. {'reason': 'database is
#       locked'}"; GET pending, GET settings -> 500 reason "database is
#       locked"; nhả khóa -> pending 200, 7 mục. Đóng stdin -> exit code 0.
#       1 passed.
#     recorded_at: 2026-09-25T08:40:26+07:00
#   - claim: >
#       Kiểm thử cấp workflow (ráp nối bằng Backend.wire_workflows, hai lời gọi
#       in_process là thật, dữ liệu dựng qua http của các workflow khác, chỉ
#       đồng hồ là FakeClock +07:00) đạt: mặc định; 32 dạng cài đặt sai (kể
#       cả mốc 366 days và 8761 hours) và 6 dạng thân sai -> 400, không lưu
#       gì; mốc đúng cận 365 days và 8760 hours được nhận, vượt cận 366 days
#       và 8761 hours -> 400; nhịp theo tuần có weekday và every
#       = 2; lỡ ba mốc -> một bản, due_at là mốc gần nhất; lưu lại thì nhịp bắt
#       đầu lại; at_time trùng lúc lưu là mốc đầu (theo ngày và theo tuần),
#       muộn 1 giây thì sang kỳ sau; không có đơn mở -> không có bản tóm tắt
#       và mốc đó mất hẳn; nội dung tóm tắt (open_count 6, upcoming có quá hạn,
#       on_hold, chưa đặt giai đoạn, hòa theo commission_id, title lấy lúc kiểm
#       tra); sát biên: 23:59:59 trước mốc -> không, đúng (kết thúc - mốc) ->
#       có, đúng lúc kết thúc -> không, 1 giây trước kết thúc -> có; thời điểm
#       đã qua khi thành có thể -> sinh ngay; đổi hạn chót -> nhắc lại; thêm
#       mốc sau -> chỉ mốc mới ({24 hours} không lặp {1 day}); chỉ đơn mở;
#       thứ tự khi trộn tóm tắt và nhắc hạn; mốc 8760 hours trên hạn gần và
#       trên 9999-12-31; mốc vượt cận ghi thẳng vào bảng riêng không gây lỗi
#       (không biểu diễn được thì bỏ qua); ack hai lần, 404, lời nhắc chờ không hết hạn khi tắt, khi hủy
#       đơn hay khi quá hạn; 4 check_due đồng thời -> 9 lời nhắc, mỗi lời một
#       lần; khóa DB -> 500 ở cả 5 điểm; lỗi sau lời gọi update_progress và ở
#       bảng riêng -> 500, không ghi gì; lỗi lập trình không thành 500; không
#       khóa ngoại; phiên bản bảng mới hơn -> StorageVersionError.
#     how: >
#       cd Backend; env\Scripts\python.exe -m pytest -q workflows/send_reminder
#     result: >
#       67 passed (Python 3.13.12 của Backend/env, Windows 11).
#     recorded_at: 2026-09-25T09:30:55+07:00
#
# NOTES: []
# ===WCA-CHECKPOINT-END===
"""Services of send_reminder: every business decision of the workflow.

Every decision about time lives here: when the digest cadence starts and
which occurrence is due, when a deadline ends and when each lead time's
reminder is due, what "open" means, what has already been produced. "Now"
and the local time zone come from the clock handed over by the Main.
"""

import uuid
from datetime import date, datetime, time, timedelta

# StorageIOError is raised by the Adapters and passes through unchanged;
# it is re-exported so the Routers depend on Services only.
from .adapters import ReminderRepository, ReminderSources, StorageIOError, SystemClock  # noqa: F401
from .entities import (
    CommissionEntry,
    DeadlineItem,
    DeadlineReminderKey,
    DeadlineSettings,
    Digest,
    DigestItem,
    LeadTime,
    Notification,
    NotificationAck,
    PeriodicSettings,
    ReminderSettings,
    SettingsState,
    StoredSettings,
)


class NotificationNotFoundError(Exception):
    def __init__(self, notification_id: str) -> None:
        super().__init__(f"notification {notification_id} does not exist")
        self.notification_id = notification_id


# Default settings, returned while the settings were never saved
# (data_schema.yaml, send_reminder.description). A value of the contract, not
# a tuning parameter: it is not in configs.yaml.
DEFAULT_SETTINGS = ReminderSettings(
    periodic=PeriodicSettings(enabled=False, every=1, unit="weeks", at_time="09:00", weekday=1),
    deadline=DeadlineSettings(enabled=False, lead_times=(LeadTime(amount=1, unit="days"),)),
)

# A commission is open unless its stage kind is one of these. A commission
# with no stage set counts as the first stage of the catalog, which is
# 'active' (progress_entry_record): open.
_CLOSED_KINDS = frozenset({"finished", "cancelled"})

# Order of kind when two reminders share due_at (stable order, see _order).
_KIND_ORDER = {"deadline": 0, "periodic_digest": 1}


def _lead_hours(lead: LeadTime) -> int:
    # 1 day = 24 hours.
    return lead.amount * 24 if lead.unit == "days" else lead.amount


def _order(n: Notification) -> tuple:
    # Oldest due_at first (the real instant); ties: deadline reminders before
    # the digest, then commission_id, then the longer lead first (it was due
    # first in the commission's own sequence), then notification_id.
    item = n.deadline_item
    return (
        n.due_at.timestamp(),
        _KIND_ORDER[n.kind],
        item.commission_id if item else "",
        -_lead_hours(item.lead) if item else 0,
        n.notification_id,
    )


class SendReminderService:
    def __init__(self, repo: ReminderRepository, sources: ReminderSources, clock: SystemClock) -> None:
        # clock: the machine clock (SystemClock) in the real process; tests
        # may hand over another object with the same three methods.
        self._repo = repo
        self._sources = sources
        self._clock = clock

    # --- settings ------------------------------------------------------------

    def get_settings(self) -> StoredSettings:
        state = self._repo.fetch_state()
        if state is None:
            return StoredSettings(settings=DEFAULT_SETTINGS, updated_at=None)
        return StoredSettings(settings=state.settings, updated_at=state.updated_at)

    def edit_settings(self, settings: ReminderSettings) -> StoredSettings:
        # Saving replaces every setting and restarts the digest cadence, even
        # when nothing changed: the cadence starts at updated_at and no
        # occurrence has been dealt with yet. Deadline reminders already
        # produced stay produced.
        now = self._clock.now()
        self._repo.save_state(SettingsState(settings=settings, updated_at=now, digest_handled_through=None))
        return StoredSettings(settings=settings, updated_at=now)

    # --- time rules ----------------------------------------------------------

    def _at(self, day: date, at_time: str) -> datetime:
        hh, mm = at_time.split(":")
        return self._clock.at_local(datetime.combine(day, time(int(hh), int(mm))))

    def _first_digest_date(self, saved_at: datetime, periodic: PeriodicSettings) -> date:
        # The first moment at or after saving that matches at_time (and
        # weekday, for weeks). Within 8 days one always matches.
        saved_day = self._clock.to_local(saved_at).date()
        for offset in range(8):
            day = saved_day + timedelta(days=offset)
            if periodic.unit == "weeks" and day.isoweekday() != periodic.weekday:
                continue
            if self._at(day, periodic.at_time) >= saved_at:
                return day
        raise AssertionError("no digest occurrence within 8 days")  # unreachable

    def _latest_digest_occurrence(self, state: SettingsState, now: datetime) -> datetime | None:
        # Occurrence k is at at_time, local time, on the first occurrence's
        # date + k * every days (or weeks). The latest one at or before now;
        # None before the first.
        periodic = state.settings.periodic
        first_day = self._first_digest_date(state.updated_at, periodic)
        step_days = periodic.every * (7 if periodic.unit == "weeks" else 1)
        if self._at(first_day, periodic.at_time) > now:
            return None
        k = (self._clock.to_local(now).date() - first_day).days // step_days
        while k >= 0:
            occurrence = self._at(first_day + timedelta(days=k * step_days), periodic.at_time)
            if occurrence <= now:
                return occurrence
            k -= 1
        return None

    def _deadline_end(self, deadline: date) -> datetime | None:
        # A deadline ends at 00:00 local time of the day after the deadline
        # date. None: beyond the last representable day (it never ends).
        try:
            next_day = deadline + timedelta(days=1)
        except OverflowError:
            return None
        return self._clock.at_local(datetime.combine(next_day, time()))

    def _reminder_due(self, deadline: date, end: datetime | None, lead_hours: int) -> datetime | None:
        # Due at the deadline's end minus the lead (1 day = 24 hours). None:
        # the moment falls before the first representable instant.
        try:
            if end is not None:
                return end - timedelta(hours=lead_hours)
            start = self._clock.at_local(datetime.combine(deadline, time()))
            return start + timedelta(hours=24 - lead_hours)
        except OverflowError:
            return None

    # --- check_due -----------------------------------------------------------

    def check_due(self) -> list[Notification]:
        """Produce the reminders that became due since the last check and
        return them; each is returned by exactly one call."""
        now = self._clock.now()
        # Calls to other workflows first: they cannot run inside the write
        # scope. Their answer may be a little older than the scope.
        commissions = self._sources.fetch_commissions()
        kinds = {e.commission_id: e.stage_kind for e in self._sources.fetch_progress()}
        open_commissions = [c for c in commissions if kinds.get(c.commission_id) not in _CLOSED_KINDS]

        # Decide and write in one transaction: two concurrent checks are
        # judged one after the other, the second one seeing what the first
        # one produced.
        produced: list[Notification] = []
        with self._repo.write_scope() as scope:
            state = scope.fetch_state()
            if state is None:  # never saved: the defaults disable both kinds
                return []
            settings = state.settings
            if settings.periodic.enabled:
                digest = self._due_digest(state, open_commissions, now)
                if digest is not None:
                    occurrence, notification = digest
                    scope.set_digest_handled_through(occurrence)
                    if notification is not None:
                        produced.append(notification)
            if settings.deadline.enabled:
                already = scope.fetch_sent_keys()
                for key, notification in self._due_deadline_reminders(settings.deadline, open_commissions, already, now):
                    scope.insert_sent_key(key, notification.notification_id)
                    produced.append(notification)
            produced.sort(key=_order)
            for notification in produced:
                scope.insert_notification(notification)
        return produced

    def _due_digest(
        self, state: SettingsState, open_commissions: list[CommissionEntry], now: datetime
    ) -> tuple[datetime, Notification | None] | None:
        # Only the latest occurrence not dealt with yet counts; older missed
        # ones are never produced. With nothing open, the occurrence is dealt
        # with but nothing is produced (and it is not produced later).
        occurrence = self._latest_digest_occurrence(state, now)
        if occurrence is None:
            return None
        if state.digest_handled_through is not None and occurrence <= state.digest_handled_through:
            return None
        if not open_commissions:
            return occurrence, None
        upcoming = sorted(
            (c for c in open_commissions if c.deadline is not None),
            key=lambda c: (c.deadline, c.commission_id),
        )
        return occurrence, Notification(
            notification_id=str(uuid.uuid4()),
            kind="periodic_digest",
            due_at=self._clock.to_local(occurrence),
            deadline_item=None,
            digest=Digest(
                open_count=len(open_commissions),
                upcoming=tuple(DigestItem(commission_id=c.commission_id, title=c.title, deadline=c.deadline) for c in upcoming),
            ),
            created_at=now,
            acknowledged_at=None,
        )

    def _due_deadline_reminders(
        self,
        deadline_settings: DeadlineSettings,
        open_commissions: list[CommissionEntry],
        already: set[DeadlineReminderKey],
        now: datetime,
    ) -> list[tuple[DeadlineReminderKey, Notification]]:
        # For each open commission with a deadline and each lead time of the
        # current settings: produced once when due and the deadline has not
        # ended. "Already produced" is remembered per (commission, deadline,
        # lead duration): a changed deadline is a new key, so its reminders
        # are re-armed; a lead time added later is a new key too.
        due: list[tuple[DeadlineReminderKey, Notification]] = []
        for commission in open_commissions:
            if commission.deadline is None:
                continue
            end = self._deadline_end(commission.deadline)
            if end is not None and now >= end:
                continue
            for lead in deadline_settings.lead_times:
                hours = _lead_hours(lead)
                key = DeadlineReminderKey(commission_id=commission.commission_id, deadline=commission.deadline, lead_hours=hours)
                if key in already:
                    continue
                due_at = self._reminder_due(commission.deadline, end, hours)
                if due_at is None or due_at > now:
                    continue
                due.append((key, Notification(
                    notification_id=str(uuid.uuid4()),
                    kind="deadline",
                    due_at=self._clock.to_local(due_at),
                    deadline_item=DeadlineItem(
                        commission_id=commission.commission_id,
                        title=commission.title,
                        deadline=commission.deadline,
                        lead=lead,
                    ),
                    digest=None,
                    created_at=now,
                    acknowledged_at=None,
                )))
        return due

    # --- pending and acknowledgement ----------------------------------------

    def list_pending(self) -> list[Notification]:
        # Every produced, unacknowledged reminder; never expires (not even
        # when its commission is cancelled later or its kind is disabled).
        return sorted(self._repo.fetch_pending(), key=_order)

    def acknowledge(self, notification_id: str) -> NotificationAck:
        # Acknowledging twice is not an error: the first acknowledged_at stays.
        acknowledged_at = self._repo.acknowledge(notification_id, self._clock.now())
        if acknowledged_at is None:
            raise NotificationNotFoundError(notification_id)
        return NotificationAck(notification_id=notification_id, acknowledged_at=acknowledged_at)

