import { db } from "../db";
import {
  fixtures,
  fixturePlayers,
  players,
  votes,
} from "../db/schema";
import { eq, and, desc } from "drizzle-orm";

export function generateFixtureSlug(opponent: string): string {
  const base = opponent
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const shortId = Math.random().toString(36).substring(2, 8);
  return `vs-${base}-${shortId}`;
}

export async function getFixtureBySlug(
  squadId: number,
  fixtureSlug: string
) {
  return db
    .select()
    .from(fixtures)
    .where(and(eq(fixtures.squadId, squadId), eq(fixtures.slug, fixtureSlug)))
    .get();
}

export async function getFixturePlayers(fixtureId: number) {
  return db
    .select({
      id: players.id,
      name: players.name,
    })
    .from(fixturePlayers)
    .innerJoin(players, eq(fixturePlayers.playerId, players.id))
    .where(eq(fixturePlayers.fixtureId, fixtureId))
    .all();
}

export interface PlayerResult {
  playerName: string;
  voteCount: number;
  voters: string[];
}

export async function getFixtureResults(
  fixtureId: number
): Promise<PlayerResult[]> {
  const fixturePlayerRows = db
    .select({
      playerId: fixturePlayers.playerId,
      playerName: players.name,
    })
    .from(fixturePlayers)
    .innerJoin(players, eq(fixturePlayers.playerId, players.id))
    .where(eq(fixturePlayers.fixtureId, fixtureId))
    .all();

  const allVotes = db
    .select({
      playerId: votes.playerId,
      voterName: votes.voterName,
    })
    .from(votes)
    .where(eq(votes.fixtureId, fixtureId))
    .all();

  const voteMap = new Map<number, { count: number; voters: string[] }>();
  for (const v of allVotes) {
    const entry = voteMap.get(v.playerId) || { count: 0, voters: [] };
    entry.count++;
    entry.voters.push(v.voterName);
    voteMap.set(v.playerId, entry);
  }

  const results: PlayerResult[] = fixturePlayerRows.map((fp) => {
    const entry = voteMap.get(fp.playerId) || { count: 0, voters: [] };
    return {
      playerName: fp.playerName,
      voteCount: entry.count,
      voters: entry.voters,
    };
  });

  results.sort((a, b) => b.voteCount - a.voteCount);
  return results;
}

export async function getSquadFixtures(squadId: number) {
  return db
    .select()
    .from(fixtures)
    .where(eq(fixtures.squadId, squadId))
    .orderBy(desc(fixtures.createdAt))
    .all();
}
