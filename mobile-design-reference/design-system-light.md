---
name: Emerald Slate Light
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#3c4a42'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#6c7a71'
  outline-variant: '#bbcabf'
  surface-tint: '#006c49'
  primary: '#006c49'
  on-primary: '#ffffff'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#4edea3'
  secondary: '#735c00'
  on-secondary: '#ffffff'
  secondary-container: '#fed65b'
  on-secondary-container: '#745c00'
  tertiary: '#515f74'
  on-tertiary: '#ffffff'
  tertiary-container: '#95a4bb'
  on-tertiary-container: '#2c3a4e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#ffe089'
  secondary-fixed-dim: '#e9c349'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#d5e3fd'
  tertiary-fixed-dim: '#b9c7e0'
  on-tertiary-fixed: '#0d1c2f'
  on-tertiary-fixed-variant: '#3a485c'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
  emerald-tint: '#ecfdf5'
  gold-tint: '#fefce8'
  slate-text: '#0f172a'
  slate-muted: '#64748b'
typography:
  display:
    fontFamily: Hanken Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  margin-mobile: 16px
  gutter-mobile: 12px
---

## Brand & Style

The design system is a high-performance, executive-grade interface designed for clarity, precision, and authority. By transitioning to a light theme, the brand shifts from an "exclusive dashboard" feel to an "open, high-clarity workspace" while maintaining its sophisticated, analytical edge. It targets professional environments where rapid data processing and high legibility are paramount.

The design style is **Corporate / Modern** with a focus on **Minimalism**. It utilizes expansive white space, precise geometry, and a restricted color palette to ensure the user's focus remains entirely on sales performance and lead management. The interface projects reliability through structured layouts and a premium feel through the intentional use of emerald and gold accents.

## Colors

The light palette is anchored in clean, professional neutrals with vibrant brand accents.

- **Primary (Emerald Green):** The core brand color (`#10b981`) is used for primary actions, success states, and progress indicators. On light backgrounds, it provides high visibility and a sense of growth.
- **Secondary (Gold):** Used as a sophisticated accent for "VIP" indicators, high-priority markers, and premium interface elements.
- **Backgrounds:** The main background is a very light off-white (`#f8fafc`). Surface containers and cards use pure white to pop against the background.
- **Typography & UI Lines:** Text utilizes deep slate tones (`#0f172a`) to ensure maximum contrast. Borders and dividers use a light slate-gray to maintain structure without adding visual noise.

## Typography

The system uses **Hanken Grotesk** for all primary interface text, chosen for its contemporary geometric construction that remains highly legible in high-density data environments. Headlines use a tighter letter-spacing for a bold, authoritative look.

For technical data—including currency, metrics, and timestamps—**JetBrains Mono** is used. This monospaced choice ensures that numbers align perfectly in tables and lists, aiding in rapid scanning and comparisons. On light backgrounds, keep weight distribution balanced; avoid thin weights for body text to maintain accessibility.

## Layout & Spacing

The layout follows a **Fluid Grid** model designed for data-heavy CRM workflows.

- **Grid:** A 12-column grid is used for desktop, while mobile scales to a 4-column structure.
- **Rhythm:** A strict 4px baseline grid ensures vertical alignment across all components.
- **Density:** We employ "Compact" internal spacing (8-12px) for list items and data cells to maximize information density, balanced by "Roomy" external margins (16px+) to prevent the interface from feeling cluttered.
- **Reflow:** On mobile devices, cards should span the full width of the screen, with primary actions anchored to the bottom "thumb-zone."

## Elevation & Depth

In the light theme, hierarchy is established through **Tonal Layers** and **Low-contrast Outlines** rather than heavy shadows.

- **Level 0 (Background):** Soft off-white surface.
- **Level 1 (Cards):** Pure white surfaces with a subtle 1px border in a light slate tint. This creates a crisp, architectural feel.
- **Level 2 (Modals):** Pure white with a soft, diffused ambient shadow (5-10% opacity) and no tinting, making them appear to float cleanly above the workspace.
- **Interactive States:** Hover states should utilize a subtle shift to a lightened primary or secondary tint rather than physical lift.

## Shapes

The shape language is **Rounded** but disciplined, conveying both approachability and precision.

- **Base Radius:** 0.5rem (8px) is the standard for cards and major containers.
- **Smaller Elements:** Inputs and buttons utilize 0.25rem (4px) to maintain a sense of "sharpness" and professional accuracy.
- **Pills:** Full roundedness is reserved strictly for status indicators and decorative tags to distinguish them from structural, interactive elements.

## Components

- **Buttons:** Primary buttons use a solid Emerald Green fill with white text. Secondary buttons use a white fill with a 1px Gold or Emerald border and matching text color.
- **Input Fields:** Use a white background with a light slate border. On focus, the border transitions to Emerald Green with a soft Emerald glow. Labels always use the monospaced `label-sm` for a technical, data-driven feel.
- **Pipeline Cards:** White background with a subtle border. Include a vertical 4px brand accent on the left (Emerald for active, Gold for high-value) to allow for quick color-coding of data.
- **Status Chips:** Small pills with a light tint background (10% opacity of the brand color) and a solid border of the same hue.
- **Lists & Tables:** Use alternating row highlights in a very light slate tint to aid horizontal eye tracking in dense datasets.
- **Navigation:** Top or side navigation uses a clean white surface with Emerald indicators for active states.
