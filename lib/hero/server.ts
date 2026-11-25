import mongoose from "mongoose";
import type { AdminHeroPlacement, HeroPlacementItem } from "@/lib/hero/types";
import { MAX_HERO_PLACEMENTS } from "@/lib/hero/validation";
import {
  activeContractFilter,
  MarketplaceError,
  publicTrackFilter,
  serializeLicense,
  serializeTracks,
} from "@/lib/marketplace/server";
import ContractModel from "@/models/Contract";
import HeroPlacementModel, {
  type HeroPlacementFields,
} from "@/models/HeroPlacement";
import ProducerProfileModel from "@/models/ProducerProfile";
import TrackModel from "@/models/Track";
import UserModel from "@/models/User";

type PlacementRecord = HeroPlacementFields & { _id: unknown };
type HeroLicense = Parameters<typeof serializeLicense>[0];

/** Only assets already exposed by the publication pipeline can be advertised. */
export const heroTrackFilter = {
  ...publicTrackFilter,
  "audio.preview.publicUrl": { $type: "string" as const, $ne: "" },
  "audio.previewDurationSeconds": 30,
  "audio.master.key": { $type: "string" as const, $ne: "" },
  "artwork.publicUrl": { $type: "string" as const, $ne: "" },
};

export function activeHeroFilter(now = new Date()) {
  return {
    isActive: true,
    paymentStatus: { $in: ["PAID", "COMPLIMENTARY"] },
    startsAt: { $lte: now },
    endsAt: { $gt: now },
  };
}

/** Join only one eligible producer/license per candidate, using existing indexed IDs. */
export function heroEligibilityLookups(
  trackField: string,
  producerField: string,
  now = new Date(),
): mongoose.PipelineStage[] {
  return [
    {
      $lookup: {
        from: UserModel.collection.name,
        let: { producer: `$${producerField}` },
        pipeline: [
          {
            $match: {
              status: "ACTIVE",
              roles: "PRODUCER",
              $expr: { $eq: ["$_id", "$$producer"] },
            },
          },
          { $project: { _id: 1 } },
          { $limit: 1 },
        ],
        as: "__heroProducer",
      },
    },
    { $match: { "__heroProducer.0": { $exists: true } } },
    {
      $lookup: {
        from: ContractModel.collection.name,
        localField: trackField,
        foreignField: "trackIds",
        let: { producer: `$${producerField}`, ready: "$deliveryReady" },
        pipeline: [
          {
            $match: {
              ...activeContractFilter(now),
              "terms.licenseType": "NON_EXCLUSIVE",
              "filesToDeliver.0": { $exists: true },
              filesToDeliver: {
                $not: {
                  $elemMatch: { format: { $nin: ["MP3", "WAV", "STEMS"] } },
                },
              },
              $expr: {
                $and: [
                  { $eq: ["$producerId", "$$producer"] },
                  {
                    $allElementsTrue: {
                      $map: {
                        input: "$filesToDeliver",
                        as: "file",
                        in: {
                          $switch: {
                            branches: [
                              {
                                case: { $eq: ["$$file.format", "WAV"] },
                                then: { $ifNull: ["$$ready.wav", true] },
                              },
                              {
                                case: { $eq: ["$$file.format", "MP3"] },
                                then: { $ifNull: ["$$ready.mp3", false] },
                              },
                              {
                                case: { $eq: ["$$file.format", "STEMS"] },
                                then: { $ifNull: ["$$ready.stems", false] },
                              },
                            ],
                            default: false,
                          },
                        },
                      },
                    },
                  },
                  { $gte: ["$price", 1000] },
                  { $lte: ["$price", 1_000_000_000] },
                  { $eq: [{ $trunc: "$price" }, "$price"] },
                ],
              },
            },
          },
          { $sort: { price: 1, _id: 1 } },
          { $limit: 1 },
          {
            $project: {
              _id: 1,
              title: 1,
              price: 1,
              currency: 1,
              filesToDeliver: 1,
              version: 1,
              "terms.licenseType": 1,
              "terms.streamingLimit": 1,
              "terms.distributionLimit": 1,
            },
          },
        ],
        as: "__heroLicense",
      },
    },
    { $match: { "__heroLicense.0": { $exists: true } } },
  ];
}

export async function eligibleHeroTrackIds(
  trackIds: (mongoose.Types.ObjectId | string)[],
  now = new Date(),
) {
  if (!trackIds.length) return new Set<string>();
  const ids = trackIds.map((id) =>
    typeof id === "string" ? new mongoose.Types.ObjectId(id) : id,
  );
  const rows = await TrackModel.aggregate<{ _id: mongoose.Types.ObjectId }>([
    { $match: { _id: { $in: ids }, ...heroTrackFilter } },
    ...heroEligibilityLookups("_id", "producerId", now),
    { $project: { _id: 1 } },
  ]).option({ maxTimeMS: 10_000 });
  return new Set(rows.map((row) => String(row._id)));
}

export async function requireEligibleHeroTrack(
  trackId: mongoose.Types.ObjectId | string,
  now = new Date(),
) {
  if (!(await eligibleHeroTrackIds([trackId], now)).has(String(trackId))) {
    throw new MarketplaceError(
      "Choose a published public beat with artwork, a 30-second preview, an active producer and a fully available non-exclusive license.",
      409,
    );
  }
}

