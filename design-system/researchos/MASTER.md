# Design System Master File — ResearchOS

> **LOGIC:** When building a specific page, first check `design-system/researchos/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** ResearchOS
**Aesthetic Style:** Deep Cosmic Obsidian & Radiant Violet Glassmorphism (Inspirations: Moco AI + Learniverse + Advyon)
**Keywords:** Obsidian Canvas, Radiant Violet Aura, Constellation Knowledge Mesh, Floating Pill Navigation, Scholarly Editorial Serif, Precision Monospace

---

## Global Rules

### Color Palette

| Role | Hex / Value | CSS Variable | Purpose & Notes |
|------|-------------|--------------|-----------------|
| **Canvas Background** | `#07070C` | `--bg-canvas` | Deep pitch obsidian background |
| **Surface Level 1** | `#0D0C18` | `--bg-surface-1` | Sidebar, fixed nav panels, subtle layers |
| **Surface Level 2** | `#131224` | `--bg-surface-2` | Cards, data tables, active workspaces |
| **Surface Level 3** | `#1B1832` | `--bg-surface-3` | Elevated hover cards, dropdowns, popovers |
| **Modal / Dialog** | `rgba(21, 19, 41, 0.92)` | `--bg-surface-modal` | Floating modals with backdrop-blur-2xl |
| **Primary Violet** | `#8B5CF6` | `--color-primary` | Quantum Violet brand accent |
| **Primary Indigo** | `#6366F1` | `--color-secondary` | Electric Indigo secondary accent |
| **Accent Lavender** | `#C084FC` | `--color-accent` | Radiant lavender highlights & gradient stops |
| **Celestial Cyan** | `#38BDF8` | `--color-info` | AI Assistant, citation links, data metrics |
| **Text Primary** | `#F8FAFC` | `--color-foreground` | High-contrast crisp white (15.8:1 contrast) |
| **Text Secondary** | `#CBD5E1` | `--color-muted-foreground` | Soft platinum for subtitles & descriptions |
| **Text Muted** | `#94A3B8` | `--color-muted` | Slate muted for timestamps, metadata, captions |
| **Border Subtle** | `rgba(255, 255, 255, 0.08)` | `--border-subtle` | Standard hairline card borders |
| **Border Glow** | `rgba(168, 85, 247, 0.35)` | `--border-glow` | Hover/focus glowing borders |
| **State Success** | `#10B981` | `--color-success` | Emerald (Approved, Final, Active, Online) |
| **State Warning** | `#F59E0B` | `--color-warning` | Amber (Under Review, Pending Verification) |
| **State Danger** | `#EF4444` | `--color-destructive` | Crimson (Revision Requested, Suspended, Error) |

### Signature Gradients

- **Cosmic Violet Aura:** `radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.18) 0%, rgba(99, 102, 241, 0.08) 45%, transparent 75%)`
- **Cyan-to-Violet Text Gradient:** `linear-gradient(135deg, #38BDF8 0%, #818CF8 50%, #C084FC 100%)`
- **Electric Pill Button Gradient:** `linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)`

### Typography System

- **Display / Editorial Serif:** `Crimson Pro` or `Instrument Serif` (Headlines, paper titles, hero thesis)
- **Interface / Body Sans:** `Plus Jakarta Sans` or `Inter` (UI elements, Kanban cards, tables, forms)
- **Precision Monospace:** `JetBrains Mono` (DOIs, hyperparameters, BibTeX, LaTeX code, stats)

**Google Fonts Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
```

---

## Component Specs

### 1. Floating Pill Navigation Bar
```css
.nav-pill-bar {
  background: rgba(13, 12, 24, 0.75);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
  border-radius: 9999px;
  padding: 8px 24px;
}
```

### 2. Glassmorphic Cards with Glow Hover
```css
.card-glass {
  background: rgba(19, 18, 36, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
  transition: all 200ms cubic-bezier(0.16, 1, 0.3, 1);
}

.card-glass:hover {
  border-color: rgba(168, 85, 247, 0.35);
  box-shadow: 0 0 30px -8px rgba(139, 92, 246, 0.25);
  transform: translateY(-2px);
}
```

### 3. Primary Gradient Pill Button
```css
.btn-electric-pill {
  background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%);
  color: #FFFFFF;
  border-radius: 9999px;
  padding: 10px 22px;
  font-weight: 600;
  font-size: 14px;
  box-shadow: 0 0 20px -4px rgba(139, 92, 246, 0.4);
  transition: all 180ms ease;
  cursor: pointer;
}

.btn-electric-pill:hover {
  box-shadow: 0 0 28px -2px rgba(139, 92, 246, 0.65);
  transform: scale(1.02);
}
```

### 4. Status Badges & Breathing Indicators
- **Approved / Active:** `bg-emerald-500/10 border border-emerald-500/30 text-emerald-300` + pulsing green dot (`w-2 h-2 rounded-full bg-emerald-400 animate-ping`)
- **Under Review:** `bg-amber-500/10 border border-amber-500/30 text-amber-300`
- **Revision Requested:** `bg-rose-500/10 border border-rose-500/30 text-rose-300`
- **AI Highlight / Citation:** `bg-sky-500/10 border border-sky-500/30 text-sky-300`

---

## Pre-Delivery Checklist
- [ ] No emojis used as structural UI icons (use Phosphor / Lucide vector icons)
- [ ] High-contrast readability: >= 4.5:1 text contrast on all dark surfaces
- [ ] Visible focus rings on keyboard navigation (`ring-2 ring-purple-400 ring-offset-2 ring-offset-[#07070C]`)
- [ ] Responds seamlessly to `@media (prefers-reduced-motion: reduce)`
- [ ] Tested on 375px, 768px, 1024px, and 1440px+
