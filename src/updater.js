import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import boxen from 'boxen';
import ora from 'ora';
import { confirm, input } from '@inquirer/prompts';
import { getTheme, renderHeader } from './ui.js';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const GITHUB_REPO_RAW = 'https://raw.githubusercontent.com/AbdulllrahmanDev/Mirror-CLI/main/package.json';
const GITHUB_REPO_API = 'https://api.github.com/repos/AbdulllrahmanDev/Mirror-CLI/releases/latest';

/**
 * Get locally installed version
 */
export function getLocalVersion() {
  try {
    const pkgPath = path.join(projectRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      return pkg.version || '1.3.0';
    }
  } catch {
    // fallback
  }
  return '1.3.0';
}

/**
 * Compares two semantic version strings (returns 1 if v2 > v1, 0 if equal, -1 if v1 > v2)
 */
export function compareVersions(v1, v2) {
  const p1 = v1.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  const p2 = v2.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const n1 = p1[i] || 0;
    const n2 = p2[i] || 0;
    if (n2 > n1) return 1;
    if (n1 > n2) return -1;
  }
  return 0;
}

/**
 * Fetches latest remote version from GitHub
 */
export async function getRemoteVersion() {
  try {
    const res = await fetch(GITHUB_REPO_RAW, {
      headers: {
        'User-Agent': 'Mirror-CLI-Updater'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (res.ok) {
      const data = await res.json();
      return {
        version: data.version || '1.3.0',
        description: data.description || '',
        repo: 'https://github.com/AbdulllrahmanDev/Mirror-CLI'
      };
    }
  } catch {
    // try fallback release API
    try {
      const res = await fetch(GITHUB_REPO_API, {
        headers: { 'User-Agent': 'Mirror-CLI-Updater' },
        signal: AbortSignal.timeout(10000)
      });
      if (res.ok) {
        const release = await res.json();
        return {
          version: release.tag_name ? release.tag_name.replace(/^v/, '') : '1.3.0',
          description: release.body || '',
          repo: 'https://github.com/AbdulllrahmanDev/Mirror-CLI'
        };
      }
    } catch {
      // ignore
    }
  }
  return null;
}

/**
 * Main Update Wizard
 */
export async function runUpdateWizard(interactive = true) {
  const theme = getTheme();
  renderHeader();

  console.log(theme.chalkPrimary.bold('\n[ Mirror CLI GitHub Update Manager ]\n'));
  const spinner = ora('Checking GitHub for the latest version of Mirror CLI...').start();

  const localVer = getLocalVersion();
  const remoteInfo = await getRemoteVersion();

  if (!remoteInfo) {
    spinner.warn(`Could not reach GitHub. Currently installed version: v${localVer}`);
    console.log(theme.chalkMuted('  Please check your internet connection or visit https://github.com/AbdulllrahmanDev/Mirror-CLI\n'));
    if (interactive) {
      await input({ message: theme.chalkPrimary('↵ Press [ENTER] to return to Main Menu') });
    }
    return false;
  }

  const remoteVer = remoteInfo.version;
  const isUpdateAvailable = compareVersions(localVer, remoteVer) > 0;

  if (!isUpdateAvailable) {
    spinner.succeed(`You are using the latest version of Mirror CLI (v${localVer})!`);
    console.log('\n' + boxen(
      `${theme.chalkSecondary('Current Version:')}  ${chalk.green.bold('v' + localVer)}\n` +
      `${theme.chalkSecondary('GitHub Version:')}   ${chalk.white('v' + remoteVer)}\n` +
      `${theme.chalkSecondary('Status:')}           ${chalk.green('✔ UP TO DATE')}\n` +
      `${theme.chalkSecondary('Repository:')}       ${chalk.underline('https://github.com/AbdulllrahmanDev/Mirror-CLI')}`,
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: theme.secondaryHex
      }
    ));

    const forceReinstall = await confirm({
      message: theme.chalkPrimary('Would you like to force refresh/re-link local dependencies and Antigravity Skill?'),
      default: false
    });

    if (forceReinstall) {
      const refreshSpin = ora('Refreshing dependencies & registering skill...').start();
      try {
        execSync('npm link --force', { cwd: projectRoot, stdio: 'ignore' });
        const skillScript = path.join(projectRoot, 'scripts', 'install-skill.js');
        if (fs.existsSync(skillScript)) {
          execSync(`node "${skillScript}"`, { cwd: projectRoot, stdio: 'ignore' });
        }
        refreshSpin.succeed('Dependencies refreshed and Antigravity Skill re-registered!');
      } catch (err) {
        refreshSpin.fail('Refresh failed: ' + err.message);
      }
    }

    if (interactive) {
      await input({ message: theme.chalkPrimary('↵ Press [ENTER] to return to Main Menu') });
    }
    return true;
  }

  // Update Available
  spinner.stop();
  console.log('\n' + boxen(
    `${theme.chalkAccent.bold('🚀 A New Version of Mirror CLI is Available!')}\n\n` +
    `${theme.chalkSecondary('Current Version:')}  ${chalk.red('v' + localVer)}\n` +
    `${theme.chalkSecondary('Latest Version: ')}  ${chalk.green.bold('v' + remoteVer)}\n` +
    `${theme.chalkSecondary('Repository:    ')}  ${chalk.white('AbdulllrahmanDev/Mirror-CLI')}`,
    {
      padding: 1,
      borderStyle: theme.borderStyle,
      borderColor: theme.primaryHex,
      title: ' [ Update Available ] ',
      titleAlignment: 'left'
    }
  ));

  const shouldUpdate = await confirm({
    message: theme.chalkPrimary(`Do you want to update Mirror CLI to v${remoteVer} now?`),
    default: true
  });

  if (!shouldUpdate) {
    console.log(theme.chalkMuted('\n  Update cancelled.\n'));
    if (interactive) {
      await input({ message: theme.chalkPrimary('↵ Press [ENTER] to return to Main Menu') });
    }
    return false;
  }

  const updateSpinner = ora(`Updating Mirror CLI to v${remoteVer}...`).start();

  try {
    const isGitRepo = fs.existsSync(path.join(projectRoot, '.git'));
    if (isGitRepo) {
      updateSpinner.text = `Pulling latest changes from GitHub repository...`;
      try {
        execSync('git pull origin main', { cwd: projectRoot, stdio: 'ignore' });
      } catch {
        execSync('git pull', { cwd: projectRoot, stdio: 'ignore' });
      }
    } else {
      updateSpinner.text = `Installing latest release globally via npm...`;
      execSync('npm install -g git+https://github.com/AbdulllrahmanDev/Mirror-CLI.git', { stdio: 'ignore' });
    }

    updateSpinner.text = `Installing packages & linking binary...`;
    execSync('npm install', { cwd: projectRoot, stdio: 'ignore' });
    execSync('npm link --force', { cwd: projectRoot, stdio: 'ignore' });

    // Sync global skill
    const skillScript = path.join(projectRoot, 'scripts', 'install-skill.js');
    if (fs.existsSync(skillScript)) {
      execSync(`node "${skillScript}"`, { cwd: projectRoot, stdio: 'ignore' });
    }

    updateSpinner.succeed(`Mirror CLI updated successfully to v${remoteVer}!`);

    console.log('\n' + boxen(
      `${theme.chalkSecondary('New Version:')}     ${chalk.green.bold('v' + remoteVer)}\n` +
      `${theme.chalkSecondary('Status:')}          ${chalk.green('✔ Updated & Linked Successfully')}\n` +
      `${theme.chalkSecondary('Antigravity Skill:')} ${chalk.green('✔ Re-registered in IDE')}`,
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: theme.primaryHex,
        title: theme.chalkPrimary.bold(' [ Update Complete ] '),
        titleAlignment: 'left'
      }
    ));

  } catch (err) {
    updateSpinner.fail(`Update failed: ${err.message}`);
    console.log(theme.chalkMuted(`\n  You can manually update with: git pull && npm install && npm link --force\n`));
  }

  if (interactive) {
    await input({ message: theme.chalkPrimary('↵ Press [ENTER] to return to Main Menu') });
  }
  return true;
}
