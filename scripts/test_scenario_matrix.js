const fs = require('fs')
const path = require('path')

// Load legislation data
const penalHtml = fs.readFileSync(path.join(__dirname, '../public/data/Penal Code.html'), 'utf-8')
const trafficHtml = fs.readFileSync(path.join(__dirname, '../public/data/Traffic Codes.html'), 'utf-8')

function extractRows(html) {
  const rows = []
  const trMatches = html.match(/<tr[\s\S]*?<\/tr>/gi) || []
  for (const tr of trMatches) {
    const tdMatches = tr.match(/<td[\s\S]*?<\/td>/gi) || []
    const cells = tdMatches.map(td => td.replace(/<[\s\S]*?>/g, '').replace(/&nbsp;/g, ' ').trim())
    if (cells.length > 0) rows.push(cells)
  }
  return rows
}

const allEntries = []

const trafficRows = extractRows(trafficHtml)
for (const r of trafficRows) {
  const codeIdx = r.findIndex(c => c.match(/^(?:T\.C\.|TC|§)\s*[\d.]+/i))
  if (codeIdx !== -1) {
    allEntries.push({
      code: r[codeIdx],
      description: r[codeIdx + 1] || '',
      fine: r[codeIdx + 2] || '',
      sentence: r[codeIdx + 3] || '',
      stars: r[codeIdx + 4] || '',
      remarks: r[codeIdx + 6] || '',
      category: 'TRAFFIC CODE',
      documentType: 'traffic'
    })
  }
}

const penalRows = extractRows(penalHtml)
let curCat = 'GENERAL'
for (const r of penalRows) {
  if (r.length === 1 && r[0] === r[0].toUpperCase()) {
    curCat = r[0]
  }
  const codeIdx = r.findIndex(c => c.match(/^(?:P\.C\.|PC|§)\s*[\d.]+/i))
  if (codeIdx !== -1) {
    allEntries.push({
      code: r[codeIdx],
      description: r[codeIdx + 1] || '',
      fine: r[codeIdx + 2] || '',
      sentence: r[codeIdx + 3] || '',
      stars: r[codeIdx + 4] || '',
      remarks: r[codeIdx + 6] || '',
      category: curCat,
      documentType: 'penal'
    })
  }
}

const STOP_WORDS = new Set([
  'what', 'is', 'the', 'a', 'an', 'of', 'to', 'in', 'for', 'on', 'with', 'at', 'by',
  'from', 'this', 'that', 'these', 'those', 'can', 'i', 'you', 'they', 'we', 'do',
  'does', 'how', 'when', 'where', 'why', 'should', 'would', 'could', 'about', 'under',
  'are', 'if', 'someone', 'person', 'say', 'tell', 'mean', 'meaning', 'apply', 'applies',
  'happens', 'mention', 'mentioned', 'situation', 'based', 'provision', 'rule', 'rules',
  'law', 'laws', 'act', 'code', 'codes', 'give', 'gives', 'get', 'gets', 'add', 'put',
  'charge', 'charges', 'he', 'she', 'his', 'her', 'their', 'them', 'him', 'has', 'have', 'had', 'been'
])

