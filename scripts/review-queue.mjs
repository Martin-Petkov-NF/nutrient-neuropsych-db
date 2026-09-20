#!/usr/bin/env node
// Prints the review queue: entries that are in the database but that nobody has
// read yet. Used by the weekly workflow to keep one standing issue up to date,
// so a growing backlog is visible rather than silent.
//
//   node scripts/review-queue.mjs            markdown for the issue body
//   node scripts/review-queue.mjs --count    just the number, for the workflow

import { readFileSync } from 'node:fs';

const CSV = 'data/citations.csv';

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

const rows = parseCsv(readFileSync(CSV, 'utf8'));
const head = rows.shift();
const col = Object.fromEntries(head.map((h, i) => [h, i]));
const get = (r, n) => (r[col[n]] ?? '').trim();

const pending = rows.filter((r) => ['unreviewed', 'needs-work'].includes(get(r, 'review_status')));

if (process.argv.includes('--count')) {
  console.log(pending.length);
  process.exit(0);
}

const out = [];
out.push('Entries that are in the database but that nobody has read yet.');
out.push('');
out.push('They passed the automatic checks, which means the paper exists, has not been');
out.push('retracted, is not a duplicate, and its details came from the PubMed record. The');
out.push('checks cannot tell whether the one-sentence summary matches what the paper found.');
out.push('That is what this queue is for.');
out.push('');

if (!pending.length) {
  out.push('**Nothing waiting. The queue is empty.**');
} else {
  out.push(`**${pending.length} waiting.**`);
  out.push('');
  out.push('For each one: read the source, check the summary and the direction against it,');
  out.push('write the precise `claim`, set `evidence_grade` and `source_quality_flag`, then');
  out.push('change `review_status` to `verified`. The validator will not accept a verified row');
  out.push('that is missing any of those.');
  out.push('');
  out.push('| # | Nutrient | What the contributor says it found | Source | Added | By |');
  out.push('|---|---|---|---|---|---|');
  for (const r of pending.sort((a, b) => get(a, 'date_added').localeCompare(get(b, 'date_added')))) {
    const pmid = get(r, 'pmid');
    const src = pmid
      ? `[${get(r, 'year')}](https://pubmed.ncbi.nlm.nih.gov/${pmid}/)`
      : get(r, 'doi') ? `[${get(r, 'year')}](https://doi.org/${get(r, 'doi')})` : get(r, 'year');
    const phrase = get(r, 'headline_phrase').replace(/\|/g, '\\|');
    out.push(`| ${get(r, 'id')} | ${get(r, 'nutrient')} | ${phrase} | ${src} | ${get(r, 'date_added')} | ${get(r, 'contributor')} |`);
  }
}

out.push('');
out.push('---');
out.push('');
out.push('This issue is rebuilt weekly and whenever the data changes. Do not close it; it');
out.push('closes itself when the queue empties.');

console.log(out.join('\n'));
