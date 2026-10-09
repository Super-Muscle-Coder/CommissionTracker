// Automated run of the walkthrough of the page restore
// (src/screens/pages/restore/walkthrough.yaml, iWCA I6.3) on the real app. The one thing
// replaced is the file dialog: tests/tools/folder_dialog_stub.mjs assigns
// dialog.showOpenDialog in the Electron main process (no real dialog opens, no person
// needed; the real dialog is the Project Owner's by-hand run). The data and the backup file
// are made by test tooling through the backend's declared endpoints (not by the interface,
// whose four restore calls are all ipc): clients A and B, a backup file of exactly those,
// then client C. The files are in a temporary folder of the run next to the temporary data
// folder, never in UI/, in %APPDATA% or in a folder of the person; both folders go after the
// run, whatever fails. Steps S1 → S7 follow each other in one app launch. S8 closes the app
// cleanly, keeping the data folder, and opens it again on that same folder: the desktop then
// applies the prepared restore, and what the artist has is the data of the backup file (A and
// B, no C). That claim rests first on the DATA and the FILES (the clients, restore-pending.json,
// restore-previous/); the line "restore dialog text" of the desktop log is a secondary
// assertion (measured in session 37, item 2: the harness collects it 5 times out of 5).
// Screenshots and the run record: <evidence>/walkthroughs/restore/. The temporary paths and the
// times are in the images: they change from run to run.
import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { folderDialogCalls, installFolderDialogStub, setFolderDialogReply } from '../tools/folder_dialog_stub.mjs'
import { clientNames, createBackupFile, createClient, dbFolder, makeBackupDir } from '../tools/walkthrough_lib.mjs'
import { close, closeKeepingData, detailEntries, launch, listTexts, reopen, setBackend, walkthroughRecorder, type Launched } from './walkthrough_harness.js'

const PAGE = 'restore'
const rec = walkthroughRecorder(PAGE, 'tests/e2e/restore_walkthrough.spec.ts')
const WAITING_LINE = 'Không có lần khôi phục nào đang chờ.'
const FIXED_LINE = 'Khôi phục thay toàn bộ dữ liệu hiện tại bằng dữ liệu trong một tệp sao lưu. Việc thay diễn ra khi bạn đóng rồi mở lại ứng dụng.'
const PREPARED = 'Đã chuẩn bị khôi phục. Hãy đóng rồi mở lại ứng dụng để hoàn tất.'
const CANCELED = 'Đã hủy lần khôi phục đang chờ. Dữ liệu hiện tại giữ nguyên.'
const REPLACES = 'Lần khôi phục đang chờ sẽ được thay bằng lần này.'
const FRAME_TERMS = ['Tệp sao lưu', 'Bản sao lưu tạo lúc', 'Chuẩn bị lúc', 'Bản sao lưu an toàn của dữ liệu trước khi khôi phục']
const SHOWN_AT = /^\d{2}:\d{2} \d{2}\/\d{2}\/\d{4}$/
const NOT_A_BACKUP =
  'Tệp này không dùng được để khôi phục: có thể không phải bản sao lưu của Commission Tracker, đã bị hỏng, hoặc được tạo bởi phiên bản mới hơn của ứng dụng.'
const NOT_FOUND = 'Không tìm thấy tệp này. Có thể tệp đã bị chuyển hoặc xóa. Hãy chọn lại.'
const SERVICE_UNAVAILABLE = 'Ứng dụng chưa đọc được tệp sao lưu vì phần xử lý dữ liệu không phản hồi. Hãy đóng rồi mở lại ứng dụng, rồi thử lại.'
const NAV_ITEMS = ['Khách hàng', 'Đơn hàng', 'Tiến độ', 'Thu nhập', 'Nhắc việc', 'Sao lưu', 'Khôi phục']
const BEFORE = ['Khách A', 'Khách B']
const AFTER_ADDING = ['Khách A', 'Khách B', 'Khách C']

let l: Launched
let backupDir: string
let archive: string
let dbDir: string

