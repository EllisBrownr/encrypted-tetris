"use client";

import { useEffect, useRef } from "react";
import type { TetrisPiece } from "@/hooks/useTetrisGame";

interface GameCanvasProps {
  board: number[][];
  currentPiece: TetrisPiece | null;
  currentPosition: { x: number; y: number };
  nextPiece: TetrisPiece | null;
}

const CELL_SIZE = 30;
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

export function GameCanvas({
  board,
  currentPiece,
  currentPosition,
  nextPiece,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { 
      willReadFrequently: false,
      alpha: false 
    });
    if (!ctx) return;

    // NES-style pixelated rendering
    ctx.imageSmoothingEnabled = false;
    ctx.imageSmoothingQuality = "low";

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // NES-style grid: thicker borders, pixelated
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.fillStyle = "#FFFFFF";

    // Draw grid background
    for (let row = 0; row < BOARD_HEIGHT; row++) {
      for (let col = 0; col < BOARD_WIDTH; col++) {
        const x = col * CELL_SIZE;
        const y = row * CELL_SIZE;

        // Draw cell background (e-ink yellowish-green)
        ctx.fillStyle = "#F5F4E8";
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        
        // Draw grid lines (pixelated)
        ctx.strokeStyle = "#000000";
        ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);

        // Draw placed blocks (pixelated, solid black)
        if (board[row][col] !== 0) {
          ctx.fillStyle = "#000000";
          ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
          // Add pixelated border effect
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        }
      }
    }

    // Draw current piece (pixelated)
    if (currentPiece) {
      ctx.fillStyle = "#000000";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;

      for (let row = 0; row < currentPiece.shape.length; row++) {
        for (let col = 0; col < currentPiece.shape[row].length; col++) {
          if (currentPiece.shape[row][col]) {
            const x = (currentPosition.x + col) * CELL_SIZE;
            const y = (currentPosition.y + row) * CELL_SIZE;

            // Solid black block with pixelated border
            ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
            ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
          }
        }
      }
    }
  }, [board, currentPiece, currentPosition]);

  useEffect(() => {
    const canvas = nextCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { 
      willReadFrequently: false,
      alpha: false 
    });
    if (!ctx) return;

    // NES-style pixelated rendering
    ctx.imageSmoothingEnabled = false;
    ctx.imageSmoothingQuality = "low";

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#F5F4E8"; /* E-ink background (yellowish-green) */
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (nextPiece) {
      const cellSize = 20;
      const offsetX = (canvas.width - nextPiece.shape[0].length * cellSize) / 2;
      const offsetY = (canvas.height - nextPiece.shape.length * cellSize) / 2;

      for (let row = 0; row < nextPiece.shape.length; row++) {
        for (let col = 0; col < nextPiece.shape[row].length; col++) {
          if (nextPiece.shape[row][col]) {
            const x = offsetX + col * cellSize;
            const y = offsetY + row * cellSize;

            // Pixelated block
            ctx.fillStyle = "#000000";
            ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
          }
        }
      }
    }
  }, [nextPiece]);

  return (
    <div className="flex gap-8">
      <div>
        <canvas
          ref={canvasRef}
          width={BOARD_WIDTH * CELL_SIZE}
          height={BOARD_HEIGHT * CELL_SIZE}
          className="border-4 border-eink-text bg-eink-background"
          style={{ imageRendering: "pixelated" }}
        />
      </div>
      <div>
        <div className="mb-4 font-pixel text-xs text-eink-text">
          NEXT:
        </div>
        <canvas
          ref={nextCanvasRef}
          width={120}
          height={120}
          className="border-4 border-eink-text bg-eink-background"
          style={{ imageRendering: "pixelated" }}
        />
      </div>
    </div>
  );
}

