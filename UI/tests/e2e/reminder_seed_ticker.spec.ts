// UI-15 of .plan/open_issues.md: the D6 sample of the tooling must hold when another
// caller of check_due (the desktop's reminder_ticker, DSK-17, not built yet) has
// already received the due reminders: the contract hands each one out ONCE
// (data_schema.yaml, send_reminder.description), so the call of the tool then finds
// none, and the waiting list is what still has both.
//
// Deterministic: the ticker's part is played by one more POST /reminders/checks
// made by this spec just BEFORE the tool's own call (the `beforeCheck` of
// seedReminderSample). The spec proves three things: the played ticker really
// received both reminders (so the tool's own call had nothing left to receive), the
// sample still ends, and the waiting list is exactly the two reminders of the sample.
// A run of the tooling that asserted on its own call's result (the code before UI-15)
// throws here. Test tooling only: no screenshot, nothing written to UI/evidence/.
// It waits for the minute of the digest (4 to 64 seconds), like the reminder walkthroughs.
import { expect, test } from '@playwright/test'
import { d6ExpectedReminders, seedReminderSample } from '../tools/walkthrough_lib.mjs'
import { close, launch } from './walkthrough_harness.js'

type Notification = { kind: string }

test('UI-15 — the sample holds when a ticker received the due reminders first', async () => {
  const l = await launch({ seed: false })
  try {
    let receivedByTicker: Notification[] = []
    const sample = await seedReminderSample(l.baseUrl, {
      beforeCheck: async () => {
        const response = await fetch(`${l.baseUrl}/reminders/checks`, { method: 'POST' })
        expect(response.status).toBe(200)
        receivedByTicker = (await response.json()) as Notification[]
      },
    })
    // The played ticker took both; so the call of the tool received nothing, and the sample still stands.
    expect(receivedByTicker.map((n) => n.kind)).toEqual(['deadline', 'periodic_digest'])
    const waiting = await fetch(`${l.baseUrl}/reminders/pending`)
    expect(waiting.status).toBe(200)
    expect(((await waiting.json()) as Notification[]).map((n) => n.kind)).toEqual(['deadline', 'periodic_digest'])
    expect(d6ExpectedReminders(sample)).toHaveLength(2)
  } finally {
    await close(l)
  }
})
