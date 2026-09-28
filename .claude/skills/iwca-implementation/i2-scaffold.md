# GIAI ĐOẠN I2 — DỰNG KHUNG LAYER GIAO DIỆN

*Giai đoạn thứ hai của iWCA, sau khi đã hoàn thành [I1](i1-decompose.md). Làm đúng một lần cho cả layer, trước phiên viết workflow giao diện đầu tiên. Xem [SKILL.md](SKILL.md) để biết toàn bộ các giai đoạn. Thuật ngữ dùng trong tệp này theo đúng định nghĩa tại §0 của [lý thuyết WCA](../wca-implementation/wca_theory_compressed.md) và của [lý thuyết iWCA](iwca_theory.md).*

| | |
|---|---|
| **Input** | Bốn bảng đầu ra của I1 — đặc biệt bảng giá trị khởi động và workflow nền tảng. |
| **Hành động** | Chốt bố cục và công nghệ; hiện thực hóa ma trận phụ thuộc bằng máy; dựng một lệnh kiểm tra duy nhất; chứng minh từng luật thực sự bắt được vi phạm; dựng workflow nền tảng, Main, và bộ khung tối thiểu của ba phân khu. |
| **Output** | Một layer giao diện rỗng nhưng hoàn chỉnh: khởi động được, hiện đúng màn hình lỗi khởi động khi thiếu giá trị khởi động, lệnh kiểm tra chạy đạt, và mỗi luật của ma trận đã có bằng chứng rằng nó cắn. |

⚠ Giai đoạn này khác các giai đoạn còn lại của iWCA giống như Bước 2.4 khác phần còn lại của Giai đoạn 2 trong WCA: bố cục (Bước I2.1) và việc hiện thực hóa ma trận (Bước I2.3) là đặc tả, không phải gợi ý. Lý do rất thực tế: mọi luật ranh giới của iWCA chỉ có giá trị khi có máy kiểm. Một layer giao diện bắt đầu viết workflow trước khi cơ chế kiểm được dựng sẽ tích lũy vi phạm ngay từ những dòng đầu tiên — và vi phạm tích lũy trước khi có luật thì không ai coi là vi phạm.

## Bước I2.1 — Chốt bố cục thư mục

Bố cục mặc định, đi theo đúng trục của WCA — **theo phân khu trước, trong phân khu logic thì theo workflow trước, theo lớp sau**:

```
<layer giao diện>/
  src/
    main.tsx                           # Main — khối checkpoint `main` ở đầu tệp
    configs/
      layer_configs.ts                 # cấu hình cấp layer; hiện thực hóa ResultMessages
    logic/
      shared/
        results.ts                     # hai kiểu kết quả và những gì đi kèm (§6 lý thuyết iWCA)
        resources.ts                   # giao diện lập trình của tài nguyên nền tảng
      workflows/
        <workflow nền tảng>/           # chỉ những lớp việc chuẩn bị cần
        <tên workflow giao diện>/
          configs.ts
          entities.ts
          adapters.ts
          services.ts                  # khối checkpoint của workflow ở đầu tệp
          routers.ts
          tests/
    kit/
      index.ts                         # lối công khai duy nhất — khối checkpoint `kit`
      tokens/tokens.css                # nguồn duy nhất của mọi giá trị trình bày
      styles/global.css
      components/<TênComponent>/
        <TênComponent>.tsx
        <TênComponent>.module.css
    screens/
      navigation.ts                    # bảng điều hướng — khối checkpoint `screens`
      logic_context.ts                 # ngữ cảnh chứa Routers do Main trao
      assert_never.ts                  # bản riêng của phân khu màn hình (R8)
      app_root.tsx                     # gốc giao diện: layout + điều hướng
      layouts/<tên layout>/
      pages/<tên trang>/
        <TênTrang>.tsx
        use_<tên trang>.ts             # hook màn hình của trang
        walkthrough.yaml               # kịch bản bấm thử (xem I6)
        tests/
```

