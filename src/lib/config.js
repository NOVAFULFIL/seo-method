import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

/** Charge config/project.json (ou le chemin passé via --config). */
export function loadConfig() {
  const i = process.argv.indexOf('--config');
  const file = i > -1 ? path.resolve(process.argv[i + 1]) : path.join(ROOT, 'config/project.json');
  if (!fs.existsSync(file)) {
    console.error(`Config introuvable : ${file}\nCopie config/project.example.json vers config/project.json et remplis-le.`);
    process.exit(1);
  }
  const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
  cfg.site = cfg.site.replace(/\/$/, '');
  cfg.competitors = (cfg.competitors || []).map((c) => c.replace(/\/$/, ''));
  return cfg;
}

export function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}

export function reportDir(url) {
  const dir = path.join(ROOT, 'reports', new URL(url).hostname.replace(/^www\./, ''));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function writeJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export function toCSV(rows) {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const esc = (v) => {
    const s = Array.isArray(v) ? v.join(' | ') : String(v ?? '');
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}
