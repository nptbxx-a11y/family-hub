import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import "./Home.css";
import coupleImg from "../assets/couple.png";

const MET_DATE = new Date("2025-07-09");
const YOUTUBE_ID = "tMDFv5m18Pw";

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

export default function Home() {
  const days = getDaysTogether();
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const playerRef = useRef(null);

  useEffect(() => {
    // Load YouTube IFrame API script once
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }

    window.onYouTubeIframeAPIReady = () => {
      playerRef.current = new window.YT.Player("yt-player", {
        videoId: YOUTUBE_ID,
        playerVars: {
          controls: 0,
          loop: 1,
          playlist: YOUTUBE_ID,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: () => setReady(true),
        },
      });
    };

    // If API already loaded (e.g. revisiting page)
    if (window.YT && window.YT.Player && !playerRef.current) {
      playerRef.current = new window.YT.Player("yt-player", {
        videoId: YOUTUBE_ID,
        playerVars: {
          controls: 0,
          loop: 1,
          playlist: YOUTUBE_ID,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: () => setReady(true),
        },
      });
    }
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
