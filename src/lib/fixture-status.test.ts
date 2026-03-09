import { describe, it, expect } from "vitest";
import {
  isGameDayOrBeyond,
  getFixtureVotingState,
  getFixtureStatus,
  getFixtureBadge,
  getFixtureBadgeClass,
  type FixtureLike,
} from "./fixture-status";

/** Fixed timestamps: 2025-06-15 00:00 UTC and 12:00 UTC (same calendar day in UK). */
const june15Start = new Date("2025-06-15T00:00:00Z").getTime();
const june15Noon = new Date("2025-06-15T12:00:00Z").getTime();
const june16Start = new Date("2025-06-16T00:00:00Z").getTime();
const june14Start = new Date("2025-06-14T00:00:00Z").getTime();

describe("isGameDayOrBeyond", () => {
  it("returns true when game date is same day as now (UK)", () => {
    expect(isGameDayOrBeyond(june15Start, june15Noon)).toBe(true);
  });

  it("returns false when game date is tomorrow (UK)", () => {
    expect(isGameDayOrBeyond(june16Start, june15Noon)).toBe(false);
  });

  it("returns true when game date is yesterday (UK)", () => {
    expect(isGameDayOrBeyond(june14Start, june15Noon)).toBe(true);
  });

  it("returns true when game date equals now date", () => {
    expect(isGameDayOrBeyond(june15Start, june15Start)).toBe(true);
  });
});

describe("getFixtureVotingState", () => {
  const now = 1700000000000;

  it("votingOpen when votingOpenedAt set", () => {
    const fixture: FixtureLike = {
      gameDate: now - 86400000,
      deadline: now + 3600000,
      votingOpenedAt: now,
      resultsVisibleAt: null,
    };
    const state = getFixtureVotingState(fixture, now);
    expect(state.votingOpen).toBe(true);
    expect(state.hasDeadline).toBe(true);
    expect(state.isPastDeadline).toBe(false);
    expect(state.resultsVisible).toBe(false);
    expect(state.isReopening).toBe(false);
  });

  it("isPastDeadline when deadline < now and voting open", () => {
    const fixture: FixtureLike = {
      gameDate: now - 86400000,
      deadline: now - 1000,
      votingOpenedAt: now - 3600000,
      resultsVisibleAt: null,
    };
    const state = getFixtureVotingState(fixture, now);
    expect(state.votingOpen).toBe(true);
    expect(state.isPastDeadline).toBe(true);
  });

  it("isReopening when !votingOpen and hasDeadline", () => {
    const fixture: FixtureLike = {
      gameDate: now - 86400000,
      deadline: now + 3600000,
      votingOpenedAt: null,
      resultsVisibleAt: null,
    };
    const state = getFixtureVotingState(fixture, now);
    expect(state.votingOpen).toBe(false);
    expect(state.hasDeadline).toBe(true);
    expect(state.isReopening).toBe(true);
  });

  it("resultsVisible when resultsVisibleAt set", () => {
    const fixture: FixtureLike = {
      gameDate: now - 86400000,
      deadline: null,
      votingOpenedAt: null,
      resultsVisibleAt: now,
    };
    const state = getFixtureVotingState(fixture, now);
    expect(state.resultsVisible).toBe(true);
  });
});

