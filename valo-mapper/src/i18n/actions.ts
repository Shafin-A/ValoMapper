"use server";

import { cookies } from "next/headers";

import { isLaunchLocale, LOCALE_COOKIE, type Locale } from "./config";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

export async function setLocale(locale: Locale) {
  if (!isLaunchLocale(locale)) return;

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR_IN_SECONDS,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
