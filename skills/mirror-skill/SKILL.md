---
name: mirror-skill
description: AI Skill for Mirror CLI. Triggered when user enters `/Mirror` or asks to download, mirror, clone, or generate an AI recreation prompt for any website URL.
---

# Mirror Skill - Website Cloning & AI Prompt Generator

Use this skill whenever the user invokes `/Mirror`, or asks to clone, download, mirror, or generate a design/code recreation prompt for a website or URL.

---

## Interactive Clarification Protocol

When this skill is triggered, you MUST ask or clarify the following options to narrow down the scope and user intent:

### Step 1: Select Scope (نطاق التحميل/التحليل)
- **Full Website**: Copy all pages and assets.
- **Specific Page**: Target a specific route (e.g., `/pricing`, `/about`, `/dashboard`).
- **Hero Section Only**: Focus strictly on the main hero banner / top section.

### Step 2: Select Action / Output Goal (الهدف من العملية)
- **A) Download Site Files**: Run Mirror CLI (`site-downloader`) to fetch static HTML, CSS, JS, and media assets.
- **B) Generate AI Recreation Prompt**: Analyze the site structure/design and write a comprehensive master prompt (`website_prompt.md`) to recreate it from scratch.
- **C) Both**: Download the files AND generate the AI recreation prompt.

### Step 3: Select Destination (مكان الحفظ)
- **Desktop**: Save output directly to Desktop (`%USERPROFILE%\Desktop` or `~/Desktop`).
- **Current Project Workspace**: Save output inside a folder in the active project.
- **Custom Location**: Allow user to specify a custom folder path.

---

## Execution Protocol

### Option A: Downloading Site Files via Mirror CLI
Run the site-downloader CLI command in terminal:
```bash
npx site-downloader <URL> --out "<DESTINATION_PATH>"
```
Or run the local script if inside the Mirror CLI project:
```bash
node index.js <URL> --out "<DESTINATION_PATH>"
```

### Option B: Generating AI Recreation Prompt
Create a Markdown file named `website_prompt.md` at the chosen destination path containing:
1. **Design System & Architecture**: Typography, Color Palette, Layout Grid, Micro-interactions.
2. **Component Breakdown**: Header, Hero, Features, Testimonials, Footer (or specific section requested).
3. **Responsive Requirements**: Mobile, Tablet, Desktop specifications.
4. **Implementation Master Prompt**: Ready-to-use prompt for LLMs to generate clean HTML/CSS/JS code.

---

## Examples

- **User**: `/Mirror https://example.com`
- **Agent Response**: Ask scope (Hero / Page / Full), goal (Download / Prompt / Both), and destination before executing.
