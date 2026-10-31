import mongoose, { Connection } from "mongoose";

// ── Global connection cache (survives Next.js hot-reloads) ───────────────────

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: {
    conn: Connection | null;
    promise: Promise<typeof mongoose> | null;
  };
}

if (!global._mongooseCache) {
  global._mongooseCache = { conn: null, promise: null };
}

const cached = global._mongooseCache;

// ── db() ─────────────────────────────────────────────────────────────────────

/**
 * Returns a cached Mongoose connection.
 *
 * Throws inside the function (not at module level) so a missing
 * MONGODB_URI doesn't crash the entire Next.js server on import.
 */
export async function db(): Promise<Connection> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is missing in environment variables.");
  }

  // Return existing connection if healthy
  if (cached.conn) {
    return cached.conn;
  }

  // Start a new connection if one isn't in flight
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, {
        // Prevent buffering commands while disconnected — fail fast instead
        bufferCommands: false,
      })
      .catch((err) => {
        // Reset so the next request retries
        cached.promise = null;
        throw err;
      });
  }

  try {
    const m = await cached.promise;
    cached.conn = m.connection;
    return cached.conn;
  } catch (err) {
    console.error("[MongoDB] Connection failed:", err);
    throw err;
  }
}
