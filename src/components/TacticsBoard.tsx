import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Circle, Line, Text, Group, Rect, Image as KonvaImage } from 'react-konva';
import { LucideIcon, MousePointer2, Pencil, Eraser, Trash2, RotateCcw } from 'lucide-react';
import katrinaLogo from '../assets/katrina_logo.png';

interface Player {
  id: string;
  x: number;
  y: number;
  color: string;
  number: string;
  team: 'A' | 'B';
  scale?: number;
}

interface Ball {
  x: number;
  y: number;
}

interface Drawing {
  points: number[];
  color: string;
  id: string;
}

interface TacticsBoardProps {
  players: Player[];
  ball: Ball;
  drawings: Drawing[];
  onUpdate: (state: any) => void;
  isAnimating?: boolean;
  isSimplified?: boolean;
  playerSize: number; // Nova prop para o tamanho do jogador
  ballAttachedToPlayerId: string | null; // Nova prop para conectar a bola a um jogador
  onDetachBall: () => void;
}

export const TacticsBoard: React.FC<TacticsBoardProps> = ({ players, ball, drawings, onUpdate, isAnimating, isSimplified, playerSize, ballAttachedToPlayerId, onDetachBall }) => {
  const [tool, setTool] = useState<'pointer' | 'pencil' | 'eraser'>('pointer');
  const [isDrawing, setIsDrawing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [katrinaImage, setKatrinaImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const image = new window.Image();
    image.src = katrinaLogo;
    image.onload = () => {
      setKatrinaImage(image);
    };
  }, []);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleMouseDown = (e: any) => {
    if (tool === 'pointer' || isAnimating) return;

    const stage = e.target.getStage();
    if (!stage) return;

    setIsDrawing(true);
    const pos = stage.getPointerPosition();
    if (!pos) return;

    const newDrawing = {
      id: Math.random().toString(36).slice(2, 11),
      points: [pos.x, pos.y],
      color: tool === 'eraser' ? '#0f172a' : '#fbbf24',
    };
    onUpdate({ drawings: [...drawings, newDrawing] });
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing || tool === 'pointer' || isAnimating) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const point = stage.getPointerPosition();
    if (!point) return;

    const lastDrawing = drawings[drawings.length - 1];
    
    if (lastDrawing) {
      const newDrawings = drawings.slice(0, -1);
      newDrawings.push({
        ...lastDrawing,
        points: lastDrawing.points.concat([point.x, point.y]),
      });
      onUpdate({ drawings: newDrawings });
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleDragEnd = (id: string, e: any) => {
    if (isAnimating) return;
    const { x, y } = e.target.position();
    // Convert absolute pixels to percentages
    const xP = x / dimensions.width;
    const yP = y / dimensions.height;

    if (id === 'ball') {
      onUpdate({ ball: { x: xP, y: yP } });
    } else {
      const newPlayers = players.map(p => p.id === id ? { ...p, x: xP, y: yP } : p);
      onUpdate({ players: newPlayers });
    }
  };

  const clearDrawings = () => onUpdate({ drawings: [] });

  return (
    <div className="relative w-full h-full flex flex-col" ref={containerRef}>
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex gap-2 p-2 glass-panel rounded-xl shadow-2xl">
        <ToolButton active={tool === 'pointer'} onClick={() => setTool('pointer')} icon={MousePointer2} label="Mover" disabled={isAnimating} />
        <ToolButton active={tool === 'pencil'} onClick={() => setTool('pencil')} icon={Pencil} label="Desenhar" disabled={isAnimating} />
        <ToolButton active={tool === 'eraser'} onClick={() => setTool('eraser')} icon={Eraser} label="Borracha" disabled={isAnimating} />
        <div className="w-px h-8 bg-slate-700 mx-1" />
        <ToolButton active={false} onClick={clearDrawings} icon={Trash2} label="Limpar" disabled={isAnimating} />
      </div>

      {isAnimating && (
        <div className="absolute top-4 right-4 z-10 px-3 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-full animate-pulse flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white" />
          REPRODUZINDO JOGADA
        </div>
      )}

      <Stage
        width={dimensions.width}
        height={dimensions.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={isAnimating ? "cursor-not-allowed" : "cursor-crosshair"}
      >
        <Layer>
          {/* Court Lines */}
          <CourtLines width={dimensions.width} height={dimensions.height} subtle={isSimplified} />
          
          {/* Drawings */}
          {!isSimplified && drawings.map((drawing) => (
            <Line
              key={drawing.id}
              points={drawing.points}
              stroke={drawing.color}
              strokeWidth={drawing.color === '#0f172a' ? 20 : 3}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
            />
          ))}

          {/* Ball */}
          <Group
            x={ballAttachedToPlayerId ? (players.find(p => p.id === ballAttachedToPlayerId)?.x * dimensions.width) + (playerSize * 0.8) : ball.x * dimensions.width}
            y={ballAttachedToPlayerId ? (players.find(p => p.id === ballAttachedToPlayerId)?.y * dimensions.height) + (playerSize * 0.8) : ball.y * dimensions.height}
            draggable={tool === 'pointer' && !isAnimating}
            onDragStart={() => {
              if (ballAttachedToPlayerId) {
                onDetachBall();
              }
            }}
            onDragEnd={(e) => handleDragEnd('ball', e)}
          >
            <Circle radius={isSimplified ? playerSize * 0.6 : playerSize * 0.8} fill="#fff" stroke="#000" strokeWidth={isSimplified ? 1 : 2} />
            {!isSimplified && (
              <>
                <Circle radius={playerSize * 0.4} fill="#000" x={-playerSize * 0.3} y={-playerSize * 0.3} />
                <Circle radius={playerSize * 0.4} fill="#000" x={playerSize * 0.3} y={playerSize * 0.3} />
              </>
            )}
          </Group>

          {/* Players */}
          {players.map((player) => (
            <Group
              key={player.id}
              x={player.x * dimensions.width}
              y={player.y * dimensions.height}
              scaleX={player.scale || 1}
              scaleY={player.scale || 1}
              draggable={tool === 'pointer' && !isAnimating}
              onDragEnd={(e) => handleDragEnd(player.id, e)}
            >
              {!isSimplified && (
                <Circle
                  radius={playerSize}
                  fill={player.color}
                  stroke="#fff"
                  strokeWidth={2}
                  shadowBlur={10}
                  shadowOpacity={0.3}
                />
              )}
              {player.team === 'A' && katrinaImage ? (
                <KonvaImage
                  image={katrinaImage}
                  x={-playerSize * 0.8}
                  y={-playerSize * 0.8}
                  width={playerSize * 1.6}
                  height={playerSize * 1.6}
                />
              ) : (
                <Text
                  text={player.number}
                  fontSize={isSimplified ? playerSize * 0.8 : playerSize * 0.6}
                  fontStyle="bold"
                  fill={isSimplified ? player.color : "#fff"}
                  align="center"
                  verticalAlign="middle"
                  width={playerSize * 2}
                  height={playerSize * 2}
                  offsetX={playerSize}
                  offsetY={playerSize}
                />
              )}
            </Group>
          ))}
        </Layer>
      </Stage>
    </div>
  );
};

const ToolButton = ({ active, onClick, icon: Icon, label, disabled }: { active: boolean, onClick: () => void, icon: LucideIcon, label: string, disabled?: boolean }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`p-2 rounded-lg transition-all flex items-center gap-2 ${
      active ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'
    } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
    title={label}
  >
    <Icon size={20} />
  </button>
);

const CourtLines = ({ width, height, subtle }: { width: number, height: number, subtle?: boolean }) => {
  const padding = 20;
  const courtWidth = width - padding * 2;
  const courtHeight = height - padding * 2;
  const centerX = width / 2;
  const centerY = height / 2;

  const strokeColor = "#fff";
  const opacity = subtle ? 0.15 : 0.5;

  return (
    <Group>
      {/* Outer Boundary */}
      <Rect
        x={padding}
        y={padding}
        width={courtWidth}
        height={courtHeight}
        stroke={strokeColor}
        strokeWidth={2}
        opacity={opacity}
      />
      {/* Center Line */}
      <Line
        points={[centerX, padding, centerX, height - padding]}
        stroke={strokeColor}
        strokeWidth={2}
        opacity={opacity}
      />
      {/* Center Circle */}
      <Circle
        x={centerX}
        y={centerY}
        radius={courtHeight * 0.15}
        stroke={strokeColor}
        strokeWidth={2}
        opacity={opacity}
      />
      <Circle
        x={centerX}
        y={centerY}
        radius={3}
        fill={strokeColor}
        opacity={opacity}
      />
      {/* Penalty Areas (Simplified) */}
      {/* Left */}
      <Line
        points={[padding, centerY - 60, padding + 80, centerY - 60, padding + 80, centerY + 60, padding, centerY + 60]}
        stroke={strokeColor}
        strokeWidth={2}
        opacity={opacity}
      />
      {/* Right */}
      <Line
        points={[width - padding, centerY - 60, width - padding - 80, centerY - 60, width - padding - 80, centerY + 60, width - padding, centerY + 60]}
        stroke={strokeColor}
        strokeWidth={2}
        opacity={opacity}
      />
    </Group>
  );
};
