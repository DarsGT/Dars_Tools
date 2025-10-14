function tokenize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function countMatches(tokens, keywords) {
  const target = new Set(tokens);
  let matches = 0;
  const matched = [];
  keywords.forEach((kw) => {
    if (target.has(kw)) {
      matches += 1;
      matched.push(kw);
    }
  });
  return { matches, matched };
}

export function scorePositions(entries, managerEntries) {
  const activeEntries = managerEntries.filter((entry) => entry.active !== false);
  const results = entries.map((position) => {
    const textTokens = tokenize(`${position.shortText} ${position.longText}`);
    let best = null;

    activeEntries.forEach((manager) => {
      const keywords = tokenize(`${manager.name} ${(manager.synonyms || []).join(' ')}`);
      if (!keywords.length) return;
      const exclusions = tokenize((manager.exclusions || []).join(' '));
      const hasExclusion = exclusions.some((term) => textTokens.includes(term));
      if (hasExclusion) return;
      const { matches, matched } = countMatches(textTokens, keywords);
      if (!matches) return;
      const score = Math.round((matches / keywords.length) * 100);
      if (!best || score > best.score) {
        best = {
          score,
          managerId: manager.id,
          managerName: manager.name,
          matchedKeywords: matched,
        };
      }
    });

    return {
      ...position,
      relevance: best?.score ?? 0,
      matchedManagerId: best?.managerId ?? null,
      matchedManagerName: best?.managerName ?? null,
      matchedKeywords: best?.matchedKeywords ?? [],
    };
  });

  return results;
}

export function createOverview({
  fileName,
  totalPages,
  durationMs,
  positions,
}) {
  const totalPositions = positions.length;
  const relevantPositions = positions.filter((p) => p.relevance >= 30);
  const units = positions.reduce((acc, pos) => {
    if (!pos.unit) return acc;
    const key = pos.unit;
    const value = Number(pos.quantity) || 0;
    acc[key] = (acc[key] || 0) + value;
    return acc;
  }, {});

  const unitLines = Object.entries(units)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([unit, quantity]) => `${unit}: ${quantity.toLocaleString('de-DE', { maximumFractionDigits: 2 })}`);

  const topPositions = [...relevantPositions]
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 3)
    .map((pos) => `${pos.positionNumber} – ${pos.shortText}`);

  const durationSeconds = Math.round(durationMs / 100) / 10;
  const overview = [
    `Datei: ${fileName || 'Unbenannt'}`,
    `Analysezeit: ${durationSeconds.toLocaleString('de-DE', { minimumFractionDigits: 1 })} Sekunden`,
    `Seiten: ${totalPages}`,
    `Gefundene Positionen: ${totalPositions}`,
    `Relevante Positionen (Score ≥ 30): ${relevantPositions.length}`,
    `Durchschnittsscore Top-Positionen: ${relevantPositions.length ? Math.round(relevantPositions.reduce((acc, pos) => acc + pos.relevance, 0) / relevantPositions.length) : 0}`,
  ];

  if (unitLines.length) {
    overview.push(`Mengenschwerpunkte: ${unitLines.join(', ')}`);
  }

  if (topPositions.length) {
    overview.push(`Top-Treffer: ${topPositions.join(' | ')}`);
  }

  const managerCoverage = new Map();
  positions.forEach((pos) => {
    if (!pos.matchedManagerId) return;
    const key = pos.matchedManagerName || pos.matchedManagerId;
    managerCoverage.set(key, (managerCoverage.get(key) || 0) + 1);
  });

  if (managerCoverage.size) {
    const coverageLines = [...managerCoverage.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, count]) => `${id}: ${count} Treffer`);
    overview.push(`Abgedeckte Positionstypen: ${coverageLines.join(', ')}`);
  }

  if (relevantPositions.length) {
    const avgQuantity = relevantPositions.reduce((acc, pos) => acc + (Number(pos.quantity) || 0), 0) / relevantPositions.length;
    overview.push(`Ø Menge relevanter Positionen: ${avgQuantity.toLocaleString('de-DE', { maximumFractionDigits: 2 })}`);
  }

  overview.push(`Analysezeitpunkt: ${new Date().toLocaleString('de-DE')}`);

  return overview.slice(0, 12);
}
