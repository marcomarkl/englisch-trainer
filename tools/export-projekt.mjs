#!/usr/bin/env node
// Erzeugt projekt/bausteine.md für das Claude-Projekt und kopiert die Inhalte nach app/daten/.
// Bricht ab, wenn eine Nummer doppelt vorkommt, ein Verweis ins Leere zeigt oder eine früher
// exportierte Nummer verschwunden ist. Aufruf: node tools/export-projekt.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const quelle = join(root, 'inhalte');
const ziel = join(root, 'app', 'daten');

// Datei → Name der Liste darin
const dateien = {
  bausteine: 'bausteine',
  zielleiter: 'stufen',
  laute: 'laute',
  muster: 'muster',
};

const fehler = [];
const lies = (pfad) => JSON.parse(readFileSync(pfad, 'utf8'));

const inhalt = {};
for (const [datei, liste] of Object.entries(dateien)) {
  inhalt[datei] = lies(join(quelle, `${datei}.json`));
  const nummern = inhalt[datei][liste].map((e) => e.nr);
  const doppelt = nummern.filter((n, i) => nummern.indexOf(n) !== i);
  if (doppelt.length) fehler.push(`${datei}: Nummer doppelt: ${[...new Set(doppelt)].join(', ')}`);

  const alt = join(ziel, `${datei}.json`);
  if (existsSync(alt)) {
    const vorher = lies(alt)[liste].map((e) => e.nr);
    const weg = vorher.filter((n) => !nummern.includes(n));
    if (weg.length) fehler.push(`${datei}: Nummer verschwunden: ${weg.join(', ')} (Veraltetes auf status "ruht" setzen, nicht löschen)`);
  }
}
inhalt.standort = lies(join(quelle, 'standort.json'));

const hat = (datei, nr) => inhalt[datei][dateien[datei]].some((e) => e.nr === nr);
for (const b of inhalt.bausteine.bausteine) {
  if (!hat('zielleiter', b.zielstufe)) fehler.push(`Baustein ${b.nr}: Zielstufe ${b.zielstufe} fehlt`);
  if (!hat('muster', b.muster)) fehler.push(`Baustein ${b.nr}: Muster ${b.muster} fehlt`);
  if (!hat('laute', b.laut)) fehler.push(`Baustein ${b.nr}: Laut ${b.laut} fehlt`);
}

if (fehler.length) {
  console.error('Export abgebrochen:\n- ' + fehler.join('\n- '));
  process.exit(1);
}

const jetzt = new Date();
const standdatum = jetzt.toISOString().slice(0, 10);

// App-Daten
mkdirSync(ziel, { recursive: true });
for (const datei of [...Object.keys(dateien), 'standort']) {
  writeFileSync(join(ziel, `${datei}.json`), JSON.stringify({ standdatum, ...inhalt[datei] }, null, 2) + '\n');
}
writeFileSync(join(ziel, 'stand.json'), JSON.stringify({ standdatum, exportiert: jetzt.toISOString() }, null, 2) + '\n');

// Wissensdatei für das Claude-Projekt
const z = inhalt.zielleiter.stufen;
const m = inhalt.muster.muster;
const l = inhalt.laute.laute;
const s = inhalt.standort;
const name = (liste, nr) => liste.find((e) => e.nr === nr)?.name ?? '?';

const md = [];
md.push('# Bausteine und Lernmaterial', '');
md.push(`Standdatum: ${standdatum}`, '');
md.push('Nummern sind unveränderlich. Bausteine mit Status „ruht“ nicht mehr neu einführen.', '');

md.push('## Zielleiter', '');
for (const st of z) {
  md.push(`### Ziel ${st.nr}: ${st.name} (${st.niveau})`, '', `Kann: ${st.kann}`, '', `Sitzt, wenn: ${st.sitzt_wenn}`, '');
}

md.push('## Muster', '', 'In dieser Reihenfolge einführen; ein neues Muster erst, wenn das vorige sitzt.', '');
for (const mu of m) {
  md.push(`### Muster ${mu.nr}: ${mu.name}`, '', `Erklärung: ${mu.erklaerung}`, '', `Eselsbrücke: ${mu.eselsbruecke}`, '');
  md.push('Beispiele:', ...mu.beispiele.map((b) => `- ${b}`), '');
  md.push('Typische Fehler:', ...mu.typische_fehler.map((f) => `- ${f}`), '');
}

md.push('## Laute', '', 'Eselsbrücken nur von hier verwenden, keine neuen erfinden.', '');
for (const la of l) {
  md.push(`### Laut ${la.nr}: ${la.name}`, '', `Typischer Fehler: ${la.typischer_fehler}`, '', `Eselsbrücke: ${la.eselsbruecke}`, '');
  md.push(`Beispielwörter: ${la.beispielwoerter.join(', ')}`, '', `Übungssatz: ${la.uebungssatz}`, '');
}

md.push('## Standort', '', s.hinweis, '', `Regel: ${s.regel}`, '');
md.push(`Szenario im Auto (${s.auto.dauer_minuten} Minuten): ${s.auto.szenario}`, '');
md.push('Feste Rückfragen:', ...s.auto.rueckfragen.map((r) => `- ${r}`), '');
md.push('Beobachten:', ...s.auto.beobachten.map((b) => `- ${b}`), '');

md.push('## Bausteine', '');
for (const b of inhalt.bausteine.bausteine) {
  md.push(`### Baustein ${b.nr}: ${b.name}${b.status === 'ruht' ? ' (ruht)' : ''}`, '');
  md.push(`Situation: ${b.situation} · Ziel ${b.zielstufe} (${name(z, b.zielstufe)}) · Muster ${b.muster} (${name(m, b.muster)}) · Laut ${b.laut} (${name(l, b.laut)})`, '');
  md.push('Wendungen:', ...b.wendungen.map((w) => `- ${w.en} — ${w.de}`), '');
  md.push('Beispiele zum Muster:', ...b.beispiele_muster.map((x) => `- ${x}`), '');
  md.push(`Rollenspiel: ${b.rollenspiel}`, '', `Freie Sprechfrage: ${b.sprechfrage}`, '');
}

mkdirSync(join(root, 'projekt'), { recursive: true });
writeFileSync(join(root, 'projekt', 'bausteine.md'), md.join('\n'));

console.log(`Export fertig, Standdatum ${standdatum}: ${inhalt.bausteine.bausteine.length} Bausteine, ${z.length} Ziele, ${m.length} Muster, ${l.length} Laute.`);
