import chalk from 'chalk';
import gradient from 'gradient-string';
import boxen from 'boxen';
import ora from 'ora';
import figlet from 'figlet';
import Table from 'cli-table3';
import { input, number, confirm, select } from '@inquirer/prompts';
import open from 'open';
import fs from 'fs';
import path from 'path';
import { loadHistory, clearHistory } from './history.js';

// RICH & DIVERSE THEMES (Light Coffee & Latte with Solid Block Logo is DEFAULT)
export const THEMES = {
  sage: {
    name: 'Light Coffee & Latte (Calm Default)',
    figletFont: 'ANSI Shadow',
    isSolid: true,
    solidColor: '#C69C6D',
    primaryHex: '#C69C6D',
    secondaryHex: '#A88B70',
    accentHex: '#E9D8A6',
    mutedHex: '#8C7A6B',
    borderStyle: 'round',
    chalkPrimary: chalk.hex('#C69C6D'),
    chalkSecondary: chalk.hex('#A88B70'),
    chalkAccent: chalk.hex('#E9D8A6'),
    chalkMuted: chalk.hex('#8C7A6B')
  },
  nord: {
    name: 'Nordic Frost (Cool Slate)',
    figletFont: 'ANSI Shadow',
    isSolid: true,
    solidColor: '#88C0D0',
    primaryHex: '#88C0D0',
    secondaryHex: '#81A1C1',
    accentHex: '#B48EAD',
    mutedHex: '#7B88A1',
    borderStyle: 'round',
    chalkPrimary: chalk.hex('#88C0D0'),
    chalkSecondary: chalk.hex('#81A1C1'),
    chalkAccent: chalk.hex('#B48EAD'),
    chalkMuted: chalk.hex('#7B88A1')
  },
  tokyoDusk: {
    name: 'Tokyo Dusk (Solid Indigo)',
    figletFont: 'ANSI Shadow',
    isSolid: true,
    solidColor: '#7AA2F7',
    primaryHex: '#7AA2F7',
    secondaryHex: '#7DCFFF',
    accentHex: '#BB9AF7',
    mutedHex: '#565F89',
    borderStyle: 'round',
    chalkPrimary: chalk.hex('#7AA2F7'),
    chalkSecondary: chalk.hex('#7DCFFF'),
    chalkAccent: chalk.hex('#BB9AF7'),
    chalkMuted: chalk.hex('#565F89')
  },
  cyberpunk: {
    name: 'Cyberpunk Neon (Vibrant High Color)',
    figletFont: 'ANSI Shadow',
    isSolid: false,
    gradient: ['#00F2FE', '#4FACFE', '#FF007F', '#7F00FF'],
    primaryHex: '#00F2FE',
    secondaryHex: '#FF007F',
    accentHex: '#7F00FF',
    mutedHex: '#9D4EDD',
    borderStyle: 'double',
    chalkPrimary: chalk.hex('#00F2FE'),
    chalkSecondary: chalk.hex('#FF007F'),
    chalkAccent: chalk.hex('#7F00FF'),
    chalkMuted: chalk.hex('#9D4EDD')
  },
  matrix: {
    name: 'Matrix Obsidian (Ultra Dark)',
    figletFont: 'ANSI Shadow',
    isSolid: true,
    solidColor: '#00FF66',
    primaryHex: '#00FF66',
    secondaryHex: '#00B4D8',
    accentHex: '#52B788',
    mutedHex: '#4895EF',
    borderStyle: 'single',
    chalkPrimary: chalk.hex('#00FF66'),
    chalkSecondary: chalk.hex('#00B4D8'),
    chalkAccent: chalk.hex('#52B788'),
    chalkMuted: chalk.hex('#4895EF')
  },
  sunset: {
    name: 'Amber Flame (High-Contrast Sunset)',
    figletFont: 'ANSI Shadow',
    isSolid: false,
    gradient: ['#FF512F', '#DD2476', '#F09819', '#FF8008'],
    primaryHex: '#FF512F',
    secondaryHex: '#F09819',
    accentHex: '#FF8008',
    mutedHex: '#DD2476',
    borderStyle: 'round',
    chalkPrimary: chalk.hex('#FF512F'),
    chalkSecondary: chalk.hex('#F09819'),
    chalkAccent: chalk.hex('#FF8008'),
    chalkMuted: chalk.hex('#DD2476')
  },
  monochrome: {
    name: 'Minimalist High-Contrast (Clean White)',
    figletFont: 'ANSI Shadow',
    isSolid: true,
    solidColor: '#FFFFFF',
    primaryHex: '#FFFFFF',
    secondaryHex: '#E0E0E0',
    accentHex: '#FFFFFF',
    mutedHex: '#888888',
    borderStyle: 'single',
    chalkPrimary: chalk.hex('#FFFFFF').bold,
    chalkSecondary: chalk.hex('#E0E0E0'),
    chalkAccent: chalk.hex('#FFFFFF'),
    chalkMuted: chalk.hex('#888888')
  }
};

