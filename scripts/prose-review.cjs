// Produce review artifacts and targeted patches without writing source files.
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const base = 'docs/prose-review/2026-09-17';

function load(file) {
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports });
  return exports;
}

function inventory() {
  const entries = [];
  function visit(node, path = []) {
    const trail = [...path, node.name];
    const fields = {};
    for (const key of ['alias', 'summary', 'intro', 'body', 'terms', 'params', 'quiz']) {
      if (node[key] !== undefined) fields[key] = node[key];
    }
    entries.push({ id: node.id, title: trail.join(' / '), outline: node.written === false, fields });
    for (const child of [...(node.subs || []), ...(node.sections || [])]) visit(child, trail);
  }
  Object.values(load('src/data/stack.ts').DATA).forEach(node => visit(node));
  const stepper = load('src/data/stepper.ts');
  for (const stage of [...stepper.STAGES, ...stepper.RX_STAGES]) {
    entries.push({ id: 'walkthrough:' + stage.id, title: 'Walkthrough / ' + stage.title,
      fields: { note: stage.note, counts: Object.fromEntries(
        ['400G', '800G', '1.6T'].flatMap(rate => ['100', '200'].map(gen => [rate + '/' + gen, stage.count(rate, gen)]))) } });
  }
  return entries;
}

function patchFile(path, text) {
  return '*** Add File: ' + path + '\n' + text.trimEnd().split('\n').map(line => '+' + line).join('\n') + '\n';
}

function readable(entries, label) {
  let text = '# Ethernet onboarding prose: ' + label + '\n\n';
  text += 'Snapshot date: 2026-09-17. Includes lesson prose, summaries, glossary definitions, parameter tables, quiz text, and walkthrough notes. Outline pages remain identified as outlines.\n\n';
  for (const entry of entries) {
    text += '## ' + entry.title + '\n\nTopic ID: `' + entry.id + '`' + (entry.outline ? '. Outline.' : '.') + '\n\n';
    for (const [key, value] of Object.entries(entry.fields)) {
      text += '### ' + key + '\n\n';
      if (typeof value === 'string') text += value + '\n\n';
      else text += '```json\n' + JSON.stringify(value) + '\n```\n\n';
    }
  }
  return text;
}

