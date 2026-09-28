// buildTree with made-up process rows (DSK-1 of .plan/open_issues.md): no
// Electron, no real process. Windows keeps a dead parent's PID in
// ParentProcessId and reuses PIDs, so a process started long before the
// backend can carry the backend's PID as its parent.
import { test, expect } from '@playwright/test'
import { buildTree, type ProcessRow } from './helpers'

function row(ProcessId: number, ParentProcessId: number, Name: string, Created: string | null): ProcessRow {
  return { ProcessId, ParentProcessId, Name, CommandLine: null, ExecutablePath: null, Created }
}

// FILETIME values above Number.MAX_SAFE_INTEGER, as processTable gives them.
const T = (offset: number) => (134349892942412680n + BigInt(offset)).toString()

const MAIN = row(100, 4, 'Commission Tracker.exe', T(1_000))
const BACKEND = row(200, 100, 'python.exe', T(2_000))
const CONHOST = row(201, 200, 'conhost.exe', T(2_001))
const GRANDCHILD = row(300, 201, 'child.exe', T(2_001)) // same tick as its parent: accepted
// Started before the backend by an earlier process that had PID 200.
const STRANGER = row(900, 200, 'rsAppUI.exe', T(500))
const STRANGER_CHILD = row(901, 900, 'rsAppUI.exe', T(600))
const OTHER = row(400, 4, 'other.exe', T(1_500))

const ROWS = [OTHER, STRANGER, STRANGER_CHILD, MAIN, BACKEND, CONHOST, GRANDCHILD]

test('buildTree: a process with a reused parent PID but created before that parent is not in the tree', () => {
  const tree = buildTree(ROWS, BACKEND.ProcessId)
  console.log(`buildTree(backend): ${JSON.stringify(tree.map((r) => [r.ProcessId, r.Name]))}`)
  expect(tree).toEqual([BACKEND, CONHOST, GRANDCHILD])
})

test('buildTree: the whole tree of the main process, root first', () => {
  expect(buildTree(ROWS, MAIN.ProcessId)).toEqual([MAIN, BACKEND, CONHOST, GRANDCHILD])
})

test('buildTree: unknown root, or a child without creation time', () => {
  expect(buildTree(ROWS, 12345)).toEqual([])
  const noDate = row(202, 200, 'nodate.exe', null)
  expect(buildTree([BACKEND, noDate], BACKEND.ProcessId)).toEqual([BACKEND])
})
