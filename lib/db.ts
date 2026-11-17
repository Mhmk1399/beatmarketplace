import mongoose from "mongoose";

import { config } from "@/lib/config";

type MongooseCache = {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalWithMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const cache = globalWithMongoose.mongooseCache ?? {
  connection: null,
  promise: null,
};

globalWithMongoose.mongooseCache = cache;

export async function connectToDatabase() {
  if (cache.connection) return cache.connection;

  if (!cache.promise) {
    mongoose.set("maxTimeMS", 10_000);
    cache.promise = mongoose.connect(config.mongoUri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10_000,
      maxPoolSize: 20,
      minPoolSize: 0,
      maxConnecting: 4,
      maxIdleTimeMS: 60_000,
      waitQueueTimeoutMS: 5000,
      // Build indexes explicitly during deployment, rather than on every app instance.
      autoIndex: process.env.NODE_ENV !== "production",
      autoCreate: process.env.NODE_ENV !== "production",
    });
  }

  try {
    cache.connection = await cache.promise;
    return cache.connection;
  } catch (error) {
    cache.promise = null;
    throw error;
  }
}
