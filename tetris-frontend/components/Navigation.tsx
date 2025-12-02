"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";

export function Navigation() {
  const pathname = usePathname();
  const { isConnected, accounts, chainId, connect } = useMetaMaskEthersSigner();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getChainName = (chainId?: number) => {
    if (chainId === 31337) return "Hardhat";
    if (chainId === 11155111) return "Sepolia";
    return chainId ? `Chain ${chainId}` : "Unknown";
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-20 bg-eink-background border-b-4 border-eink-text z-50">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-lg font-pixel text-eink-text hover:text-eink-textSecondary"
          >
            FHEVM TETRIS
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/game"
              className={`font-pixel text-xs px-3 py-2 border-2 border-eink-text transition-colors ${
                pathname === "/game"
                  ? "bg-eink-text text-eink-background"
                  : "bg-eink-background text-eink-text hover:bg-eink-backgroundAlt"
              }`}
            >
              GAME
            </Link>
            <Link
              href="/leaderboard"
              className={`font-pixel text-xs px-3 py-2 border-2 border-eink-text transition-colors ${
                pathname === "/leaderboard"
                  ? "bg-eink-text text-eink-background"
                  : "bg-eink-background text-eink-text hover:bg-eink-backgroundAlt"
              }`}
            >
              LEADER
            </Link>
            <Link
              href="/records"
              className={`font-pixel text-xs px-3 py-2 border-2 border-eink-text transition-colors ${
                pathname === "/records"
                  ? "bg-eink-text text-eink-background"
                  : "bg-eink-background text-eink-text hover:bg-eink-backgroundAlt"
              }`}
            >
              RECORDS
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isConnected && accounts && accounts.length > 0 ? (
            <div className="flex items-center gap-2 font-pixel text-xs">
              <span className="text-eink-text">
                {formatAddress(accounts[0])}
              </span>
              <span className="text-eink-text">|</span>
              <span className="text-eink-text">
                {getChainName(chainId)}
              </span>
            </div>
          ) : (
            <button
              onClick={connect}
              className="px-4 py-2 border-3 border-eink-text font-pixel text-xs text-eink-text hover:bg-eink-backgroundAlt transition-colors"
            >
              CONNECT
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

