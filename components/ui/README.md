# Shared UI Foundation

These components extend the BeatMarketplace neumorphic design system and are intended for application-wide reuse.

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
