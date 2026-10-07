// Automated run of the walkthrough of the page backup
// (src/screens/pages/backup/walkthrough.yaml, iWCA I6.3) on the real app. The
// folder dialog is the one thing replaced: tests/tools/folder_dialog_stub.mjs
// assigns dialog.showOpenDialog in the Electron main process (no real dialog
// opens, no person needed; the real dialog is the Project Owner's by-hand run).
// The folder "chosen" is a temporary folder of the run, next to the temporary data
// folder, never in UI/, in %APPDATA% or in a folder of the person; it is removed
// after the run. After the first backup, test tooling (not the interface) calls
// POST /backups/restore-preparations on the file: is_valid and is_compatible must
// both be true (the criterion of stage E). Steps S1 → S5 follow each other in one
// app launch. Screenshots and the run record: <evidence>/walkthroughs/backup/. The
// time of creation and the temporary path are in the images: they change from run to run.
import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { folderDialogCalls, installFolderDialogStub, setFolderDialogReply } from '../tools/folder_dialog_stub.mjs'
import { makeBackupDir, prepareRestore } from '../tools/walkthrough_lib.mjs'
import { close, detailEntries, launch, setBackend, walkthroughRecorder, type Launched } from './walkthrough_harness.js'

const PAGE = 'backup'
const rec = walkthroughRecorder(PAGE, 'tests/e2e/backup_walkthrough.spec.ts')
const NOTICE = 'Đã tạo bản sao lưu.'
const FRAME = 'Bản sao lưu vừa tạo'
const SIZE = /^\d+( byte|,\d KB|,\d MB)$/
const CREATED_AT = /^\d{2}:\d{2} \d{2}\/\d{2}\/\d{4}$/

let l: Launched
let backupDir: string

const createButton = () => l.page.getByRole('button', { name: 'Tạo bản sao lưu', exact: true })
const ctbackups = () => fs.readdirSync(backupDir).filter((f) => f.endsWith('.ctbackup')).sort()
const notice = () => l.page.getByRole('status').filter({ hasText: NOTICE })
const alertBox = () => l.page.getByRole('alert')

// Press the button and wait until the (stubbed) dialog has been opened once more
// and the flow is over (the button can be pressed again).
async function pressAndWaitForDialog(): Promise<void> {
  const before = await folderDialogCalls(l.app)
  await createButton().click()
  await expect.poll(() => folderDialogCalls(l.app), { timeout: 30_000 }).toBe(before + 1)
  await expect(createButton()).toBeEnabled({ timeout: 30_000 })
}

