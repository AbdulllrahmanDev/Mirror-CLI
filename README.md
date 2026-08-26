# 🚀 Mirror CLI & Antigravity Skill

> **Ultra-Fidelity Website Cloner & AI Engineering Suite.**  
> Mirror any website with 100% pixel-perfect accuracy, AI-powered code recreation, design token extraction, and Google Gemini integration (3.7 / 3.6 / 3.5 Flash & 3.1 Pro).

---

## ⚡ Quick One-Line Web Installer

You can install **Mirror CLI** and automatically register the **Antigravity AI Skill** directly from GitHub with a single command:

### 🔷 Windows (PowerShell):
```powershell
iwr -useb https://raw.githubusercontent.com/AbdulllrahmanDev/Mirror-CLI/main/scripts/install.ps1 | iex
```

### 🔶 Linux / macOS (Terminal):
```bash
curl -fsSL https://raw.githubusercontent.com/AbdulllrahmanDev/Mirror-CLI/main/scripts/install.sh | sh
```

---

## 💻 Local Installation (Batch Script)

If you have cloned the project locally, simply double-click `install.bat` or run:
```cmd
install.bat
```

---

## 🚀 Alternative Quick Start Commands

### 1. Instant Run via `npx` (No Installation Required)
```bash
npx github:AbdulllrahmanDev/Mirror-CLI https://example.com
```

### 2. Global Installation via `npm`
```bash
npm install -g git+https://github.com/AbdulllrahmanDev/Mirror-CLI.git
```
Then use anywhere:
```bash
mirror https://example.com
```

---

## 🤖 Antigravity AI Skill (`/Mirror`)

Mirror CLI comes with built-in **Antigravity IDE Integration**!

### Key Features:
- **Active AI Supervision**: Automatically monitors download logs and heals folder anomalies (e.g. `assets/assets` flattening, `asset.bin` repair).
- **Master AI Prompt (`site_details.md`)**: Automatically generates comprehensive technical design tokens, color palettes, motion physics, component specs, and responsive placement matrix in English saved directly inside the target website directory.
- **Single Clean Folder**: Ensures output files are saved into one clean folder named after the host domain (e.g., `example.com`), with zero duplicate `_cloned` directories.

---

## 📖 Usage Examples

```bash
# Clone a full website to current workspace
mirror https://trionn.com

# Clone with custom output path
mirror https://trionn.com --out "./my_custom_folder"

# Invoke in Antigravity IDE
/Mirror https://trionn.com
```

---

## 🛠️ Requirements

- **Node.js**: v18.0.0 or higher
- **Git**: Installed and available in system PATH

---

## 📜 License

MIT License © [AbdulllrahmanDev](https://github.com/AbdulllrahmanDev)
