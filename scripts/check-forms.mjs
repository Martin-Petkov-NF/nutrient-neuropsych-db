#!/usr/bin/env node
// Catches the issue form mistakes GitHub reports only on the file's own web
// page. A form GitHub rejects is not shown in the new issue chooser at all, so
// contributors silently lose it. That happened from 29 Sep to 13 Oct 2026,
// after `none` was added as a dropdown option: GitHub reserves the word.

import { readdirSync, readFileSync } from 'node:fs';

const DIR = '.github/ISSUE_TEMPLATE';
const problems = [];
for (const f of readdirSync(DIR).filter((n) => /\.ya?ml$/.test(n) && n !== 'config.yml')) {
  readFileSync(`${DIR}/${f}`, 'utf8').split('\n').forEach((line, i) => {
    const m = line.match(/^\s*-\s*["']?([^"'#]*?)["']?\s*$/);
    if (m && m[1].trim().toLowerCase() === 'none') {
      problems.push(`${DIR}/${f}:${i + 1}: dropdown option "${m[1].trim()}" is a word GitHub reserves. The whole form will be hidden. Use another label.`);
    }
  });
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log('Issue forms: no reserved words.');
