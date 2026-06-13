import { useState } from "react";
import { MAIN_TEAMS, OWNERS } from "../worldcup/constants";
import { setTeamOwner, clearOwners } from "../worldcup/db";
import { drawDarkHorses } from "../worldcup/draw";

export default function WorldCupSetup({ data, onClose, onSync }) {
  const { teams } = data;
  const [busy, setBusy] = useState(false);

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

  async function handleSync() {
    setBusy(true);
    try {
      await onSync();
    } catch (err) {
      alert("Sync failed: " + err.message);
    }
    setBusy(false);
  }

  return (
    <div className="wc-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="wc-modal">
        <div className="wc-modal-head">
          <h2>Setup</h2>
          <button className="wc-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <section className="wc-setup-section">
          <h3>Fixtures &amp; results</h3>
          <p className="wc-muted">{teams.length} teams loaded. Fixtures and scores sync automatically; tap below to refresh now.</p>
          <div className="wc-form-row">
            <button disabled={busy} onClick={handleSync}>🔄 Sync now</button>
          </div>
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
