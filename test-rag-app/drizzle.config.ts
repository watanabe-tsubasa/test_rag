import { defineConfig } from "drizzle-kit";
import "dotenv/config";

console.log("Loaded DATABASE_URL:", process.env.DATABASE_URL);
export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
