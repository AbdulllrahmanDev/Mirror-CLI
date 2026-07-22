import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { downloadAssets } from './src/downloader.js';

async function test() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('https://adoxstudio.webflow.io/', { waitUntil: 'domcontentloaded' });
  const html = await page.content();
  await browser.close();

  const outDir = path.resolve('test-output');
  fs.mkdirSync(outDir, { recursive: true });

  console.log('Starting downloadAssets...');
  const map = await downloadAssets(html, 'https://adoxstudio.webflow.io/', outDir, { verbose: true });
  console.log('Downloaded Assets Map Size:', map.size);
  for (const [url, relPath] of map.entries()) {
    console.log(`URL: ${url} -> ${relPath}`);
  }
}

test().catch(console.error);
