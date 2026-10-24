import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';

const source = await readFile(new URL('../brand/logos/biketrue-mark.svg', import.meta.url), 'utf8');
const inner = source.replace(/<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<rect[^>]*\/>/, '');
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#fffdf8"/><g transform="translate(51.2 51.2) scale(0.8)">${inner}</g></svg>`;

function png(svg: string, size: number) {
  return new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
}

const out = new URL('../public/icons/', import.meta.url);
await mkdir(out, { recursive: true });

const files: Array<[string, string, number]> = [
  ['icon-192.png', source, 192],
  ['icon-512.png', source, 512],
  ['maskable-192.png', maskable, 192],
  ['maskable-512.png', maskable, 512],
  ['apple-touch-icon.png', source, 180],
];

for (const [name, svg, size] of files) {
  await writeFile(new URL(name, out), png(svg, size));
}