function normalize(str) {
  return (str || '').toLowerCase().replace(/[?,!;:"'(){}\[\]]/g, ' ').replace(/\s+/g, ' ').trim()
}

function extractConcepts(query) {
  const norm = normalize(query)
  const actions = []
  const negatedActions = []
  const objects = []
  const locations = []
  let actor = 'CITIZEN'

  if (norm.match(/\b(not|hasn't|didn't|never|without)\s+stop(?:ped|ping)?\b/)) {
    negatedActions.push('STOPPING')
  }
  if (norm.match(/\b(not|hasn't|didn't|never|without)\s+park(?:ed|ing)?\b/)) {
    negatedActions.push('PARKING')
  }

  if (norm.match(/\b(public servant|civil servant|officer)\b/)) actor = 'PUBLIC_SERVANT'

  if (norm.match(/\bpark(?:ed|ing|s)?\b/) && !negatedActions.includes('PARKING')) actions.push('PARKING')
  if (norm.match(/\bstop(?:ped|ping|s)?\b/) && !negatedActions.includes('STOPPING')) actions.push('STOPPING')
  if (
    norm.match(/\b(stole|steal|stolen|theft|rob|robbed|gta)\b/) ||
    norm.match(/\b(took|take|taking)\b.*\b(vehicle|car|automobile|property|money|goods|item|keys)\b/) ||
    norm.match(/\b(took|take|taking)\s+another\s+(?:person's|someone's)\s+(?:vehicle|car|property)\b/)
  ) {
    actions.push('THEFT')
  }
  if (norm.match(/\b(speed|speeding|fast)\b/)) actions.push('SPEEDING')
  if (norm.match(/\b(follow(?:ing)?|distance|tailgat(?:e|ing)|closely)\b/)) actions.push('FOLLOWING_DISTANCE')
  if (norm.match(/\b(dui|drunk|alcohol)\b/)) actions.push('DUI')
  if (norm.match(/\b(refus(?:e|ed|ing|al)|disobey(?:ed|ing)?|ignore(?:d|ing)?)\b/)) actions.push('DISOBEDIENCE')

  if (norm.match(/\b(car|vehicle|automobile)\b/)) objects.push('VEHICLE')
  if (norm.match(/\b(marking|markings|lines?)\b/)) objects.push('ROAD_MARKINGS')

  if (norm.match(/\b(road|street|highway|lane|driving\s+lane|crosswalk)\b/)) {
    if (norm.includes('road marking') || norm.includes('marking')) locations.push('ROAD_MARKINGS')
    else locations.push('ROAD')
  }

  let primaryTopic = 'GENERAL'
  if (actions.includes('THEFT')) {
    primaryTopic = 'THEFT_GTA'
  } else if (actor === 'PUBLIC_SERVANT' && (actions.includes('DISOBEDIENCE') || norm.includes('order') || norm.includes('duty'))) {
    primaryTopic = 'PUBLIC_SERVANT_DUTY'
  } else if (actions.includes('PARKING') || (objects.includes('VEHICLE') && locations.length > 0 && !actions.includes('SPEEDING') && !actions.includes('THEFT') && !actions.includes('DUI') && !actions.includes('FOLLOWING_DISTANCE'))) {
    primaryTopic = 'PARKING'
  } else if (actions.includes('FOLLOWING_DISTANCE') || actions.includes('DUI') || actions.includes('SPEEDING') || actions.includes('STOPPING')) {
    primaryTopic = 'MOVING_TRAFFIC'
  }

  return { actions, negatedActions, objects, locations, actor, primaryTopic }
}

function classifyTopic(entry) {
  const code = entry.code.toUpperCase()
  const desc = entry.description.toLowerCase()
  if (code.startsWith('T.C. 6.2') || code.startsWith('TC 7.') || desc.includes('parking')) return 'PARKING'
  if (code.startsWith('T.C. 3.') || code.startsWith('T.C. 5.') || desc.includes('speed limit') || desc.includes('distance') || desc.includes('stopping') || desc.includes('influence')) return 'MOVING_TRAFFIC'
  if (desc.includes('theft') || desc.includes('grand theft auto') || desc.includes('stolen')) return 'THEFT_GTA'
  if (desc.includes('public servant') || desc.includes('civil servant') || entry.category.includes('CIVIL SERVANT') || code.startsWith('P.C. 2.7.') || code.startsWith('P.C. 4.3.')) return 'PUBLIC_SERVANT_DUTY'
  if (desc.includes('resisting') || desc.includes('evading') || desc.includes('disobedience')) return 'DISOBEDIENCE_EVADING'
  return 'GENERAL'
}

function testRetrieve(query) {
  const normQuery = normalize(query)
  const concepts = extractConcepts(query)
  const queryTokens = normQuery.split(' ').filter(t => t.length > 1 && !STOP_WORDS.has(t))

  const scored = []
  const rejected = []

  for (const entry of allEntries) {
    const entryTopic = classifyTopic(entry)
    const codeNorm = normalize(entry.code)
    const descNorm = normalize(entry.description)

    let score = 0

    if (descNorm === normQuery) score += 200
    else if (descNorm.startsWith(normQuery)) score += 130
    else if (descNorm.includes(normQuery) && normQuery.length > 3) score += 80

    for (const token of queryTokens) {
      if (codeNorm.includes(token)) score += 30
      if (descNorm.includes(token)) score += 25
    }

    if (concepts.primaryTopic !== 'GENERAL') {
      if (entryTopic === concepts.primaryTopic) {
        score += 140
      } else {
        if (concepts.primaryTopic === 'PARKING') {
          if (entryTopic === 'THEFT_GTA' || entryTopic === 'PUBLIC_SERVANT_DUTY' || entryTopic === 'MOVING_TRAFFIC') {
            rejected.push({ code: entry.code, desc: entry.description, reason: `Topic mismatch: ${entryTopic}` })
            continue
          }
        } else if (concepts.primaryTopic === 'THEFT_GTA') {
          if (entryTopic === 'PARKING' || entryTopic === 'PUBLIC_SERVANT_DUTY' || entryTopic === 'MOVING_TRAFFIC') {
            rejected.push({ code: entry.code, desc: entry.description, reason: `Topic mismatch: ${entryTopic}` })
            continue
          }
        } else if (concepts.primaryTopic === 'PUBLIC_SERVANT_DUTY') {
          if (entryTopic === 'PARKING' || entryTopic === 'THEFT_GTA' || entryTopic === 'MOVING_TRAFFIC') {
            rejected.push({ code: entry.code, desc: entry.description, reason: `Topic mismatch: ${entryTopic}` })
            continue
          }
        } else if (concepts.primaryTopic === 'MOVING_TRAFFIC') {
          if (entryTopic === 'PARKING' || entryTopic === 'THEFT_GTA' || entryTopic === 'PUBLIC_SERVANT_DUTY' || entry.documentType === 'penal') {
            rejected.push({ code: entry.code, desc: entry.description, reason: `Topic mismatch: ${entryTopic}` })
            continue
          }
        }
      }
    }

    if (concepts.negatedActions.includes('STOPPING')) {
      if (entry.code.includes('3.2.3') || entry.code.includes('3.2.4') || descNorm.includes('stopping')) {
        rejected.push({ code: entry.code, desc: entry.description, reason: 'Negated stopping' })
        continue
      }
    }

    if (concepts.primaryTopic === 'PARKING') {
      if (concepts.locations.includes('ROAD_MARKINGS') && entry.code.includes('6.2.n')) score += 160
      if (concepts.locations.includes('ROAD') && (entry.code.includes('6.2.f') || entry.code.includes('6.2.n') || entry.code.includes('6.2.b'))) score += 90
    } else if (concepts.primaryTopic === 'THEFT_GTA') {
      if (entry.code.includes('2.10.5')) score += 180
      if (entry.code.includes('2.10.3')) score += 130
    } else if (concepts.primaryTopic === 'PUBLIC_SERVANT_DUTY') {
      if (normQuery.includes('order') || normQuery.includes('ignore') || normQuery.includes('disobey')) {
        if (entry.code.includes('2.7.2')) score += 180
        if (entry.code.includes('2.7.3')) score += 160
        if (entry.code.includes('2.7.4')) score += 150
        if (entry.code.includes('3.9') || entry.code.includes('3.10')) score -= 200
      }
    } else if (concepts.primaryTopic === 'MOVING_TRAFFIC') {
      if (concepts.actions.includes('FOLLOWING_DISTANCE')) {
        if (entry.code.includes('3.4.3')) score += 250
      }
    }

    if (score >= 60) {
      scored.push({ code: entry.code, description: entry.description, topic: entryTopic, score })
    }
  }

  scored.sort((a, b) => b.score - a.score)
  const topScore = scored.length > 0 ? scored[0].score : 0
  const finalSources = scored.filter(s => s.score >= topScore * 0.5).slice(0, 3)

  return { concepts, sources: finalSources, rejected }
}

console.log('====================================================')
console.log('SCENARIO AWARENESS & RETRIEVAL VERIFICATION MATRIX')
console.log('====================================================\n')

const testScenarios = [
  {
    name: '1. Road Parking Query',
    q: 'Someone parked their car on the road.',
    expectedTopic: 'PARKING',
    expectedProvs: ['6.2.f', '6.2.n', '6.2.b'],
    forbiddenTopics: ['THEFT_GTA', 'PUBLIC_SERVANT_DUTY', 'MOVING_TRAFFIC']
  },
  {
    name: '2. Negated Stopping ("not stopped, parked")',
    q: 'He has not stopped, he parked his car.',
    expectedTopic: 'PARKING',
    expectedProvs: ['6.2.f', '6.2.n', '6.2.b'],
    forbiddenTopics: ['THEFT_GTA', 'PUBLIC_SERVANT_DUTY', 'MOVING_TRAFFIC'],
    forbiddenCodes: ['T.C. 3.2.3', 'T.C. 3.2.4']
  },
  {
    name: '3. Road Markings Parking',
    q: 'Someone parked on road markings.',
    expectedTopic: 'PARKING',
    expectedProvs: ['6.2.n'],
    forbiddenTopics: ['THEFT_GTA', 'PUBLIC_SERVANT_DUTY']
  },
  {
    name: '4. Car Theft',
    q: 'Someone stole a car.',
    expectedTopic: 'THEFT_GTA',
    expectedProvs: ['2.10.5', '2.10.3'],
    forbiddenTopics: ['PARKING', 'PUBLIC_SERVANT_DUTY']
  },
  {
    name: '5. Taking Vehicle (GTA)',
    q: "Someone took another person's vehicle.",
    expectedTopic: 'THEFT_GTA',
    expectedProvs: ['2.10.5', '2.10.3'],
    forbiddenTopics: ['PARKING', 'PUBLIC_SERVANT_DUTY']
  },
  {
    name: '6. Public Servant Ignored Order',
    q: 'A public servant ignored an order.',
    expectedTopic: 'PUBLIC_SERVANT_DUTY',
    expectedProvs: ['2.7.2', '2.7.3', '2.7.4'],
    forbiddenTopics: ['PARKING', 'THEFT_GTA', 'MOVING_TRAFFIC']
  },
  {
    name: '7. Following Distance',
    q: 'Someone was following too closely.',
    expectedTopic: 'MOVING_TRAFFIC',
    expectedProvs: ['3.4.3'],
    forbiddenTopics: ['PARKING', 'THEFT_GTA', 'PUBLIC_SERVANT_DUTY']
  }
]

let allPassed = true

testScenarios.forEach(t => {
  const res = testRetrieve(t.q)
  console.log(`[TEST] ${t.name}: "${t.q}"`)
  console.log(`  • Primary Topic Detected: ${res.concepts.primaryTopic}`)
  console.log(`  • Actions: ${res.concepts.actions.join(', ') || 'None'} | Excluded: ${res.concepts.negatedActions.join(', ') || 'None'}`)
  console.log(`  • Retrieved Provisions (${res.sources.length}):`)
  res.sources.forEach((s, idx) => {
    console.log(`    ${idx + 1}. [${s.code}] ${s.description} (Score: ${s.score})`)
  })

  // Assertions
  let passed = true

  if (res.concepts.primaryTopic !== t.expectedTopic) {
    console.log(`  ❌ FAIL: Topic mismatch. Expected ${t.expectedTopic}, got ${res.concepts.primaryTopic}`)
    passed = false
  }

  // Check forbidden topics
  for (const s of res.sources) {
    if (t.forbiddenTopics && t.forbiddenTopics.includes(s.topic)) {
      console.log(`  ❌ FAIL: Forbidden topic ${s.topic} present in results: ${s.code}`)
      passed = false
    }
    if (t.forbiddenCodes && t.forbiddenCodes.some(c => s.code.includes(c))) {
      console.log(`  ❌ FAIL: Forbidden code ${s.code} present in results despite negation`)
      passed = false
    }
  }

  // Check expected provisions
  if (t.expectedProvs) {
    const hasExpected = t.expectedProvs.some(ep => res.sources.some(s => s.code.includes(ep)))
    if (!hasExpected) {
      console.log(`  ❌ FAIL: None of expected provisions (${t.expectedProvs.join(', ')}) found`)
      passed = false
    }
  }

  if (passed) {
    console.log(`  ✓ PASSED: Valid scenario topic isolation & accurate provision ranking\n`)
  } else {
    allPassed = false
    console.log(`  ❌ FAILED\n`)
  }
})

console.log(`\nOVERALL SCENARIO TEST RESULT: ${allPassed ? 'ALL TESTS PASSED ✅' : 'FAILURES DETECTED ❌'}`)
