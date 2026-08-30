/**
 * Local Tool Calling System for LEO-GRP AI Legal Assistant
 * 100% Client-side local execution against the active legislation database.
 * No external APIs required.
 */

import {
  NormalizedProvision,
  getAllNormalizedProvisions,
  getCanonicalProvision,
  getActiveLegislationMetadata,
} from './legislationStore'
import { searchSemanticProvisions } from './localEmbedding'

export interface ToolDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, { type: string; description: string; enum?: string[] }>
    required: string[]
  }
}

export interface ToolCallRequest {
  id: string
  name: string
  arguments: Record<string, any>
}

export interface ToolCallResult {
  toolCallId: string
  name: string
  result: any
  error?: string
}

export const LOCAL_AI_TOOLS: ToolDefinition[] = [
  {
    name: 'searchLegislation',
    description: 'Search active legislation by keyword, scenario, or legal description.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query or scenario terms.' },
        category: { type: 'string', description: 'Optional category filter (e.g. "Traffic Code", "Penal Code", "Article 7", "ARREST & DETENTION PROCEDURES").' },
      },
      required: ['query'],
    },
  },
  {
    name: 'getProvision',
    description: 'Get full verified statutory details for an exact section code (e.g. "T.C. 6.2.f", "P.C. 2.10.5", "PROC 1.4").',
    parameters: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Exact section code to look up.' },
      },
      required: ['code'],
    },
  },
  {
    name: 'getRelatedProvisions',
    description: 'Find provisions related to a given section code or chapter.',
    parameters: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'The section code to find related provisions for.' },
      },
      required: ['code'],
    },
  },
  {
    name: 'getProvisionPenalty',
    description: 'Retrieve verified penalties (fine, sentence, wanted stars, bail status, towing) for a section code.',
    parameters: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Section code to look up penalty details for.' },
      },
      required: ['code'],
    },
  },
  {
    name: 'getCurrentLegislationSource',
    description: 'Retrieve active version metadata, dates, and active renditions of legislation.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
]

/**
 * Execute a local tool call against the active legislation database
 */
export async function executeLocalTool(toolCall: ToolCallRequest): Promise<ToolCallResult> {
  const { id, name, arguments: args } = toolCall

  try {
    switch (name) {
      case 'getProvision': {
        const prov = await getCanonicalProvision(args.code || '')
        if (!prov) {
          return {
            toolCallId: id,
            name,
            result: { found: false, error: `Provision code "${args.code}" does not exist in active legislation.` },
          }
        }
        return {
          toolCallId: id,
          name,
          result: {
            found: true,
            code: prov.code,
            title: prov.title,
            fine: prov.fine,
            fineAmount: prov.fineAmount,
            sentence: prov.sentence,
            sentenceMonths: prov.sentenceMonths,
            stars: prov.stars,
            bail: prov.bail,
            remarks: prov.remarks,
            towing: prov.towing,
            source: prov.sourceDocument,
            sourceDate: prov.sourceDate,
          },
        }
      }

      case 'getProvisionPenalty': {
        const prov = await getCanonicalProvision(args.code || '')
        if (!prov) {
          return {
            toolCallId: id,
            name,
            result: { found: false, error: `Provision code "${args.code}" not found.` },
          }
        }
        return {
          toolCallId: id,
          name,
          result: {
            code: prov.code,
            fine: prov.fine,
            fineAmount: prov.fineAmount,
            sentence: prov.sentence,
            sentenceMonths: prov.sentenceMonths,
            stars: prov.stars,
            bail: prov.bail,
            towingAuthorized: prov.towing,
            confiscationRequired: prov.confiscation,
            licenseRevocation: prov.revocation,
          },
        }
      }

      case 'getRelatedProvisions': {
        const provisions = await getAllNormalizedProvisions()
        const target = (args.code || '').toLowerCase().replace(/[^a-z0-9.]/g, '')
        const prefix = target.split('.')[0] || target

        const related = provisions
          .filter((p) => {
            const pCode = p.code.toLowerCase().replace(/[^a-z0-9.]/g, '')
            return pCode.startsWith(prefix) && pCode !== target
          })
          .slice(0, 5)
          .map((p) => ({
            code: p.code,
            title: p.title,
            fine: p.fine,
            sentence: p.sentence,
          }))

        return {
          toolCallId: id,
          name,
          result: { related },
        }
      }

      case 'searchLegislation': {
        const query = args.query || ''
        const semanticResults = await searchSemanticProvisions(query, 6)
        let matches = semanticResults.map((s) => s.provision)

        if (args.category) {
          const cat = args.category.toLowerCase()
          matches = matches.filter((m) => m.category.toLowerCase().includes(cat))
        }

        return {
          toolCallId: id,
          name,
          result: {
            count: matches.length,
            results: matches.map((m) => ({
              code: m.code,
              title: m.title,
              fine: m.fine,
              sentence: m.sentence,
              stars: m.stars,
              source: m.sourceDocument,
            })),
          },
        }
      }

      case 'getCurrentLegislationSource': {
        return {
          toolCallId: id,
          name,
          result: getActiveLegislationMetadata(),
        }
      }

      default:
        return {
          toolCallId: id,
          name,
          result: null,
          error: `Unknown tool "${name}".`,
        }
    }
  } catch (err: any) {
    return {
      toolCallId: id,
      name,
      result: null,
      error: err?.message || 'Tool execution error',
    }
  }
}
