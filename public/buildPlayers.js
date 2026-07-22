// ---------------------------------------------------------------
// build-players.js
//
// Builds players.json from the Lahman Baseball Database — no
// network calls, no scraping, just reading CSV files you've
// already downloaded onto your own computer.
//
// SETUP (one-time):
//   1. Download the Lahman database from:
//        https://github.com/chadwickbureau/baseballdatabank
//      (click "Code" -> "Download ZIP", then unzip it)
//   2. Inside the unzipped folder there's a "core" folder containing
//      lots of CSV files. Copy just these three into THIS project
//      folder (the same folder as this script):
//        People.csv
//        Teams.csv
//        Batting.csv
//
// THEN RUN:
//   node build-players.js
//
// This creates/overwrites players.json in this same folder.
// ---------------------------------------------------------------

const fs = require("fs");
const path = require("path");

const MIN_AT_BATS = 400;   // ignore partial/tiny seasons
const MAX_PLAYERS = 300;   // cap how many go into players.json

// Folder this script lives in, so it works no matter where you run it from.
const dir = __dirname;

// ---------- Small CSV reader ----------
// Lahman's CSVs are plain (no tricky embedded commas in the columns
// we need), so a simple split is enough. Returns an array of row
// objects keyed by the header row.
function readCSV(filename) {
  const fullPath = path.join(dir, filename);
  if (!fs.existsSync(fullPath)) {
    throw new Error(
      `Couldn't find ${filename} in this folder. Make sure you copied it ` +
      `here from the Lahman database's "core" folder.`
    );
  }

  const text = fs.readFileSync(fullPath, "utf8").trim();
  const lines = text.split("\n");
  const headers = lines[0].split(",");

  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row = {};
    headers.forEach((header, i) => {
      row[header.trim()] = (values[i] ?? "").trim();
    });
    return row;
  });
}

function main() {
  console.log("Reading People.csv...");
  const people = readCSV("People.csv");

  console.log("Reading Teams.csv...");
  const teams = readCSV("Teams.csv");

  console.log("Reading Batting.csv...");
  const batting = readCSV("Batting.csv");

  // Look up a player's full name by their playerID
  const nameByID = {};
  for (const person of people) {
    nameByID[person.playerID] = `${person.nameFirst} ${person.nameLast}`;
  }

  // Look up a team's full name by yearID + teamID (team names/cities
  // have changed over the years, so this is keyed by season)
  const teamNameByYearAndID = {};
  for (const team of teams) {
    teamNameByYearAndID[`${team.yearID}_${team.teamID}`] = team.name;
  }

  // Build one entry per qualifying batting season
  const players = [];
  for (const row of batting) {
    const atBats = parseInt(row.AB, 10) || 0;
    if (atBats < MIN_AT_BATS) continue; // skip small sample sizes

    const hits = parseInt(row.H, 10) || 0;
    const homeRuns = parseInt(row.HR, 10) || 0;
    const rbi = parseInt(row.RBI, 10) || 0;
    const name = nameByID[row.playerID];
    const team = teamNameByYearAndID[`${row.yearID}_${row.teamID}`];

    if (!name || !team) continue; // skip if we couldn't match either

    players.push({
      name,
      team,
      year: parseInt(row.yearID, 10),
      avg: Math.round((hits / atBats) * 1000) / 1000, // round to 3 decimals
      hr: homeRuns,
      rbi,
    });
  }

  console.log(`Found ${players.length} qualifying player-seasons.`);

  // Shuffle and trim down to MAX_PLAYERS so players.json isn't huge
  for (let i = players.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [players[i], players[j]] = [players[j], players[i]];
  }
  const selected = players.slice(0, MAX_PLAYERS);

  const outputPath = path.join(dir, "players.json");
  fs.writeFileSync(outputPath, JSON.stringify(selected, null, 2));
  console.log(`Saved ${selected.length} players to ${outputPath}`);
}

main();