Tên tệp trong phân khu logic và phân khu màn hình theo quy ước viết thường có gạch dưới, giống các layer WCA khác; tên component theo quy ước của thư viện giao diện (ví dụ `PascalCase` với React). Một dự án có thể đổi bố cục, miễn giữ đúng ba điều: ba phân khu nằm ở ba thư mục tách biệt, phân khu logic tổ chức theo workflow trước, và bố cục được chốt **trước** phiên viết code đầu tiên rồi giữ nhất quán về sau. Đổi bố cục thì ánh xạ lại đường dẫn trong ma trận phụ thuộc (§7 của lý thuyết iWCA), không đổi luật.

## Bước I2.2 — Chốt công nghệ, và ghi lại

Chốt và ghi vào tài liệu nền của dự án: ngôn ngữ và chế độ kiểm kiểu (ví dụ TypeScript ở chế độ `strict`), thư viện giao diện, công cụ build, trình chạy kiểm thử cho phân khu logic, công cụ kiểm tra import và cú pháp, công cụ kiểm tra style, và cách môi trường chủ trao giá trị khởi động (lấy từ bảng của I1).

Nguyên tắc chọn: iWCA không bắt buộc công cụ nào; nó bắt buộc **mọi luật trong ma trận phụ thuộc phải có một cơ chế kiểm**. Vì vậy câu hỏi khi chọn công cụ không phải "công cụ nào phổ biến", mà là "với công cụ này, mình diễn đạt được R1 tới R14 không?" Luật nào công cụ không diễn đạt được thì phải có một script kiểm tra riêng, viết ngay ở giai đoạn này.

## Bước I2.3 — Hiện thực hóa ma trận phụ thuộc bằng máy

Với từng luật của ma trận ([§7 của lý thuyết iWCA](iwca_theory.md)), xác định cơ chế kiểm và cấu hình nó. Bảng dưới đây là **loại** cơ chế mỗi luật cần; cột ví dụ nêu một cách hiện thực hóa với hệ công cụ TypeScript + ESLint + stylelint phổ biến tại thời điểm viết tài liệu này. Tên luật cụ thể của công cụ thay đổi theo phiên bản — kiểm lại với tài liệu của phiên bản đang dùng lúc dựng, không chép máy móc.

| Luật | Loại cơ chế | Ví dụ hiện thực hóa |
|---|---|---|
| R1, R3, R6 | Cấm import theo vùng tệp | `no-restricted-imports` (hoặc bản của typescript-eslint) với `patterns`, áp riêng cho từng vùng tệp bằng khối cấu hình theo `files` |
| R2 | Cấm import chéo giữa các thư mục anh em | Một plugin kiểm ranh giới theo phần tử (ví dụ `eslint-plugin-boundaries`), hoặc một script nhỏ: với mỗi tệp trong `logic/workflows/<A>/`, mọi import tương đối phải nằm trong `<A>/` hoặc `logic/shared/` |
| R4, R5, R11, R12 | Cấm dùng biến toàn cục hay thuộc tính theo vùng tệp, có ngoại lệ theo tệp | `no-restricted-globals`, `no-restricted-properties`, `no-restricted-syntax`; ngoại lệ bằng khối cấu hình riêng cho đúng tệp được phép (ví dụ `adapters.ts` của workflow nền tảng với R5, `main.tsx` với R12) |
| R7 | Cấm giá trị trình bày thô trong style, trừ tệp token | Các luật lõi của stylelint như `color-no-hex`, `color-named`, `function-disallowed-list`, `unit-disallowed-list`; tệp token được miễn bằng khối cấu hình riêng |
| R8 | Chỉ cho import kiểu, từ đúng một loại tệp | Cấm import vào `logic/**` trừ `logic/workflows/*/routers`, và với đường đó chỉ cho phép import kiểu (ví dụ tùy chọn cho phép import kiểu của luật cấm import trong typescript-eslint) |
| R9 | Chỉ cho import qua một tệp | Cấm import `kit/**` trừ `kit/index` |
| R10 | Cấm tệp style và prop style trong một vùng | Cấm import `*.css` trong `screens/**`; cấm prop `style` và `className` (ví dụ các luật cấm prop của plugin React cho ESLint) |
| R13 | Phân nhánh đầy đủ | Kiểm kiểu ở chế độ nghiêm ngặt, luật kiểm `switch` đầy đủ (ví dụ `switch-exhaustiveness-check` của typescript-eslint), và mẫu `assertNever` ở nhánh cuối |
| R14 | Chỉ một số tệp được import giá trị từ một nhóm tệp | Cấm import vào `logic/workflows/*/configs` và `configs/**` ở mọi tệp trừ Main và tệp kiểm thử, và với đường đó chỉ cho phép import kiểu — cùng cơ chế với R8 |