let currentThemeKey = 'sage';

export function getTheme() {
  return THEMES[currentThemeKey] || THEMES.sage;
}

export function setTheme(themeKey) {
  if (THEMES[themeKey]) {
    currentThemeKey = themeKey;
  }
}

export function renderHeader() {
  console.clear();
  const theme = getTheme();
  const fontName = theme.figletFont || 'Standard';
  
  let asciiText = '';
  try {
    asciiText = figlet.textSync('MIRROR CLI', { font: fontName });
  } catch {
    asciiText = figlet.textSync('MIRROR CLI', { font: 'Standard' });
  }

  let styledAscii = '';
  if (theme.isSolid) {
    styledAscii = chalk.hex(theme.solidColor || theme.primaryHex).bold(asciiText);
  } else {
    const titleGradient = gradient(theme.gradient);
    styledAscii = titleGradient(asciiText);
  }
  
  const subtitle = theme.chalkPrimary.bold('  Website Cloner & Offline Downloader') + theme.chalkMuted(' | v1.2.9');
  const banner = `${styledAscii}\n${subtitle}`;

  console.log(
    boxen(banner, {
      padding: 1,
      margin: { top: 0, bottom: 1 },
      borderStyle: theme.borderStyle,
      borderColor: theme.primaryHex,
      textAlignment: 'center'
    })
  );
}

export async function showMainMenu() {
  renderHeader();
  const theme = getTheme();

  try {
    const choice = await select({
      message: theme.chalkPrimary.bold('Main Menu — Select an option (Press [ESC] to exit):'),
      choices: [
        { name: '>  Quick Download (URL only)', value: 'quick' },
        { name: '*  Advanced Download Wizard', value: 'advanced' },
        { name: 'p  Generate AI Prompt (website_prompt.md for any URL)', value: 'prompt' },
        { name: '+  Export AI Skill (SKILL.md / /Mirror agent command)', value: 'skill' },
        { name: '@  Select Color Theme', value: 'theme' },
        { name: '#  View Download History', value: 'history' },
        { name: '?  Help & Usage Guide', value: 'help' },
        { name: 'x  Exit', value: 'exit' }
      ]
    });
    return choice;
  } catch (err) {
    if (err.name === 'ExitPromptError') {
      console.log('\n  Goodbye!\n');
      process.exit(0);
    }
    throw err;
  }
}

