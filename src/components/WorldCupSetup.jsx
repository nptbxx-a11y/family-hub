import { useState } from "react";
import { STAGES, STAGE_LABELS, MAIN_TEAMS, OWNERS } from "../worldcup/constants";
import { addTeam, addMatch, setTeamOwner, clearOwners } from "../worldcup/db";
import { drawDarkHorses } from "../worldcup/draw";

export default function WorldCupSetup({ data, onClose }) {
  const { teams } = data;
  const [teamName, setTeamName] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [isFav, setIsFav] = useState(false);
  const [match, setMatch] = useState({ stage: "group", home_team: "", away_team: "" });
  const [busy, setBusy] = useState(false);

  async function handleAddTeam(e) {
    e.preventDefault();
    if (!teamName.trim()) return;
    setBusy(true);
    await addTeam({ name: teamName.trim(), group_code: groupCode.trim() || null, is_favourite: isFav });
    setTeamName(""); setGroupCode(""); setIsFav(false);
    setBusy(false);
  }

  async function handleAddMatch(e) {
    e.preventDefault();
    if (!match.home_team || !match.away_team) return;
    setBusy(true);
    await addMatch({ ...match, status: "scheduled" });
    setMatch({ stage: match.stage, home_team: "", away_team: "" });
    setBusy(false);
  }

  async function assignMains() {
    setBusy(true);
    for (const owner of OWNERS) {
      const t = teams.find((x) => x.name === MAIN_TEAMS[owner]);
      if (t) await setTeamOwner(t.id, owner, "main");
    }
    setBusy(false);
  }

  async function runDraw() {
    setBusy(true);
    try {
      const drawn = drawDarkHorses(teams);
      for (const t of teams.filter((x) => x.role === "darkhorse")) {
        await setTeamOwner(t.id, null, null);
      }
      for (const owner of OWNERS) {
        for (const name of drawn[owner]) {
          const t = teams.find((x) => x.name === name);
          if (t) await setTeamOwner(t.id, owner, "darkhorse");
        }
      }
    } catch (err) {
      alert(err.message);
    }
    setBusy(false);
  }

  const teamNames = teams.map((t) => t.name);

  return (
    <div className="wc-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="wc-modal">
        <div className="wc-modal-head">
          <h2>Setup</h2>
          <button className="wc-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <section className="wc-setup-section">
          <h3>Add a team</h3>
          <form onSubmit={handleAddTeam} className="wc-form-row">
            <input placeholder="Team name" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
            <input placeholder="Group" maxLength={2} value={groupCode} onChange={(e) => setGroupCode(e.target.value)} />
            <label className="wc-check"><input type="checkbox" checked={isFav} onChange={(e) => setIsFav(e.target.checked)} /> Favourite</label>
            <button disabled={busy}>Add</button>
          </form>
          <p className="wc-muted">{teams.length} teams added</p>
        </section>

        <section className="wc-setup-section">
          <h3>Add a match</h3>
          <form onSubmit={handleAddMatch} className="wc-form-row">
            <select value={match.stage} onChange={(e) => setMatch((m) => ({ ...m, stage: e.target.value }))}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
            </select>
            <select value={match.home_team} onChange={(e) => setMatch((m) => ({ ...m, home_team: e.target.value }))}>
              <option value="">Home…</option>
              {teamNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <select value={match.away_team} onChange={(e) => setMatch((m) => ({ ...m, away_team: e.target.value }))}>
              <option value="">Away…</option>
              {teamNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <button disabled={busy || !match.home_team || !match.away_team}>Add</button>
          </form>
        </section>

        <section className="wc-setup-section">
          <h3>Sweepstakes draw</h3>
          <p className="wc-muted">Mains: Ozzy → {MAIN_TEAMS.Ozzy}, Tommy → {MAIN_TEAMS.Tommy}</p>
          <div className="wc-form-row">
            <button disabled={busy} onClick={assignMains}>Assign main teams</button>
            <button disabled={busy} onClick={runDraw}>🎲 Draw dark horses</button>
            <button disabled={busy} onClick={() => clearOwners()}>Clear all</button>
          </div>
        </section>
      </div>
    </div>
  );
}