⚠ Một luật chỉ được coi là đã hiện thực hóa khi nó **cắn**. Cấu hình một luật rồi tin rằng nó chạy là đúng dạng "tự báo hoàn thành" mà WCA không chấp nhận ở bất kỳ đâu. Bước I2.5 đòi bằng chứng cho từng luật.

## Bước I2.4 — Dựng một lệnh kiểm tra duy nhất

Gom mọi cơ chế kiểm vào **một lệnh duy nhất** (ví dụ `npm run check`), chạy theo thứ tự: kiểm kiểu, kiểm import và cú pháp, kiểm style, chạy kiểm thử. Lệnh trả về mã khác 0 khi có bất kỳ vi phạm nào, ở bất kỳ bước nào.

Lệnh này có ba vai trò cùng lúc: là cách người viết code tự kiểm trước khi coi việc là xong, là bằng chứng chạy thật của phân khu logic ở [I6](i6-self-check.md), và là thứ người điều phối chạy lại khi rà soát. Vì vậy nó phải chạy được trên một máy sạch chỉ với các lệnh cài đặt thông thường của dự án, không phụ thuộc gì vào máy của người viết.

## Bước I2.5 — Chứng minh từng luật thực sự cắn

Với mỗi luật R1 tới R14, tạo một tệp tạm vi phạm đúng luật đó, ở đúng vùng tệp mà luật áp dụng, chạy lệnh kiểm tra, xác nhận nó thất bại và thông báo lỗi chỉ đúng vào vi phạm vừa tạo. Rồi xóa tệp tạm, chạy lại, xác nhận đạt. Với những luật có ngoại lệ (R5, R7, R12, R14), kiểm thêm chiều ngược lại: đặt đúng thứ đó vào đúng tệp được miễn, xác nhận lệnh vẫn đạt.

Ghi kết quả vào mục EVIDENCE của checkpoint `main`: luật nào, tệp tạm nào, lệnh nào, thông báo lỗi thô. Đây là bằng chứng duy nhất cho thấy ma trận phụ thuộc tồn tại thật, chứ không chỉ tồn tại trong tài liệu.

## Bước I2.6 — Dựng workflow nền tảng, Main và khung tối thiểu của ba phân khu

**Phân khu logic:** viết `logic/shared/results.ts` đúng đặc tả ở [§6 của lý thuyết iWCA](iwca_theory.md), và `logic/shared/resources.ts` khai báo giao diện lập trình của từng tài nguyên nền tảng. Viết workflow nền tảng theo bảng của I1. Tài nguyên HTTP client của nó làm đúng ba việc kỹ thuật và không hơn: ghép địa chỉ gốc với đường dẫn, gửi yêu cầu có thời gian chờ, và trả về hoặc phản hồi thô (nhãn kết quả cùng thân phản hồi), hoặc một kết quả "không tới được". Nó **không** phân loại phản hồi theo hợp đồng — việc đó là của Adapters từng workflow giao diện, vì chỉ chúng biết điểm giao tiếp nào khai báo nhãn nào.

**Phân khu kit:** tệp token với bộ token nền (màu, khoảng cách, cỡ chữ), tệp style toàn cục, lối công khai `kit/index`, và đúng những component mà khung cần — thường là component bố cục cơ bản và một component hiện thông báo lỗi nghiêm trọng cho màn hình lỗi khởi động.

