"use client";

// Demo page for the first product flow: register -> become producer -> publish beat.
import { useEffect, useState } from "react";

type UserPayload = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
};

type BeatPayload = {
  id: string;
  title: string;
  description: string;
  genre: string;
  mood: string;
  bpm: number;
  key: string;
  status: string;
  licenses: Array<{
    id: string;
    name: string;
    price: number;
    currency: string;
    allowedFiles: string[];
  }>;
};

type FormState = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  stageName: string;
  bio: string;
  title: string;
  description: string;
  genre: string;
  mood: string;
  bpm: number;
  key: string;
};

const defaultForm: FormState = {
  email: "producer@beatmarketplace.dev",
  password: "welcome123",
  firstName: "Ari",
  lastName: "Vance",
  stageName: "Ari Vance Beats",
  bio: "Trap instrumentals for cinematic, modern, and commercial use.",
  title: "Midnight Shift",
  description: "Dark melodic instrumental with rolling drums and cinematic chord work.",
  genre: "Trap",
  mood: "Dark",
  bpm: 140,
  key: "C#m",
};

export default function HomePage() {
  const [token, setToken] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<UserPayload | null>(null);
  const [beats, setBeats] = useState<BeatPayload[]>([]);
  const [registerMessage, setRegisterMessage] = useState<string>("");
  const [producerMessage, setProducerMessage] = useState<string>("");
  const [beatMessage, setBeatMessage] = useState<string>("");
  const [form, setForm] = useState<FormState>(defaultForm);

  useEffect(() => {
    fetchPublicBeats();
  }, []);

  async function fetchPublicBeats() {
    const response = await fetch("/api/beats");
    const data = await response.json();
    setBeats(data.beats ?? []);
  }

  async function handleRegister() {
    setRegisterMessage("Creating account...");
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setRegisterMessage(data.error ?? "Registration failed.");
      return;
    }

    setToken(data.token);
    setCurrentUser(data.user);
    setRegisterMessage(`Registered as ${data.user.email}.`);
  }

  async function handleProducerUpgrade() {
    if (!token) {
      setProducerMessage("Register first to become a producer.");
      return;
    }

    const response = await fetch("/api/producers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        stageName: form.stageName,
        bio: form.bio,
        location: "Los Angeles, CA",
        genres: ["Trap", "Dark"],
        storefrontName: `${form.stageName} Store`,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setProducerMessage(data.error ?? "Producer upgrade failed.");
      return;
    }

    setProducerMessage(`Producer profile created: ${data.profile.stageName}`);
    const userResponse = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
    const userData = await userResponse.json();
    setCurrentUser(userData.user);
  }

  async function handleCreateBeat() {
    if (!token) {
      setBeatMessage("Register and become a producer before publishing a beat.");
      return;
    }

    const response = await fetch("/api/beats", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        genre: form.genre,
        mood: form.mood,
        bpm: Number(form.bpm),
        key: form.key,
        tags: ["dark", "melodic", "trap"],
        status: "PUBLISHED",
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setBeatMessage(data.error ?? "Beat creation failed.");
      return;
    }

    setBeatMessage(`Published beat: ${data.beat.title}`);
    await fetchPublicBeats();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl shadow-slate-950/40">
          <p className="mb-2 text-sm uppercase tracking-[0.25em] text-violet-400">BeatMarketplace</p>
          <h1 className="text-4xl font-black tracking-tight">First complete marketplace flow</h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            A modular foundation for producers, licensing, and marketplace purchasing without premature platform complexity.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-xl font-semibold">1. Register</h2>
            <div className="space-y-3">
              {Object.entries({
                email: "email",
                password: "password",
                firstName: "text",
                lastName: "text",
              }).map(([field, type]) => (
                <label key={field} className="block text-sm">
                  <span className="mb-1 block capitalize text-slate-300">{field}</span>
                  <input
                    type={type}
                    value={String((form as Record<string, string | number>)[field])}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setForm((current) => ({ ...current, [field]: nextValue }));
                    }}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-0 placeholder:text-slate-500"
                  />
                </label>
              ))}
              <button onClick={handleRegister} className="mt-4 w-full rounded-xl bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-500">
                Register
              </button>
              {registerMessage && <p className="text-sm text-slate-300">{registerMessage}</p>}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-xl font-semibold">2. Become Producer</h2>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-300">Stage name</span>
                <input
                  value={form.stageName}
                  onChange={(event) => setForm((current) => ({ ...current, stageName: event.target.value }))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-300">Bio</span>
                <textarea
                  value={form.bio}
                  onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
                  className="h-24 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                />
              </label>
              <button onClick={handleProducerUpgrade} className="w-full rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500">
                Create Producer Profile
              </button>
              {producerMessage && <p className="text-sm text-slate-300">{producerMessage}</p>}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-xl font-semibold">3. Publish Beat</h2>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-300">Title</span>
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-300">Genre</span>
                <input
                  value={form.genre}
                  onChange={(event) => setForm((current) => ({ ...current, genre: event.target.value }))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-300">Mood</span>
                <input
                  value={form.mood}
                  onChange={(event) => setForm((current) => ({ ...current, mood: event.target.value }))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-300">BPM</span>
                <input
                  type="number"
                  value={form.bpm}
                  onChange={(event) => setForm((current) => ({ ...current, bpm: Number(event.target.value) }))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-300">Key</span>
                <input
                  value={form.key}
                  onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                />
              </label>
              <button onClick={handleCreateBeat} className="w-full rounded-xl bg-amber-500 px-4 py-2 font-medium text-slate-950 hover:bg-amber-400">
                Publish Beat
              </button>
              {beatMessage && <p className="text-sm text-slate-300">{beatMessage}</p>}
            </div>
          </section>
        </div>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold">Marketplace</h2>
            <div className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
              {beats.length} beats
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {beats.map((beat) => (
              <article key={beat.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-white">{beat.title}</p>
                    <p className="text-sm text-slate-400">{beat.genre} • {beat.mood}</p>
                  </div>
                  <span className="rounded-full bg-violet-500/10 px-2 py-1 text-xs text-violet-300">{beat.status}</span>
                </div>
                <p className="mb-4 text-sm text-slate-300">{beat.description}</p>
                <div className="mb-4 flex gap-2 text-xs text-slate-400">
                  <span className="rounded-full border border-slate-700 px-2 py-1">{beat.bpm} BPM</span>
                  <span className="rounded-full border border-slate-700 px-2 py-1">{beat.key}</span>
                </div>
                <div className="space-y-2">
                  {beat.licenses.map((license) => (
                    <div key={license.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium text-white">{license.name}</p>
                        <p className="text-xs text-slate-500">{license.allowedFiles.join(" • ")}</p>
                      </div>
                      <p className="font-semibold text-emerald-400">${license.price}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-3 text-xl font-semibold">Current session</h2>
          {currentUser ? (
            <div className="grid gap-2 text-sm text-slate-300 md:grid-cols-2">
              <p><span className="text-slate-500">User:</span> {currentUser.firstName} {currentUser.lastName}</p>
              <p><span className="text-slate-500">Email:</span> {currentUser.email}</p>
              <p><span className="text-slate-500">Roles:</span> {currentUser.roles.join(", ")}</p>
              <p><span className="text-slate-500">Token:</span> {token ? "present" : "missing"}</p>
            </div>
          ) : (
            <p className="text-slate-400">No active session yet. Register to begin the flow.</p>
          )}
        </section>
      </div>
    </main>
  );
}
