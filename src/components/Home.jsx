import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import "./Home.css";
import coupleImg from "../assets/couple.png";

const MET_DATE = new Date("2025-07-09");
const YOUTUBE_ID = "tMDFv5m18Pw";
const NMFC_LOGO = "https://upload.wikimedia.org/wikipedia/en/thumb/4/44/North_Melbourne_FC_logo.svg/200px-North_Melbourne_FC_logo.svg.png";

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
  return `${weekday} ${dayMonth} · ${h12}:${String(minute).padStart(2, "0")}${ampm} AEST`;
}

export default function Home() {
  const days = getDaysTogether();
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [nextGame, setNextGame] = useState(null);
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

  // AFL next game — try current year then fall back to previous
  useEffect(() => {
    const fetchNextGame = async () => {
      try {
        const year = new Date().getFullYear();
        for (const y of [year, year - 1]) {
          const res = await fetch(
            `https://api.squiggle.com.au/?q=games;year=${y};team=North%20Melbourne`,
            { headers: { "Accept": "application/json" } }
          );
          if (!res.ok) continue;
          const data = await res.json();
          if (data.games?.length > 0) {
            const upcoming = data.games
              .filter(g => g.complete < 100)
              .sort((a, b) => new Date(a.date.replace(" ", "T")) - new Date(b.date.replace(" ", "T")));
            if (upcoming.length > 0) {
              setNextGame(upcoming[0]);
              break;
            }
          }
        }
      } catch {
        // network failure — widget shows "TBD"
      } finally {
        setAflLoading(false);
      }
    };
    fetchNextGame();
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

  const isHome = nextGame?.hteam === "North Melbourne";
  const opponent = isHome ? nextGame?.ateam : nextGame?.hteam;

  return (
    <motion.div
      className="home-container"
      variants={containerVariants}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, y: -10, transition: { duration: 0.25 } }}
    >
      <motion.div className="home-card" variants={itemVariants}>
        <div className="couple-icon">
          <img src={coupleImg} alt="Ozzy and Tommy" className="couple-img" />
        </div>
        <h1 className="home-title">Br Br Family Hub</h1>
        <p className="home-subtitle">Welcome back, Ozzy & Tommy</p>
      </motion.div>

      <motion.div className="days-widget" variants={itemVariants}>
        <span className="days-number">{days}</span>
        <span className="days-label">days together ✨</span>
      </motion.div>

      <motion.div className="afl-widget" variants={itemVariants}>
        <img src={NMFC_LOGO} alt="North Melbourne" className="afl-logo" />
        {aflLoading ? (
          <div className="afl-info">
            <span className="afl-round">North Melbourne</span>
            <span className="afl-opponent afl-loading">Loading fixture…</span>
          </div>
        ) : nextGame ? (
          <>
            <div className="afl-info">
              <span className="afl-round">{nextGame.roundname}</span>
              <span className="afl-opponent">vs {opponent}</span>
              <span className="afl-meta">{formatGameDate(nextGame.date)}</span>
              <span className="afl-venue">{nextGame.venue}</span>
            </div>
            <span className={"afl-badge " + (isHome ? "afl-home" : "afl-away")}>
              {isHome ? "Home" : "Away"}
            </span>
          </>
        ) : (
          <div className="afl-info">
            <span className="afl-round">North Melbourne</span>
            <span className="afl-opponent afl-loading">No fixture found</span>
          </div>
        )}
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

      <div id="yt-player" className="youtube-hidden" />
    </motion.div>
  );
}
