import { connection } from "next/server";
import { defaultSiteQuoteConfigSettings } from "@/lib/site-quote-config-types";
import { getSiteQuoteConfigSettings } from "@/lib/site-quote-config-settings";

export async function getQuoteConfig() {
  await connection();
  return getSiteQuoteConfigSettings();
}

export async function getQuoteConfigOrDefault() {
  try {
    return await getQuoteConfig();
  } catch {
    return defaultSiteQuoteConfigSettings;
  }
}
