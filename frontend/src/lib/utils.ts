import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get block explorer URL for a transaction hash
 * @param hash Transaction hash
 * @param chainId Chain ID (defaults to Sepolia)
 */
export function getExplorerTxUrl(hash: string, chainId: number = 11155111): string {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io',
    11155111: 'https://sepolia.etherscan.io',
    8453: 'https://basescan.org',
    84532: 'https://sepolia.basescan.org',
  };
  const baseUrl = explorers[chainId] || 'https://sepolia.etherscan.io';
  return `${baseUrl}/tx/${hash}`;
}

/**
 * Format transaction hash for display (truncated)
 * @param hash Full transaction hash
 */
export function formatTxHash(hash: string): string {
  if (!hash || hash.length < 12) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}
