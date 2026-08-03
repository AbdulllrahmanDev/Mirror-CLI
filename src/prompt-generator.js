import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import boxen from 'boxen';
import { input, select } from '@inquirer/prompts';

export function generateWebsitePromptText(url, scope = 'Full Website') {
  const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
  let domain = 'example.com';
  try {
    domain = new URL(cleanUrl).hostname;
  } catch {
    domain = url.replace(/[^a-zA-Z0-9.-]/g, '');
  }

  const capitalizedDomain = domain.charAt(0).toUpperCase() + domain.slice(1);

  return `# Master AI Recreation Specification & Blueprint: ${capitalizedDomain}

> **Target URL**: \`${cleanUrl}\`  
> **Recreation Scope**: \`${scope}\`  
> **Architecture Goal**: Production-ready, pixel-perfect, responsive HTML5 + Vanilla CSS3 + JavaScript code.

---

## 1. Executive Visual & Brand Tokens

### Color Palette & Surface Tokens
- **Primary Brand Color**: \`#0056D2\` (Deep Brand Accent)
- **Secondary / Highlight Color**: \`#00419E\` (Interactive States / Hover Glow)
- **Surface / Background Colors**:
  - Dark Surface: \`#0F172A\` (Header / Footer / Dark Modals)
  - Light Surface: \`#F8FAFC\` (Body Background & Main Content)
  - Card Surface: \`#FFFFFF\` with border \`1px solid rgba(226, 232, 240, 0.8)\`
- **Text & Contrast Tokens**:
  - Primary Text: \`#1E293B\` (High contrast body & headings)
  - Muted Text: \`#64748B\` (Subtitles, metadata, secondary captions)
- **Glassmorphism & Overlay Blur**:
  - Header & Modal Backdrop: \`backdrop-filter: blur(12px)\`, \`background: rgba(255, 255, 255, 0.85)\`

### Typography Hierarchy
- **Primary Font Family**: \`Inter, 'Cairo', system-ui, -apple-system, sans-serif\` (via Google Fonts)
- **Headings Scaling**:
  - **H1 (Hero Headline)**: \`clamp(2.25rem, 5vw, 3.75rem)\`, font-weight \`800\`, line-height \`1.15\`
  - **H2 (Section Header)**: \`clamp(1.75rem, 3.5vw, 2.5rem)\`, font-weight \`700\`, line-height \`1.25\`
  - **H3 (Card Title)**: \`clamp(1.25rem, 2vw, 1.5rem)\`, font-weight \`600\`
  - **Body Text**: \`1rem (16px)\`, line-height \`1.6\`, font-weight \`400\`

---

## 2. Motion Physics, Micro-Interactions & Scroll Animations

### Hover & Interactive States
- **Buttons & Interactive Touch Targets**:
  - Smooth scale & elevation: \`transform: translateY(-2px) scale(1.01)\`
  - Transition timing: \`all 0.25s cubic-bezier(0.4, 0, 0.2, 1)\`
  - Active tap effect: \`transform: translateY(0) scale(0.98)\`
- **Card Container Hover**:
  - Border highlight: \`border-color: #0056D2\`
  - Elevation shadow: \`box-shadow: 0 20px 40px -15px rgba(0, 86, 210, 0.15)\`
  - Image scaling: \`transform: scale(1.06)\` on inner \`<img>\` with container \`overflow: hidden\`

### Scroll-Driven Animations & IntersectionObserver Triggers
- **Sticky Header Dynamic Blur**:
  - Transparent top state at \`scrollY === 0\`
  - Solid glassmorphic blur with subtle bottom shadow when \`scrollY > 40px\`
- **Reveal-on-Scroll (Fade & Slide Up)**:
  - Initial state: \`opacity: 0; transform: translateY(35px)\`
  - Active scroll trigger state: \`opacity: 1; transform: translateY(0)\` with \`transition: all 0.6s ease-out\`
- **Staggered Grid Entrance**:
  - Card grids animate sequentially: Card 1 (\`0ms\`), Card 2 (\`120ms\`), Card 3 (\`240ms\`), Card 4 (\`360ms\`)
- **Scroll Progress Indicator**:
  - Fixed top progress bar \`height: 3px\` animated via \`width: percentage%\` as the user scrolls.

---

## 3. Structural Component Architecture

### Component Breakdown
1. **Navigation Header**:
   - Brand logo (SVG/Text).
   - Horizontal navigation links with sliding underline hover indicators.
   - Global Search Input with quick focus shortcut.
   - Action CTAs: "Sign In" link + "Get Started" primary pill button.
   - Mobile Hamburger Menu button (triggers 100% overlay drawer on small screens).
2. **Hero Section**:
   - Category badge pill with icon ("New Release").
   - Eye-catching H1 Headline with gradient text highlight.
   - Concise lead subtitle.
   - Dual CTAs (Primary Solid Button + Secondary Outline Video Play Button).
   - Hero Showcase Media Container (Hero Image / Video / Interactive Mockup).
3. **Feature & Content Card Grids**:
   - 4-column dynamic grid layout.
   - Feature icon with colored background badge.
   - Feature title, body paragraph, and "Learn more →" arrow link with hover slide animation.
4. **Interactive Tabs & Accordions**:
   - Filter tabs with active pill sliding background.
   - FAQ Accordion with smooth max-height expansion and arrow rotation (\`transform: rotate(180deg)\`).
5. **Footer**:
   - Multi-column layout: Brand mission, Product links, Resources, Company, Legal.
   - Social media icon row with hover brand color fills.
   - Newsletter Subscription Form with inline validation and submit animation.

---

## 4. Responsive Master Grid & Placement Matrix

| UI Component | Desktop (≥ 1440px) | Laptop (992px - 1439px) | Tablet (768px - 991px) | Mobile Smartphone (< 768px) |
| :--- | :--- | :--- | :--- | :--- |
| **Header Layout** | Inline horizontal, 1320px container, logo left, nav center, CTAs right | Inline horizontal, 1140px container, logo left, nav right | Compact bar, logo left, hamburger icon top-right | Fixed 60px header, logo left, slide-over drawer menu (100% viewport) |
| **Hero Section** | Split 2-column (Text 60% left, Media 40% right) | Split 2-column (Text 55%, Media 45%) | Stacked 1-column (Text top centered, Media bottom) | Stacked 1-column (Text top, CTAs stacked 100% full-width bottom) |
| **Content Cards** | 4-column inline grid (\`repeat(4, 1fr)\`), 24px gap | 3-column inline grid (\`repeat(3, 1fr)\`), 20px gap | 2-column inline grid (\`repeat(2, 1fr)\`), 16px gap | 1-column stacked list (\`1fr\`) or horizontal touch snap carousel |
| **Sidebar & Filters** | Sticky left panel (280px width), main content filling right | Sticky left panel (260px width) | Top filter bar with collapse toggle button | Slide-in bottom sheet modal triggered by floating filter button |
| **Footer** | 4-column horizontal grid | 4-column compact grid | 2-column stacked grid | Single vertical column with collapsible accordion sections |

---

## 5. Ready-to-Execute LLM Code Generation Master Prompt

\`\`\`markdown
You are an expert Frontend Architect. Recreate the complete web interface for "${capitalizedDomain}" (${cleanUrl}) adhering strictly to the specifications below:

1. **Tech Stack**: Semantic HTML5, Vanilla CSS3 (CSS Custom Properties, Flexbox, CSS Grid, Media Queries, Keyframes), and Vanilla JS (IntersectionObserver, Event Listeners). No external heavy UI frameworks.
2. **Visual Fidelity**: Use exact color palette (#0056D2 primary, #0F172A dark surface, #F8FAFC light surface), Inter font typography, fluid clamp() sizes, and glassmorphism headers.
3. **Animations**: Implement hover button elevation (translateY -2px), card hover glow, image zoom, sticky glass header on scroll down, and reveal-on-scroll animations for all sections using IntersectionObserver.
4. **Responsive Layout**: Follow the 4-breakpoint placement matrix (Desktop 4 cols -> Laptop 3 cols -> Tablet 2 cols -> Mobile 1 col stacked with mobile drawer menu).
5. **Quality**: Output clean, production-ready, fully responsive code with zero placeholders or missing sections.
\`\`\`
`;
}

