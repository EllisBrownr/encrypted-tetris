"use client";

import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";

export default function HomePage() {
  const { isConnected } = useMetaMaskEthersSigner();

  return (
    <div className="min-h-screen bg-eink-background">
      <Navigation />
      <main className="pt-16">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-pixel text-eink-text mb-6">
              FHEVM TETRIS
            </h1>
            <div className="w-48 h-2 bg-eink-text mx-auto mb-8"></div>
            <p className="text-sm font-pixel text-eink-text mb-12">
              PLAY TETRIS WITH PRIVACY
            </p>

            <div className="flex justify-center gap-4 mb-16">
              <Link
                href={isConnected ? "/game" : "#"}
                onClick={(e) => {
                  if (!isConnected) {
                    e.preventDefault();
                    alert("Please connect your wallet first");
                  }
                }}
                className="px-8 py-4 border-3 border-eink-text font-pixel text-xs text-eink-text hover:bg-eink-backgroundAlt transition-colors"
              >
                START GAME
              </Link>
              <Link
                href="/leaderboard"
                className="px-8 py-4 border-3 border-eink-text font-pixel text-xs text-eink-text hover:bg-eink-backgroundAlt transition-colors"
              >
                LEADERBOARD
              </Link>
            </div>

            <div className="text-left max-w-2xl mx-auto space-y-4 mb-12 border-4 border-eink-text p-6 bg-eink-background">
              <h2 className="text-sm font-pixel text-eink-text mb-6">
                FEATURES:
              </h2>
              <ul className="space-y-3 font-pixel text-xs text-eink-text">
                <li className="flex items-start">
                  <span className="mr-3 text-eink-text">■</span>
                  <span>ENCRYPTED SCORE STORAGE</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 text-eink-text">■</span>
                  <span>PRIVACY-PRESERVING LEADERBOARD</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 text-eink-text">■</span>
                  <span>ON-CHAIN VERIFICATION</span>
                </li>
              </ul>
            </div>

            <p className="text-xs font-pixel text-eink-text">
              POWERED BY FHEVM
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

