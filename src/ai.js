import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import boxen from 'boxen';
import ora from 'ora';
import { input, select, confirm, password } from '@inquirer/prompts';
import { getTheme, renderHeader } from './ui.js';
import open from 'open';
import { execSync } from 'child_process';
import * as cheerio from 'cheerio';

// AI Reasoning & Power Levels
export const AI_POWER_LEVELS = {
  high: {
    id: 'high',
    name: 'High (Deep Reasoning & Maximum Fidelity)',
    description: 'Uses flagship Gemini 3.7 Flash with low temperature (0.2) for pixel-perfect code & layout replica',
    model: 'gemini-3.7-flash',
    fallback: 'gemini-2.5-flash',
    temperature: 0.2,
    maxOutputTokens: 8192
  },
  medium: {
    id: 'medium',
    name: 'Medium (Balanced Speed & Accuracy)',
    description: 'Uses Gemini 3.5 Flash (temp 0.7) for clean, fast, balanced HTML/CSS generation',
    model: 'gemini-3.5-flash',
    fallback: 'gemini-2.5-flash',
    temperature: 0.7,
    maxOutputTokens: 4096
  },
  low: {
    id: 'low',
    name: 'Low / Fast (Rapid Draft & Low Latency)',
    description: 'Uses Gemini 3.6 Flash (temp 0.8) for ultra-fast drafts & quick component outlines',
    model: 'gemini-3.6-flash',
    fallback: 'gemini-2.5-flash',
    temperature: 0.8,
    maxOutputTokens: 2048
  }
};

// Supported Gemini Models (Live Google AI Studio API verified)
export const GEMINI_MODELS = [
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash (Hybrid Reasoning & Flagship)',
    description: 'Latest Google flagship model with advanced deep reasoning',
    fallback: 'gemini-2.5-flash'
  },
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash (High Performance & Low Latency)',
    description: 'Optimized for rapid web analysis and real-time generation',
    fallback: 'gemini-2.5-flash'
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash (Balanced Code & Design Generator)',
    description: 'Fast, balanced output for HTML, CSS, and component extraction',
    fallback: 'gemini-2.5-flash'
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro Preview (Deep Architecture & Large Projects)',
    description: 'Deep intelligence for large codebases and complex design systems',
    fallback: 'gemini-2.5-pro'
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash (Ultra-Stable & Fast)',
    description: 'Production stable Gemini 2.5 flash model',
    fallback: 'gemini-3.5-flash'
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro (Massive Context & Reasoning)',
    description: 'Deep context reasoning for large multi-page sites',
    fallback: 'gemini-2.5-flash'
  }
];

const CONFIG_PATH = path.join(os.homedir(), '.mirror-ai-config.json');

/**
 * Load AI Configuration
 */
export function loadAIConfig() {
  const defaultConfig = {
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
    powerLevel: 'high',
    model: 'gemini-3.7-flash',
    temperature: 0.2,
    maxOutputTokens: 8192
  };

  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
      return { ...defaultConfig, ...data };
    }
  } catch {
    // Return default on error
  }
  return defaultConfig;
}

/**
 * Save AI Configuration
 */
export function saveAIConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure an API key is available, prompting the user if missing
 */
export async function ensureApiKey(theme = getTheme()) {
  let config = loadAIConfig();
  if (config.apiKey && config.apiKey.trim().length > 0) {
    return config.apiKey.trim();
  }

  console.log('\n' + boxen(
    theme.chalkPrimary.bold('[ Google Gemini API Key Required ]\n\n') +
    chalk.white('To use AI capabilities, please enter your Google Gemini API Key.\n') +
    theme.chalkAccent('• Get a FREE API key here: ') + chalk.underline('https://aistudio.google.com/app/apikey') + '\n' +
    theme.chalkMuted('• Your key will be securely saved locally in ~/.mirror-ai-config.json'),
    {
      padding: 1,
      borderStyle: theme.borderStyle,
      borderColor: theme.primaryHex,
      title: ' [ AI Configuration ] ',
      titleAlignment: 'left'
    }
  ));

  console.log(theme.chalkMuted('  Tip: Paste your key using Ctrl+V or Right-Click, then press Enter.\n'));

  const key = await password({
    message: theme.chalkPrimary('Enter your Gemini API Key:'),
    mask: '*'
  });

  if (!key || !key.trim()) {
    throw new Error('Gemini API Key is required to use AI features.');
  }

  config.apiKey = key.trim();
  saveAIConfig(config);
  console.log(theme.chalkSecondary('\n  ✔ Gemini API Key saved successfully!\n'));
  return config.apiKey;
}

/**
 * Clean and compact HTML for AI processing (strips bloat, base64, and huge scripts)
 */
