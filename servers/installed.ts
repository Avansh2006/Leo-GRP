/**
 * Server packs installed by the officer (from a pack file or the community directory).
 * Stored in this browser's localStorage, shared by all servers on the device.
 */

import type { ServerPack } from './types'
import { registerInstalledPack, unregisterInstalledPack, isBuiltInServerId } from './registry'
import { validatePackBundle, PACK_BUNDLE_FORMAT } from '../utils/packValidation'

const STORAGE_KEY = 'leogrp_installed_packs'

export interface PackBundle {
  format: typeof PACK_BUNDLE_FORMAT
  version: number
  exportedAt?: string
  server: ServerPack['server']
  departments: ServerPack['departments']
  commands: ServerPack['commands']
  presets: ServerPack['presets']
  legislation: ServerPack['legislation']
  reports: ServerPack['reports']
  laws?: ServerPack['laws']
}

function readAll(): Record<string, PackBundle> {
  if (typeof localStorage === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function writeAll(all: Record<string, PackBundle>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

function toPack(b: PackBundle): ServerPack {
  return {
    server: b.server,
    departments: b.departments,
    commands: b.commands,
    presets: b.presets,
    legislation: b.legislation,
    reports: b.reports,
    laws: b.laws || [],
    source: 'installed',
  }
}

export function listInstalledBundles(): PackBundle[] {
  return Object.values(readAll())
}

/** Register every installed pack so the picker and registry know about them. */
export function loadInstalledPacks(): void {
  for (const b of listInstalledBundles()) {
    if (validatePackBundle(b).errors.length === 0) registerInstalledPack(toPack(b))
  }
}

/** Validate and install a pack file. Returns the problems found (empty = installed). */
export function installPackBundle(bundle: unknown): { errors: string[]; warnings: string[]; id?: string } {
  const res = validatePackBundle(bundle)
  if (res.errors.length) return res
  const b = bundle as PackBundle
  if (isBuiltInServerId(b.server.id)) {
    return { errors: [`"${b.server.id}" is a built-in server; it can't be replaced by a pack file.`], warnings: res.warnings }
  }
  const all = readAll()
  all[b.server.id] = b
  try {
    writeAll(all)
  } catch {
    return { errors: ['Not enough browser storage to install this pack.'], warnings: res.warnings }
  }
  registerInstalledPack(toPack(b))
  return { ...res, id: b.server.id }
}

export function removeInstalledPack(id: string) {
  const all = readAll()
  delete all[id]
  writeAll(all)
  unregisterInstalledPack(id)
}

/** Build a single-file pack from a loaded pack (used by "Export this server"). */
export function packToBundle(pack: ServerPack, laws: ServerPack['laws']): PackBundle {
  return {
    format: PACK_BUNDLE_FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    server: pack.server,
    departments: pack.departments,
    commands: pack.commands,
    presets: pack.presets,
    legislation: pack.legislation,
    reports: pack.reports,
    laws: laws || [],
  }
}
