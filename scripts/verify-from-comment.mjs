#!/usr/bin/env node
// Verifies or rejects an entry from a comment on its own submitting issue, so
// the reviewer never types an entry number. The number is read from a marker
// the intake bot left in the issue, which removes the whole class of
// mistyping errors.
//
//   node scripts/verify-from-comment.mjs --comment c.md --issue i.json
//
// To verify, the comment looks like this. The last five lines are optional and
// correct what the contributor chose on the form:
//
//   /verify
//   grade: weak
//   flag: ok
//   claim: Meta-analysis of 17 studies, zinc 1.85 umol/L lower in depressed subjects.
//   nutrient: zinc
//   topic: neuropsychiatric
//   design: systematic-review-meta-analysis
//   direction: supports
//   headline: Zinc is lower in people with depression.
//
// To reject:
//
//   /reject
//   reason: A press release, not a paper.
//
// Exit 0 applied, 1 refused with a reason on stdout for posting back, 2 not a
// command at all.

import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { parseCsv, stringifyCsv, GRADES, FLAGS, NUTRIENTS, TOPICS, DESIGNS, DIRECTIONS } from './lib/csv.mjs';

const CSV = 'data/citations.csv';
const arg = (n) => { const a = process.argv; const i = a.indexOf(`--${n}`); return i === -1 ? null : a[i + 1]; };

const comment = readFileSync(arg('comment'), 'utf8');
const issueBlob = JSON.parse(readFileSync(arg('issue'), 'utf8'));

const out = (msg, code) => { console.log(msg); process.exit(code); };
const output = (pairs) => {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(pairs).map(([k, v]) => `${k}=${v}\n`).join(''));
};

const command = (comment.match(/^\s*\/(verify|reject)\b/m) || [])[1];
if (!command) process.exit(2);

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

const rows = parseCsv(readFileSync(CSV, 'utf8'));
const head = rows.shift();
const col = Object.fromEntries(head.map((h, i) => [h, i]));
const targets = ids.map((id) => rows.find((x) => (x[col.id] ?? '').trim() === id)).filter(Boolean);
if (!targets.length) out(`Entry ${ids.join(', ')} is no longer in the database, so nothing was changed.`, 1);

const by = process.env.ACTOR || 'a reviewer';
const today = new Date().toISOString().slice(0, 10);
const stamp = (r, text) => { const prev = (r[col.notes] ?? '').trim(); r[col.notes] = prev ? `${prev} ${text}` : text; };
const list = () => targets.map((r) => `- Entry **${r[col.id]}** (${r[col.nutrient]}): ${r[col.headline_phrase]}`).join('\n');

// ---------------------------------------------------------------- reject

if (command === 'reject') {
  const reason = field('reason');
  if (reason.length < 10) out('I could not apply that, so nothing was changed.\n\n- `reason` is missing or too short. Say in a sentence why the entry does not belong, so the contributor and later readers can see it.\n\nEdit your comment or post a new one and it will run again.', 1);
  for (const r of targets) {
    r[col.review_status] = 'rejected';
    stamp(r, `Rejected by ${by} on ${today}: ${reason.replace(/\.$/, '')}.`);
  }
  writeFileSync(CSV, stringifyCsv([head, ...rows]));
  output({ applied: targets.map((r) => r[col.id]).join(','), verb: 'Reject', grade: 'rejected', close: 'not planned' });
  out(`Not added. The entry stays in the data file marked rejected, so the decision is on record, and it no longer appears in the reading view.\n\n${list()}\n\n> ${reason}\n\nThank you for sending it all the same.`, 0);
}

// ---------------------------------------------------------------- verify

const grade = field('grade').toLowerCase();
const flag = (field('flag') || field('source') || 'ok').toLowerCase();
const claim = field('claim');

// Optional corrections to what the contributor chose on the form.
const fixes = {
  nutrient: [field('nutrient').toLowerCase(), NUTRIENTS],
  topic: [field('topic').toLowerCase(), TOPICS],
  study_design: [field('design').toLowerCase(), DESIGNS],
  direction: [field('direction').toLowerCase(), DIRECTIONS],
};
const headline = field('headline');

const problems = [];
if (!GRADES.includes(grade)) problems.push(`\`grade\` is ${grade ? `"${grade}"` : 'missing'}. It must be one of: ${GRADES.map((g) => `\`${g}\``).join(', ')}.`);
if (!FLAGS.includes(flag)) problems.push(`\`flag\` is "${flag}". It must be one of: ${FLAGS.map((f) => `\`${f}\``).join(', ')}.`);
if (claim.length < 20) problems.push('`claim` is missing or too short. It is the precise restatement with the numbers, and the validator requires it on a verified row.');
for (const [name, [value, allowed]] of Object.entries(fixes)) {
  if (value && !allowed.includes(value)) problems.push(`\`${name === 'study_design' ? 'design' : name}\` is "${value}". It must be one of: ${allowed.map((a) => `\`${a}\``).join(', ')}.`);
}
if (headline && headline.length < 15) problems.push('`headline` is too short. It is one full sentence saying what the paper found.');
if ((fixes.nutrient[0] || fixes.topic[0]) && targets.length > 1) {
  problems.push(`This issue added ${targets.length} entries, one per nutrient and topic, so changing \`nutrient\` or \`topic\` here would make them identical. Leave those two out, or reject the entries that do not belong.`);
}
if (targets.length === 1 && (fixes.nutrient[0] || fixes.topic[0])) {
  const r = targets[0];
  const n = fixes.nutrient[0] || r[col.nutrient];
  const t = fixes.topic[0] || r[col.topic];
  const clash = rows.find((x) => x !== r && x[col.pmid] === r[col.pmid] && x[col.nutrient] === n && x[col.topic] === t);
  if (clash) problems.push(`Entry ${clash[col.id]} already records this paper under ${n} and ${t}, so the change would duplicate it.`);
}
if (problems.length) {
  out(`I could not apply that, so nothing was changed.\n\n${problems.map((p) => `- ${p}`).join('\n')}\n\nEdit your comment or post a new one and it will run again.`, 1);
}

const changed = [];
for (const r of targets) {
  for (const [name, [value]] of Object.entries(fixes)) {
    if (value && r[col[name]] !== value) { changed.push(`${name.replace('study_', '')} ${r[col[name]]} to ${value}`); r[col[name]] = value; }
  }
  if (headline && r[col.headline_phrase] !== headline) { changed.push('headline reworded'); r[col.headline_phrase] = headline; }
  r[col.claim] = claim;
  r[col.evidence_grade] = grade;
  r[col.source_quality_flag] = flag;
  r[col.review_status] = 'verified';
  stamp(r, `Verified by ${by} on ${today}.${changed.length ? ` Corrected on review: ${[...new Set(changed)].join(', ')}.` : ''}`);
}

writeFileSync(CSV, stringifyCsv([head, ...rows]));
output({ applied: targets.map((r) => r[col.id]).join(','), verb: 'Verify', grade, flag, close: 'completed' });

const corrections = changed.length ? `\n\nCorrected on review: ${[...new Set(changed)].join(', ')}.` : '';
out(`Read and verified. Graded **${grade}**, source **${flag}**.${corrections}\n\n${list()}\n\n> ${claim}\n\nThank you for the submission.`, 0);