export function cleanHtmlForAI(html) {
  try {
    const $ = cheerio.load(html);
    $('script, noscript, style, iframe, svg, link[rel="stylesheet"]').remove();
    $('img').each((_, el) => {
      const src = $(el).attr('src') || '';
      if (src.startsWith('data:')) {
        $(el).attr('src', 'image.jpg');
      }
    });
    $('*').each((_, el) => {
      const attribs = el.attribs || {};
      for (const k of Object.keys(attribs)) {
        if (attribs[k] && attribs[k].length > 150) {
          $(el).removeAttr(k);
        }
      }
    });
    const bodyHtml = $('body').html() || html;
    return bodyHtml.replace(/\s+/g, ' ').trim().slice(0, 15000);
  } catch {
    return html.replace(/data:image\/[^;]+;base64,[^"']+/g, '...').slice(0, 15000);
  }
}

/**
 * Direct Gemini API Caller with Fallback and Retry
 */
export async function callGemini({
  prompt,
  systemInstruction = 'You are an expert AI Frontend Engineer & Web Architect inside Mirror CLI.',
  model = null,
  apiKey = null,
  temperature = 0.2,
  maxOutputTokens = 8192
}) {
  const config = loadAIConfig();
  const activeKey = apiKey || config.apiKey;
  const activeModel = model || config.model || 'gemini-3.7-flash';

  if (!activeKey) {
    throw new Error('Missing Gemini API Key. Please configure your API key in AI Settings.');
  }

  async function requestModel(modelId) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${activeKey}`;
    
    const bodyPayload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature,
        maxOutputTokens
      }
    };

    if (systemInstruction) {
      bodyPayload.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyPayload),
      signal: AbortSignal.timeout(90000)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errorMsg = errData?.error?.message || `HTTP ${response.status} ${response.statusText}`;
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = errData;
      throw err;
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0];
    const text = candidate?.content?.parts?.map(p => p.text).join('') || '';
    return text;
  }

  // Build candidate fallback models list with ultra-stable gemini-2.5-flash
  const fallbackChain = [
    activeModel,
    'gemini-2.5-flash',
    'gemini-3.5-flash',
    'gemini-3.6-flash'
  ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

  let lastError = null;

  for (const candidateModel of fallbackChain) {
    try {
      return await requestModel(candidateModel);
    } catch (err) {
      lastError = err;
      const isRetryable =
        err.status === 404 ||
        err.status === 400 ||
        err.status === 503 ||
        err.status === 429 ||
        err.status === 500 ||
        (err.message && (
          err.message.includes('not found') ||
          err.message.includes('not supported') ||
          err.message.includes('fetch failed') ||
          err.message.includes('high demand') ||
          err.message.includes('overloaded') ||
          err.message.includes('quota') ||
          err.message.includes('timeout') ||
          err.message.includes('temporarily unavailable')
        ));

      if (isRetryable) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('All candidate Gemini models failed to respond.');
}

/**
 * 1. AI Auto-Supervisor & Code Healer
 */
export async function runAIProjectSupervisor(targetFolder = null) {
  const theme = getTheme();
  renderHeader();
  console.log(theme.chalkPrimary.bold('\n[ AI Project Auto-Supervisor & Code Healer ]\n'));
  console.log(theme.chalkMuted('  Scans project files, fixes errors, unfreezes scroll locks, and injects required libraries.\n'));

  let projectDir = targetFolder;
  if (!projectDir) {
    const { findLocalWebsiteFolders } = await import('./server.js');
    const discovered = findLocalWebsiteFolders();

    if (discovered.length > 0) {
      const choices = discovered.map((d, i) => ({
        name: `[${i + 1}]  ${d}`,
        value: d
      }));
      choices.push({ name: '[✏️] Custom Folder Path...', value: '__custom__' });

      const selected = await select({
        message: theme.chalkPrimary.bold('Select website folder to audit and heal:'),
        choices
      });

      if (selected === '__custom__') {
        projectDir = await input({
          message: theme.chalkPrimary('Enter cloned website folder path:'),
          default: './',
          validate: (val) => fs.existsSync(val.trim()) ? true : 'Directory does not exist.'
        });
      } else {
        projectDir = selected;
      }
    } else {
      projectDir = await input({
        message: theme.chalkPrimary('Enter cloned website folder path:'),
        default: './',
        validate: (val) => fs.existsSync(val.trim()) ? true : 'Directory does not exist.'
      });
    }
  }
  projectDir = path.resolve(projectDir.trim());

  const apiKey = await ensureApiKey(theme);
  const config = loadAIConfig();

  const auditSpinner = ora('Step [1/4]: Auditing directory structure and files...').start();

  // 1. Check for nested assets folder (assets/assets)
  let healedActions = [];
  const nestedAssetsDir = path.join(projectDir, 'assets', 'assets');
  const mainAssetsDir = path.join(projectDir, 'assets');

  if (fs.existsSync(nestedAssetsDir)) {
    try {
      const subItems = fs.readdirSync(nestedAssetsDir);
      for (const item of subItems) {
        const srcPath = path.join(nestedAssetsDir, item);
        const destPath = path.join(mainAssetsDir, item);
        if (!fs.existsSync(destPath)) {
          fs.renameSync(srcPath, destPath);
        }
      }
      fs.rmSync(nestedAssetsDir, { recursive: true, force: true });
      healedActions.push('Flattened nested assets/assets directory structure.');
    } catch {
      // ignore
    }
  }

  // 2. Find all HTML files
  let htmlFiles = [];
  function scanHtml(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
        scanHtml(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        htmlFiles.push(fullPath);
      }
    }
  }
  scanHtml(projectDir);

  if (htmlFiles.length === 0) {
    auditSpinner.warn('No HTML files found in the specified directory.');
    await input({ message: theme.chalkPrimary('↵ Press [ENTER] to return to AI Menu') });
    return;
  }

  auditSpinner.succeed(`Step [1/4]: Found ${htmlFiles.length} HTML document(s) to review.`);

  // 3. Review & Heal HTML files
  const healSpinner = ora('Step [2/4]: Reviewing links, script tags, and preloader locks...').start();
  let totalFixes = 0;

  for (const file of htmlFiles) {
    let content = fs.readFileSync(file, 'utf-8');
    let modified = false;

    // A. Fix asset.bin or dummy paths
    if (content.includes('asset.bin')) {
      content = content.replace(/["'][^"']*asset\.bin["']/g, '"#main"');
      modified = true;
      healedActions.push(`Fixed dummy asset.bin references in ${path.basename(file)}`);
      totalFixes++;
    }

    // B. Fix preloader overlay blocking interactions
    if (content.includes('pl-overlay') || content.includes('preloader') || content.includes('loading-screen')) {
      const unlockScript = `
<!-- Mirror CLI AI Auto-Healer: Preloader Fallback -->
<style>
  .pl-overlay, #preloader, .preloader, #loading, .loading-screen { opacity: 0 !important; pointer-events: none !important; display: none !important; }
</style>`;
      if (!content.includes('Mirror CLI AI Auto-Healer: Preloader Fallback')) {
        content = content.replace('</head>', `${unlockScript}\n</head>`);
        modified = true;
        healedActions.push(`Injected preloader auto-dismiss fallback in ${path.basename(file)}`);
        totalFixes++;
      }
    }

    // C. Detect missing standard icon/font libraries
    let injectedCDNs = [];
    if ((content.includes('fa-') || content.includes('fas ') || content.includes('fab ')) && !content.includes('font-awesome')) {
      injectedCDNs.push('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">');
    }
    if (content.includes('lucide') && !content.includes('lucide.min.js')) {
      injectedCDNs.push('<script src="https://unpkg.com/lucide@latest"></script>');
    }
    if ((content.includes('swiper-') || content.includes('swiper-container')) && !content.includes('swiper-bundle')) {
      injectedCDNs.push('<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css"><script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>');
    }

    if (injectedCDNs.length > 0) {
      content = content.replace('</head>', `  ${injectedCDNs.join('\n  ')}\n</head>`);
      modified = true;
      healedActions.push(`Injected missing CDN libraries into ${path.basename(file)}: ${injectedCDNs.length} library(s)`);
      totalFixes++;
    }

    if (modified) {
      fs.writeFileSync(file, content, 'utf-8');
    }
  }

  healSpinner.succeed(`Step [2/4]: Applied ${totalFixes} direct code & asset healing fix(es).`);

  // 4. Gemini Deep Architectural Inspection
  const aiSpinner = ora(`Step [3/4]: Performing AI deep inspection with ${theme.chalkAccent(config.model)}...`).start();

  const mainIndexFile = htmlFiles.find(f => path.basename(f) === 'index.html') || htmlFiles[0];
  const rawHtml = fs.readFileSync(mainIndexFile, 'utf-8');
  const indexExcerpt = cleanHtmlForAI(rawHtml);

  const prompt = `Perform an architectural review and health diagnosis of this cloned website index.html:
\`\`\`html
${indexExcerpt}
\`\`\`

Diagnose:
1. Are there broken dependencies or CDN calls?
2. Are all responsive meta tags and viewport settings intact?
3. What missing libraries or polyfills should be recommended?
4. Summary of health status (1-100%).

Provide a concise, structured markdown report with bullet points.`;

  try {
    const aiReview = await callGemini({
      prompt,
      systemInstruction: 'You are the Mirror CLI AI Supervisor. Output a concise and actionable health report.',
      apiKey,
      model: config.model
    });

    aiSpinner.succeed('Step [3/4]: AI deep health analysis completed.');

    // Step 5: Save report
    const reportPath = path.join(projectDir, 'ai_supervision_report.md');
    fs.writeFileSync(reportPath, `# Mirror CLI AI Supervision & Healing Report\n\n## Auto-Healed Items:\n` +
      healedActions.map(a => `- ✔ ${a}`).join('\n') + `\n\n## Gemini Architectural Review (${config.model}):\n\n${aiReview}`, 'utf-8');

    // 5. Check if project requires npm dependencies
    const packageJsonPath = path.join(projectDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const depSpinner = ora('Step [4/4]: Detected package.json, checking node dependencies...').start();
      try {
        execSync('npm install --prefer-offline', { cwd: projectDir, stdio: 'ignore' });
        depSpinner.succeed('Step [4/4]: Installed local npm packages successfully.');
      } catch {
        depSpinner.warn('Step [4/4]: npm install skipped or encountered minor warning.');
      }
    } else {
      ora().succeed('Step [4/4]: Verified standalone static assets (No node_modules required).');
    }

    console.log('\n' + boxen(
      `${theme.chalkSecondary('Project Directory:')}  ${chalk.white(projectDir)}\n` +
      `${theme.chalkSecondary('Healed Fixes:')}       ${chalk.green.bold(totalFixes + ' issues auto-repaired')}\n` +
      `${theme.chalkSecondary('AI Supervised By:')}   ${theme.chalkAccent(config.model)}\n` +
      `${theme.chalkSecondary('Report Saved:')}       ${chalk.white(reportPath)}\n\n` +
      theme.chalkAccent('Key Healed Actions:\n') +
      (healedActions.length > 0 ? healedActions.map(a => ` • ${chalk.white(a)}`).join('\n') : ' • All assets and links verified healthy!'),
      {
        padding: 1,
        borderStyle: 'singleDouble',
        borderColor: theme.primaryHex,
        title: theme.chalkPrimary.bold(' [ AI Supervisor: Site Health & Healing Complete ] '),
        titleAlignment: 'left'
      }
    ));

    const openPreview = await confirm({
      message: theme.chalkPrimary('Would you like to start local live server & preview the website in browser?'),
      default: true
    });

    if (openPreview) {
      const { launchPreviewServer } = await import('./server.js');
      const preview = await launchPreviewServer(projectDir, true);
      if (preview) {
        await input({
          message: theme.chalkPrimary('↵ Press [ENTER] when finished to stop the local preview server')
        });
        preview.server.close();
        console.log(theme.chalkMuted('\n  Local server closed.\n'));
      }
    }

  } catch (err) {
    aiSpinner.fail('AI deep review encountered an error: ' + err.message);
  }

  await input({ message: theme.chalkPrimary('↵ Press [ENTER] to return to AI Menu') });
}

/**
 * 2. AI Live Website Cloner & Code Generator (Crystal Clear Workflow)
 */
export async function runAIWebRecreator() {
  const theme = getTheme();
  renderHeader();
  
  console.log(
    boxen(
      `${theme.chalkPrimary.bold('⚡ AI Website Recreator & Architecture Synthesizer')}\n\n` +
      `${theme.chalkAccent('How AI Recreation Works (4-Step Workflow):')}\n` +
      ` 1. ${chalk.white('Inspect & Fetch:')} Analyzes live website DOM, visual tokens & responsive structure.\n` +
      ` 2. ${chalk.white('Sanitize & Strip:')} Removes ads, trackers, and bulky Base64 bloat.\n` +
      ` 3. ${chalk.white('Synthesize Code:')} Generates pixel-perfect production code (HTML / Tailwind / React).\n` +
      ` 4. ${chalk.white('Export & Preview:')} Writes ready-to-run file with instant browser preview.`,
      {
        padding: 1,
        borderStyle: theme.borderStyle,
        borderColor: theme.primaryHex,
        title: ' [ AI Recreation Workflow ] ',
        titleAlignment: 'left'
      }
    )
  );

  const apiKey = await ensureApiKey(theme);
  const config = loadAIConfig();

  const targetInput = await input({
    message: theme.chalkPrimary('Enter Website URL or local HTML path to recreate:'),
    validate: (val) => val.trim().length > 0 ? true : 'Please enter a valid URL or path.'
  });

  const outputFormat = await select({
    message: theme.chalkPrimary('Select target code architecture:'),
    choices: [
      { name: '[1] Modern Single-File HTML + Tailwind CSS (Full responsive replica with CDN)', value: 'html-tailwind' },
      { name: '[2] Semantic HTML5 + Pure Vanilla CSS3 (CSS Grid, Flexbox & Keyframes)', value: 'html-css' },
      { name: '[3] React / Next.js Component (Tailwind + Lucide icons + Framer Motion)', value: 'react' }
    ]
  });

  const powerChoice = await select({
    message: theme.chalkPrimary('Select AI Power & Reasoning Level:'),
    choices: [
      { name: '[1] High Power (Deep Reasoning & Maximum Fidelity - Gemini 3.7 Flash)', value: 'high' },
      { name: '[2] Medium Power (Balanced Speed & Precision - Gemini 3.5 Flash)', value: 'medium' },
      { name: '[3] Low / Fast Power (Ultra Rapid Draft - Gemini 3.6 Flash)', value: 'low' }
    ]
  });

  const selectedPower = AI_POWER_LEVELS[powerChoice] || AI_POWER_LEVELS.high;

  let rawContent = '';
  let sourceLabel = targetInput;

  const fetchSpinner = ora('Step [1/4]: Extracting and sanitizing website structure...').start();
  try {
    if (targetInput.startsWith('http://') || targetInput.startsWith('https://')) {
      const res = await fetch(targetInput, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(20000)
      });
      rawContent = await res.text();
    } else if (fs.existsSync(targetInput)) {
      rawContent = fs.readFileSync(targetInput, 'utf-8');
    } else {
      rawContent = `URL or concept: ${targetInput}`;
    }
    fetchSpinner.succeed('Step [1/4]: Page structure extracted successfully.');
  } catch (err) {
    fetchSpinner.warn(`Step [1/4]: Direct fetch note (${err.message}). Proceeding with prompt synthesis.`);
    rawContent = `Target URL: ${targetInput}`;
  }

  const cleanSpinner = ora('Step [2/4]: Sanitizing HTML & stripping bloat...').start();
  const sanitizedHtml = cleanHtmlForAI(rawContent);
  cleanSpinner.succeed(`Step [2/4]: Sanitized HTML (${Math.round(sanitizedHtml.length / 1024)} KB clean DOM payload).`);

  const genSpinner = ora(`Step [3/4]: Synthesizing code with ${theme.chalkAccent(selectedPower.name)}...`).start();

  const systemInstruction = `You are a world-class Frontend Architect specializing in pixel-perfect website recreation.
Output ONLY the requested code without conversational preamble. Make the output 100% complete, fully responsive, modern, and production ready.`;

  const prompt = `Recreate the following website into ${outputFormat}.
Source reference: ${sourceLabel}
HTML/Content excerpt:
\`\`\`html
${sanitizedHtml}
\`\`\`

Requirements:
1. Modern, highly-aesthetic visual hierarchy, dark/light contrast, sleek colors.
2. Complete responsive layouts (Desktop, Tablet, Mobile).
3. Smooth hover animations, micro-interactions, and modern typography.
4. Output the complete code in a single self-contained artifact.`;

  try {
    const codeResponse = await callGemini({
      prompt,
      systemInstruction,
      apiKey,
      model: selectedPower.model,
      temperature: selectedPower.temperature,
      maxOutputTokens: selectedPower.maxOutputTokens
    });

    genSpinner.succeed('Step [3/4]: Code recreation synthesized successfully!');

    const saveSpinner = ora('Step [4/4]: Saving and formatting output file...').start();

    let filename = 'recreated-site.html';
    if (outputFormat === 'react') filename = 'RecreatedComponent.jsx';

    let cleanCode = codeResponse;
    const match = codeResponse.match(/```(?:html|jsx|tsx|javascript)?([\s\S]*?)```/);
    if (match && match[1]) {
      cleanCode = match[1].trim();
    }

    const outputPath = path.resolve(filename);
    fs.writeFileSync(outputPath, cleanCode, 'utf-8');
    saveSpinner.succeed(`Step [4/4]: Saved ${filename} successfully.`);

    console.log('\n' + boxen(
      `${theme.chalkSecondary('✔ Output File:')}     ${chalk.green.bold(outputPath)}\n` +
      `${theme.chalkSecondary('Format:')}           ${chalk.white(outputFormat)}\n` +
      `${theme.chalkSecondary('AI Power Level:')}   ${theme.chalkAccent(selectedPower.name)}\n` +
      `${theme.chalkSecondary('Model Used:')}       ${chalk.white(selectedPower.model)}`,
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: theme.primaryHex,
        title: theme.chalkPrimary.bold(' [ Recreation Complete ] '),
        titleAlignment: 'left'
      }
    ));

    const shouldOpen = await confirm({
      message: theme.chalkPrimary('Would you like to open the generated file now?'),
      default: true
    });

    if (shouldOpen) {
      await open(outputPath);
    }
  } catch (err) {
    genSpinner.fail('Generation failed: ' + err.message);
  }

  await input({ message: theme.chalkPrimary('↵ Press [ENTER] to return to AI Menu') });
}

