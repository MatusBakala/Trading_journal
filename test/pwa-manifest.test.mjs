import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));

/* Appka sa musí otvárať v prehliadači, nie na celú obrazovku. V samostatnom režime iOS
   otvorí prihlásenie do Googlu v oddelenom kontexte, ktorý nevie vrátiť token späť, takže
   Drive sync z plochy vždy zlyhá - a samostatný režim má navyše vlastné úložisko oddelené
   od Safari, čiže by vznikla druhá, nesynchronizovaná kópia dát. */

test('manifest neprepína appku do samostatného režimu (rozbil by Drive sync na iOS)', () => {
  assert.notEqual(manifest.display, 'standalone');
  assert.notEqual(manifest.display, 'fullscreen');
});

test('index.html neobsahuje apple-mobile-web-app-capable', () => {
  // Na iOS o samostatnom režime rozhoduje tento meta tag, nie "display" v manifeste -
  // keby sa vrátil, sync z plochy by prestal fungovať aj pri display:"browser".
  // Komentáre sa vynechávajú: práve v jednom je tento názov spomenutý ako vysvetlenie.
  // A assert.ok (nie doesNotMatch) preto, aby sa pri páde nevypisovalo celé index.html.
  const withoutComments = html.replace(/<!--[\s\S]*?-->/g, '');
  const capableMeta = /<meta[^>]+name=["'](?:apple-)?mobile-web-app-capable["']/i;
  assert.ok(
    !capableMeta.test(withoutComments),
    'index.html má meta tag *mobile-web-app-capable - appka sa bude z plochy otvárať na celú obrazovku a Drive sync tam zlyhá'
  );
});

test('ikony z manifestu naozaj existujú v repozitári', () => {
  assert.ok(manifest.icons && manifest.icons.length, 'manifest nemá žiadne ikony');
  for (const icon of manifest.icons) {
    assert.ok(fs.existsSync(path.join(root, icon.src)), 'chýba súbor ikony: ' + icon.src);
  }
  for (const m of html.matchAll(/<link[^>]+href=["'](icons\/[^"']+)["']/g)) {
    assert.ok(fs.existsSync(path.join(root, m[1])), 'chýba súbor ikony: ' + m[1]);
  }
});

test('manifest je nalinkovaný z index.html', () => {
  assert.match(html, /<link[^>]+rel=["']manifest["'][^>]+href=["']manifest\.webmanifest["']/);
});
