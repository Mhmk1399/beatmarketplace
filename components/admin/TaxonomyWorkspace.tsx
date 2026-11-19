"use client";
import Image from "next/image";
import Link from "next/link";
import { ResourceManager, type ResourceConfig } from "./ResourceManager";
import { CategoryEditor } from "./CategoryEditor";
import type { TaxonomyItem, TaxonomyKind } from "@/lib/marketplace/types";
export function TaxonomyWorkspace({ kind }: { kind: TaxonomyKind }) {
  const title = kind === "genres" ? "Music categories" : kind[0].toUpperCase() + kind.slice(1);
  const config: ResourceConfig<TaxonomyItem> = { title, description: "Keep the music catalog organized with clear, consistent classifications.", endpoint: "/api/taxonomy", query: `kind=${kind}&mine=1`, label: item => item.name, canCreate: true, canEdit: true, canDelete: true, createLabel: `Add ${kind === "genres" ? "genre" : kind === "moods" ? "mood" : "instrument"}`, deleteLabel: "Deactivate", deleteDescription: "This hides the classification from public choices. Existing beats keep their references.",
    columns: [{ id: "name", header: "Name", accessor: "name" }, { id: "slug", header: "Slug", accessor: "slug" }, { id: "status", header: "Status", cell: item => <span className="workspace-status">{item.isActive ? "Active" : "Inactive"}</span> }],
    fields: () => [{ name: "name", label: "Name", required: true, maxLength: 80 }, { name: "slug", label: "Slug", required: true, maxLength: 100, hint: "Lowercase letters, numbers and hyphens, for example hip-hop." }, { name: "description", label: "Description", type: "textarea", maxLength: 1000, rows: 3 }, { name: "isActive", label: "Active and available in public lists", type: "checkbox" }], values: item => ({ name: item?.name ?? "", slug: item?.slug ?? "", description: item?.description ?? "", isActive: item?.isActive ?? true }), payload: (values, item) => ({ ...values, kind, ...(item ? { expectedVersion: item.version ?? 0 } : {}) }), deletePayload: item => ({ kind, expectedVersion: item.version ?? 0 }),
  };
  {
    config.createLabel = kind === "genres" ? "Add category" : kind === "moods" ? "Add mood" : "Add instrument";
    config.description = "Manage names, descriptions, thumbnails and banners. Existing beats keep their classification connections.";
    config.editor = props => <CategoryEditor {...props} kind={kind} />;
    config.columns = [
      { id: "thumbnail", header: "Thumbnail", cell: item => item.thumbnailUrl ? <Image src={item.thumbnailUrl} alt="" width={56} height={56} unoptimized className="size-14 rounded-[var(--radius-control)] object-cover" /> : <span className="neo-inset flex size-14 items-center justify-center rounded-[var(--radius-control)] text-accent-text" aria-label="No thumbnail">♪</span> },
      { id: "name", header: "Name", cell: item => <div className="max-w-64"><strong>{item.name}</strong><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{item.description || "No description yet"}</p></div> },
      { id: "slug", header: "Slug", accessor: "slug" },
      { id: "banner", header: "Banner", cell: item => item.bannerUrl ? <Image src={item.bannerUrl} alt="" width={120} height={45} unoptimized className="h-12 w-32 rounded-[var(--radius-control)] object-cover" /> : <span className="text-xs text-muted">Not set</span> },
      { id: "sortOrder", header: "Order", cell: item => item.sortOrder ?? 0 },
      { id: "status", header: "Status", cell: item => <span className="workspace-status">{item.isActive ? "Active" : "Inactive"}</span> },
    ];
    config.details = item => <div className="space-y-5">
      {item.bannerUrl && <Image src={item.bannerUrl} alt={`${item.name} banner`} width={960} height={360} unoptimized className="aspect-[8/3] w-full rounded-[var(--radius-card)] object-cover" />}
      <div className="flex items-center gap-4">{item.thumbnailUrl && <Image src={item.thumbnailUrl} alt={`${item.name} thumbnail`} width={80} height={80} unoptimized className="size-20 rounded-[var(--radius-control)] object-cover" />}<div><p className="font-bold">{item.name}</p><p className="mt-1 break-all text-sm text-muted">{item.slug}</p></div></div>
      <p className="whitespace-pre-wrap text-sm leading-7 text-secondary">{item.description || "No description yet."}</p>
      <p className="text-xs text-muted">{item.isActive ? "Active" : "Inactive"} · Display order {item.sortOrder ?? 0}</p>
      {kind === "instruments" && <p className="text-xs text-muted">Family: {item.family ?? "OTHER"}</p>}
      {item.isActive && <Link className="text-sm text-accent-text underline" prefetch={false} href={kind === "genres" ? `/marketplace?genre=${encodeURIComponent(item.slug)}` : `/${kind}/${encodeURIComponent(item.slug)}`}>Open public page →</Link>}
    </div>;
  }
  return <ResourceManager key={kind} config={config} />;
}
