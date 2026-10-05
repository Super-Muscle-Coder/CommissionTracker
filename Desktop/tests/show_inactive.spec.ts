// DSK-18: --ct-test-show-inactive. With the flag the window is visible but does
// not take the focus from the application the person is using; without it the
// window is shown as before. Every run uses a temporary data folder and no
// dialogs. "The person is in another application" is a separate PowerShell
// process that holds the foreground (tests/fixtures/foreground_holder.ps1).
//
// Windows may refuse to give the foreground to the helper (its own foreground
// lock): then the application the person has in front stays the "other
// application", and each run records which case it was (helperWasInFront).
// Either way the claim is the same: after the run the foreground does not
// belong to the Electron process tree. Synthetic key presses to get around the
// lock are not used: they would reach whatever the person is typing in.
import { test, expect } from '@playwright/test'
import { ForegroundHolder, launchMain, mainArgs, PROBE_ROOT, stillAlive, processTree, tempDataDir, waitForExit } from './helpers'

interface Trial {
  visible: boolean
  focused: boolean
  /** The helper itself held the foreground before the run (false: Windows did
   * not let it, and the person's own application was in front). */
  helperWasInFront: boolean
  /** Process in front before the Main started, and after the window loaded. */
  foregroundBefore: number
  foregroundAfter: number
  /** The foreground window after the run belongs to the Electron process tree. */
  electronHasForeground: boolean
  logShowInactive: boolean
}

const TRIALS = 5

/** The helper asks for the foreground. Windows may refuse (its foreground
 * lock): then whatever the person has in front stays the "other application". */
async function helperInFront(holder: ForegroundHolder): Promise<boolean> {
  await holder.grab()
  await new Promise((r) => setTimeout(r, 300))
  return (await holder.foregroundPid()) === holder.pid
}

/** Starts the Main while another application holds the foreground, waits
 * until the window has loaded, then reads who holds the foreground. */
async function trial(holder: ForegroundHolder, showInactive: boolean): Promise<Trial> {
  const helperWasInFront = await helperInFront(holder)
  const foregroundBefore = await holder.foregroundPid()
  const { app, log } = await launchMain(mainArgs({ dataDir: tempDataDir(), rendererRoot: PROBE_ROOT, showInactive }))
  const page = await app.firstWindow()
  await expect(page.locator('#done')).toBeVisible({ timeout: 60_000 })
  // The window appears on a later tick than the load: let it settle.
  await new Promise((r) => setTimeout(r, 1500))
  const state = await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0]
    return { visible: win.isVisible(), focused: win.isFocused(), pid: process.pid }
  })
  const foregroundAfter = await holder.foregroundPid()
  const tree = processTree(state.pid)
  const result: Trial = {
    visible: state.visible,
    focused: state.focused,
    helperWasInFront,
    foregroundBefore,
    foregroundAfter,
    electronHasForeground: tree.some((r) => r.ProcessId === foregroundAfter),
    logShowInactive: /ready-to-show: showing the window without focus/.test(log.text),
  }
  const electronProcess = app.process()
  await app.close()
  expect(await waitForExit(electronProcess)).toBe(0)
  expect(stillAlive(tree)).toEqual([])
  return result
}

async function measure(showInactive: boolean): Promise<Trial[]> {
  const holder = await ForegroundHolder.start()
  try {
    const trials: Trial[] = []
    for (let i = 0; i < TRIALS; i++) trials.push(await trial(holder, showInactive))
    return trials
  } finally {
    await holder.stop()
  }
}

test('15. show-inactive flag: the window is visible and never takes the foreground from the other application', async () => {
  const trials = await measure(true)
  console.log(`MEASURED with --ct-test-show-inactive: ${JSON.stringify(trials)}`)
  for (const t of trials) {
    expect(t.visible).toBe(true)
    expect(t.focused).toBe(false)
    expect(t.electronHasForeground).toBe(false)
    expect(t.logShowInactive).toBe(true)
  }
})

test('16. without the flag: the window is shown as before (no show-inactive path); foreground outcome measured', async () => {
  const trials = await measure(false)
  const took = trials.filter((t) => t.electronHasForeground).length
  console.log(`MEASURED without the flag: ${JSON.stringify(trials)}; the window took the foreground in ${took} of ${trials.length} runs`)
  // Whether Windows hands the OS foreground to a new window is up to Windows
  // (foreground lock; measured above, not asserted). What the Main controls is
  // asserted: it shows and activates the window itself (isFocused() true) and
  // takes no show-inactive path. The person may switch windows during a run
  // (measured once: focused false in 1 of 5 runs, the foreground then belonged
  // to a third application), so focus is asserted over the runs, not in each.
  for (const t of trials) {
    expect(t.visible).toBe(true)
    expect(t.logShowInactive).toBe(false)
  }
  expect(trials.filter((t) => t.focused).length).toBeGreaterThanOrEqual(3)
})
