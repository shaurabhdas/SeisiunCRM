# Design Specification: Forecast Pulse Dashboard

This document defines the structural layout, spacing, typography, colors, and content requirements for the **Forecast Pulse Dashboard**. Use this as a reference to verify design fidelity, debug layouts, or revert UI changes.

---

## 1. Global Visual Language

### Colors
* **Background**: Light warm gray / off-white (`#F7F7F2` or Tailwind equivalent `bg-[#f7f7f2]`). Dark mode fallback is `bg-zinc-950/40`.
* **Primary Text (Foreground)**: Dark charcoal/black (`text-zinc-900` or `text-foreground`).
* **Secondary Text (Muted)**: Muted gray (`text-zinc-500` or `text-muted-foreground`).
* **Borders**: Thin, low-contrast gray line (`border-zinc-200` or `border-border`).
* **Accents**:
  * **Success/Positive**: Muted emerald green (`bg-emerald-50` and `text-emerald-800` / `dark:bg-emerald-950/30` and `text-emerald-400`).
  * **Action/Next Step**: Light sky blue banner (`bg-sky-50` and `text-sky-800` / `dark:bg-sky-950/20` and `text-sky-400`).
  * **Alert/Warning**: Amber/orange warning icon (`text-amber-600`).

### Layout & Spacing
* **Page Padding**: 
  * Mobile/Tablet: `px-4 pt-6`
  * Desktop: `lg:px-6 pt-6 pb-10`
* **Grid Configurations**:
  * Top KPI Row: 3-column equal grid (`grid-cols-1 md:grid-cols-3 gap-4`).
  * Bottom Panels: 2-column unbalanced layout (`grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-5`).

---

## 2. Component Specifications

### 2.1 Header Section
```
┌────────────────────────────────────────────────────────────────────────┐
│ Manager forecast view                                                  │
│ Know what is commit, what is upside, and what is about to slip.        │
│                                                   [ ↗ Commit up $38K ] │
└────────────────────────────────────────────────────────────────────────┘
```
* **Muted Subtitle**:
  * Text: `"Manager forecast view"` (case-sensitive)
  * Styling: Extra-small size (`text-xs`), bold/semibold (`font-semibold`), uppercase, letter-spaced (`tracking-wider`), muted gray.
* **Page Title**:
  * Text: `"Know what is commit, what is upside, and what is about to slip."`
  * Styling: Extra-bold (`font-extrabold`), large size (`text-2xl md:text-3xl`), tight tracking (`tracking-tight`).
* **Top Right Trend Badge**:
  * Icon: Line chart pointing up (`TrendingUp`) with color `text-emerald-600`.
  * Text: `"Commit up $38K"`
  * Pill container: Fully rounded (`rounded-full`), padding `px-3 py-1.5`, bg color `bg-emerald-50`, text color `text-emerald-800`.

---

### 2.2 Top KPI Cards Row
Exactly three cards aligned in a single row (flex/grid).

```
┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
│ Commit forecast         │ │ Best case               │ │ Likely slip             │
│                         │ │                         │ │                         │
│ $392K                   │ │ $621K                   │ │ $148K                   │
│ 74% confidence          │ │ 14 active opportunities │ │ 5 deals need exec action│
│                         │ │                         │ │                         │
│ [ +12% from last week ] │ │ [ +$82K newly qual. ]   │ │ [ 2 green to amber ]    │
└─────────────────────────┘ └─────────────────────────┘ └─────────────────────────┘
```

#### Shared Card Design:
* Background: Solid white (`bg-card`), rounded corners (`rounded-lg`), subtle border (`border`), small shadow (`shadow-xs`), padding `p-4`.

#### Card 1: Commit forecast
1. **Title**: `"Commit forecast"` (muted text, `text-sm`, medium weight).
2. **Value**: `"$392K"` (large bold text, `text-3xl font-semibold tracking-tight`).
3. **Detail Line**: `"74% confidence"` (muted text, `text-sm`).
4. **Bottom Pill**: `"+12% from last week"`
   - Styling: Rounded pill (`rounded-md`), muted background (`bg-muted`), text color (`text-muted-foreground`), text size (`text-xs`), medium weight.

#### Card 2: Best case
1. **Title**: `"Best case"` (muted text, `text-sm`, medium weight).
2. **Value**: `"$621K"` (large bold text, `text-3xl font-semibold tracking-tight`).
3. **Detail Line**: `"14 active opportunities"` (muted text, `text-sm`).
4. **Bottom Pill**: `"+$82K newly qualified"`
   - Styling: Same as Card 1.

#### Card 3: Likely slip
1. **Title**: `"Likely slip"` (muted text, `text-sm`, medium weight).
2. **Value**: `"$148K"` (large bold text, `text-3xl font-semibold tracking-tight`).
3. **Detail Line**: `"5 deals need executive action"` (muted text, `text-sm`).
4. **Bottom Pill**: `"2 moved from green to amber"`
   - Styling: Same as Card 1.

