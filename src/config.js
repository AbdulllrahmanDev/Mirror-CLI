import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import boxen from 'boxen';
import { select, input } from '@inquirer/prompts';
import { getTheme, renderHeader } from './ui.js';

const SETTINGS_PATH = path.join(os.homedir(), '.mirror-settings.json');

const DEFAULT_SETTINGS = {
  defaultPreset: 'cli', // 'cli' | 'desktop' | 'custom'
  customPath: ''
};

export function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
      return { ...DEFAULT_SETTINGS, ...data };
    }
  } catch { /* fallback */ }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');
  } catch { /* ignore */ }
}

export function resolvePathForDomain(domain, settings = loadSettings()) {
  const { defaultPreset, customPath } = settings;
  if (defaultPreset === 'desktop') {
    return path.join(os.homedir(), 'Desktop', domain).replace(/\\/g, '/');
  }
  if (defaultPreset === 'custom' && customPath) {
    return path.join(customPath, domain).replace(/\\/g, '/');
  }
  return domain;
}

export async function runFolderSettingsWizard() {
  try {
    renderHeader();
    const theme = getTheme();
    const settings = loadSettings();

    let currentLabel = `./<domain> (CLI Project Folder)`;
    if (settings.defaultPreset === 'desktop') currentLabel = `~/Desktop/<domain> (Desktop)`;
    if (settings.defaultPreset === 'custom' && settings.customPath) currentLabel = `${settings.customPath}/<domain> (Custom Path)`;

    console.log(boxen(
      `${theme.chalkSecondary('Current Default Destination:')}  ${chalk.white.bold(currentLabel)}\n` +
      `${theme.chalkSecondary('Settings Location:')}            ${chalk.dim(SETTINGS_PATH)}`,
      {
        padding: 1,
        borderStyle: 'singleDouble',
        borderColor: theme.primaryHex,
        title: theme.chalkPrimary.bold(' [ Download Directory Settings ] '),
        titleAlignment: 'left'
      }
    ));

    const selectedChoice = await select({
      message: theme.chalkPrimary.bold('Select default download destination (Press [ESC] to return):'),
      choices: [
        {
          name: `[1] CLI Project Folder → ./{domain} ${settings.defaultPreset === 'cli' ? chalk.green('(Active Default)') : ''}`,
          value: 'cli'
        },
        {
          name: `[2] Desktop           → ~/Desktop/{domain} ${settings.defaultPreset === 'desktop' ? chalk.green('(Active Default)') : ''}`,
          value: 'desktop'
        },
        {
          name: `[3] Custom Path       → ${settings.customPath ? chalk.dim(`(${settings.customPath})`) : 'Type any custom path...'} ${settings.defaultPreset === 'custom' ? chalk.green('(Active Default)') : ''}`,
          value: 'custom'
        },
        {
          name: `[<] Back to Main Menu`,
          value: 'back'
        }
      ]
    });

    if (selectedChoice === 'back') return;

    if (selectedChoice === 'cli') {
      settings.defaultPreset = 'cli';
      saveSettings(settings);
      console.log(theme.chalkPrimary.bold('\n  ✔ Default download destination set to: CLI Project Folder (./<domain>)\n'));
    } else if (selectedChoice === 'desktop') {
      settings.defaultPreset = 'desktop';
      saveSettings(settings);
      console.log(theme.chalkPrimary.bold('\n  ✔ Default download destination set to: Desktop (~/Desktop/<domain>)\n'));
    } else if (selectedChoice === 'custom') {
      const customVal = await input({
        message: theme.chalkPrimary('Enter custom folder path (e.g. C:/Websites or D:/Projects):'),
        default: settings.customPath || 'C:/Websites',
        validate: (val) => {
          if (!val || !val.trim()) return 'Path cannot be empty.';
          return true;
        }
      });
      settings.defaultPreset = 'custom';
      settings.customPath = customVal.trim().replace(/\\/g, '/');
      saveSettings(settings);
      console.log(theme.chalkPrimary.bold(`\n  ✔ Default download destination set to: ${settings.customPath}/<domain>\n`));
    }

    await new Promise(r => setTimeout(r, 1200));
  } catch (err) {
    if (err.name === 'ExitPromptError') return;
    throw err;
  }
}
