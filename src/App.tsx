import React, { useState, useEffect, useCallback } from 'react';
import { TacticsBoard } from './components/TacticsBoard';
import { ChatBot } from './components/ChatBot';
import { Trophy, Users, Layout, Settings, Share2, Trash2, RotateCcw, Play, Plus, XCircle, Film, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpModal } from './components/HelpModal';

export default function App() {
  const [boardState, setBoardState] = useState<any>(null);
  const [savedTactics, setSavedTactics] = useState<any[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isSimplified, setIsSimplified] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [playerSize, setPlayerSize] = useState(18); // Default player size
  const [isTotalFrameMode, setIsTotalFrameMode] = useState(false);
  const [startFrameState, setStartFrameState] = useState<any>(null);
  const [endFrameState, setEndFrameState] = useState<any>(null);
  const [ballAttachedToPlayerId, setBallAttachedToPlayerId] = useState<string | null>(null);

  // Helper function to calculate distance between two points (normalized 0-1)
  const calculateDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Effect to automatically attach ball to the closest player if within a certain range
  useEffect(() => {
    if (!boardState || !boardState.players || !boardState.ball || boardState.isAnimating) return;

    let closestPlayerId: string | null = null;
    let minDistance = Infinity;
    const proximityThreshold = 0.05; // Adjust as needed (e.g., 5% of board width/height)

    boardState.players.forEach((player: any) => {
      const distance = calculateDistance(player, boardState.ball);
      if (distance < minDistance) {
        minDistance = distance;
        closestPlayerId = player.id;
      }
    });

    if (minDistance < proximityThreshold) {
      if (closestPlayerId !== ballAttachedToPlayerId) {
        setBallAttachedToPlayerId(closestPlayerId);
      }
    } else {
      if (ballAttachedToPlayerId !== null) {
        setBallAttachedToPlayerId(null);
      }
    }
  }, [boardState?.players, boardState?.ball, boardState?.isAnimating, ballAttachedToPlayerId]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'init') {
          setBoardState(message.state);
          setSavedTactics(message.savedTactics || []);
        } else if (message.type === 'update') {
          setBoardState(message.state);
        } else if (message.type === 'tactics_updated') {
          setSavedTactics(message.savedTactics);
        } else if (message.type === 'play_animation') {
          runSmoothAnimation();
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };

    setSocket(ws);
    return () => ws.close();
  }, []);

  const handleBoardUpdate = useCallback((newState: any) => {
    setBoardState((prev: any) => {
      const updated = { ...prev, ...newState };
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'update', state: updated }));
      }
      return updated;
    });
  }, [socket]);

  const addPlayer = (team: 'A' | 'B') => {
    const teamPlayers = boardState.players.filter((p: any) => p.team === team);
    const newId = `${team.toLowerCase()}${Date.now()}`;
    const newPlayer = {
      id: newId,
      x: team === 'A' ? 0.15 : 0.85,
      y: 0.2 + (teamPlayers.length * 0.1),
      color: team === 'A' ? '#3b82f6' : '#ef4444',
      number: (teamPlayers.length + 1).toString(),
      team: team
    };
    handleBoardUpdate({ players: [...boardState.players, newPlayer] });
  };

  const removePlayer = (id: string) => {
    const updatedPlayers = boardState.players.filter((p: any) => p.id !== id);
    handleBoardUpdate({ players: updatedPlayers });
  };

  const applyFormation = (type: string, team: 'A' | 'B') => {
    const isTeamA = team === 'A';
    const color = isTeamA ? '#3b82f6' : '#ef4444';
    const prefix = team.toLowerCase();
    
    // Base positions for Team A (left side) as percentages (0-1)
    const baseFormations: Record<string, {number: string, x: number, y: number}[]> = {
      '2-2': [
        { number: 'GK', x: 0.05, y: 0.5 },
        { number: '2', x: 0.25, y: 0.3 },
        { number: '3', x: 0.25, y: 0.7 },
        { number: '4', x: 0.55, y: 0.3 },
        { number: '5', x: 0.55, y: 0.7 },
      ],
      '3-1': [
        { number: 'GK', x: 0.05, y: 0.5 },
        { number: '2', x: 0.2, y: 0.5 },
        { number: '3', x: 0.4, y: 0.2 },
        { number: '4', x: 0.4, y: 0.8 },
        { number: '5', x: 0.7, y: 0.5 },
      ],
      '4-0': [
        { number: 'GK', x: 0.05, y: 0.5 },
        { number: '2', x: 0.4, y: 0.15 },
        { number: '3', x: 0.4, y: 0.38 },
        { number: '4', x: 0.4, y: 0.62 },
        { number: '5', x: 0.4, y: 0.85 },
      ]
    };

    const formationData = baseFormations[type];
    if (!formationData) return;

    const newTeamPlayers = formationData.map((pos, index) => ({
      id: `${prefix}${index + 1}`,
      team: team,
      color: color,
      number: pos.number,
      x: isTeamA ? pos.x : 1 - pos.x,
      y: pos.y
    }));

    // Keep other team players and replace current team players
    const otherTeamPlayers = boardState.players.filter((p: any) => p.team !== team);
    handleBoardUpdate({ players: [...otherTeamPlayers, ...newTeamPlayers] });
  };

  const addFrame = () => {
    const currentFrame = {
      players: JSON.parse(JSON.stringify(boardState.players)),
      ball: JSON.parse(JSON.stringify(boardState.ball))
    };

    if (isTotalFrameMode) {
      if (!startFrameState) {
        setStartFrameState(currentFrame);
      } else {
        setEndFrameState(currentFrame);
      }
    } else {
      handleBoardUpdate({ frames: [...boardState.frames, currentFrame] });
    }
  };

  const clearFrames = () => {
    handleBoardUpdate({ frames: [], isAnimating: false });
  };

  const runSmoothAnimation = async () => {
    setBoardState((prev: any) => {
      if (!prev) return prev;

      let framesToAnimate = prev.frames;
      if (isTotalFrameMode && startFrameState && endFrameState) {
        // Generate interpolated frames for total frame mode
        const numInterpolatedFrames = 30; // Number of frames to generate between start and end
        framesToAnimate = [];
        for (let i = 0; i <= numInterpolatedFrames; i++) {
          const progress = i / numInterpolatedFrames;
          const interpolatedPlayers = startFrameState.players.map((startP: any) => {
            const endP = endFrameState.players.find((p: any) => p.id === startP.id);
            if (!endP) return startP;
            return {
              ...startP,
              x: startP.x + (endP.x - startP.x) * progress,
              y: startP.y + (endP.y - startP.y) * progress,
              scale: 1 + Math.sin(progress * Math.PI) * 0.1,
            };
          });
          const interpolatedBall = {
            x: startFrameState.ball.x + (endFrameState.ball.x - startFrameState.ball.x) * progress,
            y: startFrameState.ball.y + (endFrameState.ball.y - startFrameState.ball.y) * progress,
          };
          framesToAnimate.push({ players: interpolatedPlayers, ball: interpolatedBall });
        }
      }

      if (framesToAnimate.length === 0) return prev;

      const duration = 1200; // Slightly longer for more realistic feel
      
      // Easing function: easeInOutCubic
      const easeInOutCubic = (t: number): number => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      };
      
      const animate = async () => {
        handleBoardUpdate({ isAnimating: true });
        
        for (let i = 0; i < framesToAnimate.length - 1; i++) {
          const startFrame = framesToAnimate[i];
          const endFrame = framesToAnimate[i+1];
          const startTime = performance.now();
          
          await new Promise<void>(resolve => {
            const step = (currentTime: number) => {
              const elapsed = currentTime - startTime;
              const t = Math.min(elapsed / duration, 1);
              const progress = easeInOutCubic(t);
              
              // Interpolate players
              const interpolatedPlayers = startFrame.players.map((startP: any) => {
                const endP = endFrame.players.find((p: any) => p.id === startP.id);
                if (!endP) return startP;
                
                // Add a slight "scale" effect based on progress to simulate movement intensity
                const scale = 1 + Math.sin(progress * Math.PI) * 0.1;
                
                return {
                  ...startP,
                  x: startP.x + (endP.x - startP.x) * progress,
                  y: startP.y + (endP.y - startP.y) * progress,
                  scale: scale // We'll need to use this in TacticsBoard
                };
              });
              
              // Interpolate ball with a slightly different easing for "snappier" movement
              // Ball often moves faster or reaches destination earlier in tactical plays
              const ballProgress = easeInOutCubic(Math.min(t * 1.2, 1)); 
              const interpolatedBall = { ...prev.ball }; // Start with previous ball state

              if (ballAttachedToPlayerId) {
                const attachedPlayer = interpolatedPlayers.find((p: any) => p.id === ballAttachedToPlayerId);
                if (attachedPlayer) {
                  interpolatedBall.x = attachedPlayer.x;
                  interpolatedBall.y = attachedPlayer.y;
                }
              } else {
                interpolatedBall.x = startFrame.ball.x + (endFrame.ball.x - startFrame.ball.x) * ballProgress;
                interpolatedBall.y = startFrame.ball.y + (endFrame.ball.y - startFrame.ball.y) * ballProgress;
              }
              
              setBoardState((s: any) => ({
                ...s,
                players: interpolatedPlayers,
                ball: interpolatedBall
              }));
              
              if (t < 1) {
                requestAnimationFrame(step);
              } else {
                resolve();
              }
            };
            requestAnimationFrame(step);
          });
          
          // Small pause between frames for realism
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        handleBoardUpdate({ isAnimating: false });
      };
      
      animate();
      return prev;
    });
  };

  const playAnimation = async () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'play_animation' }));
    }
  };

  const resetBoard = () => {
    const initialState = {
      players: [
        { id: 'a1', x: 0.1, y: 0.5, color: '#3b82f6', number: '1', team: 'A' },
        { id: 'a2', x: 0.25, y: 0.2, color: '#3b82f6', number: '2', team: 'A' },
        { id: 'a3', x: 0.25, y: 0.8, color: '#3b82f6', number: '3', team: 'A' },
        { id: 'a4', x: 0.4, y: 0.5, color: '#3b82f6', number: '4', team: 'A' },
        { id: 'a5', x: 0.05, y: 0.5, color: '#3b82f6', number: 'GK', team: 'A' },
        { id: 'b1', x: 0.9, y: 0.5, color: '#ef4444', number: '1', team: 'B' },
        { id: 'b2', x: 0.75, y: 0.2, color: '#ef4444', number: '2', team: 'B' },
        { id: 'b3', x: 0.75, y: 0.8, color: '#ef4444', number: '3', team: 'B' },
        { id: 'b4', x: 0.6, y: 0.5, color: '#ef4444', number: '4', team: 'B' },
        { id: 'b5', x: 0.95, y: 0.5, color: '#ef4444', number: 'GK', team: 'B' },
      ],
      ball: { x: 0.5, y: 0.5 },
      drawings: [],
      frames: [],
      isAnimating: false
    };
    handleBoardUpdate(initialState);
  };

  const clearTeam = (team: 'A' | 'B') => {
    const updatedPlayers = boardState.players.filter((p: any) => p.team !== team);
    handleBoardUpdate({ players: updatedPlayers });
  };

  const saveTacticWithName = (name: string) => {
    if (name && socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'save_tactic', name }));
    }
  };

  const saveTactic = () => {
    const name = prompt("Nome da Tática:");
    if (name) saveTacticWithName(name);
  };

  const loadTactic = (tactic: any) => {
    handleBoardUpdate(tactic.state);
  };

  const deleteTactic = (id: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'delete_tactic', id }));
    }
  };

  if (!boardState) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0f172a]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 font-display">Carregando Lousa Tática...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0f172a] text-slate-200">
      {/* Header */}
      <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-500/20">
            <Trophy size={24} className="text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl tracking-tight">Futsal Tactics Pro</h1>
            <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">v1.0.0 • Live Session</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSimplified(!isSimplified)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium ${
              isSimplified 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Layout size={16} />
            {isSimplified ? 'Visão Tática' : 'Visão Simples'}
          </button>
          <button 
            onClick={() => setIsHelpModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-sm font-medium text-slate-300"
          >
            <Info size={16} />
            Ajuda
          </button>
          <div className="w-px h-6 bg-slate-800" />
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-sm font-medium">
            <Share2 size={16} />
            Compartilhar
          </button>
          <div className="w-px h-6 bg-slate-800" />
          <div className="flex -space-x-2">
            {[1, 2].map(i => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-700 flex items-center justify-center text-[10px] font-bold">
                U{i}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Left Sidebar - Tools/Stats */}
        <aside className="w-64 flex flex-col gap-4 hidden lg:flex overflow-y-auto pr-2">
          {/* Saved Tactics */}
          <div className="glass-panel rounded-2xl p-4 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Layout size={14} />
                Táticas Salvas
              </h3>
              <button 
                onClick={saveTactic}
                className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
              >
                <Plus size={12} />
                SALVAR
              </button>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-hide">
              {savedTactics.length === 0 ? (
                <p className="text-[10px] text-slate-600 italic text-center py-2">Nenhuma tática salva</p>
              ) : (
                savedTactics.map((tactic) => (
                  <div key={tactic.id} className="group flex items-center justify-between bg-slate-800/30 hover:bg-slate-800/50 p-2 rounded-lg transition-all cursor-pointer" onClick={() => loadTactic(tactic)}>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-slate-300">{tactic.name}</span>
                      <span className="text-[8px] text-slate-600 font-mono">{new Date(tactic.createdAt).toLocaleDateString()}</span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteTactic(tactic.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-4 flex flex-col gap-4">
            <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest">Formações Rápidas</h3>
            <div className="space-y-3">
              <FormationGroup label="2-2 (Quadrado)" onApply={(team) => applyFormation('2-2', team)} />
              <FormationGroup label="3-1 (Diamante)" onApply={(team) => applyFormation('3-1', team)} />
              <FormationGroup label="4-0 (Linha)" onApply={(team) => applyFormation('4-0', team)} />
            </div>
          </div>

          {/* Animation System */}
          <div className="glass-panel rounded-2xl p-4 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Film size={14} />
                Animação da Jogada
              </h3>
              {boardState.frames.length > 0 && (
                <button 
                  onClick={clearFrames}
                  className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors"
                >
                  LIMPAR
                </button>
              )}
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={addFrame}
                disabled={boardState.isAnimating || (isTotalFrameMode && startFrameState && endFrameState)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg ${isTotalFrameMode && (!startFrameState || !endFrameState) ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30' : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'} hover:bg-blue-600/30 transition-all text-xs font-bold disabled:opacity-50`}
              >
                <Plus size={14} />
                {isTotalFrameMode ? (startFrameState ? (endFrameState ? 'FRAMES DEFINIDOS' : 'DEFINIR FIM') : 'DEFINIR INÍCIO') : 'ADD FRAME'}
              </button>
              <button 
                onClick={playAnimation}
                disabled={boardState.isAnimating || (isTotalFrameMode && (!startFrameState || !endFrameState)) || (!isTotalFrameMode && boardState.frames.length === 0)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 transition-all text-xs font-bold disabled:opacity-50"
              >
                <Play size={14} />
                PLAY
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label htmlFor="totalFrameMode" className="flex items-center gap-2 cursor-pointer">
                <input
                  id="totalFrameMode"
                  type="checkbox"
                  checked={isTotalFrameMode}
                  onChange={() => {
                    setIsTotalFrameMode(!isTotalFrameMode);
                    setStartFrameState(null);
                    setEndFrameState(null);
                  }}
                  className="form-checkbox h-4 w-4 text-blue-600 rounded border-slate-700 bg-slate-800 focus:ring-blue-500"
                />
                Modo Frame Total
              </label>
              {(startFrameState || endFrameState) && (
                <button 
                  onClick={() => { setStartFrameState(null); setEndFrameState(null); }}
                  className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                >
                  <XCircle size={12} /> LIMPAR FRAMES
                </button>
              )}
            </div>

            {ballAttachedToPlayerId ? (
              <button 
                onClick={() => setBallAttachedToPlayerId(null)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 transition-all text-xs font-bold"
              >
                <XCircle size={14} /> DESCONECTAR BOLA (Jogador: {ballAttachedToPlayerId})
              </button>
            ) : (
              <select
                onChange={(e) => setBallAttachedToPlayerId(e.target.value)}
                value={ballAttachedToPlayerId || ""}
                className="w-full py-2 px-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs"
              >
                <option value="" disabled={ballAttachedToPlayerId !== null}>Conectar Bola ao Jogador</option>
                {boardState.players.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.team === 'A' ? 'Time A' : 'Time B'} - #{p.number}
                  </option>
                ))}
              </select>
            )}

            {boardState.frames.length > 0 && !isTotalFrameMode && (
              <div className="flex gap-1 overflow-x-auto py-1 scrollbar-hide">
                {boardState.frames.map((_: any, i: number) => (
                  <div key={i} className="shrink-0 w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-mono text-slate-500">
                    {i + 1}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Player Management */}
          <div className="glass-panel rounded-2xl p-4 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest">Gerenciar Jogadores</h3>
              <button 
                onClick={resetBoard}
                className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                title="Resetar para o estado inicial"
              >
                <RotateCcw size={12} />
                RESET
              </button>
            </div>
            
            {/* Team A */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-blue-400">Time A (Azul)</span>
                <div className="flex gap-2">
                  <button onClick={() => addPlayer('A')} className="p-1 hover:bg-blue-500/20 rounded text-blue-400 transition-colors" title="Adicionar Jogador">
                    <Users size={14} />
                  </button>
                  <button onClick={() => clearTeam('A')} className="p-1 hover:bg-red-500/20 rounded text-slate-500 hover:text-red-400 transition-colors" title="Remover Todos">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-hide">
                {boardState.players.filter((p: any) => p.team === 'A').map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center bg-slate-800/50 p-1.5 rounded text-xs">
                    <span>#{p.number}</span>
                    <button onClick={() => removePlayer(p.id)} className="text-slate-500 hover:text-red-400">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-800" />

            {/* Team B */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-red-400">Time B (Vermelho)</span>
                <div className="flex gap-2">
                  <button onClick={() => addPlayer('B')} className="p-1 hover:bg-red-500/20 rounded text-red-400 transition-colors" title="Adicionar Jogador">
                    <Users size={14} />
                  </button>
                  <button onClick={() => clearTeam('B')} className="p-1 hover:bg-red-500/20 rounded text-slate-500 hover:text-red-400 transition-colors" title="Remover Todos">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-hide">
                {boardState.players.filter((p: any) => p.team === 'B').map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center bg-slate-800/50 p-1.5 rounded text-xs">
                    <span>#{p.number}</span>
                    <button onClick={() => removePlayer(p.id)} className="text-slate-500 hover:text-red-400">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-4 flex flex-col gap-4">
            <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest">Configurações de Visualização</h3>
            <div className="flex flex-col gap-2">
              <label htmlFor="playerSize" className="text-xs text-slate-400">Tamanho do Jogador: {playerSize}px</label>
              <input
                id="playerSize"
                type="range"
                min="10"
                max="30"
                value={playerSize}
                onChange={(e) => setPlayerSize(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-4 flex-1">
            <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">Estatísticas da Jogada</h3>
            <div className="space-y-4">
              <StatItem label="Distância Média" value="12.4m" />
              <StatItem label="Linhas de Passe" value="8" />
              <StatItem label="Cobertura Defensiva" value="84%" />
            </div>
          </div>
        </aside>

        {/* Center - Tactics Board */}
        <section className="flex-1 glass-panel rounded-3xl overflow-hidden relative shadow-inner">
          <div className="absolute inset-0 court-bg opacity-50" />
          <TacticsBoard
            players={boardState.players}
            ball={boardState.ball}
            drawings={boardState.drawings}
            onUpdate={handleBoardUpdate}
            isAnimating={boardState.isAnimating}
            isSimplified={isSimplified}
            playerSize={playerSize}
            ballAttachedToPlayerId={ballAttachedToPlayerId}
            onDetachBall={() => setBallAttachedToPlayerId(null)}
          />
        </section>

        {/* Right Sidebar - AI Chat */}
        <aside className="w-96 flex flex-col">
          <ChatBot 
            boardState={boardState} 
            onUpdate={handleBoardUpdate}
            onPlayAnimation={playAnimation}
            onSaveTactic={saveTacticWithName}
          />
        </aside>
      </main>

      {/* Help Modal */}
      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />

      {/* Footer / Status Bar */}
      <footer className="h-8 border-t border-slate-800 bg-slate-900/80 px-4 flex items-center justify-between text-[10px] font-mono text-slate-500 uppercase tracking-widest">
        <div className="flex gap-4">
          <span className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Servidor Conectado
          </span>
          <span>Latência: 24ms</span>
        </div>
        <div>
          © 2024 Futsal Tactics Pro • Desenvolvido com Gemini AI
        </div>
      </footer>
    </div>
  );
}

const FormationGroup = ({ label, onApply }: { label: string, onApply: (team: 'A' | 'B') => void }) => (
  <div className="flex flex-col gap-1">
    <span className="text-xs text-slate-400 ml-1">{label}</span>
    <div className="flex gap-1">
      <button 
        onClick={() => onApply('A')}
        className="flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 transition-all"
      >
        TIME 1
      </button>
      <button 
        onClick={() => onApply('B')}
        className="flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 transition-all"
      >
        TIME 2
      </button>
    </div>
  </div>
);

const StatItem = ({ label, value }: { label: string, value: string }) => (
  <div>
    <p className="text-xs text-slate-500">{label}</p>
    <p className="text-lg font-display font-bold text-slate-200">{value}</p>
  </div>
);
