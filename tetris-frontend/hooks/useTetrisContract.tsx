"use client";

import { ethers } from "ethers";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { FhevmInstance } from "@/fhevm/fhevmTypes";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { GenericStringStorage } from "@/fhevm/GenericStringStorage";
import { FHETetrisAddresses } from "@/abi/FHETetrisAddresses";
import { FHETetrisABI } from "@/abi/FHETetrisABI";

export type ClearValueType = {
  handle: string;
  clear: string | bigint | boolean;
};

type FHETetrisInfoType = {
  abi: typeof FHETetrisABI.abi;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

function getFHETetrisByChainId(
  chainId: number | undefined
): FHETetrisInfoType {
  if (!chainId) {
    return { abi: FHETetrisABI.abi };
  }

  const entry =
    FHETetrisAddresses[chainId.toString() as keyof typeof FHETetrisAddresses];

  if (!("address" in entry) || entry.address === ethers.ZeroAddress) {
    return { abi: FHETetrisABI.abi, chainId };
  }

  return {
    address: entry?.address as `0x${string}` | undefined,
    chainId: entry?.chainId ?? chainId,
    chainName: entry?.chainName,
    abi: FHETetrisABI.abi,
  };
}

export interface GameResult {
  score: number;
  lines: number;
  level: number;
  time: number; // in seconds
}

export const useTetrisContract = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<
    (ethersSigner: ethers.JsonRpcSigner | undefined) => boolean
  >;
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  } = parameters;

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  const tetrisContractRef = useRef<FHETetrisInfoType | undefined>(undefined);
  const isSubmittingRef = useRef<boolean>(false);
  const isDecryptingRef = useRef<boolean>(false);

  const tetrisContract = useMemo(() => {
    const c = getFHETetrisByChainId(chainId);
    tetrisContractRef.current = c;

    if (!c.address) {
      setMessage(`FHETetris deployment not found for chainId=${chainId}.`);
    }

    return c;
  }, [chainId]);

  const isDeployed = useMemo(() => {
    if (!tetrisContract) {
      return undefined;
    }
    return (
      Boolean(tetrisContract.address) &&
      tetrisContract.address !== ethers.ZeroAddress
    );
  }, [tetrisContract]);

  const canSubmit = useMemo(() => {
    return (
      tetrisContract.address &&
      instance &&
      ethersSigner &&
      !isSubmitting
    );
  }, [tetrisContract.address, instance, ethersSigner, isSubmitting]);

  const submitGameResult = useCallback(
    async (gameResult: GameResult) => {
      if (isSubmittingRef.current) {
        return;
      }

      if (!tetrisContract.address || !instance || !ethersSigner) {
        setMessage("Cannot submit: missing contract, instance, or signer");
        return;
      }

      const thisChainId = chainId;
      const thisContractAddress = tetrisContract.address;
      const thisEthersSigner = ethersSigner;

      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setMessage("Encrypting game result...");

      const run = async () => {
        const isStale = () =>
          thisContractAddress !== tetrisContractRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        try {
          await new Promise((resolve) => setTimeout(resolve, 100));

          const input = instance.createEncryptedInput(
            thisContractAddress,
            thisEthersSigner.address
          );
          input.add64(gameResult.score);
          input.add32(gameResult.lines);
          input.add8(gameResult.level);

          setMessage("Encrypting...");
          const enc = await input.encrypt();

          if (isStale()) {
            setMessage("Ignore submission");
            return;
          }

          setMessage("Submitting to blockchain...");

          const contract = new ethers.Contract(
            thisContractAddress,
            tetrisContract.abi,
            thisEthersSigner
          );

          const tx: ethers.TransactionResponse = await contract.submitGameResult(
            enc.handles[0],
            enc.handles[1],
            enc.handles[2],
            enc.inputProof
          );

          setMessage(`Waiting for tx: ${tx.hash}...`);

          const receipt = await tx.wait();

          if (isStale()) {
            setMessage("Ignore submission");
            return;
          }

          setMessage(
            `Submission completed! Status: ${receipt?.status === 1 ? "Success" : "Failed"}`
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          setMessage(`Submission failed: ${errorMessage}`);
        } finally {
          isSubmittingRef.current = false;
          setIsSubmitting(false);
        }
      };

      run();
    },
    [
      tetrisContract.address,
      tetrisContract.abi,
      instance,
      ethersSigner,
      chainId,
      sameChain,
      sameSigner,
    ]
  );

  const decryptPlayerData = useCallback(
    async (userAddress: `0x${string}`) => {
      if (isDecryptingRef.current) {
        return;
      }

      if (
        !tetrisContract.address ||
        !instance ||
        !ethersSigner ||
        !ethersReadonlyProvider
      ) {
        setMessage("Cannot decrypt: missing contract, instance, or provider");
        return;
      }

      const thisChainId = chainId;
      const thisContractAddress = tetrisContract.address;
      const thisEthersSigner = ethersSigner;
      const thisUserAddress = userAddress;

      isDecryptingRef.current = true;
      setIsDecrypting(true);
      setMessage("Decrypting player data...");

      const run = async () => {
        const isStale = () =>
          thisContractAddress !== tetrisContractRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        try {
          const contract = new ethers.Contract(
            thisContractAddress,
            tetrisContract.abi,
            ethersReadonlyProvider
          );

          const [scoreHandle, linesHandle, levelHandle] = await Promise.all([
            contract.getPlayerScore(thisUserAddress),
            contract.getPlayerLines(thisUserAddress),
            contract.getPlayerLevel(thisUserAddress),
          ]);

          if (isStale()) {
            setMessage("Ignore decryption");
            return;
          }

          const signature = await FhevmDecryptionSignature.loadOrSign(
            instance,
            [thisContractAddress],
            thisEthersSigner,
            fhevmDecryptionSignatureStorage
          );

          if (!signature) {
            setMessage("Failed to generate decryption signature");
            return;
          }

          if (isStale()) {
            setMessage("Ignore decryption");
            return;
          }

          setMessage("Decrypting...");

          const decrypted = await instance.userDecrypt(
            [
              { handle: scoreHandle, contractAddress: thisContractAddress },
              { handle: linesHandle, contractAddress: thisContractAddress },
              { handle: levelHandle, contractAddress: thisContractAddress },
            ],
            signature.privateKey,
            signature.publicKey,
            signature.signature,
            signature.contractAddresses,
            signature.userAddress,
            signature.startTimestamp,
            signature.durationDays
          );

          if (isStale()) {
            setMessage("Ignore decryption");
            return;
          }

          const result = {
            score: Number(decrypted[scoreHandle]),
            lines: Number(decrypted[linesHandle]),
            level: Number(decrypted[levelHandle]),
          };

          setMessage("Decryption completed!");
          return result;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          setMessage(`Decryption failed: ${errorMessage}`);
          return null;
        } finally {
          isDecryptingRef.current = false;
          setIsDecrypting(false);
        }
      };

      return run();
    },
    [
      tetrisContract.address,
      tetrisContract.abi,
      instance,
      ethersSigner,
      ethersReadonlyProvider,
      chainId,
      fhevmDecryptionSignatureStorage,
      sameChain,
      sameSigner,
    ]
  );

  return {
    contractAddress: tetrisContract.address,
    isDeployed,
    canSubmit,
    isSubmitting,
    isDecrypting,
    message,
    submitGameResult,
    decryptPlayerData,
  };
};

