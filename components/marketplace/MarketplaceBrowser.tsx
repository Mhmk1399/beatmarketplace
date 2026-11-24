"use client";

import { DynamicSelect } from "@/components/ui/dynamic/DynamicSelect";

import Image from "next/image";
import { CoverImage } from "@/components/ui/CoverImage";
import {
  useEffect,
  useId,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  CloseIcon,
  GridIcon,
  MusicNoteIcon,
} from "@/components/ui/icons";
import {
  NeumorphicButton,
  NeumorphicLink,
  neumorphicButtonClass,
} from "@/components/ui/neumorphic/Button";
import { DynamicModal } from "@/components/ui/dynamic/DynamicModal";
import { useLoopCarousel } from "@/components/ui/dynamic/useLoopCarousel";
import { demoTracks } from "@/lib/audio/demo-tracks";
import { marketplaceAudioTrack } from "@/lib/audio/marketplace-track";
import {
  genreAliases,
  genreName,
  getGenreStyles,
  type GenreStyle,
} from "@/lib/marketplace/genres";
import {
  browseHref,
  emptyBrowseFilters,
  type BrowseFilters,
} from "@/lib/marketplace/browse";
import type { MarketplaceTrack } from "@/lib/marketplace/types";
import { useBrowseCatalog } from "./useBrowseCatalog";
import { BrowseBeatCard } from "./BrowseBeatCard";
import { MarketRibbon } from "./MarketRibbon";
import { MUSICAL_KEY_FILTER_OPTIONS } from "@/lib/music/keys";

const filterButtonClass = `${neumorphicButtonClass()} market-filter-trigger`;
const filterListMinWidth = 240;

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle
        cx="10.5"
        cy="10.5"
        r="6.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="m15.5 15.5 5 5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 5h16l-6 7v6l-4 2v-8L4 5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 5h12M9 12h12M9 19h12M3 5h.01M3 12h.01M3 19h.01"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
