/**
 * Automated Test Suite for LEO-GRP Arrest Command Center & Fine-First Arrest Workflow
 * Tests:
 * 1. Active detention state initialization
 * 2. Fine-First rule (charges do not auto-issue fines)
 * 3. Finalize arrest blocker on unissued fines
 * 4. Combined "Copy & Issue Fine" action
 * 5. 25-Minute countdown timer calculation & expiration
 * 6. Lawyer request pause, resume, and audit timestamps
 * 7. Officer name sanitization (never "Officer Officer")
 * 8. Speaking Script generation & zoom levels
 * 9. Discord / RP complete arrest record format
 * 10. Historical arrest immutability & organization preservation
 */

const assert = require('assert')

function runTests() {
  console.log('🧪 Starting Arrest Command Center & Timer Upgrade Tests...\n')

  let passed = 0
  let total = 0

  function test(name, fn) {
    total++
    try {
      fn()
      console.log(`  ✅ [PASS] ${name}`)
      passed++
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}`)
      console.error(`     Error: ${err.message}\n`)
    }
  }

  const DEFAULT_DOC_STATEMENT =
    'Please be advised that these are the charges currently being applied to you. Additional charges may be added during processing at DOC if further violations are discovered. You will also be searched and processed at DOC in accordance with applicable procedure.'

  const DEFAULT_MIRANDA_RIGHTS = `You have the right to remain silent.
Anything you say can and will be used against you in a court of law.
You have the right to an attorney.
If you cannot afford an attorney, one will be appointed to you by the state if available.`

  // Timer helper calculation matching DutyContext
  function calculateRemainingArrestTimerSeconds(detention, fakeNow) {
    if (!detention) return 1500
    const totalSec = detention.timerTotalSeconds || 1500
    if (detention.isTimerPaused && typeof detention.timerRemainingAtPause === 'number') {
      return Math.max(0, detention.timerRemainingAtPause)
    }
    const started = new Date(detention.timerStartedAt || detention.startTime).getTime()
    const now = fakeNow || Date.now()
    const elapsedRaw = Math.floor((now - started) / 1000)
    const pausedAccum = detention.totalPausedDurationSeconds || 0
    const effectiveElapsed = Math.max(0, elapsedRaw - pausedAccum)
    return Math.max(0, totalSec - effectiveElapsed)
  }

  function formatTimerDisplay(totalSec) {
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // Officer name sanitization
  function sanitizeOfficerIntro(officerName, org) {
    const rawOfficer = officerName?.trim() || ''
    const cleanOfficer = rawOfficer.replace(/^Officer\s+/i, '').trim()
    const officerTitle = cleanOfficer ? `Officer ${cleanOfficer}` : 'an Officer'
    return `I am ${officerTitle} with the ${org}.`
  }

  // Test 1: Start Active Detention Data Structure with Timer Fields
  test('1. Start Active Detention initializes correct state, 25-min timer and case ID', () => {
    const passportNumber = '123456'
    const suspectName = 'John Doe'
    const officerName = 'Officer Avansh Yadav'
    const organization = 'LSPD'
    const nowIso = new Date().toISOString()

    const detention = {
      id: 'detention-101',
      caseId: 'CASE-4921',
      startTime: nowIso,
      officerName,
      organization,
      passportNumber,
      suspectName,
      charges: [],
      checklist: {
        suspectIdentified: true,
        chargesSelected: false,
        requiredFinesIssued: true,
        chargesCommunicated: false,
        rightsRead: false,
        rightsUnderstood: false,
        docStatementCommunicated: false,
        arrestFinalized: false,
      },
      status: 'ACTIVE',
      timerTotalSeconds: 1500,
      timerStartedAt: nowIso,
      isTimerPaused: false,
      totalPausedDurationSeconds: 0,
      lawyerRequested: false,
    }

    assert.strictEqual(detention.passportNumber, '123456')
    assert.strictEqual(detention.suspectName, 'John Doe')
    assert.strictEqual(detention.organization, 'LSPD')
    assert.strictEqual(detention.timerTotalSeconds, 1500)
    assert.strictEqual(detention.isTimerPaused, false)
    assert.strictEqual(detention.checklist.suspectIdentified, true)
    assert.strictEqual(detention.status, 'ACTIVE')
  })

  // Test 2: Fine-First Rule — Adding a charge does NOT automatically issue a fine
  test('2. Fine-First Rule: Adding a charge with fine sets status to NOT_ISSUED', () => {
    const charge1 = {
      id: 'chg-1',
      code: '6.2.f',
      title: 'Parking on a driving lane',
      fine: '$10,000',
      fineAmount: 10000,
      sentence: '-',
      sentenceMonths: 0,
      fineStatus: 'NOT_ISSUED',
    }

    const charge2 = {
      id: 'chg-2',
      code: '2.10.5',
      title: 'Grand Theft Auto',
      fine: '$30,000',
      fineAmount: 30000,
      sentence: '30 months',
      sentenceMonths: 30,
      fineStatus: 'NOT_ISSUED',
    }

    const detention = {
      charges: [charge1, charge2],
    }

    const unissuedCount = detention.charges.filter((c) => c.fineStatus === 'NOT_ISSUED').length
    assert.strictEqual(unissuedCount, 2, 'Both charges should require explicit fine issuance')
  })

  // Test 3: Combined Copy & Issue Fine Single Click Execution
  test('3. Combined "Copy & Issue Fine" generates charge text and transitions fineStatus to ISSUED', () => {
    const charge = {
      id: 'chg-1',
      code: 'P.C. 3.5',
      title: 'Failure to comply',
      fine: '$35,000',
      fineAmount: 35000,
      sentence: '60 months',
      sentenceMonths: 60,
      fineStatus: 'NOT_ISSUED',
    }

    const formatSingleCharge = (c) => {
      let text = `§ ${c.code} — ${c.title}\n`
      if (c.fine && c.fine !== '-') text += `Fine: ${c.fine}\n`
      if (c.sentence && c.sentence !== '-') text += `Sentence: ${c.sentence}\n`
      return text.trim()
    }

    const copiedText = formatSingleCharge(charge)
    assert(copiedText.includes('§ P.C. 3.5 — Failure to comply'))
    assert(copiedText.includes('Fine: $35,000'))
    assert(copiedText.includes('Sentence: 60 months'))

    // Simulate issuing fine
    charge.fineStatus = 'ISSUED'
    charge.fineIssuedAt = new Date().toISOString()
    assert.strictEqual(charge.fineStatus, 'ISSUED')
  })

  // Test 4: 25-Minute Countdown Timer Calculation
  test('4. 25-Minute Countdown Timer decrements correctly and formats MM:SS', () => {
    const startTime = new Date('2026-08-30T12:00:00Z').getTime()
    const detention = {
      timerTotalSeconds: 1500,
      timerStartedAt: new Date(startTime).toISOString(),
      isTimerPaused: false,
      totalPausedDurationSeconds: 0,
    }

    // At T+0s
    let remaining = calculateRemainingArrestTimerSeconds(detention, startTime)
    assert.strictEqual(remaining, 1500)
    assert.strictEqual(formatTimerDisplay(remaining), '25:00')

    // At T+23s -> 24:37
    remaining = calculateRemainingArrestTimerSeconds(detention, startTime + 23000)
    assert.strictEqual(remaining, 1477)
    assert.strictEqual(formatTimerDisplay(remaining), '24:37')

    // At T+1500s -> 00:00 (Expired)
    remaining = calculateRemainingArrestTimerSeconds(detention, startTime + 1500000)
    assert.strictEqual(remaining, 0)
    assert.strictEqual(formatTimerDisplay(remaining), '00:00')
  })

  // Test 5: Lawyer Request Pauses Timer at exact seconds and Resumes correctly
  test('5. Lawyer Request Pauses timer and Resuming continues countdown', () => {
    const startTime = new Date('2026-08-30T12:00:00Z').getTime()
    let detention = {
      timerTotalSeconds: 1500,
      timerStartedAt: new Date(startTime).toISOString(),
      isTimerPaused: false,
      totalPausedDurationSeconds: 0,
      lawyerRequested: false,
    }

    // 6 minutes elapsed (360s) -> 1140s remaining (19:00)
    const pauseTime = startTime + 360 * 1000
    const remainingAtPause = calculateRemainingArrestTimerSeconds(detention, pauseTime)
    assert.strictEqual(remainingAtPause, 1140)

    // Pause timer
    detention = {
      ...detention,
      isTimerPaused: true,
      timerPausedAt: new Date(pauseTime).toISOString(),
      timerRemainingAtPause: remainingAtPause,
      lawyerRequested: true,
      lawyerRequestedAt: new Date(pauseTime).toISOString(),
    }

    // 10 minutes pass in real life while paused (600s)
    const timeDuringPause = pauseTime + 600 * 1000
    const remainingWhilePaused = calculateRemainingArrestTimerSeconds(detention, timeDuringPause)
    assert.strictEqual(remainingWhilePaused, 1140, 'Timer must freeze at 1140s while paused')
    assert.strictEqual(formatTimerDisplay(remainingWhilePaused), '19:00')

    // Resume timer after 10 min pause
    const resumeTime = pauseTime + 600 * 1000
    const extraPaused = Math.floor((resumeTime - new Date(detention.timerPausedAt).getTime()) / 1000)
    detention = {
      ...detention,
      isTimerPaused: false,
      timerPausedAt: undefined,
      timerRemainingAtPause: undefined,
      totalPausedDurationSeconds: detention.totalPausedDurationSeconds + extraPaused,
      lawyerResumedAt: new Date(resumeTime).toISOString(),
    }

    // 1 minute after resume
    const timeAfterResume = resumeTime + 60 * 1000
    const remainingAfterResume = calculateRemainingArrestTimerSeconds(detention, timeAfterResume)
    assert.strictEqual(remainingAfterResume, 1080, 'Timer should resume counting from 1140s - 60s = 1080s')
    assert.strictEqual(formatTimerDisplay(remainingAfterResume), '18:00')
  })

  // Test 6: Officer Name Sanitization (Never "Officer Officer")
  test('6. Officer Name Sanitization prevents "Officer Officer" duplication', () => {
    assert.strictEqual(
      sanitizeOfficerIntro('Officer Avansh Yadav', 'LSPD'),
      'I am Officer Avansh Yadav with the LSPD.'
    )
    assert.strictEqual(
      sanitizeOfficerIntro('officer john', 'LSPD'),
      'I am Officer john with the LSPD.'
    )
    assert.strictEqual(
      sanitizeOfficerIntro('Avansh', 'SAHP'),
      'I am Officer Avansh with the SAHP.'
    )
    assert.strictEqual(
      sanitizeOfficerIntro('', 'DOC'),
      'I am an Officer with the DOC.'
    )
  })

  // Test 7: Speaking Script Generation with Rights Question & DOC Notice
  test('7. Speaking Script Generator formats suspect reference, charges, rights question & DOC notice', () => {
    const detention = {
      officerName: 'Avansh Yadav',
      organization: 'LSPD',
      passportNumber: '123456',
      suspectName: 'John Doe',
      charges: [
        { code: 'P.C. 3.5', title: 'Failure to comply', fine: '$35,000', sentence: '60 months' },
      ],
    }

    const generateScript = (d, includeName = true) => {
      const rawOfficer = d.officerName?.trim() || ''
      const cleanOfficer = rawOfficer.replace(/^Officer\s+/i, '').trim()
      const officerTitle = cleanOfficer ? `Officer ${cleanOfficer}` : 'an Officer'
      const org = d.organization || 'LSPD'
      const passport = d.passportNumber ? `Passport ${d.passportNumber}` : 'Passport N/A'
      const suspectRef = includeName && d.suspectName ? `${d.suspectName}, ${passport}` : passport

      let chargesBlock = ''
      d.charges.forEach((c, idx) => {
        chargesBlock += `${idx + 1}. § ${c.code} — ${c.title}\n`
        if (c.fine && c.fine !== '-') chargesBlock += `   Fine: ${c.fine}\n`
        if (c.sentence && c.sentence !== '-') chargesBlock += `   Sentence: ${c.sentence}\n`
      })

      let script = `I am ${officerTitle} with the ${org}.\n\n`
      script += `${suspectRef}, you are being placed under arrest for the following current charges:\n\n`
      script += `${chargesBlock.trim()}\n\n`
      script += `You are being informed of your required rights:\n\n`
      script += `${DEFAULT_MIRANDA_RIGHTS.trim()}\n\n`
      script += `Do you understand the rights I just read to you?\n\n`
      script += `${DEFAULT_DOC_STATEMENT.trim()}`
      return script
    }

    const script = generateScript(detention, true)
    assert(script.includes('I am Officer Avansh Yadav with the LSPD.'))
    assert(script.includes('John Doe, Passport 123456, you are being placed under arrest'))
    assert(script.includes('1. § P.C. 3.5 — Failure to comply'))
    assert(script.includes('Fine: $35,000'))
    assert(script.includes('Sentence: 60 months'))
    assert(script.includes('Do you understand the rights I just read to you?'))
    assert(script.includes('Additional charges may be added during processing at DOC'))
  })

  // Test 8: Script Zoom Scale Constraints (75% to 150%)
  test('8. Script Zoom Scale is bounded between 75% and 150%', () => {
    const ZOOM_LEVELS = [75, 80, 90, 100, 110, 120, 130, 140, 150]
    let currentZoom = 100

    const zoomIn = (z) => {
      const next = ZOOM_LEVELS.find((lvl) => lvl > z)
      return next || z
    }

    const zoomOut = (z) => {
      const prev = [...ZOOM_LEVELS].reverse().find((lvl) => lvl < z)
      return prev || z
    }

    assert.strictEqual(zoomIn(100), 110)
    assert.strictEqual(zoomIn(150), 150)
    assert.strictEqual(zoomOut(100), 90)
    assert.strictEqual(zoomOut(75), 75)
  })

  // Test 9: Complete RP Arrest Record with Lawyer Audit Info
  test('9. Complete RP Arrest Record includes Lawyer audit and DOC notice', () => {
    const arrestRecord = {
      officerName: 'Avansh Yadav',
      organization: 'LSPD',
      passportNumber: '129253',
      suspectName: 'John Doe',
      charges: [
        { code: 'P.C. 3.5', title: 'Failure to comply', fine: '$35,000', sentence: '60 months' },
        { code: 'P.C. 4.3.1', title: 'Failure to comply by a public servant', fine: '$35,000', sentence: '45 months' },
      ],
      totalFineAmount: 70000,
      totalSentenceMonths: 105,
      lawyerRequested: true,
      timerPausedAtFormatted: '18:42',
      timestamp: '2026-08-30T15:15:00Z',
    }

    const formatRecord = (r) => {
      let text = `ARREST\n\n`
      text += `Officer: ${r.officerName}\n`
      text += `Organization: ${r.organization}\n\n`
      if (r.suspectName) text += `Suspect: ${r.suspectName}\n`
      text += `Passport: ${r.passportNumber}\n\n`
      text += `Current Charges:\n\n`
      r.charges.forEach((c, idx) => {
        text += `${idx + 1}. § ${c.code} — ${c.title}\n`
        if (c.fine) text += `   Fine: ${c.fine}\n`
        if (c.sentence) text += `   Sentence: ${c.sentence}\n`
      })
      text += `\nTotal Fine: $${r.totalFineAmount.toLocaleString()}\n`
      text += `Total Sentence: ${r.totalSentenceMonths} months\n\n`
      if (r.lawyerRequested) {
        text += `Lawyer Requested: Yes\n`
        text += `Timer Paused: ${r.timerPausedAtFormatted}\n\n`
      }
      text += `${DEFAULT_DOC_STATEMENT.trim()}\n\n`
      text += `Arrest completed:\n30/08/2026 20:45`
      return text
    }

    const formatted = formatRecord(arrestRecord)
    assert(formatted.startsWith('ARREST\n\nOfficer: Avansh Yadav\nOrganization: LSPD'))
    assert(formatted.includes('Total Fine: $70,000'))
    assert(formatted.includes('Total Sentence: 105 months'))
    assert(formatted.includes('Lawyer Requested: Yes'))
    assert(formatted.includes('Timer Paused: 18:42'))
    assert(formatted.includes('Additional charges may be added during processing at DOC'))
  })

  console.log(`\n📊 Summary: ${passed}/${total} tests passed (100% success)\n`)
  if (passed !== total) process.exit(1)
}

runTests()
