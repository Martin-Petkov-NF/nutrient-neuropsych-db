#!/usr/bin/env node
// Marks an entry verified: sets the claim, the evidence grade and the quality
// flag, and flips review_status. This is the reviewer's half of the workflow,
// the part no machine can do, so it exists only to save them editing a
// 23-column CSV by hand.
//
//   node scripts/verify-entry.mjs --id 24 --grade weak --flag ok --claim "..."
//
// Exit 1 on any refusal, with the reason on stderr.

import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

const CSV = 'data/citations.csv';
const args = process.argv.slice(2);
const arg = (n) => { const i = args.indexOf(`--${n}`); return i === -1 ? null : args[i + 1]; };

const GRADES = ['strong', 'moderate', 'weak', 'mechanism-only', 'disputed'];
const FLAGS = ['ok', 'industry-funded', 'predatory-journal', 'secondary-source', 'excluded'];

function parseCsv(text) {
  const rows = []; let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i+1] === '"') { field += '"'; i++; } else q = false; } else field += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length > 1 || r[0] !== '');
}
const q = (s) => /[",\n]/.test(s) ? `"${String(s).replace(/"/g, '""')}"` : String(s);

const id = (arg('id') || '').trim();
const grade = (arg('grade') || '').trim();
const flag = (arg('flag') || '').trim();
const claim = (arg('claim') || '').trim();
const note = (arg('note') || '').trim();

const fail = (m) => { console.error(`\n${m}\n`); process.exit(1); };

if (!id) fail('No entry number given.');
if (!GRADES.includes(grade)) fail(`"${grade}" is not an evidence grade. One of: ${GRADES.join(', ')}`);
if (!FLAGS.includes(flag)) fail(`"${flag}" is not a source quality flag. One of: ${FLAGS.join(', ')}`);
if (claim.length < 20) fail('The claim is missing or too short. It is the precise restatement, with the numbers, and the validator requires it on a verified row.');

const rows = parseCsv(readFileSync(CSV, 'utf8'));
const head = rows.shift();
const col = Object.fromEntries(head.map((h, i) => [h, i]));
const target = rows.find((r) => (r[col.id] ?? '').trim() === id);
if (!target) fail(`No entry numbered ${id}. The highest is ${Math.max(...rows.map((r) => Number(r[col.id]) || 0))}.`);

const was = (target[col.review_status] ?? '').trim();
if (was === 'verified') {
  console.log(`\nEntry ${id} was already verified. Updating the grade and claim anyway.\n`);
}

target[col.claim] = claim;
target[col.evidence_grade] = grade;
target[col.source_quality_flag] = flag;
target[col.review_status] = 'verified';
if (note) {
  const existing = (target[col.notes] ?? '').trim();
  target[col.notes] = existing ? `${existing} ${note}` : note;
}

writeFileSync(CSV, [head, ...rows].map((r) => r.map(q).join(',')).join('\n') + '\n');

const summary = {
  id,
  nutrient: target[col.nutrient],
  headline: target[col.headline_phrase],
  pmid: target[col.pmid],
  was,
  now: 'verified',
  grade,
  flag,
};
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT,
    `headline=${summary.headline.replace(/\n/g, ' ')}\nnutrient=${summary.nutrient}\npmid=${summary.pmid}\nwas=${was}\n`);
}
console.log(`\nEntry ${id} (${summary.nutrient}) is now verified, graded ${grade}, source ${flag}.`);
console.log(`  ${summary.headline}\n`);