describe("getFixtureStatus", () => {
  const now = 1700000000000;
  const gameDay = now - 86400000;

  it("POTM_DECIDED when resultsVisible", () => {
    const fixture: FixtureLike = {
      gameDate: gameDay,
      deadline: now + 3600000,
      votingOpenedAt: now,
      resultsVisibleAt: now,
    };
    expect(getFixtureStatus(fixture, now)).toBe("POTM_DECIDED");
  });

  it("VOTING_OPEN when voting open and !isPastDeadline", () => {
    const fixture: FixtureLike = {
      gameDate: gameDay,
      deadline: now + 3600000,
      votingOpenedAt: now,
      resultsVisibleAt: null,
    };
    expect(getFixtureStatus(fixture, now)).toBe("VOTING_OPEN");
  });

  it("VOTING_ENDED when voting open and isPastDeadline", () => {
    const fixture: FixtureLike = {
      gameDate: gameDay,
      deadline: now - 1000,
      votingOpenedAt: now - 3600000,
      resultsVisibleAt: null,
    };
    expect(getFixtureStatus(fixture, now)).toBe("VOTING_ENDED");
  });

  it("CLOSED when !votingOpen, hasDeadline, isGameDayOrBeyond", () => {
    const fixture: FixtureLike = {
      gameDate: gameDay,
      deadline: now + 3600000,
      votingOpenedAt: null,
      resultsVisibleAt: null,
    };
    expect(getFixtureStatus(fixture, now)).toBe("CLOSED");
  });

  it("UPCOMING when !votingOpen and (!hasDeadline or !isGameDayOrBeyond)", () => {
    const future = now + 86400000;
    const fixture: FixtureLike = {
      gameDate: future,
      deadline: null,
      votingOpenedAt: null,
      resultsVisibleAt: null,
    };
    expect(getFixtureStatus(fixture, now)).toBe("UPCOMING");
  });

  it("game day voting never opened -> UPCOMING, badge Voting not yet opened", () => {
    const fixture: FixtureLike = {
      gameDate: gameDay,
      deadline: null,
      votingOpenedAt: null,
      resultsVisibleAt: null,
    };
    expect(getFixtureStatus(fixture, now)).toBe("UPCOMING");
    const status = getFixtureStatus(fixture, now);
    expect(getFixtureBadge(status, fixture, now)).toBe("Voting not yet opened");
  });
});

describe("getFixtureBadge", () => {
  const now = 1700000000000;
  const gameDay = now - 86400000;
  const future = now + 86400000;

  it("maps each status to correct label", () => {
    expect(
      getFixtureBadge(
        "POTM_DECIDED",
        { gameDate: gameDay, deadline: null, votingOpenedAt: null, resultsVisibleAt: now },
        now,
      ),
    ).toBe("POTM decided");
    expect(
      getFixtureBadge(
        "VOTING_OPEN",
        { gameDate: gameDay, deadline: now + 1, votingOpenedAt: now, resultsVisibleAt: null },
        now,
      ),
    ).toBe("Voting open");
    expect(
      getFixtureBadge("VOTING_ENDED", { gameDate: gameDay, deadline: now - 1, votingOpenedAt: now, resultsVisibleAt: null }, now),
    ).toBe("Closed");
    expect(
      getFixtureBadge("CLOSED", { gameDate: gameDay, deadline: now, votingOpenedAt: null, resultsVisibleAt: null }, now),
    ).toBe("Closed");
    expect(
      getFixtureBadge("UPCOMING", { gameDate: future, deadline: null, votingOpenedAt: null, resultsVisibleAt: null }, now),
    ).toBe("Upcoming");
    expect(
      getFixtureBadge("UPCOMING", { gameDate: gameDay, deadline: null, votingOpenedAt: null, resultsVisibleAt: null }, now),
    ).toBe("Voting not yet opened");
  });
});

describe("getFixtureBadgeClass", () => {
  it("returns correct classes for each badge", () => {
    expect(getFixtureBadgeClass("POTM decided")).toBe("bg-amber-100 text-amber-800");
    expect(getFixtureBadgeClass("Voting open")).toBe("bg-green-100 text-green-700");
    expect(getFixtureBadgeClass("Upcoming")).toBe("bg-yellow-100 text-yellow-800");
    expect(getFixtureBadgeClass("Voting not yet opened")).toBe("bg-yellow-100 text-yellow-800");
    expect(getFixtureBadgeClass("Closed")).toBe("bg-gray-100 text-gray-600");
  });
});