---

### 2.3 Bottom-Left Panel: Forecast Movement
A column displaying specific deal status cards with next-action banners.

* **Header**:
  * Title: `"Forecast movement"` (medium-large size `text-lg`, bold/semibold, text-foreground).
  * Subtitle: `"The deals that changed forecast quality this week."` (muted gray, `text-sm`).
  * Right Side Icon: Warning triangle (`AlertTriangle` / `TriangleAlert`) in amber (`text-amber-600`).
* **Deal Cards Container**: Vertical list with spacing (`space-y-3`).

#### Nested Deal Card Layout:
```
┌─────────────────────────────────────────────────────────┐
│ Northstar Labs                                    $96K  │
│ Legal has a fixed review...                      Commit │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Next action: Send redline summary today             │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```
1. **Main Container**: Card background, thin borders (`border`), rounded corners (`rounded-md`), padding `p-4`, small shadow.
2. **Row 1 (Header)**:
   - Left: Deal name (`"Northstar Labs"`, `"Mercury Retail"`, `"RelayWorks"`) in bold/medium black text.
   - Right: Deal Value (`"$96K"`, `"$118K"`, `"$74K"`) in bold black text.
3. **Row 2 (Subtext)**:
   - Left: Muted description (`"Legal has a fixed..."`, `"No technical stakeholder..."`, `"Pilot success criteria..."`) in small size (`text-sm`), leading relaxed.
   - Right: Category status tag (`"Commit"`, `"Slip Risk"`, `"Upside"`) in small muted text aligned to the right.
4. **Row 3 (Next Action Banner)**:
   - Light blue background banner spanning full width of the card interior.
   - Padding: `px-3 py-2`, text size `text-sm`, weight `font-medium`.
   - Text: Starts with `"Next action: "` followed by the task (`"Send redline summary today"`, `"Schedule technical discovery"`, `"Confirm approval path"`).

---

### 2.4 Bottom-Right Panel: Stage Confidence & Team Forecast
A combined dashboard column hosting pipeline stage tracking and team individual quotas.

```
┌─────────────────────────────────────────────────────────┐
│ Stage confidence                                    [📊]│
│ Conversion quality by current pipeline stage.           │
│                                                         │
│ Qualified                                42% confidence │
│ [████████░░░░░░░░░░░░░░░░░░░░]                          │
│ ...                                                     │
│                                                         │
│ Team forecast                                           │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Avery Jones   Commit $168K   Best $244K   3.2x cov  │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ Mina Patel    Commit $126K   Best $203K   4.1x cov  │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

#### Upper Part: Stage Confidence Progress
* **Header**:
  * Title: `"Stage confidence"` (medium-large `text-lg`, bold/semibold).
  * Subtitle: `"Conversion quality by current pipeline stage."` (muted gray, `text-sm`).
  * Right Side Icon: Bar Chart icon (`BarChart3`) in muted gray.
* **Stage Progress Bars**:
  * Spacer: Gap between items (`gap-4` or `gap-6`).
  * Label Header: Label on left (`Qualified`, `Discovery`, `Proposal`, `Negotiation`) and percent weight on the right (`"42% confidence"`, `"51% confidence"`, `"63% confidence"`, `"78% confidence"`) in small/medium text size.
  * Bar Style: Height of `h-3`, track background `bg-muted` (light gray), progress fill `bg-zinc-950` (or `bg-zinc-100` in dark mode).

#### Lower Part: Team Forecast Table
* **Header Title**: `"Team forecast"` (small/medium text size `text-sm font-semibold text-foreground`, positioned after a separator/gap).
* **Table/List Container**: Rounded-md border, background white (`bg-background`), overflow hidden.
* **Team Rows**:
  * Avery Jones, Mina Patel, Jordan Lee.
  * Columns (4 columns, `grid-cols-4` or flex spacing):
    1. Rep Name: `"Avery Jones"`, `"Mina Patel"`, `"Jordan Lee"` (medium weight, black text).
    2. Commit text: `"Commit $168K"`, `"Commit $126K"`, `"Commit $98K"` (muted text).
    3. Best Case text: `"Best $244K"`, `"Best $203K"`, `"Best $174K"` (muted text).
    4. Coverage ratio: `"3.2x coverage"`, `"4.1x coverage"`, `"2.1x coverage"` (green text: `text-emerald-700` / `dark:text-emerald-400`, bold/medium weight, right-aligned on larger viewports).
  * Inter-row divider: Bottom border (`border-b`), last row has none (`last:border-b-0`).
  * Hover: Highlight row on hover with subtle transition (`hover:bg-muted/30 transition-colors`).
