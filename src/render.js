import { subscribe } from './state.js';

function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '';
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return value;
  return parsed.toLocaleString('de-DE', { maximumFractionDigits: 2 });
}

function renderOverview(list) {
  const container = document.getElementById('overviewList');
  container.innerHTML = '';
  list.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    container.appendChild(li);
  });
}

export function renderPositions(positions) {
  const tbody = document.getElementById('resultsBody');
  tbody.innerHTML = '';
  positions.forEach((pos) => {
    const row = document.createElement('tr');

    const positionCell = document.createElement('td');
    positionCell.textContent = pos.positionNumber || '';
    row.appendChild(positionCell);

    const textCell = document.createElement('td');
    const strong = document.createElement('strong');
    strong.textContent = pos.shortText || '';
    textCell.appendChild(strong);

    if (pos.matchedManagerName) {
      const tag = document.createElement('div');
      tag.className = 'tag';
      tag.textContent = pos.matchedManagerName;
      textCell.appendChild(tag);
    }

    if (pos.matchedKeywords?.length) {
      const keywords = document.createElement('div');
      keywords.className = 'keywords';
      keywords.textContent = pos.matchedKeywords.join(', ');
      textCell.appendChild(keywords);
    }
    row.appendChild(textCell);

    const unitCell = document.createElement('td');
    unitCell.textContent = pos.unit || '';
    row.appendChild(unitCell);

    const quantityCell = document.createElement('td');
    quantityCell.textContent = formatNumber(pos.quantity);
    row.appendChild(quantityCell);

    const longTextCell = document.createElement('td');
    longTextCell.textContent = pos.longText || '';
    row.appendChild(longTextCell);

    const pageCell = document.createElement('td');
    pageCell.textContent = pos.pageNumber ?? '';
    row.appendChild(pageCell);

    const scoreCell = document.createElement('td');
    const scoreBadge = document.createElement('span');
    scoreBadge.className = 'score';
    scoreBadge.dataset.score = `${pos.relevance}`;
    scoreBadge.textContent = `${pos.relevance}`;
    scoreCell.appendChild(scoreBadge);
    row.appendChild(scoreCell);

    tbody.appendChild(row);
  });
}

function renderManager({ positions, selectedPositionId }) {
  const list = document.getElementById('positionList');
  list.innerHTML = '';
  const template = document.createDocumentFragment();

  const sorted = [...positions].sort((a, b) => a.name.localeCompare(b.name, 'de'));

  sorted.forEach((entry) => {
    const li = document.createElement('li');
    li.dataset.id = entry.id;
    li.classList.toggle('active', entry.id === selectedPositionId);

    const title = document.createElement('strong');
    title.textContent = entry.name;
    li.appendChild(title);

    if (entry.synonyms?.length) {
      const synonyms = document.createElement('span');
      synonyms.className = 'synonyms';
      synonyms.textContent = `Synonyme: ${entry.synonyms.join(', ')}`;
      li.appendChild(synonyms);
    }

    const status = document.createElement('span');
    status.className = 'status';
    status.textContent = entry.active !== false ? 'Aktiv' : 'Inaktiv';
    li.appendChild(status);

    template.appendChild(li);
  });

  list.appendChild(template);
}

export function initRender() {
  subscribe('overview', ({ analysis }) => {
    renderOverview(analysis.overview || []);
  });

  subscribe('analysis', ({ analysis }) => {
    const minScore = Number(document.getElementById('minScore').value || '0');
    const showAll = document.getElementById('showAll').checked;
    const filtered = analysis.positions.filter((pos) => showAll || pos.relevance >= minScore);
    renderPositions(filtered);
  });

  subscribe('manager', (snapshot) => {
    renderManager(snapshot);
  });
}
