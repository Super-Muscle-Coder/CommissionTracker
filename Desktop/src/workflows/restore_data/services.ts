// ===WCA-CHECKPOINT-START===
// workflow: restore_data
// clause: clause_d_desktop
// component: services
// last_updated_by: coding-agent@2026-10-08#1
// last_updated_at: 2026-10-08T14:59:36.1924815+07:00
//
// EXPERIENCES:
//   - id: restore_data-EXP-001
//     content: >
//       Bố cục và ráp nối (phiên 35, pha 1). src/workflows/restore_data/ có bốn
//       tệp: entities.ts (hình dạng, kiểu kết quả của Adapters, RestoreDataConfig),
//       adapters.ts (class RestoreDataAdapters: hai lời gọi http tới backup_data,
//       thư mục và tệp bản ghi, đồng hồ), services.ts (khối này, RestoreDataService
//       với prepare, status, cancel) và routers.ts (ba trình xử lý ipc). Configs
//       là configs/restore_data.json (CLAUDE.md mục 4): chỉ Main đọc
//       (loadRestoreDataConfig), rồi tạo Adapters, Services, Routers và gọi
//       registerRestoreDataRouters SAU khi backend READY và TRƯỚC khi tạo cửa sổ.
//       Main tiêm ipcMain vào Routers, nên routers.ts chỉ import kiểu của
//       electron và kiểm thử nạp nó được không cần Electron. Ba địa chỉ, bảy nhãn và
//       năm mã lỗi trong restore_data.json là giá trị ranh giới của API Contract
//       5.0.0 (clause_d_desktop.restore_data); giá trị nội bộ: safety-backups,
//       restore-pending.json, hậu tố .tmp, hạn chờ http 30000 ms (đo ở
//       restore_data-EVIDENCE: mỗi lời gọi 12-90 ms). Kiểm khung gửi (cửa sổ chính,
//       origin bằng ui_origin) là bản sao riêng trong routers.ts, không dùng chung
//       code với native_dialogs (05-edge-cases.md Bước 5.3: không thỏa điều kiện
//       đưa vào shared/).
//   - id: restore_data-EXP-002
//     content: >
//       Trình tự và nhãn của prepare (f_restore.md mục 2). Routers kiểm định dạng
//       trước: archive_path là chuỗi tuyệt đối không rỗng, không khóa thừa; sai thì
//       trả 400 ERR_VALIDATION như một CÂU TRẢ LỜI (details.errors[0].loc =
//       ['archive_path']) và KHÔNG xóa bản ghi cũ. Từ Services: (1) xóa bản ghi
//       đang chờ; (2) prepare_restore: 404 thành 404 (details.archive_path), 500
//       hay không tới được hay trả sai hình dạng hay hết hạn chờ thành 503
//       ERR_SERVICE_UNAVAILABLE (details.reason), is_valid hoặc is_compatible
//       false thành 409 ERR_INCOMPATIBLE_BACKUP (details.reason lấy từ reason của
//       restore_staging); (3-4) mkdir safety-backups rồi create_backup purpose
//       pre_restore, mọi thất bại (mkdir hay backend 400/500 hay không tới được)
//       thành 424 ERR_STORAGE_IO; (5) ghi restore-pending.json nguyên tử (tệp .tmp,
//       sync, đổi tên), hỏng thành 500 ERR_STORAGE_IO và bản sao lưu an toàn ở
//       bước 4 được giữ; (6) 200 với đúng năm trường. Tệp bản ghi giữ thêm
//       staged_db_path (đường dẫn tệp chờ của backup_data), không bao giờ trả ra.
//       Mọi nhãn khác 200: không có bản ghi. Hai điều plan để mở: (a) bước 1 xóa
//       hỏng (ví dụ có thư mục trùng tên tệp bản ghi) thì trả 500 ERR_STORAGE_IO,
//       không tạo bản sao lưu an toàn; hợp đồng không nói nhãn riêng cho ca này.
//       (b) staging hợp lệ nhưng app_version, created_at hoặc staged_db_path là
//       null được coi là backend trả thiếu và thành 503.
//   - id: restore_data-EXP-003
//     content: >
//       status và cancel. status đọc tệp bản ghi: không có tệp thì pending null,
//       có thì năm trường (cắt staged_db_path), tệp đọc không được (thư mục thay
//       chỗ tệp, JSON hỏng, sai hình dạng) thì 500 ERR_STORAGE_IO; việc dọn bản
//       ghi hỏng để dành cho pha 2. cancel chỉ xóa tệp bản ghi: có tệp (kể cả tệp
//       hỏng) thì canceled true, không có tệp thì false, xóa không được thì 500;
//       không đụng restore-staging (của backup_data) hay bản sao lưu an toàn. Đối
//       số của status, cancel là {} hoặc không có; mọi giá trị khác bị TỪ CHỐI
//       (Promise bị từ chối "call refused (the argument is not an empty object)"),
//       vì hợp đồng không có nhãn 400 cho hai lối vào này. Cũng bị từ chối: khung
//       gửi sai (origin khác, cửa sổ khác); bridge còn từ chối địa chỉ chưa hiện
//       thực như restore:start ("ipc address not implemented"). Lỗi lập trình
//       (ngoại lệ không phải lỗi hệ thống hay lỗi mạng) nổi lên thành lỗi thật,
//       không bị giả làm 500.
//   - id: restore_data-EXP-004
//     content: >
//       Cách dựng các ca hỏng trong kiểm thử (tests/restore_data.spec.ts). 424
//       thật: đặt sẵn một TỆP tên safety-backups ở chỗ thư mục phải có (mkdir báo
//       EEXIST). 500 thật ở bước 5: đặt sẵn một THƯ MỤC tên restore-pending.json.tmp
//       (mở tệp tạm báo EISDIR); bước 1 lúc đó vẫn qua, và việc có thêm đúng một
//       bản sao lưu an toàn chứng tỏ lỗi xảy ra ở bước 5. Một thư mục tên
//       restore-pending.json thì làm bước 1 hỏng (EPERM khi xóa), không có bản sao
//       lưu an toàn nào. 503 và 424 do backend: tests/fixtures/fake_backend_restore.py
//       (chạy qua cờ --ct-test-backend-script, chọn bằng CT_FAKE_RESTORE:
//       prepare500, preparebad, create500). 503 do không tới được và do hết hạn
//       chờ: kiểm Adapters trực tiếp với cổng đóng và với một máy chủ nhận kết
//       nối mà không trả lời (hạn chờ rút còn 300 ms trong bản sao cấu hình của ca
//       đó). Ca 409 bản mới hơn: lấy bản sao lưu thật rồi ghi lại manifest.json với
//       app_version 9.9.9 bằng zipfile của Python (interpreter của Backend).
//   - id: restore_data-EXP-005
//     content: >
//       Cho pha 2 (phiên 36) và phiên giao diện. (1) Mỗi lần prepare thành công
//       tạo thêm MỘT bản sao lưu an toàn trong safety-backups và không dọn bản cũ
//       (Project Owner bấm lặp trên trang thử, thấy bảy tệp); đúng đặc tả, nhưng
//       Orchestrator nên cân nhắc việc dọn ở pha 2. (2) Tên tệp bản sao lưu an
//       toàn dùng giờ máy theo giây và hậu tố -2, -3 khi trùng (việc của
//       backup_data). (3) Bản ghi chỉ được tin khi tệp chờ còn: backup_data xóa tệp
//       chờ mỗi lần prepare_restore đi qua bước 404, kể cả lần gọi từ nơi khác;
//       pha 2 phải kiểm staged_db_path còn tồn tại (f_restore.md mục 3, bước 2).
//       (4) Pha 1 không chạm data.db, data.db.lock hay tệp chờ: kiểm thử so inode
//       của data.db trước sau và GET /clients vẫn có khách thêm sau lúc sao lưu.
//
// UNSOLVED_PROBLEMS: []
//
// EVIDENCE:
//   - claim: >
//       Phép đo trước khi viết (việc 2): vị trí tệp chờ, tệp hỏng có xóa tệp chờ
//       cũ không, thời gian các lời gọi.
//     how: >
//       Script tạm ngoài dự án (scratchpad), Node: chạy Backend.py thật
//       (CT_PORT, CT_DB_FILE_PATH trong thư mục tạm, CT_APP_VERSION 0.1.0), POST
//       /clients, POST /backups (manual) vào thư mục tạm, rồi POST
//       /backups/restore-preparations với tệp đó, với một tệp văn bản, với tệp
//       không tồn tại; sau mỗi lần liệt kê thư mục chứa data.db; thêm POST /backups
//       purpose pre_restore vào <thư mục db>/safety-backups và vào một tệp.
//     result: >
//       create 201 sau 88 ms; prepare hợp lệ 200 sau 39 ms, staged_db_path =
//       <thư mục db>\restore-staging\data.db (thư mục có data.db, data.db.lock,
//       restore-staging\data.db); prepare tệp văn bản 200 sau 16 ms với is_valid
//       false, reason "the archive cannot be read as a zip: BadZipFile ...",
//       staged_db_path null, và restore-staging\data.db BIẾN MẤT (đúng
//       backup_data-EXP-003); prepare tệp không tồn tại 404 sau 12 ms, thư mục
//       restore-staging còn nguyên; create pre_restore vào safety-backups 201
//       sau 39 ms (tên commission-tracker-pre_restore-<giờ>.ctbackup); create vào
//       một tệp 400 ERR_VALIDATION.
//     recorded_at: 2026-10-08T09:26:28+07:00
//   - claim: >
//       Mười sáu ca R1-R15 (R1 gồm R1a, R1b) của tests/restore_data.spec.ts đạt: ba
//       lối vào với backend thật và với backend giả, dữ liệu đang dùng không đổi.
//     how: >
//       cd Desktop; npm test (hoặc riêng npx playwright test
//       tests/restore_data.spec.ts). R2 (200, năm trường, tệp bản ghi sáu trường,
//       bản sao lưu an toàn qua được prepare_restore của backend, inode data.db
//       không đổi, GET /clients vẫn có khách thêm sau lúc sao lưu), R3 (status,
//       cancel true/false, tệp chờ và bản sao lưu an toàn còn), R4 (409: tệp văn
//       bản đuôi .ctbackup và bản app_version 9.9.9), R5 (yêu cầu mới thay yêu cầu
//       cũ; chuẩn bị hỏng không còn bản ghi), R6 (404 tệp và thư mục; 400 cho 10 đối
//       số sai, bản ghi cũ còn), R7 (424), R8 (500 ở bước 5), R9 (tệp bản ghi
//       không đọc được: 500 cho status, prepare; cancel), R10 (khung data: và cửa
//       sổ thứ hai bị từ chối), R11 (restore:start), R12 (bốn nút của trang thử), R13
//       503 backend giả trả 500, R14 503 sai hình dạng, R15 424 backend giả trả 500
//       cho create_backup.
//     result: >
//       restore_data.spec.ts: 16 passed (26 s) lúc viết; trong npm test đủ bộ 62
//       passed ở cả ba lượt liên tiếp (09:37:41-09:42:21, 09:42:21-09:46:58,
//       09:46:58-09:51:37; 4,6; 4,5; 4,6 phút), sau bộ không còn python.exe của
//       dự án. Chi tiết số liệu: R2 prepared_at lệch dưới 60 s so với đồng hồ test;
//       R8 có thêm đúng một bản sao lưu an toàn; R13 không có lời gọi POST /backups
//       nào tới backend giả và không tạo thư mục safety-backups; R15 tạo thư mục
//       nhưng không có tệp bản ghi.
//     recorded_at: 2026-10-08T14:59:36.1924815+07:00
//   - claim: >
//       Ba phép cắn của plan: bỏ bước xóa bản ghi cũ, không dừng khi
//       is_compatible false, status trả cả staged_db_path.
//     how: >
//       Sửa tạm services.ts bằng công cụ soạn tệp, npm run build, npx playwright
//       test tests/restore_data.spec.ts, khôi phục (grep BITE trong src và tests
//       không còn kết quả). (a) thay lời gọi deletePendingRecord ở bước 1 bằng một
//       giá trị cố định "absent"; (b) đổi điều kiện !is_valid || !is_compatible
//       thành !is_valid; (c) status trả read.record thay vì publicRecord.
//     result: >
//       (a) R5 hỏng ở "expect(fs.existsSync(pendingFile)).toBe(false)" (Received:
//       true: bản ghi của b còn sau chuẩn bị hỏng), 1 failed, 7 did not run, 8
//       passed. (b) R4 hỏng ở ca bản mới hơn (Expected 409, Received 503, vì tệp
//       chờ null bị bắt bởi nhánh thiếu dữ liệu), 1 failed, 8 did not run, 7
//       passed. (c) R3 hỏng ở so sánh sâu (thừa một khóa staged_db_path), 1 failed,
//       9 did not run, 6 passed. Không phép nào bị bộ phân loại quyền chặn. Khôi
//       phục thì 16 passed.
//     recorded_at: 2026-10-08T14:59:36.1924815+07:00
//   - claim: >
//       Bản đóng gói có workflow và Configs của nó, và chạy được đường chuẩn bị
//       thật: ca P10.
//     how: >
//       cd Desktop; xóa packaging\stage và release; ELECTRON_BUILDER_CACHE trỏ vào
//       %TEMP%\ct-eb-cache; npm run dist; liệt kê app.asar bằng
//       require('@electron/asar').listPackage; npm run test:packaged.
//     result: >
//       dist thoát mã 0 sau khoảng 2 phút (09:51:50-09:53:54, không gặp EXDEV). app.asar
//       có configs\desktop.json, configs\restore_data.json, dist\main.js, preload.js,
//       cross_cutting\native_dialogs\{native_dialogs,request_checks}.js,
//       cross_cutting\reminder_ticker\{reminder_ticker,toast_text}.js,
//       workflows\restore_data\{adapters,entities,routers,services}.js,
//       package.json. test:packaged: 10 passed (1,2 phút): P1-P9 và P10 (restore:status
//       trả { pending: null }; open_file đúng với hộp thoại thay thế, chọn và hủy;
//       backup thật do backend đóng gói tạo rồi prepare 200, status có đúng bản ghi
//       đó, cancel true, status null; đóng sạch mã 0).
//     recorded_at: 2026-10-08T14:59:36.1924815+07:00
//   - claim: >
//       Project Owner chạy trang thử với hộp thoại thật (việc 10), 2026-10-08.
//     how: >
//       cd Desktop; npm run probe; tệp .ctbackup do backend thật tạo trong thư mục
//       tạm (C:\Users\A\AppData\Local\Temp\ct-probe-archive\commission-tracker-manual-20261008-104738.ctbackup,
//       một khách); Project Owner bấm: Chọn tệp sao lưu, Chuẩn bị khôi phục, Xem trạng
//       thái, Hủy khôi phục, rồi dán các ô trả lời.
//     result: >
//       Hộp thoại: tiêu đề "Chọn tệp" kèm icon ứng dụng, có bộ lọc loại tệp (lời Project
//       Owner; chưa chép nguyên chữ của bộ lọc). Chọn tệp: {"status":200,"body":
//       {"canceled":false,"path":"...ct-probe-archive\\commission-tracker-manual-20261008-104738.ctbackup"}}.
//       Chuẩn bị: 200, năm trường (archive_app_version "0.1.0", archive_created_at
//       "2026-10-08T10:47:38+07:00", safety_backup_path trong ...\CommissionTracker\safety-backups\,
//       prepared_at "2026-10-08T14:57:51+07:00"). Xem trạng thái: 200 với "pending" có đúng
//       năm trường đó, không staged_db_path. Hủy: {"status":200,"body":{"canceled":true}}.
//       Lượt thứ nhất dán ra pending null và canceled false vì Project Owner bấm xen kẽ
//       nhiều lần (log Main có hàng chục lời gọi, mọi lời đều 200; lần bấm cuối là cancel,
//       status, cancel); không phải lỗi. Lượt có chuỗi sạch: bước "Xem trạng thái lần nữa
//       sau khi hủy" chưa được dán, nhưng ca R3 và P10 kiểm đúng điều đó. Một lần chạy
//       (14:36) cửa sổ thoát với mã 3221225477 (0xC0000005) sau ba lần
//       open-file trả "canceled"; xem NOTES.
//     recorded_at: 2026-10-08T14:59:36.1924815+07:00
//
// NOTES:
//   - content: >
//       Chưa làm (pha 2, phiên 36): backend_controller, apply_pending_restore,
//       restore_trigger, hộp thoại kết quả; không có tệp nào đổi tên hay chuyển
//       data.db. Sau phiên này một bản ghi đang chờ chỉ nằm đó, và lần mở sau KHÔNG
//       áp dụng nó. Bản ghi hỏng được dọn ở pha 2 (hiện status trả 500, cancel xóa).
//     written_at: 2026-10-08
//   - content: >
//       Trên trang thử, ứng dụng thoát một lần với mã 3221225477 (0xC0000005, lỗi truy
//       cập bộ nhớ của tiến trình Electron) sau ba lần hộp thoại chọn tệp thật trả
//       "canceled"; log Main không có FATAL hay lỗi nào trước đó. Các lượt khác của cùng phiên
//       (chọn tệp, bấm lặp hàng chục lần) không sập. Chưa tái hiện, chưa rõ nguyên nhân (nghi
//       hộp thoại hệ thống hoặc phần mềm diệt virus); không có mã của dự án liên quan trong
//       đường gọi (dialog.showOpenDialog là của Electron). Nếu lặp lại, đo ở phiên desktop sau.
//     written_at: 2026-10-08
// ===WCA-CHECKPOINT-END===
/**
 * Services of restore_data, phase 1 ("prepare"): the only place a decision is
 * taken. The order of the steps, and the label of every answer, follow
 * .design/f_restore.md section 2 and api_contract.yaml
 * clause_d_desktop.restore_data (API Contract 5.0.0).
 *
 * Phase 2 (apply the pending restore at the next start) is not here.
 */

