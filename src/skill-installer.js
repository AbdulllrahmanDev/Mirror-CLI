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
  console.log(chalk.cyan.bold('\n🤖 Mirror CLI - Universal AI Skill Exporter & IDE Installer\n'));
  console.log(chalk.dim('  Compatible with Cursor, Windsurf, Antigravity, Claude Code, GitHub Copilot, Cline & Roo Code.\n'));

  const homeDir = os.homedir();
  const cwd = process.cwd();

  const ideChoices = [
    {
      name: `[1] Universal Agent Standard / Antigravity (${chalk.dim('.agents/skills/mirror-skill')})`,
      value: 'agents'
    },
    {
      name: `[2] Cursor IDE (${chalk.dim('.cursor/rules/mirror-skill.mdc')})`,
      value: 'cursor'
    },
    {
      name: `[3] Windsurf IDE / Cascade (${chalk.dim('.windsurfrules & .windsurf/rules/')})`,
      value: 'windsurf'
    },
    {
      name: `[4] Claude Code & Anthropic CLI (${chalk.dim('.claude/skills/mirror-skill/')})`,
      value: 'claude'
    },
    {
      name: `[5] GitHub Copilot & Workspace (${chalk.dim('.github/copilot-instructions.md')})`,
      value: 'copilot'
    },
    {
      name: `[6] Global User Profile (${chalk.dim('~/.gemini/config/skills/mirror-skill')})`,
      value: 'global'
    },
    {
      name: `[7] Desktop Folder (${chalk.dim('~/Desktop/mirror-skill')})`,
      value: 'desktop'
    },
    {
      name: `[8] Custom Directory Path...`,
      value: 'custom'
    }
  ];

  const choice = await select({
    message: 'Select your target AI IDE / Environment:',
    choices: ideChoices
  });

  let targetDir = '';
  let targetFileName = 'SKILL.md';

  if (choice === 'agents') {
    targetDir = path.join(cwd, '.agents', 'skills', 'mirror-skill');
  } else if (choice === 'cursor') {
    targetDir = path.join(cwd, '.cursor', 'rules');
    targetFileName = 'mirror-skill.mdc';
  } else if (choice === 'windsurf') {
    targetDir = path.join(cwd, '.windsurf', 'rules');
    targetFileName = 'mirror-skill.md';
  } else if (choice === 'claude') {
    targetDir = path.join(cwd, '.claude', 'skills', 'mirror-skill');
  } else if (choice === 'copilot') {
    targetDir = path.join(cwd, '.github');
    targetFileName = 'copilot-instructions.md';
  } else if (choice === 'global') {
    targetDir = path.join(homeDir, '.gemini', 'config', 'skills', 'mirror-skill');
  } else if (choice === 'desktop') {
    targetDir = path.join(homeDir, 'Desktop', 'mirror-skill');
  } else {
    targetDir = await input({
      message: 'Enter absolute destination directory:',
      default: path.join(homeDir, 'Desktop', 'mirror-skill')
    });
  }

  try {
    fs.mkdirSync(targetDir, { recursive: true });

    // Locate source SKILL.md template
    const currentFileUrl = import.meta.url;
    const currentFilePath = fileURLToPath(currentFileUrl);
    const projectRoot = path.resolve(path.dirname(currentFilePath), '..');
    const sourceSkillPath = path.join(projectRoot, '.agents', 'skills', 'mirror-skill', 'SKILL.md');

    let skillContent = '';
    if (fs.existsSync(sourceSkillPath)) {
      skillContent = fs.readFileSync(sourceSkillPath, 'utf8');
    } else {
      skillContent = `---
name: mirror-skill
description: Universal AI Skill for Mirror CLI & Website Recreation with Active Monitoring & Auto-Self-Healing. Triggered when user enters /Mirror or asks to download, mirror, clone, or generate an AI recreation prompt (site_details.md) for any website URL.
---

# Mirror Skill - Ultra-Fidelity Website Cloning & Responsive AI Prompt Generator

Use this skill whenever the user invokes \`/Mirror\`, or asks to clone, download, mirror, or generate an expressive design/code recreation prompt (\`site_details.md\`) for any website URL.
`;
    }

    // Write primary skill / rule file
    const targetSkillPath = path.join(targetDir, targetFileName);
    fs.writeFileSync(targetSkillPath, skillContent, 'utf8');

    // Write sample site_details.md template
    const samplePromptContent = generateWebsitePromptText('https://example.com', 'Full Website');
    const targetPromptPath = path.join(targetDir, 'site_details.md');
    fs.writeFileSync(targetPromptPath, samplePromptContent, 'utf8');

    console.log(
      boxen(
        `${chalk.green.bold('✔ Universal AI Skill Successfully Installed & Exported!')}\n\n` +
        `📁 Location: ${chalk.cyan(targetDir)}\n` +
        `📄 Skill File: ${chalk.yellow(targetFileName)}\n` +
        `📝 Master Template: ${chalk.yellow('site_details.md')}\n\n` +
        `${chalk.yellow.bold('How to use in ANY AI IDE (Cursor, Windsurf, Claude Code, Antigravity, Copilot):')}\n` +
        `1. Type ${chalk.bold('/Mirror <website_url>')} or ask: "Clone this website using Mirror".\n` +
        `2. The AI Agent will invoke Mirror CLI and auto-supervise the download.\n` +
        `3. Pixel-perfect offline assets & ${chalk.bold('site_details.md')} will be generated automatically!`,
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
