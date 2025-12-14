import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { FHETetris, FHETetris__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHETetris")) as FHETetris__factory;
  const fheTetrisContract = (await factory.deploy()) as FHETetris;
  const fheTetrisContractAddress = await fheTetrisContract.getAddress();

  return { fheTetrisContract, fheTetrisContractAddress };
}

describe("FHETetris", function () {
  let signers: Signers;
  let fheTetrisContract: FHETetris;
  let fheTetrisContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ fheTetrisContract, fheTetrisContractAddress } = await deployFixture());
  });

  it("should initialize with empty player data", async function () {
    const score = await fheTetrisContract.getPlayerScore(signers.alice.address);
    expect(score).to.eq(ethers.ZeroHash);
  });

  it("should submit game result and update player data", async function () {
    const score = 12500;
    const lines = 45;
    const level = 4;

    const encrypted = await fhevm
      .createEncryptedInput(fheTetrisContractAddress, signers.alice.address)
      .add64(score)
      .add32(lines)
      .add8(level)
      .encrypt();

    const tx = await fheTetrisContract
      .connect(signers.alice)
      .submitGameResult(
        encrypted.handles[0],
        encrypted.handles[1],
        encrypted.handles[2],
        encrypted.inputProof
      );
    await tx.wait();

    const encryptedBestScore = await fheTetrisContract.getPlayerScore(signers.alice.address);
    const clearBestScore = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBestScore,
      fheTetrisContractAddress,
      signers.alice,
    );

    expect(clearBestScore).to.eq(BigInt(score));
  });

  it("should update best score only if new score is higher", async function () {
    const score1 = 10000;
    const score2 = 15000;
    const lines = 30;
    const level = 3;

    // Submit first score
    const encrypted1 = await fhevm
      .createEncryptedInput(fheTetrisContractAddress, signers.alice.address)
      .add64(score1)
      .add32(lines)
      .add8(level)
      .encrypt();

    let tx = await fheTetrisContract
      .connect(signers.alice)
      .submitGameResult(
        encrypted1.handles[0],
        encrypted1.handles[1],
        encrypted1.handles[2],
        encrypted1.inputProof
      );
    await tx.wait();

    // Submit higher score
    const encrypted2 = await fhevm
      .createEncryptedInput(fheTetrisContractAddress, signers.alice.address)
      .add64(score2)
      .add32(lines)
      .add8(level)
      .encrypt();

    tx = await fheTetrisContract
      .connect(signers.alice)
      .submitGameResult(
        encrypted2.handles[0],
        encrypted2.handles[1],
        encrypted2.handles[2],
        encrypted2.inputProof
      );
    await tx.wait();

    const encryptedBestScore = await fheTetrisContract.getPlayerScore(signers.alice.address);
    const clearBestScore = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBestScore,
      fheTetrisContractAddress,
      signers.alice,
    );

    expect(clearBestScore).to.eq(BigInt(score2));
  });

  it("should add player to leaderboard", async function () {
    const score = 10000;
    const lines = 30;
    const level = 3;

    const encrypted = await fhevm
      .createEncryptedInput(fheTetrisContractAddress, signers.alice.address)
      .add64(score)
      .add32(lines)
      .add8(level)
      .encrypt();

    const tx = await fheTetrisContract
      .connect(signers.alice)
      .submitGameResult(
        encrypted.handles[0],
        encrypted.handles[1],
        encrypted.handles[2],
        encrypted.inputProof
      );
    await tx.wait();

    const topPlayers = await fheTetrisContract.getTopPlayers(10);
    expect(topPlayers.length).to.be.greaterThan(0);
    expect(topPlayers[0]).to.eq(signers.alice.address);
  });
});

