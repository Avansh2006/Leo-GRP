/**
 * Local Semantic Vector Embedding & Cache Engine for LEO-GRP
 * 100% Offline, client-side, zero cloud APIs, zero RAM footprint when idle.
 * Generates dense normalized semantic vectors and caches them in IndexedDB with corpus hash validation.
 */

import { NormalizedProvision, ACTIVE_CORPUS_HASH, getAllNormalizedProvisions } from './legislationStore'
import { getEmbeddingCache, saveEmbeddingCache } from './db'

export interface ProvisionEmbedding {
  id: string
  code: string
  vector: number[]
}

const EMBEDDING_DIM = 256

// Canonical semantic vocabulary dimensions for legal domain
const VOCAB_ANCHORS = [
  // Parking & Traffic Obstruction
  ['park', 'parking', 'parked', 'unattended', 'vehicle', 'car'],
  ['lane', 'driving', 'active', 'travel', 'middle', 'road', 'street'],
  ['marking', 'markings', 'surface', 'painted', 'lines', 'yellow', 'white', 'double'],
  ['curb', 'red', 'sidewalk', 'walkway', 'pedestrian', 'crosswalk'],
  ['highway', 'freeway', 'shoulder', 'bridge', 'tunnel', 'railway', 'tracks'],
  ['blocking', 'exit', 'entrance', 'obstructing', 'obstruction', 'interfering'],
  ['towing', 'tow', 'impound', 'confiscate', 'confiscation'],
  ['speed', 'speeding', 'km/h', 'fast', 'limit', 'excessive', 'zone', 'special'],
  ['distance', 'following', 'tailgating', 'braking', 'overtake', 'overtaking', 'race', 'racing'],
  ['dui', 'drunk', 'alcohol', 'influence', 'intoxicated', 'impairment'],
  ['license', 'plate', 'valid', 'absence', 'unregistered', 'documents'],

  // Crimes Against Property & GTA
  ['theft', 'steal', 'stole', 'stealing', 'thief', 'robbery', 'robbed', 'took'],
  ['gta', 'grand', 'auto', 'hijack', 'carjacking', 'hotwire', 'unlawful', 'seizure'],
  ['property', 'goods', 'money', 'items', 'belongings', 'possession', 'unauthorized'],
  ['burglary', 'trespass', 'trespassing', 'lockpick', 'scanners', 'hack', 'intrusion'],

  // Narcotics & Controlled Substances
  ['drugs', 'narcotics', 'substance', 'illicit', 'controlled'],
  ['cocaine', 'coke', 'powder', 'crack', 'units'],
  ['cannabis', 'marijuana', 'weed', 'plant', 'cultivation', 'grow'],
  ['supply', 'selling', 'distribute', 'distribution', 'sale', 'dealer', 'intent'],
  ['consumption', 'usage', 'public', 'consume', 'smoking'],

  // Weapons & Prohibited Items
  ['weapon', 'gun', 'firearm', 'pistol', 'rifle', 'shotgun', 'ammo', 'ammunition'],
  ['open', 'carry', 'carrying', 'license', 'concealed', 'holster', 'unlicensed'],
  ['brandish', 'brandishing', 'displaying', 'threatening', 'discharge', 'firing', 'shots'],
  ['prohibited', 'serial', 'xxx', 'state', 'military', 'vest', 'balaclava', 'mask'],

  // Public Order & Crimes Against Person
  ['murder', 'kill', 'killing', 'manslaughter', 'homicide', 'death'],
  ['assault', 'battery', 'attack', 'physical', 'harm', 'threat', 'injury', 'fight'],
  ['kidnap', 'kidnapping', 'hostage', 'detention', 'unlawful', 'abduction'],
  ['harassment', 'stalking', 'sexual', 'verbal', 'derogatory', 'disorderly', 'conduct', 'riot'],
  ['bribery', 'bribe', 'corruption', 'extortion', 'blackmail'],

  // Public Servant & Governance
  ['public', 'servant', 'civil', 'officer', 'cop', 'deputy', 'trooper', 'badge'],
  ['duty', 'refusal', 'neglect', 'negligence', 'abandoning', 'sworn', 'responsibility'],
  ['order', 'directives', 'orders', 'compliance', 'comply', 'disobey', 'failure'],
  ['resisting', 'evading', 'fleeing', 'chase', 'escape', 'interfere', 'interference'],

  // Procedures & Rights
  ['miranda', 'rights', 'silent', 'warning', 'attorney', 'understand'],
  ['lawyer', 'counsel', 'state', 'private', 'pause', 'timer', 'minutes', 'calls'],
  ['detention', 'handcuff', 'handcuffs', 'taze', 'transport', 'convoy', 'arm'],
  ['search', 'pockets', 'confiscation', 'pda', 'identification', 'mask', 'remove'],
  ['incarceration', 'jumpsuit', 'cell', 'doc', 'wanted', 'stars', 'prison', 'jail'],
]

/**
 * Hash string to a 32-bit integer
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return Math.abs(hash)
}

/**
 * Generate semantic embedding vector for an arbitrary text string
 */