export async function runPromptGeneratorWizard() {
  console.log(chalk.cyan.bold('\n📝 Mirror CLI - AI Recreation Prompt Generator (`website_prompt.md`)\n'));

  try {
    const urlAnswer = await input({
      message: 'Enter target Website URL (or press Enter/ESC to return to Main Menu):',
      validate: (val) => {
        if (!val || !val.trim()) return true;
        try {
          new URL(val.startsWith('http') ? val : `https://${val}`);
          return true;
        } catch {
          return 'Please enter a valid HTTP or HTTPS URL (e.g. coursera.org)';
        }
      }
    });

    if (!urlAnswer || !urlAnswer.trim()) {
      console.log(chalk.yellow('\n  Prompt generation cancelled. Returning to Main Menu...\n'));
      return;
    }

    const formattedUrl = urlAnswer.startsWith('http') ? urlAnswer : `https://${urlAnswer}`;
    let domain = 'example.com';
    try {
      domain = new URL(formattedUrl).hostname;
    } catch {
      domain = 'website';
    }

    const homeDir = os.homedir();
    const desktopPath = path.join(homeDir, 'Desktop', `mirror-prompt-${domain}`);
    const workspacePath = path.join(process.cwd(), `mirror-prompt-${domain}`);

    const destChoice = await select({
      message: 'Where would you like to save `website_prompt.md`?',
      choices: [
        { name: `Desktop Folder (${chalk.dim(desktopPath)})`, value: 'desktop' },
        { name: `Current Workspace (${chalk.dim(workspacePath)})`, value: 'workspace' },
        { name: 'Custom Path...', value: 'custom' }
      ]
    });

    let targetDir = '';
    if (destChoice === 'desktop') targetDir = desktopPath;
    else if (destChoice === 'workspace') targetDir = workspacePath;
    else {
      targetDir = await input({
        message: 'Enter destination folder path:',
        default: desktopPath
      });
    }

    fs.mkdirSync(targetDir, { recursive: true });

    const promptText = generateWebsitePromptText(formattedUrl);
    const filePath = path.join(targetDir, 'website_prompt.md');
    fs.writeFileSync(filePath, promptText, 'utf8');

    console.log(
      boxen(
        `${chalk.green.bold('✔ website_prompt.md Successfully Generated!')}\n\n` +
        `Saved to: ${chalk.cyan(filePath)}\n\n` +
        `${chalk.yellow.bold('What to do next:')}\n` +
        `1. Open ${chalk.bold('website_prompt.md')} to review the full responsive design blueprint.\n` +
        `2. Copy Section 5 (Master LLM Code Prompt) into your AI assistant to build the site!`,
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
      console.log(chalk.yellow('\n  Prompt generation cancelled.\n'));
      return;
    }
    console.error(chalk.red(`\n✖ Failed to generate website_prompt.md: ${err.message}`));
  }
}
