#!/usr/bin/env node
// Übernimmt die SDKs in fester Version aus node_modules nach app/vendor/, damit die App zur Laufzeit
// keinen Code von fremden, wechselnden Adressen lädt. Aufruf nach `npm install`: npm run vendor

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nm = join(root, 'node_modules');
const ziel = join(root, 'app', 'vendor');
mkdirSync(ziel, { recursive: true });

const version = (paket) => JSON.parse(readFileSync(join(nm, paket, 'package.json'), 'utf8')).version;

// Azure Speech SDK: fertiges Browser-Bundle (legt window.SpeechSDK an)
const azure = join(nm, 'microsoft-cognitiveservices-speech-sdk');
copyFileSync(join(azure, 'distrib/browser/microsoft.cognitiveservices.speech.sdk.bundle-min.js'), join(ziel, 'speech-sdk.min.js'));
copyFileSync(join(azure, 'distrib/browser/speech-processor.js'), join(ziel, 'speech-processor.js'));
copyFileSync(join(azure, 'LICENSE'), join(ziel, 'LICENSE-speech-sdk.txt'));

// Anthropic TypeScript SDK: als ein ES-Modul für den Browser gebündelt
const anthropic = join(nm, '@anthropic-ai/sdk');
await build({
  stdin: { contents: "export { default } from '@anthropic-ai/sdk';", resolveDir: root },
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  outfile: join(ziel, 'anthropic-sdk.mjs'),
  logLevel: 'warning',
});
copyFileSync(join(anthropic, 'LICENSE'), join(ziel, 'LICENSE-anthropic-sdk.txt'));

const versionen = {
  'microsoft-cognitiveservices-speech-sdk': version('microsoft-cognitiveservices-speech-sdk'),
  '@anthropic-ai/sdk': version('@anthropic-ai/sdk'),
};
writeFileSync(join(ziel, 'versionen.json'), JSON.stringify(versionen, null, 2) + '\n');
console.log('Vendor fertig:', versionen);