**Phân khu màn hình:** `logic_context.ts` khai báo ngữ cảnh chứa Routers (kiểu của nó được ghép từ kiểu Routers của từng workflow giao diện), cùng một hook để trang lấy Routers từ ngữ cảnh; `navigation.ts` với bảng điều hướng; `app_root.tsx` dựng layout chính và điều hướng.

**Main**, theo đúng thứ tự — cùng tinh thần [Giai đoạn 4 WCA, Bước 4.5](../wca-implementation/04-implement.md):

1. **Đọc giá trị khởi động** từ môi trường chủ, đúng cách đã ghi ở bảng của I1, và kiểm định dạng từng giá trị. Nếu có giá trị thiếu hoặc sai: dựng màn hình lỗi khởi động bằng component kit, nêu rõ giá trị nào, rồi **dừng** — không dựng phần còn lại của ứng dụng, không dùng giá trị mặc định.
2. **Đọc Configs** cấp layer và của từng workflow.
3. **Khởi tạo workflow nền tảng**, lấy tài nguyên.
4. **Với mỗi workflow giao diện:** tạo Adapters với tài nguyên và Configs của nó, tiêm Adapters và Configs (cùng câu thông báo chung cấp layer) vào Services, tạo Routers với Services.
5. **Đặt tập hợp Routers vào ngữ cảnh** và dựng giao diện gốc.

Main không có nhánh xử lý nào khác ngoài nhánh lỗi khởi động ở bước 1. Nếu thấy mình viết thêm một điều kiện trong Main, đó là dấu hiệu logic đang bị đặt sai chỗ.

**Checkpoint:** tạo ba khối checkpoint `main`, `kit`, `screens` theo [§8 của lý thuyết iWCA](iwca_theory.md), đúng khuôn [Giao thức 07](../wca-implementation/07-checkpoint-protocol.md). Mục EVIDENCE của khối `main` chứa bằng chứng của Bước I2.5 và của hai lần khởi động ở tiêu chí dưới đây.

**Checklist:**

- [ ] Bố cục thư mục đã được chốt và ghi vào tài liệu nền của dự án, trước khi có dòng code workflow nào.
- [ ] Công nghệ đã được chốt và ghi lại, kèm cách môi trường chủ trao giá trị khởi động.
- [ ] **Mỗi luật R1 tới R14 có một cơ chế kiểm bằng máy — công cụ hoặc script riêng — không luật nào chỉ tồn tại trong tài liệu.**
- [ ] Có đúng một lệnh kiểm tra, gom mọi cơ chế, trả mã khác 0 khi có bất kỳ vi phạm nào.
- [ ] **Mỗi luật đã có bằng chứng rằng nó cắn: một vi phạm có chủ đích bị bắt, thông báo lỗi chỉ đúng chỗ; với luật có ngoại lệ, tệp được miễn thực sự được miễn.**
- [ ] `logic/shared/` chỉ chứa `results` và `resources`, đúng đặc tả.
- [ ] Workflow nền tảng là nơi duy nhất dùng API mạng hoặc kênh liên tiến trình trần, và không phân loại phản hồi theo hợp đồng.
- [ ] Main làm đúng năm việc theo đúng thứ tự; thiếu giá trị khởi động thì hiện màn hình lỗi khởi động và dừng.
- [ ] Ba khối checkpoint `main`, `kit`, `screens` đã được tạo, đúng khuôn và đúng vị trí.

⚠ Quy tắc quay lui: nếu ở I3 trở đi phát hiện một vi phạm mà lệnh kiểm tra không bắt được, đó không phải lỗi của đoạn code vừa viết — đó là lỗi của I2. Quay lại Bước I2.3, bổ sung cơ chế kiểm, chứng minh nó cắn theo Bước I2.5, rồi mới sửa đoạn code vi phạm. Sửa code mà không vá cơ chế kiểm nghĩa là vi phạm tương tự sẽ quay lại ở phiên sau.

---

## Minh họa — dựng khung cho giao diện của hệ thống đặt lịch hẹn

