# Shared UI Foundation

These components extend the BeatMarketplace neumorphic design system and are intended for application-wide reuse.

## Global theme and component rules

[`app/theme.css`](../../app/theme.css) is the source of colors, graphite surfaces, purple accents, clay gradients, shadows, radii, and motion. `app/globals.css` imports it once and applies the shared material and interaction states. Public, Personal, Producer, and Admin screens use the same theme.

- Reuse `NeumorphicSurface`, `NeumorphicButton`, `NeumorphicLink`, and `NeumorphicInput`. Use `neo-inset` for recessed controls and `neo-raised` / `neo-raised-strong` for sculpted panels.
- Use semantic Tailwind colors: `text-foreground`, `text-secondary`, `text-muted`, `text-faint`, `text-accent-text`, `bg-surface`, and `border-divider`. Use `error`, `success`, `warning`, and `info` tokens for feedback. Do not add hex colors, local palettes, or new shadow recipes to feature components.
- If a CSS value is needed directly, use `var(--text)`, `var(--surface)`, `var(--radius-control)`, `var(--radius-card)`, or another token from the theme. Add new reusable material decisions to the theme first.
- Reserve the accent button for the primary action. Use readable labels, persistent field hints, inline errors, and clear loading, empty, and failure states. Never communicate a status by color alone.
- Preserve visible keyboard focus, accessible names for icon controls, modal focus containment, reduced-motion support, and responsive layouts. Touch controls should be at least 44 px; ordinary inputs use `--control-height` (48 px).
- Use muted text for supporting content. Keep important instructions and errors above the faint decorative level. Tables must scroll within their panel on small screens.

For example, changing `--accent` or `--text-secondary` updates semantic utilities throughout the app; material gradients and depth recipes can be adjusted in the same file.

## DynamicForm

`DynamicForm` renders typed field configuration while the feature owns its values, validation, and API request. Supported controls are text-compatible inputs, password inputs with optional visibility controls, textarea, select, and checkbox.

```tsx
type Values = { title: string; visibility: string };

const fields = [
  { name: "title", label: "Title", required: true },
  {
    name: "visibility",
    label: "Visibility",
    type: "select",
    options: [
      { label: "Public", value: "PUBLIC" },
      { label: "Private", value: "PRIVATE" },
    ],
  },
] satisfies readonly DynamicFormField<Values>[];

<DynamicForm
  fields={fields}
  values={values}
  errors={errors}
  submitLabel="Save"
  onValueChange={(name, value) => setValues((current) => ({ ...current, [name]: value }))}
  onSubmit={handleSubmit}
/>
```

## DynamicTable

`DynamicTable<T>` accepts typed columns, rows, and a stable row-key function. It provides semantic table markup, horizontal overflow for small screens, loading skeletons, custom cell renderers, and an honest empty state. Data fetching, pagination, sorting, and mutations remain feature responsibilities.

```tsx
const columns: DynamicTableColumn<UserRow>[] = [
  { id: "name", header: "Name", accessor: "name" },
  { id: "roles", header: "Roles", cell: (row) => row.roles.join(", ") },
];

<DynamicTable columns={columns} rows={users} getRowKey={(row) => row.id} />
```

## DynamicModal

`DynamicModal` is controlled through `open` and `onClose`. It renders through a portal and includes a modal dialog role, labelled title, Escape handling, focus containment/restoration, body scroll locking, mobile presentation, and optional footer actions.

Use `presentation="sheet"` for a bottom-anchored panel with a drag handle. The handle and noninteractive header support downward dragging, distance/velocity dismissal and a spring-like return for short gestures. Content scrolling and sliders remain native. Handle, close-button, backdrop and Escape dismissal keep focus contained and scrolling locked until the exit animation completes; reduced-motion settings skip the animation. The music player opts into this mode without changing form dialogs.

```tsx
<DynamicModal open={open} onClose={() => setOpen(false)} title="Edit profile" footer={actions}>
  <ProfileForm />
</DynamicModal>
```

## ToastProvider and useToast

`ToastProvider` is mounted once in the root layout. Client components call `useToast()` for success, error, warning, or informational messages.

```tsx
const toast = useToast();

toast.success("Saved", "Your changes are live.");
toast.error("Could not save", "Review the form and try again.");
```

Toasts are appropriate for operation-level feedback. Validation errors should also remain next to their fields so users do not lose actionable context.

## Music surfaces

All native scroll areas share the global scrollbar rules in `app/globals.css` and the `--scrollbar-*` theme tokens. Do not override `scrollbar-color` or `scrollbar-width` in individual components: non-auto standard values can override the rounded WebKit parts. Styling applies to both axes, nested panels and form fields; high-contrast mode retains system controls. Wheel, keyboard, touch and thumb dragging stay native.

The public listening experience uses the same graphite/purple palette as the workspaces. Define all colors, gradients and material shadows in `app/theme.css`; component styles consume the `--music-*` tokens. Use `.music-glass` for a featured translucent panel, and the existing `.neo-inset` and `.neo-button` primitives for controls. Keep album covers prominent, show play and saved states explicitly, and retain at least 44px touch targets. Decorative layers must not receive pointer events or reduce text contrast.

`TrackSpectrum` reads the existing global player's analyser rather than creating another audio element or audio graph. A spectrum belongs to its `trackId`: playing another beat must not animate it. Stop frame loops when paused, offscreen, hidden, or when reduced motion is requested. A spectrum shows frequencies at the current playback instant; seeking uses the separately labelled native range control. Do not draw invented waveform samples as if they came from the uploaded master.

`PlayerTimeline` combines the global player's current frequency spectrum and seek rail in the dock and expanded sheet. Its visual materials use the central `--player-*` tokens. The homepage Three.js sculpture is independent of audio and responds to pointer/touch interaction; do not connect its deformation to the audio analyser.