if (process.argv[2] === 'snapshot-json' || process.argv[2] === 'snapshot-md') {
  const entries = inventory();
  process.stdout.write('*** Begin Patch\n' +
    (process.argv[2] === 'snapshot-json'
      ? patchFile(base + '-before.json', JSON.stringify(entries))
      : patchFile(base + '-before.md', readable(entries, 'before'))) + '*** End Patch\n');
} else if (process.argv[2] === 'apply') {
  const edits = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
  const file = process.argv[4] || 'src/data/stack.ts';
  const content = fs.readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
  const changes = [];
  const found = new Set();
  function visit(node) {
    if (ts.isObjectLiteralExpression(node)) {
      const props = node.properties.filter(ts.isPropertyAssignment);
      const id = props.find(prop => prop.name.getText(source) === 'id');
      if (id && ts.isStringLiteral(id.initializer) && edits[id.initializer.text]) {
        const key = id.initializer.text;
        found.add(key);
        for (const [field, replacement] of Object.entries(edits[key])) {
          const prop = props.find(p => p.name.getText(source) === field);
          if (!prop) throw Error('Missing field: ' + key + '.' + field);
          const original = prop.initializer.getText(source);
          const updated = JSON.stringify(replacement);
          if (original !== updated) changes.push({ updated, start: prop.initializer.getStart(source), end: prop.initializer.end });
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  for (const id of Object.keys(edits)) if (!found.has(id)) throw Error('Unknown topic: ' + id);
  let patch = '*** Begin Patch\n*** Update File: ' + file + '\n';
  const lines = new Map();
  for (const change of changes) {
    const lineStart = content.lastIndexOf('\n', change.start) + 1;
    if (!lines.has(lineStart)) lines.set(lineStart, []);
    lines.get(lineStart).push(change);
  }
  for (const [lineStart, replacements] of lines) {
    const lineEnd = content.indexOf('\n', Math.max(...replacements.map(change => change.end)));
    const original = content.slice(lineStart, lineEnd < 0 ? content.length : lineEnd).replace(/\r$/, '');
    let updated = original;
    for (const change of replacements.sort((a, b) => b.start - a.start)) {
      updated = updated.slice(0, change.start - lineStart) + change.updated + updated.slice(change.end - lineStart);
    }
    patch += '@@\n' + original.split('\n').map(line => '-' + line.replace(/\r$/, '')).join('\n') + '\n' + updated.split('\n').map(line => '+' + line.replace(/\r$/, '')).join('\n') + '\n';
  }
  process.stdout.write(patch + '*** End Patch\n');
} else if (process.argv[2] === 'report-after' || process.argv[2] === 'report-changes') {
  const before = JSON.parse(fs.readFileSync(base + '-before.json', 'utf8'));
  const after = inventory();
  let changes = '# Ethernet onboarding prose: before and after\n\n';
  changes += 'See the separate [before snapshot](2026-09-17-before.md), [after snapshot](2026-09-17-after.md), and [assessment](2026-09-17-assessment.md). This report records every changed topic field; unchanged fields are retained in the snapshots.\n\n';
  let topics = 0, fields = 0;
  for (const entry of after) {
    const previous = before.find(old => old.id === entry.id);
    if (!previous) throw Error('Added topic: ' + entry.id);
    const modified = Object.keys(entry.fields).filter(key => JSON.stringify(previous.fields[key]) !== JSON.stringify(entry.fields[key]));
    if (previous.title !== entry.title) {
      previous.fields.title = previous.title;
      entry.fields.title = entry.title;
      modified.unshift('title');
    }
    if (!modified.length) continue;
    topics++; fields += modified.length;
    changes += '## ' + entry.title + '\n\nTopic ID: `' + entry.id + '`\n\n';
    for (const key of modified) {
      changes += '### ' + key + '\n\n';
      for (const [label, value] of [['Before', previous.fields[key]], ['After', entry.fields[key]]]) {
        changes += '**' + label + '**\n\n' + (typeof value === 'string' ? value : '```json\n' + JSON.stringify(value) + '\n```') + '\n\n';
      }
    }
  }
  const diagrams = load('src/data/visuals.ts').VISUALS;
  const diagramBefore = JSON.parse(fs.readFileSync('scripts/prose-diagrams-before.json', 'utf8'));
  changes += '## Diagram caption changes\n\nThese before captions were retained from the source during the diagram review. Complete current diagram specifications appear in the after snapshot. Layout and UI-copy changes are explained in the assessment.\n\n';
  for (const [id, caption] of Object.entries(diagramBefore)) {
    changes += '### ' + id + '\n\n**Before**\n\n' + caption + '\n\n**After**\n\n' + diagrams[id].caption + '\n\n';
  }
  let afterText = readable(after, 'after');
  afterText += '## Diagram specifications after review\n\nDiagrams remain schematic. Counts and mappings are reference examples unless a caption states otherwise.\n\n';
  for (const [id, spec] of Object.entries(diagrams)) {
    afterText += '### ' + id + '\n\n' + spec.caption + '\n\n```json\n' + JSON.stringify(spec) + '\n```\n\n';
  }
  changes = changes.replace('This report records', topics + ' topics or walkthrough stages changed across ' + fields + ' fields. This report records');
  process.stdout.write('*** Begin Patch\n' + (process.argv[2] === 'report-after'
    ? patchFile(base + '-after.md', afterText)
    : patchFile(base + '-changes.md', changes)) + '*** End Patch\n');
} else if (process.argv[2] === 'verify') {
  const before = JSON.parse(fs.readFileSync(base + '-before.json', 'utf8'));
  const current = inventory();
  const ids = current.map(entry => entry.id);
  if (new Set(ids).size !== ids.length) throw Error('Duplicate topic IDs');
  if (JSON.stringify(before.map(entry => entry.id)) !== JSON.stringify(ids)) throw Error('Topic identity or order changed');
  let quizzes = 0;
  for (const entry of current) {
    for (const quiz of entry.fields.quiz || []) {
      quizzes++;
      if (!Number.isInteger(quiz.a) || quiz.a < 0 || quiz.a >= quiz.opts.length) throw Error('Invalid quiz answer: ' + entry.id);
    }
    const prose = entry.fields.intro || entry.fields.body || '';
    for (const match of prose.matchAll(/\[\[([^\]]+)\]\]/g)) {
      if (!entry.fields.terms?.[match[1]]) throw Error('Missing inline definition: ' + entry.id + '/' + match[1]);
    }
    if (/[\u2014]/.test(JSON.stringify(entry.fields))) throw Error('Em dash in current content: ' + entry.id);
  }
  const lessons = current.filter(entry => !entry.id.startsWith('walkthrough:'));
  process.stdout.write(JSON.stringify({ topics: lessons.length, prosePassages: lessons.filter(entry => entry.fields.intro || entry.fields.body).length,
    outlines: lessons.filter(entry => entry.outline).length, walkthroughStages: current.length - lessons.length, quizzes,
    glossaryDefinitions: lessons.reduce((count, entry) => count + Object.keys(entry.fields.terms || {}).length, 0),
    parameterTables: lessons.filter(entry => entry.fields.params).length,
    changedEntries: current.filter(entry => JSON.stringify(entry.fields) !== JSON.stringify(before.find(old => old.id === entry.id).fields)).length }, null, 2));
} else {
  process.stdout.write(JSON.stringify(inventory().map(e => ({ id: e.id, title: e.title, prose: e.fields.intro || e.fields.body || e.fields.note })), null, 2));
}
