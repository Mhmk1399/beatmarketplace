"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useAuth } from "@/components/auth/AuthProvider";
import { DynamicModal } from "@/components/ui/dynamic/DynamicModal";
import { FrequencyLoader } from "@/components/ui/dynamic/GlobalLoading";
import { NeumorphicButton } from "@/components/ui/neumorphic/Button";
import { CloseIcon, SearchIcon } from "@/components/ui/icons";
import { normalizeSearch } from "@/lib/search/matching";
import type { SearchDiscovery, SearchKind, SearchResponse } from "@/lib/search/types";
import { CategoryResult, searchLabels } from "./SearchItems";
import { recentSearches, rememberSearch, storeSearches } from "./history";
import Link from "next/link";
import styles from "./search.module.css";
import { searchFetcher } from "./fetcher";
export function SearchDialog({ initialQuery, onClose }: { initialQuery: string; onClose: () => void }) {
  const router = useRouter(), { user, status } = useAuth(), scope = user?.id || "guest";
  const [query, setQuery] = useState(initialQuery), [debounced, setDebounced] = useState(""), [composing, setComposing] = useState(false), [history, setHistory] = useState<string[]>([]), [kind, setKind] = useState<SearchKind>("genres"), [limit, setLimit] = useState(18), [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (status !== "loading") void Promise.resolve().then(() => setHistory(recentSearches(scope))); }, [scope, status]);
  useEffect(() => { const timer = setTimeout(() => setDebounced(composing ? "" : query.trim()), composing ? 0 : 320); return () => clearTimeout(timer); }, [query, composing]);
  const discovery = useSWR<SearchDiscovery>("/api/search/discover", searchFetcher, { revalidateOnFocus: false, dedupingInterval: 60000, errorRetryCount: 1 });
  const ready = !composing && query.trim() === debounced;
  const suggestions = useSWR<SearchResponse>(normalizeSearch(debounced).length >= 2 && !composing ? `/api/search?q=${encodeURIComponent(debounced)}&mode=suggest` : null, searchFetcher, { revalidateOnFocus: false, dedupingInterval: 30000, errorRetryCount: 1 });
  function submit(event?: FormEvent, value = query) {
    event?.preventDefault(); if (composing) return;
    const clean = value.trim(); if (normalizeSearch(clean).length < 2) { setError("Enter at least two letters or numbers."); input.current?.focus(); return; }
    if (status !== "loading") rememberSearch(scope, clean); onClose(); router.push(`/search?q=${encodeURIComponent(clean)}`);
  }
  const results = ready ? suggestions.data : undefined, typed = normalizeSearch(query).length >= 2;
  return <DynamicModal open size="xl" className={styles.panel} title="Search your sound" description="Beats, categories, moods and instruments. One place to find your next idea." onClose={onClose}>
    <div className={styles.dialogContent}>
      <form role="search" noValidate className={styles.form} onSubmit={submit}>
        <div className={styles.field}><SearchIcon /><input ref={input} data-autofocus type="search" aria-label="Search beats, categories, moods and instruments" value={query} maxLength={100} placeholder="Try trap, dark, piano…" autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} enterKeyHint="search" onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} onChange={event => { setQuery(event.target.value); setError(""); }} onKeyDown={event => { if (event.key === "Enter" && (event.nativeEvent.isComposing || composing)) event.preventDefault(); }} />{query && <NeumorphicButton variant="quiet" className={styles.iconButton} aria-label="Clear search" onClick={() => { setQuery(""); setError(""); input.current?.focus(); }}><CloseIcon /></NeumorphicButton>}</div>
        <NeumorphicButton variant="accent" type="submit" className={styles.submit} aria-label="Search"><SearchIcon /><span>Search</span></NeumorphicButton>
        <NeumorphicButton className={styles.iconButton} aria-label="Close search" onClick={onClose}><CloseIcon /></NeumorphicButton>
        {error && <p role="alert" className={styles.error}>{error}</p>}
      </form>
      <div className={styles.body}>
        {typed ? <>
          {!ready || suggestions.isLoading ? <FrequencyLoader overlay={false} label="Finding your sound…" /> : suggestions.error ? <div className={styles.empty}><p>Search could not load.</p><NeumorphicButton onClick={() => void suggestions.mutate()}>Try again</NeumorphicButton></div> : results && <>
            {results.corrected && <p className={styles.correction}>Closest match: <button type="button" onClick={() => submit(undefined, results.corrected!)}>{results.corrected}</button></p>}
            {results.beats.length > 0 && <section><h3 className={styles.heading}>Beats</h3><div className={styles.suggestionList}>{results.beats.map(beat => <Link key={beat.id} href={beat.href} onClick={onClose} className={styles.suggestionBeat}><span className={styles.typePill}>BEAT</span><span><strong>{beat.title}</strong><small>{beat.bpm} BPM · {beat.musicalKey}</small></span></Link>)}</div></section>}
            {(["genres", "moods", "instruments"] as const).map(group => results[group].length > 0 && <section key={group}><h3 className={styles.heading}>{searchLabels[group]}</h3><div className={styles.categoryGrid}>{results[group].map(item => <CategoryResult key={item.id} item={item} onNavigate={onClose} />)}</div></section>)}
            {!results.beats.length && !results.genres.length && !results.moods.length && !results.instruments.length && <p className={styles.empty}>No close matches yet. Try a shorter title, a mood or an instrument.</p>}
            <NeumorphicButton variant="accent" className={styles.allResults} onClick={() => submit()}>View search results</NeumorphicButton>
          </>}
        </> : <>
          {history.length > 0 && <section><div className={styles.sectionTop}><h3 className={styles.heading}>Recent searches</h3><NeumorphicButton variant="quiet" size="sm" onClick={() => setHistory(storeSearches(scope, []))}>Clear history</NeumorphicButton></div><div className={styles.chips}>{history.map(value => <span key={value} className={styles.historyChip}><button type="button" onClick={() => submit(undefined, value)}>{value}</button><button type="button" aria-label={`Remove ${value} from recent searches`} onClick={() => setHistory(storeSearches(scope, history.filter(item => item !== value)))}><CloseIcon /></button></span>)}</div></section>}
          <section><h3 className={styles.heading}>Popular searches</h3>{discovery.isLoading ? <FrequencyLoader overlay={false} label="Loading discovery…" /> : discovery.error ? <div className={styles.empty}><p>Discovery could not load.</p><NeumorphicButton onClick={() => void discovery.mutate()}>Try again</NeumorphicButton></div> : discovery.data?.popular.length ? <div className={styles.chips}>{discovery.data.popular.map(value => <NeumorphicButton key={value} size="sm" onClick={() => submit(undefined, value)}>{value}</NeumorphicButton>)}</div> : <p className={styles.hint}>Popular searches will appear as listeners explore the catalog.</p>}</section>
          {discovery.data && <section><h3 className={styles.heading}>Browse by sound</h3><div className={styles.tabs} role="group" aria-label="Browse categories, moods or instruments">{(["genres", "moods", "instruments"] as const).map(group => <NeumorphicButton key={group} size="sm" variant={kind === group ? "accent" : "default"} aria-pressed={kind === group} onClick={() => { setKind(group); setLimit(18); }}>{searchLabels[group]}</NeumorphicButton>)}</div><div className={styles.categoryGrid}>{discovery.data[kind].slice(0, limit).map(item => <CategoryResult key={item.id} item={item} onNavigate={onClose} />)}</div>{discovery.data[kind].length > limit && <NeumorphicButton className={styles.more} onClick={() => setLimit(value => value + 18)}>Show more {searchLabels[kind].toLowerCase()}</NeumorphicButton>}</section>}
        </>}
      </div>
    </div>
  </DynamicModal>;
}
