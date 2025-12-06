import { getAddress, keccak256, toHex, bytesToHex } from 'viem';
import type { Address } from 'viem';

declare global {
  interface Window {
    RelayerSDK?: any;
    relayerSDK?: any;
    ethereum?: any;
    okxwallet?: { provider?: any } | any;
    coinbaseWalletExtension?: any;
  }
}

let fheInstance: any = null;

/**
 * Get SDK from CDN-loaded global object
 * SDK is loaded via script tag in index.html
 */
const getSDK = () => {
  if (typeof window === 'undefined') {
    throw new Error('FHE SDK requires a browser environment');
  }
  const sdk = window.RelayerSDK || window.relayerSDK;
  if (!sdk) {
    throw new Error('Relayer SDK not loaded. Ensure the CDN script tag is present in index.html.');
  }
  return sdk;
};

/**
 * Normalize provider to ensure it has a request method
 */
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

/**
 * Initialize FHE instance with wallet provider
 */
export async function initializeFHE(provider?: any): Promise<any> {
  if (fheInstance) {
    return fheInstance;
  }

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

  const sdk = getSDK();
  const { initSDK, createInstance, SepoliaConfig } = sdk;

  await initSDK();

  const config = {
    ...SepoliaConfig,
    network: ethereumProvider,
  };

  fheInstance = await createInstance(config);
  return fheInstance;
}

export const getFhevmInstance = initializeFHE;

/**
 * Get existing FHE instance or initialize new one
 */
const getInstance = async (provider?: any) => {
  if (fheInstance) return fheInstance;
  return initializeFHE(provider);
};

type EncryptedPayload = { handle: `0x${string}`; proof: `0x${string}` };

const ensureHexPayload = (handles: unknown[], proof: Uint8Array): EncryptedPayload => {
  if (!Array.isArray(handles) || handles.length === 0) {
    throw new Error('Encryption did not return any handles');
  }

  return {
    handle: bytesToHex(handles[0] as Uint8Array) as `0x${string}`,
    proof: bytesToHex(proof) as `0x${string}`,
  };
};

const assertRange = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

/**
 * Encrypt value with FHE
 */
const encryptValue = async (
  value: number | bigint,
  contractAddress: string,
  userAddress: string,
  addValue: (input: any) => void,
  provider?: any
): Promise<EncryptedPayload> => {
  const instance = await getInstance(provider);
  const checksumContract = getAddress(contractAddress);
  const checksumUser = getAddress(userAddress);

  const input = instance.createEncryptedInput(checksumContract, checksumUser);
  addValue(input);

  const { handles, inputProof } = await input.encrypt();
  return ensureHexPayload(handles, inputProof);
};

/**
 * Encrypt uint8 value (0-255)
 */
export const encryptUint8 = async (
  value: number,
  contractAddress: string,
  userAddress: string,
  provider?: any
): Promise<EncryptedPayload> => {
  assertRange(value >= 0 && value <= 255, 'Value must be between 0 and 255');
  return encryptValue(value, contractAddress, userAddress, (input) => input.add8(value), provider);
};

/**
 * Encrypt uint16 value (0-65535)
 */
export const encryptUint16 = async (
  value: number,
  contractAddress: string,
  userAddress: string,
  provider?: any
): Promise<EncryptedPayload> => {
  assertRange(value >= 0 && value <= 65535, 'Value must be between 0 and 65535');
  return encryptValue(value, contractAddress, userAddress, (input) => input.add16(value), provider);
};

/**
 * Encrypt uint32 value (0-4294967295)
 */
export const encryptUint32 = async (
  value: number,
  contractAddress: string,
  userAddress: string,
  provider?: any
): Promise<EncryptedPayload> => {
  assertRange(value >= 0 && value <= 4294967295, 'Value must be between 0 and 4294967295');
  return encryptValue(value, contractAddress, userAddress, (input) => input.add32(value), provider);
};

/**
 * Encrypt uint64 value (bigint)
 */
export const encryptUint64 = async (
  value: bigint,
  contractAddress: string,
  userAddress: string,
  provider?: any
): Promise<EncryptedPayload> => {
  return encryptValue(value, contractAddress, userAddress, (input) => input.add64(value), provider);
};

export const formatEncryptedData = (payload: EncryptedPayload) => payload;

/**
 * Calculate age from date of birth
 */
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

/**
 * Hash string to uint32 for FHE operations
 */
export const hashString = (value: string): number => {
  const bytes = new TextEncoder().encode(value);
  const hash = keccak256(bytes);
  const firstFourBytes = hash.slice(2, 10);
  return Number.parseInt(firstFourBytes, 16);
};

/**
 * Create EIP712 permission for encrypted value decryption
 * @param contractAddress Contract holding the encrypted data
 * @param userAddress User who will decrypt
 * @param provider Wallet provider
 */
export const createPermission = async (
  contractAddress: string,
  userAddress: string,
  provider?: any
): Promise<any> => {
  const instance = await getInstance(provider);
  const checksumContract = getAddress(contractAddress);
  const checksumUser = getAddress(userAddress);

  console.log('[FHE] Creating EIP712 permission for contract:', checksumContract);

  try {
    const eip712 = instance.createEIP712(checksumContract, checksumUser);
    const publicKey = instance.getPublicKey(checksumContract);

    console.log('[FHE] EIP712 permission created');

    return { eip712, publicKey };
  } catch (error) {
    console.error('[FHE] Permission generation failed:', error);
    throw error;
  }
};

/**
 * Decrypt euint8 value
 */
export const decryptUint8 = async (
  handle: `0x${string}`,
  contractAddress: string,
  userAddress: string,
  provider?: any
): Promise<number> => {
  const instance = await getInstance(provider);
  const permission = await createPermission(contractAddress, userAddress, provider);

  try {
    const decrypted = await instance.decrypt(handle, permission);
    return Number(decrypted);
  } catch (error) {
    console.error('[FHE] Decryption failed:', error);
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
  const instance = await getInstance(provider);
  const permission = await createPermission(contractAddress, userAddress, provider);

  try {
    const decrypted = await instance.decrypt(handle, permission);
    return Number(decrypted);
  } catch (error) {
    console.error('[FHE] Decryption failed:', error);
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
  const instance = await getInstance(provider);
  const permission = await createPermission(contractAddress, userAddress, provider);

  try {
    const decrypted = await instance.decrypt(handle, permission);
    return Number(decrypted);
  } catch (error) {
    console.error('[FHE] Decryption failed:', error);
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
  const instance = await getInstance(provider);
  const permission = await createPermission(contractAddress, userAddress, provider);

  try {
    const decrypted = await instance.decrypt(handle, permission);
    return BigInt(decrypted);
  } catch (error) {
    console.error('[FHE] Decryption failed:', error);
    throw new Error(`Failed to decrypt euint64: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Check if FHE SDK is loaded from CDN
 */
export const isFHEReady = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(window.RelayerSDK || window.relayerSDK);
};

/**
 * Check if FHE instance is initialized
 */
export const isFheInstanceReady = (): boolean => {
  return fheInstance !== null;
};

export const isSDKLoaded = isFHEReady;

/**
 * Wait for FHE SDK to be loaded (with timeout)
 */
export const waitForFHE = async (timeoutMs: number = 10000): Promise<boolean> => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (isFHEReady()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return false;
};

/**
 * Get FHE status for debugging
 */
export const getFHEStatus = (): {
  sdkLoaded: boolean;
  instanceReady: boolean;
} => {
  return {
    sdkLoaded: isFHEReady(),
    instanceReady: fheInstance !== null,
  };
};
