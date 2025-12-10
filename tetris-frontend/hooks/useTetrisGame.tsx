"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type TetrisPiece = {
  shape: number[][];
  color: number;
};

export type GameState = "idle" | "playing" | "paused" | "gameOver";

const TETRIS_PIECES: TetrisPiece[] = [
  {
    shape: [[1, 1, 1, 1]],
    color: 1,
  },
  {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: 2,
  },
  {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
    ],
    color: 3,
  },
  {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    color: 4,
  },
  {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
    ],
    color: 5,
  },
  {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
    ],
    color: 6,
  },
  {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
    ],
    color: 7,
  },
];

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

export interface GameStats {
  score: number;
  lines: number;
  level: number;
  time: number;
}

export function useTetrisGame() {
  const [board, setBoard] = useState<number[][]>(() =>
    Array(BOARD_HEIGHT)
      .fill(0)
      .map(() => Array(BOARD_WIDTH).fill(0))
  );
  const [currentPiece, setCurrentPiece] = useState<TetrisPiece | null>(null);
  const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0 });
  const [nextPiece, setNextPiece] = useState<TetrisPiece | null>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    lines: 0,
    level: 1,
    time: 0,
  });

  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const timeStartRef = useRef<number | null>(null);
  const statsRef = useRef<GameStats>(stats);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  const generateRandomPiece = useCallback((): TetrisPiece => {
    return TETRIS_PIECES[Math.floor(Math.random() * TETRIS_PIECES.length)];
  }, []);

  const rotatePiece = useCallback((piece: TetrisPiece): TetrisPiece => {
    const rows = piece.shape.length;
    const cols = piece.shape[0].length;
    const rotated: number[][] = Array(cols)
      .fill(0)
      .map(() => Array(rows).fill(0));

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        rotated[j][rows - 1 - i] = piece.shape[i][j];
      }
    }

    return { shape: rotated, color: piece.color };
  }, []);

  const isValidPosition = useCallback(
    (
      piece: TetrisPiece,
      pos: { x: number; y: number },
      board: number[][]
    ): boolean => {
      for (let row = 0; row < piece.shape.length; row++) {
        for (let col = 0; col < piece.shape[row].length; col++) {
          if (piece.shape[row][col]) {
            const newX = pos.x + col;
            const newY = pos.y + row;

            if (
              newX < 0 ||
              newX >= BOARD_WIDTH ||
              newY >= BOARD_HEIGHT ||
              (newY >= 0 && board[newY][newX] !== 0)
            ) {
              return false;
            }
          }
        }
      }
      return true;
    },
    []
  );

  const placePiece = useCallback(
    (piece: TetrisPiece, pos: { x: number; y: number }, board: number[][]) => {
      const newBoard = board.map((row) => [...row]);
      for (let row = 0; row < piece.shape.length; row++) {
        for (let col = 0; col < piece.shape[row].length; col++) {
          if (piece.shape[row][col]) {
            const y = pos.y + row;
            const x = pos.x + col;
            if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
              newBoard[y][x] = piece.color;
            }
          }
        }
      }
      return newBoard;
    },
    []
  );

  const clearLines = useCallback((board: number[][]): { newBoard: number[][]; linesCleared: number } => {
    const newBoard: number[][] = [];
    let linesCleared = 0;

    for (let row = board.length - 1; row >= 0; row--) {
      if (board[row].every((cell) => cell !== 0)) {
        linesCleared++;
      } else {
        newBoard.unshift([...board[row]]);
      }
    }

    while (newBoard.length < BOARD_HEIGHT) {
      newBoard.unshift(Array(BOARD_WIDTH).fill(0));
    }

    return { newBoard, linesCleared };
  }, []);

  const movePiece = useCallback(
    (dx: number, dy: number) => {
      if (!currentPiece || gameState !== "playing") return;

      const newPos = {
        x: currentPosition.x + dx,
        y: currentPosition.y + dy,
      };

      if (isValidPosition(currentPiece, newPos, board)) {
        setCurrentPosition(newPos);
        return true;
      }
      return false;
    },
    [currentPiece, currentPosition, board, gameState, isValidPosition]
  );

  const rotateCurrentPiece = useCallback(() => {
    if (!currentPiece || gameState !== "playing") return;

    const rotated = rotatePiece(currentPiece);
    if (isValidPosition(rotated, currentPosition, board)) {
      setCurrentPiece(rotated);
    }
  }, [currentPiece, currentPosition, board, gameState, rotatePiece, isValidPosition]);

  const dropPiece = useCallback(() => {
    if (!currentPiece || gameState !== "playing") return;

    let newY = currentPosition.y;
    while (isValidPosition(currentPiece, { x: currentPosition.x, y: newY + 1 }, board)) {
      newY++;
    }

    setCurrentPosition({ x: currentPosition.x, y: newY });
  }, [currentPiece, currentPosition, board, gameState, isValidPosition]);

  const spawnNewPiece = useCallback(() => {
    const piece = nextPiece || generateRandomPiece();
    const newNextPiece = generateRandomPiece();

    setCurrentPiece(piece);
    setNextPiece(newNextPiece);
    setCurrentPosition({
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(piece.shape[0].length / 2),
      y: 0,
    });

    if (!isValidPosition(piece, { x: Math.floor(BOARD_WIDTH / 2) - Math.floor(piece.shape[0].length / 2), y: 0 }, board)) {
      setGameState("gameOver");
    }
  }, [nextPiece, board, generateRandomPiece, isValidPosition]);

  const updateGame = useCallback(() => {
    if (gameState !== "playing" || !currentPiece) return;

    if (!movePiece(0, 1)) {
      const newBoard = placePiece(currentPiece, currentPosition, board);
      const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);

      setBoard(clearedBoard);

      if (linesCleared > 0) {
        setStats((prev) => {
          const newLines = prev.lines + linesCleared;
          const newLevel = Math.floor(newLines / 10) + 1;
          const lineScores = [0, 100, 300, 500, 800];
          const newScore = prev.score + lineScores[linesCleared] * newLevel;

          return {
            ...prev,
            score: newScore,
            lines: newLines,
            level: newLevel,
          };
        });
      }

      spawnNewPiece();
    }
  }, [gameState, currentPiece, currentPosition, board, movePiece, placePiece, clearLines, spawnNewPiece]);

  const startGame = useCallback(() => {
    setBoard(Array(BOARD_HEIGHT).fill(0).map(() => Array(BOARD_WIDTH).fill(0)));
    setStats({ score: 0, lines: 0, level: 1, time: 0 });
    setGameState("playing");
    timeStartRef.current = Date.now();
    spawnNewPiece();
  }, [spawnNewPiece]);

  const pauseGame = useCallback(() => {
    if (gameState === "playing") {
      setGameState("paused");
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    } else if (gameState === "paused") {
      setGameState("playing");
      timeStartRef.current = Date.now() - (statsRef.current.time * 1000);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState === "playing") {
      const speed = Math.max(100, 1000 - (stats.level - 1) * 100);
      gameLoopRef.current = setInterval(() => {
        updateGame();
      }, speed);

      const timeInterval = setInterval(() => {
        if (timeStartRef.current) {
          setStats((prev) => ({
            ...prev,
            time: Math.floor((Date.now() - timeStartRef.current!) / 1000),
          }));
        }
      }, 1000);

      return () => {
        if (gameLoopRef.current) {
          clearInterval(gameLoopRef.current);
        }
        clearInterval(timeInterval);
      };
    } else {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    }
  }, [gameState, stats.level, updateGame]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameState !== "playing") return;

      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          e.preventDefault();
          movePiece(-1, 0);
          break;
        case "ArrowRight":
        case "d":
        case "D":
          e.preventDefault();
          movePiece(1, 0);
          break;
        case "ArrowDown":
        case "s":
        case "S":
          e.preventDefault();
          movePiece(0, 1);
          break;
        case "ArrowUp":
        case " ":
        case "w":
        case "W":
          e.preventDefault();
          rotateCurrentPiece();
          break;
        case "p":
        case "P":
          e.preventDefault();
          pauseGame();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [gameState, movePiece, rotateCurrentPiece, pauseGame]);

  return {
    board,
    currentPiece,
    currentPosition,
    nextPiece,
    gameState,
    stats,
    startGame,
    pauseGame,
    movePiece,
    rotateCurrentPiece,
    dropPiece,
  };
}