const chooseButton = () => l.page.getByRole('button', { name: 'Chọn tệp sao lưu', exact: true })
const cancelButton = () => l.page.getByRole('button', { name: 'Hủy lần khôi phục đang chờ', exact: true })
const confirmButton = () => l.page.getByRole('button', { name: 'Chuẩn bị khôi phục', exact: true })
const backButton = () => l.page.getByRole('button', { name: 'Quay lại', exact: true })
const question = () => l.page.getByRole('group', { name: 'Xác nhận chuẩn bị khôi phục' })
const frame = () => l.page.getByRole('region', { name: 'Đang chờ khôi phục' })
const notice = (text: string) => l.page.getByRole('status').filter({ hasText: text })
const alertBox = () => l.page.getByRole('alert')
const pendingFile = () => path.join(dbDir, 'restore-pending.json')
const safetyDir = () => path.join(dbDir, 'safety-backups')
const safetyFiles = () => (fs.existsSync(safetyDir()) ? fs.readdirSync(safetyDir()).filter((f) => f.endsWith('.ctbackup')).sort() : [])
const frameEntries = () => detailEntries(l.page, 'Lần khôi phục đang chờ')

// Press "Chọn tệp sao lưu" and wait until the (stubbed) dialog has been opened once more and
// the press is over (the row of buttons is usable again, or the question is open).
async function pressChoose(): Promise<void> {
  const before = await folderDialogCalls(l.app)
  await chooseButton().click()
  await expect.poll(() => folderDialogCalls(l.app), { timeout: 30_000 }).toBe(before + 1)
}

// The dialog answers `file`, the question appears.
async function chooseAndAsk(file: string): Promise<void> {
  await setFolderDialogReply(l.app, { kind: 'choose', path: file })
  await pressChoose()
  await expect(question()).toBeVisible({ timeout: 30_000 })
}

// From the question, "Chuẩn bị khôi phục".
async function confirm(): Promise<void> {
  await confirmButton().click()
}

async function openRestorePage(): Promise<void> {
  await l.page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('button', { name: 'Khôi phục', exact: true }).click()
  await expect(l.page.getByRole('heading', { level: 2, name: 'Khôi phục dữ liệu' })).toBeVisible()
}

