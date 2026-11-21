import { loadEnvConfig } from "@next/env";
import { hash } from "bcryptjs";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import mongoose, { type Model } from "mongoose";
import GenreModel from "../models/Genre";
import MoodModel from "../models/Mood";
import InstrumentModel from "../models/Instrument";
import UserModel from "../models/User";
import ProducerProfileModel from "../models/ProducerProfile";
import TrackModel from "../models/Track";
import ContractModel from "../models/Contract";
import TrackDiscountModel from "../models/TrackDiscount";
import HeroPlacementModel from "../models/HeroPlacement";
import CollectionModel from "../models/Collection";
import FavoriteModel from "../models/Favorite";
import ContactMessageModel from "../models/ContactMessage";

const BATCH = "sample-catalog-v1";
const genres = [
  ["hip-hop", "Hip Hop", "Urban rhythms, punchy drums, and melodies built for rap.", ""],
  ["trap", "Trap", "Deep 808 bass, rapid hi-hats, and a modern, high-energy sound.", "hip-hop"],
  ["drill", "Drill", "Sliding bass, syncopated rhythms, and a dark urban atmosphere.", "hip-hop"],
  ["rnb", "R&B", "Warm chords and smooth rhythms for vocals and songwriting.", ""],
  ["afro", "Afro", "Lively percussion, warm guitars, and flowing Afrobeat grooves.", ""],
  ["pop", "Pop", "Memorable melodies and polished arrangements for your next release.", ""],
  ["lo-fi", "Lo-Fi", "Analog textures and laid-back rhythms for writing and unwinding.", "hip-hop"],
  ["edm", "EDM", "Powerful synthesizers, energetic drops, and electronic rhythms.", ""],
  ["house", "House", "Four-on-the-floor kicks and fluid, danceable basslines.", "edm"],
  ["boom-bap", "Boom Bap", "Classic drums and sample-driven arrangements for rap.", "hip-hop"],
  ["persian-fusion", "Persian Fusion", "The character of Persian instruments blended with modern arrangements and rhythms.", ""],
  ["ambient", "Ambient", "Atmospheric pads and cinematic textures for visual storytelling.", ""],
] as const;
const moods = [
  ["dark", "Dark", "Deep, shadowy sounds with an intense atmosphere."], ["dreamy", "Dreamy", "Floating textures and a dreamlike atmosphere."],
  ["energetic", "Energetic", "High-energy sounds full of movement and momentum."], ["melancholic", "Melancholic", "Emotional melodies with a reflective, bittersweet feel."],
  ["aggressive", "Aggressive", "Hard-hitting rhythms with a raw, forceful edge."], ["chill", "Chill", "Relaxed rhythms and an easygoing feel."],
  ["uplifting", "Uplifting", "Bright, inspiring sounds that lift the mood."], ["romantic", "Romantic", "Warm melodies with a tender, romantic feel."],
  ["mysterious", "Mysterious", "Intriguing textures filled with tension and suspense."], ["cinematic", "Cinematic", "Vivid, film-inspired sounds for storytelling."],
  ["soulful", "Soulful", "Rich, expressive sounds with warmth and emotion."], ["nostalgic", "Nostalgic", "Timeless textures that bring back memories."],
  ["confident", "Confident", "Bold, assured sounds with a strong presence."], ["atmospheric", "Atmospheric", "Spacious textures that create an immersive atmosphere."],
  ["hopeful", "Hopeful", "Optimistic melodies with a forward-looking spirit."], ["playful", "Playful", "Lively, lighthearted sounds full of character."],
] as const;
const instruments = [
  ["808-bass", "808 Bass", "BASS", "Deep, punchy 808 bass tones."], ["sub-bass", "Sub Bass", "BASS", "Smooth, controlled low-end bass."],
  ["acoustic-drums", "Acoustic Drums", "DRUMS", "Natural acoustic drum kits."], ["drum-machine", "Drum Machine", "DRUMS", "Programmed drums and electronic rhythms."],
  ["hi-hats", "Hi-Hats", "DRUMS", "Hi-hat patterns and detailed rhythmic accents."], ["hand-percussion", "Hand Percussion", "PERCUSSION", "Hand-played percussion and lively grooves."],
  ["piano", "Piano", "KEYS", "Expressive acoustic piano tones."], ["electric-piano", "Electric Piano", "KEYS", "Electric piano textures and warm chords."],
  ["synth-lead", "Synth Lead", "SYNTH", "Distinctive lead synthesizer melodies."], ["synth-pad", "Synth Pad", "SYNTH", "Soft, atmospheric synthesizer pads."],
  ["electric-guitar", "Electric Guitar", "GUITAR", "Electric guitar riffs and amplified textures."], ["acoustic-guitar", "Acoustic Guitar", "GUITAR", "Acoustic guitar tones and natural melodies."],
  ["strings", "String Section", "STRINGS", "String ensembles and orchestral arrangements."], ["brass", "Brass", "BRASS", "Warm, powerful brass instruments."],
  ["saxophone", "Saxophone", "WOODWIND", "Expressive saxophone tones and jazz phrases."], ["vocal-chops", "Vocal Chops", "VOCAL", "Chopped vocals and layered vocal textures."],
  ["ney", "Ney", "WOODWIND", "Ney flute tones with a Persian character."], ["santur", "Santur", "STRINGS", "Santur textures and Persian melodic patterns."],
  ["setar", "Setar", "STRINGS", "Delicate setar melodies and phrases."], ["texture-fx", "Texture FX", "FX", "Atmospheric textures, noise, and sound effects."],
] as const;
const producers = [
  { key: "nava", name: "Nava", first: "Nima", last: "Rad", city: "Tehran", genres: ["trap", "hip-hop"], bio: "Trap and hip-hop beats with deep bass, late-night atmosphere, and room for your vocals.", basePrice: 450000 },
  { key: "orbit", name: "Orbit", first: "Arman", last: "Nouri", city: "Tabriz", genres: ["drill", "boom-bap"], bio: "Punchy drums, sliding bass, and classic sample textures in rap-ready arrangements.", basePrice: 550000 },
  { key: "saye", name: "Saye", first: "Sara", last: "Mehr", city: "Shiraz", genres: ["rnb", "lo-fi"], bio: "Warm R&B chords and lo-fi textures for intimate, emotional stories.", basePrice: 350000 },
  { key: "arka", name: "Arka", first: "Kian", last: "Parsa", city: "Isfahan", genres: ["afro", "persian-fusion"], bio: "Afro grooves and Persian instruments blended with modern rhythms and bass.", basePrice: 600000 },
  { key: "pulse", name: "Pulse", first: "Pouya", last: "Shayan", city: "Mashhad", genres: ["edm", "house"], bio: "Electronic music with flowing basslines, energetic drops, and bright melodies.", basePrice: 750000 },
  { key: "mira", name: "Mira", first: "Mina", last: "Raha", city: "Rasht", genres: ["pop", "ambient"], bio: "Pop melodies and ambient soundscapes for songs, visuals, and personal stories.", basePrice: 500000 },
];
// producer, title, genre, BPM, key, moods, instruments; the fourth beat of each producer stays a draft.
const beats = [
  ["nava", "Neon Tehran", "trap", 142, "F# minor", ["dark", "confident"], ["808-bass", "drum-machine", "hi-hats"]],
  ["nava", "After Hours", "hip-hop", 92, "C minor", ["melancholic", "soulful"], ["piano", "sub-bass", "acoustic-drums"]],
  ["nava", "Night Drive", "trap", 138, "G minor", ["aggressive", "cinematic"], ["synth-lead", "808-bass", "drum-machine"]],
  ["nava", "Concrete Echo", "hip-hop", 88, "D minor", ["dark", "nostalgic"], ["electric-piano", "vocal-chops", "drum-machine"]],
  ["orbit", "Metro Run", "drill", 144, "D# minor", ["aggressive", "confident"], ["808-bass", "drum-machine", "hi-hats"]],
  ["orbit", "Cold Streets", "drill", 140, "A minor", ["dark", "cinematic"], ["strings", "808-bass", "drum-machine"]],
  ["orbit", "Dust And Soul", "boom-bap", 90, "G minor", ["nostalgic", "soulful"], ["acoustic-drums", "electric-piano", "vocal-chops"]],
  ["orbit", "Last Train", "boom-bap", 86, "F minor", ["melancholic", "nostalgic"], ["piano", "sub-bass", "acoustic-drums"]],
  ["saye", "Velvet Room", "rnb", 98, "C# minor", ["romantic", "chill"], ["electric-piano", "sub-bass", "vocal-chops"]],
  ["saye", "Blue Hour", "lo-fi", 80, "E minor", ["dreamy", "nostalgic"], ["piano", "electric-guitar", "texture-fx"]],
  ["saye", "Soft Rain", "rnb", 76, "A minor", ["chill", "atmospheric"], ["electric-piano", "acoustic-drums", "texture-fx"]],
  ["saye", "Paper Lanterns", "lo-fi", 84, "F major", ["hopeful", "dreamy"], ["acoustic-guitar", "electric-piano", "texture-fx"]],
  ["arka", "Desert Bloom", "afro", 108, "D minor", ["energetic", "uplifting"], ["hand-percussion", "acoustic-guitar", "sub-bass"]],
  ["arka", "Saffron Nights", "persian-fusion", 102, "C minor", ["mysterious", "cinematic"], ["ney", "santur", "808-bass"]],
  ["arka", "Golden Sand", "afro", 112, "G major", ["confident", "playful"], ["hand-percussion", "synth-lead", "drum-machine"]],
  ["arka", "Silk Road", "persian-fusion", 96, "D minor", ["atmospheric", "nostalgic"], ["setar", "ney", "hand-percussion"]],
  ["pulse", "Laser Line", "edm", 128, "A minor", ["energetic", "confident"], ["synth-lead", "sub-bass", "drum-machine"]],
  ["pulse", "Open Sky", "house", 124, "C major", ["uplifting", "hopeful"], ["piano", "synth-pad", "drum-machine"]],
  ["pulse", "Neon Circuit", "edm", 132, "F# minor", ["aggressive", "energetic"], ["synth-lead", "sub-bass", "texture-fx"]],
  ["pulse", "City Lights", "house", 122, "D minor", ["chill", "playful"], ["electric-piano", "sub-bass", "drum-machine"]],
  ["mira", "New Morning", "pop", 116, "G major", ["hopeful", "uplifting"], ["acoustic-guitar", "piano", "acoustic-drums"]],
  ["mira", "Cloud Atlas", "ambient", 72, "E minor", ["atmospheric", "cinematic"], ["synth-pad", "strings", "texture-fx"]],
  ["mira", "Daylight", "pop", 104, "C major", ["romantic", "uplifting"], ["electric-piano", "acoustic-guitar", "sub-bass"]],
  ["mira", "Distant Stars", "ambient", 66, "B minor", ["dreamy", "atmospheric"], ["synth-pad", "ney", "texture-fx"]],
] as const;

