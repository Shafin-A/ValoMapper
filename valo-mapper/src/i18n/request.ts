import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { LOCALE_COOKIE, negotiateLocale } from "./config";
import { loadMessages } from "./messages";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const locale = negotiateLocale(
    cookieStore.get(LOCALE_COOKIE)?.value ??
      headerStore.get("accept-language"),
  );

  return {
    locale,
    messages: await loadMessages(locale),
  };
});
