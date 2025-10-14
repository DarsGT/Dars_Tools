import { getAllPositions, savePosition, deletePosition, bulkImport } from './db.js';
import { setPositions, upsertPosition, removePosition, selectPosition, setAnalysis, getState } from './state.js';
import { initRender, renderPositions } from './render.js';
import { scorePositions, createOverview } from './analysis.js';

const worker = new Worker('./src/workers/pdfWorker.js');
let currentFile = null;

function generateId() {
  return `pos-${crypto.randomUUID()}`;
}

function resetForm() {
  const form = document.getElementById('positionForm');
  form.reset();
  document.getElementById('positionId').value = '';
  document.getElementById('positionActive').checked = true;
  selectPosition(null);
}

function fillForm(entry) {
  document.getElementById('positionId').value = entry.id;
  document.getElementById('positionName').value = entry.name || '';
  document.getElementById('positionSynonyms').value = entry.synonyms?.join(', ') || '';
  document.getElementById('positionDescription').value = entry.description || '';
  document.getElementById('positionUnit').value = entry.unit || '';
  document.getElementById('positionExclusions').value = entry.exclusions?.join(', ') || '';
  document.getElementById('positionActive').checked = entry.active !== false;
}

async function loadPositions() {
  const entries = await getAllPositions();
  if (!entries.length) {
    const defaults = [
      {
        id: generateId(),
        name: 'Betonarbeiten',
        synonyms: ['Stahlbeton', 'C25/30'],
        description: 'Allgemeine Beton- und Stahlbetonarbeiten',
        unit: 'm³',
        exclusions: ['Abbruch'],
        active: true,
      },
      {
        id: generateId(),
        name: 'Erdarbeiten',
        synonyms: ['Aushub', 'Baugrube'],
        description: 'Erdarbeiten gemäß DIN 18300',
        unit: 'm³',
        exclusions: ['Verfüllung'],
        active: true,
      },
    ];
    await Promise.all(defaults.map((entry) => savePosition(entry)));
    setPositions(defaults);
    return;
  }
  setPositions(entries);
}

function showToast(message) {
  const modal = document.getElementById('modal');
  const messageNode = document.getElementById('modalMessage');
  const titleNode = document.getElementById('modalTitle');
  titleNode.textContent = 'Hinweis';
  messageNode.textContent = message;
  if (modal.open) {
    modal.close();
  }
  modal.querySelector('form').onsubmit = () => {};
  modal.returnValue = '';
  modal.showModal();
  setTimeout(() => modal.close(), 2000);
}

function handleWorkerMessage(event) {
  const { type, payload, error } = event.data;
  switch (type) {
    case 'progress': {
      const progress = document.getElementById('analysisProgress');
      const label = document.getElementById('progressLabel');
      const bar = document.getElementById('progressBar');
      progress.hidden = false;
      label.textContent = `Analysiere Seite ${payload.current} von ${payload.total}`;
      const ratio = Math.min(1, payload.current / payload.total);
      bar.style.setProperty('--progress', ratio.toString());
      break;
    }
    case 'result': {
      const progress = document.getElementById('analysisProgress');
      progress.hidden = true;
      document.getElementById('progressBar').style.setProperty('--progress', '1');
      document.getElementById('progressLabel').textContent = 'Analyse abgeschlossen';
      const managerEntries = getState().positions;
      const scored = scorePositions(payload.positions, managerEntries);
      const overview = createOverview({
        fileName: payload.fileName,
        totalPages: payload.totalPages,
        durationMs: payload.durationMs,
        positions: scored,
      });
      setAnalysis({
        fileName: payload.fileName,
        totalPages: payload.totalPages,
        durationMs: payload.durationMs,
        positions: scored,
        overview,
        generatedAt: Date.now(),
      });
      break;
    }
    case 'error': {
      document.getElementById('analysisProgress').hidden = true;
      document.getElementById('progressBar').style.setProperty('--progress', '0');
      showToast(error || 'Fehler bei der Analyse.');
      break;
    }
    default:
      break;
  }
}

async function handleFile(file) {
  if (!file) return;
  if (file.type !== 'application/pdf') {
    showToast('Bitte eine PDF-Datei auswählen.');
    return;
  }
  currentFile = file;
  const arrayBuffer = await file.arrayBuffer();
  worker.postMessage({
    type: 'parse',
    payload: {
      buffer: arrayBuffer,
      fileName: file.name,
    },
  }, [arrayBuffer]);
  document.getElementById('analysisProgress').hidden = false;
  document.getElementById('progressBar').style.setProperty('--progress', '0');
  document.getElementById('progressLabel').textContent = 'Analyse gestartet...';
}

function setupFileHandlers() {
  const input = document.getElementById('pdfFile');
  input.addEventListener('change', (event) => {
    const [file] = event.target.files;
    handleFile(file);
  });

  const area = document.getElementById('uploadArea');
  ;['dragenter', 'dragover'].forEach((type) => {
    area.addEventListener(type, (event) => {
      event.preventDefault();
      area.classList.add('dragover');
    });
  });

  ;['dragleave', 'drop'].forEach((type) => {
    area.addEventListener(type, (event) => {
      event.preventDefault();
      area.classList.remove('dragover');
    });
  });

  area.addEventListener('drop', (event) => {
    const file = event.dataTransfer.files[0];
    handleFile(file);
  });
}

