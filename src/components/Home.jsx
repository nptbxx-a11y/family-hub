import { useState, useRef } from "react";
import "./Home.css";
import coupleImg from "../assets/couple.png";

const MET_DATE = new Date("2025-07-09");
const YOUTUBE_ID = "pO40TcKa_5U";

function getDaysTogether() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = today - MET_DATE;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function Home() {
  const days = getDaysTogether();
  const [playing, setPlaying] = useState(false);
  const iframeRef = useRef(null);

  const srcUrl = `https://www.youtube.com/embed/${YOUTUBE_ID}?enablejsapi=1&loop=1&playlist=${YOUTUBE_ID}&controls=0&modestbranding=1`;

  const sendCommand = (func) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func }),
      "*"
    );
  };

  const togglePlay = () => {
    if (playing) {
      sendCommand("pauseVideo");
      setPlaying(false);
    } else {
      sendCommand("playVideo");
      setPlaying(true);
    }
  };

  return (
    <div className="home-container">
      <div className="home-card">
        <div className="couple-icon">
          <img src={coupleImg} alt="Nick and Laura" className="couple-img" />
        </div>
        <h1 className="home-title">Br Br Family Hub</h1>
        <p className="home-subtitle">Welcome back, Nick & Laura</p>
      </div>

      <div className="days-widget">
        <span className="days-number">{days}</span>
        <span className="days-label">days together</span>
      </div>

      <div className="music-bar">
        <span className="music-note" style={{ opacity: playing ? 1 : 0.4 }}>♪</span>
        <span className="music-title">You Gotta Be — Des'ree</span>
        <button className="music-toggle" onClick={togglePlay}>
          {playing ? "⏸" : "▶"}
        </button>
      </div>

      <iframe
        ref={iframeRef}
        className="youtube-hidden"
        src={srcUrl}
        allow="autoplay"
        title="background music"
      />
    </div>
  );
}
