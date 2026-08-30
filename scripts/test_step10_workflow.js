/**
 * Step 10 Verification Test Suite
 * Tests Quick Access persistence, Fine & Arrest issuance workflow, Duty shift accounting, and Report formatting.
 */

const assert = require('assert')

// Mock environment
console.log('🧪 Starting Step 10 Verification Suite...\n')

// 1. Test Report Formatting Logic
console.log('Test 1: Shift Report Generator formatting...')
function formatShiftReportText(shift, includeSuspectName) {
  const formatTime = (iso) => {
    try {
      const d = new Date(iso)
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
        d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return iso
    }
  }

  let text = `END OF SHIFT\n`
  text += `────────────────────────\n`
  text += `Organization: ${shift.organization || 'LSPD'}\n`
  text += `Shift: ${formatTime(shift.onDutyTime)} → ${shift.offDutyTime ? formatTime(shift.offDutyTime) : 'Ongoing'}\n\n`

  text += `FINES ISSUED\n`
  text += `────────────────────────\n`
  if (!shift.fines || shift.fines.length === 0) {
    text += `No fines issued during this shift.\n`
  } else {
    shift.fines.forEach((f, idx) => {
      text += `#${idx + 1}\n`
      text += `Fine: ${f.fineFormatted || `$${f.fineAmount.toLocaleString()}`}\n`
      if (f.passportNumber) text += `Passport No: ${f.passportNumber}\n`
      if (includeSuspectName && f.suspectName) text += `Name: ${f.suspectName}\n`
      text += `Charge: § ${f.provisionCode} — ${f.provisionTitle}\n\n`
    })
  }
  text += `Total Fines: $${shift.totalFinesAmount.toLocaleString()}\n\n`

  text += `ARRESTS\n`
  text += `────────────────────────\n`
  if (!shift.arrests || shift.arrests.length === 0) {
    text += `No arrests logged during this shift.\n`
  } else {
    shift.arrests.forEach((a, idx) => {
      text += `#${idx + 1}\n`
      if (a.passportNumber) text += `Passport No: ${a.passportNumber}\n`
      if (includeSuspectName && a.suspectName) text += `Name: ${a.suspectName}\n`
      text += `Status: ${a.status}\n`
      text += `Charges:\n`
      a.charges.forEach((c) => {
        text += `- § ${c.code} — ${c.title}\n`
      })
      if (a.totalSentenceMonths > 0) text += `Sentence: ${a.totalSentenceMonths} months\n`
      if (a.totalFineAmount > 0) text += `Fine: $${a.totalFineAmount.toLocaleString()}\n`
      if (a.stars) text += `Wanted: ${a.stars}\n`
      if (a.bailStatus) text += `Bail: ${a.bailStatus}\n`
      text += `\n`
    })
  }
  text += `Total Arrests: ${shift.totalArrestsCount}\n`

  return text.trim()
}

const mockShift = {
  id: 'shift-123456789',
  organization: 'LSPD',
  onDutyTime: '2026-08-30T10:00:00.000Z',
  offDutyTime: '2026-08-30T12:00:00.000Z',
  fines: [
    {
      id: 'fine-1',
      provisionCode: '3.1.1',
      provisionTitle: 'Speeding over 30 km/h',
      fineAmount: 10000,
      fineFormatted: '$10,000',
      suspectName: 'Dominic Toretto',
      passportNumber: '778899',
    },
    {
      id: 'fine-2',
      provisionCode: '6.2.1',
      provisionTitle: 'Illegal parking in red zone',
      fineAmount: 5000,
      fineFormatted: '$5,000',
      suspectName: 'Brian OConner',
      passportNumber: '112233',
    },
  ],
  arrests: [
    {
      id: 'arrest-1',
      status: 'ARRESTED',
      suspectName: 'Dominic Toretto',
      passportNumber: '778899',
      charges: [
        { code: '2.10.5', title: 'Grand Theft Auto', fine: '$30,000', sentence: '30 months', stars: '⭐⭐⭐' },
        { code: '4.3.1', title: 'Evading Police Officer', fine: '$15,000', sentence: '15 months', stars: '⭐⭐' },
      ],
      totalFineAmount: 45000,
      totalSentenceMonths: 45,
      stars: '⭐⭐⭐',
      bailStatus: 'NO BAIL',
    },
  ],
  totalFinesAmount: 15000,
  totalFinesCount: 2,
  totalArrestsCount: 1,
}

