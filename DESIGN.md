---
name: BlueHouse
description: A calm, exact public view of Argentine exchange rates.
backgroundClass: "bg-zinc-100 dark:bg-slate-900"
colors:
  accent: "indigo-600"
  accent-hover: "indigo-700"
  accent-soft: "indigo-100 / dark:indigo-900/50"
  light-canvas: "zinc-100"
  light-surface: "zinc-50"
  light-ink: "zinc-800"
  light-muted: "zinc-500"
  light-rule: "zinc-300"
  dark-canvas: "slate-900"
  dark-surface: "slate-950"
  dark-ink: "slate-200"
  dark-muted: "slate-500"
  dark-rule: "slate-700"
  chart-official: "oklch(58% 0.18 285)"
  chart-blue: "oklch(56% 0.13 250)"
  chart-bolsa: "oklch(58% 0.10 175)"
  chart-ccl: "oklch(57% 0.12 310)"
  chart-wholesale: "oklch(66% 0.11 95)"
  chart-crypto: "oklch(54% 0.08 215)"
  chart-card: "oklch(58% 0.13 20)"
typography:
  headline:
    fontFamily: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 650
    lineHeight: 1.1
    letterSpacing: "-0.035em"
  title:
    fontFamily: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 650
    lineHeight: 1.3
  body:
    fontFamily: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "0.08em"
rounded:
  sm: "6px"
  md: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  primary-rate:
    backgroundClass: "bg-zinc-50 dark:bg-slate-950"
    textClass: "text-zinc-800 dark:text-slate-200"
    rounded: "{rounded.md}"
    padding: "24px"
  secondary-rate:
    backgroundClass: "bg-zinc-100 dark:bg-slate-900"
    textClass: "text-zinc-800 dark:text-slate-200"
    rounded: "{rounded.sm}"
    padding: "16px 0"
  status-chip:
    backgroundClass: "bg-indigo-100 dark:bg-indigo-900/50"
    textClass: "text-indigo-800 dark:text-indigo-200"
    rounded: "999px"
    padding: "6px 10px"
---

# Design System: BlueHouse

## 1. Overview

**Creative North Star: "The Exchange Bulletin"**

BlueHouse should feel like a precisely typeset daily bulletin made interactive: quiet enough for routine checking, exact enough to trust, and structured around the rates people seek first. Its neutral zinc light theme serves ordinary daylight reading; its low-glare slate dark theme serves the same task in dim environments without becoming a trading terminal.

It rejects the spectacle of a crypto trading terminal and the sameness of a generic admin dashboard. Responsive feedback is limited to direct interaction and chart state; content never performs an entrance sequence.

**Key Characteristics:**
- Zinc surfaces in light mode, slate surfaces in dark mode, and one clear indigo interface accent.
- A deliberate light and dark palette controlled by a persistent moon/sun toggle.
- Official and blue rates dominate; operational freshness remains compact.
- Tabular figures, short labels, and strong alignment carry the hierarchy.
- Dividers and tonal shifts replace decorative shadows.

## 2. Colors

Use Tailwind palette utilities directly for interface color. Light mode uses zinc, dark mode uses slate, and indigo marks focus and identity without becoming a market signal. CSS color variables are reserved for chart integration and the seven rate-series colors.

### Accent
- **Primary:** `indigo-600`, with `indigo-700` for hover states.
- **Soft:** `indigo-100` in light mode and `indigo-900/50` in dark mode for status and selection backgrounds.
- **Text:** `indigo-800` in light mode and `indigo-200` in dark mode where accent-colored labels are needed.

### Light Mode: Zinc
- **Canvas:** `bg-zinc-100`, paired with `dark:bg-slate-900` on the page background.
- **Raised surface:** `bg-zinc-50`.
- **Primary text:** `text-zinc-800`.
- **Muted text:** `text-zinc-500` or `text-zinc-600` when stronger contrast is required.
- **Rules:** `border-zinc-300`.

