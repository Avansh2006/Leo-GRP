/**
 * Server Pack registry (no React here, so server components and plain utils can import it).
 *
 * The chosen server is stored in the `leogrp_server` cookie. The root layout reads it on the
 * server and hands it to <ServerProvider>; in the browser this module reads the same cookie when
 * it loads, so getActivePack() and useServerPack() always agree. Switching servers reloads the page.
 */

import type { ServerPack, Department, PackCommand, PackCommandCategory, RadioChannel, ServerFeatures } from './types'

import grpServer from './grandrp-en3/server.json'
import grpDepartments from './grandrp-en3/departments.json'
import grpCommands from './grandrp-en3/commands.json'
import grpPresets from './grandrp-en3/presets.json'
import grpLegislation from './grandrp-en3/legislation.json'
import grpReports from './grandrp-en3/reports.json'

import genServer from './generic/server.json'
import genDepartments from './generic/departments.json'
import genCommands from './generic/commands.json'
import genPresets from './generic/presets.json'
import genLegislation from './generic/legislation.json'
import genReports from './generic/reports.json'

export * from './types'

const grandRpEn3: ServerPack = {
  server: grpServer as ServerPack['server'],
  departments: grpDepartments,
  commands: grpCommands as ServerPack['commands'],
  presets: grpPresets,
  legislation: grpLegislation as ServerPack['legislation'],
  reports: grpReports,
}

const generic: ServerPack = {
  server: genServer as ServerPack['server'],
  departments: genDepartments,
  commands: genCommands as ServerPack['commands'],
  presets: genPresets,
  legislation: genLegislation as ServerPack['legislation'],
  reports: genReports,
}

/**
 * All available packs, in the order shown in the server picker: built-in packs first, then
 * packs the officer installed in this browser (registered at runtime by registerInstalledPack).
 */
export const SERVER_PACKS: Record<string, ServerPack> = {
  [grandRpEn3.server.id]: grandRpEn3,
  [generic.server.id]: generic,
}

const BUILT_IN_IDS = new Set(Object.keys(SERVER_PACKS))

/** The original server. Its data keeps the old (unprefixed) storage names. */
export const DEFAULT_SERVER_ID = grandRpEn3.server.id

export const SERVER_COOKIE = 'leogrp_server'

export function isKnownServerId(id: string | undefined | null): id is string {
  return !!id && Object.prototype.hasOwnProperty.call(SERVER_PACKS, id)
}

export function isBuiltInServerId(id: string | undefined | null): boolean {
  return !!id && BUILT_IN_IDS.has(id)
}

/** Make an installed pack available (it never replaces a built-in one). */
export function registerInstalledPack(pack: ServerPack) {
  if (BUILT_IN_IDS.has(pack.server.id)) return
  SERVER_PACKS[pack.server.id] = { ...pack, source: 'installed' }
}

export function unregisterInstalledPack(id: string) {
  if (!BUILT_IN_IDS.has(id)) delete SERVER_PACKS[id]
}

/** Value of the server cookie in the browser (undefined on the server). */
export function readServerCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined
  for (const part of document.cookie.split(';')) {
    const eq = part.indexOf('=')
    if (eq > 0 && part.slice(0, eq).trim() === SERVER_COOKIE) return decodeURIComponent(part.slice(eq + 1).trim())
  }
  return undefined
}

let activeServerId: string = (() => {
  const fromCookie = readServerCookie()
  return isKnownServerId(fromCookie) ? fromCookie : DEFAULT_SERVER_ID
})()

/** Called by <ServerProvider> so non-React code matches what the server rendered. */
export function setActiveServerId(id: string) {
  activeServerId = isKnownServerId(id) ? id : DEFAULT_SERVER_ID
}

export function getActiveServerId(): string {
  return activeServerId
}

/** Active server pack. Safe to call outside React (contexts, utils, event handlers). */
export function getActivePack(): ServerPack {
  return SERVER_PACKS[activeServerId]
}

/** Feature switches for the active server; anything not listed is on. */
export function isFeatureEnabled(feature: keyof ServerFeatures): boolean {
  return getActivePack().server.features?.[feature] !== false
}

/** Default department id for the active server (used when nothing is saved yet). */
export function getDefaultDepartment(): string {
  return getActivePack().server.defaultDepartment
}

export function getDepartment(id: string): Department | undefined {
  return getActivePack().departments.find((d) => d.id === id)
}

/** Arrest timer length in seconds for the active server. */
export function getArrestTimerSeconds(): number {
  return getActivePack().server.rules.arrestTimerMinutes * 60
}

/** Arrest timer start value as "MM:00", e.g. "25:00". */
export function getArrestTimerLabel(): string {
  return `${String(getActivePack().server.rules.arrestTimerMinutes).padStart(2, '0')}:00`
}

export interface TemplateVars {
  dept: string
}

/** Replace {placeholders} in pack text. Unknown placeholders are left as-is. */
export function fillTemplate(text: string, vars: TemplateVars): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key as keyof TemplateVars]) : match
  )
}

function fillCommand(cmd: PackCommand, vars: TemplateVars): PackCommand {
  return {
    ...cmd,
    text: fillTemplate(cmd.text, vars),
    label: cmd.label ? fillTemplate(cmd.label, vars) : undefined,
    palette: cmd.palette
      ? {
          ...cmd.palette,
          title: fillTemplate(cmd.palette.title, vars),
          text: cmd.palette.text ? fillTemplate(cmd.palette.text, vars) : undefined,
        }
      : undefined,
  }
}

/** Command categories with placeholders filled for the given department. */
export function resolveCommandCategories(pack: ServerPack, dept: string): PackCommandCategory[] {
  const vars = { dept }
  return pack.commands.categories.map((cat) => ({
    ...cat,
    name: fillTemplate(cat.name, vars),
    commands: cat.commands.map((c) => fillCommand(c, vars)),
  }))
}

/** Radio channels for the given department (its own channel is hidden). */
export function resolveRadioChannels(pack: ServerPack, dept: string): RadioChannel[] {
  const vars = { dept }
  return pack.commands.radio
    .filter((ch) => ch.hideForDepartment !== dept)
    .map((ch) => ({
      ...ch,
      name: fillTemplate(ch.name, vars),
      messages: ch.messages.map((m) => fillCommand(m, vars)),
    }))
}

/** Every command flagged for the Ctrl+K palette, filled for the given department. */
export function resolvePaletteCommands(pack: ServerPack, dept: string): PackCommand[] {
  const all = [
    ...resolveCommandCategories(pack, dept).flatMap((c) => c.commands),
    ...resolveRadioChannels(pack, dept).flatMap((c) => c.messages),
  ]
  return all.filter((c) => c.palette)
}
