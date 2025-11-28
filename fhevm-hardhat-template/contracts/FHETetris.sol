// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, euint32, euint8, externalEuint64, externalEuint32, externalEuint8, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

// Tetris game with encrypted scores
contract FHETetris is ZamaEthereumConfig {
    struct PlayerData {
        euint64 bestScore;
        euint32 totalGames;
        euint32 totalLines;
        euint8 bestLevel;
        euint64 totalScore;
    }

    struct GameRecord {
        uint256 timestamp;
        euint64 score;
        euint32 lines;
        euint8 level;
        uint32 time;
    }

    mapping(address => PlayerData) private players;
    mapping(address => GameRecord[]) private gameHistory;
    address[] private leaderboard;
    uint256 public constant MAX_LEADERBOARD_SIZE = 100;

    event GameResultSubmitted(address indexed player, uint256 timestamp);
    event LeaderboardUpdated(address indexed player);

    // Submit game result with encrypted data
    function submitGameResult(
        externalEuint64 encryptedScore,
        externalEuint32 encryptedLines,
        externalEuint8 encryptedLevel,
        bytes calldata inputProof
    ) external {
        euint64 score = FHE.fromExternal(encryptedScore, inputProof);
        euint32 lines = FHE.fromExternal(encryptedLines, inputProof);
        euint8 level = FHE.fromExternal(encryptedLevel, inputProof);

        PlayerData storage player = players[msg.sender];

        ebool isHigherScore = FHE.gt(score, player.bestScore);
        player.bestScore = FHE.select(isHigherScore, score, player.bestScore);

        ebool isHigherLevel = FHE.gt(level, player.bestLevel);
        player.bestLevel = FHE.select(isHigherLevel, level, player.bestLevel);

        player.totalGames = FHE.add(player.totalGames, FHE.asEuint32(1));
        player.totalLines = FHE.add(player.totalLines, lines);
        player.totalScore = FHE.add(player.totalScore, score);

        gameHistory[msg.sender].push(GameRecord({
            timestamp: block.timestamp,
            score: score,
            lines: lines,
            level: level,
            time: 0
        }));

        GameRecord storage lastRecord = gameHistory[msg.sender][gameHistory[msg.sender].length - 1];
        FHE.allowThis(lastRecord.score);
        FHE.allow(lastRecord.score, msg.sender);
        FHE.allowThis(lastRecord.lines);
        FHE.allow(lastRecord.lines, msg.sender);
        FHE.allowThis(lastRecord.level);
        FHE.allow(lastRecord.level, msg.sender);

        _updateLeaderboard(msg.sender);

        FHE.allowThis(player.bestScore);
        FHE.allow(player.bestScore, msg.sender);
        FHE.allowThis(player.totalGames);
        FHE.allow(player.totalGames, msg.sender);
        FHE.allowThis(player.totalLines);
        FHE.allow(player.totalLines, msg.sender);
        FHE.allowThis(player.bestLevel);
        FHE.allow(player.bestLevel, msg.sender);
        FHE.allowThis(player.totalScore);
        FHE.allow(player.totalScore, msg.sender);

        emit GameResultSubmitted(msg.sender, block.timestamp);
    }

    function _updateLeaderboard(address player) internal {
        PlayerData storage playerData = players[player];
        
        bool isInLeaderboard = false;
        uint256 existingIndex = 0;
        for (uint256 i = 0; i < leaderboard.length; i++) {
            if (leaderboard[i] == player) {
                isInLeaderboard = true;
                existingIndex = i;
                break;
            }
        }

        if (isInLeaderboard) {
            for (uint256 i = existingIndex; i < leaderboard.length - 1; i++) {
                leaderboard[i] = leaderboard[i + 1];
            }
            leaderboard.pop();
        }

        uint256 insertPosition = _findInsertPosition(playerData.bestScore);

        if (insertPosition <= leaderboard.length) {
            if (leaderboard.length < MAX_LEADERBOARD_SIZE || insertPosition < leaderboard.length) {
                if (leaderboard.length < MAX_LEADERBOARD_SIZE) {
                    leaderboard.push(address(0));
                }
                
                for (uint256 i = leaderboard.length - 1; i > insertPosition; i--) {
                    leaderboard[i] = leaderboard[i - 1];
                }
                
                leaderboard[insertPosition] = player;
                
                if (leaderboard.length > MAX_LEADERBOARD_SIZE) {
                    leaderboard.pop();
                }
            }
        }

        emit LeaderboardUpdated(player);
    }

    function _findInsertPosition(euint64 /* playerScore */) internal view returns (uint256) {
        if (leaderboard.length == 0) {
            return 0;
        }

        if (leaderboard.length < MAX_LEADERBOARD_SIZE) {
            return leaderboard.length;
        } else {
            return leaderboard.length - 1;
        }
    }

    // Get top N players
    function getTopPlayers(uint256 count) external view returns (address[] memory) {
        uint256 length = leaderboard.length < count ? leaderboard.length : count;
        address[] memory topPlayers = new address[](length);
        
        for (uint256 i = 0; i < length; i++) {
            topPlayers[i] = leaderboard[i];
        }
        
        return topPlayers;
    }

    function sortLeaderboard() external {
        emit LeaderboardUpdated(address(0));
    }

    function getPlayerScore(address player) external view returns (euint64) {
        return players[player].bestScore;
    }

    function getPlayerLines(address player) external view returns (euint32) {
        return players[player].totalLines;
    }

    function getPlayerLevel(address player) external view returns (euint8) {
        return players[player].bestLevel;
    }

    function getPlayerBestScore(address player) external view returns (euint64) {
        return players[player].bestScore;
    }

    function getPlayerTotalGames(address player) external view returns (euint32) {
        return players[player].totalGames;
    }

    function getPlayerTotalLines(address player) external view returns (euint32) {
        return players[player].totalLines;
    }

    function getPlayerBestLevel(address player) external view returns (euint8) {
        return players[player].bestLevel;
    }

    function getPlayerGameHistoryCount(address player) external view returns (uint256) {
        return gameHistory[player].length;
    }

    // Get game record, index 0 is most recent
    function getPlayerGameRecord(address player, uint256 index) external view returns (
        uint256 timestamp,
        bytes32 score,
        bytes32 lines,
        bytes32 level,
        uint32 time
    ) {
        GameRecord[] storage history = gameHistory[player];
        require(index < history.length, "Index out of bounds");
        
        uint256 reverseIndex = history.length - 1 - index;
        GameRecord storage record = history[reverseIndex];
        
        return (
            record.timestamp,
            FHE.toBytes32(record.score),
            FHE.toBytes32(record.lines),
            FHE.toBytes32(record.level),
            record.time
        );
    }

    function getLeaderboardSize() external view returns (uint256) {
        return leaderboard.length;
    }
}

