"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Check,
  Eye,
  Languages,
  Layers,
  Loader2,
  Palette,
  Play,
  Sparkles,
  Type,
} from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { BackToHomeButton } from "@/components/shared/back-to-home-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCreateLobby } from "@/hooks/api/use-create-lobby";
import { useSidebarState } from "@/hooks/use-sidebar-state";
import { cn } from "@/lib/cn";
import { useTranslations } from "next-intl";

const SECTION_LINKS = [
  { id: "replay", key: "replay" },
  { id: "notes", key: "notes" },
  { id: "multi-select", key: "multiSelect" },
  { id: "favorites", key: "favorites" },
  { id: "boards", key: "boards" },
  { id: "mobile", key: "mobile" },
  { id: "more", key: "more" },
] as const;

const ALSO_IMPROVED_ICONS = [Palette, Layers, Eye, Languages];

const SectionIntro = ({
  label,
  title,
  children,
  className,
}: {
  label: string;
  title: string;
  children: ReactNode;
  className?: string;
}) => (
  <div className={cn("max-w-3xl", className)}>
    <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
      <span className="h-px w-6 bg-primary/60" aria-hidden />
      {label}
    </div>
    <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
      {title}
    </h2>
    <div className="mt-4 text-base leading-7 text-muted-foreground">
      {children}
    </div>
  </div>
);

