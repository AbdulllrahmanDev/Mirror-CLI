---
name: mirror-skill
description: AI Skill for Mirror CLI & Website Recreation with Active Monitoring & Auto-Self-Healing. Triggered when user enters `/Mirror` or asks to download, mirror, clone, or generate an expressively detailed AI recreation prompt (`site_details.md`) for any website URL with pixel-perfect responsive specifications, animations, colors, and components.
---

# Mirror Skill - Ultra-Fidelity Website Cloning, Active AI Monitoring & Self-Healing

Use this skill whenever the user invokes `/Mirror`, or asks to clone, download, mirror, or generate an expressive design/code recreation prompt (`site_details.md`) for any website URL.

---

## Core Philosophy: Active Supervision, Single Clean Folder & Auto-Self-Healing

When executing website mirroring or generating AI recreation prompts:
1. **Single Unified Destination Folder**: DO NOT create extra temporary folders or add `_cloned` suffixes (e.g., `trionn_cloned`). All downloaded files, site assets, and `site_details.md` MUST be placed strictly inside **ONE single directory** named directly after the site host/domain (e.g., `trionn.com`) or explicit user path.
2. **English File Naming & Content**: The generated master specifications file MUST be named **`site_details.md`** and written entirely in English.
3. **Active AI Supervision & Auto-Healing**: The AI MUST actively monitor terminal progress and log outputs. If any error, broken link, missing asset, or folder anomaly occurs, the AI MUST automatically detect and repair it without manual intervention.
4. **Visual Fidelity & Motion Physics**: Detailed color palettes, typography, animations, scroll effects, and explicit responsive grid placement per breakpoint are non-negotiable mandatory standards.

---

## Interactive Clarification Protocol

When this skill is triggered, you MUST ask or clarify the following options to narrow down the scope and user intent:

### Step 1: Select Scope (نطاق التحميل/التحليل)
- **Full Website**: Copy/analyze all pages, subpages, responsive layouts, and animations.
- **Specific Page**: Target a specific route (e.g., `/pricing`, `/about`, `/dashboard`).
- **Hero Section Only**: Focus strictly on the main hero banner / top section with its interactions.

### Step 2: Select Action / Output Goal (الهدف من العملية)
- **A) Download Site Files**: Run Mirror CLI (`mirror` / `mirror-cli`) to fetch static HTML, CSS, JS, and media assets.
- **B) Generate AI Recreation Prompt**: Write an expressively detailed master prompt (`site_details.md`) covering colors, animations, scroll effects, component architecture, and responsive placement.
- **C) Both (Recommended)**: Download the files AND generate the master responsive AI prompt (`site_details.md`) inside the downloaded site folder.

### Step 3: Select Destination (مكان الحفظ)
- **Desktop**: Save output directory directly to Desktop (`%USERPROFILE%\Desktop` or `~/Desktop`).
- **Current Project Workspace**: Save output directory inside active project workspace.
- **Custom Location**: Allow user to specify a custom folder path.

---

## Execution & Active Supervision Protocol

### Option A: Downloading Site Files & Active AI Monitoring
Run the Mirror CLI command in terminal:
```bash
npx mirror-cli <URL> --out "<DESTINATION_PATH>"
```
Or run local script inside project (using domain name directly as destination folder, NEVER adding `_cloned` suffix):
```bash
node index.js <URL> --out "<DOMAIN_NAME>"
```

#### Active Self-Healing & Sanitation Protocol:
While the downloader process is running or immediately after completion, the AI MUST execute active checks and auto-heal any issues:

1. **Auto-Detect & Flatten Nested Directories**:
   - Check if `assets/assets/` was generated inside output folder.
   - If present, automatically move all contents (`css/`, `fonts/`, `images/`, `js/`, `misc/`) up into `assets/` and delete redundant `assets/assets` folder:
     ```powershell
     Copy-Item -Path "<DESTINATION_PATH>\assets\assets\*" -Destination "<DESTINATION_PATH>\assets\" -Recurse -Force
     Remove-Item -Path "<DESTINATION_PATH>\assets\assets" -Recurse -Force
     ```

2. **Auto-Repair Link Targets (`asset.bin` & 404 Links Repair)**:
   - Search for dummy `./assets/misc/asset.bin` or invalid 404 links in `index.html` and `.css` files.
   - Replace dummy links with valid relative anchor routes (e.g. `#work`, `#services`, `#about`, `#contact`) or actual HTML page filenames.

3. **Verify Preloader & Smooth Scroll Lock**:
   - Verify that preloader overlay elements (`.pl-overlay`) do not lock page scrolling (`overflow: hidden`).
   - Automatically inject CSS/JS fallbacks if scroll lock persists.

4. **Clean Duplicate Folders**:
   - Ensure NO extra `_cloned` or temporary folders were left behind.

---

### Option B & C: Generating Master Specifications (`site_details.md`)

Save the generated prompt file **inside the cloned site directory** in English as **`site_details.md`** (e.g. `<DESTINATION_PATH>/site_details.md`).

Structure `site_details.md` strictly into the following detailed sections:

#### 1. Design System Tokens, Color Palette & Typography
- **Exact Color Palette**:
  - Primary Brand Colors (Hex / HSL / RGB).
  - Secondary & Accent Colors (gradients, badge highlight colors).
  - Surface & Background Colors (Dark/Light surface tokens, card backgrounds `#FFFFFF` / `#1E1E2D`).
  - Text & Contrast Standards (Primary text, secondary muted text, border strokes).
  - Glassmorphism & Overlays (`backdrop-filter: blur(12px)`, `background: rgba(..., 0.8)`).
