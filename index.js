#!/usr/bin/env node

import { crawlSite } from './src/crawler.js';
import { downloadAssets, resetDownloaderState } from './src/downloader.js';
import { bundleSiteAssets } from './src/bundler.js';
import { rewriteHTML } from './src/rewriter.js';
import { packSite, removeEmptyDirectories } from './src/packager.js';
import fs from 'fs';
import path from 'path';
import cliProgress from 'cli-progress';

const args = process.argv.slice(2);

function showHelp() {
  console.log(`
║         Mirror CLI v2.0                 ║
║  Download & architecture-optimize site  ║

Usage:
  node index.js <url> [options]

Options:
  -o, --output <dir>    Output directory (default: domain name)
  -d, --depth <num>     Max crawl depth (default: 3)
  --bundle              Bundle CSS/JS files into single bundle files
  --keep-analytics      Keep third-party tracking scripts
  --no-zip              Skip ZIP packaging
  --verbose             Show detailed logs

Examples:
  node index.js https://example.com
  node index.js https://example.com -o my-site -d 3
`);
  process.exit(0);
}

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  showHelp();
}

const url = args[0];
const outputDir = extractArg(args, '-o') || extractArg(args, '--output');
const maxDepth = parseInt(extractArg(args, '-d') || extractArg(args, '--depth') || '3', 10);
const bundle = args.includes('--bundle');
const keepAnalytics = args.includes('--keep-analytics');
const skipZip = args.includes('--no-zip');
const verbose = args.includes('--verbose');

function extractArg(args, flag) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return null;
}

async function main() {
  try {
    resetDownloaderState();

    const domain = new URL(url).hostname;
    const outPath = path.resolve(outputDir || domain);

    console.log(`\n  Mirror CLI`);
    console.log(`  ${'='.repeat(45)}`);
    console.log(`  Target URL:       ${url}`);
    console.log(`  Output Path:      ${outPath}`);
    console.log(`  Max Depth:        ${maxDepth}`);
    console.log(`  Bundle CSS/JS:    ${bundle}`);
    console.log(`  Remove Analytics: ${!keepAnalytics}`);
    console.log(`  ${'='.repeat(45)}\n`);

    fs.mkdirSync(outPath, { recursive: true });

    const bar = new cliProgress.SingleBar({
      format: '  Progress |{bar}| {percentage}% | {value}/{total} | {status}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    // Step 1: Crawling pages
    console.log('  [1/4] Crawling pages...\n');
    const pages = await crawlSite(url, { maxDepth, verbose });
    console.log(`  Found ${pages.length} page(s)\n`);

    const pageMap = new Map();
    for (const page of pages) {
      pageMap.set(page.url, page.filename);
      pageMap.set(page.url.replace(/\/$/, ''), page.filename);
    }

    // Step 2: Downloading assets
    console.log('  [2/4] Downloading & organizing assets...\n');
    bar.start(pages.length, 0, { status: 'Processing...' });
    let globalAssetMap = new Map();
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      bar.update(i, { status: path.basename(page.url) || 'index' });
      const pageAssets = await downloadAssets(page.html, page.url, outPath, { verbose, keepAnalytics, capturedResponses: page.capturedResponses });
      for (const [k, v] of pageAssets) globalAssetMap.set(k, v);
    }
    bar.update(pages.length, { status: 'Done' });
    bar.stop();
    console.log(`\n  Unique assets downloaded: ${globalAssetMap.size}`);

    // Step 3: Bundling & Optimizing files
    console.log('\n  [3/4] Bundling & rewriting site structure...\n');
    if (bundle) {
      globalAssetMap = bundleSiteAssets(outPath, globalAssetMap, { bundle: true, verbose });
    }

    // Step 4: Rewriting HTML DOM and saving
    for (const page of pages) {
      const rewritten = rewriteHTML(page.html, page.url, url, globalAssetMap, pageMap, { bundle, keepAnalytics, pageFilename: page.filename });
      const targetFilePath = path.join(outPath, page.filename);
      fs.mkdirSync(path.dirname(targetFilePath), { recursive: true });
      fs.writeFileSync(targetFilePath, rewritten, 'utf-8');
    }

    removeEmptyDirectories(outPath);
    console.log(`  Pages saved: ${pages.length}`);

    // Step 5: Packaging ZIP
    if (!skipZip) {
      console.log('\n  [4/4] Packaging ZIP archive...');
      const zipPath = await packSite(outPath, domain);
      console.log(`  ZIP Created: ${zipPath}`);
    }

    console.log(`\n  ✅ Done! Site mirrored cleanly to: ${outPath}\n`);
  } catch (err) {
    console.error('\n  ❌ Error:', err.message);
    if (verbose) console.error(err);
    process.exit(1);
  }
}

main();
