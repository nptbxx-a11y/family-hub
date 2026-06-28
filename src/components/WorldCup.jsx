import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "../supabase";
import { fetchAll } from "../worldcup/db";
import { syncWorldCup } from "../worldcup/sync";
import { phaseLabel } from "../worldcup/phase";
import WorldCupTip from "./WorldCupTip";
import WorldCupLeaderboard from "./WorldCupLeaderboard";
import WorldCupTeams from "./WorldCupTeams";
import WorldCupSetup from "./WorldCupSetup";
import "./WorldCup.css";

const TABS = [
  { key: "tip", label: "Tip" },
  { key: "leaderboard", label: "Leaderboard" },
  { key: "teams", label: "My Teams" },
];

export default function WorldCup() {
  const [tab, setTab] = useState("tip");
  const [data, setData] = useState({ teams: [], matches: [], tips: [] });
  const [showSetup, setShowSetup] = useState(false);

  const load = useCallback(async () => {
    setData(await fetchAll());
  }, []);

  useEffect(() => {
    // Refresh from the public feed on open, then load whatever's in the DB.
    syncWorldCup()
      .catch((e) => console.warn("World Cup sync failed:", e.message))
      .finally(() => fetchAll().then(setData).catch(() => {}));
    const channel = supabase
      .channel("worldcup")
      .on("postgres_changes", { event: "*", schema: "public", table: "wc_teams" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "wc_matches" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "wc_tips" }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [load]);

  return (
    <motion.div
      className="page-bg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="wc-container">
        <div className="wc-hero">
          <button className="wc-hero-setup" onClick={() => setShowSetup(true)} aria-label="Setup">⚙️</button>
          <div className="wc-hero-inner">
            <h1 className="wc-hero-title"><span aria-hidden="true">🏆</span> World Cup</h1>
            <p className="wc-hero-tag">{phaseLabel(data.matches)}</p>
          </div>
        </div>

        <div className="wc-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              className={"wc-tab" + (tab === t.key ? " active" : "")}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "tip" && <WorldCupTip data={data} />}
        {tab === "leaderboard" && <WorldCupLeaderboard data={data} />}
        {tab === "teams" && <WorldCupTeams data={data} />}

        {showSetup && (
          <WorldCupSetup
            data={data}
            onClose={() => setShowSetup(false)}
            onSync={async () => { await syncWorldCup(); await load(); }}
          />
        )}
      </div>
    </motion.div>
  );
}
