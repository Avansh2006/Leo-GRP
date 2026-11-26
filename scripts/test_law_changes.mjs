#!/usr/bin/env node
// Laws-updated detection (utils/lawChanges.ts)
import assert from 'node:assert/strict'
import { takeSnapshot, diffSnapshots, isEmptyDiff } from '../utils/lawChanges.ts'

const before = takeSnapshot([
  { code: 'P.C. 1', description: 'Theft', fine: '$1,000', sentence: '-', stars: '⭐' },
  { code: 'P.C. 2', description: 'Robbery', fine: '$5,000', sentence: '10 months' },
  { code: 'P.C. 3', description: 'Old law', fine: '$1', sentence: '-' },
])
const after = takeSnapshot([
  { code: 'P.C. 1', description: 'Theft', fine: '$1,500', sentence: '-', stars: '⭐' },
  { code: 'P.C. 2', description: 'Robbery', fine: '$5,000', sentence: '10 months' },
  { code: 'P.C. 4', description: 'New law', fine: '$2', sentence: '-' },
])

const d = diffSnapshots(before, after)
assert.deepEqual(d.added, ['P.C. 4'])
assert.deepEqual(d.removed, ['P.C. 3'])
assert.deepEqual(d.changed, [{ code: 'P.C. 1', field: 'fine', from: '$1,000', to: '$1,500' }])
assert.equal(isEmptyDiff(diffSnapshots(after, after)), true)
console.log('Law change detection\n  ✓ added / removed / changed fine detected\n  ✓ no changes → empty diff')
