/**
 * Fixture voting status: pure helpers for game day, voting state, and badge.
 * All "today" / game-day comparison uses UK (Europe/London).
 * "Reopen" = voting was previously opened (hasDeadline) and is now closed;
 * "Open voting" = voting has never been opened (no deadline).
 */

const UK = "Europe/London";

/** Calendar date in UK (YYYY-MM-DD) for a timestamp. */
function getUKDateString(ms: number): string {
  return new Date(ms).toLocaleDateString("en-CA", { timeZone: UK });
}

/**
 * True when the game date (calendar day in UK) is today or in the past.
 * Uses UK for both gameDate and "now" so behaviour is consistent regardless of server TZ.
 */
export function isGameDayOrBeyond(gameDate: number, now: number = Date.now()): boolean {
  return getUKDateString(gameDate) <= getUKDateString(now);
}

export type FixtureLike = {
  gameDate: number;
  deadline: number | null;
  votingOpenedAt: number | null;
  resultsVisibleAt: number | null;
};

export type FixtureVotingState = {
  votingOpen: boolean;
  hasDeadline: boolean;
  isPastDeadline: boolean;
  resultsVisible: boolean;
  isGameDayOrBeyond: boolean;
  isReopening: boolean;
};

export type FixtureStatus =
  | "POTM_DECIDED"
  | "VOTING_OPEN"
  | "VOTING_ENDED"
  | "CLOSED"
  | "UPCOMING";

export function getFixtureVotingState(
  fixture: FixtureLike,
  now: number = Date.now(),
): FixtureVotingState {
  const votingOpen = fixture.votingOpenedAt != null;
  const hasDeadline = fixture.deadline != null;
  const isPastDeadline =
    votingOpen && hasDeadline && fixture.deadline! < now;
  const resultsVisible = fixture.resultsVisibleAt != null;
  const isGameDayOrBeyondVal = isGameDayOrBeyond(fixture.gameDate, now);
  const isReopening = !votingOpen && hasDeadline;
  return {
    votingOpen,
    hasDeadline,
    isPastDeadline,
    resultsVisible,
    isGameDayOrBeyond: isGameDayOrBeyondVal,
    isReopening,
  };
}

/** Derivation order: first match wins. */
export function getFixtureStatus(
  fixture: FixtureLike,
  now: number = Date.now(),
): FixtureStatus {
  const state = getFixtureVotingState(fixture, now);
  if (state.resultsVisible) return "POTM_DECIDED";
  if (state.votingOpen && !state.isPastDeadline) return "VOTING_OPEN";
  if (state.votingOpen && state.isPastDeadline) return "VOTING_ENDED";
  if (!state.votingOpen && state.hasDeadline && state.isGameDayOrBeyond)
    return "CLOSED";
  return "UPCOMING";
}

export type BadgeLabel =
  | "POTM decided"
  | "Voting open"
  | "Upcoming"
  | "Voting not yet opened"
  | "Closed";

/**
 * Badge label for squad list and fixture header.
 * UPCOMING: "Upcoming" when match is in the future, "Voting not yet opened" when game day or past.
 */
export function getFixtureBadge(
  status: FixtureStatus,
  fixture: FixtureLike,
  now: number = Date.now(),
): BadgeLabel {
  switch (status) {
    case "POTM_DECIDED":
      return "POTM decided";
    case "VOTING_OPEN":
      return "Voting open";
    case "VOTING_ENDED":
    case "CLOSED":
      return "Closed";
    case "UPCOMING":
      return isGameDayOrBeyond(fixture.gameDate, now)
        ? "Voting not yet opened"
        : "Upcoming";
  }
}

/** CSS classes for badge pill (squad list and fixture header). */
export function getFixtureBadgeClass(badge: BadgeLabel): string {
  switch (badge) {
    case "POTM decided":
      return "bg-amber-100 text-amber-800";
    case "Voting open":
      return "bg-green-100 text-green-700";
    case "Upcoming":
    case "Voting not yet opened":
      return "bg-yellow-100 text-yellow-800";
    case "Closed":
      return "bg-gray-100 text-gray-600";
  }
}
