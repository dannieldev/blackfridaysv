import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SnapshotItem } from './catalog.js';

export const dataDirectory = fileURLToPath(new URL('../../../../apps/web/public/data/', import.meta.url));
export const snapshotPath = path.join(dataDirectory, 'deals-snapshot.json');

export function readSnapshot(file = snapshotPath): SnapshotItem[] {
  if (!fs.existsSync(file)) return [];
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(data)) throw new Error('El snapshot existente no es válido; no se sobrescribirá.');
  if (data.some(item => !item || typeof item.id !== 'string' || !item.id
    || typeof item.title !== 'string' || !item.title || typeof item.store !== 'string'
    || !Number.isFinite(item.currentPrice) || item.currentPrice <= 0
    || !Number.isFinite(Date.parse(item.updatedAt)))) {
    throw new Error('El snapshot contiene registros incompletos; no se sobrescribirá.');
  }
  return data;
}

export function writeJsonAtomic(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', 'utf8');
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

export function writeSnapshot(items: SnapshotItem[], file = snapshotPath): void {
  if (!items.length) throw new Error('No se publicará un catálogo vacío.');
  writeJsonAtomic(file, items);
}