export async function renderHelp(interactive = false) {
  renderHeader();
  const theme = getTheme();
  
  const overview = theme.chalkPrimary.bold('[ About Mirror CLI ]\n') +
    '  Mirror CLI is a fast tool to clone any website for offline viewing.\n' +
    '  It downloads HTML pages, images, stylesheets, scripts, and web fonts,\n' +
    '  then rewrites all internal links so you can browse the site offline.\n';

  const quickStart = theme.chalkPrimary.bold('\n[ Getting Started (2 Easy Ways) ]\n') +
    `  ${theme.chalkAccent('1. Interactive Dashboard (No setup required)')}\n` +
    `     Run: ${theme.chalkSecondary('node index.js')}\n` +
    `     Follow the step-by-step menu prompts.\n\n` +
    `  ${theme.chalkAccent('2. One-Line Direct Command')}\n` +
    `     Run: ${theme.chalkSecondary('node index.js https://example.com')}`;

  const options = theme.chalkPrimary.bold('\n[ Command Options & Flags ]\n') +
    `  ${theme.chalkSecondary('-o, --output <dir>')}    ${chalk.white('Folder name to save files')} ${theme.chalkMuted('(default: site domain)')}\n` +
    `  ${theme.chalkSecondary('-d, --depth <num>')}     ${chalk.white('Crawl depth (1=home page, 3=standard, 5=deep)')}\n` +
    `  ${theme.chalkSecondary('--theme <name>')}      ${chalk.white('Color theme (sage, nord, cyberpunk, matrix, sunset...)')}\n` +
    `  ${theme.chalkSecondary('--no-zip')}              ${chalk.white('Skip creating the compressed .zip archive package')}\n` +
    `  ${theme.chalkSecondary('--verbose')}             ${chalk.white('Show live download logs & detailed diagnostics')}\n` +
    `  ${theme.chalkSecondary('-h, --help')}              ${chalk.white('Display this detailed help & usage guide')}`;

  const phases = theme.chalkPrimary.bold('\n[ How the Download Process Works ]\n') +
    `  ${theme.chalkSecondary('[1/4] Crawling')}   ${theme.chalkMuted('Discovers website pages using headless browser')}\n` +
    `  ${theme.chalkSecondary('[2/4] Assets')}     ${theme.chalkMuted('Downloads images, CSS, JavaScript files & web fonts')}\n` +
    `  ${theme.chalkSecondary('[3/4] Rewriting')}  ${theme.chalkMuted('Converts web URLs to local relative paths')}\n` +
    `  ${theme.chalkSecondary('[4/4] Archive')}    ${theme.chalkMuted('Packs the site into a single compressed .zip file')}`;

  const examples = theme.chalkPrimary.bold('\n[ Helpful Usage Examples ]\n') +
    `  ${theme.chalkMuted('# Clone homepage only (-d 1)')}\n` +
    `  ${theme.chalkAccent('node index.js')} ${chalk.underline('https://example.com')} ${theme.chalkSecondary('-d')} 1\n\n` +
    `  ${theme.chalkMuted('# Save to a custom folder named "my-site"')}\n` +
    `  ${theme.chalkAccent('node index.js')} ${chalk.underline('https://example.com')} ${theme.chalkSecondary('-o')} my-site\n\n` +
    `  ${theme.chalkMuted('# Download with Matrix dark theme and verbose logs')}\n` +
    `  ${theme.chalkAccent('node index.js')} ${chalk.underline('https://example.com')} ${theme.chalkSecondary('--theme')} matrix ${theme.chalkSecondary('--verbose')}`;

  console.log(
    boxen(`${overview}${quickStart}\n${options}\n${phases}\n${examples}`, {
      padding: 1,
      borderStyle: 'singleDouble',
      borderColor: theme.secondaryHex,
      title: theme.chalkPrimary.bold(' [ Help & Beginner Usage Guide ] '),
      titleAlignment: 'left'
    })
  );

  if (interactive) {
    try {
      console.log(theme.chalkAccent('\n  Navigation:'));
      await input({ message: theme.chalkPrimary('  ↵ Press [ENTER] to return to Main Menu') });
    } catch (err) {
      if (err.name === 'ExitPromptError') return;
      throw err;
    }
  }
}

export async function runThemeSelector() {
  renderHeader();
  const currentTheme = getTheme();
  
  try {
    const choices = Object.keys(THEMES).map((key) => {
      const t = THEMES[key];
      const isCurrent = key === currentThemeKey ? ' (Active)' : '';
      return {
        name: `@  ${t.name}${isCurrent}`,
        value: key
      };
    });

    const selectedTheme = await select({
      message: currentTheme.chalkPrimary.bold('Select a visual color theme (Press [ESC] to go back):'),
      choices
    });

    setTheme(selectedTheme);
    renderHeader();
    console.log(THEMES[selectedTheme].chalkPrimary.bold(`\n  Theme changed to "${THEMES[selectedTheme].name}"!\n`));
  } catch (err) {
    if (err.name === 'ExitPromptError') return;
    throw err;
  }
}

