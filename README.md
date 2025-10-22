# Dars Tools

Eine Sammlung moderner Browser-Tools für das Bauwesen. Die Landingpage präsentiert alle verfügbaren Anwendungen in einer klaren
Kachelübersicht. Der **LV Analyzer** ist das erste verfügbare Tool und ermöglicht die lokale Analyse textbasierter PDF-
Leistungsverzeichnisse – ohne Server, ohne Installation.

## Features

- 🧭 **Zentrale Landingpage** – Übersichtliche Kacheln nach dem Vorbild von ilovepdf.com, optimiert für Desktop & Mobile.
- 📄 **LV Analyzer** – Extrahiert Positionsblöcke, berechnet Relevanzscores und bietet einen Positions-Manager.
- 🧠 **Relevanz-Matching** – Keyword-basierte Scores gegen frei konfigurierbare Positionstypen.
- 🗂️ **Positions-Manager** – CRUD, JSON-Import/-Export via IndexedDB.
- 📊 **Kurzübersicht & Tabelle** – Kompakte Kennzahlen plus gefilterte Positionsliste.
- 🧾 **PDF-Report** – Einseitiger Export mit jsPDF direkt im Browser.
- 🛡️ **Offline by Design** – Keine Server-Kommunikation, optional als PWA nutzbar.

## Projektstruktur

```
.
├── index.html              # Landingpage "Dars Tools"
├── tools/
│   └── lv-analyzer.html    # Detailseite für den LV Analyzer
├── styles/
│   ├── landing.css         # Styling für die Landingpage
│   └── lv-analyzer.css     # Styling für den LV Analyzer
├── assets/                 # Logos, Favicons und Tool-Icons
└── src/                    # JavaScript-Module & Worker des LV Analyzer
```

## Entwicklung

Das Projekt benötigt kein Build-Tool. Ein beliebiger statischer Webserver genügt, da alle Bibliotheken (z. B. **pdf.js** oder
**jsPDF**) direkt über CDNs eingebunden werden. Für einen vollständig offlinefähigen Einsatz können die Dateien lokal gespiegelt
und in `src/workers/pdfWorker.js` bzw. `src/main.js` referenziert werden.

### Lokale Vorschau in 3 Schritten

1. Öffne ein Terminal im Projektordner (`Dars_Tools`).
2. Starte einen simplen Webserver, zum Beispiel:
   ```bash
   python -m http.server 5173
   ```
3. Rufe `http://localhost:5173` im Browser auf.

Nach dem Laden der Landingpage kannst du den **LV Analyzer** über seine Kachel öffnen und direkt PDFs analysieren.

## Quellcode-Verwaltung

Der Code liegt als lokales Git-Repository vor. Um ihn auf GitHub oder einen anderen Remote-Dienst zu übertragen, richte ein
Remote-Repository ein und push die vorhandene Historie:

```bash
# optional: neues Repository auf GitHub anlegen und dessen URL notieren
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```

Solange kein Remote gesetzt ist, verbleibt das Projekt ausschließlich auf deinem Rechner. Alle Funktionen der App laufen
vollständig lokal im Browser, es ist also keine Server-Infrastruktur erforderlich.

## Tests

Automatisierte Tests sind derzeit nicht enthalten. Die Kernlogik (Parsing, Matching, Persistenz) ist modular aufgebaut und kann
perspektivisch mit Unit- oder Integrationstests ergänzt werden.
