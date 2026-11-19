"use client";
import { WorkspaceError } from "@/components/dashboard/WorkspaceError";
export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) { return <WorkspaceError retry={retry} />; }