import type { RestoreDataAdapters } from './adapters'
import type {
  PendingRestoreRecord,
  RestoreCancellation,
  RestoreDataConfig,
  RestoreReply,
  RestoreStatus,
  StoredPendingRecord,
} from './entities'

/** The five fields of pending_restore_record: the stored record without
 * staged_db_path (internal, never returned). */
function publicRecord(stored: StoredPendingRecord): PendingRestoreRecord {
  return {
    archive_path: stored.archive_path,
    archive_app_version: stored.archive_app_version,
    archive_created_at: stored.archive_created_at,
    safety_backup_path: stored.safety_backup_path,
    prepared_at: stored.prepared_at,
  }
}

export class RestoreDataService {
  constructor(
    private readonly adapters: RestoreDataAdapters,
    private readonly config: RestoreDataConfig,
  ) {}

  private error(label: number, code: string, message: string, details: Record<string, unknown> | null): RestoreReply {
    return { status: label, body: { code, message, details } }
  }

  private storageError(label: number, message: string, reason: string): RestoreReply {
    return this.error(label, this.config.error_codes.storage_io, message, { reason })
  }

  private unavailable(reason: string): RestoreReply {
    return this.error(this.config.labels.service_unavailable, this.config.error_codes.service_unavailable, 'The backend could not prepare the archive.', { reason })
  }

