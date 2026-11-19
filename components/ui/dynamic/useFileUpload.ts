"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "@/components/studio/shared";
import { idleUpload, type FileUploadProgress } from "@/lib/uploads/transport";

export function useFileUpload() {
  const [progress, setProgress] = useState<FileUploadProgress>(idleUpload);
  const current = useRef<AbortController | null>(null);
  useEffect(() => () => { const active = current.current; current.current = null; active?.abort(); }, []);
  const upload = useCallback(async <T,>(url: string, body: FormData, method = "POST"): Promise<T> => {
    if (current.current) throw new Error("An upload is already in progress.");
    const controller = new AbortController(); current.current = controller;
    setProgress({ ...idleUpload, phase: "uploading", percent: 0 });
    try {
      const data = await apiRequest<T>(url, {
        method, body, quiet: true, signal: controller.signal, onUploadProgress: next => {
          if (current.current === controller) setProgress(previous => previous.phase === next.phase && previous.percent === next.percent && previous.total === next.total ? previous : next);
        }
      });
      if (current.current === controller) setProgress(previous => ({ ...previous, phase: "success", percent: 100 }));
      return data;
    } catch (error) {
      if (current.current === controller) setProgress(previous => ({ ...previous, phase: controller.signal.aborted ? "cancelled" : "error" }));
      throw error;
    } finally { if (current.current === controller) current.current = null; }
  }, []);
  const reset = useCallback(() => { if (!current.current) setProgress(idleUpload); }, []);
  return { upload, reset, progress };
}
