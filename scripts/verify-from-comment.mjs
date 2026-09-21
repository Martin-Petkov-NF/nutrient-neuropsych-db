#!/usr/bin/env node
// Verifies an entry from a comment on its own submitting issue, so the reviewer
// never types an entry number. The number is read from a marker the intake bot
// left in the issue, which removes the whole class of mistyping errors.
//
//   node scripts/verify-from-comment.mjs --comment c.md --issue i.json
//
// The comment looks like:
//
//   /verify
//   grade: weak
//   flag: ok
//   claim: Meta-analysis of 17 studies, zinc 1.85 umol/L lower in depressed subjects.
//
// Exit 0 applied, 1 refused with a reason on stdout for posting back, 2 not a
// verify command at all.

import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { parseCsv, stringifyCsv, GRADES, FLAGS } from './lib/csv.mjs';

const CSV = 'data/citations.csv';
const arg = (n) => { const a = process.argv; const i = a.indexOf(`--${n}`); return i === -1 ? null : a[i + 1]; };

const comment = readFileSync(arg('comment'), 'utf8');
const issueBlob = JSON.parse(readFileSync(arg('issue'), 'utf8'));

const out = (msg, code) => { console.log(msg); process.exit(code); };

if (!/^\s*\/verify\b/m.test(comment)) process.exit(2);

// Entry numbers come from the marker the intake bot writes, never from the
// person. Fall back to its prose if an older issue predates the marker.
const all = [issueBlob.body || '', ...(issueBlob.comments || []).map((c) => c.body || '')].join('\n');
let ids = [];
const marker = all.match(/<!--\s*entries:\s*([\d,\s]+?)\s*-->/);
if (marker) ids = marker[1].split(',').map((s) => s.trim()).filter(Boolean);
if (!ids.length) {
  const prose = all.match(/Added as entr(?:y|ies)\s+([\d,\s and]+?),/i);
  if (prose) ids = prose[1].split(/[,\s]+|and/).map((s) => s.trim()).filter((s) => /^\d+$/.test(s));
}
if (!ids.length) {
  out('I could not work out which entry this issue refers to, so nothing was changed.\n\nThis happens on issues that were not created by the intake bot. Use the **Verify an entry** workflow in the Actions tab and give the entry number by hand.', 1);
}

const field = (name) => {
  const m = comment.match(new RegExp(`^\\s*${name}\\s*[:=]\\s*(.+)$`, 'im'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
};
const grade = field('grade').toLowerCase();
const flag = (field('flag') || field('source') || 'ok').toLowerCase();
const claim = field('claim');

const problems = [];
if (!GRADES.includes(grade)) problems.push(`\`grade\` is ${grade ? `"${grade}"` : 'missing'}. It must be one of: ${GRADES.map((g) => `\`${g}\``).join(', ')}.`);
if (!FLAGS.includes(flag)) problems.push(`\`flag\` is "${flag}". It must be one of: ${FLAGS.map((f) => `\`${f}\``).join(', ')}.`);
if (claim.length < 20) problems.push('`claim` is missing or too short. It is the precise restatement with the numbers, and the validator requires it on a verified row.');
if (problems.length) {
  out(`I could not apply that, so nothing was changed.\n\n${problems.map((p) => `- ${p}`).join('\n')}\n\nEdit your comment or post a new one and it will run again.`, 1);
}

const rows = parseCsv(readFileSync(CSV, 'utf8'));
const head = rows.shift();
const col = Object.fromEntries(head.map((h, i) => [h, i]));

const applied = [];
for (const id of ids) {
  const r = rows.find((x) => (x[col.id] ?? '').trim() === id);
  if (!r) continue;
  r[col.claim] = claim;
  r[col.evidence_grade] = grade;
  r[col.source_quality_flag] = flag;
  r[col.review_status] = 'verified';
  const by = process.env.ACTOR || 'a reviewer';
  const stamp = `Verified by ${by} on ${new Date().toISOString().slice(0, 10)}.`;
  const prev = (r[col.notes] ?? '').trim();
  r[col.notes] = prev ? `${prev} ${stamp}` : stamp;
  applied.push({ id, nutrient: r[col.nutrient], headline: r[col.headline_phrase] });
}
if (!applied.length) out(`Entry ${ids.join(', ')} is no longer in the database, so nothing was changed.`, 1);

writeFileSync(CSV, stringifyCsv([head, ...rows]));

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `applied=${applied.map((a) => a.id).join(',')}\ngrade=${grade}\nflag=${flag}\n`);
}

const list = applied.map((a) => `- Entry **${a.id}** (${a.nutrient}): ${a.headline}`).join('\n');
out(`Read and verified. Graded **${grade}**, source **${flag}**.\n\n${list}\n\n> ${claim}\n\nThank you for the submission.`, 0);
