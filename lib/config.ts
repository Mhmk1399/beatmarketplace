export const config = {
  appName: "BeatMarketplace",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  mongoUri: process.env.MONGODB_URI ?? "mongodb://localhost:27017/beatmarketplace-dev",
  jwtIssuer: process.env.JWT_ISSUER ?? "beatmarketplace",
  jwtAudience: process.env.JWT_AUDIENCE ?? "beatmarketplace-web",
};

/** APP_URL is also the authoritative public origin used by payment callbacks. */
export function configuredAppOrigin() {
  try {
    if (!process.env.APP_URL) return undefined;
    const url = new URL(process.env.APP_URL);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? new URL(url.origin) : undefined;
  } catch { return undefined; }
}

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (secret) {
    if (process.env.NODE_ENV === "production" && secret.length < 32) {
      throw new Error("JWT_SECRET must contain at least 32 characters in production.");
    }

    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production.");
  }

  return "development-only-secret-change-before-production";
}
