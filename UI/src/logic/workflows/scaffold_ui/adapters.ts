// ===WCA-CHECKPOINT-START===
// workflow: scaffold_ui
// clause: external
// component: adapters
// last_updated_by: coding-agent@2026-10-07#3
// last_updated_at: 2026-10-07T20:44:38.4471702+07:00
//
// EXPERIENCES:
//   - id: scaffold_ui-EXP-001
//     content: >
//       Workflow nền tảng chỉ có configs.ts (timeoutMs 15000, [UI-ONLY]) và
//       adapters.ts; không có Services hay Routers vì không có quyết định nào
//       (ui_decomposition.md §2), nên khối checkpoint nằm ở đây (Giao thức 07,
//       vị trí dự phòng). Kiểu của tài nguyên nằm ở logic/shared/resources.ts
//       (HttpClient, Transport, HttpMethod GET|POST|PUT, HttpRequestOptions),
//       để Adapters của workflow khác dùng mà không import workflow này (R2).
//   - id: scaffold_ui-EXP-002
//     content: >
//       http_client làm đúng ba việc: (1) new URL(backendBaseUrl + path), query
//       đặt bằng searchParams; (2) fetch có AbortController, và thời gian chờ
//       phủ cả việc đọc thân phản hồi; (3) trả { kind: 'response', label:
//       status, body } với body là JSON đã parse, hoặc null khi thân rỗng hay
//       không phải JSON, hoặc trả { kind: 'unreachable', reason } khi fetch ném
//       lỗi hay hết thời gian chờ. Nó không phân loại nhãn: 500 cũng trả thô
//       như 200. JSON.stringify của thân yêu cầu nằm ngoài khối try, để một lỗi
//       lập trình nổi lên như lỗi thật, không bị giả làm unreachable. Thân yêu
//       cầu null thì không gửi thân và không có Content-Type.
//   - id: scaffold_ui-EXP-003
//     content: >
//       Tài nguyên thứ hai, ipc_bridge (phiên 34, chặng E): createIpcBridge(invoke) trả { call(address, argument): Promise<unknown> },
//       chuyển NGUYÊN lời gọi sang invoke và trả NGUYÊN Promise của nó. Không kiểm hình dạng (việc của Adapters của workflow dùng nó, nơi
//       biết địa chỉ trả gì), không hạn chờ (hộp thoại chờ người dùng), không bắt lỗi (Promise bị từ chối đi thẳng lên). Kiểu IpcInvoke và
//       IpcBridge nằm ở logic/shared/resources.ts (R2, như HttpClient). Chỉ Main đọc invoke từ bridge (R12) rồi trao vào đây; lời gọi là
//       invoke(address, argument) không có this, vì preload của Desktop là hàm thường (đã kiểm Desktop/src/preload.ts).
//
// UNSOLVED_PROBLEMS: []
//
// EVIDENCE:
//   - claim: >
//       http_client trả thô phản hồi 200 và 500, trả unreachable khi lỗi mạng
//       và khi hết thời gian chờ, ghép URL và query đúng, gửi thân JSON kèm
//       Content-Type.
//     how: >
//       Trong UI/: npm run check (vitest chạy
//       src/logic/workflows/scaffold_ui/tests/adapters.test.ts trong môi trường
//       node, fetch giả bằng vi.stubGlobal).
//     result: >
//       7/7 đạt: 200 thô; 500 thô; TypeError('fetch failed') cho unreachable có
//       reason chứa "fetch failed"; timeout 50 ms cho { kind: 'unreachable',
//       reason: 'no complete response within 50 ms (GET /clients)' } sau ≥ 45
//       ms; POST /clients?include_archived=true với thân JSON và Content-Type;
//       GET không có thân và headers {}; thân không phải JSON cho body null.
//     recorded_at: 2026-09-27T09:37:40+07:00
//   - claim: >
//       Chạy thật (WCA 6.6, workflow nền tảng; iWCA D7): Main khởi tạo
//       http_client thật từ backendBaseUrl do preload trao, và manage_client dùng
//       nó thành công với Backend.py thật: 200 cho danh sách, không tới được khi
//       backend tắt (unreachable, không bị giả làm lỗi khác), rồi 200 lại khi
//       backend chạy lại trên cùng cổng.
//     how: >
//       Trong UI/: npm run e2e (tests/e2e/client_list_walkthrough.spec.ts, bước
//       S1, S2, S3 của src/screens/pages/client_list/walkthrough.yaml).
//     result: >
//       S1, S2, S3 đạt ("4 passed (30.7s)" cùng main_layout.spec.ts). Ở S3, sau
//       "walkthrough:backend: backend is down" thì trang hiện "Không kết nối
//       được" (http_client trả unreachable vì cổng trống), sau "backend is up"
//       thì bấm "Tải lại" hiện lại danh sách. Xem EVIDENCE của manage_client và
//       screens.
//     recorded_at: 2026-09-27T12:02:15+07:00
//   - claim: >
//       ipc_bridge chuyển đúng địa chỉ và đối số (cùng một đối tượng), trả đúng giá trị mọi hình dạng không kiểm, giữ Promise bị từ chối bị
//       từ chối với cùng lỗi, và không đặt hạn chờ nào; chạy thật qua Desktop: invoke('dialog:pick-folder', {}) trả { status: 200, body }.
//     how: >
//       Trong UI/: npm run check (src/logic/workflows/scaffold_ui/tests/adapters.test.ts, bốn ca mới của createIpcBridge); chạy thật: spec
//       tests/e2e/backup_walkthrough.spec.ts trong npm run e2e; và một script đo tạm ngoài dự án (việc 2) gọi invoke trên ứng dụng thật.
//     result: >
//       Bốn ca đạt trong "Tests 1679 passed". Script đo: bridge có đúng hai khóa ["backendBaseUrl","invoke"]; hộp thoại thay thế trả
//       { status: 200, body: { canceled: false, path: "C:\stub\folder" } } rồi { canceled: true, path: null }; không hộp thoại thật nào mở
//       (hàm thay thế nhận 3/3 lời gọi, số cửa sổ giữ 1); khi hàm thay thế ném lỗi thì Promise bị từ chối với message nguyên văn "Error
//       invoking remote method 'dialog:pick-folder': Error: boom from the stub", và lời gọi sau vẫn chạy. Trong e2e: 5 bước backup đạt.
//     recorded_at: 2026-10-07T20:44:38.4471702+07:00
//
// NOTES: []
// ===WCA-CHECKPOINT-END===
/**
 * Adapters of the foundation workflow scaffold_ui: the http_client resource.
 *
 * The only file of the layer allowed to touch the bare network API (R5). It
 * does exactly three technical things: join the backend base URL with a path,
 * send the request with a timeout, and hand back either the raw response
 * (label and body) or "unreachable". It never classifies a response against
 * the contract: that is the job of each interface workflow's Adapters, the
 * only ones that know which labels an endpoint declares.
 */
