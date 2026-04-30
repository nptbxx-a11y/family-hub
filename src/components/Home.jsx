import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import "./Home.css";
import coupleImg from "../assets/couple.png";
import nmfcLogo from "../assets/nmfc-logo.svg";

const MET_DATE = new Date("2025-07-09");
const YOUTUBE_ID = "tMDFv5m18Pw";

// ── UK seasonal / short-season calendar ──────────────────────────────────
// Events are checked top-to-bottom — put specific short events ABOVE the base
// seasons so they take priority. To add a new event, uncomment or add a line:
//   { label: "Wimbledon",     icon: "🎾", from: [6, 30], to: [7, 13] }
//   { label: "Christmas",     icon: "🎄", from: [12, 1],  to: [12, 25] }
//   { label: "Easter",        icon: "🐣", from: [4, 18],  to: [4, 21] }
// Months are 1-indexed. Ranges that wrap the new year (e.g. Winter) work fine.
const CALENDAR_EVENTS = [
  // ── Short-season events (add new ones here) ──────────────────────────
  // { label: "Wimbledon",  icon: "🎾", from: [6, 30], to: [7, 13] },

  // ── Base UK meteorological seasons ───────────────────────────────────
  { label: "Spring", icon: "🌸", from: [3,  1], to: [5, 31], color: "#f9a8d4", bg: "rgba(249,168,212,0.12)", border: "rgba(249,168,212,0.25)" },
  { label: "Summer", icon: "☀️", from: [6,  1], to: [8, 31], color: "#fde68a", bg: "rgba(253,230,138,0.12)", border: "rgba(253,230,138,0.28)" },
  { label: "Autumn", icon: "🍂", from: [9,  1], to: [11,30], color: "#fb923c", bg: "rgba(251,146, 60,0.12)", border: "rgba(251,146, 60,0.28)" },
  { label: "Winter", icon: "❄️", from: [12, 1], to: [2, 28], color: "#93c5fd", bg: "rgba(147,197,253,0.12)", border: "rgba(147,197,253,0.25)" },
];

function getCurrentEvent() {
  const now = new Date();
  const md  = (now.getMonth() + 1) * 100 + now.getDate();
  for (const evt of CALENDAR_EVENTS) {
    const fromMD = evt.from[0] * 100 + evt.from[1];
    const toMD   = evt.to[0]   * 100 + evt.to[1];
    const hit    = fromMD <= toMD ? (md >= fromMD && md <= toMD) : (md >= fromMD || md <= toMD);
    if (hit) return evt;
  }
  return null;
}

const WORLD_CLOCKS = [
  { label: "London",    tz: "Europe/London" },
  { label: "Melbourne", tz: "Australia/Melbourne" },
  { label: "Singapore", tz: "Asia/Singapore" },
  { label: "Wyoming",   tz: "America/Denver" },
];

function getTimeParts(now, tz) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, hour: "numeric", minute: "numeric", second: "numeric", hour12: false,
  }).formatToParts(now);
  const get = (type) => parseInt(parts.find((p) => p.type === type)?.value ?? "0");
  return { h: get("hour"), m: get("minute"), s: get("second") };
}

function ClockFace({ label, tz, now }) {
  const { h, m, s } = getTimeParts(now, tz);
  const secDeg  = s * 6;
  const minDeg  = m * 6 + s * 0.1;
  const hourDeg = (h % 12) * 30 + m * 0.5;
  const digital = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(now);

  const hand = (deg, len, width, color) => (
    <line
      x1="50" y1="50"
      x2={50 + len * Math.sin((deg * Math.PI) / 180)}
      y2={50 - len * Math.cos((deg * Math.PI) / 180)}
      stroke={color} strokeWidth={width} strokeLinecap="round"
    />
  );

  return (
    <div className="clock-face">
      <svg viewBox="0 0 100 100" className="clock-svg">
        {/* Face */}
        <circle cx="50" cy="50" r="47" fill="rgba(10,15,40,0.7)" stroke="rgba(180,200,255,0.18)" strokeWidth="1.5" />
        {/* Hour ticks */}
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * 30 * Math.PI) / 180;
          return (
            <line key={i}
              x1={50 + 38 * Math.sin(a)} y1={50 - 38 * Math.cos(a)}
              x2={50 + 44 * Math.sin(a)} y2={50 - 44 * Math.cos(a)}
              stroke="rgba(180,210,255,0.45)" strokeWidth={i % 3 === 0 ? 2.5 : 1.5} strokeLinecap="round"
            />
          );
        })}
        {/* Hands */}
        {hand(hourDeg, 25, 4,   "rgba(255,255,255,0.95)")}
        {hand(minDeg,  34, 2.5, "rgba(255,255,255,0.9)")}
        {hand(secDeg,  37, 1.5, "#f97316")}
        {/* Centre dot */}
        <circle cx="50" cy="50" r="3.5" fill="#f97316" />
        <circle cx="50" cy="50" r="1.5" fill="white" />
      </svg>
      <span className="clock-digital">{digital}</span>
      <span className="clock-label">{label}</span>
    </div>
  );
}

