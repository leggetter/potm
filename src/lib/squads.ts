import { db } from "../db";
import { squads, squadAdmins } from "../db/schema";
import { eq, and } from "drizzle-orm";

export type SquadRole = "owner" | "admin" | null;

export async function getSquadBySlug(slug: string) {
  return db.select().from(squads).where(eq(squads.slug, slug)).get();
}

export async function getSquadRole(
  squadId: number,
  userId: string
): Promise<SquadRole> {
  const row = db
    .select({ role: squadAdmins.role })
    .from(squadAdmins)
    .where(
      and(eq(squadAdmins.squadId, squadId), eq(squadAdmins.userId, userId))
    )
    .get();
  return (row?.role as SquadRole) ?? null;
}

export async function requireSquadAdmin(
  squadSlug: string,
  userId: string | undefined
): Promise<{
  squad: typeof squads.$inferSelect;
  role: "owner" | "admin";
} | null> {
  if (!userId) return null;
  const squad = await getSquadBySlug(squadSlug);
  if (!squad) return null;
  const role = await getSquadRole(squad.id, userId);
  if (!role) return null;
  return { squad, role };
}

const SLUG_SHORT_ID_LENGTH = 6;

function slugPrefixFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function generateSlug(name: string): string {
  const base = slugPrefixFromName(name);
  const shortId = Math.random().toString(36).substring(2, 2 + SLUG_SHORT_ID_LENGTH);
  return `${base}-${shortId}`;
}

/**
 * Returns the new slug when updating the squad name: same shortId (unique id in URL), new prefix from name.
 */
export function slugWithNewName(currentSlug: string, newName: string): string {
  const parts = currentSlug.split("-");
  const shortId = parts.pop();
  if (!shortId || shortId.length !== SLUG_SHORT_ID_LENGTH) {
    return currentSlug;
  }
  const prefix = slugPrefixFromName(newName) || "squad";
  return `${prefix}-${shortId}`;
}

export async function getUserSquads(userId: string) {
  return db
    .select({
      id: squads.id,
      slug: squads.slug,
      name: squads.name,
      description: squads.description,
      headerImage: squads.headerImage,
      role: squadAdmins.role,
    })
    .from(squadAdmins)
    .innerJoin(squads, eq(squadAdmins.squadId, squads.id))
    .where(eq(squadAdmins.userId, userId))
    .all();
}

