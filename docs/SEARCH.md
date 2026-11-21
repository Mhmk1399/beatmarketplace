# Global marketplace search

## Entry and results

`components/search/GlobalSearch.tsx` owns the navbar entry on public pages. The search dialog loads on demand, opens with the button or Ctrl/Command + K, and reuses `DynamicModal`, shared clay buttons and global loading feedback. The homepage hero contains navigation actions instead of a second search form. Mobile inputs use 16px text. Escape restores focus, the dialog body scrolls internally, and search submission works with Enter or the visible search button.

The empty search box offers account-scoped recent searches, popular phrases and separate Categories/Moods/Instruments browse controls. Selecting a browse item opens its canonical page directly. Submission goes to `/search?q=...`; beats, categories, moods and instruments have separate labeled sections and their own destinations. Query pages are excluded from search-engine indexing. Errors offer retry without losing the query; empty results never invent matches.

## API and matching

- `GET /api/search?q=...&page=1`: grouped results, twelve beats per page and up to 24 matches per taxonomy group.
- `GET /api/search?q=...&mode=suggest`: four results per group for suggestions.
- `GET /api/search/discover`: active browse entries and eight most-searched catalog phrases.
- `POST /api/search/popular` with `{ "q": "..." }`: validates a submitted catalog query and records its popularity when eligible.

Queries are trimmed and limited to 2–100 characters, normalized to Unicode letters/numbers, case-folded and stripped of combining marks. Arabic/Persian character and digit variants normalize consistently. Common Persian music names and English variants have explicit aliases. Literal user input never becomes an unescaped regular expression.

Prefix matches, indexed two-/three-character grams, bounded Damerau–Levenshtein distance and taxonomy relationships produce candidates. Adjacent swapped letters such as `tarp`, `drak`, `pinao` and `nigth drive` are recognized. Taxonomy matches also find beats assigned to that category, mood or instrument even when the term is absent from the title. Exact names rank first; equally close taxonomy names prefer the shorter matching name. This is an inexpensive lexical search, with no external paid service, embedding model or claim of understanding every misspelling.

Every result page rechecks current PUBLISHED/PUBLIC visibility and the producer's ACTIVE/PRODUCER eligibility. Search responses project only safe display fields, never masters, stems, account details or protected file keys.

## Data and deployment

`Track.search.tokens` and `Track.search.grams` are derived from the title, tags and first twelve description words. Tokens are bounded to forty and grams to sixty-four per track; two named multikey compound indexes serve candidate retrieval. Existing taxonomy relationship indexes support semantic category matches. There is no duplicated catalog or beat-to-taxonomy search relation.

Track validation/save and `findOneAndUpdate`/`updateOne` text edits maintain these fields. Direct collection writes, aggregation update pipelines and `bulkWrite` bypass those hooks. After a bulk import or seed, run:

```powershell
npm run db:search
```

The idempotent command creates the search/statistics indexes and backfills tracks in cursor batches of 100. Its guarded updates skip concurrent edits and change only derived search fields: no prices, publication states, relationships, timestamps, versions or media files. Rerun if it reports skipped concurrent edits. During development, a retained Track model without search fields is recompiled in memory so it receives the new middleware; this does not change records or restart the database. Production processes load the hooks on startup.

## Cost controls and freshness

Typing waits 320ms and pauses during IME composition. SWR deduplicates public suggestions for 30 seconds, full results for 20 seconds and discovery for 60 seconds. Focus does not refetch. The result dialog module loads only when needed, and category/beat links disable route prefetch to avoid fetching many detail pages merely by displaying search results.

Each server process has a bounded 128-entry promise cache, coalescing concurrent identical requests. Active taxonomy data lasts 60 seconds, popular phrases 30 seconds, and ranked candidate IDs 20 seconds. Only eight distinct expensive candidate lookups run concurrently per process; further requests receive 429 with Retry-After. Mongo queries have explicit time budgets and bounded projections.

An uncached query fetches at most 160 prefix/semantic candidates, plus 120 fuzzy candidates when needed. Ranking runs over those bounded candidates in memory; there is no full-catalog fuzzy scan or expensive exact total count. Pagination covers this closest-match window, **not every possible match in an arbitrarily large catalog**. The page avoids claiming an exhaustive total. Fresh public eligibility is checked even for cached candidates, while ordinary text/taxonomy edits can take up to the cache TTL to appear. At very large catalog sizes, evaluate relevance and explain plans on production-like data; an external search index can replace this provider without changing the UI or canonical database models.

Caches are process-local and cold on restart. Multiple instances do not share cache hits; Redis or a dedicated search service would be an explicit future infrastructure choice. This implementation limits work but does not claim a measured throughput for an untested production dataset.

## History and popularity

Recent searches use `beatmarketplace-search-history-v1:<userId|guest>` in localStorage, with ten deduplicated entries, per-item removal and clear history. Blocked browser storage falls back to a bounded in-memory history. Searches are saved on submission rather than every keystroke; switching accounts selects a different history scope.

`PopularSearch` stores only a normalized, catalog-matched term, count and last-searched timestamp. Arbitrary unmatched phrases, email-like strings, URLs and long numeric identifiers are not published as suggestions. No IP, account identifier or raw search log is stored in this model. Inactive popular entries expire after 90 days.

A signed HttpOnly, SameSite=Lax visitor cookie and short-lived `SearchReceipt` records deduplicate each catalog term once per visitor per UTC day, with at most forty distinct terms counted per visitor/day. Receipts contain hashes and expire automatically; receipt addition and counter increment share a Mongo transaction. The client also suppresses repeat submissions for a day within the tab. Typing, suggestion fetches and repeated refreshes do not increase the count. Analytics failure never blocks results. This controls accidental duplicates; resetting cookies is not a comprehensive bot-defense mechanism.

Statistics require MongoDB transaction support, as used by the other transactional marketplace flows. Empty popularity remains empty until real submissions occur; no fabricated trending data is seeded.
