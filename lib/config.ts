// Shared runtime configuration for the marketplace app.
// These values are intentionally simple at this stage so the app can run locally
// before a production database and secret management setup is introduced.
export const config = {
  appName: "BeatMarketplace",
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  mongoUri: process.env.MONGODB_URI ?? "mongodb://localhost:27017/beatmarketplace-dev",
};
