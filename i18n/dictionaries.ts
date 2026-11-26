import type { Lang } from './languages'
import { en, Messages } from './en'
import { hi } from './hi'
import { ru } from './ru'
import { ptBR } from './pt-BR'
import { es } from './es'
import { de } from './de'

export type { MessageKey } from './en'

// Each file is typed as Messages, so a missing or misspelled key fails `tsc`.
export const dictionaries: Record<Lang, Messages> = {
  en,
  hi,
  ru,
  'pt-BR': ptBR,
  es,
  de,
}
