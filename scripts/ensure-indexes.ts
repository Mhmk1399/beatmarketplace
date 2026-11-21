import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";

/** Add declared indexes only. Never drop indexes or rewrite application records. */
async function main() {
  loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Set MONGODB_URI before creating database indexes.");
  await mongoose.connect(uri, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 5000, maxPoolSize: 2 });
  await Promise.all([
    import("../models/User"), import("../models/ProducerProfile"), import("../models/Track"), import("../models/Contract"),
    import("../models/Genre"), import("../models/Mood"), import("../models/Instrument"), import("../models/Order"),
    import("../models/Favorite"), import("../models/TrackDiscount"), import("../models/HeroPlacement"),
    import("../models/ContactMessage"), import("../models/ContactRateLimit"),
    import("../models/PlatformSettings"),
    import("../models/Collection"),
    import("../models/TrackMetric"), import("../models/TrackVisitor"),
    import("../models/PopularSearch"),
  ]);
  for (const name of mongoose.modelNames().sort()) {
    const model = mongoose.model(name);
    await model.createIndexes({ maxTimeMS: 120_000 });
    process.stdout.write(`${name}: indexes ready\n`);
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Index creation failed."}\n`);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
