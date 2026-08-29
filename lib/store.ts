// In-memory persistence layer for the first marketplace MVP.
// This is deliberately temporary: it keeps the project runnable while the domain model
// is being validated before we introduce MongoDB or a real DB-backed repository layer.
import { randomUUID } from "crypto";

import type { Beat, ProducerProfile, User } from "@/lib/types";

export const memoryStore = {
  users: [] as User[],
  producerProfiles: [] as ProducerProfile[],
  beats: [] as Beat[],
};

function seed() {
  if (memoryStore.users.length > 0 || memoryStore.producerProfiles.length > 0 || memoryStore.beats.length > 0) {
    return;
  }

  const producerUserId = randomUUID();

  memoryStore.users.push({
    id: producerUserId,
    email: "producer@beatmarketplace.dev",
    passwordHash: "$2a$12$V6nWkH5VJgk5tV3XqkWkE.9Xc9xUeMNrV4t7Ca2vQ7k0Wm2TQw3V6",
    firstName: "Ari",
    lastName: "Vance",
    roles: ["USER", "PRODUCER"],
    isEmailVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  memoryStore.producerProfiles.push({
    id: randomUUID(),
    userId: producerUserId,
    stageName: "Ari Vance Beats",
    bio: "Cinematic, melodic trap and boom bap instrumentals built for sync, film, and modern playlists.",
    avatarUrl: "/placeholder-user.png",
    bannerUrl: null,
    location: "Los Angeles, CA",
    genres: ["Trap", "Cinematic"],
    socialLinks: {
      instagram: "https://instagram.com/arivancebeats",
      spotify: "https://open.spotify.com",
    },
    storefrontName: "Ari Vance Beats",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  memoryStore.beats.push({
    id: randomUUID(),
    producerId: producerUserId,
    title: "Midnight Shift",
    slug: "midnight-shift",
    description: "A moody late-night instrumental with a rolling 808 and warm melodic layers.",
    genre: "Trap",
    mood: "Dark",
    bpm: 140,
    key: "C#m",
    tags: ["late-night", "melodic", "dark"],
    coverUrl: null,
    previewUrl: null,
    masterUrl: null,
    status: "PUBLISHED",
    licenses: [
      {
        id: randomUUID(),
        name: "MP3 Lease",
        price: 29,
        currency: "USD",
        allowedFiles: ["MP3"],
        usageRights: "Non-exclusive lease for online content and demos.",
        commercialUse: true,
        distributionLimit: "Up to 10,000 streams",
        streamingLimit: "1,500 streams per month",
        createdAt: new Date().toISOString(),
      },
      {
        id: randomUUID(),
        name: "Premium Mix",
        price: 79,
        currency: "USD",
        allowedFiles: ["MP3", "WAV"],
        usageRights: "Commercial project lease with unlimited distribution.",
        commercialUse: true,
        distributionLimit: "Unlimited",
        streamingLimit: "Unlimited",
        createdAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

seed();

export function getUserByEmail(email: string) {
  return memoryStore.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

export function getUserById(id: string) {
  return memoryStore.users.find((user) => user.id === id);
}

export function getProducerProfileByUserId(userId: string) {
  return memoryStore.producerProfiles.find((profile) => profile.userId === userId);
}

export function getBeatById(id: string) {
  return memoryStore.beats.find((beat) => beat.id === id);
}

export function getPublishedBeats() {
  return memoryStore.beats.filter((beat) => beat.status === "PUBLISHED");
}

export function createUserRecord(input: Omit<User, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
  const user: User = {
    ...input,
    id: input.id ?? randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  memoryStore.users.push(user);
  return user;
}

export function createProducerProfileRecord(input: Omit<ProducerProfile, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
  const profile: ProducerProfile = {
    ...input,
    id: input.id ?? randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  memoryStore.producerProfiles.push(profile);
  return profile;
}

export function createBeatRecord(input: Omit<Beat, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
  const beat: Beat = {
    ...input,
    id: input.id ?? randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  memoryStore.beats.push(beat);
  return beat;
}

export function updateBeatRecord(id: string, updates: Partial<Beat>) {
  const index = memoryStore.beats.findIndex((beat) => beat.id === id);

  if (index === -1) return null;

  const updatedBeat = {
    ...memoryStore.beats[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  memoryStore.beats[index] = updatedBeat;
  return updatedBeat;
}
