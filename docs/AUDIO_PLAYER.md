# Shared audio and interactive hero

## Ownership

`AudioPlayerProvider` is mounted once in `app/layout.tsx`. It owns the only persistent playback element and its optional Web Audio analysis graph. `PlayerDock` is mounted beside the route content, so changing pages does not restart the track. Cart/favorites remain in `MarketplaceProvider`; its playback methods now delegate to the shared engine.

The five files under `public/assets/audios/` are full-length listening demos with custom SVG covers. Their duration comes from the browser's media metadata. They are not marketplace sale records, and no producer, BPM, key or licensing metadata is invented for them.

Marketplace audio uses `marketplaceAudioTrack()` to preserve the maximum 30-second preview. This client limit supplements the independently cropped preview produced by the server; it never exposes the protected original. Saved previews in Producer Studio use the same global engine. A producer's unsaved local upload audition uses its temporary browser URL and pauses other playback through shared audio focus.

## Add a play button

```tsx
"use client";

import { useAudioActions } from "@/components/audio/AudioPlayerProvider";
import type { AudioTrack } from "@/lib/audio/types";

export function PlayTrack({ track, queue }: { track: AudioTrack; queue?: AudioTrack[] }) {
  const { toggle } = useAudioActions();
  return <button onClick={() => toggle(track, queue)}>Play / pause</button>;
}
```

Use `useAudioTransport()` for track/playing/buffering indicators, `useAudioPlayer()` where progress/queue/volume is required, and `useAudioAnalyser()` only for imperative audio visualizations. Stable separate contexts keep frequency canvases and ordinary play buttons independent of timeline updates. The analyser never publishes per-frame data into React state. The homepage background has no audio dependency.

Do not create another music playback element inside a feature page. Pass an explicit queue to play an album/list in order. Without an explicit queue, a new track joins the listening session. Close stops playback; minimizing keeps it running. The player does not autoplay on page load or resume automatically after a full browser reload.

## Controls and accessibility

- Play/pause, previous/next, rewind/forward 10 seconds, native keyboard-operable seek slider.
- Volume/mute with locally saved preference, repeat off/all/one, shuffle with previous-track history.
- Play queue, item removal, loading/error feedback and retry.
- Compact mobile dock and an expanded accessible dialog with every control.
- Safe-area positioning and a measured content spacer prevent the dock from covering the page footer.
- Space toggles playback, arrow keys seek five seconds, M toggles mute. Shortcuts ignore editable fields, buttons/links and open dialogs.
- Supported browsers receive Media Session metadata and hardware/lock-screen controls. Missing APIs leave ordinary playback available.

## Player spectrum

`PlayerTimeline` combines real FFT bars with the native seek rail in both the dock and expanded sheet. The played portion is highlighted; the remaining frequencies stay muted, and the bright thumb remains a keyboard/touch-operable range control. These are current frequency samples, not a precomputed waveform of the full recording. Opening the sheet unmounts the covered dock canvas while preserving its layout. Rendering uses bounded bands, DPR and 24/30 FPS tiers, and stops while paused, hidden, offscreen or under reduced motion. A bounded per-player snapshot preserves the last real frame on pause and when moving between dock and sheet. Missing analysis APIs leave playback available.

The dock's purple glass rim, ambient ribbons, play-button orbital halos and slider glow use centralized `--player-*` theme tokens. Halo movement respects reduced motion; decorative layers do not receive pointer events. Compact controls keep play/pause, previous/next, shuffle/repeat and the queue; the expanded sheet also exposes ten-second skips and the complete volume controls.

## Three.js hero

`HeroBackdrop` fills one shared `data-hero-space` wrapper behind both the full-viewport hero and the listening carousel. Only one Three.js scene and canvas are created for these sections. An immediate SVG ribbon background remains available while `HeroBackdropScene` and Three.js load dynamically near the viewport during idle time. Pointer movement across the section bends the ribbons; a touch on its decorative space changes their form. Page-scroll progress also moves and morphs them, including on mobile. The scene has no audio analyser or playback dependency. Its decorative layers do not intercept controls, and vertical scrolling remains native. GPU deformation uses cached geometry rather than rebuilding vertices each frame.

