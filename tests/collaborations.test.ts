import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import Track from "../models/Track";
import { trackInputSchema } from "../lib/marketplace/validation";

const owner = new mongoose.Types.ObjectId(),
  invitee = new mongoose.Types.ObjectId();
function track(collaborators: unknown[]) {
  return new Track({
    producerId: owner,
    title: "Private draft",
    slug: `private-${new mongoose.Types.ObjectId()}`,
    description: "",
    audio: { previewStartSeconds: 0, previewDurationSeconds: 30 },
    deliveryReady: { wav: false, mp3: false, stems: false },
    metadata: {
      musicalKey: "C Major",
      bpm: 120,
      tags: [],
      genreId: null,
      moodIds: [],
      instrumentIds: [],
      isExplicit: false,
    },
    status: "DRAFT",
    visibility: "PRIVATE",
    collaborators,
  });
}
test("collaborator input is unique and bounded", () => {
  const base = {
    title: "Beat",
    description: "",
    bpm: 120,
    musicalKey: "C Major",
    genreId: null,
    moodIds: [],
    instrumentIds: [],
    tags: [],
    explicit: false,
    previewStartSeconds: 0,
    status: "DRAFT",
    visibility: "PRIVATE",
  };
  assert.throws(() =>
    trackInputSchema.parse({
      ...base,
      collaboratorIds: [String(invitee), String(invitee)],
    }),
  );
});
test("track collaborators default to zero share and reject the owner", async () => {
  const valid = track([
    {
      userId: invitee,
      role: "CO_PRODUCER",
      revenueSharePercentage: 0,
      status: "PENDING",
      invitedAt: new Date(),
    },
  ]);
  await valid.validate();
  assert.equal(valid.collaborators[0].revenueSharePercentage, 0);
  await assert.rejects(
    track([
      {
        userId: owner,
        role: "CO_PRODUCER",
        revenueSharePercentage: 0,
        status: "PENDING",
        invitedAt: new Date(),
      },
    ]).validate(),
    /producer must not also be listed/i,
  );
});
test("answered invitation status and timestamps survive ordinary document validation", async () => {
  const respondedAt = new Date();
  const value = track([
    {
      userId: invitee,
      role: "CO_PRODUCER",
      revenueSharePercentage: 0,
      status: "ACCEPTED",
      invitedAt: new Date(0),
      respondedAt,
    },
  ]);
  await value.validate();
  assert.equal(value.collaborators[0].status, "ACCEPTED");
  assert.equal(
    value.collaborators[0].respondedAt?.getTime(),
    respondedAt.getTime(),
  );
});