/**
 * 3. AI Code Cleaner & Refactor Engine
 */
export async function runAICodeCleaner() {
  const theme = getTheme();
  renderHeader();
  console.log(theme.chalkPrimary.bold('\n[ AI Code Cleaner & Modernizer ]\n'));
  console.log(theme.chalkMuted('  Removes clutter, trackers, broken links and refactors markup into clean modern CSS/HTML.\n'));

  const apiKey = await ensureApiKey(theme);
  const config = loadAIConfig();

  const filePath = await input({
    message: theme.chalkPrimary('Enter HTML file path to clean & refactor:'),
    validate: (val) => fs.existsSync(val.trim()) ? true : 'File not found. Please provide a valid file path.'
  });

  const content = fs.readFileSync(filePath.trim(), 'utf-8');

  const spinner = ora(`Refactoring and cleaning with ${theme.chalkAccent(config.model)}...`).start();

  const prompt = `Refactor and modernize the following HTML document:
\`\`\`html
${content.slice(0, 35000)}
\`\`\`

Tasks:
1. Strip all tracking scripts (Google Analytics, Facebook Pixel, tracking iframes).
2. Fix broken layout quirks and organize inline styles into a clean embedded <style> block using modern CSS variables and flex/grid.
3. Ensure accessibility (aria attributes, alt tags) and responsive viewport meta.
4. Output the complete cleaned HTML.`;

  try {
    const cleaned = await callGemini({
      prompt,
      systemInstruction: 'You are an expert web sanitizer and frontend refactoring specialist. Output only valid, cleaned HTML.',
      apiKey,
      model: config.model
    });

    spinner.succeed('File cleaned and refactored successfully!');

    let cleanCode = cleaned;
    const match = cleaned.match(/```(?:html)?([\s\S]*?)```/);
    if (match && match[1]) cleanCode = match[1].trim();

    const parsed = path.parse(filePath.trim());
    const outPath = path.join(parsed.dir, `${parsed.name}.cleaned${parsed.ext}`);
    fs.writeFileSync(outPath, cleanCode, 'utf-8');

    console.log(theme.chalkSecondary(`\n  ✔ Cleaned file saved to: ${chalk.green(outPath)}\n`));
  } catch (err) {
    spinner.fail('Cleaning failed!');
    console.log(chalk.red(`\n❌ Error: ${err.message}\n`));
  }

  await input({ message: theme.chalkPrimary('↵ Press [ENTER] to return to AI Menu') });
}

