---
name: Technical Precision
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daea'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eefe'
  surface-container-high: '#e2e8f8'
  surface-container-highest: '#dce2f3'
  on-surface: '#151c27'
  on-surface-variant: '#45464c'
  inverse-surface: '#2a313d'
  inverse-on-surface: '#ebf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#575e70'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#141b2b'
  on-primary-container: '#7d8497'
  inverse-primary: '#c0c6db'
  secondary: '#006c4a'
  on-secondary: '#ffffff'
  secondary-container: '#82f5c1'
  on-secondary-container: '#00714e'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#2f1500'
  on-tertiary-container: '#c76c00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce2f7'
  primary-fixed-dim: '#c0c6db'
  on-primary-fixed: '#141b2b'
  on-primary-fixed-variant: '#404758'
  secondary-fixed: '#85f8c4'
  secondary-fixed-dim: '#68dba9'
  on-secondary-fixed: '#002114'
  on-secondary-fixed-variant: '#005137'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#f9f9ff'
  on-background: '#151c27'
  surface-variant: '#dce2f3'
typography:
  headline-lg:
    fontFamily: Geist
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0.01em
  code-inline:
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
  gutter: 0.75rem
  gutter-desktop: 1rem
  margin: 1rem
  margin-desktop: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.375rem
  space-md: 0.5rem
  space-lg: 0.75rem
  space-xl: 1rem
---

## Brand & Style

This design system embodies high-density technical utility, engineering precision, and utilitarian minimalism. Inspired by elite developer-centric environments, the system eliminates decorative friction, marketing embellishments, and superficial gradients in favor of structural clarity, predictable alignment, and direct visual hierarchy.

The interface prioritizes keyboard-driven interactions, information density, and rapid cognitive parsing. Visual weight is communicated strictly through calibrated typography, exact 1px structural boundaries, and semantic status indicators. The aesthetic evokes the quiet reliability of an instrument-grade workstation: calm, neutral, and unyielding in its execution.

## Colors

The palette operates on high-contrast neutrality punctuated by surgical status accents.

- **Canvas & Surfaces:** Primary application canvas defaults to an ultra-subtle off-white (`#F9FAFB`), layered over with pure white (`#FFFFFF`) component tiles, sidebars, toolbars, and inputs.
- **Structural Borders:** Subtle, crisp dividing lines sit at `#E5E7EB` (surface borders) and `#E2E8F0` (secondary dividers/headers). Active or focused borders step down sharply to `#111827`.
- **Text & Hierarchy:** Body copy and primary identifiers use deep ink charcoals (`#111827` for titles and primary labels, `#1F2937` for body copy). Secondary metadata, timestamps, and muted table headers resolve to `#6B7280`. Subtle placeholder text rests at `#9CA3AF`.
- **Restrained Semantic Tokens:**
  - **Success:** Emerald green (`#059669`, base `#10B981`) paired with a muted tint wash (`#ECFDF5`) for badges, commit confirmations, and passing pipeline runs.
  - **Warning:** Balanced amber (`#D97706`) over light amber wash (`#FFFBEB`) for degraded services and pending actions.
  - **Critical / Error:** Controlled vermilion red (`#EF4444`) with wash (`#FEF2F2`) for broken builds, failed tests, and destructive interactions.

## Typography

Typography is split strictly along functional lines:

1. **System Sans (`Geist`):** Manages interface navigation, section titles, table contents, and analytical summaries. It operates at tight tracking and compact line-heights to support high information density without sacrificing legibility.
2. **Monospace (`JetBrains Mono`):** Applied across all technical artifacts, including commit SHAs, file directories, terminal outputs, query strings, metrics counters, keyboard shortcut markers, and status chips.

Headings maintain subtle negative tracking (`-0.01em` to `-0.02em`) to ground the layout with mechanical authority.

## Layout & Spacing

The layout uses a structured, dense grid model engineered for multi-pane layouts, nested data trees, and full-bleed monitoring consoles.

- **Grid Strategy:** A fluid 12-column grid within primary dashboard workspaces, complemented by fixed-width collateral bars (e.g., 240px navigation sidebars, 360px contextual inspector panels).
- **Rhythm & Compaction:** Spacing follows a compact 4px mathematical scale. Vertical and horizontal padding are compressed relative to standard enterprise software, ensuring critical data remains above the fold.
- **Breakpoints & Adaptation:**
  - **Desktop (≥ 1280px):** Multi-pane split layouts active; sidebars remain pinned; table data displays all analytical metrics with fixed 16px horizontal cell padding.
  - **Tablet (768px – 1279px):** Inspector panels collapse into slide-over sheets; navigation shrinks to compact icons; margins tighten to `1rem`.
  - **Mobile (< 768px):** Single-column stack; sticky horizontal navigation tabs; dense horizontal scroll bars for code snippets and data tables.

