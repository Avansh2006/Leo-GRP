# Legacy scenario scripts

These scripts were written before the app had real tests. Each one contains its **own copy** of the
logic it checks (charge parsing, onboarding, arrest workflow, AI retrieval), so they keep passing even
if the app changes or breaks. They are **not** part of `npm test`.

They're kept because the scenarios and expected answers in them (for example the AI assistant query
matrix) are useful material for real tests. When a test harness that can load the app's modules is
added (e.g. Vitest), port the scenarios to call the real code and delete the copies here.

Real tests live in `scripts/test_*.mjs` and run with `npm test`.
