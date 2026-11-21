"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { SearchIcon } from "@/components/ui/icons";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import styles from "./search.module.css";
const SearchDialog = dynamic(() => import("./SearchDialog").then(module => module.SearchDialog), { ssr: false });
export function GlobalSearch() {
  const [open, setOpen] = useState(false), [initial, setInitial] = useState("");
  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k" && !event.isComposing && (!document.querySelector("[role='dialog'],dialog[open]") || open)) { event.preventDefault(); setOpen(true); }
    }
    function requested(event: Event) { setInitial((event as CustomEvent<string>).detail || ""); setOpen(true); }
    window.addEventListener("keydown", keyboard); window.addEventListener("beatmarketplace:search", requested);
    return () => { window.removeEventListener("keydown", keyboard); window.removeEventListener("beatmarketplace:search", requested); };
  }, [open]);
  return <><NeumorphicButton className={styles.trigger} aria-label="Search the marketplace" title="Search beats, categories, moods and instruments (Ctrl/⌘ K)" aria-haspopup="dialog" aria-expanded={open} onClick={() => { setInitial(""); setOpen(true); }}><SearchIcon /><span>Search</span><kbd>⌘ K</kbd></NeumorphicButton>{open && <SearchDialog initialQuery={initial} onClose={() => setOpen(false)} />}</>;
}