## Elevation & Depth

This system avoids ambient shadows, blurs, and soft skeuomorphic drop-shadows. Depth is articulated purely through surface juxtaposition and 1px borders:

- **Base Layer (Level 0):** Canvas backdrop (`#F9FAFB`) with flat structural layout seams.
- **Contained Surface (Level 1):** Cards, tables, and sidebars in `#FFFFFF`, defined by a crisp `1px solid #E5E7EB` perimeter.
- **Overlay & Popovers (Level 2):** Context menus, command bars (Cmd+K), and dropdowns use `#FFFFFF` with a direct `1px solid #E2E8F0` border and a tightly controlled, near-zero structural key shadow: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`.
- **Active Focus & Modals (Level 3):** Modal overlays use an unobtrusive backdrop mask (`rgba(17, 24, 39, 0.2)`), containing an internal window edged with a crisp `1px solid #111827` boundary.

## Shapes

The geometry across the design system is governed by low-radius, precision-engineered corners (`0.25rem` / 4px base, expanding to `0.375rem` / 6px for outer modal frames and cards). Elements never use organic pills, rounded bubbles, or fluid stadium shapes.

Internal elements within composite components (e.g., segmented switch handles, search input insets, code blocks) follow strict concentric corner nesting: inner radius is consistently 2px smaller than the container radius to preserve geometric equilibrium.

## Components

### Buttons
- **Primary:** Background `#111827`, text `#FFFFFF`, border `1px solid transparent`, border-radius 4px. Hover: `#1F2937`. Active: `#000000`. Height: 32px (compact 28px). Font: Geist 13px weight 500.
- **Secondary / Ghost:** Background `#FFFFFF`, text `#111827`, border `1px solid #E5E7EB`. Hover: `#F9FAFB` with border `#D1D5DB`.
- **Keyboard Shortcut Affordances:** Primary and secondary action buttons display inline `<kbd>` badges styled in `JetBrains Mono` 10px, border `1px solid #E5E7EB`, radius 2px, background `#F3F4F6`.

### Chips & Badges
- **Status Chips:** Height 20px, font `JetBrains Mono` 11px, weight 500.
- **Execution States:**
  - *Success:* `#ECFDF5` background, `#059669` text, `1px solid #A7F3D0`. Includes a 6px solid green status pip.
  - *Warning:* `#FFFBEB` background, `#D97706` text, `1px solid #FDE68A`.
  - *Failed:* `#FEF2F2` background, `#EF4444` text, `1px solid #FECACA`.
  - *Neutral/Idle:* `#F3F4F6` background, `#4B5563` text, `1px solid #E5E7EB`.

### Data Lists & Tables
- **Table Headers:** Background `#F9FAFB`, border-bottom `1px solid #E5E7EB`, text `Geist` 11px uppercase weight 600, color `#6B7280`, tracking `0.05em`.
- **Rows:** Alternating hover state `#F9FAFB`, row border `1px solid #F3F4F6`, vertical cell padding 8px, cell typography `Geist` 13px with mono values formatted in `JetBrains Mono` 12px.

### Inputs & Command Bars
- **Text Inputs:** Height 32px, background `#FFFFFF`, border `1px solid #E5E7EB`, text `#111827`, font `Geist` 13px. Focus ring: `1px solid #111827` outline without blur glow.
- **Command Palette (Cmd+K):** Centered floating dialog, width 640px, background `#FFFFFF`, border `1px solid #E5E7EB`, box-shadow `0 8px 30px rgba(0, 0, 0, 0.08)`. Input field without borders, height 48px, font 14px.

### Checkboxes & Radios
- **Checkboxes:** 14px × 14px square, radius 3px, border `1px solid #D1D5DB`, background `#FFFFFF`. Checked state: `#111827` background, white check icon.
- **Radio Buttons:** 14px circle, border `1px solid #D1D5DB`. Checked state: 4px centered solid `#111827` dot.

### Code Blocks & Insets
- **Code Container:** Background `#F9FAFB`, border `1px solid #E5E7EB`, radius 4px, padding 8px 12px. Font: `JetBrains Mono` 12px, line-height 18px, syntax colors keyed to neutral slate and dark charcoal with emerald accents for strings.