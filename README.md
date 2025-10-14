# Ausschreibungs-Analyzer Alpha

Ein rein clientseitiges Frontend zur Analyse textbasierter PDF-Ausschreibungen. Die Anwendung extrahiert Positionsblöcke mit Hilfe von [pdf.js](https://mozilla.github.io/pdf.js/), gleicht sie mit einem lokal gespeicherten Positions-Manager ab und erzeugt eine Kurzübersicht inklusive Relevanzbewertung.

## Features

- 📄 **PDF Parsing im Browser** – Verarbeitung in einem Web Worker, um die UI responsiv zu halten.
- 🧠 **Relevanz-Matching** – Keyword-basierte Scores gegen frei konfigurierbare Positionstypen.
- 🗂️ **Positions-Manager** – CRUD, JSON-Import/-Export via IndexedDB.
- 📊 **Kurzübersicht & Tabelle** – kompakte Kennzahlen plus gefilterte Positionsliste.
- 🧾 **PDF-Report** – Einseitiger Export mit jsPDF direkt im Browser.
- 🛡️ **Offline by Design** – Keine Server-Kommunikation, optional als PWA nutzbar.

## Entwicklung

Da das Projekt ohne Build-Tool funktioniert, genügt ein statischer Webserver. Die Bibliotheken **pdf.js** und **jsPDF** werden zur Vereinfachung über CDNs eingebunden; für einen vollständig offlinefähigen Einsatz können die Dateien lokal gespiegelt und in `src/workers/pdfWorker.js` bzw. `src/main.js` referenziert werden.

```bash
# Beispiel mit Python
python -m http.server 5173
```

Danach im Browser `http://localhost:5173` öffnen.

## Quellcode-Verwaltung

Der Code liegt in diesem Verzeichnis als lokales Git-Repository. Um ihn auf GitHub oder einen anderen Remote-Dienst zu übertragen, richte einfach ein Remote-Repository ein und push die vorhandene Historie:

```bash
# optional: neues Repository auf GitHub anlegen und dessen URL notieren
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```

Solange kein Remote gesetzt ist, verbleibt das Projekt ausschließlich auf deinem Rechner. Alle Funktionen der App laufen vollständig lokal im Browser, es ist also keine Server-Infrastruktur erforderlich.

## Tests

Automatisierte Tests sind aktuell nicht enthalten. Die Kernlogik (Parsing, Matching, Persistenz) ist modular aufgebaut und kann perspektivisch mit Unit- oder Integrationstests ergänzt werden.
