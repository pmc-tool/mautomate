import { useState, useCallback } from "react";

interface CreditError {
  required?: number;
  available?: number;
}

/**
 * Hook that wraps an async action to intercept 402 (Insufficient Credits) errors
 * and show the modal instead of crashing.
 *
 * Usage:
 * ```tsx
 * const { execute, isInsufficientCredits, creditError, dismissCreditError } = useCreditsGuard();
 *
 * const handleGenerate = () => execute(async () => {
 *   await generateSocialMediaPost({ agentId, platform });
 * });
 * ```
 */
export function useCreditsGuard() {
  const [creditError, setCreditError] = useState<CreditError | null>(null);

  const execute = useCallback(async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
    try {
      return await fn();
    } catch (error: any) {
      // Check if it's a 402 Insufficient Credits error
      const statusCode = error?.statusCode ?? error?.status;
      if (statusCode === 402) {
        let parsed: CreditError = {};
        try {
          const body =
            typeof error.message === "string"
              ? JSON.parse(error.message)
              : error.data ?? error.message;
          parsed = {
            required: body.required,
            available: body.available,
          };
        } catch {
          // parse failed, use empty
        }
        setCreditError(parsed);
        return undefined;
      }
      throw error;
    }
  }, []);

  const dismissCreditError = useCallback(() => {
    setCreditError(null);
  }, []);

  return {
    execute,
    isInsufficientCredits: creditError !== null,
    creditError,
    dismissCreditError,
  };
}