test.describe.serial('walkthrough restore', () => {
  test.beforeAll(async () => {
    rec.reset()
    backupDir = makeBackupDir()
    try {
      l = await launch({ seed: false })
      dbDir = dbFolder(l.dataDir)
      await installFolderDialogStub(l.app)
      // Test tooling makes the data: A and B, a backup file of them, then C.
      await createClient(l.baseUrl, 'Khách A')
      await createClient(l.baseUrl, 'Khách B')
      archive = await createBackupFile(l.baseUrl, backupDir)
      await createClient(l.baseUrl, 'Khách C')
      expect(await clientNames(l.baseUrl)).toEqual(AFTER_ADDING)
    } catch (e) {
      if (l !== undefined) await close(l).catch(() => {})
      fs.rmSync(backupDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
      throw e
    }
  })
  test.afterAll(async () => {
    try {
      rec.write()
      // The reopened app, or the one left closed by S8 when the reopening failed: the folder goes either way.
      await close(l)
    } finally {
      // Removed even when closing fails, so no backup file is left behind.
      fs.rmSync(backupDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
    }
  })

  test('S1 — open "Khôi phục": the title, the one button, the fixed line, "Không có lần khôi phục nào đang chờ."; the navigation has seven items; nothing was called', async () => {
    await rec.step(l.page, 'S1', ['ok'], async () => {
      await openRestorePage()
      await expect(l.page.getByText(WAITING_LINE)).toBeVisible({ timeout: 30_000 })
      await expect(l.page.getByRole('status')).toHaveCount(0)
      await expect(alertBox()).toHaveCount(0)
      await expect(question()).toHaveCount(0)
      await expect(frame()).toHaveCount(0)
      expect(await folderDialogCalls(l.app)).toBe(0)
      expect(await l.page.getByRole('main').getByRole('button').allInnerTexts()).toEqual(['Chọn tệp sao lưu'])
      await expect(l.page.getByText(FIXED_LINE)).toBeVisible()
      // The button row is right under the title and the fixed line under the button row (§7.2, principle 7).
      const heading = await l.page.getByRole('heading', { level: 2, name: 'Khôi phục dữ liệu' }).boundingBox()
      const button = await chooseButton().boundingBox()
      const line = await l.page.getByText(FIXED_LINE).boundingBox()
      if (heading === null || button === null || line === null) throw new Error('test: a box is missing')
      expect(heading.y).toBeLessThan(button.y)
      expect(button.y).toBeLessThan(line.y)
      // The navigation region has seven items, "Khôi phục" the current one, the six older ones in their places.
      const items = await l.page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('button').all()
      expect(await Promise.all(items.map(async (i) => [await i.innerText(), await i.getAttribute('aria-current')]))).toEqual(
        NAV_ITEMS.map((n) => [n, n === 'Khôi phục' ? 'page' : null]),
      )
      // Nothing was prepared: no record, no safety backup.
      expect(fs.existsSync(pendingFile())).toBe(false)
      expect(safetyFiles()).toEqual([])
    })
  })

  test('S2 — the dialog cancelled changes nothing; a file chosen puts the question in the page (focus on "Chuẩn bị khôi phục"), sends nothing; "Quay lại" sends nothing', async () => {
    await rec.step(l.page, 'S2', ['ok'], async () => {
      // A cancelled dialog: nothing appears.
      await setFolderDialogReply(l.app, { kind: 'cancel' })
      await pressChoose()
      await expect(chooseButton()).toBeEnabled({ timeout: 30_000 })
      await expect(question()).toHaveCount(0)
      await expect(alertBox()).toHaveCount(0)
      await expect(l.page.getByRole('status')).toHaveCount(0)
      await expect(l.page.getByText(WAITING_LINE)).toBeVisible()
      // A file chosen: the question, with the path and what will happen. Nothing is sent.
      await chooseAndAsk(archive)
      await expect(question()).toContainText(`Khôi phục từ tệp: ${archive}`)
      await expect(question()).toContainText('toàn bộ dữ liệu hiện tại sẽ được thay bằng dữ liệu trong tệp này')
      await expect(question()).not.toContainText(REPLACES)
      await expect(confirmButton()).toBeFocused()
      await expect(chooseButton()).toBeDisabled()
      // A long path wraps instead of overflowing the panel (kit CSS).
      const textOfQuestion = "document.querySelector('section[role=\"group\"] p:nth-of-type(2)')"
      expect(await l.page.evaluate(`getComputedStyle(${textOfQuestion}).overflowWrap`)).toBe('anywhere')
      expect(await l.page.evaluate(`getComputedStyle(${textOfQuestion}).whiteSpace`)).toBe('pre-line')
      expect(fs.existsSync(pendingFile())).toBe(false)
      expect(safetyFiles()).toEqual([])
      await rec.screenshot(l.page, `${PAGE}-S2-question`)
      // "Quay lại": the question goes, nothing was sent, the page is as it was.
      await backButton().click()
      await expect(question()).toHaveCount(0)
      await expect(chooseButton()).toBeEnabled()
      await expect(l.page.getByText(WAITING_LINE)).toBeVisible()
      await expect(l.page.getByRole('status')).toHaveCount(0)
      expect(fs.existsSync(pendingFile())).toBe(false)
      expect(safetyFiles()).toEqual([])
      expect(await clientNames(l.baseUrl)).toEqual(AFTER_ADDING)
    })
  })

  test('S3 — a file chosen and confirmed: the notice and the frame "Đang chờ khôi phục"; the safety backup and the record exist', async () => {
    await rec.step(l.page, 'S3', ['ok'], async () => {
      await chooseAndAsk(archive)
      await confirm()
      await expect(notice(PREPARED)).toHaveCount(1, { timeout: 30_000 })
      await expect(frame()).toBeVisible()
      await expect(question()).toHaveCount(0)
      await expect(alertBox()).toHaveCount(0)
      await expect(l.page.getByText(WAITING_LINE)).toHaveCount(0)
      const entries = await frameEntries()
      expect(entries.map(([term]) => term)).toEqual(FRAME_TERMS)
      const [[, [shownArchive]], [, [createdAt]], [, [preparedAt]], [, [safety]]] = entries
      expect(shownArchive).toBe(archive)
      expect(createdAt).toMatch(SHOWN_AT)
      expect(preparedAt).toMatch(SHOWN_AT)
      // The safety backup is a real file, in the folder the desktop keeps for it, and the app version is not shown.
      expect(path.dirname(safety)).toBe(safetyDir())
      expect(fs.existsSync(safety)).toBe(true)
      expect(fs.statSync(safety).size).toBeGreaterThan(0)
      expect(safetyFiles()).toEqual([path.basename(safety)])
      expect(fs.existsSync(pendingFile())).toBe(true)
      await expect(frame().getByText('Hãy đóng rồi mở lại ứng dụng để hoàn tất.')).toBeVisible()
      expect(await l.page.getByRole('main').getByRole('button').allInnerTexts()).toEqual(['Chọn tệp sao lưu', 'Hủy lần khôi phục đang chờ'])
      await expect(chooseButton()).toBeEnabled()
    })
  })

  test('S4 — with one waiting, the question says it will be replaced ("Quay lại" sends nothing); "Hủy lần khôi phục đang chờ" asks nothing and removes the frame and the record', async () => {
    await rec.step(l.page, 'S4', ['ok'], async () => {
      const safetyBefore = safetyFiles()
      await chooseAndAsk(archive)
      await expect(question()).toContainText(REPLACES)
      await expect(cancelButton()).toBeDisabled()
      await backButton().click()
      await expect(question()).toHaveCount(0)
      // Nothing was sent: the record and the safety backups are as they were.
      expect(fs.existsSync(pendingFile())).toBe(true)
      expect(safetyFiles()).toEqual(safetyBefore)
      await expect(frame()).toBeVisible()
      // Cancel: no question, the notice, the frame and the button go, the record goes.
      await cancelButton().click()
      await expect(notice(CANCELED)).toHaveCount(1, { timeout: 30_000 })
      await expect(question()).toHaveCount(0)
      await expect(frame()).toHaveCount(0)
      await expect(cancelButton()).toHaveCount(0)
      await expect(l.page.getByText(WAITING_LINE)).toBeVisible()
      await expect(alertBox()).toHaveCount(0)
      expect(fs.existsSync(pendingFile())).toBe(false)
      // Cancelling removes the record only: the safety backup stays.
      expect(safetyFiles()).toEqual(safetyBefore)
      expect(await clientNames(l.baseUrl)).toEqual(AFTER_ADDING)
    })
  })

  test('S5 — a .ctbackup that is not a backup (409): its sentence; nothing is waiting; no safety backup was made', async () => {
    await rec.step(l.page, 'S5', ['rejected_system'], async () => {
      const notABackup = path.join(backupDir, 'khong-phai-ban-sao-luu.ctbackup')
      fs.writeFileSync(notABackup, 'this is a text file, not a backup of Commission Tracker', 'utf8')
      const safetyBefore = safetyFiles()
      await chooseAndAsk(notABackup)
      await confirm()
      await expect(alertBox()).toContainText(NOT_A_BACKUP, { timeout: 30_000 })
      await expect(alertBox()).toContainText('Chưa chuẩn bị được khôi phục')
      await expect(question()).toHaveCount(0)
      await expect(frame()).toHaveCount(0)
      await expect(l.page.getByText(WAITING_LINE)).toBeVisible()
      await expect(notice(PREPARED)).toHaveCount(0)
      expect(fs.existsSync(pendingFile())).toBe(false)
      expect(safetyFiles()).toEqual(safetyBefore)
      await expect(chooseButton()).toBeEnabled()
    })
  })

  test('S6 — a path that does not exist (404): its sentence replaces the earlier one; nothing is waiting', async () => {
    await rec.step(l.page, 'S6', ['rejected_system'], async () => {
      const missing = path.join(backupDir, 'da-bi-xoa.ctbackup')
      expect(fs.existsSync(missing)).toBe(false)
      await chooseAndAsk(missing)
      await confirm()
      await expect(alertBox()).toContainText(NOT_FOUND, { timeout: 30_000 })
      await expect(alertBox()).not.toContainText(NOT_A_BACKUP)
      await expect(alertBox()).toHaveCount(1)
      await expect(frame()).toHaveCount(0)
      await expect(l.page.getByText(WAITING_LINE)).toBeVisible()
      expect(fs.existsSync(pendingFile())).toBe(false)
    })
  })

  test('S7 — the backend down: choosing and confirming gives the sentence of 503 and nothing waits; running again, the same preparation works', async () => {
    await rec.step(l.page, 'S7', ['unreachable', 'ok'], async () => {
      setBackend('down')
      const safetyBefore = safetyFiles()
      await chooseAndAsk(archive)
      await confirm()
      await expect(alertBox()).toContainText(SERVICE_UNAVAILABLE, { timeout: 30_000 })
      await expect(alertBox()).toContainText('Chưa chuẩn bị được khôi phục')
      await expect(question()).toHaveCount(0)
      await expect(frame()).toHaveCount(0)
      // The status is read again, over ipc, which does not need the backend: nothing waits.
      await expect(l.page.getByText(WAITING_LINE)).toBeVisible()
      expect(fs.existsSync(pendingFile())).toBe(false)
      expect(safetyFiles()).toEqual(safetyBefore)
      await rec.screenshot(l.page, `${PAGE}-S7-unreachable`)
      setBackend('up')
      await chooseAndAsk(archive)
      await confirm()
      await expect(notice(PREPARED)).toHaveCount(1, { timeout: 30_000 })
      await expect(alertBox()).toHaveCount(0)
      await expect(frame()).toBeVisible()
      expect(fs.existsSync(pendingFile())).toBe(true)
      expect(safetyFiles()).toHaveLength(safetyBefore.length + 1)
      expect((await frameEntries())[0][1][0]).toBe(archive)
    })
  })

  test('S8 — the app closed and opened again on the same data folder: the data is the data of the backup file (no C), the record is gone, the old database is kept, the page says nothing waits', async () => {
    // The last frame, read before closing: the safety backup of the preparation that will be applied.
    const lastSafety = (await frameEntries())[3][1][0]
    await closeKeepingData(l)
    // The data folder is still there; the app opens on it again (and the files are as the desktop left them).
    expect(fs.existsSync(dbDir)).toBe(true)
    expect(fs.existsSync(pendingFile())).toBe(true)
    l = await reopen(l)
    await rec.step(l.page, 'S8', ['ok'], async () => {
      // DATA first: only A and B are left (C was added after the backup).
      expect(await clientNames(l.baseUrl)).toEqual(BEFORE)
      await expect.poll(() => listTexts(l.page, 'Khách hàng đang hoạt động'), { timeout: 30_000 }).toEqual(BEFORE)
      // FILES: the record is gone, the old database was moved into restore-previous (kept), both safety backups remain.
      expect(fs.existsSync(pendingFile())).toBe(false)
      const previous = path.join(dbDir, 'restore-previous')
      expect(fs.readdirSync(previous)).toHaveLength(1)
      expect(fs.statSync(path.join(previous, fs.readdirSync(previous)[0])).size).toBeGreaterThan(0)
      expect(safetyFiles()).toHaveLength(2)
      expect(fs.existsSync(lastSafety)).toBe(true)
      // The page: nothing is waiting any more.
      await openRestorePage()
      await expect(l.page.getByText(WAITING_LINE)).toBeVisible({ timeout: 30_000 })
      await expect(l.page.getByRole('status')).toHaveCount(0)
      await expect(frame()).toHaveCount(0)
      expect(await l.page.getByRole('main').getByRole('button').allInnerTexts()).toEqual(['Chọn tệp sao lưu'])
      // Secondary: the desktop logged the text of its result dialog (the harness collects it, measured 5 of 5).
      const text = l.log()
      expect(text).toContain('restore_data: apply -> restored')
      const line = text.split(/\r?\n/).find((x) => x.includes('restore dialog text')) ?? ''
      expect(line).toContain('Đã khôi phục dữ liệu từ bản sao lưu:')
      expect(line).toContain(JSON.stringify(archive).slice(1, -1))
      expect(line).toContain(JSON.stringify(lastSafety).slice(1, -1))
    })
  })
})