type Row = Record<string, unknown> & { _id: mongoose.Types.ObjectId | string };
const models = {
  genres: GenreModel, moods: MoodModel, instruments: InstrumentModel, users: UserModel, producers: ProducerProfileModel,
  tracks: TrackModel, licenses: ContractModel, discounts: TrackDiscountModel, placements: HeroPlacementModel,
  collections: CollectionModel, favorites: FavoriteModel, messages: ContactMessageModel,
} as unknown as Record<string, Model<Row>>;
type Account = { email: string; password: string; role: "PRODUCER" | "USER"; name: string };
const apply = process.argv.includes("--apply");
const directory = path.resolve(process.cwd(), ".data", "sample-catalog");
const credentialsPath = path.join(directory, "accounts.json");
const now = new Date();
const planned: { kind: string; row: Row }[] = [];
const reused: Record<string, number> = {};
const oid = (row: Row) => new mongoose.Types.ObjectId(String(row._id));
const seedId = (kind: string, key: string) => new mongoose.Types.ObjectId(createHash("sha256").update(`${BATCH}:${kind}:${key}`).digest("hex").slice(0, 24));

async function ensure(kind: string, filter: Record<string, unknown>, input: Record<string, unknown>, publish = false): Promise<Row> {
  const model = models[kind], id = input._id ?? seedId(kind, JSON.stringify(filter));
  const existing = await model.findOne({ $or: [filter, { _id: id }] }).lean() as unknown as Row | null;
  if (existing) { reused[kind] = (reused[kind] ?? 0) + 1; return existing; }
  const document = new model({ _id: id, ...input, createdAt: now, updatedAt: now });
  await document.validate();
  const row = document.toObject() as Row;
  if (model.schema.options.versionKey !== false) row[String(model.schema.options.versionKey || "__v")] = 0;
  // Explicit setup-only exception requested by the owner. Validate the draft first,
  // then bypass publication's missing-media checks using a native transactional insert.
  // No schema/HTTP validation is disabled; files remain absent and licenses inactive.
  if (publish) { row.status = "PUBLISHED"; row.visibility = "PUBLIC"; row.publishedAt = now; }
  planned.push({ kind, row });
  return row;
}