/** Payment references and agreed fees are administration-only bookkeeping. */
export function serializePublicHeroPlacement(
  placement: Pick<
    PlacementRecord,
    "_id" | "position" | "label" | "startsAt" | "endsAt"
  >,
  track: HeroPlacementItem["track"],
): HeroPlacementItem {
  return {
    id: String(placement._id),
    track,
    position: placement.position,
    label: placement.label || "Featured",
    startsAt: placement.startsAt.toISOString(),
    endsAt: placement.endsAt.toISOString(),
    sponsored: true,
  };
}

export async function publicHeroPlacements(
  now = new Date(),
): Promise<HeroPlacementItem[]> {
  type Row = PlacementRecord & { __heroLicense: HeroLicense[] };
  const rows = await HeroPlacementModel.aggregate<Row>([
    { $match: activeHeroFilter(now) },
    { $sort: { position: 1, _id: 1 } },
    {
      $lookup: {
        from: TrackModel.collection.name,
        localField: "trackId",
        foreignField: "_id",
        pipeline: [
          { $match: heroTrackFilter },
          { $project: { _id: 1, producerId: 1 } },
        ],
        as: "__heroTrack",
      },
    },
    { $unwind: "$__heroTrack" },
    ...heroEligibilityLookups("__heroTrack._id", "__heroTrack.producerId", now),
    // Historical/overlapping bookings never show the same beat twice in a slide deck.
    { $group: { _id: "$trackId", placement: { $first: "$$ROOT" } } },
    { $replaceRoot: { newRoot: "$placement" } },
    { $sort: { position: 1, _id: 1 } },
    { $limit: MAX_HERO_PLACEMENTS },
    {
      $project: {
        _id: 1,
        trackId: 1,
        label: 1,
        position: 1,
        startsAt: 1,
        endsAt: 1,
        __heroLicense: 1,
      },
    },
  ]).option({ maxTimeMS: 10_000 });
  if (!rows.length) return [];
  const tracks = await TrackModel.find({
    _id: { $in: rows.map((row) => row.trackId) },
    ...heroTrackFilter,
  });
  const serialized = await serializeTracks(tracks, now);
  const byId = new Map(serialized.map((track) => [track.id, track]));
  return rows.flatMap((row) => {
    const track = byId.get(String(row.trackId));
    const license = row.__heroLicense[0];
    if (!track || !license) return [];
    const eligibleLicense = serializeLicense(
      license,
      track.discount ?? null,
      now,
    );
    // Bounded catalog serialization can otherwise hide an eligible 13th license.
    const licenses = [
      eligibleLicense,
      ...track.licenses.filter((item) => item.id !== eligibleLicense.id),
    ].slice(0, 12);
    return [serializePublicHeroPlacement(row, { ...track, licenses })];
  });
}

export async function serializeAdminHeroPlacements(
  placements: PlacementRecord[],
  now = new Date(),
): Promise<AdminHeroPlacement[]> {
  if (!placements.length) return [];
  const trackIds = [
    ...new Set(placements.map((placement) => String(placement.trackId))),
  ];
  const [tracks, eligible] = await Promise.all([
    TrackModel.find({ _id: { $in: trackIds } }).select(
      "title producerId artwork.publicUrl",
    ),
    eligibleHeroTrackIds(trackIds, now),
  ]);
  const producerIds = [
    ...new Set(tracks.map((track) => String(track.producerId))),
  ];
  const [producers, profiles] = await Promise.all([
    UserModel.find({ _id: { $in: producerIds } }).select(
      "firstName lastName profile.displayName",
    ),
    ProducerProfileModel.find({ userId: { $in: producerIds } }).select(
      "userId stageName",
    ),
  ]);
  const producerNames = new Map(
    producers.map((producer) => [
      String(producer._id),
      producer.profile?.displayName ||
        `${producer.firstName} ${producer.lastName}`,
    ]),
  );
  const stageNames = new Map(
    profiles.map((profile) => [String(profile.userId), profile.stageName]),
  );
  const trackById = new Map(tracks.map((track) => [String(track._id), track]));
  return placements.map((placement) => {
    const track = trackById.get(String(placement.trackId));
    return {
      id: String(placement._id),
      trackId: String(placement.trackId),
      trackTitle: track?.title ?? "Unavailable track",
      producerName: track
        ? stageNames.get(String(track.producerId)) ||
          producerNames.get(String(track.producerId)) ||
          "Producer"
        : "Unavailable producer",
      artworkUrl: track?.artwork?.publicUrl ?? null,
      trackAvailable: eligible.has(String(placement.trackId)),
      position: placement.position,
      label: placement.label,
      startsAt: placement.startsAt.toISOString(),
      endsAt: placement.endsAt.toISOString(),
      isActive: placement.isActive,
      agreedFeeToman: placement.agreedFeeToman,
      paymentStatus: placement.paymentStatus,
      paymentReference: placement.paymentReference,
      version: placement.version,
      createdAt: placement.createdAt.toISOString(),
      updatedAt: placement.updatedAt.toISOString(),
    };
  });
}