⚠ Lưu ý trước khi đọc phần này: các đoạn code dưới đây minh họa cho đúng một hệ công cụ (TypeScript, React, Vite, ESLint, stylelint, Vitest). Một dự án khác có thể chọn công cụ khác hoàn toàn. Điều không được khác đi là bố cục ba phân khu, mười bốn luật của ma trận và bằng chứng rằng chúng cắn, cùng thứ tự việc của Main.

**Bước I2.1–I2.2:** Bố cục đúng mặc định. Công nghệ: TypeScript `strict`, React, Vite, Vitest, ESLint với typescript-eslint và plugin React, stylelint. Giá trị khởi động `backend_base_url` được trao qua biến môi trường lúc build `VITE_BACKEND_BASE_URL`.

**Bước I2.3** — trích một phần cấu hình kiểm import, đủ để thấy cách một luật được áp theo vùng tệp:

```js
// eslint.config.js (trích)
export default [
  {
    files: ['src/logic/**/*.ts'],
    rules: {
      // R1
      'no-restricted-imports': ['error', { patterns: [
        { group: ['react', 'react-dom', 'react/*'], message: 'R1: logic zone must not depend on the UI library' },
        { group: ['**/kit/**', '**/screens/**', '**/main'], message: 'R1: logic zone must not import kit, screens or Main' },
      ] }],
      // R4 + R5 trong MỘT danh sách — mọi tệp logic, trừ ngoại lệ ở khối bên dưới
      'no-restricted-globals': ['error', 'window', 'document', 'navigator', 'fetch', 'XMLHttpRequest', 'WebSocket', 'localStorage', 'sessionStorage'],
    },
  },
  {
    files: ['src/logic/workflows/scaffold_ui/adapters.ts'],
    rules: {
      // R5 — ngoại lệ duy nhất cho API mạng
      'no-restricted-globals': ['error', 'window', 'document', 'navigator', 'XMLHttpRequest', 'WebSocket', 'localStorage', 'sessionStorage'],
    },
  },
  {
    files: ['src/screens/**/*.{ts,tsx}'],
    rules: {
      // R10
      'react/forbid-component-props': ['error', { forbid: ['style', 'className'] }],
      'react/forbid-dom-props': ['error', { forbid: ['style', 'className'] }],
    },
  },
  // … R2 bằng một script riêng; R6, R8, R9, R11, R12, R13 tương tự
]
```

Một cái bẫy có thật ở đoạn trên: R4 và R5 dùng chung một luật của công cụ. Nếu viết thành hai dòng `no-restricted-globals` riêng trong cùng một khối cấu hình, khóa sau ghi đè khóa trước và một trong hai luật lặng lẽ biến mất — cấu hình trông đúng nhưng không cắn. Bước I2.5 tồn tại chính để bắt loại lỗi này. Cũng vì vậy, khối cấu hình ngoại lệ cho `scaffold_ui/adapters.ts` phải liệt kê lại toàn bộ danh sách trừ đúng một mục được miễn, không chỉ ghi mục được miễn.

**Bước I2.5:** Tạo `src/logic/workflows/book_appointment/_violation.ts` chứa `import React from 'react'`, chạy `npm run check` — thất bại với thông báo "R1: logic zone must not depend on the UI library", đúng tệp đó. Xóa tệp, chạy lại — đạt. Lặp lại cho mười ba luật còn lại. Với R5, đặt `fetch` vào `scaffold_ui/adapters.ts` — đạt; đặt đúng dòng đó vào `book_appointment/adapters.ts` — thất bại. Mọi kết quả thô được ghi vào EVIDENCE của khối `main`.

**Bước I2.6** — tài nguyên nền tảng và Main:

```ts
// src/logic/shared/resources.ts
export type Transport =
  | { kind: 'response'; label: number; body: unknown }   // body: JSON đã parse, hoặc null nếu thân rỗng/không phải JSON
  | { kind: 'unreachable'; reason: string }

export interface HttpClient {
  send(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    options: { query: Record<string, string> | null; body: unknown | null },
  ): Promise<Transport>
}
```

