// Shared by the walkthrough tools (npm run walkthrough:app, npm run
// walkthrough:backend) and the automated walkthrough (tests/e2e). Test tooling
// only: never part of the layer, never loaded by the renderer.
//
// The desktop app is started from Desktop/ with its test flags
// (Desktop/configs/desktop.json test_flags): a temporary data folder (never
// the real %APPDATA%) and, as backend script, the fixture
// tests/fixtures/switchable_backend.py run from Backend/ by the default
// interpreter. Sample data goes in through the backend's declared endpoints
// (api_contract.yaml 4.0.0, manage_client.create_client and
// set_client_archived): this tool is a test, not the layer.
import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const UI_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
export const DESKTOP_ROOT = path.resolve(UI_ROOT, '..', 'Desktop')
export const BACKEND_ROOT = path.resolve(UI_ROOT, '..', 'Backend')
export const FIXTURE = path.join(UI_ROOT, 'tests', 'fixtures', 'switchable_backend.py')
export const SESSION_FILE = path.join(os.tmpdir(), 'ct-ui-walkthrough-session.json')

const CONTROL_FILE = 'switchable_backend.control'
const STATE_FILE = 'switchable_backend.state'

export const desktopConfig = JSON.parse(fs.readFileSync(path.join(DESKTOP_ROOT, 'configs', 'desktop.json'), 'utf8'))

// Who runs the walkthrough, as written in every run record (iWCA I6.3: the
// runner is always named). Taken from the environment variable
// CT_WALKTHROUGH_RUNNER, e.g. coding-agent@2026-09-28#1 or the Project
// Owner's name; 'unknown' when it is missing or blank. Never guessed.
export const RUNNER_VARIABLE = 'CT_WALKTHROUGH_RUNNER'
export function walkthroughRunner() {
  const value = (process.env[RUNNER_VARIABLE] ?? '').trim()
  return value === '' ? 'unknown' : value
}

// Where the evidence of a run (screenshots, run records) is written — the only
// place that decides it (UI-8 of .plan/open_issues.md). A named runner writes
// the evidence kept in git, UI/evidence/. Without CT_WALKTHROUGH_RUNNER (a
// regression run, e.g. by another layer's session) it goes to draft evidence
// under UI/test-results/, which git ignores, so committed evidence is never
// overwritten by a run nobody signed.
export function evidenceRoot() {
  const named = (process.env[RUNNER_VARIABLE] ?? '').trim() !== ''
  return named ? path.join(UI_ROOT, 'evidence') : path.join(UI_ROOT, 'test-results', 'evidence')
}

// require('electron') from Node answers the path of the Electron binary.
export function electronBinary() {
  return createRequire(path.join(DESKTOP_ROOT, 'package.json'))('electron')
}

export function makeDataDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ct-ui-walkthrough-'))
}

// Arguments of the Electron binary: the desktop app, with the fixture as backend.
export function launchArgs(dataDir, { noDialog }) {
  const flags = desktopConfig.test_flags
  return [
    DESKTOP_ROOT,
    `${flags.data_dir}${dataDir}`,
    `${flags.backend_script}${FIXTURE}`,
    `${flags.backend_working_dir}${BACKEND_ROOT}`,
    ...(noDialog ? [flags.no_dialog] : []),
  ]
}

// The desktop Main logs "backend READY on port N" on stderr.
export function portFromLog(log) {
  const m = /backend READY on port (\d+)/.exec(log)
  return m === null ? null : Number(m[1])
}

export function baseUrlFor(port) {
  return `http://${desktopConfig.boundary.loopback_host}:${port}`
}

// Folder of CT_DB_FILE_PATH for this data folder (where the fixture reads its control file).
function dbFolder(dataDir) {
  return path.dirname(path.join(dataDir, ...desktopConfig.boundary.db_file_relative_to_app_data.split('/')))
}

export function writeSession(session) {
  fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2))
}

export function readSession() {
  if (!fs.existsSync(SESSION_FILE)) {
    throw new Error(`No running walkthrough app (${SESSION_FILE} is missing): start one with npm run walkthrough:app`)
  }
  return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'))
}

export function clearSession() {
  fs.rmSync(SESSION_FILE, { force: true })
}

// Switch the backend behind the running app off ('down') or on ('up'), and
// wait until the fixture reports the switch done.
export async function setBackend(dataDir, wanted, timeoutMs = 60_000) {
  if (wanted !== 'down' && wanted !== 'up') throw new Error(`expected down or up, got ${JSON.stringify(wanted)}`)
  const folder = dbFolder(dataDir)
  fs.writeFileSync(path.join(folder, CONTROL_FILE), wanted)
  const statePath = path.join(folder, STATE_FILE)
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const state = fs.existsSync(statePath) ? fs.readFileSync(statePath, 'utf8').trim() : null
    if (state === wanted) return
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`the backend did not switch ${wanted} within ${timeoutMs} ms`)
}