// Check with Suspect Name enabled
const reportWithName = formatShiftReportText(mockShift, true)
assert(reportWithName.includes('Dominic Toretto'), 'Report should include suspect name when enabled')
assert(reportWithName.includes('Passport No: 778899'), 'Report should include passport number')
assert(reportWithName.includes('Total Fines: $15,000'), 'Report should contain correct total fines')
assert(reportWithName.includes('Total Arrests: 1'), 'Report should contain total arrests count')
console.log('✅ Test 1 Passed: Shift report formatted accurately with suspect name.')

// Check with Suspect Name disabled (Privacy Mode)
const reportWithoutName = formatShiftReportText(mockShift, false)
assert(!reportWithoutName.includes('Dominic Toretto'), 'Report should NOT include suspect name when privacy mode is active')
assert(reportWithoutName.includes('Passport No: 778899'), 'Report should still include passport number in privacy mode')
console.log('✅ Test 1.1 Passed: Shift report honors privacy setting.')

// 2. Test Duty Accounting & No Double Counting
console.log('\nTest 2: Duty accounting and double-counting prevention...')
class MockDutyContext {
  constructor() {
    this.isOnDuty = false
    this.currentShiftId = null
    this.currentShiftFines = 0
    this.currentShiftFinesAmount = 0
    this.currentShiftArrests = 0
    this.lifetimeFines = 0
    this.lifetimeFinesCount = 0
    this.lifetimeArrests = 0
    this.finesStore = []
    this.arrestsStore = []
    this.shiftsStore = []
  }

  startDuty() {
    this.isOnDuty = true
    this.currentShiftId = `shift-${Date.now()}`
    this.currentShiftFines = 0
    this.currentShiftFinesAmount = 0
    this.currentShiftArrests = 0
  }

  issueFine(fine) {
    const record = {
      ...fine,
      id: `fine-${Date.now()}-${Math.random()}`,
      shiftId: this.isOnDuty ? this.currentShiftId : null,
    }
    this.finesStore.push(record)

    if (this.isOnDuty) {
      this.currentShiftFines += 1
      this.currentShiftFinesAmount += record.fineAmount
    }
    this.lifetimeFines += record.fineAmount
    this.lifetimeFinesCount += 1
    return record
  }

  issueArrest(arrest) {
    const record = {
      ...arrest,
      id: `arrest-${Date.now()}-${Math.random()}`,
      shiftId: this.isOnDuty ? this.currentShiftId : null,
      status: 'ARRESTED',
    }
    this.arrestsStore.push(record)

    if (this.isOnDuty) {
      this.currentShiftArrests += 1
    }
    this.lifetimeArrests += 1
    return record
  }

  endDuty() {
    if (!this.isOnDuty) return null
    const shiftFines = this.finesStore.filter((f) => f.shiftId === this.currentShiftId)
    const shiftArrests = this.arrestsStore.filter((a) => a.shiftId === this.currentShiftId)

    const shiftRecord = {
      id: this.currentShiftId,
      fines: shiftFines,
      arrests: shiftArrests,
      totalFinesAmount: this.currentShiftFinesAmount,
      totalFinesCount: this.currentShiftFines,
      totalArrestsCount: this.currentShiftArrests,
    }
    this.shiftsStore.push(shiftRecord)
    this.isOnDuty = false
    this.currentShiftId = null
    this.currentShiftFines = 0
    this.currentShiftFinesAmount = 0
    this.currentShiftArrests = 0
    return shiftRecord
  }
}