test.describe.serial('walkthrough backup', () => {
  test.beforeAll(async () => {
    rec.reset()
    backupDir = makeBackupDir()
    try {
      l = await launch({ seed: false })
      await installFolderDialogStub(l.app)
    } catch (e) {
      fs.rmSync(backupDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
      throw e
    }
  })
  test.afterAll(async () => {
    try {
      rec.write()
      await close(l)
    } finally {
      // Removed even when closing fails, so no backup file is left behind.
      fs.rmSync(backupDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
    }
  })

  test('S1 — open "Sao lưu": the title, the one button, the fixed line; a backup into the chosen folder: notice and frame; the file is accepted by prepare_restore', async () => {
    await rec.step(l.page, 'S1', ['ok'], async () => {
      await l.page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('button', { name: 'Sao lưu' }).click()
      await expect(l.page.getByRole('heading', { level: 2, name: 'Sao lưu dữ liệu' })).toBeVisible()
      // Nothing is called on opening: no status, no alert, no frame, no file, no dialog.
      await expect(l.page.getByRole('status')).toHaveCount(0)
      await expect(alertBox()).toHaveCount(0)
      await expect(l.page.getByLabel(FRAME)).toHaveCount(0)
      expect(await folderDialogCalls(l.app)).toBe(0)
      expect(await l.page.getByRole('main').getByRole('button').allInnerTexts()).toEqual(['Tạo bản sao lưu'])
      await expect(l.page.getByText('Bản sao lưu là một tệp chứa toàn bộ dữ liệu của ứng dụng. Nên lưu ở ổ đĩa khác hoặc ổ USB, để vẫn còn dữ liệu nếu máy hỏng.')).toBeVisible()
      // The navigation region has six items, "Sao lưu" the current one.
      const items = await l.page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('button').all()
      expect(await Promise.all(items.map(async (i) => [await i.innerText(), await i.getAttribute('aria-current')]))).toEqual([
        ['Khách hàng', null],
        ['Đơn hàng', null],
        ['Tiến độ', null],
        ['Thu nhập', null],
        ['Nhắc việc', null],
        ['Sao lưu', 'page'],
      ])
      await rec.screenshot(l.page, `${PAGE}-S1-open`)

      await setFolderDialogReply(l.app, { kind: 'choose', path: backupDir })
      await pressAndWaitForDialog()
      await expect(notice()).toHaveCount(1, { timeout: 30_000 })
      await expect(alertBox()).toHaveCount(0)
      const entries = await detailEntries(l.page, FRAME)
      expect(entries.map(([term]) => term)).toEqual(['Tệp', 'Dung lượng', 'Tạo lúc'])
      const [[, [shownPath]], [, [size]], [, [createdAt]]] = entries
      // The file lies in the chosen folder and ends in .ctbackup.
      expect(path.dirname(shownPath)).toBe(backupDir)
      expect(shownPath.endsWith('.ctbackup')).toBe(true)
      expect(size).toMatch(SIZE)
      expect(createdAt).toMatch(CREATED_AT)
      // A long path wraps instead of overflowing the frame (kit CSS: overflow-wrap).
      expect(await l.page.evaluate("getComputedStyle(document.querySelector('dl[aria-label=\"Bản sao lưu vừa tạo\"] dd')).overflowWrap")).toBe('anywhere')
      // The technical record is not shown.
      await expect(l.page.getByText(/sha256/i)).toHaveCount(0)
      // Test tooling checks the file, then asks the backend to prepare it for restore.
      expect(ctbackups()).toEqual([path.basename(shownPath)])
      expect(fs.statSync(shownPath).size).toBeGreaterThan(0)
      const staging = await prepareRestore(l.baseUrl, shownPath)
      expect(staging.is_valid).toBe(true)
      expect(staging.is_compatible).toBe(true)
      await rec.screenshot(l.page, `${PAGE}-S1-created`)
    })
  })

  test('S2 — a second backup into the same folder: another file, the frame is replaced; both files are accepted by prepare_restore', async () => {
    await rec.step(l.page, 'S2', ['ok'], async () => {
      const first = ctbackups()
      expect(first).toHaveLength(1)
      const firstShown = (await detailEntries(l.page, FRAME))[0][1][0]
      await pressAndWaitForDialog()
      await expect.poll(() => ctbackups().length, { timeout: 30_000 }).toBe(2)
      await expect.poll(async () => (await detailEntries(l.page, FRAME))[0][1][0], { timeout: 30_000 }).not.toBe(firstShown)
      const secondShown = (await detailEntries(l.page, FRAME))[0][1][0]
      expect(path.dirname(secondShown)).toBe(backupDir)
      expect(path.basename(secondShown)).not.toBe(first[0])
      await expect(notice()).toHaveCount(1)
      await expect(l.page.getByLabel(FRAME)).toHaveCount(1)
      for (const f of ctbackups()) {
        const staging = await prepareRestore(l.baseUrl, path.join(backupDir, f))
        expect([staging.is_valid, staging.is_compatible]).toEqual([true, true])
      }
    })
  })

  test('S3 — the dialog cancelled: no new file, the page keeps the frame it showed', async () => {
    await rec.step(l.page, 'S3', ['ok'], async () => {
      const filesBefore = ctbackups()
      const frameBefore = await detailEntries(l.page, FRAME)
      await setFolderDialogReply(l.app, { kind: 'cancel' })
      await pressAndWaitForDialog()
      // Give a wrong late change the time to show before asserting that nothing changed.
      await expect(notice()).toHaveCount(1)
      expect(ctbackups()).toEqual(filesBefore)
      expect(await detailEntries(l.page, FRAME)).toEqual(frameBefore)
      await expect(alertBox()).toHaveCount(0)
    })
  })

  test('S4 — a folder that does not exist (400): "Không dùng được thư mục này…" and the earlier frame is gone; no file, no folder made', async () => {
    await rec.step(l.page, 'S4', ['rejected_system'], async () => {
      const missing = path.join(backupDir, 'khong-ton-tai')
      const filesBefore = ctbackups()
      await setFolderDialogReply(l.app, { kind: 'choose', path: missing })
      await pressAndWaitForDialog()
      await expect(alertBox()).toContainText('Không dùng được thư mục này. Hãy chọn thư mục khác.', { timeout: 30_000 })
      await expect(alertBox()).toContainText('Chưa tạo được bản sao lưu')
      await expect(l.page.getByLabel(FRAME)).toHaveCount(0)
      await expect(notice()).toHaveCount(0)
      expect(ctbackups()).toEqual(filesBefore)
      expect(fs.existsSync(missing)).toBe(false)
    })
  })

  test('S5 — the backend down: "Không kết nối được" after the folder is chosen; running again, a backup works', async () => {
    await rec.step(l.page, 'S5', ['unreachable', 'ok'], async () => {
      const filesBefore = ctbackups()
      await setFolderDialogReply(l.app, { kind: 'choose', path: backupDir })
      setBackend('down')
      await pressAndWaitForDialog()
      await expect(alertBox()).toContainText('Không kết nối được tới phần xử lý của ứng dụng. Vui lòng thử lại.', { timeout: 30_000 })
      await expect(l.page.getByLabel(FRAME)).toHaveCount(0)
      expect(ctbackups()).toEqual(filesBefore)
      await rec.screenshot(l.page, `${PAGE}-S5-unreachable`)
      setBackend('up')
      await pressAndWaitForDialog()
      await expect(notice()).toHaveCount(1, { timeout: 30_000 })
      await expect(alertBox()).toHaveCount(0)
      await expect.poll(() => ctbackups().length, { timeout: 30_000 }).toBe(filesBefore.length + 1)
    })
  })
})
