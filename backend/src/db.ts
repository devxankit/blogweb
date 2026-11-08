import mongoose from "mongoose";
import { config } from "./config";

let connecting: Promise<typeof mongoose> | null = null;

/**
 * Connects once per process and reuses the connection. On Vercel each warm
 * function instance keeps its connection between requests.
 */
export function connectDb() {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose);
  mongoose.set("strictQuery", true);
  connecting ??= mongoose
    .connect(config.mongoUri, {
      serverSelectionTimeoutMS: 15000,
      // Many short-lived instances share the cluster's connection limit.
      maxPoolSize: 10,
    })
    .catch((err) => {
      connecting = null;
      throw err;
    });
  return connecting;
}