export async function runInteractiveWizard(advanced = false) {
  renderHeader();
  const theme = getTheme();
  
  console.log(theme.chalkPrimary.bold(`> ${advanced ? 'Advanced' : 'Quick'} Download Wizard (Press [ESC] at any time to return to Main Menu)\n`));
  
  try {
    const urlAnswer = await input({
      message: 'Enter target Website URL:',
      validate: (val) => {
        try {
          new URL(val.startsWith('http') ? val : `https://${val}`);
          return true;
        } catch {
          return 'Please enter a valid HTTP or HTTPS URL';
        }
      }
    });

    const formattedUrl = urlAnswer.startsWith('http') ? urlAnswer : `https://${urlAnswer}`;
    const defaultDomain = new URL(formattedUrl).hostname;

    let outputDir = defaultDomain;
    let maxDepth = 3;
    let createZip = true;
    let verbose = false;

    if (advanced) {
      outputDir = await input({
        message: 'Output directory path:',
        default: defaultDomain
      });

      maxDepth = await number({
        message: 'Max crawl depth (1 to 10):',
        default: 3,
        min: 1,
        max: 10
      });

      createZip = await confirm({
        message: 'Create a compressed ZIP archive after download?',
        default: true
      });

      verbose = await confirm({
        message: 'Enable verbose diagnostic logging?',
        default: false
      });
    }

    return {
      url: formattedUrl,
      outputDir,
      maxDepth,
      skipZip: !createZip,
      verbose
    };
  } catch (err) {
    if (err.name === 'ExitPromptError') {
      console.log(theme.chalkMuted('\n  Wizard cancelled. Returning to Main Menu...\n'));
      return null;
    }
    throw err;
  }
}

export function renderConfigSummary({ url, outPath, maxDepth, skipZip, verbose }) {
  const theme = getTheme();
  const content = 
    `${theme.chalkPrimary.bold('Target URL:')}    ${chalk.white(url)}\n` +
    `${theme.chalkPrimary.bold('Output Path:')}   ${chalk.white(outPath)}\n` +
    `${theme.chalkPrimary.bold('Max Depth:')}     ${chalk.white(maxDepth)}\n` +
    `${theme.chalkPrimary.bold('ZIP Archive:')}   ${skipZip ? theme.chalkMuted('Disabled') : theme.chalkSecondary('Enabled')}\n` +
    `${theme.chalkPrimary.bold('Theme Palette:')} ${theme.chalkAccent(theme.name)}\n` +
    `${theme.chalkPrimary.bold('Verbose Mode:')}  ${verbose ? theme.chalkAccent('Enabled') : theme.chalkMuted('Disabled')}`;

  console.log(
    boxen(content, {
      padding: { top: 0, bottom: 0, left: 1, right: 1 },
      margin: { top: 0, bottom: 1 },
      borderStyle: 'round',
      borderColor: theme.secondaryHex,
      title: theme.chalkPrimary.bold(' [ Configuration ] '),
      titleAlignment: 'left'
    })
  );
}

export function createSpinner(initialText) {
  return ora({
    text: initialText,
    color: 'cyan',
    spinner: 'dots'
  });
}

export function renderSummaryTable({ pagesCount, assetsCount, categoryTelemetry, outPath, zipPath, durationMs, skipZip }) {
  const theme = getTheme();
  console.log('\n');

  const mainTable = new Table({
    head: [theme.chalkPrimary.bold('Metric'), theme.chalkPrimary.bold('Details')],
    colWidths: [22, 55],
    style: { head: [], border: ['gray'] }
  });

  mainTable.push(
    [chalk.bold('Total Pages'), theme.chalkSecondary(`${pagesCount} page(s)`)],
    [chalk.bold('Total Assets'), theme.chalkSecondary(`${assetsCount} asset(s)`)],
    [chalk.bold('Output Directory'), chalk.white(outPath)],
    [
      chalk.bold('ZIP Archive'),
      skipZip || !zipPath
        ? theme.chalkMuted('Skipped')
        : theme.chalkAccent(`${zipPath} (${getFileSize(zipPath)})`)
    ],
    [chalk.bold('Time Elapsed'), theme.chalkPrimary(`${(durationMs / 1000).toFixed(2)}s`)]
  );

  console.log(
    boxen(mainTable.toString(), {
      padding: 0,
      borderStyle: 'double',
      borderColor: theme.primaryHex,
      title: theme.chalkPrimary.bold(' [ Download Completed ] '),
      titleAlignment: 'center'
    })
  );

  if (categoryTelemetry) {
    const catTable = new Table({
      head: [
        theme.chalkPrimary.bold('Category'),
        theme.chalkPrimary.bold('Files'),
        theme.chalkPrimary.bold('Size')
      ],
      colWidths: [22, 15, 20],
      style: { head: [], border: ['gray'] }
    });

    for (const [key, item] of Object.entries(categoryTelemetry)) {
      if (item.count > 0) {
        catTable.push([
          `- ${item.name}`,
          chalk.white(`${item.count}`),
          theme.chalkMuted(formatBytes(item.size))
        ]);
      }
    }

    console.log(
      boxen(catTable.toString(), {
        padding: 0,
        margin: { top: 0, bottom: 1 },
        borderStyle: 'round',
        borderColor: theme.secondaryHex,
        title: theme.chalkSecondary.bold(' [ Asset Breakdown ] '),
        titleAlignment: 'left'
      })
    );
  }
}

