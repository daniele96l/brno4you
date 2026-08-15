import Redis from "ioredis";

type MemoryEntry = { value: string; expiresAt?: number };

/** In-memory fallback when REDIS_URL is unset (local/build). */
class MemoryRedis {
  private store = new Map<string, MemoryEntry>();
  private zsets = new Map<string, Map<string, number>>();
  private sets = new Map<string, Set<string>>();

  private purge(key: string) {
    const e = this.store.get(key);
    if (e?.expiresAt && Date.now() > e.expiresAt) {
      this.store.delete(key);
      return true;
    }
    return false;
  }

  async get(key: string) {
    if (this.purge(key)) return null;
    return this.store.get(key)?.value ?? null;
  }

  async set(key: string, value: string, ...args: (string | number)[]) {
    let expiresAt: number | undefined;
    if (args[0] === "EX" && typeof args[1] === "number") {
      expiresAt = Date.now() + args[1] * 1000;
    }
    this.store.set(key, { value, expiresAt });
    return "OK";
  }

  async del(...keys: string[]) {
    let n = 0;
    for (const k of keys) {
      if (this.store.delete(k)) n++;
      this.zsets.delete(k);
      this.sets.delete(k);
    }
    return n;
  }

  async exists(key: string) {
    if (this.purge(key)) return 0;
    return this.store.has(key) ? 1 : 0;
  }

  async zadd(key: string, score: number, member: string) {
    if (!this.zsets.has(key)) this.zsets.set(key, new Map());
    this.zsets.get(key)!.set(member, score);
    return 1;
  }

  async zrevrange(key: string, start: number, stop: number) {
    const z = this.zsets.get(key);
    if (!z) return [];
    const sorted = [...z.entries()].sort((a, b) => b[1] - a[1]);
    const end = stop < 0 ? sorted.length : stop + 1;
    return sorted.slice(start, end).map(([m]) => m);
  }

  async sadd(key: string, ...members: string[]) {
    if (!this.sets.has(key)) this.sets.set(key, new Set());
    const s = this.sets.get(key)!;
    let n = 0;
    for (const m of members) {
      if (!s.has(m)) {
        s.add(m);
        n++;
      }
    }
    return n;
  }

  async smembers(key: string) {
    return [...(this.sets.get(key) ?? [])];
  }
}

export type RedisLike = Redis | MemoryRedis;

declare global {
  // eslint-disable-next-line no-var
  var __vernoRedis: RedisLike | undefined;
}

export function getRedis(): RedisLike {
  if (global.__vernoRedis) return global.__vernoRedis;

  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn(
      "[verno4u] REDIS_URL not set — using in-memory store (data will not persist).",
    );
    global.__vernoRedis = new MemoryRedis();
    return global.__vernoRedis;
  }

  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    tls: url.startsWith("rediss://") ? {} : undefined,
  });

  client.on("error", (err) => {
    console.error("[verno4u] Redis error:", err.message);
  });

  global.__vernoRedis = client;
  return client;
}

export const keys = {
  student: (id: string) => `student:${id}`,
  studentsIndex: "students:index",
  studentsEmail: (email: string) => `students:email:${email.toLowerCase()}`,
  sessionAdmin: (token: string) => `session:admin:${token}`,
  sessionStudent: (token: string) => `session:student:${token}`,
  doc: (id: string) => `doc:${id}`,
  studentDocs: (studentId: string) => `student:${studentId}:docs`,
};
