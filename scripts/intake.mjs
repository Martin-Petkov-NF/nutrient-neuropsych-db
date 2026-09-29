#!/usr/bin/env node
// Turns a submitted "Add a citation" issue into database rows, or into a list
// of reasons it cannot be accepted yet.
//
// Everything here is a check a machine can make honestly. Whether the summary
// actually describes what the paper found is not one of them, so an accepted
// row lands with review_status = unreviewed and waits for a person.
//
// Usage:
//   node scripts/intake.mjs --body-file issue.md [--json out.json]
// Exit codes: 0 accepted (with or without flags), 1 rejected, 2 script error.

import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

const CSV = 'data/citations.csv';
const args = process.argv.slice(2);
const argOf = (n) => { const i = args.indexOf(n); return i === -1 ? null : args[i + 1]; };

// ---------------------------------------------------------------- form parsing

// GitHub renders an issue form as "### Label" followed by the value.
// An empty optional field renders as "_No response_".
function parseIssueForm(body) {
  const out = {};
  const parts = body.split(/^### +/m).slice(1);
  for (const p of parts) {
    const nl = p.indexOf('\n');
    const label = p.slice(0, nl).trim();
    let value = p.slice(nl + 1).trim();
    if (value === '_No response_' || value === '_No response_\n') value = '';
    out[label] = value;
  }
  return out;
}

const FIELD = {
  identifier: 'PMID or DOI',
  headline: 'Headline phrase',
  nutrient: 'Nutrient',
  topic: 'Topic',
  design: 'Study design',
  direction: 'What does this paper do to the claim?',
  population: 'Who was studied',
  medication: 'Medication involved, if any',
  notes: 'Anything a reviewer should know',
};

const multi = (v) => (v || '').split(',').map((s) => s.trim()).filter(Boolean);

// ---------------------------------------------------------------- vocabularies

const NUTRIENTS = ['vitamin-d','b12','folate','b1-thiamine','b6','b3-niacin','b2-riboflavin','iron','magnesium','zinc','calcium','copper','vitamin-c','vitamin-e','potassium','iodine','omega-3','multiple','none'];
const TOPICS = ['neuropsychiatric','pain','absorption','drug-nutrient','prevalence','testing'];
const DESIGNS = ['systematic-review-meta-analysis','systematic-review','rct','non-randomized-trial','prospective-cohort','case-control','cross-sectional','case-series','case-report','narrative-review','guideline','survey-data','animal','in-vitro'];
const DIRECTIONS = ['supports','does-not-support','mixed','null-result','background'];

// What PubMed calls a design, mapped to what we call it. Used to flag a
// contributor's guess that disagrees with the record, never to overrule it.
const PUBTYPE_TO_DESIGN = {
  'Randomized Controlled Trial': 'rct',
  'Meta-Analysis': 'systematic-review-meta-analysis',
  'Systematic Review': 'systematic-review',
  'Review': 'narrative-review',
  'Case Reports': 'case-report',
  'Guideline': 'guideline',
  'Practice Guideline': 'guideline',
  'Observational Study': 'prospective-cohort',
  'Clinical Trial': 'non-randomized-trial',
};

// Publication types that are not primary evidence and should never be entries.
const NOT_EVIDENCE = ['Editorial','Comment','Letter','News','Published Erratum','Retraction of Publication','Biography','Newspaper Article'];

// ---------------------------------------------------------------- pubmed

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPubmed(pmid) {
  const sum = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${pmid}`).then((r) => r.json());
  const rec = sum?.result?.[pmid];
  if (!rec || rec.error) return null;
  await sleep(350);
  const xml = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=xml&id=${pmid}`).then((r) => r.text());
  const mesh = [...xml.matchAll(/<DescriptorName[^>]*>([^<]+)<\/DescriptorName>/g)].map((m) => m[1]);
  const abstract = [...xml.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)]
    .map((m) => m[1].replace(/<[^>]+>/g, '')).join(' ').trim();
  const ids = Object.fromEntries((rec.articleids || []).map((a) => [a.idtype, a.value]));
  let pmcStatus = null;
  if (ids.pmc) { await sleep(350); pmcStatus = await fetchPmcStatus(ids.pmc); }
  return {
    pmid,
    title: (rec.title || '').replace(/\.$/, ''),
    journal: rec.fulljournalname || '',
    year: (rec.pubdate || '').slice(0, 4),
    volume: rec.volume || '',
    pages: rec.pages || '',
    firstAuthor: (rec.authors || [])[0]?.name || '',
    pubtypes: rec.pubtype || [],
    doi: ids.doi || '',
    pmc: ids.pmc || '',
    pmcStatus,
    mesh,
    abstract,
  };
}

