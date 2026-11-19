# Shared UI Foundation

Calendar and time fields use `DynamicDateTimePicker`, `DynamicDatePicker` and `DynamicTimePicker`. All calendar UI is Persian with Tehran time, while API instants stay ISO UTC. `DynamicForm` integrates date, time and datetime-local fields automatically. See [Persian date and time controls](../../docs/PERSIAN_DATE_TIME.md) for value formats, bounds, keyboard use and native form support.

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

Use its `children` slot for shared custom controls such as `DynamicFileInput`. They render inside the same disabled fieldset and form, before submission actions, without nesting forms.

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

`DynamicTable<T>` accepts typed columns, rows and a stable row-key function. Narrow screens turn each semantic row into a labeled card. Optional `onView`, `onEdit`, `onDelete`, `getRowLabel`, `deleteLabel` and `busy` props add consistent accessible actions; `TableIdentity` displays a 44px image with initials fallback. It also supplies loading skeletons, an inline frequency loader, custom cells and an empty state. `ResourceManager` composes this table with paginated queries, shared forms, details and confirmed mutations.

```tsx
const columns: DynamicTableColumn<UserRow>[] = [
  { id: "name", header: "Name", accessor: "name" },
  { id: "roles", header: "Roles", cell: (row) => row.roles.join(", ") },
];

<DynamicTable columns={columns} rows={users} getRowKey={(row) => row.id} />
```

## Table data cache

`ResourceManager` uses `useWorkspaceData<T>(url)` with SWR 2.5.1. `TableCacheProvider` is mounted once under authentication in the root layout. Its memory cache survives client navigation, is recreated on browser reload, and never persists private data to browser storage. Keys include account ID, current roles and the canonical URL, including search, filters and pagination. Concurrent identical reads are deduplicated. Cached visits do not revalidate on mount/focus/reconnect or poll; the table's Refresh/Retry explicitly fetches fresh data.

Successful writes through `apiRequest()` notify the cache centrally. SWR clears every affected page/search entry and immediately revalidates mounted consumers; unmounted entries load fresh on the next visit. Related beat prices, licenses, offers, placements and taxonomy choices are invalidated together. Failed writes keep existing cache entries and form values. Logout/role changes retire old account entries. Supported browsers broadcast mutation metadata between tabs of the same account, without sharing cached records. Authentication changes also synchronize between tabs so shared-cookie account switches retire the old table keys. SWR mutation timestamps prevent older in-flight reads from replacing newer results.

`DynamicTable` remains the reusable presentation layer; use `ResourceManager` for CRUD or pair `useWorkspaceData` with the table for a custom view. A custom editor must save with `apiRequest`, or call `await notifyTableMutation(endpoint)` after its successful external write. `useWorkspaceData().refresh()` provides an explicit fresh read. Do not call the unscoped global SWR mutator: this app uses a provider, so use the hook/provider's scoped mutation API.

## DynamicFileInput and upload progress

`DynamicFileInput` is a controlled single-file picker for music or images. Pass `label`, `kind`, `value: File | null`, `onChange`, `accept` and `maxBytes`; optional `existingUrl`/`existingName` display a previously saved file. It supports native file selection, drag/drop, image thumbnails, file size/type details, replacement/removal of the local selection, required/type/size errors and disabled states. Preview object URLs are released on replacement/unmount. The component consumes the shared clay materials and provides 44px touch controls, reduced motion and responsive layouts.

`useFileUpload().upload<T>(endpoint, formData, method?)` preserves shared API validation, request deadlines and SWR invalidation while using XHR upload events for actual transferred-byte progress. Pass its `progress` to the picker, or use one `FileUploadStatus` for a multipart request containing both master and artwork. `uploading` is measured; `processing` is indeterminate after transfer finishes. Success appears only after the server response and cache invalidation complete. Errors preserve the selected file; profile uploads expose a Retry action. The hook aborts an unfinished request on unmount, and local progress stays visible during transfer instead of opening the global overlay. Selection alone never reports server completion.

The producer/admin beat editor shares these controls and one combined progress indicator. Its existing local WAV audition and selected 30-second crop remain intact. Account profiles use the same image picker with immediate upload and retry. An existing saved file can be replaced; removing a local selection does not delete a stored file.

Image selection prepares PNG/JPEG/WebP sources up to `IMAGE_SOURCE_MAX_BYTES` (20 MiB, 50 megapixels) as WebP strictly below 800,000 bytes. Use the shared limit from `lib/images/policy.ts` for image pickers. `onChange` receives the prepared `.webp` File, never the original image. Preparation is lazy-loaded, serialized in a Web Worker with OffscreenCanvas where supported, and uses an asynchronous canvas fallback. Large edges and encoding attempts are bounded. A `preparing` frequency indicator appears before network progress; form submission is blocked until preparation finishes. Prepared Files are reused on retries. Object URLs and workers are released on completion/unmount. The shared `apiRequest` also prepares image FormData entries so callers cannot accidentally skip this step. Audio entries retain their original bytes.