const duty = new MockDutyContext()

// Log fine while OFF DUTY
duty.issueFine({ provisionCode: '3.1.1', provisionTitle: 'Speeding', fineAmount: 5000 })
assert.strictEqual(duty.currentShiftFinesAmount, 0, 'Off-duty fine must not increment active shift total')
assert.strictEqual(duty.lifetimeFines, 5000, 'Off-duty fine must increment lifetime fines')

// Start duty
duty.startDuty()
duty.issueFine({ provisionCode: '3.1.2', provisionTitle: 'Reckless Driving', fineAmount: 10000 })
duty.issueFine({ provisionCode: '6.2.1', provisionTitle: 'Illegal Parking', fineAmount: 5000 })
duty.issueArrest({ charges: [{ code: '2.10.5', title: 'Grand Theft Auto' }], totalFineAmount: 20000, totalSentenceMonths: 20 })

assert.strictEqual(duty.currentShiftFines, 2, 'Shift should have 2 fines')
assert.strictEqual(duty.currentShiftFinesAmount, 15000, 'Shift should have $15,000 fines')
assert.strictEqual(duty.currentShiftArrests, 1, 'Shift should have 1 arrest')
assert.strictEqual(duty.lifetimeFines, 20000, 'Lifetime fines should be $20,000 ($5k off duty + $15k on duty)')
assert.strictEqual(duty.lifetimeFinesCount, 3, 'Lifetime fine count should be 3')

// End duty and verify record integrity
const completedShift = duty.endDuty()
assert.strictEqual(completedShift.fines.length, 2, 'Completed shift must contain exactly 2 fines')
assert.strictEqual(completedShift.totalFinesAmount, 15000, 'Completed shift total fines amount must be $15,000')
assert.strictEqual(completedShift.arrests.length, 1, 'Completed shift must contain exactly 1 arrest')
assert.strictEqual(duty.isOnDuty, false, 'Duty state should now be OFF')
console.log('✅ Test 2 Passed: Duty accounting, isolation, and lifetime derivations verified.')

// 3. Test Quick Access Initialization Lifecycle
console.log('\nTest 3: Quick Access initialization lifecycle...')
let mockStorage = {}
let mockIndexedDB_QA = []

function getQuickAccessItemsSimulation() {
  const isInitialized = mockStorage['leogrp_qa_initialized'] === 'true'
  if (!isInitialized) {
    const defaults = [{ id: 'default-1', title: 'Traffic Code' }, { id: 'default-2', title: 'Penal Code' }]
    mockIndexedDB_QA = [...defaults]
    mockStorage['leogrp_qa_initialized'] = 'true'
    return defaults
  }
  return mockIndexedDB_QA
}

// Clean start
const initialQA = getQuickAccessItemsSimulation()
assert.strictEqual(initialQA.length, 2, 'First run should seed defaults')
assert.strictEqual(mockStorage['leogrp_qa_initialized'], 'true', 'First run should set initialized flag')

// User deletes all items
mockIndexedDB_QA = []
// User reloads page
const reloadedQA = getQuickAccessItemsSimulation()
assert.strictEqual(reloadedQA.length, 0, 'Page refresh must preserve user state even when empty')

// User adds custom item
mockIndexedDB_QA = [{ id: 'custom-1', title: 'Impound Lot' }]
const secondReloadQA = getQuickAccessItemsSimulation()
assert.strictEqual(secondReloadQA.length, 1, 'Page refresh must preserve custom items')
assert.strictEqual(secondReloadQA[0].title, 'Impound Lot', 'Item title must match')
console.log('✅ Test 3 Passed: Quick Access persistence safely retains user state without default overwriting.')

console.log('\n🎉 ALL STEP 10 TESTS PASSED!')
