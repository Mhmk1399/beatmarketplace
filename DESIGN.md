---
version: alpha
omitted:
  - section: colors
    reason: Canonical color and material values are maintained in app/theme.css.
  - section: typography
    reason: The runtime font stack and typography adapter are maintained in app/theme.css.
  - section: rounded
    reason: Shared radius tokens are maintained in app/theme.css.
  - section: spacing
    reason: Existing shared components and responsive layouts own spacing; this change adds no new scale.
  - section: components
    reason: Canonical component implementations are referenced below instead of duplicated as token objects.
---

# BeatMarketplace design context

## Overview

BeatMarketplace serves independent music producers and listeners, with an English interface for an Iranian market. The established identity combines graphite clay surfaces, tactile neumorphic controls, violet accents, and translucent music surfaces. Public listening pages can be expressive; account and administration forms prioritize quick, readable work.

The user's existing design system is authoritative. Preserve its palette and materials when extending a screen. An isolated feature is not a reason to introduce a new visual theme.

## Colors

`app/theme.css` is the canonical runtime source. It defines `--canvas`, `--surface`, `--text`, `--muted`, `--accent`, semantic feedback colors, music glass materials, and component aliases. `app/globals.css` implements shared raised/inset/button materials; Tailwind receives the same theme through its existing adapter. Use these tokens rather than independent screen palettes or copied hexadecimal values.

## Typography

Use the existing `--font-ui` stack and its `--font-sans` adapter. Weight and scale distinguish display titles, field labels, body text, and metadata. Keep mobile input text at least 16px. Do not add remote font requests for a small UI change.

Application-owned text, descriptions, placeholders, validation messages, and accessible names are English. Preserve proper names and original messages submitted by users. Numbers use Latin digits. Dates retain the Jalali calendar with uppercase transliterated month names: `23 ABAN 1405`. Times use a 24-hour clock in `Asia/Tehran`; API instants remain ISO UTC. The detailed contract is in `docs/PERSIAN_DATE_TIME.md`.

## Layout

Preserve existing public and dashboard shells. Forms scroll naturally, modal bodies scroll internally, and modal actions stay reachable. Narrow screens retain complete controls and readable month/year values. Calendar weeks start on Saturday and English controls use left-to-right navigation.

The track listening hero fills the first viewport with an upright cover, linked producer, readable metadata, a glass waveform player and explicit View licenses/Save/Share controls. Mobile stacks these elements with height-aware sizing, including the open dock. Titles can occupy two lines according to the latest supplied reference. Licenses remain below the first screen. Search has one public navbar entry and a lazy dialog; results keep beats, categories, moods and instruments visibly separate. Recent searches are removable, and empty/error/loading states preserve the current query.

Track loading uses the same responsive layout and measured navbar spacing as the content, reserving the two-line title region. Loading shapes are noninteractive and respect reduced motion. Detail data uses account-scoped SWR caching with explicit stale/error feedback and mutation invalidation; accepted network responses alone align the discount clock. Preview glass remains a theme-owned static material with bounded blur and reduced-transparency fallbacks, not an animated filter.

Beat, category, mood and instrument covers use the shared `CoverImage` primitive. The parent provides a positioned, clipped frame with a stable aspect ratio or explicit dimensions; the image fills it with a centered cover crop and preserves its proportions. Intentional focal positions can be passed explicitly. Letterboxing and duplicate blurred images behind a contained cover are not the cover-card pattern. Text uses the existing bottom scrim, and unavailable images retain a themed placeholder within the same frame.

Beat navigation and sharing use title-based canonical slugs, including safely encoded Persian names. The actual beat name supplies the browser title and social metadata. IDs remain internal API/cache identities; former names and ID links resolve to the canonical page. URL ownership and metadata privacy follow `docs/TRACK_URLS.md`.

## Elevation & Depth

Use the shared `--fill-*`, `--shadow-*`, `--border-*`, and `--music-*` material tokens. Clay buttons use raised/pressed depth; music cards and player surfaces can layer bounded glass effects. Focus indicators must remain distinct from decorative glow.

## Shapes

Use `--radius-control`, `--radius-card`, `--radius-panel`, and `--radius-pill` from the theme. Preserve existing round icon controls and larger rounded panels; do not introduce an independent radius scale.

## Components

| Capability | Canonical owner | Contract |
| --- | --- | --- |
| Buttons and navigation buttons | `components/ui/neumorphic/Button.tsx` | Reuse `NeumorphicButton` or `NeumorphicLink`, including busy, disabled, focus and active states. |
| Select/Listbox | `components/ui/dynamic/DynamicSelect.tsx` | Authored English popup, keyboard selection and bounded scrolling. Calendar popups portal into their native dialog. |
| Date and time | `components/ui/dynamic/DynamicDateTimePicker.tsx`, `DateTimePanel.tsx`, `lib/date-time.ts` | Shared date/time/datetime variants; draft changes commit with Apply and cancel with Escape/Cancel. |
| Modal | `components/ui/dynamic/DynamicModal.tsx` | Named dialog, internal scrolling, focus containment/restoration; yield to a native calendar in the browser top layer. |
| Form | `components/ui/dynamic/DynamicForm.tsx` | Shared fields, inline validation and submission state; domain schemas remain authoritative. |
| Toast and loading | `components/ui/toast/ToastProvider.tsx`, `components/ui/dynamic/GlobalLoading.tsx` | Reuse the shared feedback systems. |
| Scrollbar | `app/globals.css` and theme tokens | Global visible, operable scrollbar baseline with system forced-color behavior. |
| Marketplace search | `components/search/GlobalSearch.tsx`, `SearchDialog.tsx`, `SearchResults.tsx` | Shared navbar entry, Enter/button submission, category navigation and separate result groups; behavior and cost bounds in `docs/SEARCH.md`. |
| Cover images | `components/ui/CoverImage.tsx` | Fill the owner's bounded frame with a cover crop, explicit optional focal position, and a stable fallback for failed image delivery. |

Existing workflow and data contracts are maintained in `docs/PERSIAN_DATE_TIME.md`, `docs/PRODUCER_ADMIN.md`, `docs/AUDIO_PLAYER.md`, and `docs/STORAGE_AND_SCALE.md`. New work extends these owners rather than adding screen-local alternatives.

## Do's and Don'ts

- Keep the graphite/violet clay identity consistent across public, producer, customer and admin screens.
- Keep full dates and years readable; test long month names on narrow screens.
- Test the open calendar, dropdown, keyboard navigation, focus restoration and reduced motion in a browser.
- Keep draft calendar state separate from committed form values and UTC persistence.
- Do not translate, rename or rewrite personal identities or original support messages as part of editorial catalog localization.
- Do not change prices, licenses, permissions, media or relationships while translating descriptions.
