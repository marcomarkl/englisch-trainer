# Übungs-App einrichten

Teil 1 (Konten) brauchst du schon für die Machbarkeitsprobe. Teil 2 (Installation, Datenschutz) wird mit der fertigen App ergänzt.

Alle Konten legst du selbst an, und die Schlüssel gibst du nur selbst auf dem iPhone in die App ein. Schick sie niemandem, auch nicht in einen Chat.

## Teil 1: Konten

### A. Azure (Aussprachebewertung und Stimme)

1. Auf **portal.azure.com** ein Microsoft-Azure-Konto anlegen. Azure verlangt zur Identitätsprüfung eine Kreditkarte.
2. Oben in der Suche **„Speech“** eingeben und **Speech service** (Azure AI Speech) wählen → **Create**.
3. Ausfüllen:
   - **Resource group:** neu, z. B. `englisch-trainer`
   - **Region:** `West Europe` (Rechenzentrum in Europa). Die Machbarkeitsprobe prüft, ob dort alle nötigen Funktionen laufen.
   - **Name:** z. B. `englisch-trainer-speech`
   - **Pricing tier:** **Free F0**. Der Gratis-Tarif hat ein monatliches Kontingent (laut Azure 5 Stunden Spracherkennung). Ob er danach wirklich nur stoppt und nichts kostet, prüfen wir vor dem endgültigen Betrieb noch in der Tarifbeschreibung.
4. **Review + create** → **Create**, kurz warten.
5. In der fertigen Ressource links **Keys and Endpoint** öffnen. Du brauchst später **KEY 1** und **Location/Region** (z. B. `westeurope`). Noch nirgends eintragen.

### B. Anthropic (Claude Haiku für Erklärungen)

Das ist getrennt von deinem Claude-Abo und wird nach Verbrauch abgerechnet, geschätzt um die 20 Cent im Monat.

1. Auf **platform.claude.com** ein Konto anlegen bzw. anmelden.
2. **Billing** (Abrechnung): ein Zahlungsmittel hinterlegen und ein kleines Guthaben aufladen, z. B. 5 $.
3. **Workspaces**: einen neuen Arbeitsbereich **`englisch-trainer`** anlegen und dort ein **Ausgabenlimit** von etwa **5 $ im Monat** setzen.
4. **API keys**: einen neuen Schlüssel **im Arbeitsbereich `englisch-trainer`** anlegen, Name z. B. `iphone-app`, mit **Ablaufdatum** (z. B. in 6 Monaten). Den Schlüssel sofort sicher in deinem Passwort-Manager ablegen, er wird nur einmal angezeigt.

### C. Was du danach in der App einträgst

Beim ersten Start fragt die App nach:
- Azure-Schlüssel (KEY 1) und Region
- Anthropic-Schlüssel

Beides bleibt nur auf deinem iPhone gespeichert.

## Sicherheitsrahmen

- Die App läuft unter `marcomarkl.github.io`. Alle GitHub-Pages-Seiten unter dieser Adresse teilen sich im Browser den Speicher. Stand 3. Nov. 2026 veröffentlicht keines deiner Repos Pages. **Lege ohne Rücksprache keine weitere Pages-Seite unter deinem Konto an**, sonst könnte deren Code die Schlüssel lesen.
- Die Kosten sind begrenzt: Azure läuft im Gratis-Tarif, Anthropic hat ein Ausgabenlimit, und der Schlüssel läuft von selbst ab.