import type { HttpClient, HttpMethod, HttpRequestOptions, IpcBridge, IpcInvoke, Transport } from '../../shared/resources'

/**
 * The ipc_bridge resource, built from the invoke function Main read from the
 * renderer bridge (R12): passes the call to invoke as it is and answers its
 * Promise as it is. Nothing else: no shape check (that is the job of the
 * Adapters of the workflow that calls, which know what the address answers), no
 * time limit (a dialog waits for the person), no catch (a rejected Promise goes
 * up to those Adapters).
 */
export function createIpcBridge(invoke: IpcInvoke): IpcBridge {
  return {
    call(address: string, argument: unknown): Promise<unknown> {
      return invoke(address, argument)
    },
  }
}

export function createHttpClient(backendBaseUrl: string, timeoutMs: number): HttpClient {
  return {
    async send(method: HttpMethod, path: string, options: HttpRequestOptions): Promise<Transport> {
      // 1. Join the base URL (http://127.0.0.1:<port>, no path) with the path.
      const url = new URL(backendBaseUrl + path)
      if (options.query !== null) {
        for (const [name, value] of Object.entries(options.query)) url.searchParams.set(name, value)
      }
      // Serialized outside the try block: a body that cannot be serialized is
      // a programming error and must surface as one, not as "unreachable".
      const body = options.body === null || options.body === undefined ? undefined : JSON.stringify(options.body)

      // 2. Send with a timeout that covers the status line and the whole body.
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const response = await fetch(url, {
          method,
          headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
          body,
          signal: controller.signal,
        })
        const text = await response.text()

        // 3. The raw response: status as label, JSON body or null.
        return { kind: 'response', label: response.status, body: parseJsonOrNull(text) }
      } catch (error) {
        if (controller.signal.aborted) {
          return { kind: 'unreachable', reason: `no complete response within ${timeoutMs} ms (${method} ${url.pathname})` }
        }
        const detail = error instanceof Error ? error.message : String(error)
        return { kind: 'unreachable', reason: `${detail} (${method} ${url.pathname})` }
      } finally {
        clearTimeout(timer)
      }
    },
  }
}

function parseJsonOrNull(text: string): unknown {
  if (text === '') return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}
