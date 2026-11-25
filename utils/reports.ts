/**
 * Render the active server's report templates (servers/<id>/reports.json) with its rules
 * (time zone, locale, currency). Report wording/layout lives in the pack; this only supplies data.
 */
import { getActivePack } from '@/servers'
import type { ReportsFile } from '@/servers'
import { renderTemplate, formatMoney, TemplateData } from './templates'

export type ReportName = keyof ReportsFile['templates']

export function getReportRules() {
  const rules = getActivePack().server.rules
  return {
    timeZone: rules.timeZone || 'UTC',
    locale: rules.locale || 'en-GB',
    currencySymbol: rules.currencySymbol || '$',
  }
}

export function renderReport(name: ReportName, data: TemplateData): string {
  const { timeZone, locale } = getReportRules()
  return renderTemplate(getActivePack().reports.templates[name], data, { timeZone, locale })
}

/** Money in the active server's currency, e.g. "$12,500". */
export function money(amount: number): string {
  return formatMoney(amount, getReportRules().currencySymbol)
}

/** The pack's default text for an editable statement (DOC statement / rights script). */
export function getReportDefault(key: keyof ReportsFile['defaults']): string {
  const v = getActivePack().reports.defaults[key]
  return Array.isArray(v) ? v.join('\n') : v
}
