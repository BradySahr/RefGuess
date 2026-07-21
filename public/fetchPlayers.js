// ---------------------------------------------------------------
// fetch-players.js
//
// A one-time (or occasional) script — NOT part of the game itself.
// Run this with Node whenever you want a fresh batch of real players:
//
//     node fetch-players.js
//
// It talks to MLB's public Stats API and writes the results to
// players.json, in the same shape game.js already expects.
// ---------------------------------------------------------------

const SEASON = 2000;       // change this to pull a different year
const HOW_MANY = 25;       // how many players to include

async function main() {
  // Step 1: get a list of real player IDs by asking for this
  // season's home run leaders. This saves us from having to know
  // player IDs ahead of time.
  const leadersUrl =
    `https://statsapi.mlb.com/api/v1/stats/leaders?leaderCategories=homeRuns` +
    `&season=${SEASON}&sportId=1&limit=${HOW_MANY}`;

  const leadersRes = await fetch(leadersUrl);
  const leadersData = await leadersRes.json();
  const leaders = leadersData.leagueLeaders[0].leaders;

  const players = [];

  // Step 2: for each player on that list, pull their full season
  // stat line (average, home runs, RBI) and current team.
  for (const leader of leaders) {
    const personId = leader.person.id;
    const statsUrl =
      `https://statsapi.mlb.com/api/v1/people/${personId}/stats` +
      `?stats=season&season=${SEASON}&group=hitting`;

    const statsRes = await fetch(statsUrl);
    const statsData = await statsRes.json();
    const split = statsData.stats?.[0]?.splits?.[0];

    if (!split) continue; // skip anyone with no season data

    players.push({
      name: leader.person.fullName,
      team: split.team?.name ?? "Unknown",
      year: SEASON,
      avg: parseFloat(split.stat.avg),
      hr: parseInt(split.stat.homeRuns, 10),
      rbi: parseInt(split.stat.rbi, 10),
    });

    console.log(`Fetched ${leader.person.fullName}`);
  }

  // Write players.json into the SAME folder as this script file,
  // no matter what folder you were in when you ran "node fetch-players.js".
  const fs = await import("fs/promises");
  const path = await import("path");
  const { fileURLToPath } = await import("url");
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const outputPath = path.join(scriptDir, "players.json");

  await fs.writeFile(outputPath, JSON.stringify(players, null, 2));
}

main().catch((err) => {
  console.error("Something went wrong:", err.message);
});