// Sample data of the walkthroughs (client_list, client_detail, client_form):
// six names created in a jumbled order, one client with contacts and a note,
// and one archived client.
export const SAMPLE_ACTIVE = ['Zoe', 'Đức', 'An', 'Dung', 'Ánh', 'Bảo']
export const SAMPLE_DETAILED = {
  display_name: 'Nguyễn Thu Hà',
  contacts: [
    { channel: 'facebook', value: 'fb.com/thuha.art' },
    { channel: 'email', value: 'thuha@example.com' },
  ],
  note: 'Thích tông màu ấm. Giao file PSD.',
}
export const SAMPLE_ARCHIVED = ['Hà']
// What the list page must show (Vietnamese alphabetical order).
export const EXPECTED_ACTIVE = ['An', 'Ánh', 'Bảo', 'Dung', 'Đức', 'Nguyễn Thu Hà', 'Zoe']
export const EXPECTED_ARCHIVED = ['Hà']

async function call(baseUrl, method, pathname, body, expectedStatus) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await response.text()
  if (response.status !== expectedStatus) {
    throw new Error(`${method} ${pathname}: expected ${expectedStatus}, got ${response.status} ${text}`)
  }
  return JSON.parse(text)
}

// Sample data of the D2 walkthroughs (commission_list, commission_detail,
// commission_form), with clients of their own — never those of the D1 sample:
// three clients; three commissions, created more than a second apart so that
// "most recently updated first" is a fixed order (the backend writes
// updated_at to the second); then "Lan Chi" is archived (her commission keeps
// her, which the contract allows).
export const D2_CLIENTS = { full: 'Mai Anh', usd: 'Quốc Bảo', archived: 'Lan Chi' }
export const D2_COMMISSIONS = {
  full: {
    client: 'full',
    title: 'Chân dung bán thân',
    commission_type: 'bán thân',
    agreed_price: { amount_minor: 1500000, currency: 'VND' },
    deadline: '2026-10-15',
    description: 'Nền xanh, ánh sáng dịu.',
    reference_links: ['https://example.com/ref-1', 'https://example.com/ref-2'],
  },
  usd: {
    client: 'usd',
    title: 'Chibi đôi',
    commission_type: null,
    agreed_price: { amount_minor: 1250, currency: 'USD' },
    deadline: null,
    description: null,
    reference_links: [],
  },
  archived: {
    client: 'archived',
    title: 'Minh họa bìa sách',
    commission_type: 'minh họa',
    agreed_price: { amount_minor: 9000000, currency: 'VND' },
    deadline: '2026-01-01',
    description: null,
    reference_links: [],
  },
}
// What the list page must show, most recently updated first: [title, secondary line].
export const D2_EXPECTED_LIST = [
  ['Minh họa bìa sách', 'Lan Chi · 9.000.000 VND · Hạn giao 01/01/2026'],
  ['Chibi đôi', 'Quốc Bảo · 12,50 USD · Không có hạn'],
  ['Chân dung bán thân', 'Mai Anh · 1.500.000 VND · Hạn giao 15/10/2026'],
]

export async function seedCommissionSample(baseUrl) {
  const clients = {}
  for (const [key, name] of Object.entries(D2_CLIENTS)) {
    clients[key] = (await call(baseUrl, 'POST', '/clients', { client_input: { display_name: name, contacts: [], note: null } }, 201)).client_id
  }
  const ids = {}
  for (const [key, c] of Object.entries(D2_COMMISSIONS)) {
    if (Object.keys(ids).length > 0) await new Promise((resolve) => setTimeout(resolve, 1100))
    // create_commission: POST /commissions, body { commission_input } (endpoint_forms.http).
    const { client, ...rest } = c
    ids[key] = (await call(baseUrl, 'POST', '/commissions', { commission_input: { client_id: clients[client], ...rest } }, 201)).commission_id
  }
  await call(baseUrl, 'PUT', `/clients/${clients.archived}/archived`, { is_archived: true }, 200)
  return { clients, commissions: ids }
}

export async function seedSampleData(baseUrl) {
  // create_client: POST /clients, input [client_input]. endpoint_forms.http:
  // a JSON body whose keys are the input NAMES, so { client_input: {...} }.
  const create = (clientInput) => call(baseUrl, 'POST', '/clients', { client_input: clientInput }, 201)
  const plain = (name) => ({ display_name: name, contacts: [], note: null })
  for (const name of SAMPLE_ACTIVE) await create(plain(name))
  await create(SAMPLE_DETAILED)
  for (const name of SAMPLE_ARCHIVED) {
    const created = await create(plain(name))
    // set_client_archived: PUT /clients/{client_id}/archived, body { is_archived }.
    await call(baseUrl, 'PUT', `/clients/${created.client_id}/archived`, { is_archived: true }, 200)
  }
}
