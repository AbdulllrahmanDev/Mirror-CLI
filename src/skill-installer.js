import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import select from '@inquirer/select';
import input from '@inquirer/input';
import chalk from 'chalk';
import boxen from 'boxen';
import { generateWebsitePromptText } from './prompt-generator.js';

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
    const currentFilePath = fileURLToPath(currentFileUrl);
    const projectRoot = path.resolve(path.dirname(currentFilePath), '..');
    const sourceSkillPath = path.join(projectRoot, 'skills', 'mirror-skill', 'SKILL.md');

    let skillContent = '';
    if (fs.existsSync(sourceSkillPath)) {
      skillContent = fs.readFileSync(sourceSkillPath, 'utf8');
    } else {
      skillContent = `---
name: mirror-skill
description: AI Skill for Mirror CLI & Website Recreation. Triggered when user enters /Mirror or asks to download, mirror, clone, or generate an AI recreation prompt for any website URL.
---

# Mirror Skill - Ultra-Fidelity Website Cloning & Responsive AI Prompt Generator

Use this skill whenever the user invokes /Mirror, or asks to clone, download, mirror, or generate an expressive design/code recreation prompt (website_prompt.md) for any website URL.
`;
    }

    // Write SKILL.md
    const targetSkillPath = path.join(targetDir, 'SKILL.md');
    fs.writeFileSync(targetSkillPath, skillContent, 'utf8');

    // Write sample website_prompt.md template as well so folder is complete
    const samplePromptContent = generateWebsitePromptText('https://coursera.org', 'Full Website');
    const targetPromptPath = path.join(targetDir, 'website_prompt.md');
    fs.writeFileSync(targetPromptPath, samplePromptContent, 'utf8');

    console.log(
      boxen(
        `${chalk.green.bold('✔ Mirror Skill & website_prompt.md Successfully Exported!')}\n\n` +
        `Saved to: ${chalk.cyan(targetDir)}\n` +
        `📄 Skill File: ${chalk.yellow('SKILL.md')}\n` +
        `📝 Sample Prompt: ${chalk.yellow('website_prompt.md')}\n\n` +
        `${chalk.yellow.bold('How to use with AI Agents:')}\n` +
        `1. Type ${chalk.bold('/Mirror <website_url>')} in your AI assistant.\n` +
        `2. The AI will ask you to select Scope (Hero / Page / Site) and Goal.\n` +
        `3. Mirror CLI will generate the full website prompt!`,
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'green'
        }
      )
    );
  } catch (err) {
    if (err.name === 'ExitPromptError') {
      console.log(chalk.yellow('\n  Export cancelled.\n'));
      return;
    }
    console.error(chalk.red(`\n✖ Failed to install skill: ${err.message}`));
  }
}
