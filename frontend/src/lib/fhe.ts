import { getAddress, keccak256, toHex } from 'viem';
import { NETWORK_CONFIG } from '@/config/contracts';

declare global {
  interface Window {
    relayerSDK?: {
      initSDK: () => Promise<void>;
      createInstance: (config: Record<string, unknown>) => Promise<any>;
      SepoliaConfig: Record<string, unknown>;
    };
    ethereum?: any;
    okxwallet?: { provider?: any } | any;
    coinbaseWalletExtension?: any;
  }
}

const SDK_URL = 'https://cdn.zama.ai/relayer-sdk-js/0.2.0/relayer-sdk-js.umd.cjs';

let fheInstance: any = null;
let fheInstancePromise: Promise<any> | null = null;
let sdkPromise: Promise<any> | null = null;

const loadSdk = async (): Promise<any> => {
  if (typeof window === 'undefined') {
    throw new Error('FHE SDK requires browser environment');
  }

  if (window.relayerSDK) {
    return window.relayerSDK;
  }

  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${SDK_URL}"]`) as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener('load', () => resolve(window.relayerSDK));
        existing.addEventListener('error', () => reject(new Error('Failed to load FHE SDK')));
        return;
      }

      const script = document.createElement('script');
      script.src = SDK_URL;
      script.async = true;
      script.onload = () => {
        if (window.relayerSDK) {
          resolve(window.relayerSDK);
        } else {
          reject(new Error('relayerSDK unavailable after load'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load FHE SDK'));
      document.body.appendChild(script);
    });
  }

  return sdkPromise;
};

const normalizeProvider = (candidate?: any): any | undefined => {
  if (!candidate) return undefined;

  if (typeof candidate.request === 'function') {
    return candidate;
  }

  if (candidate.provider && typeof candidate.provider.request === 'function') {
    return candidate.provider;
  }

  if (candidate.transport && typeof candidate.transport.request === 'function') {
    const transport = candidate.transport;
    return {
      request: ({ method, params }: { method: string; params?: unknown[] }) =>
        transport.request({ method, params: params ?? [] }),
    };
  }

  return undefined;
};

const ensureHexPayload = (handles: unknown[], proof: Uint8Array) => {
  if (!Array.isArray(handles) || handles.length === 0) {
    throw new Error('Encryption did not return any handles');
  }

  return {
    handle: toHex(handles[0] as Uint8Array),
    proof: toHex(proof),
  } as { handle: `0x${string}`; proof: `0x${string}` };
};

export async function initializeFHE(provider?: any): Promise<any> {
  if (fheInstance) {
    return fheInstance;
  }

  if (fheInstancePromise) {
    return fheInstancePromise;
  }

  fheInstancePromise = (async () => {
    if (typeof window === 'undefined') {
      throw new Error('FHE SDK requires browser environment');
    }

    const ethereumProvider =
      normalizeProvider(provider) ||
      normalizeProvider(window.ethereum) ||
      normalizeProvider(window.okxwallet?.provider) ||
      normalizeProvider(window.okxwallet) ||
      normalizeProvider(window.coinbaseWalletExtension);

    if (!ethereumProvider) {
      throw new Error('Ethereum provider not found. Please connect your wallet first.');
    }

    const sdk = await loadSdk();
    if (!sdk) {
      throw new Error('FHE SDK not available');
    }

    await sdk.initSDK();

    const config = {
      ...sdk.SepoliaConfig,
      network: ethereumProvider,
    };

    fheInstance = await sdk.createInstance(config);
    return fheInstance;
  })();

  try {
    return await fheInstancePromise;
  } finally {
    fheInstancePromise = null;
  }
}

export const getFhevmInstance = initializeFHE;

type EncryptedPayload = { handle: `0x${string}`; proof: `0x${string}` };

type UintValidator = (value: number | bigint) => void;

type Adder = (input: any, value: number | bigint) => void;

const encryptValue = async (
  value: number | bigint,
  contractAddress: string,
  userAddress: string,
  addValue: (input: any) => void,
  provider?: any
): Promise<EncryptedPayload> => {
  const fhe = await initializeFHE(provider);
  const checksumContract = getAddress(contractAddress);
  const checksumUser = getAddress(userAddress);

  const input = fhe.createEncryptedInput(checksumContract, checksumUser);
  addValue(input);

  const { handles, inputProof } = await input.encrypt();
  return ensureHexPayload(handles, inputProof);
};

