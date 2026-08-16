---
name: Emerald Slate Performance
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#bbcabf'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#86948a'
  outline-variant: '#3c4a42'
  surface-tint: '#4edea3'
  primary: '#4edea3'
  on-primary: '#003824'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#006c49'
  secondary: '#e9c349'
  on-secondary: '#3c2f00'
  secondary-container: '#af8d11'
  on-secondary-container: '#342800'
  tertiary: '#bcc7de'
  on-tertiary: '#263143'
  tertiary-container: '#98a3ba'
  on-tertiary-container: '#2e394c'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#ffe088'
  secondary-fixed-dim: '#e9c349'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#d8e3fb'
  tertiary-fixed-dim: '#bcc7de'
  on-tertiary-fixed: '#111c2d'
  on-tertiary-fixed-variant: '#3c475a'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
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
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
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

The brand personality is authoritative, sophisticated, and precision-engineered for high-stakes sales environments. This design system bridges the gap between traditional corporate reliability and modern analytical power. By utilizing a dark-mode-first approach, the UI minimizes eye strain during long-term data analysis while projecting an aura of exclusivity and premium value.

The design style is **Corporate / Modern** with a **Tactile** edge. It uses high-contrast surfaces and subtle metallic accents to mirror the luxury and precision of the Seisiun Analytics logo. The interface emphasizes functional clarity, ensuring that complex CRM data feels organized, actionable, and physically "present" through careful use of depth and lighting.

## Colors

The palette is anchored in deep, dark tones to create a high-end "Executive Dashboard" aesthetic.

- **Primary (Emerald Green):** Used for primary actions, success states, and key growth indicators. It represents vitality and conversion.
- **Secondary (Bronze Gold):** Reserved for premium features, high-priority lead markers, and subtle decorative borders. It adds a layer of sophistication.
- **Surface & Backgrounds:** We use a hierarchy of slate and charcoal. The background is a near-black `neutral`, while cards and containers use `tertiary` (Deep Slate) to create separation.
- **Accent Highlighting:** Bronze is used sparingly as a stroke or highlight to indicate "VIP" status or high-value pipeline stages.

## Typography

Typography is clean and optimized for data density. We utilize **Hanken Grotesk** for its sharp, contemporary geometry which maintains legibility even at small scales on mobile devices.

For technical data, such as currency amounts, lead scores, or timestamps, **JetBrains Mono** is employed. This monospaced choice provides a "precision tool" feel, ensuring that numbers align vertically in lists and tables, which is critical for rapid scanning of sales pipelines. Headlines use tighter letter spacing to maintain a bold, professional presence.

## Layout & Spacing

This design system uses a **Fluid Grid** optimized for mobile-first CRM workflows. The layout relies on a 4-column structure for mobile, where most cards span the full width to maximize the visibility of sales data.

- **Vertical Rhythm:** A strict 4px baseline grid ensures consistent alignment between labels and data points.
- **Density:** To accommodate the data-heavy nature of sales management, we use "Compact" spacing within list items (8px-12px) while maintaining "Roomy" margins (16px) at the screen edges to prevent the UI from feeling claustrophobic.
- **Safe Areas:** All critical actions are placed within the thumb-zone (bottom 40% of the screen), utilizing a floating action button for "New Lead" or "Add Activity" functions.

## Elevation & Depth

Visual hierarchy is established through **Tonal Layering** supplemented by **Low-contrast Outlines**.

1. **Level 0 (Background):** Pure slate-black (`#0F172A`).
2. **Level 1 (Cards/Containers):** Deep Slate (`#1E293B`) with a subtle 1px border (`#334155`). This creates a crisp definition without the need for heavy shadows.
3. **Level 2 (Modals/Popovers):** Slightly lighter slate with a soft, 15% opacity black shadow and a bronze-tinted top border for premium emphasis.

Interactive elements use "Inner Glows" rather than traditional drop shadows to simulate a backlit, high-tech instrument panel. This keeps the dark interface feeling vibrant rather than muddy.

## Shapes

The shape language is **Soft** but disciplined. We use 0.25rem (4px) as the base radius for inputs and small chips, and 0.5rem (8px) for primary cards.

This relatively low roundedness communicates precision and "sharpness," fitting for an analytical tool. Extremely rounded elements (pills) are reserved exclusively for status indicators (e.g., "In Progress", "Closed Won") to make them instantly recognizable against the more rectangular structural elements.

## Components

- **Buttons:** Primary buttons use a solid Emerald Green fill with white text. Secondary buttons are outlined in Bronze with a gold-tinted text. Buttons feature a subtle metallic gradient to evoke the Seisiun logo.
- **Pipeline Cards:** High-contrast cards with a vertical accent bar on the left. The bar color corresponds to the lead status (Emerald for active, Bronze for high-value).
- **Data Visualizations:** Charts use the Primary Emerald as the main data line/bar, with Bronze used for secondary targets or "Goal" lines. Tooltips appear in a dark, high-contrast overlay.
- **Input Fields:** Dark backgrounds with a 1px border. On focus, the border transitions to Emerald Green with a subtle outer glow. Labels use the `label-sm` monospaced font for a technical look.
- **Status Chips:** Small, semi-transparent pills. "Closed Won" uses a 10% Emerald fill with a solid Emerald border; "High Priority" uses a 10% Bronze fill with a Bronze border.
- **Navigation:** A bottom tab bar with glassmorphism (backdrop blur) to allow the content to scroll behind it, maintaining the feeling of depth.
