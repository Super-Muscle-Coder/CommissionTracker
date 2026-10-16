// Test of isOwnDataDir (R44-16, session 44): the guard before the tool deletes a
// folder whose path it read from a file. Strings only; no folder is made or deleted.
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { DATA_DIR_PREFIX, isOwnDataDir } from './walkthrough_lib.mjs'

const TMP = path.join(path.parse(os.tmpdir()).root, 'sandbox_tmp', 'T')
const own = (name: string) => path.join(TMP, name)

describe('isOwnDataDir', () => {
  it('a folder made by makeDataDir, directly in the temp folder → yes', () => {
    expect(isOwnDataDir(own(`${DATA_DIR_PREFIX}Ab12Cd`), TMP)).toBe(true)
  })
  it('the real temp folder is the default', () => {
    expect(isOwnDataDir(path.join(os.tmpdir(), `${DATA_DIR_PREFIX}Ab12Cd`))).toBe(true)
  })
  it('outside the temp folder → no', () => {
    expect(isOwnDataDir(path.join(path.parse(TMP).root, 'other', `${DATA_DIR_PREFIX}Ab12Cd`), TMP)).toBe(false)
    expect(isOwnDataDir(path.join(path.dirname(TMP), `${DATA_DIR_PREFIX}Ab12Cd`), TMP)).toBe(false)
  })
  it('the wrong prefix → no', () => {
    expect(isOwnDataDir(own('ct-ui-other-Ab12Cd'), TMP)).toBe(false)
    expect(isOwnDataDir(own('Ab12Cd'), TMP)).toBe(false)
  })
  it('the prefix alone, with no suffix → no', () => {
    expect(isOwnDataDir(own(DATA_DIR_PREFIX), TMP)).toBe(false)
  })
  it('a path with ".." → no, even if it resolves to a valid folder', () => {
    expect(isOwnDataDir(`${TMP}${path.sep}x${path.sep}..${path.sep}${DATA_DIR_PREFIX}Ab12Cd`, TMP)).toBe(false)
    expect(isOwnDataDir(`${TMP}${path.sep}${DATA_DIR_PREFIX}Ab12Cd${path.sep}..${path.sep}..`, TMP)).toBe(false)
  })
  it('nested deeper than one level → no', () => {
    expect(isOwnDataDir(path.join(own(`${DATA_DIR_PREFIX}Ab12Cd`), 'deeper'), TMP)).toBe(false)
    expect(isOwnDataDir(path.join(TMP, 'x', `${DATA_DIR_PREFIX}Ab12Cd`), TMP)).toBe(false)
  })
  it('not a string, or empty → no', () => {
    for (const bad of [undefined, null, 42, {}, '']) expect(isOwnDataDir(bad, TMP)).toBe(false)
  })
})