```ts
// src/logic/workflows/scaffold_ui/adapters.ts
// ===WCA-CHECKPOINT-START===
// … (workflow nền tảng không có Services nên khối checkpoint nằm ở đây)
// ===WCA-CHECKPOINT-END===
import type { HttpClient, Transport } from '../../shared/resources'

export function createHttpClient(baseUrl: string, timeoutMs: number): HttpClient {
  return {
    async send(method, path, { query, body }): Promise<Transport> {
      const url = new URL(path, baseUrl)
      if (query !== null) for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const res = await fetch(url, {
          method,
          headers: body === null ? {} : { 'Content-Type': 'application/json' },
          body: body === null ? undefined : JSON.stringify(body),
          signal: controller.signal,
        })
        const text = await res.text()
        let parsed: unknown = null
        try { parsed = text === '' ? null : JSON.parse(text) } catch { parsed = null }
        return { kind: 'response', label: res.status, body: parsed }
      } catch (e) {
        return { kind: 'unreachable', reason: e instanceof Error ? e.message : String(e) }
      } finally {
        clearTimeout(timer)
      }
    },
  }
}
```

Tài nguyên không biết điểm giao tiếp nào tồn tại, không biết nhãn nào là lỗi. Nó chỉ gửi và trả về thứ nhận được.

```tsx
// src/main.tsx
// ===WCA-CHECKPOINT-START===
// … (khối checkpoint `main`)
// ===WCA-CHECKPOINT-END===
import { createRoot } from 'react-dom/client'
import { LAYER_CONFIGS } from './configs/layer_configs'
import { SCAFFOLD_UI_CONFIGS } from './logic/workflows/scaffold_ui/configs'
import { createHttpClient } from './logic/workflows/scaffold_ui/adapters'
import { BOOK_APPOINTMENT_CONFIGS } from './logic/workflows/book_appointment/configs'
import { createBookAppointmentAdapters } from './logic/workflows/book_appointment/adapters'
import { createBookAppointmentServices } from './logic/workflows/book_appointment/services'
import { createBookAppointmentRouters } from './logic/workflows/book_appointment/routers'
import { LogicContext } from './screens/logic_context'
import { AppRoot } from './screens/app_root'
import { FatalMessage } from './kit'

const root = createRoot(document.getElementById('root')!)

// 1. Giá trị khởi động — thiếu hoặc sai thì dừng, không đoán.
const baseUrl: unknown = import.meta.env.VITE_BACKEND_BASE_URL
if (typeof baseUrl !== 'string' || !/^https?:\/\/[^/]+$/.test(baseUrl)) {
  root.render(
    <FatalMessage
      title={LAYER_CONFIGS.startupFailure.title}
      detail={`${LAYER_CONFIGS.startupFailure.missingLaunchValue}: VITE_BACKEND_BASE_URL`}
    />,
  )
} else {
  // 2–3. Configs đã được import ở trên; khởi tạo workflow nền tảng.
  const http = createHttpClient(baseUrl, SCAFFOLD_UI_CONFIGS.timeoutMs)

  // 4. Ráp nối từng workflow giao diện: Adapters → Services → Routers.
  const bookAppointment = createBookAppointmentRouters(
    createBookAppointmentServices(
      createBookAppointmentAdapters(http, BOOK_APPOINTMENT_CONFIGS),
      BOOK_APPOINTMENT_CONFIGS,
      LAYER_CONFIGS.resultMessages,
    ),
  )

  // 5. Trao Routers cho phân khu màn hình, dựng giao diện gốc.
  root.render(
    <LogicContext.Provider value={{ bookAppointment }}>
      <AppRoot />
    </LogicContext.Provider>,
  )
}
```

**Kết quả:** chạy ứng dụng với `VITE_BACKEND_BASE_URL` đúng — layout chính hiện ra, rỗng. Chạy khi thiếu biến đó — màn hình lỗi khởi động hiện đúng tên giá trị thiếu, không có gì khác được dựng. `npm run check` đạt. Mười bốn luật có bằng chứng cắn. Layer sẵn sàng cho workflow giao diện đầu tiên ở I3.
