const subscribers = new Map();

const state = {
  positions: [],
  selectedPositionId: null,
  analysis: {
    fileName: null,
    totalPages: 0,
    durationMs: 0,
    positions: [],
    overview: [],
    generatedAt: null,
  },
};

export function getState() {
  if (typeof structuredClone === 'function') {
    return structuredClone(state);
  }
  return JSON.parse(JSON.stringify(state));
}

export function subscribe(key, callback) {
  if (!subscribers.has(key)) {
    subscribers.set(key, new Set());
  }
  subscribers.get(key).add(callback);
  callback(getState());
  return () => {
    subscribers.get(key)?.delete(callback);
  };
}

function notify() {
  const snapshot = getState();
  subscribers.forEach((listeners) => {
    listeners.forEach((listener) => listener(snapshot));
  });
}

export function setPositions(entries) {
  state.positions = [...entries];
  if (state.selectedPositionId && !state.positions.find((p) => p.id === state.selectedPositionId)) {
    state.selectedPositionId = null;
  }
  notify();
}

export function upsertPosition(entry) {
  const index = state.positions.findIndex((item) => item.id === entry.id);
  if (index >= 0) {
    state.positions[index] = { ...state.positions[index], ...entry };
  } else {
    state.positions.push(entry);
  }
  notify();
}

export function removePosition(id) {
  state.positions = state.positions.filter((item) => item.id !== id);
  if (state.selectedPositionId === id) {
    state.selectedPositionId = null;
  }
  notify();
}

export function selectPosition(id) {
  state.selectedPositionId = id;
  notify();
}

export function setAnalysis(result) {
  state.analysis = { ...state.analysis, ...result };
  notify();
}