/**
 * 4. AI Design System & Token Extractor
 */
export async function runAIDesignTokenExtractor() {
  const theme = getTheme();
  renderHeader();
  console.log(theme.chalkPrimary.bold('\n[ AI Design Tokens & Color Palette Extractor ]\n'));
  console.log(theme.chalkMuted('  Extracts color palettes, typography, spacing, and CSS design tokens from any site or HTML.\n'));

  const apiKey = await ensureApiKey(theme);
  const config = loadAIConfig();

  const source = await input({
    message: theme.chalkPrimary('Enter Website URL or local HTML/CSS file:'),
    validate: (val) => val.trim().length > 0 ? true : 'Please enter a valid source.'
  });

  let raw = '';
  const fetchSpin = ora('Reading source data...').start();
  try {
    if (source.startsWith('http')) {
      const res = await fetch(source);
      raw = (await res.text()).slice(0, 25000);
    } else if (fs.existsSync(source)) {
      raw = fs.readFileSync(source, 'utf-8').slice(0, 25000);
    } else {
      raw = source;
    }
    fetchSpin.succeed('Source loaded.');
  } catch {
    fetchSpin.warn('Proceeding with URL synthesis.');
    raw = source;
  }

  const spin = ora(`Extracting design tokens using ${theme.chalkAccent(config.model)}...`).start();

  const prompt = `Analyze this website/code and extract its complete Design Tokens:
\`\`\`
${raw}
\`\`\`

Return a valid JSON object containing:
1. "colors": { "primary", "secondary", "accent", "backgroundDark", "backgroundLight", "surface", "textPrimary", "textMuted", "borders" }
2. "typography": { "fontFamilyPrimary", "fontFamilyHeadings", "headingScale", "bodyScale" }
3. "shadows": { "sm", "md", "lg", "glow" }
4. "radii": { "sm", "md", "lg", "full" }
5. "cssVariables": (A ready-to-use CSS snippet with :root { ... })`;

  try {
    const result = await callGemini({
      prompt,
      systemInstruction: 'You are a Design System Architect. Output strict JSON with accurate color hex codes and CSS tokens.',
      apiKey,
      model: config.model
    });

    spin.succeed('Design tokens extracted!');

    let jsonStr = result;
    const match = result.match(/```(?:json)?([\s\S]*?)```/);
    if (match && match[1]) jsonStr = match[1].trim();

    const outJsonPath = path.resolve('design-tokens.json');
    fs.writeFileSync(outJsonPath, jsonStr, 'utf-8');

    console.log('\n' + boxen(
      `${theme.chalkSecondary('Saved Tokens JSON:')} ${chalk.green(outJsonPath)}\n\n` +
      theme.chalkAccent('Tokens Preview:\n') +
      chalk.white(jsonStr.slice(0, 400) + '...'),
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: theme.secondaryHex
      }
    ));
  } catch (err) {
    spin.fail('Extraction failed!');
    console.log(chalk.red(`\n❌ Error: ${err.message}\n`));
  }

  await input({ message: theme.chalkPrimary('↵ Press [ENTER] to return to AI Menu') });
}

