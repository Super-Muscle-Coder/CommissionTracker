# ===WCA-CHECKPOINT-START===
# workflow: view_income_report
# clause: clause_b_backend
# component: services
# last_updated_by: coding-agent@2026-09-27#5
# last_updated_at: 2026-09-27T22:20:00+07:00
#
# EXPERIENCES:
#   - id: view_income_report-EXP-001
#     content: >
#       Quyết định nghiệp vụ ở Services, chỉ dùng int. Ngày của một khoản là
#       paid_at.date() của datetime đã đọc kèm độ lệch (ngày ghi trong
#       paid_at, không quy đổi múi giờ); tháng là YYYY-MM của ngày đó. Kỳ gồm
#       cả hai đầu; period_from sau period_to -> InvalidPeriodError (400), xét
#       trước khi gọi ai. Theo đơn vị tiền của khoản: received_net =
#       incoming - refund trong kỳ (kể cả tip, kể cả đơn đã hủy); refunded =
#       tổng refund trong kỳ (kể cả hoàn tip). outstanding theo đơn vị tiền
#       của agreed_price: đơn đang nợ là mọi đơn trong commission_index trừ
#       đơn có stage_kind 'cancelled' trên board (đơn không có trên board là
#       đang nợ, vì giai đoạn đầu của catalog là active); nợ của một đơn =
#       agreed - (incoming - refund) các khoản của đơn có kind khác 'tip',
#       trên toàn sổ (ledger đã bỏ khoản hủy), không phụ thuộc kỳ; cộng giữ
#       dấu. currencies = hợp của các đơn vị tiền có khoản trong kỳ và có đơn
#       đang nợ, xếp theo mã; by_month chỉ các tháng có khoản, cũ trước.
#       generated_at lấy trước ba lời gọi, giờ địa phương kèm độ lệch, tới giây.
#   - id: view_income_report-EXP-002
#     content: >
#       Luật số nguyên tính ra: chỉ xét các số của output (received_net_minor,
#       refunded_minor, outstanding_minor của từng đơn vị tiền, và từng tháng
#       của by_month), trị tuyệt đối không quá 2^53-1. Vượt ->
#       ReportOutOfRangeError (409), details {fields: ["USD.outstanding_minor",
#       "USD.by_month[2026-09].received_net_minor", ...]}, không trả báo cáo dở
#       dang. Nợ của một đơn riêng lẻ không bị xét (không có trong output):
#       một đơn mà get_balance trả 409 vẫn được cộng, miễn tổng nằm trong
#       khoảng (xem view_income_report-EXP-004).
#   - id: view_income_report-EXP-003
#     content: >
#       Không lưu trữ: không nhận db_connection, không ensure_storage, không
#       bảng, không bảng phiên bản. Adapters (IncomeSources) chỉ bọc ba lối
#       vào in_process do Main trao (list_commission_index, list_progress_board,
#       list_payment_ledger) theo main-EXP-004, rồi chuyển dữ liệu thành
#       Entities của chính workflow này. Label 500 -> StorageIOError của
#       view_income_report (reason có tiền tố tên workflow được gọi); label
#       khác và lỗi khác nổi lên nguyên vẹn. Routers kiểm tra định dạng: hai
#       tham số query bắt buộc, khớp YYYY-MM-DD và là ngày có thật (2026-02-30
#       -> 400); tham số query thừa bị bỏ qua như các workflow khác. Main ráp
#       nối ở Order 6, sau update_progress.
#   - id: view_income_report-EXP-004
#     content: >
#       Luật số nguyên tính ra chỉ áp cho số có trong output (Orchestrator đã
#       xác nhận, không cần sửa hợp đồng): nợ của một đơn riêng lẻ không có
#       trong income_report nên không bị xét. Một đơn mà get_balance của
#       record_payment trả 409 vẫn được cộng giữ dấu vào outstanding_minor;
#       báo cáo trả 200 với tổng chính xác nếu tổng nằm trong khoảng, chỉ
#       trả 409 khi chính tổng vượt khoảng.
#     derived_from: view_income_report-EXP-002
#   - id: view_income_report-EXP-005
#     content: >
#       Giới hạn đã biết, được chấp nhận (plan phiên backend #6, Orchestrator
#       xác nhận): ba lời gọi in_process không nằm chung một giao dịch
#       (main-EXP-008). Một khoản hay một đơn được ghi đúng giữa hai lời gọi có
#       thể làm báo cáo lệch khoản đó; lần gọi sau luôn đúng.
#
# UNSOLVED_PROBLEMS: []
#
# EVIDENCE:
#   - claim: >
#       Trên tiến trình Backend.py thật với tệp SQLite thật: báo cáo đúng từng
#       con số của VND và USD trên dữ liệu 5 đơn, 11 khoản, ba tháng (tip, đơn
#       hủy, đơn delivered còn nợ, đơn trả dư, khoản đã hủy); ngày theo độ
#       lệch của chính paid_at; kỳ một ngày; đơn vị tiền chỉ có nợ có mặt với
#       by_month []; không có gì -> currencies []; 400 cho thiếu tham số, sai
#       định dạng, 2026-02-30, period_from sau period_to; lỗi lưu trữ thật ->
#       500; kết quả giống hệt sau khởi động lại (trừ generated_at); hai đơn
#       USD 2^53-1 -> 409.
#     how: >
#       cd Backend; env\Scripts\python.exe -m pytest -s -v
#       tests/test_backend_process.py -k income (Python 3.13.12 của
#       Backend/env, Windows 11; tiến trình con thật khởi động bằng CT_*, cổng
#       trống ngẫu nhiên, DB trong thư mục tạm; dữ liệu dựng qua các điểm
#       giao tiếp http của manage_client, manage_commission, update_progress,
#       record_payment; ">>" là yêu cầu, "<<" là phản hồi thô). Dữ liệu (hàm
#       report_scenario): A VND 1000000 delivered, khoản 07-25 other 100000,
#       08-10 deposit 500000, 2026-09-30T23:30:00-05:00 milestone 300000; B VND
#       2000000 chưa đặt giai đoạn, 2026-10-01T00:30:00+07:00 deposit 1000000,
#       10-15 final 1200000, 10-16 tip 150000; C VND 800000 cancelled, 08-20
#       deposit 300000, 09-05 refund 100000; D USD 50000 sketch, 09-12 deposit
#       20000, 09-13 milestone 10000 đã hủy; E USD 30000 on_hold, không khoản.
#       Tính tay kỳ 08-01..10-31: VND received_net = 500000 + 300000 +
#       1000000 + 1200000 + 150000 + 300000 - 100000 = 3350000; refunded
#       100000; by_month 08: 500000 + 300000 = 800000, 09: 300000 - 100000 =
#       200000, 10: 1000000 + 1200000 + 150000 = 2350000; outstanding = A
#       (1000000 - 900000 = 100000) + B (2000000 - 2200000 = -200000, bỏ tip),
#       C hủy không tính = -100000. USD received_net 20000 (khoản hủy không
#       tính), refunded 0, by_month 09: 20000, outstanding = D 30000 + E 30000
#       = 60000. Lỗi lưu trữ: một kết nối sqlite3 khác giữ BEGIN EXCLUSIVE
#       trên cùng tệp. 409: tiến trình riêng, hai đơn USD agreed 2^53-1, không
#       khoản.
#     result: >
#       Chưa có dữ liệu, kỳ 2026-01-01..2026-12-31 -> 200 currencies [].
#       Kỳ 2026-08-01..2026-10-31 -> 200 {"currencies":[{"currency":"USD",
#       "received_net_minor":20000,"refunded_minor":0,"outstanding_minor":60000,
#       "by_month":[{"month":"2026-09","received_net_minor":20000}]},{"currency":
#       "VND","received_net_minor":3350000,"refunded_minor":100000,
#       "outstanding_minor":-100000,"by_month":[{"month":"2026-08",
#       "received_net_minor":800000},{"month":"2026-09","received_net_minor":
#       200000},{"month":"2026-10","received_net_minor":2350000}]}],
#       "generated_at":"2026-09-24T22:03:12+07:00"}. Kỳ 09-01..09-30 -> VND
#       received_net 200000, refunded 100000, by_month [09: 200000] (có khoản
#       09-30T23:30-05:00, không có khoản 10-01T00:30+07:00); USD 20000. Kỳ
#       10-01..10-01 -> VND 1000000, by_month [10: 1000000]; USD 0, by_month
#       []. Kỳ 09-30..09-30 -> VND 300000, by_month [09: 300000]; USD 0/0/60000,
#       by_month []. Kỳ 09-13..09-13 (ngày của khoản đã hủy) -> USD 0, by_month
#       []. 400 ERR_VALIDATION: không tham số (loc period_from, period_to "Field
#       required"); chỉ period_from; chỉ period_to; 2026-9-01 ("must be an ISO
#       8601 calendar date YYYY-MM-DD"); 2026-02-30 ("day is out of range for
#       month"); 2026-10-01..2026-09-30 ("period_from must not be after
#       period_to."). Khi khóa: 500 {"code":"ERR_STORAGE_IO","message":"Storage
#       failed.","details":{"reason":"manage_commission: Storage failed.
#       {'reason': 'database is locked'}"}}; nhả khóa -> 200 giống hệt. Đóng
#       stdin -> exit code 0, stdout [b'READY\n']. Lần chạy 2 cùng tệp -> 200
#       giống hệt, generated_at 2026-09-24T22:03:21+07:00. Tiến trình 409: một
#       đơn -> 200 USD outstanding_minor 9007199254740991, by_month []; hai đơn
#       -> 409 {"code":"ERR_OUT_OF_RANGE","message":"A total of the report falls
#       outside the integer range; no report is returned.","details":{"fields":
#       ["USD.outstanding_minor"]}}. 2 passed.
#     recorded_at: 2026-09-24T22:03:23+07:00
#   - claim: >
#       Lỗi lưu trữ thật sau lời gọi thứ hai (list_progress_board của
#       update_progress) và thứ ba (list_payment_ledger của record_payment),
#       trên tiến trình Backend.py thật: get_income_report trả 500 +
#       ERR_STORAGE_IO, details.reason có tiền tố đúng tên workflow bị gọi; hết
#       lỗi thì báo cáo trả 200 giống hệt trước (trừ generated_at).
#     how: >
#       cd Backend; env\Scripts\python.exe -m pytest -s -v
#       tests/test_backend_process.py -k second_and_third (Python 3.13.12 của
#       Backend/env, Windows 11; tiến trình con thật khởi động bằng CT_*, DB
#       trong thư mục tạm; dữ liệu report_scenario như EVIDENCE trên). Trong
#       lúc tiến trình chạy, kiểm thử (không phải code workflow) mở một kết nối
#       sqlite3 riêng, ALTER TABLE stage_change RENAME TO stage_change_hidden,
#       gọi GET /reports/income?period_from=2026-08-01&period_to=2026-10-31,
#       rồi đổi tên lại và gọi lại; làm tương tự với bảng payment. Lời gọi thứ
#       nhất (list_commission_index) vẫn thành công ở cả hai lượt, lượt payment
#       thì cả lời gọi thứ hai cũng thành công.
#     result: >
#       Trước: 200, USD 20000/0/60000 by_month [09: 20000], VND
#       3350000/100000/-100000 by_month [08: 800000, 09: 200000, 10: 2350000].
#       stage_change bị đổi tên -> 500 {"code":"ERR_STORAGE_IO","message":
#       "Storage failed.","details":{"reason":"update_progress: Storage failed.
#       {'reason': 'no such table: stage_change'}"}}; đổi lại -> 200 giống hệt.
#       payment bị đổi tên -> 500 {"code":"ERR_STORAGE_IO","message":"Storage
#       failed.","details":{"reason":"record_payment: Storage failed.
#       {'reason': 'no such table: payment'}"}}; đổi lại -> 200 giống hệt. Đóng
#       stdin -> exit code 0, stdout [b'READY\n']. 1 passed.
#     recorded_at: 2026-09-24T22:27:58+07:00
#   - claim: >
#       Kiểm thử cấp workflow (ráp nối bằng Backend.wire_workflows, ba lời gọi
#       in_process là thật, dữ liệu dựng qua http của các workflow khác) đạt:
#       12 dạng kỳ sai -> 400; báo cáo rỗng; đơn chưa có khoản nợ đúng agreed;
#       tổng theo đơn vị tiền và tháng, xếp theo mã; ngày theo độ lệch của
#       paid_at; outstanding bỏ tip, không phụ thuộc kỳ, delivered vẫn nợ, đơn
#       hủy không nợ, trả dư làm giảm; khoản hủy không tính; refunded dương,
#       received_net âm được; đơn vị tiền chỉ có khoản của đơn hủy vẫn có mặt;
#       409 cho outstanding và cho received_net cùng tháng; nợ riêng lẻ vượt
#       khoảng nhưng tổng trong khoảng -> 200; không tạo bảng nào; khóa DB ->
#       500; ánh xạ label 500 của từng lời gọi (hàm giả lập lối vào in_process,
#       chỉ ở kiểm thử Adapters) -> StorageIOError, label khác nổi lên; lỗi lập
#       trình không thành 500.
#     how: >
#       cd Backend; env\Scripts\python.exe -m pytest -q workflows/view_income_report
#     result: >
#       29 passed.
#     recorded_at: 2026-09-24T21:58:00+07:00
#
# NOTES: []
# ===WCA-CHECKPOINT-END===
"""Services of view_income_report: every business decision of the workflow.

Every number of income_report is computed here, in int only, from the three
lists the Adapters bring back; nothing is stored.
"""

