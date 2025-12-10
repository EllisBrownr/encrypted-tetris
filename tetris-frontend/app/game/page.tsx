"use client";

import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { GameCanvas } from "@/components/GameCanvas";
import { useTetrisGame } from "@/hooks/useTetrisGame";
import { useTetrisContract, type GameResult } from "@/hooks/useTetrisContract";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { useFhevm } from "@/hooks/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";

export default function GamePage() {
  const {
    isConnected,
    connect,
    provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    initialMockChains,
  } = useMetaMaskEthersSigner();
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const { instance: fhevmInstance } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  const {
    board,
    currentPiece,
    currentPosition,
    nextPiece,
    gameState,
    stats,
    startGame,
    pauseGame,
    dropPiece,
  } = useTetrisGame();

  const {
    isDeployed,
    canSubmit,
    isSubmitting,
    message: contractMessage,
    submitGameResult,
  } = useTetrisContract({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const handleSubmitScore = async () => {
    if (!canSubmit || gameState !== "gameOver") return;

    const gameResult: GameResult = {
      score: stats.score,
      lines: stats.lines,
      level: stats.level,
      time: stats.time,
    };

    await submitGameResult(gameResult);
    setShowSubmitModal(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-eink-background">
        <Navigation />
        <main className="pt-16">
          <div className="max-w-7xl mx-auto px-4 py-8 text-center">
            <p className="font-pixel text-xs text-eink-text mb-4">
              CONNECT WALLET TO PLAY
            </p>
            <button
              onClick={connect}
              className="px-6 py-3 border-3 border-eink-text font-pixel text-xs text-eink-text hover:bg-eink-backgroundAlt transition-colors"
            >
              CONNECT
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (isDeployed === false) {
    return (
      <div className="min-h-screen bg-eink-background">
        <Navigation />
        <main className="pt-16">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <p className="font-pixel text-xs text-eink-text">
              CONTRACT NOT DEPLOYED. SWITCH TO SEPOLIA OR LOCALHOST.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-eink-background">
      <Navigation />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-pixel text-eink-text mb-8">
            GAME
          </h1>

          <div className="flex gap-8">
            <div>
              <GameCanvas
                board={board}
                currentPiece={currentPiece}
                currentPosition={currentPosition}
                nextPiece={nextPiece}
              />
            </div>

            <div className="flex-1">
              <div className="bg-eink-background border-4 border-eink-text p-6 mb-6">
                <h2 className="font-pixel text-xs text-eink-text mb-4">
                  STATS
                </h2>
                <div className="space-y-3 font-pixel text-xs">
                  <div className="flex justify-between border-b-2 border-eink-text pb-2">
                    <span className="text-eink-text">SCORE:</span>
                    <span className="text-eink-text">{stats.score.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b-2 border-eink-text pb-2">
                    <span className="text-eink-text">LINES:</span>
                    <span className="text-eink-text">{stats.lines}</span>
                  </div>
                  <div className="flex justify-between border-b-2 border-eink-text pb-2">
                    <span className="text-eink-text">LEVEL:</span>
                    <span className="text-eink-text">{stats.level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-eink-text">TIME:</span>
                    <span className="text-eink-text">{formatTime(stats.time)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 mb-6">
                {gameState === "idle" || gameState === "gameOver" ? (
                  <button
                    onClick={startGame}
                    className="px-6 py-3 border-3 border-eink-text font-pixel text-xs text-eink-text hover:bg-eink-backgroundAlt transition-colors"
                  >
                    {gameState === "gameOver" ? "NEW GAME" : "START"}
                  </button>
                ) : (
                  <button
                    onClick={pauseGame}
                    className="px-6 py-3 border-3 border-eink-text font-pixel text-xs text-eink-text hover:bg-eink-backgroundAlt transition-colors"
                  >
                    {gameState === "paused" ? "RESUME" : "PAUSE"}
                  </button>
                )}

                {gameState === "playing" && (
                  <button
                    onClick={dropPiece}
                    className="px-6 py-3 border-3 border-eink-text font-pixel text-xs text-eink-text hover:bg-eink-backgroundAlt transition-colors"
                  >
                    DROP
                  </button>
                )}

                {gameState === "gameOver" && canSubmit && (
                  <button
                    onClick={() => setShowSubmitModal(true)}
                    disabled={isSubmitting}
                    className="px-6 py-3 border-3 border-eink-text font-pixel text-xs text-eink-text hover:bg-eink-backgroundAlt transition-colors disabled:bg-eink-backgroundAlt disabled:text-eink-textDisabled disabled:border-eink-border disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "SUBMIT..." : "SUBMIT"}
                  </button>
                )}
              </div>

              {contractMessage && (
                <div className="mb-6 p-4 border-2 border-eink-border bg-eink-backgroundAlt">
                  <p className="font-mono text-sm text-eink-textSecondary">
                    {contractMessage}
                  </p>
                </div>
              )}

              <div className="bg-eink-background border-4 border-eink-text p-6">
                <h2 className="font-pixel text-xs text-eink-text mb-4">
                  CONTROLS
                </h2>
                <div className="space-y-2 font-pixel text-xs text-eink-text">
                  <div>← → / A D : MOVE</div>
                  <div>↓ / S : DROP</div>
                  <div>↑ / W / SPACE : ROTATE</div>
                  <div>P : PAUSE</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showSubmitModal && (
        <div className="fixed inset-0 bg-eink-background border-4 border-eink-text flex items-center justify-center z-50">
          <div className="bg-eink-background border-4 border-eink-text p-8 max-w-md">
            <h2 className="font-pixel text-xs text-eink-text mb-4">
              SUBMIT SCORE?
            </h2>
            <div className="space-y-3 font-pixel text-xs mb-6">
              <div className="flex justify-between border-b-2 border-eink-text pb-2">
                <span className="text-eink-text">SCORE:</span>
                <span className="text-eink-text">{stats.score.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b-2 border-eink-text pb-2">
                <span className="text-eink-text">LINES:</span>
                <span className="text-eink-text">{stats.lines}</span>
              </div>
              <div className="flex justify-between border-b-2 border-eink-text pb-2">
                <span className="text-eink-text">LEVEL:</span>
                <span className="text-eink-text">{stats.level}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-eink-text">TIME:</span>
                <span className="text-eink-text">{formatTime(stats.time)}</span>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 px-4 py-2 border-3 border-eink-text font-pixel text-xs text-eink-text hover:bg-eink-backgroundAlt transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={handleSubmitScore}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border-3 border-eink-text font-pixel text-xs text-eink-text hover:bg-eink-backgroundAlt transition-colors disabled:bg-eink-backgroundAlt disabled:text-eink-textDisabled disabled:border-eink-border"
              >
                {isSubmitting ? "SUBMIT..." : "SUBMIT"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