## DynamicSelect and DynamicMultiSelect

Use `DynamicSelect` for every select control. It accepts native select props and either `options={[{value, label}]}` or option children. A visible clay combobox supports arrows, typeahead, Home/End, Escape and touch; a hidden native select preserves form values, validation, refs and change events. Associate labels with its `id`. The options portal stays above form modals and scrolls independently. `DynamicMultiSelect` adds removable selections through `value: string[]`, `options`, `onChange` and an optional `max`.

## GlobalLoading

The root layout mounts `GlobalLoadingProvider` once. Call `const end = startGlobalLoading("Saving…")` and release with `end()` in `finally`, or use `useGlobalLoading().run(asyncTask, "Saving…")`. Concurrent calls share one centered music-frequency overlay with a blurred backdrop. `FrequencyLoader` can also render inline. Workspace `apiRequest()` handles this automatically, plus timeouts, safe errors and field issues; use `quiet: true` for debounced searches.

## DynamicModal

`DynamicModal` is controlled through `open` and `onClose`. It renders through a portal and includes a modal dialog role, labelled title, Escape handling, focus containment/restoration, body scroll locking, mobile presentation, and optional footer actions.

Use `presentation="sheet"` for a bottom-anchored panel with a drag handle. The handle and noninteractive header support downward dragging, distance/velocity dismissal and a spring-like return for short gestures. Content scrolling and sliders remain native. Handle, close-button, backdrop and Escape dismissal keep focus contained and scrolling locked until the exit animation completes; reduced-motion settings skip the animation. The music player opts into this mode without changing form dialogs.

```tsx
<DynamicModal open={open} onClose={() => setOpen(false)} title="Edit profile" footer={actions}>
  <ProfileForm />
</DynamicModal>
```

## ToastProvider and useToast

Account menus call `useAuth().requestLogout()` to open the shared confirmation dialog. Only its confirmation action sends the logout request; cancel, Escape and backdrop leave the session intact. The provider handles pending state, retryable errors, cross-tab notification and navigation after success. Do not call the logout endpoint directly from buttons.

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

Marketplace `BrowseBeatCard` cards show the complete cover with `object-fit: contain` over a blurred backdrop of the same image. Captions sit over the lower image with a masked blur and the global `--market-card-caption-*` materials. Covers have no fixed cropped strip; play/favorite controls remain reachable on narrow screens, and timed offers use a compact countdown inside the caption. List rows retain a thumbnail and separate readable metadata.

`TrackSpectrum` reads the existing global player's analyser rather than creating another audio element or audio graph. A spectrum belongs to its `trackId`: playing another beat must not animate it. Stop frame loops when paused, offscreen, hidden, or when reduced motion is requested. A spectrum shows frequencies at the current playback instant; seeking uses the separately labelled native range control. Do not draw invented waveform samples as if they came from the uploaded master.

`PlayerTimeline` combines the global player's current frequency spectrum and seek rail in the dock and expanded sheet. Its visual materials use the central `--player-*` tokens. The homepage Three.js sculpture is independent of audio and responds to pointer/touch interaction; do not connect its deformation to the audio analyser.

`ScrollingTitle` keeps a beat title on one line inside a width-constrained heading. Pass `text` and give the heading the same `aria-label` so its accessible name stays complete. Long titles automatically animate back and forth indefinitely on both desktop and mobile without hover, focus or touch. There is no slider or drag interaction. Short titles stay still. It supports Persian/RTL text, responds to resizing and font changes, and pauses offscreen/in hidden tabs or with reduced motion. Native transform animations avoid React updates on each frame. The track detail page uses it in its main heading; its mobile cover play button uses the shared global audio transport.

Public producer discovery lives at `/producers`, with stable ID links and username aliases at `/producers/[id]`. Directory counts are batched from public/published tracks. Public DTOs omit account credentials, contact email/phone and storage references. Producer images use role/status-checked public delivery routes while the original account-avatar route remains private. `/studio/profile` includes `ProducerPageEditor`: a live banner/layout preview, shared WebP file input, styles, six ordered featured beats, public biography/location and validated social links. Settings and banner replacement/removal commit together with version checks and upload rollback; successful changes invalidate public producer caches. The separate account form owns the avatar and username, and refreshes the designer's identity preview after saving.