from collections import defaultdict
from datetime import date, datetime

# StorageIOError is raised by the Adapters and passes through unchanged;
# it is re-exported so the Routers depend on Services only.
from .adapters import IncomeSources, StorageIOError  # noqa: F401
from .entities import CurrencyTotals, IncomeReport, LedgerEntry, MonthTotal


class InvalidPeriodError(Exception):
    def __init__(self, period_from: date, period_to: date) -> None:
        super().__init__(f"period_from {period_from} is after period_to {period_to}")
        self.period_from = period_from
        self.period_to = period_to


class ReportOutOfRangeError(Exception):
    """A total of the report falls outside the integer range of clause_a_common."""

    def __init__(self, fields: list[str]) -> None:
        super().__init__(f"{', '.join(fields)} would fall outside the integer range")
        self.fields = fields


# clause_a_common.mandatory_rules (Data Schema 3.0.0): a computed integer in
# any output lies within -(2^53-1)..2^53-1; it is never rounded, clamped or
# wrapped.
_MAX_COMPUTED_INTEGER = 2**53 - 1


def _now() -> datetime:
    # Local wall-clock time with its UTC offset (clause_a_common.formats.timestamp).
    return datetime.now().astimezone().replace(microsecond=0)


def _signed(payment: LedgerEntry) -> int:
    # Money received counts up, money refunded counts down.
    return payment.amount.amount_minor if payment.direction == "incoming" else -payment.amount.amount_minor


