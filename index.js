#!/usr/bin/env node

import { crawlSite } from './src/crawler.js';
import { downloadAssets } from './src/downloader.js';
import { rewriteHTML } from './src/rewriter.js';
import { packSite } from './src/packager.js';
import fs from 'fs';
import path from 'path';
import cliProgress from 'cli-progress';

const args = process.argv.slice(2);

function showHelp() {
  console.log(`
╔══════════════════════════════════════════╗
║         Site Downloader v1.0            ║
║  Download any website by URL — free     ║
╚══════════════════════════════════════════╝

Usage:
  node index.js <url> [options]

Options:
  -o, --output <dir>    Output directory (default: domain name)
  -d, --depth <num>     Max crawl depth (default: 3)
  --no-zip              Skip ZIP packaging
  --verbose             Show detailed logs

Examples:
  node index.js https://example.com
  node index.js https://example.com -o my-site -d 5 --no-zip
`);
  process.exit(0);
}

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  showHelp();
}

const url = args[0];
const outputDir = extractArg(args, '-o') || extractArg(args, '--output');
const maxDepth = parseInt(extractArg(args, '-d') || extractArg(args, '--depth') || '3', 10);
const skipZip = args.includes('--no-zip');
const verbose = args.includes('--verbose');

function extractArg(args, flag) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return null;
}

async function main() {
  try {
    const domain = new URL(url).hostname;
    const outPath = path.resolve(outputDir || domain);
    const assetsDir = path.join(outPath, 'assets');
    const pagesDir = path.join(outPath, 'pages');

    console.log(`\n  Site Downloader`);
    console.log(`  ${'='.repeat(40)}`);
    console.log(`  URL:      ${url}`);
    console.log(`  Output:   ${outPath}`);
    console.log(`  Max depth: ${maxDepth}`);
    console.log(`  ${'='.repeat(40)}\n`);

    fs.mkdirSync(assetsDir, { recursive: true });
    fs.mkdirSync(pagesDir, { recursive: true });

    const bar = new cliProgress.SingleBar({
      format: '  Progress |{bar}| {percentage}% | {value}/{total} | {status}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    console.log('  [1/4] Crawling pages...\n');
    const pages = await crawlSite(url, { maxDepth, verbose });
    console.log(`  Found ${pages.length} page(s)\n`);

    console.log('  [2/4] Downloading assets...\n');
    bar.start(pages.length, 0, { status: 'Processing...' });
    const allAssets = new Map();
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      bar.update(i, { status: path.basename(page.url) || 'index' });
      const assets = await downloadAssets(page.html, url, assetsDir, verbose);
      for (const [k, v] of assets) allAssets.set(k, v);
      pages[i] = { ...page, assets };
    }
    bar.update(pages.length, { status: 'Done' });
    bar.stop();
    console.log(`  Assets downloaded: ${allAssets.size}\n`);

    console.log('  [3/4] Rewriting HTML...\n');
    for (const page of pages) {
      const rerwitten = rewriteHTML(page.html, page.url, url, allAssets);
      const pagePath = path.join(pagesDir, page.filename);
      fs.mkdirSync(path.dirname(pagePath), { recursive: true });
      fs.writeFileSync(pagePath, rerwitten, 'utf-8');
    }

    const indexPath = path.join(outPath, 'index.html');
    if (!fs.existsSync(indexPath) && fs.existsSync(path.join(pagesDir, 'index.html'))) {
      fs.copyFileSync(path.join(pagesDir, 'index.html'), indexPath);
    }
    console.log('  Pages saved:', pages.length);

    if (!skipZip) {
      console.log('\n  [4/4] Packaging ZIP...');
      const zipPath = await packSite(outPath, domain);
      console.log(`  ZIP: ${zipPath}`);
    }

    console.log(`\n  Done! Output: ${outPath}\n`);
  } catch (err) {
    console.error('\n  Error:', err.message);
    if (verbose) console.error(err);
    process.exit(1);
  }
}

main();
