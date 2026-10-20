import Stripe from "stripe";

let client: Stripe | undefined;

// Created on first use so that importing a route never requires the secret (builds, tests).
// The API version is pinned to the one the installed SDK is typed against.
export function getStripe(): Stripe {
  if (!client) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) throw new Error("STRIPE_SECRET_KEY is not set");
    client = new Stripe(apiKey, { apiVersion: "2026-09-30.endive" });
  }
  return client;
}