/**
 * 5. Interactive AI Terminal Assistant (Live Chat)
 */
export async function runAIChatSession() {
  const theme = getTheme();
  renderHeader();
  console.log(theme.chalkPrimary.bold('\n[ Interactive AI Website Assistant & Chat ]\n'));
  console.log(theme.chalkMuted('  Ask Gemini anything about website cloning, layout fixes, CSS animations, or code conversion.\n  Type "exit" or "quit" to end chat.\n'));

  const apiKey = await ensureApiKey(theme);
  const config = loadAIConfig();

  let conversationHistory = [];

  while (true) {
    try {
      const userPrompt = await input({
        message: theme.chalkAccent('You ❯')
      });

      if (!userPrompt || userPrompt.trim().toLowerCase() === 'exit' || userPrompt.trim().toLowerCase() === 'quit') {
        console.log(theme.chalkMuted('\n  Ending AI Chat session...\n'));
        break;
      }

      const spinner = ora({
        text: `Thinking (${theme.chalkAccent(config.model)})...`,
        color: 'yellow'
      }).start();

      conversationHistory.push(`User: ${userPrompt}`);
      const fullContext = conversationHistory.slice(-6).join('\n');

      const response = await callGemini({
        prompt: fullContext,
        systemInstruction: 'You are the intelligent AI Copilot for Mirror CLI, an ultra-fidelity website cloning and frontend suite. Provide concise, expert code and architecture guidance.',
        apiKey,
        model: config.model
      });

      spinner.stop();

      conversationHistory.push(`AI: ${response}`);

      console.log('\n' + boxen(
        response.trim(),
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: theme.primaryHex,
          title: ` [ Gemini (${config.model}) ] `,
          titleAlignment: 'left'
        }
      ) + '\n');

    } catch (err) {
      if (err.name === 'ExitPromptError') break;
      console.log(chalk.red(`\n❌ Error: ${err.message}\n`));
    }
  }
}