function setupManagerInteractions() {
  document.getElementById('newPosition').addEventListener('click', () => {
    resetForm();
    document.getElementById('positionName').focus();
  });

  document.getElementById('positionList').addEventListener('click', (event) => {
    const li = event.target.closest('li');
    if (!li) return;
    const { positions } = getState();
    const entry = positions.find((item) => item.id === li.dataset.id);
    if (!entry) return;
    fillForm(entry);
    selectPosition(entry.id);
  });

  document.getElementById('positionForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const idField = document.getElementById('positionId');
    const id = idField.value || generateId();
    const entry = {
      id,
      name: document.getElementById('positionName').value.trim(),
      synonyms: document.getElementById('positionSynonyms').value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      description: document.getElementById('positionDescription').value.trim(),
      unit: document.getElementById('positionUnit').value.trim(),
      exclusions: document.getElementById('positionExclusions').value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      active: document.getElementById('positionActive').checked,
    };

    await savePosition(entry);
    upsertPosition(entry);
    fillForm(entry);
    selectPosition(id);
    showToast('Position gespeichert');
    form.reset();
    fillForm(entry);
  });

  document.getElementById('resetForm').addEventListener('click', () => {
    resetForm();
  });

  document.getElementById('deletePosition').addEventListener('click', () => {
    const id = document.getElementById('positionId').value;
    if (!id) {
      showToast('Keine Position ausgewählt.');
      return;
    }
    const modal = document.getElementById('modal');
    document.getElementById('modalTitle').textContent = 'Position löschen?';
    document.getElementById('modalMessage').textContent = 'Dieser Schritt kann nicht rückgängig gemacht werden.';
    const confirmButton = document.getElementById('modalConfirm');
    const onSubmit = async (event) => {
      event.preventDefault();
      await deletePosition(id);
      removePosition(id);
      resetForm();
      modal.close('confirm');
      modal.querySelector('form').removeEventListener('submit', onSubmit);
      showToast('Position gelöscht');
    };
    modal.querySelector('form').addEventListener('submit', onSubmit, { once: true });
    modal.showModal();
  });
}

function setupFilters() {
  const minScore = document.getElementById('minScore');
  const showAll = document.getElementById('showAll');

  const update = () => {
    const { analysis } = getState();
    const filtered = analysis.positions.filter((pos) => showAll.checked || pos.relevance >= Number(minScore.value || '0'));
    renderPositions(filtered);
  };

  minScore.addEventListener('input', update);
  showAll.addEventListener('change', update);
  update();
}

function setupExportButtons() {
  document.getElementById('exportJson').addEventListener('click', () => {
    const data = JSON.stringify(getState().positions, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'positions-manager.json';
    anchor.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('importJson').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      const entries = JSON.parse(text);
      if (!Array.isArray(entries)) {
        showToast('Ungültiges JSON-Format.');
        return;
      }
      const normalized = entries.map((entry) => ({
        id: entry.id || generateId(),
        name: entry.name || 'Unbenannt',
        synonyms: Array.isArray(entry.synonyms)
          ? entry.synonyms
          : String(entry.synonyms || '')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
        description: entry.description || '',
        unit: entry.unit || '',
        exclusions: Array.isArray(entry.exclusions)
          ? entry.exclusions
          : String(entry.exclusions || '')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
        active: entry.active !== false,
      }));
      await bulkImport(normalized);
      setPositions(normalized);
      showToast(`${normalized.length} Positionen importiert`);
    } catch (error) {
      console.error(error);
      showToast('Import fehlgeschlagen.');
    } finally {
      event.target.value = '';
    }
  });

  document.getElementById('exportPdf').addEventListener('click', async () => {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const { analysis } = getState();
    const margin = 48;
    doc.setFontSize(18);
    doc.setTextColor('#003382');
    doc.text('Ausschreibungs-Analyzer Alpha', margin, 64);

    doc.setFontSize(12);
    doc.setTextColor('#333333');
    doc.text(`Datei: ${analysis.fileName || '-'}`, margin, 90);
    doc.text(`Seiten: ${analysis.totalPages}`, margin, 110);
    doc.text(`Analysezeit: ${(Math.round(analysis.durationMs / 100) / 10).toLocaleString('de-DE')} s`, margin, 130);

    let y = 160;
    doc.setFont(undefined, 'bold');
    doc.text('Kurzübersicht', margin, y);
    doc.setFont(undefined, 'normal');
    y += 20;
    (analysis.overview || []).forEach((line) => {
      doc.text(`• ${line}`, margin, y);
      y += 16;
    });

    y += 10;
    doc.setFont(undefined, 'bold');
    doc.text('Relevante Positionen', margin, y);
    doc.setFont(undefined, 'normal');
    y += 20;

    analysis.positions
      .filter((pos) => pos.relevance >= 30)
      .slice(0, 10)
      .forEach((pos) => {
        const text = `${pos.positionNumber || '-'} ${pos.shortText} (${pos.unit || '-'} ${pos.quantity || '-'}) – Score: ${pos.relevance}`;
        doc.text(text, margin, y, { maxWidth: 500 });
        y += 18;
      });

    doc.save('ausschreibungs-analyzer-report.pdf');
  });
}

function setupWorker() {
  worker.addEventListener('message', handleWorkerMessage);
}

async function init() {
  initRender();
  setupWorker();
  setupFileHandlers();
  setupManagerInteractions();
  setupFilters();
  setupExportButtons();
  await loadPositions();
}

init();