function Chevron({ previous = false }: { previous?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={previous ? "m14 6-6 6 6 6" : "m10 6 6 6-6 6"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Style = GenreStyle;
function genreMatches(track: MarketplaceTrack, style: Style) {
  if (style.id && track.genre?.id === style.id) return true;
  const slug = track.genre?.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return Boolean(slug && genreAliases(style.slug).includes(slug));
}

function FeaturedRail({
  tracks,
  demos,
}: {
  tracks: MarketplaceTrack[];
  demos: boolean;
}) {
  const entries = demos ? demoTracks : tracks.slice(0, 8);
  const {
    viewportRef,
    position,
    move,
    keyboard,
    pointerDown,
    pointerMove,
    finishDrag,
  } = useLoopCarousel(entries.length, 5);
  const queue = demos ? demoTracks : tracks.map(marketplaceAudioTrack);
  if (!entries.length) return null;
  return (
    <section
      className={`market-featured${demos ? " market-featured-demos" : ""}`}
      aria-labelledby="market-featured-title"
    >
      <header>
        <h2 id="market-featured-title">
          <MusicNoteIcon />
          {demos ? "Listening demos" : "Fresh picks"}
        </h2>
        <span>{demos ? "Full tracks · Not for sale" : "From this page"}</span>
        <div>
          <NeumorphicButton
            aria-label="Previous featured beats"
            onClick={() => move(-1)}
          >
            <Chevron previous />
          </NeumorphicButton>
          <NeumorphicButton
            aria-label="Next featured beats"
            onClick={() => move(1)}
          >
            <Chevron />
          </NeumorphicButton>
        </div>
      </header>
      <div
        ref={viewportRef}
        className="market-featured-viewport"
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label={
          demos
            ? "Listening demos. Swipe to browse."
            : "Fresh picks. Swipe to browse."
        }
        onKeyDown={keyboard}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onLostPointerCapture={finishDrag}
      >
        {[0, 1, 2]
          .flatMap((copy) =>
            entries.map((entry, index) => ({
              entry,
              slot: copy * entries.length + index,
            })),
          )
          .map(({ entry, slot }) => (
            <div
              key={slot}
              className="market-featured-slot"
              data-carousel-item={slot}
              inert={slot < position.from || slot > position.to}
              aria-hidden={slot < position.from || slot > position.to}
            >
              {demos ? (
                <BrowseBeatCard
                  demo={entry as (typeof demoTracks)[number]}
                  queue={queue}
                />
              ) : (
                <BrowseBeatCard
                  beat={entry as MarketplaceTrack}
                  queue={queue}
                />
              )}
            </div>
          ))}
      </div>
      <div className="market-featured-indicators" aria-hidden="true">
        {entries.map((entry, index) => (
          <span key={entry.id} data-active={position.first === index} />
        ))}
      </div>
    </section>
  );
}

export function MarketplaceBrowser({
  initialFilters,
}: {
  initialFilters: BrowseFilters;
}) {
  const catalog = useBrowseCatalog(initialFilters);
  const { filters, taxonomy, tracks, loading, error } = catalog;
  const styles = getGenreStyles(taxonomy.genres);
  const selectedStyle = styles.find(
    (style) =>
      genreAliases(style.slug).includes(filters.genre) ||
      style.id === filters.genre,
  );
  const [view, setView] = useState<"shelves" | "list">("shelves");
  const [allStyles, setAllStyles] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const [filterError, setFilterError] = useState("");
  const formId = useId();
  const hasFilters = Boolean(
    filters.q ||
    filters.genre ||
    filters.moodId ||
    filters.key ||
    filters.minBpm ||
    filters.maxBpm ||
    filters.sort !== "newest",
  );
  const filterCount = Object.entries(filters).filter(
    ([key, value]) => value && !(key === "sort" && value === "newest"),
  ).length;
  const queue = tracks.map(marketplaceAudioTrack);
  const shownStyles = allStyles ? styles : styles.slice(0, 5);
  const populated = styles.filter((style) =>
    tracks.some((track) => genreMatches(track, style)),
  );
  const unknown = tracks.filter(
    (track) => !styles.some((style) => genreMatches(track, style)),
  );

  useEffect(() => {
    function outside(event: PointerEvent) {
      const listId =
        event.target instanceof Element
          ? event.target.closest('[role="listbox"]')?.id
          : undefined;
      const owner = listId
        ? document.querySelector(`[aria-controls="${CSS.escape(listId)}"]`)
        : null;
      document
        .querySelectorAll<HTMLDetailsElement>(".market-filter-details[open]")
        .forEach((item) => {
          if (
            event.target instanceof Node &&
            !item.contains(event.target) &&
            !(owner && item.contains(owner))
          )
            item.open = false;
        });
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape")
        document
          .querySelectorAll<HTMLDetailsElement>(".market-filter-details[open]")
          .forEach((item) => {
            item.open = false;
            item.querySelector("summary")?.focus({ preventScroll: true });
          });
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  function update(patch: Partial<BrowseFilters>) {
    catalog.commit({ ...filters, ...patch });
  }
  function choose(event: MouseEvent<HTMLAnchorElement>, style: Style) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    update({ genre: style.slug });
    requestAnimationFrame(() => {
      const heading = document.getElementById(`${formId}-results`);
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    });
  }
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      draft.minBpm &&
      draft.maxBpm &&
      Number(draft.minBpm) > Number(draft.maxBpm)
    ) {
      setFilterError("Minimum BPM must be less than or equal to maximum BPM.");
      return;
    }
    setFilterError("");
    catalog.commit(draft);
    setFilterOpen(false);
    event.currentTarget.closest("details")?.removeAttribute("open");
  }
  function reset() {
    catalog.commit({ ...emptyBrowseFilters });
    setDraft({ ...emptyBrowseFilters });
  }
  function showFilters() {
    setDraft(filters);
    setFilterError("");
    setFilterOpen(true);
  }
  function selectStyle(style: Style, compact = false) {
    return (
      <NeumorphicLink
        key={style.slug}
        href={browseHref({ ...filters, genre: style.slug })}
        prefetch={false}
        variant="quiet"
        className={compact ? "market-category" : "market-style-link"}
        onClick={(event) => choose(event, style)}
      >
        <span className="market-category-art">
          <CoverImage
            src={style.thumbnailUrl ?? `/assets/genres/${style.art}.svg`}
            alt=""
            sizes="(max-width:699px) 60px, 110px"
          />
        </span>
        <span className="market-category-copy">
          <strong>{style.name}</strong>
          <span>{compact ? "Explore beats" : style.description}</span>
        </span>
        {compact && (
          <span className="market-category-arrow">
            <Chevron />
          </span>
        )}
      </NeumorphicLink>
    );
  }
  function shelf(style: Style, beats: MarketplaceTrack[]) {
    return (
      <section
        key={style.slug}
        className="market-shelf"
        aria-label={`${style.name} beats`}
      >
        {selectStyle(style)}
        <div className="market-shelf-cards">
          {loading ? (
            [0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className="market-card-skeleton"
                aria-label="Loading beat"
              />
            ))
          ) : beats.length ? (
            beats
              .slice(0, 4)
              .map((track) => (
                <BrowseBeatCard key={track.id} beat={track} queue={queue} />
              ))
          ) : (
            <div className="market-shelf-empty">
              <MusicNoteIcon />
              <span>
                Find your next {style.name} sound.
                <small>Explore the collection.</small>
              </span>
            </div>
          )}
        </div>
        <NeumorphicLink
          href={browseHref({ ...filters, genre: style.slug })}
          prefetch={false}
          className="market-view-all"
          onClick={(event) => choose(event, style)}
          aria-label={`View all ${style.name} beats`}
        >
          View all <ArrowRightIcon />
        </NeumorphicLink>
      </section>
    );
  }

  return (
    <div className="market-browser music-catalog">
      <header
        className={`market-heading${selectedStyle?.bannerUrl ? " market-heading-with-banner" : ""}`}
      >
        {selectedStyle?.bannerUrl && (
          <span className="market-category-banner" aria-hidden="true">
            <Image
              src={selectedStyle.bannerUrl}
              alt=""
              fill
              unoptimized
              sizes="100vw"
            />
          </span>
        )}
        <MarketRibbon />
        <p>
          {selectedStyle
            ? "Explore this music category"
            : "Explore the whole marketplace"}
        </p>
        <h1>
          {selectedStyle ? (
            <>
              {selectedStyle.name} <span>Beats</span>
            </>
          ) : (
            <>
              All <span>Beats</span>
            </>
          )}
        </h1>
        <p className="market-heading-description">
          {selectedStyle?.description ||
            "Discover beats by genre, mood, and style. Listen, license, and make it yours."}
        </p>
      </header>
      <section className="market-toolbar" aria-label="Find your sound">
        <form
          className="market-search"
          onSubmit={(event) => {
            event.preventDefault();
            catalog.refresh();
          }}
        >
          <NeumorphicButton
            type="submit"
            variant="quiet"
            aria-label="Search beats"
          >
            <SearchIcon />
          </NeumorphicButton>
          <label htmlFor={`${formId}-search`} className="sr-only">
            Search beats, producers or tags
          </label>
          <input
            id={`${formId}-search`}
            type="search"
            value={filters.q}
            maxLength={160}
            placeholder="Search beats, producers, or tags…"
            onChange={(event) => update({ q: event.target.value })}
          />
        </form>
        <div className="market-desktop-filters">
          <details className="market-filter-details">
            <summary
              className={filterButtonClass}
              onClick={() => {
                setDraft(filters);
                setFilterError("");
              }}
            >
              <span>{filters.minBpm || filters.maxBpm
                ? `${filters.minBpm || 20}–${filters.maxBpm || 400} BPM`
                : "BPM"}</span>
              <ChevronDownIcon />
            </summary>
            <form onSubmit={apply} className="market-filter-popover">
              <label>
                Minimum BPM
                <input
                  type="number"
                  min={20}
                  max={400}
                  value={draft.minBpm}
                  onChange={(event) =>
                    setDraft({ ...draft, minBpm: event.target.value })
                  }
                  placeholder="20"
                />
              </label>
              <label>
                Maximum BPM
                <input
                  type="number"
                  min={20}
                  max={400}
                  value={draft.maxBpm}
                  onChange={(event) =>
                    setDraft({ ...draft, maxBpm: event.target.value })
                  }
                  placeholder="400"
                />
              </label>
              {filterError && <p role="alert">{filterError}</p>}
              <NeumorphicButton variant="accent" type="submit">
                Apply BPM
              </NeumorphicButton>
            </form>
          </details>
          <details className="market-filter-details">
            <summary
              className={filterButtonClass}
              onClick={() => {
                setDraft(filters);
                setFilterError("");
              }}
            >
              <span>{filters.key || "Key"}</span>
              <ChevronDownIcon />
            </summary>
            <form onSubmit={apply} className="market-filter-popover">
              <label>
                Musical key
                <DynamicSelect
                  aria-label="Musical key"
                  options={MUSICAL_KEY_FILTER_OPTIONS}
                  value={draft.key}
                  onChange={(event) =>
                    setDraft({ ...draft, key: event.target.value })
                  }
                />
              </label>
              <NeumorphicButton variant="accent" type="submit">
                Apply key
              </NeumorphicButton>
            </form>
          </details>
          <DynamicSelect
            aria-label="Mood"
            className="market-filter-trigger"
            triggerVariant="button"
            minListWidth={filterListMinWidth}
            value={filters.moodId}
            onChange={(event) => update({ moodId: event.target.value })}
          >
            <option value="">Mood</option>
            {taxonomy.moods.map((mood) => (
              <option key={mood.id} value={mood.id}>
                {mood.name}
              </option>
            ))}
          </DynamicSelect>
          <DynamicSelect
            aria-label="Price order"
            className="market-filter-trigger"
            triggerVariant="button"
            minListWidth={filterListMinWidth}
            value={filters.sort}
            onChange={(event) =>
              update({ sort: event.target.value as BrowseFilters["sort"] })
            }
          >
            <option value="newest">Price</option>
            <option value="price-asc">Lowest price</option>
            <option value="price-desc">Highest price</option>
          </DynamicSelect>
        </div>
     
        <NeumorphicButton
          className="market-mobile-filter"
          aria-label="Open marketplace filters"
          aria-haspopup="dialog"
          onClick={showFilters}
        >
          <FilterIcon />
          {filterCount > 0 && <span>{filterCount}</span>}
        </NeumorphicButton>
      </section>
      {hasFilters && (
        <div className="market-active-filters" aria-label="Active filters">
          <span>
            {filters.genre ? genreName(filters.genre) : "Filtered beats"}
          </span>
          {filters.q && <span>“{filters.q}”</span>}
          {filters.key && <span>{filters.key}</span>}
          {filters.moodId && (
            <span>
              {taxonomy.moods.find((mood) => mood.id === filters.moodId)
                ?.name || "Selected mood"}
            </span>
          )}
          <NeumorphicButton variant="quiet" size="sm" onClick={reset}>
            Clear all <CloseIcon />
          </NeumorphicButton>
        </div>
      )}
      <div className="market-content" data-view={view} aria-busy={loading}>
        <h2
          id={`${formId}-results`}
          className={hasFilters ? "market-results-title" : "sr-only"}
          tabIndex={-1}
        >
          {filters.genre
            ? `${genreName(filters.genre)} beats`
            : hasFilters
              ? "Your results"
              : "Browse original beats"}
        </h2>
        {error && (
          <div className="market-load-error" role="alert">
            <MusicNoteIcon />
            <div>
              <strong>The catalog is taking a moment.</strong>
              <p>{error}</p>
            </div>
            <NeumorphicButton size="sm" onClick={catalog.refresh}>
              Try again
            </NeumorphicButton>
          </div>
        )}
        {!hasFilters && (
          <div className="market-categories" aria-label="Browse genres">
            {shownStyles.map((style) => selectStyle(style, true))}
            <NeumorphicButton
              variant="quiet"
              className="market-more-styles"
              onClick={() => setAllStyles((value) => !value)}
            >
              {allStyles ? "Fewer styles" : "More styles"}
              <ArrowRightIcon />
            </NeumorphicButton>
          </div>
        )}
        {hasFilters || view === "list" ? (
          <>
            {!loading && !error && !tracks.length && (
              <div className="market-empty">
                <MusicNoteIcon />
                <h3>No beats found for this mix.</h3>
                <p>Try another style or adjust your filters.</p>
                <NeumorphicButton onClick={reset}>
                  Clear filters
                </NeumorphicButton>
              </div>
            )}
            <div
              className={
                view === "list" ? "market-result-list" : "market-results-grid"
              }
            >
              {loading
                ? [0, 1, 2, 3, 4, 5].map((index) => (
                    <div
                      key={index}
                      className="market-card-skeleton"
                      aria-label="Loading beat"
                    />
                  ))
                : !error &&
                  tracks.map((track) => (
                    <BrowseBeatCard key={track.id} beat={track} queue={queue} />
                  ))}
            </div>
          </>
        ) : (
          <div className="market-shelves">
            {(populated.length ? populated : shownStyles).map((style) =>
              shelf(
                style,
                tracks.filter((track) => genreMatches(track, style)),
              ),
            )}
            {unknown.length > 0 &&
              shelf(
                {
                  slug: "",
                  name: "Original sounds",
                  description: "Independent by nature.",
                  art: "edm",
                },
                unknown,
              )}
          </div>
        )}
        {!hasFilters && !loading && (
          <FeaturedRail
            tracks={tracks}
            demos={Boolean(error) || !tracks.length}
          />
        )}
        {(catalog.page > 1 || catalog.hasMore) && (
          <nav className="market-pagination" aria-label="Catalog pages">
            <NeumorphicButton
              disabled={catalog.page === 1 || loading}
              onClick={catalog.previous}
            >
              Previous
            </NeumorphicButton>
            <span>Page {catalog.page}</span>
            <NeumorphicButton
              disabled={!catalog.hasMore || loading}
              onClick={catalog.next}
            >
              Next
            </NeumorphicButton>
          </nav>
        )}
        <p className="sr-only" role="status">
          {loading
            ? "Loading beats"
            : error
              ? "Catalog unavailable. Try again."
              : `${tracks.length} beats on this page`}
        </p>
      </div>
      <DynamicModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Refine your sound"
        presentation="sheet"
        size="md"
      >
        <form onSubmit={apply} className="market-filter-sheet">
          <label>
            Genre
            <DynamicSelect
              aria-label="Genre"
              value={draft.genre}
              onChange={(event) =>
                setDraft({ ...draft, genre: event.target.value })
              }
            >
              <option value="">All genres</option>
              {styles.map((style) => (
                <option key={style.slug} value={style.slug}>
                  {style.name}
                </option>
              ))}
            </DynamicSelect>
          </label>
          <div>
            <label>
              Minimum BPM
              <input
                type="number"
                min={20}
                max={400}
                value={draft.minBpm}
                onChange={(event) =>
                  setDraft({ ...draft, minBpm: event.target.value })
                }
                placeholder="20"
              />
            </label>
            <label>
              Maximum BPM
              <input
                type="number"
                min={20}
                max={400}
                value={draft.maxBpm}
                onChange={(event) =>
                  setDraft({ ...draft, maxBpm: event.target.value })
                }
                placeholder="400"
              />
            </label>
          </div>
          <label>
            Musical key
            <DynamicSelect
              aria-label="Musical key"
              options={MUSICAL_KEY_FILTER_OPTIONS}
              value={draft.key}
              onChange={(event) =>
                setDraft({ ...draft, key: event.target.value })
              }
            />
          </label>
          <label>
            Mood
            <DynamicSelect
              aria-label="Mood"
              minListWidth={filterListMinWidth}
              value={draft.moodId}
              onChange={(event) =>
                setDraft({ ...draft, moodId: event.target.value })
              }
            >
              <option value="">All moods</option>
              {taxonomy.moods.map((mood) => (
                <option key={mood.id} value={mood.id}>
                  {mood.name}
                </option>
              ))}
            </DynamicSelect>
          </label>
          <label>
            Price
            <DynamicSelect
              aria-label="Price order"
              value={draft.sort}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  sort: event.target.value as BrowseFilters["sort"],
                })
              }
            >
              <option value="newest">Newest first</option>
              <option value="price-asc">Lowest price</option>
              <option value="price-desc">Highest price</option>
            </DynamicSelect>
          </label>

          {filterError && (
            <p className="market-filter-error" role="alert">
              {filterError}
            </p>
          )}
          <footer>
            <NeumorphicButton
              type="button"
              variant="quiet"
              onClick={() => {
                setDraft({ ...emptyBrowseFilters });
                setFilterError("");
              }}
            >
              Reset
            </NeumorphicButton>
            <NeumorphicButton type="submit" variant="accent">
              Apply filters <ArrowRightIcon />
            </NeumorphicButton>
          </footer>
        </form>
      </DynamicModal>
    </div>
  );
}