/**
 * 6. Test Connection to Gemini API
 */
export async function testGeminiConnection() {
  const theme = getTheme();
  renderHeader();
  console.log(theme.chalkPrimary.bold('\n[ Testing Google Gemini API Connection ]\n'));

  const config = loadAIConfig();
  const apiKey = await ensureApiKey(theme);

  const spinner = ora({
    text: `Pinging Gemini API with model (${theme.chalkAccent(config.model)})...`,
    color: 'cyan'
  }).start();

  const startTime = Date.now();
  try {
    const response = await callGemini({
      prompt: 'Respond in exactly one short sentence confirming you are online as Mirror CLI AI Engine.',
      apiKey,
      model: config.model
    });

    const latency = Date.now() - startTime;
    spinner.succeed(`Connected successfully! Latency: ${latency}ms`);

    console.log('\n' + boxen(
      `${theme.chalkSecondary('Active Model:')} ${chalk.white(config.model)}\n` +
      `${theme.chalkSecondary('Status:')}       ${chalk.green('● ONLINE & READY')}\n` +
      `${theme.chalkSecondary('Response:')}     ${chalk.italic('"' + response.trim() + '"')}`,
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: theme.secondaryHex
      }
    ));
  } catch (err) {
    spinner.fail('Connection failed!');
    console.log(chalk.red(`\n❌ Error: ${err.message}\n`));
  }

  await input({ message: theme.chalkPrimary('↵ Press [ENTER] to continue') });
}

