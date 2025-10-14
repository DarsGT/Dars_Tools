/* eslint-disable no-restricted-globals */
self.importScripts('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');

const { pdfjsLib } = self;
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

function cleanText(str) {
  return str.replace(/\s+/g, ' ').trim();
}

function normalizeQuantity(value) {
  const cleaned = value.replace(/\./g, '').replace(/,/g, '.');
  const numeric = Number.parseFloat(cleaned);
  return Number.isNaN(numeric) ? value : numeric;
}

function extractPositions(lines, pageNumber) {
  const results = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const match = line.match(/^(\d{1,4}(?:\.\d{1,4})*)\s+(.+?)\s+(\d+[\d.,]*)\s+([A-Za-zÄÖÜäöüß²³%\/]+)(.*)$/u);
    if (match) {
      const [, positionNumber, shortTextPart, quantityRaw, unitRaw, rest] = match;
      let longText = rest ? cleanText(rest) : '';
      let j = i + 1;
      while (j < lines.length && !/^\d{1,4}(?:\.\d{1,4})*/.test(lines[j])) {
        longText += ` ${cleanText(lines[j])}`;
        j += 1;
      }
      i = j - 1;
      results.push({
        positionNumber,
        shortText: cleanText(shortTextPart),
        quantity: normalizeQuantity(quantityRaw),
        unit: cleanText(unitRaw),
        longText: longText.trim(),
        pageNumber,
      });
    }
  }
  return results;
}

self.onmessage = async (event) => {
  const { type, payload } = event.data;
  if (type !== 'parse') return;
  const { buffer, fileName } = payload;
  try {
    const start = performance.now();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const totalPages = pdf.numPages;
    const positions = [];

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      self.postMessage({ type: 'progress', payload: { current: pageNumber, total: totalPages } });
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const items = textContent.items.map((item) => item.str);
      const pageText = items.join('\n');
      const lines = pageText.split(/\n+/).map(cleanText).filter(Boolean);
      const extracted = extractPositions(lines, pageNumber);
      extracted.forEach((pos) => positions.push(pos));
    }

    const durationMs = performance.now() - start;
    self.postMessage({
      type: 'result',
      payload: {
        positions,
        fileName,
        totalPages,
        durationMs,
      },
    });
  } catch (error) {
    console.error(error);
    self.postMessage({ type: 'error', error: error.message });
  }
};
