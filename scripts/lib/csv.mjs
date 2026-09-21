// Shared CSV handling. Four scripts were carrying their own copy of this.

export function parseCsv(text) {
  const rows = []; let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length > 1 || r[0] !== '');
}

export const quote = (s) => /[",\n]/.test(String(s)) ? `"${String(s).replace(/"/g, '""')}"` : String(s);

export const stringifyCsv = (rows) => rows.map((r) => r.map(quote).join(',')).join('\n') + '\n';

export const GRADES = ['strong', 'moderate', 'weak', 'mechanism-only', 'disputed'];
export const FLAGS = ['ok', 'industry-funded', 'predatory-journal', 'secondary-source', 'excluded'];