export async function promptBrowserPreview(outPath) {
  const theme = getTheme();
  const indexPath = path.join(outPath, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    try {
      const shouldOpen = await confirm({
        message: 'Would you like to open the cloned site in your default web browser now?',
        default: true
      });

      if (shouldOpen) {
        console.log(theme.chalkPrimary(`\n  Opening ${indexPath} in browser...`));
        await open(indexPath);
      }
    } catch (err) {
      if (err.name === 'ExitPromptError') return;
      throw err;
    }
  }
}

export async function showHistoryView() {
  renderHeader();
  const theme = getTheme();
  const history = loadHistory();

  if (history.length === 0) {
    console.log(
      boxen(theme.chalkMuted('No past downloads found in history.'), {
        padding: 1,
        borderStyle: 'round',
        borderColor: theme.mutedHex,
        title: theme.chalkPrimary.bold(' [ Download History ] ')
      })
    );
  } else {
    const historyTable = new Table({
      head: [
        theme.chalkPrimary.bold('#'),
        theme.chalkPrimary.bold('Target URL'),
        theme.chalkPrimary.bold('Pages'),
        theme.chalkPrimary.bold('Assets'),
        theme.chalkPrimary.bold('Date')
      ],
      colWidths: [5, 32, 10, 10, 18],
      style: { head: [], border: ['gray'] }
    });

    history.forEach((h, idx) => {
      const dateStr = new Date(h.timestamp).toLocaleDateString();
      historyTable.push([
        chalk.dim(`${idx + 1}`),
        theme.chalkAccent(h.url.length > 28 ? h.url.slice(0, 25) + '...' : h.url),
        chalk.white(h.pagesCount),
        chalk.white(h.assetsCount),
        theme.chalkMuted(dateStr)
      ]);
    });

    console.log(
      boxen(historyTable.toString(), {
        padding: 0,
        borderStyle: 'double',
        borderColor: theme.primaryHex,
        title: theme.chalkPrimary.bold(` [ Recent Downloads (${history.length}) ] `),
        titleAlignment: 'left'
      })
    );
  }

  try {
    const action = await select({
      message: theme.chalkPrimary.bold('History Options (Press [ESC] to return):'),
      choices: [
        { name: '<  Return to Main Menu', value: 'back' },
        { name: 'x  Clear History Log', value: 'clear' }
      ]
    });

    if (action === 'clear') {
      clearHistory();
      console.log(theme.chalkPrimary('\n  History log cleared successfully.'));
      await new Promise(r => setTimeout(r, 1000));
    }
  } catch (err) {
    if (err.name === 'ExitPromptError') return;
    throw err;
  }
}

export function renderError(error, verbose = false) {
  const theme = getTheme();
  const msg = `${chalk.bold.red('Error:')} ${error.message}`;
  const detail = verbose && error.stack ? `\n\n${theme.chalkMuted(error.stack)}` : '';

  console.log(
    boxen(`${msg}${detail}`, {
      padding: 1,
      borderStyle: 'round',
      borderColor: 'red',
      title: chalk.bold.red(' [ Operation Failed ] '),
      titleAlignment: 'left'
    })
  );
}

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return formatBytes(stats.size);
  } catch {
    return 'N/A';
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
