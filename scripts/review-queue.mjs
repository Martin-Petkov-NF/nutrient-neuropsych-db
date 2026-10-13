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
  out.push('For each one: open the paper from the **Read it** column and check the summary and');
  out.push('the direction against it. Then go to the entry\'s own issue, which is assigned to you');
  out.push(`and listed under [not yet read](https://github.com/${process.env.GITHUB_REPOSITORY || 'Martin-Petkov-NF/nutrient-neuropsych-db'}/issues?q=is%3Aissue+is%3Aopen+label%3A%22not+yet+read%22),`);
  out.push('and comment `/verify` with the grade, flag and claim, or `/reject` with a reason.');
  out.push('The bot\'s reply on that issue has a block to copy.');
  out.push('');
  out.push('| # | Nutrient | What the contributor says it found | Read it | Added | By |');
  out.push('|---|---|---|---|---|---|');
  for (const r of pending.sort((a, b) => get(a, 'date_added').localeCompare(get(b, 'date_added')))) {
    const pmid = get(r, 'pmid');
    // Link the full text when it is free to read. The PubMed page shows only
    // the abstract, and a reviewer sent there may conclude they cannot read it.
    const full = get(r, 'open_access') === 'yes' && get(r, 'url');
    const src = full
      ? `[Free full text](${full}) (${get(r, 'year')})`
      : pmid ? `[Abstract only](https://pubmed.ncbi.nlm.nih.gov/${pmid}/) (${get(r, 'year')})`
      : get(r, 'doi') ? `[Publisher page](https://doi.org/${get(r, 'doi')}) (${get(r, 'year')})` : get(r, 'year');
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