const assertRange = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

export const encryptUint8 = async (
  value: number,
  contractAddress: string,
  userAddress: string,
  provider?: any
): Promise<EncryptedPayload> => {
  assertRange(value >= 0 && value <= 255, 'Value must be between 0 and 255');
  return encryptValue(value, contractAddress, userAddress, (input) => input.add8(value), provider);
};

export const encryptUint16 = async (
  value: number,
  contractAddress: string,
  userAddress: string,
  provider?: any
): Promise<EncryptedPayload> => {
  assertRange(value >= 0 && value <= 65535, 'Value must be between 0 and 65535');
  return encryptValue(value, contractAddress, userAddress, (input) => input.add16(value), provider);
};

export const encryptUint32 = async (
  value: number,
  contractAddress: string,
  userAddress: string,
  provider?: any
): Promise<EncryptedPayload> => {
  assertRange(value >= 0 && value <= 4294967295, 'Value must be between 0 and 4294967295');
  return encryptValue(value, contractAddress, userAddress, (input) => input.add32(value), provider);
};

export const encryptUint64 = async (
  value: bigint,
  contractAddress: string,
  userAddress: string,
  provider?: any
): Promise<EncryptedPayload> => {
  return encryptValue(value, contractAddress, userAddress, (input) => input.add64(value), provider);
};

export const formatEncryptedData = (payload: EncryptedPayload) => payload;

export const calculateAge = (dateOfBirth: string): number => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

export const hashString = (value: string): number => {
  const bytes = new TextEncoder().encode(value);
  const hash = keccak256(bytes);
  const firstFourBytes = hash.slice(2, 10);
  return Number.parseInt(firstFourBytes, 16);
};

/**
 * Get permission for encrypted value to be decrypted by user
 * @param contractAddress Contract holding the encrypted data
 * @param userAddress User who will decrypt
 * @param provider Wallet provider
 */
export const createPermission = async (
  contractAddress: string,
  userAddress: string,
  provider?: any
): Promise<any> => {
  const fhe = await initializeFHE(provider);
  const checksumContract = getAddress(contractAddress);
  const checksumUser = getAddress(userAddress);

  // Generate EIP-712 permission signature
  const permission = fhe.generatePermission(checksumContract, checksumUser);
  return permission;
};

/**
 * Decrypt euint8 value using FHE instance
 * @param handle Encrypted handle (ciphertext ID)
 * @param contractAddress Contract address
 * @param userAddress User address
 * @param provider Wallet provider
 */
export const decryptUint8 = async (
  handle: `0x${string}`,
  contractAddress: string,
  userAddress: string,
  provider?: any
): Promise<number> => {
  const fhe = await initializeFHE(provider);
  const permission = await createPermission(contractAddress, userAddress, provider);

  try {
    const decrypted = await fhe.decrypt(handle, permission);
    return Number(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error(`Failed to decrypt euint8: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Decrypt euint16 value
 */
export const decryptUint16 = async (
  handle: `0x${string}`,
  contractAddress: string,
  userAddress: string,
  provider?: any
): Promise<number> => {
  const fhe = await initializeFHE(provider);
  const permission = await createPermission(contractAddress, userAddress, provider);

  try {
    const decrypted = await fhe.decrypt(handle, permission);
    return Number(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error(`Failed to decrypt euint16: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Decrypt euint32 value
 */
export const decryptUint32 = async (
  handle: `0x${string}`,
  contractAddress: string,
  userAddress: string,
  provider?: any
): Promise<number> => {
  const fhe = await initializeFHE(provider);
  const permission = await createPermission(contractAddress, userAddress, provider);

  try {
    const decrypted = await fhe.decrypt(handle, permission);
    return Number(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error(`Failed to decrypt euint32: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Decrypt euint64 value
 */
export const decryptUint64 = async (
  handle: `0x${string}`,
  contractAddress: string,
  userAddress: string,
  provider?: any
): Promise<bigint> => {
  const fhe = await initializeFHE(provider);
  const permission = await createPermission(contractAddress, userAddress, provider);

  try {
    const decrypted = await fhe.decrypt(handle, permission);
    return BigInt(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error(`Failed to decrypt euint64: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
