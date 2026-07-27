import fs from 'fs';
import path from 'path';

const HISTORY_FILE = path.resolve('.mirror-history.json');
const MAX_ENTRIES = 15;

export function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch {
    /* ignore parse errors */
  }
  return [];
}

export function saveHistoryEntry(entry) {
  try {
    const history = loadHistory();
    const newEntry = {
      timestamp: new Date().toISOString(),
      url: entry.url,
      outPath: entry.outPath,
      pagesCount: entry.pagesCount,
      assetsCount: entry.assetsCount,
      durationMs: entry.durationMs,
      zipPath: entry.zipPath || null
    };

    // Filter out duplicates of same URL
    const updated = [newEntry, ...history.filter(h => h.url !== entry.url)].slice(0, MAX_ENTRIES);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  } catch {
    /* ignore write errors */
  }
}

export function clearHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      fs.unlinkSync(HISTORY_FILE);
    }
  } catch {
    /* ignore */
  }
}