function WorldClocks() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="world-clocks-row">
      {WORLD_CLOCKS.map(({ label, tz }) => (
        <ClockFace key={tz} label={label} tz={tz} now={now} />
      ))}
    </div>
  );
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.18 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 22 },
  },
};

function getDaysTogether() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = today - MET_DATE;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// Squiggle dates are Melbourne local time — display as-is labelled AEST
function formatGameDate(dateStr) {
  if (!dateStr) return "";
  const [datePart, timePart] = dateStr.split(" ");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const weekday = new Date(year, month - 1, day).toLocaleDateString("en-GB", { weekday: "short" });
  const dayMonth = new Date(year, month - 1, day).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const ampm = hour >= 12 ? "pm" : "am";
  const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${weekday} ${dayMonth}  ·  ${h12}:${String(minute).padStart(2, "0")}${ampm} AEST`;
}

export default function Home() {
  const days = getDaysTogether();
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [nextGame, setNextGame] = useState(null);
  const [recentResult, setRecentResult] = useState(null);
  const [teamLogos, setTeamLogos] = useState({});
  const [aflLoading, setAflLoading] = useState(true);
  const playerRef = useRef(null);

  // YouTube player
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
    window.onYouTubeIframeAPIReady = () => {
      playerRef.current = new window.YT.Player("yt-player", {
        videoId: YOUTUBE_ID,
        playerVars: { controls: 0, loop: 1, playlist: YOUTUBE_ID, modestbranding: 1, playsinline: 1 },
        events: { onReady: () => setReady(true) },
      });
    };
    if (window.YT && window.YT.Player && !playerRef.current) {
      playerRef.current = new window.YT.Player("yt-player", {
        videoId: YOUTUBE_ID,
        playerVars: { controls: 0, loop: 1, playlist: YOUTUBE_ID, modestbranding: 1, playsinline: 1 },
        events: { onReady: () => setReady(true) },
      });
    }
  }, []);

  // AFL next game + team logos from Squiggle API
  useEffect(() => {
    const fetchAFL = async () => {
      try {
        const year = new Date().getFullYear();

        // Fetch teams (for logo URLs) and games in parallel via server-side proxy
        const [teamsRes, ...gameResponses] = await Promise.all([
          fetch("/api/afl?q=teams"),
          fetch(`/api/afl?q=games;year=${year};team=12`),
          fetch(`/api/afl?q=games;year=${year - 1};team=12`),
        ]);

        // Build id → logo URL map from teams response
        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          const map = {};
          for (const t of (teamsData.teams || [])) {
            const logo = t.logo;
            map[t.id] = logo?.startsWith("/") ? `https://squiggle.com.au${logo}` : logo;
          }
          setTeamLogos(map);
        }

        // Collect all games then find next upcoming + most recent result
        const allGames = [];
        for (const res of gameResponses) {
          if (!res.ok) continue;
          const data = await res.json();
          if (data.games?.length > 0) allGames.push(...data.games);
        }

        const now = Date.now();
        const MS_27H = 27 * 60 * 60 * 1000;

        // Most recent completed game within 27 hours of kick-off
        const lastCompleted = allGames
          .filter(g => g.complete === 100 && g.date)
          .sort((a, b) => new Date(b.date.replace(" ", "T")) - new Date(a.date.replace(" ", "T")))
          .find(g => {
            const kickOff = new Date(g.date.replace(" ", "T")).getTime();
            return (now - kickOff) < MS_27H;
          });
        if (lastCompleted) setRecentResult(lastCompleted);

        // Next upcoming game
        const upcoming = allGames
          .filter(g => g.complete !== 100 && g.date)
          .sort((a, b) => new Date(a.date.replace(" ", "T")) - new Date(b.date.replace(" ", "T")));
        if (upcoming.length > 0) setNextGame(upcoming[0]);
      } catch {
        // network failure — widget shows placeholder
      } finally {
        setAflLoading(false);
      }
    };
    fetchAFL();
  }, []);

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (playing) {
      playerRef.current.pauseVideo();
      setPlaying(false);
    } else {
      playerRef.current.playVideo();
      setPlaying(true);
    }
  };

  // Derive display fields for whichever game mode is active
  const displayGame = recentResult ?? nextGame;
  const isHome    = displayGame?.hteam === "North Melbourne";
  const opponent  = isHome ? displayGame?.ateam   : displayGame?.hteam;
  const oppId     = isHome ? displayGame?.ateamid : displayGame?.hteamid;

  // Result mode helpers
  const nmScore   = isHome ? displayGame?.hscore  : displayGame?.ascore;
  const oppScore  = isHome ? displayGame?.ascore  : displayGame?.hscore;
  const nmGoals   = isHome ? displayGame?.hgoals  : displayGame?.agoals;
  const nmBehinds = isHome ? displayGame?.hbehinds: displayGame?.abehinds;
  const oppGoals  = isHome ? displayGame?.agoals  : displayGame?.hgoals;
  const oppBehinds= isHome ? displayGame?.abehinds: displayGame?.hbehinds;
  const nmWon     = nmScore > oppScore;
  const isDraw    = nmScore === oppScore;

  return (
    <motion.div
      className="home-container"
      variants={containerVariants}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, y: -10, transition: { duration: 0.25 } }}
    >
      {/* Home card + hanging season tag as one unit */}
      <motion.div className="home-card-wrap" variants={itemVariants}>
        <div className="home-card">
          <div className="couple-icon">
            <img src={coupleImg} alt="Ozzy and Tommy" className="couple-img" />
          </div>
          <h1 className="home-title">Br Br Family Hub</h1>
          <p className="home-subtitle">Welcome back, Ozzy & Tommy</p>
        </div>
        {(() => {
          const evt = getCurrentEvent();
          return evt ? (
            <div className="season-hanger">
              <div className="season-hanger-string" />
              <div
                className="season-hanger-tag"
                style={{ background: evt.bg, borderColor: evt.border, color: evt.color }}
              >
                <span className="season-hanger-icon">{evt.icon}</span>
                <span className="season-hanger-label">{evt.label}</span>
              </div>
            </div>
          ) : null;
        })()}
      </motion.div>

      <motion.div className="days-widget" variants={itemVariants}>
        <span className="days-number">{days}</span>
        <span className="days-label">days together ✨</span>
      </motion.div>

      <motion.div className="music-bar" variants={itemVariants}>
        <span className="music-note" style={{ opacity: playing ? 1 : 0.4 }}>♪</span>
        <span className="music-title">Crazy Train — Ozzy Osbourne</span>
        <motion.button
          className="music-toggle"
          onClick={togglePlay}
          disabled={!ready}
          whileTap={{ scale: 0.88 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          {playing ? "⏸" : "▶"}
        </motion.button>
      </motion.div>

      <motion.div className="world-clocks-widget" variants={itemVariants}>
        <WorldClocks />
      </motion.div>

      {/* AFL widget — shows recent result for 24h after game, then next fixture */}
      <motion.div className="afl-widget" variants={itemVariants}>
        <div className="afl-widget-header">
          <span className="afl-next-label">{recentResult ? "⊙ Last Result" : "⊙ Next Match"}</span>
          {displayGame && <span className="afl-round-label">{displayGame.roundname}</span>}
        </div>

        {aflLoading ? (
          <div className="afl-loading-row">
            <span className="afl-loading-text">Loading fixture…</span>
          </div>
        ) : recentResult ? (
          <>
            <div className="afl-teams-row">
              <div className="afl-team">
                <img src={nmfcLogo} alt="North Melbourne" className="afl-team-logo" />
                <span className="afl-score-line">{nmGoals}.{nmBehinds} <span className="afl-score-total">({nmScore})</span></span>
                <span className="afl-team-name">North Melbourne</span>
              </div>
              <span className="afl-vs">V</span>
              <div className="afl-team">
                <img src={teamLogos[oppId]} alt={opponent} className="afl-team-logo" />
                <span className="afl-score-line">{oppGoals}.{oppBehinds} <span className="afl-score-total">({oppScore})</span></span>
                <span className="afl-team-name">{opponent}</span>
              </div>
            </div>
            <div className="afl-details-row">
              <span className="afl-venue-text">{recentResult.venue}</span>
            </div>
            <span className={`afl-result-badge ${isDraw ? "afl-draw" : nmWon ? "afl-win" : "afl-loss"}`}>
              {isDraw ? "Draw" : nmWon ? "Win 🎉" : "Loss"}
            </span>
          </>
        ) : nextGame ? (
          <>
            <div className="afl-teams-row">
              <div className="afl-team">
                <img src={nmfcLogo} alt="North Melbourne" className="afl-team-logo" />
                <span className="afl-team-name">North Melbourne</span>
              </div>
              <span className="afl-vs">V</span>
              <div className="afl-team">
                <img src={teamLogos[oppId]} alt={opponent} className="afl-team-logo" />
                <span className="afl-team-name">{opponent}</span>
              </div>
            </div>
            <div className="afl-details-row">
              <span className="afl-venue-text">{nextGame.venue}</span>
              <span className="afl-date-text">{formatGameDate(nextGame.date)}</span>
            </div>
            <span className={"afl-home-away " + (isHome ? "afl-home" : "afl-away")}>
              {isHome ? "🏟️ Home" : "✈️ Away"}
            </span>
          </>
        ) : (
          <div className="afl-loading-row">
            <span className="afl-loading-text">No upcoming fixture found</span>
          </div>
        )}
      </motion.div>

      <div id="yt-player" className="youtube-hidden" />
    </motion.div>
  );
}
