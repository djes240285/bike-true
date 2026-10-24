import fs from 'node:fs';
import path from 'node:path';

export function parseEnvFile(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const raw = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
    const eq = raw.indexOf('=');
    if (eq <= 0) continue;
    const key = raw.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = raw.slice(eq + 1).trim();
    const quoted =
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")));
    if (quoted) value = value.slice(1, -1);
    out[key] = value;
  }
  return out;
}

export function readFileEnv(cwd: string, mode: string): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const name of ['.env', '.env.local', `.env.${mode}`, `.env.${mode}.local`]) {
    const full = path.join(cwd, name);
    if (!fs.existsSync(full)) continue;
    Object.assign(merged, parseEnvFile(fs.readFileSync(full, 'utf8')));
  }
  return merged;
}

export function envForRequest(
  mode: string,
  cwd: string,
  processEnv: Record<string, string | undefined>,
): Record<string, string | undefined> {
  return { ...processEnv, ...readFileEnv(cwd, mode) };
}
