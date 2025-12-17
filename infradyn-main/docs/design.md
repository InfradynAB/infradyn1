# INFRADYN DESIGN SYSTEM

**Version 1.0 — Master UI/UX Guidelines**  


## 1. Design Principles (Apple-Grade Guidance)

1. **Clarity**  
    Every screen must communicate one primary action. Interfaces should avoid visual noise, redundant elements, and unnecessary decoration.
2. **Depth**  
    Use subtle shadows, layered surfaces, and motion to create spatial hierarchy. Nothing should feel flat unless it is intentionally passive.
3. **Precision**  
    Spacing, typography, and alignment must be mathematically consistent based on an 8-point grid.
4. **Integrity**  
    UI elements reflect the brand’s engineering excellence: clean, structured, and consistent across web, mobile, and PWA environments.

## 2. Branding Guidelines

### 2.1 Logo Usage

**Use the INFRADYN logo on:**

- Login screen
- Sidebar header
- System emails
- Splash/loading screens
- Top-left dashboard header (compact version)

**Do not:**

- Stretch, rotate, recolor beyond approved variants
- Add shadows, glows, or filters on the logo
- Place logo on busy backgrounds

**Preferred logo placement:** Left-aligned, 24px padding from edges.

## 3. Color System

Colors derived from logo and industrial-grade design tone.

### 3.1 Primary Colors

| Name                    | Hex      | Usage                                    |
|-------------------------|---------|------------------------------------------|
| Infra Green             | `#0F6157` | Primary brand color, headers, primary buttons |
| Infra Magenta (Accent)  | `#E14FE3` | Accents: highlights, active states, progress markers |
| Deep Navy               | `#0A1C27` | Sidebar, navigation, dark surfaces       |

### 3.2 Neutral Colors

| Name    | Hex      | Usage                        |
|---------|---------|------------------------------|
| Grey 900| `#1E1E1E` | Main text on light backgrounds |
| Grey 700| `#3A3A3A` | Subtext, labels              |
| Grey 500| `#888888` | Placeholder text             |
| Grey 300| `#DDDDDD` | Light borders                |
| Grey 100| `#F5F5F5` | Light background surfaces    |

### 3.3 Semantic Colors

| Role    | Color | Hex      | Usage                                   |
|---------|-------|---------|-----------------------------------------|
| Success | Green | `#20C997` | Successful uploads, approved workflows  |
| Warning | Yellow| `#FFC107` | Progress deviations, delays             |
| Danger  | Red   | `#FF4F4F` | NCRs, high-risk conflicts               |
| Info    | Blue  | `#3FA9F5` | Informational states                    |

### 3.4 Gradients (Apple Style)

Used sparingly for emphasis (dashboards, hero sections):

- **Gradient A:** Infra Green (60%) → Deep Navy (40%)
- **Gradient B:** Infra Magenta → Infra Green (for progress highlights)

## 4. Typography

Inspired by Apple’s San Francisco type system.

**Primary Font:** Inter — clean, modern, perfect for dashboards and enterprise systems.

**Type Scale (Apple 2024 Guidelines):**

| Style         | Weight    | Size | Usage                          |
|---------------|-----------|------|--------------------------------|
| Display       | SemiBold  | 32px | Dashboard headers              |
| Heading 1     | SemiBold  | 24px | Page titles                    |
| Heading 2     | Medium    | 20px | Section headers                |
| Heading 3     | Medium    | 18px | Subsection headers             |
| Body Large    | Regular   | 16px | Main text                      |
| Body Small    | Regular   | 14px | Placeholder text, labels       |
| Micro Text    | Regular   | 12px | Metadata, timestamps           |

**Line Height:** 1.3 for titles, 1.5 for paragraphs.

## 5. Spacing & Layout

**8-point grid system:** all margins, padding, spacing must be in multiples of 8.

- 8px → micro spacing
- 16px → default spacing
- 24px → container spacing
- 32px → section spacing
- 48px → major layout spacing

**Containers:**

- Max width for content: 1280px
- Card radius: 14px (rounded but professional)
- Card shadows: `rgba(0, 0, 0, 0.05) 0 4px 12px`

## 6. Component Design

### 6.1 Buttons

- **Primary Button:** Infra Green background, white text, 8px radius, hover darkens by 6%, pressed adds subtle inner shadow.
- **Secondary Button:** 1px Infra Green border, Infra Green text, white background shifting to Grey 100 on hover.
- **Destructive Button:** Danger Red background with darker hover state.

### 6.2 Inputs

- Height: 48px
- Border: 1px Grey 300
- Focus: 1.5px Infra Green border with soft glow
- Radius: 8px

### 6.3 Tables

- Header background: Grey 100
- Row hover: Grey 100
- Selected row: slight green tint
- Columns: resizable
- Sticky header

### 6.4 Cards

- Background: white
- Radius: 14px
- Shadow: subtle only
- Padding: 24px

### 6.5 Navigation (Sidebar)

- Background: Deep Navy `#0A1C27`
- Text: White / Grey 300
- Active item: Infra Magenta underline with semi-bold text
- Icon style: thin-line Apple style

## 7. Page-Level Design

### 7.1 Dashboard

High contrast, minimal color usage, large display font for main KPI, soft gradients in the background.

### 7.2 PO / BOQ Management

Grid-based layout with centered content, left panel for metadata, right panel for interactive card sections.

### 7.3 NCR & Quality

Strong emphasis on severity: red tags for critical, yellow tags for moderate, evidence viewer with carousel UI.

### 7.4 Progress Tracking

Dual-path comparison UI with supplier vs internal cards side-by-side. Magenta for supplier, green for internal, risk indicator pill (green/yellow/red).

### 7.5 Supplier Portal

Simplified design with minimal visible actions and soft, clean surfaces.

### 7.6 PWA Offline Screens

Rounded and friendly, large icons, strong magenta indicators for “Pending Sync”.

## 8. Motion & Animation

Apply 7 Apple-grade principles:

- 120ms–180ms transitions
- Fade plus slight move (4–8px)
- Progressive disclosure animations
- Skeleton loaders (no spinners)
- Momentum scroll
- Soft easing: `cubic-bezier(.25, .1, .25, 1)`
- Use animations sparingly but meaningfully

## 9. Iconography

- Line icons (stroke width 1.75px)
- Style aligned with Fluent UI or thin HeroIcons
- No filled icons except critical alerts
- Colors based on semantic palette

## 10. Brand Voice

Tone must be professional, technical, minimal, precise, confident.

**Example copy:**

- “Your shipment is at risk. Review conflict details.”
- “Milestone verification completed successfully.”
- “Evidence synced when you reconnect.”

## 11. Accessibility

- AA contrast minimum
- Keyboard accessible
- Text scaling supported
- Focus rings always visible

## 12. Design Deliverables

- Color tokens
- Typography tokens
- Component library
- Sidebar & header templates
- Page templates
- Mobile responsive rules
- PWA offline-sync UI
- Supplier portal minimal interface
- Data visualization style guide

## 13. Do & Don’t

**Do**

- Keep everything clean, minimal, industrial-grade
- Use Infra Magenta sparingly
- Maintain consistent spacing
- Use whitespace intentionally

**Don’t**

- Use too many colors
- Over-stylize elements
- Add unnecessary borders
- Mix icon weights
- Use bright saturated gradients everywhere


