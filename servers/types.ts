/**
 * Server Pack format.
 *
 * A server pack holds everything specific to one RP server: departments, bodycam/radio
 * commands, presets, legislation sources and rules. The app code itself stays generic.
 *
 * Text fields may contain placeholders that are filled in at runtime:
 *   {dept}  – short id of the officer's active department (e.g. "LSPD")
 */

/** Optional parts of the app a server can switch off. Missing = on. */
export interface ServerFeatures {
  /** Countdown timer while processing an arrest */
  arrestTimer?: boolean
  /** "Lawyer requested" pause/resume on the arrest timer */
  lawyerPause?: boolean
  /** AI legislation assistant (needs legislation sources) */
  legalAssistant?: boolean
}

export interface ServerInfo {
  id: string
  name: string
  shortName: string
  /** One line shown in the server picker */
  description?: string
  defaultDepartment: string
  rules: ServerRules
  features?: ServerFeatures
  /** UI language used when the officer hasn't picked one, e.g. "en", "ru", "pt-BR" */
  defaultLanguage?: string
}

export interface ServerRules {
  /** Length of the arrest processing timer in minutes */
  arrestTimerMinutes: number
  /** IANA time zone used for times in reports, e.g. "UTC" or "Europe/Moscow" */
  timeZone?: string
  /** Locale used for month names in reports, e.g. "en-GB" */
  locale?: string
  /** Currency symbol for fines, e.g. "$" */
  currencySymbol?: string
  /** How multiple jail sentences combine: "sum" (add up, default) or "max" (longest one only) */
  sentenceStacking?: 'sum' | 'max'
  /** Upper limit on a combined sentence in months (0 / missing = no limit) */
  maxSentenceMonths?: number
}

/** A report template: one string, or an array of lines. See utils/templates.ts for the syntax. */
export type ReportTemplate = string | string[]

export interface ReportsFile {
  defaults: {
    /** Statement read after charges at the end of an arrest */
    docStatement: ReportTemplate
    /** Rights read to a suspect on arrest */
    rightsScript: ReportTemplate
  }
  templates: {
    chargeSingle: ReportTemplate
    chargesList: ReportTemplate
    finesIssued: ReportTemplate
    arrestScript: ReportTemplate
    arrestRecord: ReportTemplate
    /** End-of-shift summary built from the shift's fines and arrests */
    shiftSummary: ReportTemplate
    /** Duty report copied when ending duty on the Reports page */
    shiftReport: ReportTemplate
    evidenceReport: ReportTemplate
  }
}

export interface Department {
  id: string
  /** Full display name, e.g. "Los Santos Police Department" */
  name: string
  icon: string
}

export interface PaletteMeta {
  title: string
  icon: string
  keywords?: string[]
  /** Text copied from the palette when it differs from the on-page text */
  text?: string
  /** Toast message suffix shown after copying */
  toast?: string
}

export interface PackCommand {
  id: string
  text: string
  label?: string
  /** If set, the command is also offered in the Ctrl+K palette */
  palette?: PaletteMeta
}

export interface PackCommandCategory {
  id: string
  name: string
  icon: string
  /** false = only used in the Ctrl+K palette, not listed on the commands page */
  showOnPage?: boolean
  /** Category is expanded by default on the commands page */
  expanded?: boolean
  commands: PackCommand[]
}

export interface RadioChannel {
  id: string
  name: string
  icon: string
  /** Hide this channel when the active department has this id (you don't radio yourself) */
  hideForDepartment?: string
  messages: PackCommand[]
}

export interface CommandsFile {
  categories: PackCommandCategory[]
  radio: RadioChannel[]
}

export interface WeaponPreset {
  id: string
  name: string
  vests: string[]
  weapons: { weapon: string; ammo: string }[]
}

export interface ChargeTemplate {
  id: string
  name: string
  description: string
  chargeCodes: string[]
}

export interface EventPreset {
  id: string
  name: string
  icon: string
}

export interface PresetsFile {
  loadouts: WeaponPreset[]
  chargeTemplates: ChargeTemplate[]
  events: EventPreset[]
}

export type LegislationDocType = 'traffic' | 'penal' | 'article7' | 'procedure'

/**
 * How a source file is read by `npm run import-laws`:
 *  - gsheet-html: Google Sheets "Web page (.html)" export
 *  - table: CSV or XLSX with a header row (code, description, fine, sentence, stars, bail, remarks, category)
 *  - json: an array of entries already in the laws.json entry format
 */
export type LegislationSourceFormat = 'gsheet-html' | 'table' | 'json'

export interface LegislationSource {
  docType: LegislationDocType
  /** Input file, relative to the pack folder (e.g. "sources/Penal Code.html") */
  file: string
  format: LegislationSourceFormat
  /** Name stamped on every entry from this source */
  name: string
  /** Short label for the law guide's filter tab (defaults to e.g. "Penal Code") */
  label?: string
  /** Version label, e.g. "2nd Rendition — 28.07.2025" */
  version: string
  /** Short date used as sourceDate on entries, if known */
  date?: string
}

export interface LegislationFile {
  /** Change this whenever law content changes so cached AI embeddings are rebuilt */
  corpusHash: string
  /** One-line description shown in the UI, e.g. "Traffic Code 2nd Rendition (28.07.2025) & Penal Codes" */
  summaryLabel: string
  /** Short label for the assistant, e.g. "Traffic Code (2nd Rendition) and Penal Codes" */
  shortLabel: string
  sources: LegislationSource[]
  excludedSources: string[]
}

export interface ServerPack {
  server: ServerInfo
  departments: Department[]
  commands: CommandsFile
  presets: PresetsFile
  legislation: LegislationFile
  reports: ReportsFile
}
