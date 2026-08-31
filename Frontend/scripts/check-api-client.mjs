#!/usr/bin/env node
/**
 * Guards the single-API-client invariant.
 *
 * A codemod once rewrote the raw `fetch` calls *inside* useApi.ts onto
 * `apiFetch`, making apiFetch call itself — every request in the dashboard blew
 * the stack. It type-checked and built cleanly. This catches that shape, plus
 * app code that bypasses the client and therefore sends no bearer token.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = new URL('../src', import.meta.url).pathname;
const CLIENT = join(SRC, 'hooks/useApi.ts');

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

const problems = [];

// 1. apiFetch must never call itself.
const client = readFileSync(CLIENT, 'utf8');
const decl = client.indexOf('export async function apiFetch');
if (decl === -1) {
  problems.push('hooks/useApi.ts: apiFetch is gone — the whole dashboard depends on it');
} else {
  // Start after the signature's opening brace so the declaration itself does
  // not count as a call.
  const open = client.indexOf('{', client.indexOf(')', decl));
  const end = client.indexOf('\n}', open);
  const body = client.slice(open, end);
  if (/\bapiFetch\s*\(/.test(body)) {
    problems.push(`${relative(SRC, CLIENT)}: apiFetch calls itself — infinite recursion`);
  }
}

// 2. App code must call our own API through apiFetch (which attaches the bearer
//    token) and third-party APIs through plain fetch (which must NOT).
for (const file of walk(SRC)) {
  if (file === CLIENT) continue;
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');

  lines.forEach((line, i) => {
    // The URL may sit on this line or the next (multi-line call).
    const target = line + '\n' + (lines[i + 1] ?? '');

    const isRawFetch = /(?<![.\w])fetch\s*\(/.test(line) && !/apiFetch\s*\(/.test(line);
    const isApiFetch = /(?<![.\w])apiFetch\s*\(/.test(line);
    const hasExternalUrl = /['"`]https?:\/\//.test(target);

    if (isRawFetch && !hasExternalUrl) {
      problems.push(
        `${relative(SRC, file)}:${i + 1}: raw fetch() to our own API — use apiFetch from @/hooks/useApi`);
    }
    if (isApiFetch && hasExternalUrl) {
      problems.push(
        `${relative(SRC, file)}:${i + 1}: apiFetch() to a third-party URL — it would leak the access token; use plain fetch()`);
    }
  });
}

if (problems.length) {
  console.error('API client check failed:\n' + problems.map(p => '  ' + p).join('\n'));
  process.exit(1);
}
console.log('API client check passed.');
