#!/usr/bin/env node

import { crawlSite } from './src/crawler.js';
import { downloadAssets, getAssetCategoryTelemetry, resetDownloaderState } from './src/downloader.js';
import { rewriteHTML, rewriteCSSFiles, rewriteJSFiles } from './src/rewriter.js';
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
import { runSkillInstaller } from './src/skill-installer.js';
import { runPromptGeneratorWizard } from './src/prompt-generator.js';
import { runAIMenu, runAIProjectSupervisor } from './src/ai.js';
import { runUpdateWizard } from './src/updater.js';
import { runPreviewMenu, launchPreviewServer } from './src/server.js';
import { runFolderSettingsWizard, resolvePathForDomain } from './src/config.js';
import { confirm } from '@inquirer/prompts';
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

  if (args.includes('--serve') || args.includes('-s') || args.includes('--preview')) {
    const targetDir = extractArg(args, '--serve') || extractArg(args, '-s') || extractArg(args, '--preview') || './';
    await launchPreviewServer(targetDir, true);
    return;
  }

  if (args.includes('--update') || args.includes('-u')) {
    await runUpdateWizard(false);
    process.exit(0);
  }

  if (args.includes('--install-skill') || args.includes('--export-skill')) {
    await runSkillInstaller();
    process.exit(0);
  }

  if (args.includes('--prompt') || args.includes('-p')) {
    await runPromptGeneratorWizard();
    process.exit(0);
  }

  if (args.includes('--ai') || args.includes('-a')) {
    await runAIMenu();
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
      } else if (choice === 'folders') {
        await runFolderSettingsWizard();
      } else if (choice === 'ai') {
        await runAIMenu();
      } else if (choice === 'prompt') {
        await runPromptGeneratorWizard();
      } else if (choice === 'skill') {
        await runSkillInstaller();
      } else if (choice === 'server') {
        await runPreviewMenu();
      } else if (choice === 'update') {
        await runUpdateWizard(true);
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
    const skipZip = !args.includes('--zip') && !args.includes('-z');
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
    const resolvedDir = outputDir || resolvePathForDomain(domain);
    const outPath = path.resolve(resolvedDir);
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
    resetDownloaderState();
    const downloadSpinner = createSpinner('Step [2/4]: Downloading website assets...').start();
    const allAssets = new Map();
    
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const pageName = path.basename(page.url) || 'index';
      downloadSpinner.text = `Step [2/4]: Fetching assets for page ${i + 1}/${pages.length} (${pageName})...`;
      
      const assets = await downloadAssets(
        page.html,
        targetUrl,
        outPath,
        page.capturedResponses || new Map(),
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

    // Build pageMap for cross-page link rewriting
    const pageMap = new Map();
    for (const page of pages) {
      pageMap.set(page.url, page.filename);
      try {
        const u = new URL(page.url);
        pageMap.set(u.pathname, page.filename);
        pageMap.set(u.pathname.replace(/^\//, ''), page.filename);
        pageMap.set(u.origin + u.pathname, page.filename);
      } catch { /* skip */ }
    }

    for (const page of pages) {
      const rewritten = rewriteHTML(page.html, page.url, targetUrl, allAssets, pageMap, {
        bundle: false,
        keepAnalytics: false,
        pageFilename: page.filename
      });
      const pagePath = path.join(outPath, page.filename);
      fs.mkdirSync(path.dirname(pagePath), { recursive: true });
      fs.writeFileSync(pagePath, rewritten, 'utf-8');
    }

    // Rewrite relative asset URLs in external CSS stylesheets and JS bundles
    rewriteCSSFiles(outPath, allAssets, targetUrl);
    rewriteJSFiles(outPath);

    rewriteSpinner.succeed(`Step [3/4]: Rewrote & saved ${pages.length} HTML document(s) & CSS assets.`);

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

    // AI Auto-Supervisor to audit, fix and heal the downloaded project
    if (config.useAI === true) {
      await runAIProjectSupervisor(outPath);
    } else if (config.useAI === false) {
      await promptBrowserPreview(outPath);
    } else {
      try {
        const shouldSupervise = await confirm({
          message: 'Would you like AI Supervisor to audit, fix broken links & heal this website now?',
          default: true
        });

        if (shouldSupervise) {
          await runAIProjectSupervisor(outPath);
        } else {
          await promptBrowserPreview(outPath);
        }
      } catch {
        await promptBrowserPreview(outPath);
      }
    }

  } catch (err) {
    renderError(err, verbose);
    process.exit(1);
  }
}

main();
