import { NextResponse } from "next/server";
import { z } from "zod";
import { readSecureJson, requireSameOrigin } from "@/lib/security/request";
import { consumeApiQuota } from "@/lib/security/rate-limit";
import { objectIdSchema } from "@/lib/marketplace/validation";
import { activeContractFilter, marketplaceError, MarketplaceError, producerIsPublic, publicTrackFilter, serializeLicense } from "@/lib/marketplace/server";
import { activeDiscountFilter, serializeDiscount } from "@/lib/marketplace/discount-server";
import Track from "@/models/Track";
import Contract from "@/models/Contract";
import Discount from "@/models/TrackDiscount";
const schema = z.object({ items: z.array(z.object({ trackId: objectIdSchema, contractId: objectIdSchema }).strict()).min(1).max(20) }).strict()
  .refine(value => new Set(value.items.map(item => item.trackId)).size === value.items.length, "Choose one license per track.");
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const { items } = schema.parse(await readSecureJson(request));
    await consumeApiQuota("license-quote", "all", 120, 60_000);
    const now = new Date(), quoted = [];
    for (const item of items) {
      const track = await Track.findOne({ _id: item.trackId, ...publicTrackFilter }).select("title producerId");
      if (!track || !await producerIsPublic(track.producerId)) throw new MarketplaceError("A beat is no longer available. Remove it from your cart.", 409);
      const license = await Contract.findOne({ _id: item.contractId, producerId: track.producerId, trackIds: track._id, ...activeContractFilter(now) });
      if (!license || license.terms.licenseType !== "NON_EXCLUSIVE" || license.filesToDeliver.some(file=>file.format !== "WAV")) throw new MarketplaceError("A selected license is unavailable for online purchase. Review the beat's licenses.", 409);
      const promotion = await Discount.findOne({ trackId: track._id, producerId: track.producerId, ...activeDiscountFilter(now) });
      quoted.push({ trackId: item.trackId, title: track.title, license: serializeLicense(license, promotion ? serializeDiscount(promotion) : null, now) });
    }
    return NextResponse.json({ items: quoted, serverTime: now.toISOString() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return marketplaceError(error); }
}
