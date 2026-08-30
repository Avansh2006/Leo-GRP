---
name: Tactical Precision
colors:
  surface: '#131315'
  surface-dim: '#131315'
  surface-bright: '#39393b'
  surface-container-lowest: '#0e0e10'
  surface-container-low: '#1c1b1d'
  surface-container: '#201f22'
  surface-container-high: '#2a2a2c'
  surface-container-highest: '#353437'
  on-surface: '#e5e1e4'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#e5e1e4'
  inverse-on-surface: '#313032'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb786'
  on-tertiary: '#502400'
  tertiary-container: '#df7412'
  on-tertiary-container: '#461f00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb786'
  on-tertiary-fixed: '#311400'
  on-tertiary-fixed-variant: '#723600'
  background: '#131315'
  on-background: '#e5e1e4'
  surface-variant: '#353437'
typography:
  headline-lg:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.05em
  mono-data:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 1.5rem
  element-gap-tight: 0.5rem
  element-gap-base: 1rem
  grid-gutter: 16px
  max-width: 1280px
---

## Brand & Style
The design system is a high-performance, utilitarian framework engineered for law enforcement professionals. It prioritizes information density, rapid scanning, and visual endurance during long shifts. The aesthetic draws heavily from professional developer tools like Linear and Geist—emphasizing functional beauty over decorative elements.

The personality is **authoritative, surgical, and dependable**. By using a deep charcoal foundation and refined "electric" accents, the UI creates a focused environment that reduces cognitive load. Every pixel serves a purpose, favoring solid structures and crisp borders to ensure peak performance on tactical hardware.

## Colors
This design system utilizes a **dark-primary palette** specifically optimized for low-light environments and eye comfort. 

- **Foundation:** The background uses a near-black charcoal (`#09090B`) to provide maximum contrast for text while minimizing screen glare. 
- **Surfaces:** UI containers use a slightly elevated zinc (`#18181B`) to differentiate layers without relying on performance-heavy shadows.
- **Accents:** "Electric Blue" is the primary action color, used for high-priority interactions and CTA buttons. "Cyber Green" is reserved for success states and active "on-duty" indicators.
- **Grayscale:** A tight range of slate and zinc grays is used for borders and secondary text, creating a sophisticated, low-contrast hierarchy that keeps the interface quiet until interaction is required.

## Typography
The typography system is built for **extreme legibility and density**. Using **Geist** as the primary typeface ensures a clean, modern, and technical feel that remains readable at small scales. 

**JetBrains Mono** is introduced for labels, status tags, and technical data (like timestamps, badge numbers, or coordinates) to provide a distinct visual "mode" for raw information. 

The scale is intentionally compact. We avoid large display type to maximize the amount of actionable data visible on a single screen. For mobile views, typography remains consistent, as the base sizes are already optimized for high-density layouts.

## Layout & Spacing
The layout follows a **structured, high-density grid** modeled after command-line interfaces and professional dashboards.

- **Grid Model:** A 12-column fluid grid for desktop, collapsing to 1 column for mobile. 
- **Rhythm:** An 8pt grid is the standard, but we allow for 4pt increments for tight UI components (like button groups or data tables).
- **Safe Areas:** Generous outer margins (24px) prevent the UI from feeling claustrophobic, while internal component spacing remains tight (8-12px) to keep related information grouped.
- **Alignment:** All elements are strictly aligned to the grid to maintain a sense of order and professional discipline.

## Elevation & Depth
In this design system, depth is communicated through **tonal layering and borders** rather than shadows. This approach ensures maximum rendering performance and visual clarity.

1.  **Level 0 (Background):** Pure charcoal base.
2.  **Level 1 (Card/Container):** A subtle lift using a 1px border (`#27272A`).
3.  **Level 2 (Active/Hover):** Interactive elements gain a slightly brighter border or a subtle background tint (`#27272A` background).
4.  **Focus States:** Use a high-contrast 2px "Electric Blue" outline to ensure keyboard-friendly navigation is unmistakable.

Avoid all use of `box-shadow` or `backdrop-filter: blur` to keep the interface feeling snappy and lightweight.

## Shapes
The shape language is **restrained and professional**. We use a "Soft" (4px) corner radius for most components to provide a modern feel without leaning into the playfulness of fully rounded "bubble" designs. 

- **Small Components (Buttons, Inputs):** 4px radius.
- **Large Components (Cards, Modals):** 8px radius.
- **Status Indicators:** 2px radius or sharp edges for a more technical, "ledger-like" appearance.

## Components
### Buttons
- **Primary:** Solid "Electric Blue" with white text. High-contrast.
- **Secondary:** Transparent background with a 1px Zinc border. Text is light gray.
- **Ghost:** No border or background until hover. Used for low-priority utility actions.

### Cards
Cards are the primary container. They feature a 1px border (`#27272A`) and no shadow. Headers within cards should use a subtle bottom border to separate titles from content.

### Inputs & Fields
Inputs are dark-filled (`#09090B`) with a 1px border. On focus, the border transitions to Electric Blue. Use JetBrains Mono for input text to emphasize data entry precision.

### Status Indicators
Small, rectangular chips. Use "Cyber Green" for 'Active/Duty', "Amber" for 'Caution/Pending', and "Slate" for 'Inactive/Off-Duty'.

### Lists & Data Tables
Strict horizontal row separators. Hover states should highlight the entire row with a subtle zinc tint. Use high-density spacing (padding: 8px 12px) to maximize data visibility.