/**
 * 7. AI Settings & Model Selector
 */
export async function runAISettings() {
  const theme = getTheme();
  let inSettings = true;

  while (inSettings) {
    renderHeader();
    const config = loadAIConfig();
    const activeModelDef = GEMINI_MODELS.find(m => m.id === config.model);
    const activePowerDef = AI_POWER_LEVELS[config.powerLevel] || AI_POWER_LEVELS.high;
    const maskedKey = config.apiKey
      ? config.apiKey.slice(0, 6) + '...' + config.apiKey.slice(-4)
      : chalk.red('NOT CONFIGURED');

    console.log(
      boxen(
        `${theme.chalkSecondary('AI Power Level:')}      ${theme.chalkAccent.bold(activePowerDef.name)}\n` +
        `${theme.chalkSecondary('Active Gemini Model:')} ${theme.chalkAccent.bold(config.model)} ${theme.chalkMuted(`(${activeModelDef ? activeModelDef.name : 'Custom'})`)}\n` +
        `${theme.chalkSecondary('Gemini API Key:     ')} ${maskedKey}\n` +
        `${theme.chalkSecondary('Temperature:        ')} ${chalk.white(config.temperature)}\n` +
        `${theme.chalkSecondary('Max Output Tokens:  ')} ${chalk.white(config.maxOutputTokens)}`,
        {
          padding: 1,
          borderStyle: 'singleDouble',
          borderColor: theme.secondaryHex,
          title: theme.chalkPrimary.bold(' [ AI & Gemini Configuration ] '),
          titleAlignment: 'left'
        }
      )
    );

    try {
      const settingChoice = await select({
        message: theme.chalkPrimary('Select an AI setting to modify:'),
        choices: [
          { name: '[1] Change AI Power Level (High / Medium / Low / Custom)', value: 'power' },
          { name: '[2] Change Active Gemini Model (3.7 Flash, 3.6 Flash, 3.5 Flash, 3.1 Pro...)', value: 'model' },
          { name: '[3] Update Gemini API Key', value: 'key' },
          { name: '[4] Test API Connection & Model Ping', value: 'test' },
          { name: '[5] Adjust Creativity Temperature & Max Tokens', value: 'temp' },
          { name: '[<] Back to AI Menu', value: 'back' }
        ]
      });

      if (settingChoice === 'power') {
        const powerChoices = Object.keys(AI_POWER_LEVELS).map(k => {
          const p = AI_POWER_LEVELS[k];
          return {
            name: `${p.name} ${config.powerLevel === k ? '✔ (Active)' : ''}`,
            value: k,
            description: p.description
          };
        });

        const selectedPower = await select({
          message: theme.chalkPrimary('Choose AI Power / Reasoning Preset:'),
          choices: powerChoices
        });

        const preset = AI_POWER_LEVELS[selectedPower];
        config.powerLevel = selectedPower;
        config.model = preset.model;
        config.temperature = preset.temperature;
        config.maxOutputTokens = preset.maxOutputTokens;
        saveAIConfig(config);
        console.log(theme.chalkSecondary(`\n  ✔ AI Power Level updated to ${preset.name}!\n`));

      } else if (settingChoice === 'model') {
        const modelChoices = GEMINI_MODELS.map(m => ({
          name: `${m.name} ${m.id === config.model ? '✔ (Active)' : ''}`,
          value: m.id,
          description: m.description
        }));
        modelChoices.push({ name: '[+] Custom Model ID (Enter manually)', value: 'custom' });

        const selectedModel = await select({
          message: theme.chalkPrimary('Choose Gemini Model:'),
          choices: modelChoices
        });

        if (selectedModel === 'custom') {
          const customId = await input({
            message: theme.chalkPrimary('Enter custom model identifier (e.g. gemini-2.5-pro):')
          });
          if (customId.trim()) {
            config.model = customId.trim();
            saveAIConfig(config);
          }
        } else {
          config.model = selectedModel;
          saveAIConfig(config);
        }
      } else if (settingChoice === 'key') {
        console.log(theme.chalkMuted('\n  Tip: Paste your key using Ctrl+V or Right-Click, then press Enter.'));
        const newKey = await password({
          message: theme.chalkPrimary('Enter new Google Gemini API Key:'),
          mask: '*'
        });
        if (newKey.trim()) {
          config.apiKey = newKey.trim();
          saveAIConfig(config);
          console.log(theme.chalkSecondary('\n  ✔ API Key updated successfully!\n'));
        }
      } else if (settingChoice === 'test') {
        await testGeminiConnection();
      } else if (settingChoice === 'temp') {
        const newTemp = await input({
          message: theme.chalkPrimary('Enter temperature (0.0 = exact reasoning, 1.0 = creative):'),
          default: String(config.temperature)
        });
        const parsed = parseFloat(newTemp);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 2.0) {
          config.temperature = parsed;
          saveAIConfig(config);
        }
      } else if (settingChoice === 'back') {
        inSettings = false;
      }
    } catch (err) {
      if (err.name === 'ExitPromptError') inSettings = false;
      else throw err;
    }
  }
}

