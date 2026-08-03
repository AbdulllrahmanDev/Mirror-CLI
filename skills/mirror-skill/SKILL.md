---
name: mirror-skill
description: AI Skill for Mirror CLI & Website Recreation. Triggered when user enters `/Mirror` or asks to download, mirror, clone, or generate an expressively detailed AI recreation prompt for any website URL with pixel-perfect responsive specifications, animations, colors, and components.
---

# Mirror Skill - Ultra-Fidelity Website Cloning & Responsive AI Prompt Generator

Use this skill whenever the user invokes `/Mirror`, or asks to clone, download, mirror, or generate an expressive design/code recreation prompt (`website_prompt.md`) for any website URL.

---

## Core Philosophy: Pixel-Perfect Fidelity, Motion Physics & Explicit Placement

When generating website analysis or AI recreation prompts (`website_prompt.md`), **Visual Fidelity (الدقة البصرية الألوان والخطوط)**, **Motion & Scroll Physics (الحركات وتأثيرات التمرير)**, **Component Architecture (هيكلية المكونات)**, and **Explicit Element Placement per Screen Size (تحديد تموضع كل عنصر لكل مقياس)** are non-negotiable mandatory standards.

The generated prompt MUST act as an authoritative **Master Technical Design & Code Architecture Specification** capable of guiding any LLM to code an identical replica of the target website from scratch.

---

## Interactive Clarification Protocol

When this skill is triggered, you MUST ask or clarify the following options to narrow down the scope and user intent:

### Step 1: Select Scope (نطاق التحميل/التحليل)
- **Full Website**: Copy/analyze all pages, subpages, responsive layouts, and animations.
- **Specific Page**: Target a specific route (e.g., `/pricing`, `/about`, `/dashboard`).
- **Hero Section Only**: Focus strictly on the main hero banner / top section with its interactions.

### Step 2: Select Action / Output Goal (الهدف من العملية)
- **A) Download Site Files**: Run Mirror CLI (`site-downloader`) to fetch static HTML, CSS, JS, and media assets.
- **B) Generate AI Recreation Prompt**: Write an expressively detailed master prompt (`website_prompt.md`) covering colors, animations, scroll effects, component architecture, and responsive placement.
- **C) Both**: Download the files AND generate the master responsive AI recreation prompt.

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

---

### Option B: Generating Ultra-Detailed AI Recreation Prompt (`website_prompt.md`)

When creating `website_prompt.md`, structure the document strictly into the following detailed sections:

#### 1. Design System Tokens, Color Palette & Typography
- **Exact Color Palette**:
  - Primary Brand Colors (Hex / HSL / RGB).
  - Secondary & Accent Colors (gradients, badge highlight colors).
  - Surface & Background Colors (Dark/Light surface tokens, card backgrounds `#FFFFFF` / `#1E1E2D`).
  - Text & Contrast Standards (Primary text, secondary muted text, border strokes).
  - Glassmorphism & Overlays (`backdrop-filter: blur(12px)`, `background: rgba(..., 0.8)`).
- **Typography Architecture**:
  - Primary Font Family (e.g. Inter, Cairo, Outfit, Roboto) with Google Fonts `@import` link.
  - Heading hierarchy (H1, H2, H3, H4) with font weights (400, 500, 600, 700, 800), line-heights, and letter-spacing.
  - Fluid sizing tokens using CSS `clamp()` (e.g., `clamp(2rem, 5vw, 3.5rem)`).

#### 2. Motion Physics, Hover Effects & Scroll Animations (الحركات والتفاعلات الديناميكية)
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

#### 4. Responsive Master Grid & Breakpoint Placement Matrix (تموضع العناصر الصريح)
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
  2. Output `website_prompt.md` containing the complete color palette, typography hierarchy, CSS animations, scroll reveal triggers, interactive component specs, and explicit breakpoint placement matrix for Coursera.
