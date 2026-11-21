"use client";

import { useDetailNavHeight } from "./useDetailNavHeight";

/** Reuse the actual listening layout; only its contents become noninteractive placeholders. */
export function TrackDetailSkeleton() {
  const screen = useDetailNavHeight();
  return <div className="track-detail" aria-busy="true">
    <section ref={screen} className="detail-first-screen detail-skeleton" role="status" aria-label="Loading track">
      <span className="sr-only">Loading track</span>
      <div className="detail-cover-backdrop" aria-hidden="true" />
      <div className="detail-first-content" aria-hidden="true">
        <div className="detail-breadcrumb"><span className="detail-skeleton-line detail-skeleton-crumb" /><span className="detail-breadcrumb-end">THE LISTENING EXPERIENCE</span></div>
        <div className="detail-listening-overview">
          <div className="detail-art-stage"><div className="detail-album detail-skeleton-shape" /></div>
          <div className="detail-intro">
            <div className="detail-type-row"><span className="detail-type-tag detail-skeleton-ink">GENRE</span><span className="detail-track-kind detail-skeleton-ink">INSTRUMENTAL</span></div>
            <h1 className="detail-skeleton-title"><span className="detail-skeleton-line" /><span className="detail-skeleton-line" /></h1>
            <div className="detail-producer"><span className="detail-producer-avatar detail-skeleton-shape" /><span><small className="detail-skeleton-ink">Produced by</small><strong className="detail-skeleton-line detail-skeleton-producer" /></span></div>
            <dl className="detail-metadata">{["Tempo", "Key", "Duration"].map(label => <div key={label}><dt className="detail-skeleton-ink">{label}</dt><dd><span className="detail-skeleton-line detail-skeleton-value" /></dd></div>)}</dl>
          </div>
        </div>
        <div className="detail-console">
          <span className="detail-main-play neo-button detail-skeleton-shape" />
          <div className="detail-console-timeline"><div className="audio-timeline audio-timeline-large detail-preview-timeline">
            <span className="audio-time audio-time-elapsed detail-skeleton-ink">0:00</span>
            <div className="audio-seek"><span className="detail-skeleton-wave detail-skeleton-line" /><span className="audio-seek-rail" /></div>
            <span className="audio-time audio-time-duration detail-skeleton-ink">0:30</span>
          </div></div>
        </div>
        <div className="detail-secondary-actions"><span className="neo-button detail-license-anchor detail-skeleton-shape" /><span className="neo-button detail-skeleton-shape" /><span className="neo-button detail-skeleton-shape" /></div>
      </div>
    </section>
    <div className="detail-more-content detail-skeleton-more" aria-hidden="true"><div className="detail-story-grid"><div className="detail-about"><span className="detail-skeleton-line" /><span className="detail-skeleton-line" /><span className="detail-skeleton-line" /></div><div className="detail-purchase-summary music-glass"><span className="detail-skeleton-line" /><span className="detail-skeleton-line" /></div></div></div>
  </div>;
}