### Dark Mode: Slate
- **Canvas:** `dark:bg-slate-900`, paired with `bg-zinc-100` on the page background.
- **Raised surface:** `dark:bg-slate-950`.
- **Primary text:** `dark:text-slate-200`.
- **Muted text:** `dark:text-slate-500` or `dark:text-slate-300` when stronger contrast is required.
- **Rules:** `dark:border-slate-700`.

### Implementation Rule

Write interface colors as Tailwind classes, for example `bg-zinc-100 dark:bg-slate-900`. Do not introduce CSS variables for canvas, surface, text, border, accent, hover, or status colors. Variables may be used only where the chart library requires runtime color values, including chart series, axes, ticks, and grid lines.

### Named Rules

**The One Signal Rule.** Indigo occupies less than 10% of the interface and never indicates whether a rate rose or fell.

**The Chart Exception Rule.** Multiple hues are allowed only inside the seven-series historical chart and its legend.

## 3. Typography

**Display Font:** Space Grotesk (with system sans fallback)
**Body Font:** Space Grotesk (with system sans fallback)

**Character:** Space Grotesk gives the interface a precise, slightly engineered rhythm without becoming monospace. Financial values use `font-variant-numeric: tabular-nums` and tighter tracking.

### Hierarchy
- **Headline** (650, 2rem, 1.1): Page identity and primary section statements.
- **Title** (650, 1rem, 1.3): Rate names and compact section headings.
- **Body** (400, 0.9375rem, 1.55): Supporting information, capped at 70 characters where prose appears.
- **Label** (650, 0.75rem, 0.08em): Quiet uppercase metadata and terse status labels.

### Named Rules

**The Figure First Rule.** Currency values receive the strongest weight and always use tabular numerals; labels never compete with them.

## 4. Elevation

The system is flat by default. Depth comes from `zinc-50` against `zinc-100` in light mode, `slate-950` against `slate-900` in dark mode, sparse one-pixel rules, and spacing. Shadows are prohibited on static rate groups and operational summaries.

### Named Rules

**The Bulletin Rule.** If a section needs a shadow to separate it, its spacing or divider hierarchy is wrong.

## 5. Components

### Chips
- **Style:** Compact pill with an indigo tint, contrasting indigo text, and a visible icon or dot where status is communicated.
- **State:** Status meaning is always repeated in text and never encoded by color alone.

### Cards / Containers
- **Corner Style:** Gently curved primary rate surfaces (12px); secondary rates use open rows rather than cards.
- **Background:** `bg-zinc-50 dark:bg-slate-950` for official and blue; the zinc/slate canvas for all other content.
- **Shadow Strategy:** None at rest.
- **Border:** One-pixel rules only where grouping is otherwise ambiguous.
- **Internal Padding:** 24px for primary rates; 16px vertical for secondary rows.

### Navigation
- **Style:** A slim masthead with the product name, data scope, and a persistent moon/sun theme control. Interactive controls have visible focus rings and 40px minimum touch targets.

### Historical Rate Chart
- Seven lines share one plot and one ordered legend.
- Every observation timestamp emits a complete snapshot; casas without a new observation carry their last known value forward.
- Tooltips expose exact values without requiring hover on touch devices.
- Grid lines remain quieter than every data series.

## 6. Do's and Don'ts

### Do:
- **Do** place official and blue rates before every alternative quote.
- **Do** use tabular numerals and exactly two decimal places for every peso value.
- **Do** preserve a clear reading order from freshness, to current rates, to history.
- **Do** use responsive feedback only for focus, hover, data selection, and chart inspection.
- **Do** preserve identical information hierarchy and WCAG AA contrast in light and dark themes.
- **Do** use direct Tailwind indigo, zinc, and slate utilities for interface color.

### Don't:
- **Don't** resemble a crypto trading terminal: no neon, ticker density, speculative language, or alarmist movement cues.
- **Don't** create a generic admin-dashboard grid that gives every metric equal visual weight.
- **Don't** use side-stripe borders, gradient text, glassmorphism, or nested cards.
- **Don't** use indigo to imply price direction.
- **Don't** create interface color variables; variables are reserved for chart rendering.
