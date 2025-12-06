"use client";

import { useEffect, useRef, useState } from "react";
import { Eip1193Provider } from "ethers";
import { createFhevmInstance, FhevmAbortError } from "@/fhevm/internal/fhevm";
import { FhevmInstance } from "@/fhevm/fhevmTypes";

export type FhevmStatus =
  | "idle"
  | "sdk-loading"
  | "sdk-loaded"
  | "sdk-initializing"
  | "sdk-initialized"
  | "creating"
  | "ready"
  | "error";

export interface UseFhevmState {
  instance: FhevmInstance | undefined;
  status: FhevmStatus;
  error: Error | undefined;
}

export function useFhevm(parameters: {
  provider: Eip1193Provider | string | undefined;
  chainId: number | undefined;
  initialMockChains?: Record<number, string>;
  enabled?: boolean;
}): UseFhevmState {
  const { provider, chainId, initialMockChains, enabled = true } = parameters;
  const [instance, setInstance] = useState<FhevmInstance | undefined>(
    undefined
  );
  const [status, setStatus] = useState<FhevmStatus>("idle");
  const [error, setError] = useState<Error | undefined>(undefined);

  const abortControllerRef = useRef<AbortController | undefined>(undefined);
  const providerRef = useRef<Eip1193Provider | string | undefined>(provider);
  const chainIdRef = useRef<number | undefined>(chainId);

  useEffect(() => {
    providerRef.current = provider;
    chainIdRef.current = chainId;
  }, [provider, chainId]);

  useEffect(() => {
    if (!enabled) {
      setInstance(undefined);
      setStatus("idle");
      setError(undefined);
      return;
    }

    if (!provider || !chainId) {
      setInstance(undefined);
      setStatus("idle");
      setError(undefined);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setStatus("sdk-loading");
    setError(undefined);

    const createInstance = async () => {
      try {
        const fhevmInstance = await createFhevmInstance({
          provider,
          mockChains: initialMockChains,
          signal: abortController.signal,
          onStatusChange: (status) => {
            if (abortController.signal.aborted) {
              return;
            }
            if (status === "creating") {
              setStatus("creating");
            } else if (status === "sdk-loading") {
              setStatus("sdk-loading");
            } else if (status === "sdk-loaded") {
              setStatus("sdk-loaded");
            } else if (status === "sdk-initializing") {
              setStatus("sdk-initializing");
            } else if (status === "sdk-initialized") {
              setStatus("sdk-initialized");
            }
          },
        });

        if (abortController.signal.aborted) {
          return;
        }

        if (
          providerRef.current !== provider ||
          chainIdRef.current !== chainId
        ) {
          return;
        }

        setInstance(fhevmInstance);
        setStatus("ready");
        setError(undefined);
      } catch (err) {
        if (abortController.signal.aborted) {
          return;
        }

        if (err instanceof FhevmAbortError) {
          return;
        }

        if (
          providerRef.current !== provider ||
          chainIdRef.current !== chainId
        ) {
          return;
        }

        const error = err instanceof Error ? err : new Error(String(err));
        setInstance(undefined);
        setStatus("error");
        setError(error);
      }
    };

    createInstance();

    return () => {
      abortController.abort();
    };
  }, [provider, chainId, initialMockChains, enabled]);

  return {
    instance,
    status,
    error,
  };
}

