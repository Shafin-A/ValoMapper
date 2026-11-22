import type { Locale } from "./config";
import type messages from "./messages/en-US.json";

declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
