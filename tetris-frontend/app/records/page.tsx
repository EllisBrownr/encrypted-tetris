"use client";

import { useState, useEffect, useMemo } from "react";
import { Navigation } from "@/components/Navigation";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { useFhevm } from "@/hooks/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useTetrisContract } from "@/hooks/useTetrisContract";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { ethers } from "ethers";
import { FHETetrisABI } from "@/abi/FHETetrisABI";
import { FHETetrisAddresses } from "@/abi/FHETetrisAddresses";

type PlayerStats = {
  bestScore: string | number;
  totalGames: string | number;
  totalLines: string | number;
  bestLevel: string | number;
  averageScore: string | number;
  isDecrypted: boolean;
};

type GameHistoryEntry = {
  date: string;
  score: string | number;
  lines: string | number;
  level: string | number;
  time: string;
  isDecrypted: boolean;
};

export default function RecordsPage() {
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

  const [stats, setStats] = useState<PlayerStats>({
    bestScore: "****",
    totalGames: "****",
    totalLines: "****",
    bestLevel: "***",
    averageScore: "****",
    isDecrypted: false,
  });

  const [gameHistory, setGameHistory] = useState<GameHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadRecords = async () => {
      if (!isConnected || !accounts || accounts.length === 0) {
        setIsLoading(false);
        return;
      }

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

        const [bestScoreHandle, totalGamesHandle, totalLinesHandle, bestLevelHandle] = await Promise.all([
          contract.getPlayerBestScore(accounts[0]),
          contract.getPlayerTotalGames(accounts[0]),
          contract.getPlayerTotalLines(accounts[0]),
          contract.getPlayerBestLevel(accounts[0]),
        ]);

        // Check if handles are initialized (not ZeroHash)
        const hasBestScore = bestScoreHandle !== ethers.ZeroHash;
        const hasTotalGames = totalGamesHandle !== ethers.ZeroHash;
        const hasTotalLines = totalLinesHandle !== ethers.ZeroHash;
        const hasBestLevel = bestLevelHandle !== ethers.ZeroHash;

        setStats({
          bestScore: hasBestScore ? "****" : 0,
          totalGames: hasTotalGames ? "****" : 0,
          totalLines: hasTotalLines ? "****" : 0,
          bestLevel: hasBestLevel ? "***" : 0,
          averageScore: "****",
          isDecrypted: false,
        });

        try {
          const historyCount = await contract.getPlayerGameHistoryCount(accounts[0]);
          const count = Number(historyCount) > 50 ? 50 : Number(historyCount);
          const historyEntries: GameHistoryEntry[] = [];
          
          for (let i = 0; i < count; i++) {
            try {
              const record = await contract.getPlayerGameRecord(accounts[0], i);
              const timestamp = record[0];
              const time = record[4];
              historyEntries.push({
                date: new Date(Number(timestamp) * 1000).toLocaleDateString(),
                score: "****",
                lines: "****",
                level: "***",
                time: `${Math.floor(Number(time) / 60)}:${String(Number(time) % 60).padStart(2, "0")}`,
                isDecrypted: false,
              });
            } catch (error) {
              console.warn(`Failed to load game record ${i}:`, error);
            }
          }
          
          setGameHistory(historyEntries);
        } catch (error) {
          console.warn("Failed to load game history:", error);
          setGameHistory([]);
        }
      } catch (error) {
        setMessage(
          `Failed to load records: ${error instanceof Error ? error.message : String(error)}`
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadRecords();
  }, [isConnected, accounts, chainId, ethersReadonlyProvider]);

  const handleDecryptAll = async () => {
    if (!isConnected || !accounts || accounts.length === 0 || !decryptPlayerData) {
      setMessage("Please connect wallet to decrypt your records");
      return;
    }

    setIsDecrypting(true);
    setMessage("Decrypting all data...");

    try {
      const result = await decryptPlayerData(accounts[0] as `0x${string}`);

      if (result) {
        if (!chainId || !ethersReadonlyProvider || !fhevmInstance || !ethersSigner) {
          setMessage("Missing required providers for decryption");
          return;
        }

        const entry =
          FHETetrisAddresses[chainId.toString() as keyof typeof FHETetrisAddresses];

        if (!("address" in entry) || entry.address === ethers.ZeroAddress) {
          setMessage("Contract not deployed on this network");
          return;
        }

        // Also decrypt totalGames - we need to get it from the contract
        const contract = new ethers.Contract(
          entry.address,
          FHETetrisABI.abi,
          ethersReadonlyProvider
        );
        
        const totalGamesHandle = await contract.getPlayerTotalGames(accounts[0] as `0x${string}`);
        
        // Decrypt totalGames if it exists
        let decryptedTotalGames: number = 0;
        if (totalGamesHandle !== ethers.ZeroHash && fhevmInstance) {
          try {
            // Create a separate decryption for totalGames
            const signature = await FhevmDecryptionSignature.loadOrSign(
              fhevmInstance,
              [entry.address],
              ethersSigner,
              fhevmDecryptionSignatureStorage
            );
            
            if (signature) {
              const totalGamesDecrypted = await fhevmInstance.userDecrypt(
                [{ handle: totalGamesHandle, contractAddress: entry.address }],
                signature.privateKey,
                signature.publicKey,
                signature.signature,
                signature.contractAddresses,
                signature.userAddress,
                signature.startTimestamp,
                signature.durationDays
              );
              
              decryptedTotalGames = Number(totalGamesDecrypted[totalGamesHandle]);
            }
          } catch (error) {
            console.warn("Failed to decrypt totalGames:", error);
            // If decryption fails, keep the original value (might be "****" or a number)
            if (typeof stats.totalGames === "number") {
              decryptedTotalGames = stats.totalGames;
            }
          }
        } else if (typeof stats.totalGames === "number") {
          // If handle is ZeroHash but we have a number, use it
          decryptedTotalGames = stats.totalGames;
        }
        
        // Calculate average score: bestScore / totalGames (if totalGames > 0)
        const averageScore = decryptedTotalGames > 0 
          ? Math.floor(result.score / decryptedTotalGames) 
          : 0;
        
        setStats({
          bestScore: result.score,
          totalGames: decryptedTotalGames > 0 ? decryptedTotalGames : stats.totalGames,
          totalLines: result.lines,
          bestLevel: result.level,
          averageScore: averageScore,
          isDecrypted: true,
        });
        setMessage("All data decrypted successfully!");
      } else {
        setMessage("Failed to decrypt data");
      }
    } catch (error) {
      setMessage(
        `Decryption failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsDecrypting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-eink-background">
        <Navigation />
        <main className="pt-16">
          <div className="max-w-7xl mx-auto px-4 py-8 text-center">
            <p className="font-pixel text-xs text-eink-text mb-4">
              CONNECT WALLET TO VIEW RECORDS
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
            MY RECORDS
          </h1>

          {accounts && accounts.length > 0 && (
            <div className="mb-6 font-pixel text-xs text-eink-text border-4 border-eink-text p-3 bg-eink-background">
              WALLET: {accounts[0].slice(0, 6)}...{accounts[0].slice(-4)}
            </div>
          )}

          <div className="mb-8 border-4 border-eink-text bg-eink-background p-6">
            <h2 className="font-pixel text-xs text-eink-text mb-4">
              STATISTICS
            </h2>
            <div className="space-y-3 font-pixel text-xs">
              <div className="flex justify-between border-b-2 border-eink-text pb-2">
                <span className="text-eink-text">BEST SCORE:</span>
                <span className="text-eink-text">{typeof stats.bestScore === "number" ? stats.bestScore.toLocaleString() : stats.bestScore}</span>
              </div>
              <div className="flex justify-between border-b-2 border-eink-text pb-2">
                <span className="text-eink-text">TOTAL GAMES:</span>
                <span className="text-eink-text">{typeof stats.totalGames === "number" ? stats.totalGames : stats.totalGames}</span>
              </div>
              <div className="flex justify-between border-b-2 border-eink-text pb-2">
                <span className="text-eink-text">TOTAL LINES:</span>
                <span className="text-eink-text">{typeof stats.totalLines === "number" ? stats.totalLines : stats.totalLines}</span>
              </div>
              <div className="flex justify-between border-b-2 border-eink-text pb-2">
                <span className="text-eink-text">BEST LEVEL:</span>
                <span className="text-eink-text">{typeof stats.bestLevel === "number" ? stats.bestLevel : stats.bestLevel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-eink-text">AVG SCORE:</span>
                <span className="text-eink-text">{typeof stats.averageScore === "number" ? stats.averageScore.toLocaleString() : stats.averageScore}</span>
              </div>
            </div>

            <button
              onClick={handleDecryptAll}
              disabled={isDecrypting || stats.isDecrypted}
              className="mt-6 px-6 py-3 border-3 border-eink-text font-pixel text-xs text-eink-text hover:bg-eink-backgroundAlt transition-colors disabled:bg-eink-backgroundAlt disabled:text-eink-textDisabled disabled:border-eink-border"
            >
              {isDecrypting
                ? "DECRYPT..."
                : stats.isDecrypted
                  ? "DECRYPTED"
                  : "DECRYPT ALL"}
            </button>
          </div>

          {message && (
            <div className="mb-6 p-4 border-4 border-eink-text bg-eink-background">
              <p className="font-pixel text-xs text-eink-text">{message.toUpperCase()}</p>
            </div>
          )}

          <div className="border-4 border-eink-text">
            <h2 className="font-pixel text-xs text-eink-text p-4 border-b-4 border-eink-text bg-eink-background">
              GAME HISTORY
            </h2>
            {isLoading ? (
              <div className="p-8">
                <p className="font-pixel text-xs text-eink-text">LOADING...</p>
              </div>
            ) : gameHistory.length === 0 ? (
              <div className="p-8">
                <p className="font-pixel text-xs text-eink-text">
                  NO RECORDS. PLAY A GAME!
                </p>
              </div>
            ) : (
              <table className="w-full font-pixel text-xs">
                <thead>
                  <tr className="border-b-4 border-eink-text bg-eink-background">
                    <th className="p-4 text-left text-eink-text">DATE</th>
                    <th className="p-4 text-left text-eink-text">SCORE</th>
                    <th className="p-4 text-left text-eink-text">LINES</th>
                    <th className="p-4 text-left text-eink-text">LEVEL</th>
                    <th className="p-4 text-left text-eink-text">TIME</th>
                  </tr>
                </thead>
                <tbody>
                  {gameHistory.map((entry, index) => (
                    <tr
                      key={index}
                      className={`border-b-2 border-eink-text ${
                        index % 2 === 0 ? "bg-eink-background" : "bg-eink-backgroundAlt"
                      }`}
                    >
                      <td className="p-4 text-eink-text">{entry.date}</td>
                      <td className="p-4 text-eink-text">
                        {entry.isDecrypted ? entry.score : "****"}
                      </td>
                      <td className="p-4 text-eink-text">
                        {entry.isDecrypted ? entry.lines : "****"}
                      </td>
                      <td className="p-4 text-eink-text">
                        {entry.isDecrypted ? entry.level : "***"}
                      </td>
                      <td className="p-4 text-eink-text">{entry.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