def _paid_date(payment: LedgerEntry) -> date:
    # The calendar date written in paid_at, in its own UTC offset: no
    # conversion to another time zone.
    return payment.paid_at.date()


def _month(day: date) -> str:
    return f"{day.year:04d}-{day.month:02d}"


class ViewIncomeReportService:
    def __init__(self, sources: IncomeSources) -> None:
        self._sources = sources

    def report(self, period_from: date, period_to: date) -> IncomeReport:
        # Both days are included; a period that ends before it starts is invalid.
        if period_from > period_to:
            raise InvalidPeriodError(period_from, period_to)

        # The three reads are separate calls, not one transaction: a payment
        # written between them may be missing from, or extra in, one total.
        generated_at = _now()
        commissions = self._sources.fetch_commissions()
        progress = self._sources.fetch_progress()
        payments = self._sources.fetch_payments()

        # Payments in the period, per currency of the payment (tips and
        # payments of cancelled commissions included).
        received_net: dict[str, int] = defaultdict(int)
        refunded: dict[str, int] = defaultdict(int)
        by_month: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
        for p in payments:
            day = _paid_date(p)
            if not period_from <= day <= period_to:
                continue
            currency = p.amount.currency
            received_net[currency] += _signed(p)
            if p.direction == "refund":
                refunded[currency] += p.amount.amount_minor
            by_month[currency][_month(day)] += _signed(p)

        # Outstanding, whatever the period: record_payment's rule (agreed
        # minus the non-voided payments whose kind is not 'tip'), summed with
        # its sign over every owing commission, per currency of the agreed
        # price. Owing: every commission whose stage is not of kind
        # 'cancelled'; one with no stage set counts as the first stage of
        # the catalog, which is active.
        cancelled = {e.commission_id for e in progress if e.stage_kind == "cancelled"}
        paid_toward_price: dict[str, int] = defaultdict(int)
        for p in payments:
            if p.kind != "tip":
                paid_toward_price[p.commission_id] += _signed(p)
        outstanding: dict[str, int] = defaultdict(int)
        for c in commissions:
            if c.commission_id in cancelled:
                continue
            owed = c.agreed_price.amount_minor - paid_toward_price[c.commission_id]
            outstanding[c.agreed_price.currency] += owed

        currencies = [
            CurrencyTotals(
                currency=currency,
                received_net_minor=received_net[currency],
                refunded_minor=refunded[currency],
                outstanding_minor=outstanding[currency],
                by_month=[
                    MonthTotal(month=month, received_net_minor=total)
                    for month, total in sorted(by_month[currency].items())
                ],
            )
            for currency in sorted(set(received_net) | set(outstanding))
        ]

        # Computed-integer rule: no partial report when any total cannot be
        # represented.
        fields = []
        for t in currencies:
            for name in ("received_net_minor", "refunded_minor", "outstanding_minor"):
                if abs(getattr(t, name)) > _MAX_COMPUTED_INTEGER:
                    fields.append(f"{t.currency}.{name}")
            for m in t.by_month:
                if abs(m.received_net_minor) > _MAX_COMPUTED_INTEGER:
                    fields.append(f"{t.currency}.by_month[{m.month}].received_net_minor")
        if fields:
            raise ReportOutOfRangeError(fields)

        return IncomeReport(
            period_from=period_from,
            period_to=period_to,
            currencies=currencies,
            generated_at=generated_at,
        )
