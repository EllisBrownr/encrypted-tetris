"use client";

import { useState, useEffect, useMemo } from "react";
import { Navigation } from "@/components/Navigation";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { useFhevm } from "@/hooks/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useTetrisContract } from "@/hooks/useTetrisContract";
import { ethers } from "ethers";
import { FHETetrisABI } from "@/abi/FHETetrisABI";
import { FHETetrisAddresses } from "@/abi/FHETetrisAddresses";

type LeaderboardEntry = {
  rank: number;
  address: string;
  score: string | number;
  lines: string | number;
  level: string | number;
  isDecrypted: boolean;
};

export default function LeaderboardPage() {
  const {
    isConnected,
    accounts,
    chainId,
    ethersReadonlyProvider,
    ethersSigner,
    sameChain,
    sameSigner,
    provider,
  } = useMetaMaskEthersSigner();
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  
  // Memoize initialMockChains to prevent unnecessary re-renders
  const initialMockChains = useMemo(
    () => ({ 31337: "http://localhost:8545" }),
    []
  );
  
  const { instance: fhevmInstance } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  const { decryptPlayerData } = useTetrisContract({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [message, setMessage] = useState("");

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  useEffect(() => {
    const loadLeaderboard = async () => {
      if (!chainId || !ethersReadonlyProvider) {
        setIsLoading(false);
        return;
      }

      const entry =
        FHETetrisAddresses[chainId.toString() as keyof typeof FHETetrisAddresses];

      if (!("address" in entry) || entry.address === ethers.ZeroAddress) {
        setMessage("Contract not deployed on this network");
        setIsLoading(false);
        return;
      }

      try {
        const contract = new ethers.Contract(
          entry.address,
          FHETetrisABI.abi,
          ethersReadonlyProvider
        );

        const topPlayers = await contract.getTopPlayers(20);
        const entries: LeaderboardEntry[] = [];

        for (let i = 0; i < topPlayers.length; i++) {
          entries.push({
            rank: i + 1,
            address: topPlayers[i],
            score: "****",
            lines: "****",
            level: "***",
            isDecrypted: false,
          });
        }

        setLeaderboard(entries);
      } catch (error) {
        setMessage(
          `Failed to load leaderboard: ${error instanceof Error ? error.message : String(error)}`
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadLeaderboard();
  }, [chainId, ethersReadonlyProvider]);

  const handleDecryptMyScore = async () => {
    if (!isConnected || !accounts || accounts.length === 0 || !decryptPlayerData) {
      setMessage("Please connect wallet to decrypt your score");
      return;
    }

    setIsDecrypting(true);
    setMessage("Decrypting your score...");

    try {
      const result = await decryptPlayerData(accounts[0] as `0x${string}`);

      if (result) {
        setLeaderboard((prev) =>
          prev.map((entry) => {
            if (entry.address.toLowerCase() === accounts[0].toLowerCase()) {
              return {
                ...entry,
                score: result.score,
                lines: result.lines,
                level: result.level,
                isDecrypted: true,
              };
            }
            return entry;
          })
        );
        setMessage("Score decrypted successfully!");
      } else {
        setMessage("Failed to decrypt score");
      }
    } catch (error) {
      setMessage(
        `Decryption failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsDecrypting(false);
    }
  };

  const myRank = leaderboard.findIndex(
    (entry) => accounts && entry.address.toLowerCase() === accounts[0]?.toLowerCase()
  );

  return (
    <div className="min-h-screen bg-eink-background">
      <Navigation />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-pixel text-eink-text mb-8">
            LEADERBOARD
          </h1>

          {myRank >= 0 && (
            <div className="mb-6 p-4 border-4 border-eink-text bg-eink-background">
              <p className="font-pixel text-xs text-eink-text">
                YOUR RANK: #{myRank + 1}
              </p>
            </div>
          )}

          <div className="mb-6 flex gap-4">
            {isConnected && accounts && accounts.length > 0 && (
              <button
                onClick={handleDecryptMyScore}
                disabled={isDecrypting}
                className="px-6 py-3 border-3 border-eink-text font-pixel text-xs text-eink-text hover:bg-eink-backgroundAlt transition-colors disabled:bg-eink-backgroundAlt disabled:text-eink-textDisabled disabled:border-eink-border"
              >
                {isDecrypting ? "DECRYPT..." : "DECRYPT"}
              </button>
            )}
          </div>

          {message && (
            <div className="mb-6 p-4 border-4 border-eink-text bg-eink-background">
              <p className="font-pixel text-xs text-eink-text">
                {message.toUpperCase()}
              </p>
            </div>
          )}

          {isLoading ? (
            <div className="p-8 border-4 border-eink-text bg-eink-background">
              <p className="font-pixel text-xs text-eink-text">LOADING...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="p-8 border-4 border-eink-text bg-eink-background">
              <p className="font-pixel text-xs text-eink-text">
                NO DATA
              </p>
            </div>
          ) : (
            <div className="border-4 border-eink-text">
              <table className="w-full font-pixel text-xs">
                <thead>
                  <tr className="border-b-4 border-eink-text bg-eink-background">
                    <th className="p-4 text-left text-eink-text">RANK</th>
                    <th className="p-4 text-left text-eink-text">ADDRESS</th>
                    <th className="p-4 text-left text-eink-text">SCORE</th>
                    <th className="p-4 text-left text-eink-text">LINES</th>
                    <th className="p-4 text-left text-eink-text">LEVEL</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, index) => {
                    const isMyEntry =
                      accounts &&
                      entry.address.toLowerCase() === accounts[0]?.toLowerCase();
                    return (
                      <tr
                        key={entry.address}
                        className={`border-b-2 border-eink-text ${
                          index % 2 === 0 ? "bg-eink-background" : "bg-eink-backgroundAlt"
                        } ${isMyEntry ? "border-l-4 border-l-eink-text" : ""}`}
                      >
                        <td className="p-4 text-eink-text">#{entry.rank}</td>
                        <td className="p-4 text-eink-text">
                          {formatAddress(entry.address)}
                        </td>
                        <td className="p-4 text-eink-text">
                          {entry.isDecrypted ? entry.score : "****"}
                        </td>
                        <td className="p-4 text-eink-text">
                          {entry.isDecrypted ? entry.lines : "****"}
                        </td>
                        <td className="p-4 text-eink-text">
                          {entry.isDecrypted ? entry.level : "***"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