  /** restore:prepare. Every answer other than the success one means that
   * nothing is pending. */
  async prepare(archivePath: string): Promise<RestoreReply> {
    const { labels, error_codes: codes } = this.config

    // 1. A new request replaces every earlier one, and a failed request leaves
    //    nothing pending: backup_data.prepare_restore removes its staging file
    //    each time it gets past its own existence check, so an older record
    //    could no longer be trusted.
    const cleared = await this.adapters.deletePendingRecord()
    if (cleared.kind === 'failed') return this.storageError(labels.storage_io, 'The earlier pending restore could not be removed.', cleared.reason)

    // 2. backup_data checks the archive and stages its database.
    const prepared = await this.adapters.prepareRestore(archivePath)
    if (prepared.kind === 'not_found') {
      return this.error(labels.not_found, codes.not_found, 'Archive file not found.', { archive_path: archivePath })
    }
    if (prepared.kind === 'failed') return this.unavailable(prepared.reason)
    const staging = prepared.staging
    if (!staging.is_valid || !staging.is_compatible) {
      return this.error(labels.incompatible_backup, codes.incompatible_backup, 'The archive is not a usable Commission Tracker backup.', { reason: staging.reason })
    }
    if (staging.app_version === null || staging.created_at === null || staging.staged_db_path === null) {
      return this.unavailable('the backend described a usable archive without its version, date or staged file')
    }

    // 3-4. The safety backup of the live database, in this workflow's own folder.
    const folder = await this.adapters.ensureFolder(this.adapters.safetyFolder)
    if (folder.kind === 'failed') return this.storageError(labels.safety_backup_failed, 'The safety backup folder could not be created.', folder.reason)
    const safety = await this.adapters.createSafetyBackup(this.adapters.safetyFolder)
    if (safety.kind === 'failed') return this.storageError(labels.safety_backup_failed, 'The safety backup could not be created.', safety.reason)

    // 5. Record the pending restore (atomic write). The safety backup stays if this fails.
    const stored: StoredPendingRecord = {
      archive_path: archivePath,
      archive_app_version: staging.app_version,
      archive_created_at: staging.created_at,
      safety_backup_path: safety.archive.archive_path,
      prepared_at: this.adapters.nowTimestamp(),
      staged_db_path: staging.staged_db_path,
    }
    const written = await this.adapters.writePendingRecord(stored)
    if (written.kind === 'failed') return this.storageError(labels.storage_io, 'The pending restore could not be recorded.', written.reason)

    // 6.
    return { status: labels.ok, body: publicRecord(stored) }
  }

  /** restore:status. An unreadable record is an error here; cleaning it up is
   * phase 2's job. */
  async status(): Promise<RestoreReply> {
    const read = await this.adapters.readPendingRecord()
    if (read.kind === 'unreadable') return this.storageError(this.config.labels.storage_io, 'The pending restore could not be read.', read.reason)
    const body: RestoreStatus = { pending: read.kind === 'record' ? publicRecord(read.record) : null }
    return { status: this.config.labels.ok, body }
  }

  /** restore:cancel: removes the record only. The staging file (backup_data's)
   * and the safety backup are left alone. */
  async cancel(): Promise<RestoreReply> {
    const removed = await this.adapters.deletePendingRecord()
    if (removed.kind === 'failed') return this.storageError(this.config.labels.storage_io, 'The pending restore could not be removed.', removed.reason)
    const body: RestoreCancellation = { canceled: removed.kind === 'deleted' }
    return { status: this.config.labels.ok, body }
  }
}