// A PubMed Central identifier does not mean the full text is readable. Many
// articles sit under a publisher embargo for a year and PMC holds only the
// abstract until it lifts. Recording those as open access tells a contributor
// they can check the row when they cannot, so ask PMC what the status is.
// Returns null when the question could not be answered, which is different
// from an answer of no.
async function fetchPmcStatus(pmcId) {
  try {
    const xml = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&retmode=xml&id=${pmcId}`).then((r) => r.text());
    const meta = (name) => (xml.match(new RegExp(`<meta-name>${name}</meta-name><meta-value>([^<]*)</meta-value>`)) || [])[1];
    const live = meta('pmc-status-live');
    if (live !== 'yes' && live !== 'no') return null;
    let until = '';
    const ev = xml.match(/<event event-type="pmc-release">\s*<date>([\s\S]*?)<\/date>/);
    if (ev) {
      const part = (t) => (ev[1].match(new RegExp(`<${t}>(\\d+)</${t}>`)) || [])[1];
      const [y, m, d] = [part('year'), part('month'), part('day')];
      if (y && m && d) until = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return { live: live === 'yes', embargoedUntil: live === 'yes' ? '' : until };
  } catch {
    return null;
  }
}

async function resolveDoi(doi) {
  const q = encodeURIComponent(`${doi}[AID]`);
  const r = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&term=${q}`).then((x) => x.json());
  return r?.esearchresult?.idlist?.[0] || null;
}

// ---------------------------------------------------------------- csv

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

// ---------------------------------------------------------------- main

const reject = [];   // blocks acceptance
const flag = [];     // accepted, but a human should look sooner

function bail(msg) { console.error(msg); process.exit(2); }

const bodyFile = argOf('--body-file');
if (!bodyFile) bail('need --body-file');
const form = parseIssueForm(readFileSync(bodyFile, 'utf8'));

const rawId = (form[FIELD.identifier] || '').trim();
const headline = (form[FIELD.headline] || '').trim();
let nutrients = multi(form[FIELD.nutrient]);
// "none" is for a general paper that names no specific nutrient. Ticked
// alongside real nutrients it contradicts them, so keep the real ones.
const noneWithOthers = nutrients.includes('none') && nutrients.length > 1;
if (noneWithOthers) nutrients = nutrients.filter((n) => n !== 'none');
const topics = multi(form[FIELD.topic]);
const design = (form[FIELD.design] || '').trim();
const direction = (form[FIELD.direction] || '').trim();
const population = (form[FIELD.population] || '').trim();
const medication = (form[FIELD.medication] || '').trim();
const notes = (form[FIELD.notes] || '').trim();

if (!rawId) reject.push('No PubMed ID or DOI was given. Without one nobody can check the paper, so this cannot be added.');
if (!headline) reject.push('The headline phrase is empty.');
if (!nutrients.length) reject.push('No nutrient was selected.');
if (!topics.length) reject.push('No topic was selected.');
if (!DESIGNS.includes(design)) reject.push(`Study design "${design}" is not one of the allowed values.`);
if (!DIRECTIONS.includes(direction)) reject.push(`"${direction}" is not one of the allowed values for what the paper does to the claim.`);
for (const n of nutrients) if (!NUTRIENTS.includes(n)) reject.push(`Nutrient "${n}" is not in the allowed list.`);
for (const t of topics) if (!TOPICS.includes(t)) reject.push(`Topic "${t}" is not in the allowed list.`);

let meta = null;
if (rawId) {
  let pmid = /^\d{5,9}$/.test(rawId) ? rawId : null;
  let doiIn = '';
  if (!pmid) {
    const m = rawId.match(/10\.\d{4,}\/\S+/);
    if (!m) reject.push(`"${rawId}" is not a PubMed ID (a number) or a DOI (starts with 10.).`);
    else { doiIn = m[0].replace(/[.,)]+$/, ''); pmid = await resolveDoi(doiIn); }
  }
  if (pmid) {
    meta = await fetchPubmed(pmid);
    if (!meta) reject.push(`PubMed ID ${pmid} does not resolve to a record. Please check the number.`);
  } else if (doiIn) {
    reject.push(`DOI ${doiIn} is not indexed in PubMed, so the automatic checks cannot confirm it. A reviewer will need to look at this one by hand.`);
  }
}