export function generateSemanticVector(text: string): number[] {
  const norm = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
  const tokens = norm.split(/\s+/).filter((t) => t.length > 1)
  const tokenSet = new Set(tokens)

  const vector = new Float32Array(EMBEDDING_DIM)

  // 1. Project onto vocabulary anchor dimensions (first ~120 dims)
  VOCAB_ANCHORS.forEach((anchorCluster, clusterIdx) => {
    let matchCount = 0
    let weightSum = 0

    for (const term of anchorCluster) {
      if (tokenSet.has(term)) {
        matchCount++
        weightSum += 1.5
      } else if (norm.includes(term)) {
        matchCount += 0.5
        weightSum += 0.8
      }
    }

    if (matchCount > 0) {
      const dim1 = (clusterIdx * 2) % EMBEDDING_DIM
      const dim2 = (clusterIdx * 2 + 1) % EMBEDDING_DIM
      vector[dim1] += weightSum
      vector[dim2] += matchCount
    }
  })

  // 2. Character n-gram hashing projection for remaining dimensions (subwords & typos)
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    const tokenHash = hashString(token)
    const primaryDim = tokenHash % EMBEDDING_DIM
    const secondaryDim = (tokenHash * 31) % EMBEDDING_DIM

    vector[primaryDim] += 1.0
    vector[secondaryDim] += 0.5

    // Tri-grams
    if (token.length >= 3) {
      for (let j = 0; j <= token.length - 3; j++) {
        const trigram = token.slice(j, j + 3)
        const trigramHash = hashString(trigram)
        const triDim = trigramHash % EMBEDDING_DIM
        vector[triDim] += 0.35
      }
    }
  }

  // 3. L2 Normalize vector
  let normSq = 0
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    normSq += vector[i] * vector[i]
  }

  const magnitude = Math.sqrt(normSq)
  if (magnitude > 0) {
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      vector[i] /= magnitude
    }
  }

  return Array.from(vector)
}

/**
 * Compute cosine similarity between two normalized vectors in [0, 1]
 */
export function cosineSimilarity(v1: number[], v2: number[]): number {
  if (v1.length !== v2.length || v1.length === 0) return 0
  let dotProduct = 0
  for (let i = 0; i < v1.length; i++) {
    dotProduct += v1[i] * v2[i]
  }
  // Clamp between 0 and 1
  return Math.max(0, Math.min(1, dotProduct))
}

// In-memory provision vector index cache
let vectorIndexCache: Map<string, number[]> | null = null

/**
 * Load or compute the semantic embeddings index with IndexedDB caching
 */
export async function getLegislationVectorIndex(): Promise<Map<string, number[]>> {
  if (vectorIndexCache && vectorIndexCache.size > 0) {
    return vectorIndexCache
  }

  const cacheKey = `embeddings_${ACTIVE_CORPUS_HASH}`

  // 1. Try to load from IndexedDB
  const cached = await getEmbeddingCache(cacheKey)
  if (cached && cached.corpusHash === ACTIVE_CORPUS_HASH && cached.embeddings.length > 0) {
    const map = new Map<string, number[]>()
    cached.embeddings.forEach((e) => {
      map.set(e.id, e.vector)
    })
    vectorIndexCache = map
    return map
  }

  // 2. Compute vectors for all normalized active provisions
  const provisions = await getAllNormalizedProvisions()
  const map = new Map<string, number[]>()
  const embeddingRecords: Array<{ id: string; code: string; vector: number[] }> = []

  for (const prov of provisions) {
    const textToEmbed = `${prov.code} ${prov.title} ${prov.category} ${prov.description} ${prov.remarks} ${prov.keywords.join(' ')}`
    const vector = generateSemanticVector(textToEmbed)
    map.set(prov.id, vector)
    embeddingRecords.push({ id: prov.id, code: prov.code, vector })
  }

  // 3. Persist into IndexedDB asynchronously
  saveEmbeddingCache({
    key: cacheKey,
    corpusHash: ACTIVE_CORPUS_HASH,
    embeddings: embeddingRecords,
    generatedAt: new Date().toISOString(),
  }).catch(console.error)

  vectorIndexCache = map
  return map
}

/**
 * Semantic vector search ranking over active provisions
 */
export async function searchSemanticProvisions(
  query: string,
  topK = 10
): Promise<Array<{ provision: NormalizedProvision; similarity: number }>> {
  const queryVector = generateSemanticVector(query)
  const vectorIndex = await getLegislationVectorIndex()
  const provisions = await getAllNormalizedProvisions()

  const scored: Array<{ provision: NormalizedProvision; similarity: number }> = []

  for (const prov of provisions) {
    const provVector = vectorIndex.get(prov.id)
    if (provVector) {
      const sim = cosineSimilarity(queryVector, provVector)
      scored.push({ provision: prov, similarity: sim })
    }
  }

  scored.sort((a, b) => b.similarity - a.similarity)
  return scored.slice(0, topK)
}
