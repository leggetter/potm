import type { APIRoute } from "astro";
import { ImageResponse } from "@vercel/og";
import React from "react";
import { getSquadBySlug } from "../../../../lib/squads";
import { getFixtureBySlug } from "../../../../lib/fixtures";
import { getUploadPath } from "../../../../lib/uploads";
import * as fs from "node:fs";
import * as path from "node:path";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

function formatGameDate(ms: number | null | undefined): string {
  if (ms == null) return "";
  return new Date(ms).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const GET: APIRoute = async ({ params }) => {
  const { squadSlug, fixtureSlug } = params;
  if (!squadSlug || !fixtureSlug) {
    return new Response("Not found", { status: 404 });
  }

  const squad = await getSquadBySlug(squadSlug);
  if (!squad) {
    return new Response("Not found", { status: 404 });
  }

  const fixture = await getFixtureBySlug(squad.id, fixtureSlug);
  if (!fixture) {
    return new Response("Not found", { status: 404 });
  }

  let headerImageUrl: string | null = null;
  if (squad.headerImage) {
    const fullPath = getUploadPath(squad.headerImage);
    if (fs.existsSync(fullPath)) {
      const buffer = fs.readFileSync(fullPath);
      const ext = path.extname(squad.headerImage).toLowerCase();
      const mime =
        ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
      headerImageUrl = `data:${mime};base64,${buffer.toString("base64")}`;
    }
  }

  const gameDateStr = formatGameDate(fixture.gameDate ?? null);

  const element = React.createElement(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        background: headerImageUrl
          ? `url(${headerImageUrl})`
          : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      },
    },
    React.createElement(
      "div",
      {
        style: {
          width: "100%",
          padding: "48px 56px 56px",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-end",
          backgroundColor: "rgba(0,0,0,0.7)",
        },
      },
      React.createElement("div", {
        style: {
          fontSize: 28,
          fontWeight: 600,
          color: "white",
          marginBottom: 8,
          textShadow: "0 1px 2px rgba(0,0,0,0.5)",
        },
        children: squad.name,
      }),
      React.createElement("div", {
        style: {
          fontSize: 48,
          fontWeight: 800,
          color: "white",
          marginBottom: gameDateStr ? 12 : 0,
          textShadow: "0 2px 4px rgba(0,0,0,0.5)",
        },
        children: `vs ${fixture.opponent}`,
      }),
      gameDateStr
        ? React.createElement("div", {
            style: {
              fontSize: 24,
              color: "rgba(255,255,255,0.95)",
              textShadow: "0 1px 2px rgba(0,0,0,0.5)",
            },
            children: gameDateStr,
          })
        : null,
      React.createElement("div", {
        style: {
          fontSize: 20,
          color: "rgba(255,255,255,0.8)",
          marginTop: 16,
          textShadow: "0 1px 2px rgba(0,0,0,0.5)",
        },
        children: "Player of the Match — Vote now",
      })
    )
  );

  return new ImageResponse(element, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
};