Rendering caps DPR at 1 on low-power devices and 1.35 otherwise, with 24/36 FPS tiers. Frame delays and render cost can lower fidelity further. It stops scheduling animation offscreen, in a hidden tab or behind a modal dialog. Reduced motion renders a static scene; data saver skips the 3D download. Unsupported WebGL or a lost context retains the SVG fallback. Geometry, materials, renderer, observers and listeners are disposed on removal. Central `--hero-*` tokens supply the background, glass materials and lighting.

These measures limit resource use; they cannot guarantee a frame rate on every physical device. Browser QA includes narrow viewports, reduced motion, WebGL fallback and CPU-throttled execution.

## Listening carousel

`ListeningRoom` uses `useLoopCarousel` with three bounded copies of the five demos. After scrolling settles, an instant offset reset preserves the exact visible cards and pixel positions, allowing continuous navigation in either direction. Offscreen copies are inert and hidden from assistive technology; all copies control the same audio element and five-item queue. The native scroll-snap viewport supports smooth arrow navigation, keyboard browsing (Left/Right/Home/End), touch momentum and mouse dragging on noninteractive card content. Desktop shows two cards at a time; mobile shows one smaller card. ResizeObserver keeps card geometry and the visible range synchronized; the viewport uses intersecting gradient masks for soft edges. Reduced motion switches to immediate navigation. The active card reuses PlayerTimeline for real FFT and seeking; other cards draw an idle spectrum without fake audio samples. Playback continues when browsing the carousel or changing routes.

Demo hearts in both carousels use `AudioFavoriteButton` and the shared `demo-favorites` external store. Only registered demo IDs are persisted under a dedicated localStorage key; updates synchronize all rendered copies and other tabs. Blocked storage retains reversible session favorites. Real marketplace audio uses the existing authenticated favorite API and never sends demo IDs to that API.

## Sponsored hero playback

The homepage currently passes all five `demoTracks` into `FeaturedBeats`, with custom covers and full-length playback through the same global audio engine. Demo cards do not invent sale prices or sponsorship. The layout fills exactly `100dvh`, including the overlaid navbar, and uses shared clay surfaces and buttons. Without its `demos` prop, `FeaturedBeats` reads `GET /api/hero` and renders up to ten explicitly ordered, distinct current sponsored bookings. Every public entry comes from an active `PAID` or `COMPLIMENTARY` schedule and an eligible published/public beat with real artwork, a stored master, a cropped preview, an active producer and a purchasable non-exclusive WAV-only license. Cards show current license pricing and a live spectrum only for the matching playing track. Their play controls convert marketplace tracks with `marketplaceAudioTrack()` and delegate through `useAudioActions()` to the same persistent global player and keep the 30-second preview limit. They never create another playback element. The shared server-aligned clock removes expired placements without continuous network polling.

The stacked deck has one interactive main card and decorative side cards. It supports previous/next, arrow keys and horizontal touch swipes while retaining native vertical scrolling. Six-second automatic rotation has a pause control, is disabled under reduced motion, and pauses during hover, keyboard focus, hidden/offscreen states or playback of the selected beat. Loading, retry and empty states are explicit; an empty schedule links to the real catalog.

Administrators manage the schedule at `/admin/hero` using `GET/POST /api/admin/hero` and `PATCH/DELETE /api/admin/hero/[id]`. They record whole-toman agreed fees, manual payment status and references; these fields are withheld from the public API. This is administrative booking/settlement bookkeeping, without an advertising charge or payout integration. `HeroPlacement` indexes are installed by the deployment `npm run db:indexes` command.

## Verification

Run `npm run check`, `npm test`, and `npm run build`. Pure audio tests cover preview limits, actual demo duration, queue boundaries/deduplication, shuffle, repeat and malformed values. Browser checks exercise the real supplied MP3 files, transport controls, route persistence, responsive layout and the visualizer.
