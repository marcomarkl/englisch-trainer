# Bausteine erweitern

Wann: wenn der Coach am Fahrtende sagt „Neue Bausteine nötig für Ziel …“, nach einer Standortbestimmung oder wenn ein neues Ziel ansteht.

## Ablauf

1. **Claude Code in diesem Ordner öffnen** und sagen, was gebraucht wird, zum Beispiel: „Neue Bausteine für Ziel 5, Dienstreise“.
2. **Regeln für neue Inhalte:**
   - Neue Bausteine bekommen **neue Nummern** (fortlaufend nach der höchsten vorhandenen). Vorhandene Nummern nie ändern oder wiederverwenden.
   - Veraltetes nicht löschen, sondern auf `"status": "ruht"` setzen.
   - Format wie in `inhalte/bausteine.json`: 5 bis 8 Wendungen mit deutscher Bedeutung, Verweis auf Zielstufe, Muster und Laut, Rollenspiel, freie Sprechfrage.
   - Neutrales, international verständliches amerikanisches Englisch, keine Redewendungen von Muttersprachlern.
3. **Gegenprüfung:** Alle neuen englischen Sätze lässt Claude Code von einem zweiten, unabhängigen Durchgang prüfen (Natürlichkeit, Korrektheit, Verständlichkeit für Nicht-Muttersprachler) und übernimmt die Korrekturen.
4. **Export:** `node tools/export-projekt.mjs`. Er bricht ab, wenn eine Nummer doppelt vorkommt, ein Verweis fehlt oder eine Nummer verschwunden ist.
5. **Ins Projekt laden:** Auf claude.ai im Projekt „Englisch-Coach“ die alte `bausteine.md` entfernen und die neue `projekt/bausteine.md` hochladen. Haben sich die Coach-Anweisungen geändert, auch die Projektanweisungen ersetzen.
6. **App aktualisieren:** Änderungen committen, `git push` und danach `npm run veroeffentlichen` (schiebt `app/` in den Branch `gh-pages`, den GitHub Pages ausliefert). Die App ist unter https://marcomarkl.github.io/englisch-trainer/ erreichbar, die App meldet beim nächsten Start „Neue Bausteine da“.
7. **Prüfen:** Den Coach fragen „Wo stehe ich?“. Er nennt das Standdatum, und das muss das neue sein. In der App steht dasselbe Datum in den Einstellungen.

## Rückweg

Wirkt eine neue Fassung der Coach-Anweisungen oder Bausteine schlechter:

1. In Git die vorige Fassung wiederherstellen, z. B. `git log -- projekt/coach-anweisungen.md` und `git checkout <commit> -- projekt/coach-anweisungen.md inhalte/`.
2. Export laufen lassen und wie in Schritt 5 und 6 erneut hochladen bzw. pushen.

Hinweis: Wurden zwischenzeitlich neue Nummern vergeben und schon geübt, die alten Inhalte nicht einfach zurücksetzen. Der Export würde zu Recht wegen verschwundener Nummern abbrechen. Dann die neuen Bausteine auf „ruht“ setzen statt sie zu entfernen.
