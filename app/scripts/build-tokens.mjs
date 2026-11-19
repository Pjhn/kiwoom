// tokens/*.json (Figma 변수 내보내기) -> src/styles/tokens.css
import { readFileSync, writeFileSync } from 'node:fs';

const read = (f) => JSON.parse(readFileSync(new URL(`../tokens/${f}`, import.meta.url)));
const prim = read('tokens_primitive.json').Primitive;
const sem = read('tokens_semantic.json').Semantic;
const typo = read('tokens_typography.json').Typography;

const lines = [];
const flat = (obj, path, out) => {
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && '$value' in v) out.push([[...path, k], v]);
    else if (v && typeof v === 'object') flat(v, [...path, k], out);
  }
  return out;
};
const primList = flat(prim, [], []);
const resolve = (val) =>
  typeof val === 'string' ? val.replace(/\{([^}]+)\}/g, (_, ref) => `var(--${ref.replace(/\./g, '-')})`) : val;

lines.push('/* 자동 생성: npm run tokens. 직접 수정하지 말 것 */', ':root {');
for (const [p, v] of primList) {
  const val = v.$type === 'number' ? `${v.$value}px` : v.$value;
  lines.push(`  --${p.join('-')}: ${val};`);
}
for (const [p, v] of flat(sem, [], [])) lines.push(`  --${p.join('-')}: ${resolve(v.$value)};`);
lines.push('}', '');
for (const [p, v] of flat(typo, [], [])) {
  const t = v.$value;
  const ls = String(t.letterSpacing).endsWith('%') ? `${parseFloat(t.letterSpacing) / 100}em` : t.letterSpacing;
  lines.push(
    `.t-${p.join('-')} { font-family: ${t.fontFamily}, system-ui, sans-serif; font-size: ${t.fontSize}; font-weight: ${t.fontWeight}; line-height: ${t.lineHeight}; letter-spacing: ${ls}; }`,
  );
}
writeFileSync(new URL('../src/styles/tokens.css', import.meta.url), lines.join('\n') + '\n');
console.log('tokens.css written');
