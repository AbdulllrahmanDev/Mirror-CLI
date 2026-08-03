import fs from 'fs';
import path from 'path';
import os from 'os';
import fileURLToPath from 'url';
import select from '@inquirer/select';
import input from '@inquirer/input';
import chalk from 'chalk';
import boxen from 'boxen';

export async function runSkillInstaller() {
  console.log(chalk.cyan.bold('\n🤖 Mirror CLI - AI Skill Exporter & Installer\n'));

  const homeDir = os.homedir();
  const defaultGlobalSkills = path.join(homeDir, '.gemini', 'config', 'skills', 'mirror-skill');
  const defaultProjectSkills = path.join(process.cwd(), '.agents', 'skills', 'mirror-skill');
  const defaultDesktopSkills = path.join(homeDir, 'Desktop', 'mirror-skill');

  const locationChoice = await select({
    message: 'Where would you like to export/install the Mirror AI Skill?',
    choices: [
      {
        name: `Global Agent Skills (${chalk.dim(defaultGlobalSkills)})`,
        value: 'global'
      },
      {
        name: `Project Workspace (${chalk.dim(defaultProjectSkills)})`,
        value: 'project'
      },
      {
        name: `Desktop Folder (${chalk.dim(defaultDesktopSkills)})`,
        value: 'desktop'
      },
      {
        name: 'Custom Directory...',
        value: 'custom'
      }
    ]
  });

  let targetDir = '';
  if (locationChoice === 'global') {
    targetDir = defaultGlobalSkills;
  } else if (locationChoice === 'project') {
    targetDir = defaultProjectSkills;
  } else if (locationChoice === 'desktop') {
    targetDir = defaultDesktopSkills;
  } else {
    targetDir = await input({
      message: 'Enter absolute path for skill installation directory:',
      default: defaultDesktopSkills
    });
  }

  try {
    fs.mkdirSync(targetDir, { recursive: true });

    // Locate SKILL.md template
    const currentFileUrl = import.meta.url;
    const currentFilePath = fileURLToPath ? fileURLToPath(currentFileUrl) : path.resolve('./src/skill-installer.js');
    const projectRoot = path.resolve(path.dirname(currentFilePath), '..');
    const sourceSkillPath = path.join(projectRoot, 'skills', 'mirror-skill', 'SKILL.md');

    let skillContent = '';
    if (fs.existsSync(sourceSkillPath)) {
      skillContent = fs.readFileSync(sourceSkillPath, 'utf8');
    } else {
      skillContent = `---
name: mirror-skill
description: AI Skill for Mirror CLI. Triggered when user enters /Mirror or asks to download, mirror, clone, or generate an AI recreation prompt for any website URL.
---

# Mirror Skill - Website Cloning & AI Prompt Generator

Use this skill whenever the user invokes /Mirror, or asks to clone, download, mirror, or generate a design/code recreation prompt for a website or URL.
`;
    }

    const targetFilePath = path.join(targetDir, 'SKILL.md');
    fs.writeFileSync(targetFilePath, skillContent, 'utf8');

    console.log(
      boxen(
        `${chalk.green.bold('✔ Skill Successfully Exported!')}\n\n` +
        `Saved to: ${chalk.cyan(targetFilePath)}\n\n` +
        `${chalk.yellow.bold('How to use with AI Agents:')}\n` +
        `1. Type ${chalk.bold('/Mirror <website_url>')} in your AI assistant.\n` +
        `2. The AI will ask you to select Scope (Hero / Page / Site), Goal (Download / Prompt), and Target path.\n` +
        `3. Mirror CLI will execute or generate the requested prompt!`,
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'green'
        }
      )
    );
  } catch (err) {
    console.error(chalk.red(`\n✖ Failed to install skill: ${err.message}`));
  }
}
