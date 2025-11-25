# Encrypted Tetris Game

A fully homomorphic encryption (FHE) enabled Tetris game built with FHEVM, allowing players to submit encrypted game scores and compete on a leaderboard while maintaining privacy.

## Overview

This project consists of:
- **Smart Contracts**: Solidity contracts using FHEVM for encrypted score storage and leaderboard management
- **Frontend**: Next.js application with game interface and encrypted data interaction

## Project Structure

```
.
├── fhevm-hardhat-template/    # Smart contract development environment
│   ├── contracts/             # Solidity contracts (FHETetris.sol)
│   ├── deploy/                # Deployment scripts
│   ├── test/                  # Contract tests
│   └── tasks/                 # Hardhat custom tasks
└── tetris-frontend/           # Next.js frontend application
    ├── app/                   # Next.js app router pages
    ├── components/            # React components
    ├── hooks/                 # Custom React hooks
    └── fhevm/                 # FHEVM integration utilities
```

## Features

- **Encrypted Score Submission**: Game scores are encrypted before being submitted to the blockchain
- **Private Leaderboard**: Leaderboard rankings are computed on encrypted data
- **Game History**: Encrypted game records stored on-chain
- **Dual Mode Support**: Works with both local mock relayer and production relayer

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Hardhat node (for local development)

### Smart Contracts

```bash
cd fhevm-hardhat-template
npm install
npx hardhat compile
npx hardhat test
```

### Frontend

```bash
cd tetris-frontend
npm install

# Development with mock relayer
npm run dev:mock

# Development with production relayer
npm run dev
```

## License

BSD-3-Clause-Clear