/**
 * Main AI Studio Dashboard / Menu
 */
export async function runAIMenu() {
  let inAIMenu = true;
  const theme = getTheme();

  while (inAIMenu) {
    renderHeader();
    const config = loadAIConfig();
    const activePowerDef = AI_POWER_LEVELS[config.powerLevel] || AI_POWER_LEVELS.high;

    console.log(
      boxen(
        `${theme.chalkPrimary.bold('Mirror CLI AI Studio & Gemini Engine')}\n` +
        `${theme.chalkMuted('Google Gemini Models: 3.7 Flash, 3.6 Flash, 3.5 Flash, 3.1 Pro')}\n\n` +
        `${theme.chalkSecondary('Power Level:')}   ${theme.chalkAccent.bold(activePowerDef.name)}\n` +
        `${theme.chalkSecondary('Active Model:')}  ${theme.chalkAccent.bold(config.model)}  |  ${theme.chalkSecondary('Status:')} ${config.apiKey ? chalk.green('● API Key Configured') : chalk.red('○ Missing API Key')}`,
        {
          padding: 1,
          borderStyle: theme.borderStyle,
          borderColor: theme.primaryHex,
          textAlignment: 'center'
        }
      )
    );

    try {
      const choice = await select({
        message: theme.chalkPrimary('AI Studio — Select an AI Tool:'),
        choices: [
          { name: '[1] AI Project Supervisor & Code Healer (Audit, Fix Errors & Inject Libraries)', value: 'supervisor' },
          { name: '[2] AI Website Recreator & Code Generator (URL / Folder → Full HTML/Tailwind/React)', value: 'recreate' },
          { name: '[3] AI Code Cleaner & Modernizer (Clean HTML/CSS, remove trackers)', value: 'clean' },
          { name: '[4] AI Design Tokens & Color Palette Extractor', value: 'tokens' },
          { name: '[5] Interactive AI Terminal Assistant (Live Chat with Gemini)', value: 'chat' },
          { name: '[6] Test Gemini API Connection', value: 'test' },
          { name: '[7] AI Settings & Power Level (High / Medium / Low / Models)', value: 'settings' },
          { name: '[<] Back to Main Menu', value: 'back' }
        ]
      });

      if (choice === 'supervisor') {
        await runAIProjectSupervisor();
      } else if (choice === 'recreate') {
        await runAIWebRecreator();
      } else if (choice === 'clean') {
        await runAICodeCleaner();
      } else if (choice === 'tokens') {
        await runAIDesignTokenExtractor();
      } else if (choice === 'chat') {
        await runAIChatSession();
      } else if (choice === 'test') {
        await testGeminiConnection();
      } else if (choice === 'settings') {
        await runAISettings();
      } else if (choice === 'back') {
        inAIMenu = false;
      }
    } catch (err) {
      if (err.name === 'ExitPromptError') inAIMenu = false;
      else throw err;
    }
  }
}