if (meta) {
  if (meta.pubtypes.includes('Retracted Publication')) {
    reject.push(`**This paper has been retracted.** PubMed lists it as a Retracted Publication. Retracted work is not added.`);
  }
  const bad = meta.pubtypes.filter((t) => NOT_EVIDENCE.includes(t));
  if (bad.length) reject.push(`PubMed classifies this as ${bad.join(', ')}, which is commentary rather than primary evidence.`);

  const expected = meta.pubtypes.map((t) => PUBTYPE_TO_DESIGN[t]).filter(Boolean);
  if (expected.length && !expected.includes(design)) {
    flag.push(`Study design says "${design}" but PubMed classifies this as ${meta.pubtypes.filter((t)=>PUBTYPE_TO_DESIGN[t]).join(', ')}. A reviewer will confirm which is right.`);
  }
  const species = meta.mesh.filter((m) => ['Humans','Animals','Mice','Rats'].includes(m));
  if (species.length && !species.includes('Humans')) {
    flag.push(`This looks like an animal study (${species.join(', ')}). It can be recorded, but it will be graded as mechanism-only.`);
  }
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  if (norm(headline) === norm(meta.title)) {
    flag.push('The headline phrase is the paper title copied. It is meant to be your own sentence saying what the paper found.');
  }
  if (headline.length < 25) flag.push('The headline phrase is very short. One full sentence reads better in the table.');
  if (noneWithOthers) flag.push('"none" was ticked alongside specific nutrients, so it was dropped and the specific ones kept.');
  if (meta.pmc && meta.pmcStatus?.live === false) {
    flag.push(`The full text is embargoed at PubMed Central${meta.pmcStatus.embargoedUntil ? ` until ${meta.pmcStatus.embargoedUntil}` : ''}, so only the abstract can be read for now. The entry is recorded as not open access and links to PubMed. A reviewer who can reach the paper through the journal can grade it sooner.`);
  }
  if (meta.pmc && meta.pmcStatus === null) {
    flag.push('PubMed Central did not answer when asked whether the full text is readable, so `open_access` has been left blank for a reviewer to set.');
  }
}

// Duplicate check against the live data.
const rows = parseCsv(readFileSync(CSV, 'utf8'));
const head = rows.shift();
const col = Object.fromEntries(head.map((h, i) => [h, i]));
const existing = new Set(rows.map((r) => `${r[col.pmid]}|${r[col.nutrient]}|${r[col.topic]}`));
const maxId = Math.max(0, ...rows.map((r) => Number(r[col.id]) || 0));

const pairs = [];
for (const n of nutrients) for (const t of topics) pairs.push([n, t]);
if (meta) {
  const dupes = pairs.filter(([n, t]) => existing.has(`${meta.pmid}|${n}|${t}`));
  if (dupes.length === pairs.length) {
    reject.push('Every combination in this submission is already in the database. Nothing to add.');
  } else if (dupes.length) {
    flag.push(`${dupes.length} of these were already present and have been skipped: ${dupes.map(([n,t])=>`${n}/${t}`).join(', ')}.`);
  }
}
if (pairs.length > 8) reject.push(`That is ${pairs.length} entries from one paper, which is almost certainly not intended. Please narrow the nutrients or topics.`);

const accepted = reject.length === 0;
let newRows = [];
if (accepted && meta) {
  const citation = `${meta.firstAuthor} et al. ${meta.title}. ${meta.journal}. ${meta.year}${meta.volume ? ';' + meta.volume : ''}${meta.pages ? ':' + meta.pages : ''}.`;
  // Readable means a contributor can open the full text today, not that the
  // paper carries an open license. An embargoed PMC record fails this.
  const readable = Boolean(meta.pmc) && meta.pmcStatus?.live === true;
  const embargoNote = meta.pmc && meta.pmcStatus?.live === false
    ? `Full text embargoed at PubMed Central${meta.pmcStatus.embargoedUntil ? ` until ${meta.pmcStatus.embargoedUntil}` : ''}.`
    : '';
  let id = maxId;
  for (const [n, t] of pairs) {
    if (existing.has(`${meta.pmid}|${n}|${t}`)) continue;
    id += 1;
    newRows.push({
      id: String(id), headline_phrase: headline, nutrient: n, topic: t, direction,
      evidence_grade: '', study_design: design, year: meta.year, pmid: meta.pmid,
      population, n: '', medication_interaction: medication, claim: '',
      journal: meta.journal, citation, doi: meta.doi,
      url: readable ? `https://pmc.ncbi.nlm.nih.gov/articles/${meta.pmc}/` : `https://pubmed.ncbi.nlm.nih.gov/${meta.pmid}/`,
      open_access: readable ? 'yes' : meta.pmcStatus === null && meta.pmc ? '' : 'no',
      source_quality_flag: '',
      review_status: 'unreviewed', contributor: process.env.SUBMITTER || 'community',
      date_added: new Date().toISOString().slice(0, 10),
      notes: [notes, embargoNote].filter(Boolean).join(' '),
    });
  }
}

// Write the rows into the CSV.
if (accepted && newRows.length && !args.includes('--dry-run')) {
  const lines = [readFileSync(CSV, 'utf8').replace(/\n+$/, '')];
  for (const r of newRows) lines.push(head.map((h) => q(r[h] ?? '')).join(','));
  writeFileSync(CSV, lines.join('\n') + '\n');
}

const verdict = { accepted, added: newRows.length, reject, flag, pmid: meta?.pmid ?? null, title: meta?.title ?? null, ids: newRows.map((r) => r.id) };
if (argOf('--json')) writeFileSync(argOf('--json'), JSON.stringify(verdict, null, 2));
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `accepted=${accepted}\nadded=${newRows.length}\nflagged=${flag.length > 0}\n`);
}

console.log(JSON.stringify(verdict, null, 2));
process.exit(accepted ? 0 : 1);
