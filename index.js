#!/usr/bin/env node

import { crawlSite } from './src/crawler.js';
import { downloadAssets, getAssetCategoryTelemetry } from './src/downloader.js';
import { rewriteHTML } from './src/rewriter.js';
import { packSite } from './src/packager.js';
import { saveHistoryEntry } from './src/history.js';
import {
  renderHeader,
  showMainMenu,
  renderHelp,
  runThemeSelector,
  runInteractiveWizard,
  renderConfigSummary,
  createSpinner,
  renderSummaryTable,
  promptBrowserPreview,
  showHistoryView,
  renderError,
  setTheme
} from './src/ui.js';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);

function extractArg(args, flag) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return null;
}

async function main() {
  const themeArg = extractArg(args, '--theme');
  if (themeArg) {
    setTheme(themeArg);
  }

  if (args.includes('--help') || args.includes('-h')) {
    await renderHelp(false);
    process.exit(0);
  }

  let config = null;

  if (args.length === 0) {
    while (!config) {
      const choice = await showMainMenu();

      if (choice === 'quick') {
        config = await runInteractiveWizard(false);
      } else if (choice === 'advanced') {
        config = await runInteractiveWizard(true);
      } else if (choice === 'theme') {
        await runThemeSelector();
      } else if (choice === 'history') {
        await showHistoryView();
      } else if (choice === 'help') {
        await renderHelp(true);
      } else if (choice === 'exit') {
        console.log('\n  Goodbye!\n');
        process.exit(0);
      }
    }
  } else {
    let targetUrl = args[0];
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`;
    }
    const outputDir = extractArg(args, '-o') || extractArg(args, '--output');
    const maxDepth = parseInt(extractArg(args, '-d') || extractArg(args, '--depth') || '3', 10);
    const skipZip = args.includes('--no-zip');
    const verbose = args.includes('--verbose');

    config = {
      url: targetUrl,
      outputDir,
      maxDepth,
      skipZip,
      verbose
    };

    renderHeader();
  }

  if (!config) return;

  const { url: targetUrl, outputDir, maxDepth, skipZip, verbose } = config;
  const startTime = Date.now();

  try {
    const domain = new URL(targetUrl).hostname;
    const outPath = path.resolve(outputDir || domain);
    const assetsDir = path.join(outPath, 'assets');
    const pagesDir = path.join(outPath, 'pages');

    renderConfigSummary({
      url: targetUrl,
      outPath,
      maxDepth,
      skipZip,
      verbose
    });

    fs.mkdirSync(assetsDir, { recursive: true });
    fs.mkdirSync(pagesDir, { recursive: true });

    // Step 1: Crawl Pages
    const crawlSpinner = createSpinner('Step [1/4]: Discovering & crawling website pages...').start();
    const pages = await crawlSite(targetUrl, {
      maxDepth,
      verbose,
      onProgress: (currentUrl, count) => {
        crawlSpinner.text = `Step [1/4]: Crawling pages (${count} found) -> ${currentUrl.slice(0, 45)}...`;
      }
    });
    crawlSpinner.succeed(`Step [1/4]: Discovered ${pages.length} page(s) successfully.`);

    // Step 2: Download Assets
    const downloadSpinner = createSpinner('Step [2/4]: Downloading website assets...').start();
    const allAssets = new Map();
    
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const pageName = path.basename(page.url) || 'index';
      downloadSpinner.text = `Step [2/4]: Fetching assets for page ${i + 1}/${pages.length} (${pageName})...`;
      
      const assets = await downloadAssets(
        page.html,
        targetUrl,
        assetsDir,
        verbose,
        (assetUrl, done, total) => {
          downloadSpinner.text = `Step [2/4]: Downloading assets [${done}/${total}] for ${pageName}...`;
        }
      );
      
      for (const [k, v] of assets) allAssets.set(k, v);
      pages[i] = { ...page, assets };
    }
    downloadSpinner.succeed(`Step [2/4]: Downloaded ${allAssets.size} total asset(s).`);

    // Step 3: Rewrite HTML
    const rewriteSpinner = createSpinner('Step [3/4]: Rewriting HTML links and assets...').start();
    for (const page of pages) {
      const rewritten = rewriteHTML(page.html, page.url, targetUrl, allAssets);
      const pagePath = path.join(pagesDir, page.filename);
      fs.mkdirSync(path.dirname(pagePath), { recursive: true });
      fs.writeFileSync(pagePath, rewritten, 'utf-8');
    }

    const indexPath = path.join(outPath, 'index.html');
    if (!fs.existsSync(indexPath) && fs.existsSync(path.join(pagesDir, 'index.html'))) {
      fs.copyFileSync(path.join(pagesDir, 'index.html'), indexPath);
    }
    rewriteSpinner.succeed(`Step [3/4]: Rewrote & saved ${pages.length} HTML document(s).`);

    // Step 4: Packaging
    let zipPath = null;
    if (!skipZip) {
      const zipSpinner = createSpinner('Step [4/4]: Compressing website into ZIP package...').start();
      zipPath = await packSite(outPath, domain);
      zipSpinner.succeed(`Step [4/4]: Created ZIP package successfully.`);
    }

    const durationMs = Date.now() - startTime;
    const categoryTelemetry = getAssetCategoryTelemetry(assetsDir);

    renderSummaryTable({
      pagesCount: pages.length,
      assetsCount: allAssets.size,
      categoryTelemetry,
      outPath,
      zipPath,
      durationMs,
      skipZip
    });

    saveHistoryEntry({
      url: targetUrl,
      outPath,
      pagesCount: pages.length,
      assetsCount: allAssets.size,
      durationMs,
      zipPath
    });

    await promptBrowserPreview(outPath);

  } catch (err) {
    renderError(err, verbose);
    process.exit(1);
  }
}

main();
