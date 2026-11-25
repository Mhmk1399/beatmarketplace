type Placement = { _id: unknown; trackId: unknown; label: string; startsAt: Date; endsAt: Date; isActive: boolean; paymentStatus: string; agreedFeeToman: number };
/** Serialize only placements whose track is present in the producer-owned title map. */
export function producerPromotionDtos(placements: Placement[], ownedTitles: ReadonlyMap<string, string>, now = Date.now()) {
  return placements.flatMap(item => { const title = ownedTitles.get(String(item.trackId)); if (!title) return []; const state = !item.isActive ? "Inactive" : item.endsAt.getTime() <= now ? "Ended" : item.startsAt.getTime() > now ? "Scheduled" : item.paymentStatus === "PENDING" ? "Awaiting payment" : "Live"; return [{ id: String(item._id), trackId: String(item.trackId), trackTitle: title, label: item.label, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString(), state, paymentStatus: item.paymentStatus, agreedFeeToman: item.agreedFeeToman }]; });
}