async function main() {
  loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
  let accounts: Account[] = [];
  try {
    const previous = JSON.parse(await readFile(credentialsPath, "utf8"));
    if (previous.batch !== BATCH || !Array.isArray(previous.accounts)) throw new Error("Unrecognized seed credential file.");
    accounts = previous.accounts;
  } catch (error) { if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error; }
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 15000, maxPoolSize: 2 });
  const genreMap = new Map<string, Row>(), moodMap = new Map<string, Row>(), instrumentMap = new Map<string, Row>();
  for (const [index, [slug, name, description, parent]] of genres.entries()) {
    genreMap.set(slug, await ensure("genres", { slug }, { slug, name, description, aliases: [], isActive: true, sortOrder: index + 10, parentGenreId: parent ? oid(genreMap.get(parent)!) : null }));
  }
  for (const [index, [slug, name, description]] of moods.entries()) moodMap.set(slug, await ensure("moods", { slug }, { slug, name, description, color: null, isActive: true, sortOrder: index }));
  for (const [index, [slug, name, family, description]] of instruments.entries()) instrumentMap.set(slug, await ensure("instruments", { slug }, { slug, name, family, description, aliases: [], isActive: true, sortOrder: index }));

  async function account(key: string, firstName: string, lastName: string, displayName: string, role: Account["role"], bio: string, city: string) {
    const email = `${key}@demo.beatmarketplace.test`, username = `demo_${key}`;
    const identity = seedId("users", JSON.stringify({ email }));
    const existing = await models.users.findOne({ $or: [{ email }, { _id: identity }] }).lean() as unknown as Row | null;
    if (existing) {
      if (String(existing._id) !== String(identity) && (existing.profile as { username?: string } | undefined)?.username !== username) throw new Error(`Seed identity collision for ${key}.`);
      reused.users = (reused.users ?? 0) + 1;
      return existing;
    }
    if (await models.users.exists({ "profile.username": username })) throw new Error(`Seed username collision for ${key}.`);
    let credential = accounts.find(item => item.email === email);
    if (!credential) { credential = { email, password: randomBytes(18).toString("base64url"), role, name: displayName }; accounts.push(credential); }
    return ensure("users", { email }, { email, firstName, lastName, passwordHash: await hash(credential.password, 12), roles: role === "PRODUCER" ? ["USER", "PRODUCER"] : ["USER"], status: "ACTIVE", isEmailVerified: false, isPhoneVerified: false,
      profile: { username, displayName, bio: `${bio}\nSample catalog profile. Its name and details can be edited.`, location: { city, countryCode: "IR" }, socialLinks: {} }, preferences: { emailNotifications: false, showActivity: false } });
  }
  const producerMap = new Map<string, Row>();
  for (const producer of producers) {
    const user = await account(producer.key, producer.first, producer.last, producer.name, "PRODUCER", producer.bio, producer.city);
    producerMap.set(producer.key, user);
    await ensure("producers", { userId: oid(user) }, { userId: oid(user), stageName: producer.name, storefrontName: `${producer.name} Studio`, bio: producer.bio, genreIds: producer.genres.map(slug => oid(genreMap.get(slug)!)) });
  }
  const publicTracks: Row[] = [], producerTracks = new Map<string, Row[]>();
  for (const [index, [producerKey, title, genre, bpm, musicalKey, moodSlugs, instrumentSlugs]] of beats.entries()) {
    const producer = producerMap.get(producerKey)!, category = genreMap.get(genre)!;
    const slug = `sample-${producerKey}-${title.toLowerCase().replaceAll(" ", "-")}`;
    const publish = index % 4 !== 3 && category.isActive === true && producer.status === "ACTIVE";
    const track = await ensure("tracks", { slug }, { producerId: oid(producer), title, slug,
      description: `${title}: ${category.name} at ${bpm} BPM in ${musicalKey}, with space for vocals and new ideas.\nSample catalog beat. Artwork, the master file, and the preview will be added by the administrator.`,
      metadata: { musicalKey, bpm, genreId: oid(category), moodIds: moodSlugs.map(key => oid(moodMap.get(key)!)), instrumentIds: instrumentSlugs.map(key => oid(instrumentMap.get(key)!)), tags: [genre, ...moodSlugs, "sample-catalog"], durationSeconds: 130 + index * 4, isExplicit: false },
      audio: { stems: [], previewStartSeconds: 0, previewDurationSeconds: 30 }, visibility: "PUBLIC", status: "DRAFT", releaseDate: null, publishedAt: null, collaborators: [],
    }, publish);
    if (String(track.producerId) !== String(producer._id)) throw new Error(`Seed track ownership collision: ${slug}.`);
    producerTracks.set(producerKey, [...(producerTracks.get(producerKey) ?? []), track]);
    if (track.status === "PUBLISHED" && track.visibility === "PUBLIC") publicTracks.push(track);
  }
  const tiers = [{ title: "Basic WAV", factor: 1, streams: 100000, distributions: 5000 }, { title: "Premium WAV", factor: 2, streams: 500000, distributions: 10000 }, { title: "Unlimited WAV", factor: 4, streams: null, distributions: null }];
  for (const [index, producer] of producers.entries()) {
    const owner = producerMap.get(producer.key)!, tracks = producerTracks.get(producer.key)!;
    for (const tier of tiers) await ensure("licenses", { producerId: oid(owner), title: tier.title }, {
      producerId: oid(owner), title: tier.title, description: `Sample ${tier.title} license for the ${producer.name} catalog. Review the terms and price before activating it once the files are ready.`,
      price: mongoose.Types.Decimal128.fromString(String(producer.basePrice * tier.factor)), currency: "IRT", offerable: false, minimumOfferPrice: null,
      trackIds: tracks.map(oid), filesToDeliver: [{ format: "WAV", label: "Full-quality WAV master", required: true }],
      territory: { worldwide: true, includedCountries: [], excludedCountries: [] },
      terms: { licenseType: "NON_EXCLUSIVE", commercialUse: true, creditRequired: true, distributionLimit: tier.distributions, streamingLimit: tier.streams, musicVideoLimit: 1, livePerformance: tier.factor > 1, broadcastRights: false, customTerms: "Sample terms for setup. Review and replace before enabling sales." },
      isActive: false, effectiveFrom: now, expiresAt: null, version: 1,
    });
    const track = tracks[0], startsAt = new Date(now.getTime() + (7 + index) * 86400000);
    await ensure("discounts", { trackId: oid(track) }, { trackId: oid(track), producerId: oid(owner), percentage: 10 + index * 5, startsAt, endsAt: new Date(startsAt.getTime() + 3 * 86400000), isActive: true, version: 1 });
  }
  const admin = await UserModel.findOne({ roles: "ADMIN", status: "ACTIVE" }).sort({ createdAt: 1 }).select("_id").lean();
  if (admin) for (const [position, producer] of producers.slice(0, 4).entries()) {
    const track = producerTracks.get(producer.key)![0], label = "Sample featured beat";
    await ensure("placements", { trackId: oid(track), label }, { trackId: oid(track), label, position, startsAt: new Date(now.getTime() + 14 * 86400000), endsAt: new Date(now.getTime() + 21 * 86400000), isActive: false, agreedFeeToman: 0, paymentStatus: "PENDING", paymentReference: "", createdBy: admin._id, updatedBy: admin._id, version: 1 });
  }
  const customers = [await account("darya", "Darya", "Kazemi", "Darya", "USER", "Looking for beats to write and record songs.", "Tehran"), await account("raha", "Raha", "Farzan", "Raha", "USER", "Discovering fresh ideas for music and visual projects.", "Shiraz")];
  for (const [index, user] of customers.entries()) {
    for (const track of publicTracks.slice(index * 6, index * 6 + 6)) await ensure("favorites", { userId: oid(user), trackId: oid(track) }, { userId: oid(user), trackId: oid(track) });
    for (const [group, name] of ["Night Sessions", "Writing Room", "Release Ideas"].entries()) await ensure("collections", { userId: oid(user), name }, { userId: oid(user), name, description: "A sample personal collection for organizing ideas and favorite beats.", trackIds: publicTracks.slice((index * 3 + group * 4) % 12, (index * 3 + group * 4) % 12 + 4).map(oid), version: 1 });
  }
  for (const [index, subject] of ["general", "licensing", "technical"].entries()) {
    const bytes = createHash("sha1").update(`${BATCH}:message:${index}`).digest().subarray(0, 16); bytes[6] = (bytes[6] & 15) | 80; bytes[8] = (bytes[8] & 63) | 128;
    const hex = bytes.toString("hex"), id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    const payload = { name: "Sample catalog message", email: "darya@demo.beatmarketplace.test", subject, message: `This is a sample message for testing the support inbox (${subject}). You can close it after checking its display and status updates.` };
    await ensure("messages", { _id: id }, { _id: id, ...payload, payloadHash: createHash("sha256").update(JSON.stringify(payload)).digest("hex"), status: ["NEW", "READ", "CLOSED"][index], version: 1, updatedBy: null });
  }
  const created = Object.fromEntries(Object.keys(models).map(kind => [kind, planned.filter(item => item.kind === kind).length]));
  const summary = { batch: BATCH, mode: apply ? "apply" : "dry-run", created, reused, publicSamples: publicTracks.length, plannedDrafts: planned.filter(item => item.kind === "tracks" && item.row.status === "DRAFT").length, fileUploads: 0 };
  if (!apply) { console.log(JSON.stringify(summary, null, 2)); return; }
  if (planned.length) {
    await mkdir(directory, { recursive: true });
    const temporary = path.join(directory, `accounts-${randomUUID()}.tmp`);
    await writeFile(temporary, JSON.stringify({ batch: BATCH, accounts }, null, 2), { flag: "wx", mode: 0o600 });
    await rename(temporary, credentialsPath);
    for (const kind of new Set(planned.map(item => item.kind))) { await models[kind].createCollection(); await models[kind].createIndexes(); }
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        for (const kind of Object.keys(models)) {
          const rows = planned.filter(item => item.kind === kind).map(item => item.row);
          if (rows.length) await mongoose.connection.db!.collection<Row>(models[kind].collection.name).insertMany(rows, { session, ordered: true });
        }
      }, { timeoutMS: 45000, maxCommitTimeMS: 5000, writeConcern: { w: "majority" } });
    } finally { await session.endSession(); }
  }
  await mkdir(directory, { recursive: true });
  if (planned.length) await writeFile(path.join(directory, "report.json"), JSON.stringify({ ...summary, completedAt: new Date().toISOString(), inserted: planned.map(item => ({ kind: item.kind, id: String(item.row._id) })) }, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ ...summary, credentialsFile: path.relative(process.cwd(), credentialsPath) }, null, 2));
}

main().catch(error => { console.error("Catalog seed failed:", error instanceof mongoose.Error ? error.name : error instanceof Error ? error.message : "Unknown error"); process.exitCode = 1; }).finally(() => mongoose.disconnect());