- **Typography Architecture**:
  - Primary Font Family (e.g. Syne, Cairo, Outfit, Roboto) with Google Fonts `@import` link.
  - Heading hierarchy (H1, H2, H3, H4) with font weights (400, 500, 600, 700, 800), line-heights, and letter-spacing.
  - Fluid sizing tokens using CSS `clamp()` (e.g., `clamp(2rem, 5vw, 3.5rem)`).

#### 2. Motion Physics, Hover Effects & Scroll Animations
Specify exact CSS transition values, keyframe names, and JavaScript scroll intersection behaviors:
- **Hover & Micro-interactions**:
  - Button lift & scale (`transform: translateY(-2px) scale(1.02)`, `transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)`).
  - Card glow & elevation (shadow transition `box-shadow: 0 10px 30px rgba(0,0,0,0.1)`).
  - Image zoom inside card container (`transform: scale(1.08)` on hover with `overflow: hidden`).
- **Scroll-Triggered Animations (Scroll & IntersectionObserver)**:
  - **Sticky Header Transition**: Header starts transparent/large, transitions to solid background with blur and shadow on scroll down (`scrollY > 50px`).
  - **Reveal-on-Scroll**: Elements fade in and slide up as they enter viewport (`opacity: 0; transform: translateY(30px)` to `opacity: 1; transform: translateY(0)`).
  - **Staggered Entrance**: Card grids reveal sequentially with staggered animation delays (`animation-delay: 100ms, 200ms, 300ms`).
  - **Parallax & Dynamic Elements**: Floating background graphics moving smoothly on mouse movement or page scroll.
  - **Scroll Progress Indicator**: Top progress bar reflecting page scroll percentage.

#### 3. Component Architecture & Structural Breakdown
Detailed structural blueprint for every UI component:
- **Header & Navigation Bar**: Logo, inline links, active state indicators, search input, CTA button, mobile drawer button.
- **Hero Banner**: Hero badge pill, main headline, lead subtext, dual CTA buttons (Primary & Outline), hero media/video/illustration container.
- **Feature & Content Grids**: Card headers, icons with background badges, title, description, link/arrow icon on hover.
- **Interactive UI Modules**:
  - Tabs (active indicator sliding underline or background pill transition).
  - Accordion / FAQ (smooth max-height expansion and arrow rotation `transform: rotate(180deg)`).
  - Carousels & Sliders (touch swipe support, dot pagination, prev/next arrows).
  - Modals & Overlay Drawers (backdrop fade-in, scale/slide content entry).
- **Footer**: Multi-column menu grid, brand story, social media icon row with hover color fills, newsletter subscribe form, bottom legal bar.

#### 4. Responsive Master Grid & Breakpoint Placement Matrix
Explicit placement instructions for every screen breakpoint:

| Element / Breakpoint | Desktop Extra Wide (≥ 1440px) | Laptop / Desktop (992px - 1439px) | Tablet (768px - 991px) | Mobile Smartphone (< 768px) |
| :--- | :--- | :--- | :--- | :--- |
| **Header / Nav** | Inline horizontal bar, 1320px max-width, logo left, nav center, CTA right | Inline horizontal bar, 1140px max-width, logo left, nav right | Compact bar, logo left, hamburger menu icon top-right | Fixed top 60px bar, logo center/left, slide-over mobile drawer (100% overlay) |
| **Hero Section** | Split 2-column (Text 60% left, Media 40% right) | Split 2-column (Text 55%, Media 45%) | Stacked 1-column (Text top centered, Media bottom 80% width) | Stacked 1-column (Text top, CTAs 100% full-width stacked bottom) |
| **Content Cards** | 4-column inline grid (`repeat(4, 1fr)`), 24px gap | 3-column inline grid (`repeat(3, 1fr)`), 20px gap | 2-column grid (`repeat(2, 1fr)`), 16px gap | 1-column stacked list (`1fr`) or horizontal snap-scroll carousel |
| **Sidebar & Filters** | Sticky left panel (280px width), main content right | Sticky left panel (260px width) | Collapsed top toggle button ("Show Filters") | Slide-in bottom sheet modal triggered by floating filter button |
| **Footer** | 4-column horizontal grid | 4-column grid (compact spacing) | 2-column stacked grid | Single vertical column with collapsible accordion sections |

#### 5. Self-Contained Master LLM Prompt for Code Generation
Include a copy-pasteable master prompt instructing code generators to output **clean, semantic HTML5, Vanilla CSS3 (flexbox, CSS grid, media queries, CSS variables, keyframe animations), and JS (IntersectionObserver, event listeners)** adhering strictly to all visual tokens, animations, and placement rules.

---

## Examples

- **User**: `/Mirror https://coursera.org`
- **Agent Action**:
  1. Clarify scope, goal, and destination.
  2. Run downloader process outputting directly to single clean directory `coursera.org`. Actively monitor output, and automatically apply self-healing fixes.
  3. Output `coursera.org/site_details.md` in English containing the complete color palette, typography hierarchy, CSS animations, scroll reveal triggers, interactive component specs, and explicit breakpoint placement matrix.
