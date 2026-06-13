// src/worldcup/flags.js
// Maps World Cup team names to flag emoji. ISO countries use regional-indicator
// pairs; home nations (England/Scotland) use subdivision tag sequences.

const ISO2 = {
  Algeria: "DZ", Argentina: "AR", Australia: "AU", Austria: "AT", Belgium: "BE",
  "Bosnia & Herzegovina": "BA", Brazil: "BR", Canada: "CA", "Cape Verde": "CV",
  Colombia: "CO", Croatia: "HR", "Curaçao": "CW", "Czech Republic": "CZ",
  "DR Congo": "CD", Ecuador: "EC", Egypt: "EG", France: "FR", Germany: "DE",
  Ghana: "GH", Haiti: "HT", Iran: "IR", Iraq: "IQ", "Ivory Coast": "CI",
  Japan: "JP", Jordan: "JO", Mexico: "MX", Morocco: "MA", Netherlands: "NL",
  "New Zealand": "NZ", Norway: "NO", Panama: "PA", Paraguay: "PY", Portugal: "PT",
  Qatar: "QA", "Saudi Arabia": "SA", Senegal: "SN", "South Africa": "ZA",
  "South Korea": "KR", Spain: "ES", Sweden: "SE", Switzerland: "CH",
  Tunisia: "TN", Turkey: "TR", USA: "US", Uruguay: "UY", Uzbekistan: "UZ",
};

// IANA-style subdivision codes for the home nations (no plain ISO flag).
const SUBDIVISION = { England: "gbeng", Scotland: "gbsct", Wales: "gbwls" };

function iso2Flag(iso) {
  return String.fromCodePoint(
    ...[...iso.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

function subdivisionFlag(code) {
  // U+1F3F4 (black flag) + tag chars for each letter + U+E007F (cancel tag).
  return String.fromCodePoint(
    0x1f3f4,
    ...[...code].map((c) => 0xe0000 + c.charCodeAt(0)),
    0xe007f
  );
}

// Returns a flag emoji for a team name, or a white flag if unknown.
export function flagFor(teamName) {
  if (SUBDIVISION[teamName]) return subdivisionFlag(SUBDIVISION[teamName]);
  const iso = ISO2[teamName];
  return iso ? iso2Flag(iso) : "🏳️";
}
