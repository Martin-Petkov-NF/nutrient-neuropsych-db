#!/usr/bin/env node
// Validates data/citations.csv. Runs on every pull request.
// Node ESM, no dependencies. Network checks are skipped with --offline.

import { readFileSync } from 'node:fs';

const OFFLINE = process.argv.includes('--offline');
const FILE = process.argv.find(a => a.endsWith('.csv')) ?? 'data/citations.csv';

// Order matters for readability: GitHub renders this file as a table, and the
// columns a reader wants first are leftmost. Long prose sits on the right.
const COLUMNS = [
  'id', 'headline_phrase', 'nutrient', 'topic', 'direction', 'evidence_grade',
  'study_design', 'year', 'pmid', 'population', 'n', 'medication_interaction',
  'claim', 'journal', 'citation', 'doi', 'url', 'open_access',
  'source_quality_flag', 'review_status', 'contributor', 'date_added', 'notes',
];

const REQUIRED = ['id', 'headline_phrase', 'nutrient', 'topic', 'claim', 'study_design', 'direction', 'contributor', 'date_added', 'review_status'];

const VOCAB = {
  nutrient: ['vitamin-d', 'b12', 'folate', 'b1-thiamine', 'b6', 'b3-niacin', 'b2-riboflavin', 'iron', 'magnesium', 'zinc', 'calcium', 'copper', 'vitamin-c', 'vitamin-e', 'potassium', 'iodine', 'omega-3', 'multiple'],
  topic: ['neuropsychiatric', 'pain', 'absorption', 'drug-nutrient', 'prevalence', 'testing'],
  study_design: ['systematic-review-meta-analysis', 'systematic-review', 'rct', 'non-randomized-trial', 'prospective-cohort', 'case-control', 'cross-sectional', 'case-series', 'case-report', 'narrative-review', 'guideline', 'survey-data', 'animal', 'in-vitro'],
  direction: ['supports', 'does-not-support', 'mixed', 'null-result', 'background'],
  evidence_grade: ['', 'strong', 'moderate', 'weak', 'mechanism-only', 'disputed'],
  open_access: ['', 'yes', 'no'],
  source_quality_flag: ['', 'ok', 'industry-funded', 'predatory-journal', 'secondary-source', 'excluded'],
  review_status: ['unreviewed', 'verified', 'needs-work', 'rejected'],
};

// Minimal RFC 4180 parser. Handles quoted fields containing commas and newlines.
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length > 1 || r[0] !== '');
}

async function pubmedExists(pmid) {
  const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmid}&retmode=json`;
  try {
    const res = await fetch(url);
    if (!res.ok) return { ok: false, why: `HTTP ${res.status}` };
    const json = await res.json();
    const rec = json?.result?.[pmid];
    if (!rec || rec.error) return { ok: false, why: 'not found in PubMed' };
    return { ok: true, title: rec.title, year: (rec.pubdate || '').slice(0, 4) };
  } catch (e) {
    return { ok: null, why: `lookup failed: ${e.message}` };
  }
}

const errors = [], warnings = [];
const rows = parseCsv(readFileSync(FILE, 'utf8'));
const header = rows.shift();

if (header.join(',') !== COLUMNS.join(',')) {
  errors.push(`Header does not match the schema.\n  expected: ${COLUMNS.join(',')}\n  found:    ${header.join(',')}`);
  report();
}

const seenIds = new Set(), seenClaims = new Set();

for (const [idx, cells] of rows.entries()) {
  const line = idx + 2;
  const r = Object.fromEntries(COLUMNS.map((c, i) => [c, (cells[i] ?? '').trim()]));
  const at = (msg) => `line ${line} (id ${r.id || '?'}): ${msg}`;

  if (cells.length !== COLUMNS.length) {
    errors.push(at(`has ${cells.length} fields, expected ${COLUMNS.length}`));
    continue;
  }
  for (const f of REQUIRED) if (!r[f]) errors.push(at(`missing required field "${f}"`));
  for (const [f, allowed] of Object.entries(VOCAB)) {
    if (r[f] !== undefined && !allowed.includes(r[f])) {
      errors.push(at(`"${f}" is "${r[f]}", which is not in the controlled vocabulary`));
    }
  }
  if (r.id && seenIds.has(r.id)) errors.push(at(`duplicate id "${r.id}"`));
  seenIds.add(r.id);

  // Every row must be checkable by a second person.
  if (!r.pmid && !r.doi) errors.push(at('has neither a PMID nor a DOI, so nobody can check it'));
  if (r.pmid && !/^\d{1,9}$/.test(r.pmid)) errors.push(at(`PMID "${r.pmid}" is not a plain number`));
  if (r.doi && !r.doi.startsWith('10.')) errors.push(at(`DOI "${r.doi}" does not start with "10."`));
  if (r.date_added && !/^\d{4}-\d{2}-\d{2}$/.test(r.date_added)) errors.push(at(`date_added "${r.date_added}" is not ISO format`));
  if (r.year && !/^\d{4}$/.test(r.year)) errors.push(at(`year "${r.year}" is not four digits`));

  // One paper may appear once per nutrient, not twice for the same nutrient and topic.
  const key = `${r.pmid || r.doi}|${r.nutrient}|${r.topic}`;
  if (seenClaims.has(key)) errors.push(at(`duplicates an existing row for the same source, nutrient and topic`));
  seenClaims.add(key);

  // A verified row needs a grade and a quality flag; an unreviewed one must not claim either.
  if (r.review_status === 'verified' && (!r.evidence_grade || !r.source_quality_flag)) {
    errors.push(at('is marked verified but has no evidence_grade or no source_quality_flag'));
  }
  if (r.headline_phrase.length > 300) warnings.push(at('headline_phrase is over 300 characters; it is meant to be one readable sentence'));
}

if (!OFFLINE) {
  for (const [idx, cells] of rows.entries()) {
    const r = Object.fromEntries(COLUMNS.map((c, i) => [c, (cells[i] ?? '').trim()]));
    if (!r.pmid) continue;
    const res = await pubmedExists(r.pmid);
    const at = (m) => `line ${idx + 2} (id ${r.id}): ${m}`;
    if (res.ok === false) errors.push(at(`PMID ${r.pmid} ${res.why}`));
    else if (res.ok === null) warnings.push(at(`PMID ${r.pmid} could not be checked (${res.why})`));
    else if (r.year && res.year && r.year !== res.year) {
      warnings.push(at(`year is ${r.year} but PubMed says ${res.year} for PMID ${r.pmid}`));
    }
    await new Promise(s => setTimeout(s, 400)); // NCBI rate limit
  }
}

report();

function report() {
  const n = rows.length;
  if (warnings.length) {
    console.log(`\nWarnings (${warnings.length}):`);
    for (const w of warnings) console.log(`  ! ${w}`);
  }
  if (errors.length) {
    console.log(`\nErrors (${errors.length}):`);
    for (const e of errors) console.log(`  x ${e}`);
    console.log(`\n${n} rows checked. Not mergeable until the errors above are fixed.\n`);
    process.exit(1);
  }
  console.log(`\n${n} rows checked, no errors.${OFFLINE ? ' (offline: PubMed lookups skipped)' : ''}\n`);
}
