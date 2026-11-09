// Bundles the game into a single self-contained HTML file.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const res = await build({ entryPoints: ['src/main.ts'], bundle: true, minify: true, write: false, format: 'iife', target: 'es2020', legalComments: 'none' });
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync('src/styles.css', 'utf8');
const fonts = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Almendra:wght@400;700&family=Almendra+SC&family=Alegreya+Sans:wght@400;500;700;800&family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC&family=Grenze+Gotisch:wght@500;700&family=Spectral:wght@400;600;700&family=Alegreya:ital,wght@0,400;0,600;1,400&display=swap">';
const bodyHtml = `<div id="app"></div>\n<script>${js}</script>`;

// Artifact page (the host adds the doctype/head skeleton).
const artifact = `<title>Lasting Empires</title>\n${fonts}\n<style>${css}</style>\n${bodyHtml}\n`;
// Standalone page for local play or GitHub Pages.
const standalone = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="theme-color" content="#0f171b"><meta name="apple-mobile-web-app-capable" content="yes"><title>Lasting Empires</title>${fonts}<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);box-sizing:border-box}[hidden]{display:none!important}${css}</style></head><body>${bodyHtml}</body></html>\n`;
mkdirSync('dist', { recursive: true });
writeFileSync('dist/lasting-empires.html', artifact);
writeFileSync('dist/index.html', standalone);
writeFileSync('index.html', standalone); // served by GitHub Pages from the repo root
console.log('built', (artifact.length / 1024).toFixed(0) + ' KB');
