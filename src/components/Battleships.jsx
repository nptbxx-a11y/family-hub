// src/components/Battleships.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import BattleshipsPlacement from './BattleshipsPlacement';
import BattleshipsGame from './BattleshipsGame';
import './Battleships.css';

function getOpponentKey(key) {
  return key === 'ozzy' ? 'tommy' : 'ozzy';
}

function displayName(key) {
  return key === 'ozzy' ? 'Ozzy' : 'Tommy';
}

export default function Battleships() {
  const [game, setGame]           = useState(null);
  const [playerKey, setPlayerKey] = useState(
    () => localStorage.getItem('battleships_player') || null
  );
  const [loading, setLoading] = useState(true);

  // Fetch active game on mount
  useEffect(() => {
    async function init() {
      const { data } = await supabase
        .from('battleships_games')
        .select('*')
        .in('status', ['waiting', 'placing', 'playing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setGame(data || null);
      setLoading(false);
    }
    init();
  }, []);

  // Subscribe to realtime updates whenever game id changes
  useEffect(() => {
    if (!game?.id) return;
    const channel = supabase
      .channel(`battleships:${game.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'battleships_games',
          filter: `id=eq.${game.id}`,
        },
        payload => setGame(payload.new)
      )
      .subscribe();
    return () => channel.unsubscribe();
  }, [game?.id]);

  // Advance to playing when both players are ready (handles simultaneous-ready race condition)
  useEffect(() => {
    if (
      !game?.id ||
      game.status !== 'placing' ||
      !game.ozzy_ready ||
      !game.tommy_ready ||
      game.created_by !== playerKey
    ) return;
    supabase
      .from('battleships_games')
      .update({ status: 'playing', current_turn: Math.random() < 0.5 ? 'ozzy' : 'tommy' })
      .eq('id', game.id)
      .eq('status', 'placing');
  }, [game?.id, game?.status, game?.ozzy_ready, game?.tommy_ready, playerKey]);

  function handleSelectPlayer(key) {
    localStorage.setItem('battleships_player', key);
    setPlayerKey(key);
  }

  async function handleNewGame(mode) {
    const { data } = await supabase
      .from('battleships_games')
      .insert({ status: 'waiting', created_by: playerKey, mode })
      .select()
      .single();
    setGame(data);
  }

  async function handleJoin() {
    const { data } = await supabase
      .from('battleships_games')
      .update({ status: 'placing' })
      .eq('id', game.id)
      .select()
      .single();
    setGame(data);
  }

  async function handleReady(ships) {
    const oppKey               = getOpponentKey(playerKey);
    const opponentAlreadyReady = game[`${oppKey}_ready`];
    await supabase
      .from('battleships_games')
      .update({
        [`${playerKey}_ships`]: ships,
        [`${playerKey}_ready`]: true,
        ...(opponentAlreadyReady
          ? { status: 'playing', current_turn: Math.random() < 0.5 ? 'ozzy' : 'tommy' }
          : {}),
      })
      .eq('id', game.id);
  }

  async function handleShot(row, col, hit) {
    const oppKey   = getOpponentKey(playerKey);
    const newShots = [...(game[`${playerKey}_shots`] || []), { row, col, hit }];
    const oppShips = game[`${oppKey}_ships`] || [];
    const allSunk  = oppShips.every(ship =>
      ship.cells.every(c => newShots.some(s => s.row === c.row && s.col === c.col && s.hit))
    );
    await supabase
      .from('battleships_games')
      .update({
        [`${playerKey}_shots`]: newShots,
        current_turn: oppKey,
        ...(allSunk ? { winner: playerKey, status: 'finished' } : {}),
      })
      .eq('id', game.id);
  }

  async function handlePlayAgain() {
    await supabase
      .from('battleships_games')
      .update({ status: 'finished' })
      .eq('id', game.id);
    setGame(null);
  }

  // ── Player selection (first time on this device) ──
  if (!playerKey) {
    return (
      <div className="bs-page bs-player-select">
        <h2>⚔️ Sushi Battleships</h2>
        <p>Who are you on this device?</p>
        <button className="bs-player-btn" onClick={() => handleSelectPlayer('ozzy')}>
          I'm Ozzy 🍣
        </button>
        <button className="bs-player-btn" onClick={() => handleSelectPlayer('tommy')}>
          I'm Tommy 🦐
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="bs-page"><p className="bs-waiting-msg">Loading...</p></div>;
  }

  // ── Victory ──
  if (game?.status === 'finished') {
    const won = game.winner === playerKey;
    return (
      <div className="bs-page bs-victory">
        <div className="bs-victory-emoji">{won ? '🏆' : '😢'}</div>
        <h2>{won ? 'You won!' : `${displayName(game.winner)} wins!`}</h2>
        <p>{won ? 'All their sushi is eaten! 🍣' : 'Better luck next time!'}</p>
        <button className="bs-play-again-btn" onClick={handlePlayAgain}>
          Play Again 🍣
        </button>
      </div>
    );
  }

  // ── Battle ──
  if (game?.status === 'playing') {
    return (
      <BattleshipsGame
        game={game}
        playerKey={playerKey}
        opponentKey={getOpponentKey(playerKey)}
        onShot={handleShot}
        mode={game.mode}
      />
    );
  }

  // ── Placement — already ready, waiting for opponent ──
  if (game?.status === 'placing' && game[`${playerKey}_ready`]) {
    const oppReady = game[`${getOpponentKey(playerKey)}_ready`];
    return (
      <div className="bs-page">
        <h2>⚔️ Sushi Battleships</h2>
        <p className="bs-waiting-msg">
          {oppReady
            ? 'Both ready — battle starting! 🍣'
            : <><span>Fleet hidden ✅</span><br /><span>Waiting for {displayName(getOpponentKey(playerKey))} to place their fleet...</span></>}
        </p>
      </div>
    );
  }

  // ── Placement — place your ships ──
  if (game?.status === 'placing') {
    return <BattleshipsPlacement playerName={playerKey} onReady={handleReady} mode={game.mode} />;
  }

  // ── Waiting lobby — you created the game ──
  if (game?.status === 'waiting' && game.created_by === playerKey) {
    return (
      <div className="bs-page bs-lobby">
        <h2>⚔️ Sushi Battleships</h2>
        <p className="bs-lobby-waiting">
          ⏳ Waiting for {displayName(getOpponentKey(playerKey))} to join...
        </p>
      </div>
    );
  }

  // ── Waiting lobby — opponent created, you can join ──
  if (game?.status === 'waiting') {
    return (
      <div className="bs-page bs-lobby">
        <h2>⚔️ Sushi Battleships</h2>
        <p>{displayName(game.created_by)} started a new game!</p>
        <button className="bs-lobby-btn" onClick={handleJoin}>
          Join Game ⚔️
        </button>
      </div>
    );
  }

  // ── No active game ──
  return (
    <div className="bs-page bs-lobby">
      <h2>⚔️ Sushi Battleships</h2>
      <p>A fishy battle awaits... 🍣</p>
      <div className="bs-mode-buttons">
        <button className="bs-lobby-btn" onClick={() => handleNewGame('regular')}>
          Full Game 🍣
        </button>
        <button className="bs-lobby-btn" onClick={() => handleNewGame('mini')}>
          Mini 🍱
        </button>
      </div>
    </div>
  );
}
