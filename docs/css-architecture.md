# CSS Architecture — Valdoria WebApp

## Overview

All WebApp CSS follows a modular architecture. Large monolithic files have been split into focused modules imported via `@import` in the main CSS file.

## Shared Design System

| File | Lines | Description |
|------|-------|-------------|
| `valdoria-design.css` | ~1100 | CSS variables, fonts, buttons, modals, toast, error overlay, displaced overlay, skip button |
| `shared/loading.css` | ~700 | Loading screen animations (magic circle, backpack, progress bar) — responsive with `clamp()` |
| `shared/dice-3d.js` | — | THREE.js 3D dice (not CSS, but visual system) |
| `shared/dice-roller.css` | ~130 | Legacy emoji dice fallback |

## Game Hub (`game/`)

Main index: `game.css` (imports all modules)

| Module | Lines | Contents |
|--------|-------|----------|
| `game-layout.css` | 267 | Viewport, scrollbars, font picker, screen layout, buttons (action, hero, URL), bottom panel, footer toggle |
| `game-loading.css` | 562 | Loading overlay, magic circle, particles (fire/frost/lightning/arcane), gem, phase progression, cinematic exit, tips, progress bar |
| `game-overlays.css` | 245 | Toast notification, turn timer, error overlay + debug log, retry countdown, network badge, transition overlay |
| `game-transitions.css` | 115 | Screen slide/fade, badge bounce, staggered button entrance, hero pulse, content fade-in, location header entrance, ambient particles |
| `game-travel.css` | 252 | Cross-webapp themed transitions, location travel overlay + motes, text input, skip button |
| `game-hud.css` | 213 | Decorative dividers, bar group, progress bars (HP/MP/XP/HD), ghost bar, heal shine, stat badges (AC/ATK/DMG), resource badges (gold/items) |
| `game-headers.css` | 396 | Location header + biome themes, character identity card, flavor text, info section, party block, notification badge, social pulse, departure notice, spacer logic |
| `game-immersive.css` | 72 | Immersive toggle (`·`), restore pill (`· Menu`), bottom panel collapse animation |
| `game-dialogue.css` | 286 | Dialogue card, speaker header, speech body, typewriter cursor, skip hint, emotion themes (happy/angry/sad/busy/neutral), dice formula, opposed roll, inline skip pill |
| `game-cards.css` | 378 | Ally cards, HP/MP bars, inn member selection, member detail card, stats grid, spells, affinity, equipment |
| `game-quests.css` | 549 | Quest list, member lore, category badges, empty state |
| `game-quests-detail.css` | 185 | Quest detail view, chain badge/indicator, NPC name, action buttons, abandon |
| `game-feedback.css` | 215 | Feedback popup card, survey form, star rating, PIX support card |
| `game-ambient.css` | 112 | Night/day tint overlay, button tap ripple, footer hover glow, flavor atmosphere, bar shine on full HP/MP |
| `game-utilities.css` | 447 | Animation bridge, button row margins, back button, footer alignment, offline badge, skeleton loading, pull-to-refresh, connection dot, rate limit toast, debug console, character deletion modal |

## Combat (`combat/`)

Main index: `combat.css` (imports all modules)

| Module | Lines | Contents |
|--------|-------|----------|
| `combat-layout.css` | 63 | Arena header, viewport lock, zone sections, scrollbar reset |
| `combat-entities.css` | 422 | Entity cards (compact + expandable), player card, HP/resource bars, ghost bar, heal shine, expanded details |
| `combat-vfx.css` | 324 | Battlefield arena, combat VFX animations (slash/pierce/bludgeon/fire/frost/lightning/poison/radiant/necrotic), impact flash, status effect pulse |
| `combat-controls.css` | 284 | Action toast, turn timer (multi-stage warnings), initiative hero button, initiative area (THREE.js dice), damage 3D dice overlay |
| `combat-actions.css` | 228 | Action bar, bonus/reaction headers, loading indicator, skill/target overlays |
| `combat-themes.css` | 125 | Biome themes (forest/desert/cave/coastal/mountain/swamp/urban/shadow/fire/ice), ambient atmosphere, no-data state, fade transition |
| `combat-screens.css` | 264 | Resolution screen (victory/defeat), poll indicator, player shake, hit particles, target preview, DM narration, position badges, turn announcement banner |
| `combat-effects.css` | 244 | Floating damage numbers (normal/crit/heal/miss), hit-stop freeze, viewport damage/heal flash, anticipation overlay, death animation, sequential rewards, themed loading, phase transition, dodge flash, combo counter |
| `combat-polish.css` | 327 | Overlay entry animations, active turn enhancement, timer warnings, resolution polish, dice formula animation, action focus, init glow, HP tints, skill chance colors, waiting state, round/weather badges, dead entity, action bar gradient, narrative styling, reduced motion, ally MP, VFX canvas, combat toast, disabled shake, color vars |

## Exploration (`explore/`)

Main index: `explore.css` (imports all modules)

| Module | Lines | Contents |
|--------|-------|----------|
| `explore-layout.css` | 181 | Core layout, terrain tooltip, minimap, HUD top bar, map viewport |
| `explore-hud.css` | 136 | Bottom bar, return/inventory/explore buttons, pace toggle, location info |
| `explore-dm.css` | 288 | DM narration overlay (card, header, body, choices), biome visual themes |
| `explore-checks.css` | 147 | Stat check overlay, dice wrapper/canvas, formula, result (success/failure) |
| `explore-events.css` | 266 | Outcome overlay, combat warning, portal overlay, exit confirmation, death overlay, random encounter |
| `explore-journey.css` | 593 | Condition bar, travel animation, exit risk overlay, return journey (loot overlay, dice, summary), camp overlay + dice + result, low HP alert |
| `explore-effects.css` | 318 | Keyframes (badge bounce, HP pulse, card scroll), atmosphere (day/night), exit compass, exhaustion HUD, movement cost preview, weather effects, D&D 5e conditions |
| `explore-tutorial.css` | 370 | Reduced motion, tutorial overlay + cards + arrows + illustrations, help button, confirmation overlay, hex grid debug |
| `explore-modals.css` | 50 | Exhaustion level detail modal |

## Other WebApps (single-file CSS)

| WebApp | CSS Location | Lines | Notes |
|--------|-------------|-------|-------|
| Inventory | `inventory/inventory.css` | 803 | Tabs, equipment, items, modals, ally list |
| Prologue | `prologue/prologue.css` | 388 | Story screens, choices, dice, lore cards |
| Inn Animation | `game/inn-animation.css` | 458 | Sleep sequence, candle, moon, aura, frames |
| Navigate | `navigate/index.html` (inline) | ~600 | World map, info panel, quest list, travel overlay |
| Character Creator | `character_creator/index.html` (inline) | ~800 | Creation flow, stat allocation, race/class selection |
| Market | `market/index.html` (inline) | ~500 | NPC shops, item cards, modals |
| Levelup | `levelup/index.html` (inline) | ~400 | Level banner, ASI, feats, spells |

## Responsive Design

All CSS uses mobile-first design with these patterns:
- **`clamp(min, preferred, max)`** for font-sizes >= 20px and widths >= 100px
- **Target viewport**: 390x844 (iPhone 14 / standard Android)
- **Max content width**: 430px (locked in `valdoria-design.css`)
- **Touch targets**: minimum 44x44px
- **No horizontal scroll**

## Import Pattern

Each main CSS file (e.g., `game.css`) is now a pure import index:

```css
@import url('game-layout.css');
@import url('game-loading.css');
/* ... etc ... */
```

The HTML files reference only the main CSS file — no changes needed to `<link>` tags.
