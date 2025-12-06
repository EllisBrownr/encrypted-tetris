import type { FhevmInstance } from "@zama-fhe/relayer-sdk/bundle";
import type { FhevmInstanceConfig } from "@zama-fhe/relayer-sdk/web";
import type { HandleContractPair } from "@zama-fhe/relayer-sdk/bundle";

// UserDecryptResults type definition
export type UserDecryptResults = Record<string, bigint | boolean | `0x${string}`>;

export type DecryptedResults = UserDecryptResults;

export type { FhevmInstance, FhevmInstanceConfig, HandleContractPair };

export type FhevmDecryptionSignatureType = {
  publicKey: string;
  privateKey: string;
  signature: string;
  startTimestamp: number;
  durationDays: number;
  userAddress: `0x${string}`;
  contractAddresses: `0x${string}`[];
  eip712: EIP712Type;
};

export type EIP712Type = {
  domain: {
    chainId: number;
    name: string;
    verifyingContract: `0x${string}`;
    version: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  message: any;
  primaryType: string;
  types: {
    [key: string]: {
      name: string;
      type: string;
    }[];
  };
};

