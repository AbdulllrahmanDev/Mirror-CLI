import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * Installs the Mirror Skill globally into Antigravity IDE configuration
 */
export function installMirrorSkill() {
  const globalSkillDir = path.join(os.homedir(), '.gemini', 'config', 'skills', 'mirror-skill');
  const sourceSkillDir = path.join(projectRoot, '.agents', 'skills', 'mirror-skill');

  try {
    if (!fs.existsSync(sourceSkillDir)) {
      console.error(`❌ Source skill directory not found at: ${sourceSkillDir}`);
      return false;
    }

    if (!fs.existsSync(globalSkillDir)) {
      fs.mkdirSync(globalSkillDir, { recursive: true });
    }

    fs.cpSync(sourceSkillDir, globalSkillDir, { recursive: true, force: true });
    console.log('✅ Mirror Skill installed successfully into Antigravity IDE!');
    console.log(`   Global Skill Path: ${path.join(globalSkillDir, 'SKILL.md')}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to install Mirror Skill:', error.message);
    return false;
  }
}

// Execute if run directly
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  installMirrorSkill();
}