const BulletList = ({
  items,
  className,
}: {
  items: string[];
  className?: string;
}) => (
  <ul className={cn("mt-6 grid gap-2.5 sm:grid-cols-2", className)}>
    {items.map((item) => (
      <li key={item} className="flex gap-2.5 text-sm leading-6 text-muted-foreground">
        <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const Shot = ({
  src,
  alt,
  width,
  height,
  label,
  className,
  sizes,
  priority,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  label?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) => (
  <figure
    className={cn(
      "overflow-hidden rounded-xl border border-border/70 bg-card shadow-2xl shadow-black/30",
      className,
    )}
  >
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      className="h-auto w-full"
    />
    {label ? (
      <figcaption className="border-t border-border/60 bg-background/80 px-3.5 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </figcaption>
    ) : null}
  </figure>
);

export const WhatsNewPage = () => {
  const t = useTranslations("whatsNew");
  const notesBullets = t.raw("notes.bullets") as string[];
  const multiSelectBullets = t.raw("multiSelect.bullets") as string[];
  const favoritesBullets = t.raw("favorites.bullets") as string[];
  const richTextBullets = t.raw("boards.richTextBullets") as string[];
  const mobileBullets = t.raw("mobile.bullets") as string[];
  const alsoImproved = t.raw("more.items") as {
    title: string;
    bullets: string[];
  }[];
  const sidebarState = useSidebarState();
  const createLobbyMutation = useCreateLobby();
  const isStarting = createLobbyMutation.isPending;

  const startBoard = () => {
    if (isStarting) return;
    createLobbyMutation.mutate(undefined);
  };

  const startBoardButton = (
    variant: "default" | "outline" = "default",
    className?: string,
  ) => (
    <Button
      size="lg"
      variant={variant}
      onClick={startBoard}
      disabled={isStarting}
      className={className}
    >
      {isStarting ? (
        <>
          <Loader2 className="animate-spin" aria-hidden />
          {t("starting")}
        </>
      ) : (
        <>
          {t("startBoard")}
          <ArrowRight aria-hidden />
        </>
      )}
    </Button>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader {...sidebarState} showSidebarToggles={false} />

      <main id="main-content" tabIndex={-1}>
        <section className="relative overflow-hidden border-b border-border/60">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(34,197,94,0.18),transparent_42%),radial-gradient(circle_at_88%_18%,rgba(59,130,246,0.08),transparent_38%)]"
            aria-hidden
          />
          <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-8 sm:px-6 lg:px-8 lg:pb-20 lg:pt-12">
            <BackToHomeButton />

            <div className="mt-10 max-w-4xl">
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/10 text-primary"
              >
                <Sparkles aria-hidden />
                {t("badge")}
              </Badge>

              <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                {t("titlePrefix")}{" "}
                <span className="bg-linear-to-r from-foreground to-primary bg-clip-text text-transparent">
                  ValoMapper
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                {t("description")}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/replay">
                    <Play aria-hidden />
                    {t("tryReplays")}
                  </Link>
                </Button>
                {startBoardButton("outline")}
              </div>

              <nav
                aria-label={t("sectionsAria")}
                className="mt-10 flex flex-wrap gap-2"
              >
                {SECTION_LINKS.map((section) => (
                  <Link
                    key={section.id}
                    href={`#${section.id}`}
                    className="rounded-full border border-border/70 bg-background/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {t(`sections.${section.key}` as never)}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </section>

        <section
          id="replay"
          className="scroll-mt-24 border-b border-border/60"
        >
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8 lg:py-24">
            <div>
              <SectionIntro
                label={t("sections.replay")}
                title={t("replay.title")}
              >
                {t("replay.description")}
              </SectionIntro>

              <BulletList items={t.raw("replay.bullets") as string[]} />

              <Button asChild variant="link" className="mt-4 px-0">
                <Link href="/replay">
                  {t("replay.openPlayer")}
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>

            <Shot
              src="/whats-new/replay.webp"
              alt={t("replay.imageAlt")}
              width={2400}
              height={1350}
              sizes="(min-width: 1024px) 55vw, 100vw"
              label={t("replay.imageLabel")}
              priority
            />
          </div>
        </section>

        <section
          id="notes"
          className="scroll-mt-24 border-b border-border/60"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <SectionIntro
              label={t("sections.notes")}
              title={t("notes.title")}
            >
              {t("notes.description")}
            </SectionIntro>

            <BulletList items={notesBullets} />

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <Shot
                src="/whats-new/notes.webp"
                alt={t("notes.image1Alt")}
                width={1000}
                height={600}
                sizes="(min-width: 640px) 50vw, 100vw"
                label={t("notes.image1Label")}
              />
              <Shot
                src="/whats-new/notes-hover.webp"
                alt={t("notes.image2Alt")}
                width={1000}
                height={600}
                sizes="(min-width: 640px) 50vw, 100vw"
                label={t("notes.image2Label")}
              />
            </div>
          </div>
        </section>

        <section
          id="multi-select"
          className="scroll-mt-24 border-b border-border/60"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <SectionIntro
              label={t("sections.multiSelect")}
              title={t("multiSelect.title")}
            >
              {t("multiSelect.description")}
            </SectionIntro>

            <BulletList items={multiSelectBullets} />

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <Shot
                src="/whats-new/multi-select.webp"
                alt={t("multiSelect.image1Alt")}
                width={1300}
                height={1120}
                sizes="(min-width: 640px) 50vw, 100vw"
                label={t("multiSelect.image1Label")}
              />
              <Shot
                src="/whats-new/multi-select-selected.webp"
                alt={t("multiSelect.image2Alt")}
                width={1300}
                height={1120}
                sizes="(min-width: 640px) 50vw, 100vw"
                label={t("multiSelect.image2Label")}
              />
            </div>
          </div>
        </section>

        <section
          id="favorites"
          className="scroll-mt-24 border-b border-border/60"
        >
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8 lg:py-24">
            <div>
              <SectionIntro
                label={t("sections.favorites")}
                title={t("favorites.title")}
              >
                {t("favorites.description")}
              </SectionIntro>

              <BulletList items={favoritesBullets} />
            </div>

            <Shot
              src="/whats-new/favorites.webp"
              alt={t("favorites.imageAlt")}
              width={480}
              height={846}
              sizes="(min-width: 1024px) 40vw, 100vw"
              label={t("favorites.imageLabel")}
              className="mx-auto w-full max-w-[320px]"
            />
          </div>
        </section>

        <section
          id="boards"
          className="scroll-mt-24 border-b border-border/60"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <SectionIntro
              label={t("sections.boards")}
              title={t("boards.title")}
            >
              {t("boards.description")}
            </SectionIntro>

            <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_0.9fr] lg:items-start">
              <Shot
                src="/whats-new/board.webp"
                alt={t("boards.imageAlt")}
                width={2400}
                height={1350}
                sizes="(min-width: 1024px) 60vw, 100vw"
                label={t("boards.imageLabel")}
              />

              <div className="flex flex-col gap-5">
                <div className="rounded-2xl border border-border/70 bg-card/60 p-5">
                  <h3 className="flex items-center gap-2 font-semibold text-foreground">
                    <Type className="size-4 text-primary" aria-hidden />
                    {t("boards.richTextTitle")}
                  </h3>
                  <BulletList
                    items={richTextBullets}
                    className="mt-4 sm:grid-cols-1"
                  />
                </div>

                <div className="rounded-2xl border border-border/70 bg-card/60 p-5">
                  <h3 className="font-semibold text-foreground">
                    {t("boards.backgroundsTitle")}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {t("boards.backgroundsDescription")}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Shot
                src="/whats-new/background.webp"
                alt={t("boards.gridAlt")}
                width={1100}
                height={800}
                sizes="(min-width: 640px) 50vw, 100vw"
                label={t("boards.gridLabel")}
              />
              <Shot
                src="/whats-new/background-options.webp"
                alt={t("boards.optionsAlt")}
                width={1100}
                height={800}
                sizes="(min-width: 640px) 50vw, 100vw"
                label={t("boards.optionsLabel")}
              />
            </div>
          </div>
        </section>

        <section
          id="mobile"
          className="scroll-mt-24 border-b border-border/60"
        >
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8 lg:py-24">
            <div>
              <SectionIntro
                label={t("sections.mobile")}
                title={t("mobile.title")}
              >
                {t("mobile.description")}
              </SectionIntro>

              <BulletList items={mobileBullets} />
            </div>

            <div className="relative mx-auto w-full max-w-[300px]">
              <div
                className="pointer-events-none absolute -inset-8 rounded-[3rem] bg-primary/10 blur-3xl"
                aria-hidden
              />
              <div className="relative rounded-[2.5rem] border border-white/10 bg-zinc-950 p-2 shadow-2xl shadow-black/60">
                <div className="overflow-hidden rounded-[1.9rem] border border-white/5">
                  <Image
                    src="/whats-new/mobile.webp"
                    alt={t("mobile.imageAlt")}
                    width={780}
                    height={1688}
                    sizes="300px"
                    className="h-auto w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="more" className="scroll-mt-24">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <SectionIntro
              label={t("more.label")}
              title={t("more.title")}
            >
              {t("more.description")}
            </SectionIntro>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {alsoImproved.map(({ title, bullets }, index) => {
                const Icon = ALSO_IMPROVED_ICONS[index] ?? Palette;
                return (
                <div
                  key={title}
                  className="rounded-2xl border border-border/70 bg-card/50 p-5"
                >
                  <Icon className="size-5 text-primary" aria-hidden />
                  <h3 className="mt-4 font-semibold text-foreground">{title}</h3>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                    {bullets.map((item) => (
                      <li key={item} className="flex gap-2.5">
                        <Check
                          className="mt-0.5 size-3.5 shrink-0 text-primary"
                          aria-hidden
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden border-t border-border/60">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,197,94,0.14),transparent_50%)]"
            aria-hidden
          />
          <div className="relative mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:py-20">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t("ctaTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-muted-foreground">
              {t("ctaDescription")}
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              {startBoardButton()}
              <Button asChild size="lg" variant="outline">
                <Link href="/replay">
                  <Play aria-hidden />
                  {t("tryReplays")}
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <span>{t("footerTitle")}</span>
          <div className="flex items-center gap-4">
            <Link href="/" className="transition-colors hover:text-foreground">
              {t("home")}
            </Link>
            <Link
              href="/replay"
              className="transition-colors hover:text-foreground"
            >
              {t("replays")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
