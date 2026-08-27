# 🚀 Mirror CLI

<div align="center">

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![AI Supported](https://img.shields.io/badge/AI%20Engine-Gemini%20%7C%20DeepSeek%20%7C%20OpenAI-purple.svg?style=for-the-badge)](https://github.com/AbdulllrahmanDev/Mirror-CLI)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-orange.svg?style=for-the-badge)](#-installation-guide)

**The Ultimate Pixel-Perfect Website Cloner, 3D/WebGL Downloader & AI Reverse-Engineering Suite.**

[Quick Start](#-quick-start) • [Installation Guide](#-installation-guide) • [Interactive CLI](#-interactive-cli-experience) • [AI Studio & Healing](#-ai-studio--self-healing) • [Troubleshooting](#-troubleshooting--faq)

</div>

---

## 🌟 What is Mirror CLI?

**Mirror CLI** is an advanced, cross-platform command-line tool designed to clone any website with **100% pixel-perfect offline fidelity**. 

Unlike traditional downloaders that break modern frameworks, Mirror CLI uses a headless browser engine with **Resilient DOM Capture**, saving modern **Next.js, React, Astro, Three.js, WebGL, GSAP animations, custom fonts, video streams, and sprite sheets** into a self-contained local folder that works completely offline.

### 💎 Key Highlights:
- 🎯 **100% Pixel-Perfect Layouts**: Resolves all relative CSS depths, `@font-face` definitions, background SVGs, and sprite masks.
- ⚡ **Heavy 3D & Canvas Support**: Downloads WebGL models (`.glb`, `.gltf`, `.hdr`, `.wasm`) and streaming video textures without timeout freezes.
- 🧠 **Multi-Provider AI Studio**: Powered by Google Gemini (3.7 / 3.6 / 3.5 Flash), DeepSeek, OpenAI, Groq, and OpenRouter.
- 🛠️ **Auto-Self-Healing Supervisor**: Automatically scans downloaded files, heals broken relative URLs, flattens duplicate asset directories, and fixes preloader locks.
- 📝 **Master AI Prompt Generator (`site_details.md`)**: Generates an exhaustive design system blueprint (colors, typography, motion physics, responsive components) ready to feed into any AI code editor.
- 🌐 **Instant Built-in Preview Server**: Live-preview cloned sites locally with hot reload and zero external dependencies.

---

## 📋 Prerequisites

Before installing, make sure you have the following installed on your machine:

1. **[Node.js](https://nodejs.org/)** (Version **18.0.0** or higher)
   - Verify by running: `node -v`
2. **[Git](https://git-scm.com/)**
   - Verify by running: `git -v`

---

## ⚡ Installation Guide

Choose the installation method that fits your setup:

### 🔹 Option 1: One-Line Quick Web Installer (Recommended)

Run this single command in your terminal for fully automated installation:

#### 🪟 Windows (PowerShell):
```powershell
iwr -useb https://raw.githubusercontent.com/AbdulllrahmanDev/Mirror-CLI/main/scripts/install.ps1 | iex
```

#### 🍎 macOS / 🐧 Linux (Terminal):
```bash
curl -fsSL https://raw.githubusercontent.com/AbdulllrahmanDev/Mirror-CLI/main/scripts/install.sh | sh
```

---

### 🔹 Option 2: Global Installation via `npm` & `git`

If you have Node.js installed, run:
```bash
npm install -g git+https://github.com/AbdulllrahmanDev/Mirror-CLI.git
```

Now you can run the `mirror` command from any directory on your computer!

---

### 🔹 Option 3: Manual Installation (From Source)

1. Clone the repository:
   ```bash
   git clone https://github.com/AbdulllrahmanDev/Mirror-CLI.git
   cd Mirror-CLI
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Link the command globally:
   - **Windows**: Double-click `install.bat` or run:
     ```cmd
     npm link
     ```
   - **macOS / Linux**:
     ```bash
     sudo npm link
     ```

---

### 🔹 Option 4: Instant Run with `npx` (No Installation)

Run Mirror CLI on the fly without installing anything permanently:
```bash
npx github:AbdulllrahmanDev/Mirror-CLI https://example.com
```

---

## 🚀 How to Use

### 🎮 1. Interactive Menu Mode (Beginner Friendly)

Simply type `mirror` in your terminal:
```bash
mirror
```

This launches the interactive visual menu where you can:
- ⚡ **Quick Clone**: Download any website with smart defaults.
- ⚙️ **Advanced Clone**: Customize crawl depth, custom output folders, ZIP packaging, and verbose logging.
- 🎨 **Theme Selector**: Choose from 6 custom CLI aesthetic themes (Cyberpunk, Matrix, Dracula, Neon Gold, Nord, Oceanic).
- 🤖 **AI Multi-Provider Studio**: Switch providers (Gemini, DeepSeek, OpenAI, Groq), test API keys, and launch interactive AI chat.
- 📡 **Local Live Server**: Preview any downloaded website in your default browser.
- 📜 **Download History**: Inspect past clones, asset counts, and download durations.

---

### 💻 2. Direct Command-Line Usage

```bash
# Basic clone
mirror https://example.com

# Clone to a specific custom directory
mirror https://example.com -o ./my-cloned-website

# Clone with depth limit (e.g. 2 levels deep)
mirror https://example.com --depth 2

# Clone and automatically compress into a ZIP file
mirror https://example.com --zip

# Launch built-in preview server for a cloned website
mirror --serve ./example.com

# Run in Verbose debugging mode
mirror https://example.com --verbose
```

---

### 🤖 3. Antigravity IDE Integration (`/Mirror`)

Mirror CLI natively registers as an **Antigravity AI Skill**! In your AI chat, you can type:

```text
/Mirror https://example.com
```

This triggers the active AI supervisor to clone, verify asset integrity, and generate a pixel-perfect `site_details.md` specification file inside your workspace.

---

## 🔧 AI Studio & Self-Healing

Mirror CLI contains a built-in **AI Project Supervisor & Code Healer** that runs automatically after downloading:

| Healing Feature | Description |
| :--- | :--- |
| **CSS `@font-face` Repair** | Fixes broken relative depths (`../../fonts/` $\rightarrow$ `../fonts/`) so custom typography loads with 100% accuracy. |
| **Stepped Sprite Masks** | Automatically downloads missing sprite sheets and repairs CSS mask URLs for complex particle/vanish animations. |
| **Lazy Media Rewriter** | Rewrites `data-src`, `data-href`, and `poster` attributes on video and image tags to valid local relative paths. |
| **Preloader Lock Auto-Dismiss** | Injects a non-destructive fallback style to ensure JavaScript-locked loading overlays never freeze the page. |
| **Duplicate Asset Flattening** | Cleans up accidental nested `assets/assets/` folder structures. |

---

## ❓ Troubleshooting & FAQ

### 1. `mirror : The term 'mirror' is not recognized...`
- **Cause:** Node.js global binaries folder is not in your system `PATH`, or `npm link` was not executed.
- **Solution:**
  1. Restart your terminal or PowerShell window.
  2. Run `npm link` inside the `Mirror-CLI` folder.
  3. Alternatively, use `node index.js` from the repository directory.

### 2. Windows PowerShell: `running scripts is disabled on this system`
- **Cause:** PowerShell script execution policy restricts unassigned scripts.
- **Solution:** Run this command once in PowerShell:
  ```powershell
  Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

### 3. Linux / macOS: `EACCES: permission denied` during global install
- **Cause:** Missing root permissions for global Node directory.
- **Solution:** Use `sudo npm install -g git+https://github.com/AbdulllrahmanDev/Mirror-CLI.git` or manage Node with [NVM](https://github.com/nvm-sh/nvm).

### 4. Heavy 3D / WebGL site takes long or times out
- **Cause:** Sites like WebGL portfolios stream audio and canvas textures continuously.
- **Solution:** Mirror CLI's **Resilient Navigation Engine** automatically captures the fully rendered DOM even if live streams stay open. When prompted, select **AI Supervisor** to audit and heal any residual asset links.

### 5. `Error: EADDRINUSE: address already in use`
- **Cause:** Another local server is using the default port (`3000`).
- **Solution:** Mirror CLI automatically switches to alternative ports (`3001`, `3002`, `8080`) or you can stop any running background servers.

---

## 📂 Project Structure

```text
Mirror-CLI/
├── index.js               # CLI Entrypoint & Interactive Event Loop
├── package.json           # Project Configuration & Dependencies
├── install.bat            # Windows 1-Click Local Installer
├── scripts/
│   ├── install.ps1        # PowerShell Web Installer
│   └── install.sh         # Unix/macOS Web Installer
└── src/
    ├── crawler.js         # Headless Resilient DOM & Asset Crawler
    ├── downloader.js      # Multi-threaded Asset Engine (CSS, JS, 3D, Fonts)
    ├── rewriter.js        # Disk-Aware CSS/HTML/JS Path Transformer
    ├── ai.js              # Multi-Provider AI Studio (Gemini/DeepSeek/OpenAI)
    ├── prompt-generator.js# Master AI Recreation Prompt Generator (site_details.md)
    ├── server.js          # Built-in Local HTTP Preview Server
    ├── config.js          # User Configurations & Folder Routing
    ├── history.js         # Download Session History Manager
    ├── ui.js              # Visual Themes, Spinners, Tables & Headers
    └── updater.js         # Git-integrated Auto-Updater
```

---

## 📜 License

Distributed under the **MIT License**. Created with ❤️ by **[AbdulllrahmanDev](https://github.com/AbdulllrahmanDev)**.
