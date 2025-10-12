import React, { useState, useEffect } from 'react';
import Jazzicon from './Jazzicon';
import { ethers } from 'ethers';
import { bsc, bscTestnet } from 'viem/chains';
import { createSafeClient } from '@safe-global/sdk-starter-kit';
import Safe from '@safe-global/protocol-kit';
import { createLogger } from '../utils/logger';

const imgPlus = "/assets/plus.svg";

// Create component-specific logger
const logger = createLogger('VestingAdmin');

// Constants
const ETHEREUM_ADDRESS_LENGTH = 42;

// Helper function to generate Safe transaction URL for Vesting Candidates (always queue)
const getSafeTransactionUrlForCandidates = (safeTxHash: string, safeAddress?: string): string => {
  const safeAddr = process.env.REACT_APP_SAFE_WALLET || safeAddress;
  if (!safeAddr) return '#';
  
  return `https://app.safe.global/transactions/queue?safe=${safeAddr}&id=${safeTxHash}`;
};

// Helper function to generate Safe transaction URL for Active Vesting Schedules (always history)
const getSafeTransactionUrlForSchedules = (safeTxHash: string, safeAddress?: string): string => {
  const safeAddr = process.env.REACT_APP_SAFE_WALLET || safeAddress;
  if (!safeAddr) return '#';
  
  return `https://app.safe.global/transactions/history?safe=${safeAddr}&id=${safeTxHash}`;
};

// Helper function to generate blockchain explorer URL
const getBlockchainExplorerUrl = (txHash: string): string => {
  // Determine network based on environment or default to BSC
  const network = process.env.REACT_APP_NETWORK || 'bsc';
  
  if (network === 'bsc' || network === 'bsc-mainnet') {
    return `https://bscscan.com/tx/${txHash}`;
  } else if (network === 'bsc-testnet') {
    return `https://testnet.bscscan.com/tx/${txHash}`;
  } else {
    // Default to BSC mainnet
    return `https://bscscan.com/tx/${txHash}`;
  }
};

// Helper function to format Safe TxHash with contracted display
const formatSafeTxHash = (safeTxHash: string, showFull: boolean = false): string => {
  if (!safeTxHash) return '-';
  if (showFull) return safeTxHash;
  return `${safeTxHash.slice(0, 6)}...${safeTxHash.slice(-4)}`;
};

interface VestingItem {
  address: string;
  totalVesting: number;
  totalPayout: number;
  currentRelease: number;
  status: string;
  releaseStatus: string;
  pendingReleaseTx?: any;
  confirmations?: any[];
  confirmationsRequired?: number;
  isExecuted?: boolean;
  origin?: string;
  safeTxHash?: string;
  safeAddress?: string;
}

interface VestingAdminProps {
  setView: (view: string) => void;
  setActiveItem: (item: string) => void;
  contractAddress: string;
  contractABI: readonly any[];
  title: string;
}

const truncateAddress = (address: string) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Local calculation function that replicates the Solidity getCurrentlyReleasableAmount logic
const getCurrentlyReleasableAmountLocal = (
  schedule: {
    totalAmount: bigint;
    totalVestingDuration: bigint;
    cliffDuration: bigint;
    releaseDuration: bigint;
    installmentCount: bigint;
    releasedAmount: bigint;
  },
  globalStartTime: bigint,
  currentTimestamp: number
): bigint => {
  // Convert current timestamp to BigInt for comparison
  const currentTime = BigInt(Math.floor(currentTimestamp));
  
  // If global start time is not set, no tokens are releasable
  if (globalStartTime === 0n || schedule.totalAmount === 0n || schedule.totalAmount === schedule.releasedAmount) {
    return 0n;
  }

  // If current time is before the cliff ends, no tokens are vested
  if (currentTime < globalStartTime + schedule.cliffDuration) {
    return 0n;
  }

  // Explicitly handle single-installment schedules (one-time release after cliff)
  if (schedule.installmentCount === 1n) {
    return schedule.totalAmount - schedule.releasedAmount;
  }

  const installmentDuration = schedule.releaseDuration / schedule.installmentCount;
  const timeSinceCliffEnd = currentTime - (globalStartTime + schedule.cliffDuration);
  let vestedInstallments = timeSinceCliffEnd / installmentDuration + 1n;

  // Cap vested installments at the total count to prevent overshooting
  if (vestedInstallments > schedule.installmentCount) {
    vestedInstallments = schedule.installmentCount;
  }

  let totalVestedAmount: bigint;
  if (vestedInstallments === schedule.installmentCount) {
    totalVestedAmount = schedule.totalAmount;
  } else {
    const vestedProportionNumerator = schedule.totalAmount * vestedInstallments;
    totalVestedAmount = vestedProportionNumerator / schedule.installmentCount;
  }

  return totalVestedAmount - schedule.releasedAmount;
};

// Global cache to persist data across component unmounts
const vestingDataCache = new Map<string, {
  vestingData: VestingItem[];
  createVestingTransactions: any[];
  releaseToTransactions: any[];
  safeTxHashCache: Map<string, { url: string; isExecuted: boolean; lastUpdated: number }>;
  lastUpdated: number;
}>();

export default function VestingAdmin({ 
  setView, 
  setActiveItem, 
  contractAddress, 
  contractABI, 
  title 
}: VestingAdminProps) {
  // Initialize with cached data if available
  const cachedData = vestingDataCache.get(contractAddress);
  
  // Initialize Safe TxHash cache if not exists
  if (cachedData && !cachedData.safeTxHashCache) {
    cachedData.safeTxHashCache = new Map();
  }
  
  const [vestingData, setVestingData] = useState<VestingItem[]>(cachedData?.vestingData || []);
  const [loading, setLoading] = useState(false);
  const [ongoingTransaction, setOngoingTransaction] = useState(false);
  const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);
  const [createVestingTransactions, setCreateVestingTransactions] = useState<any[]>(cachedData?.createVestingTransactions || []);
  const [releaseToTransactions, setReleaseToTransactions] = useState<any[]>(cachedData?.releaseToTransactions || []);
  const [currentUserAddress, setCurrentUserAddress] = useState<string | null>(null);
  const [refreshingPending, setRefreshingPending] = useState(false);
  const [clickedAddress, setClickedAddress] = useState<string | null>(null);
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);
  const [clickedCandidateAddress, setClickedCandidateAddress] = useState<string | null>(null);
  const [copiedCandidateMessage, setCopiedCandidateMessage] = useState<string | null>(null);

  // Function to copy address to clipboard
  const handleCopyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedMessage(address);
      setTimeout(() => setCopiedMessage(null), 2000);
    } catch (err) {
      logger.error('Failed to copy address', err);
    }
  };

  // Function to copy candidate address to clipboard
  const handleCopyCandidateAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedCandidateMessage(address);
      setTimeout(() => setCopiedCandidateMessage(null), 2000);
    } catch (err) {
      logger.error('Failed to copy candidate address', err);
    }
  };

  // Function to update cache
  const updateCache = (vestingData: VestingItem[], createVestingTxs: any[], releaseToTxs: any[]) => {
    const existingCache = vestingDataCache.get(contractAddress);
    vestingDataCache.set(contractAddress, {
      vestingData,
      createVestingTransactions: createVestingTxs,
      releaseToTransactions: releaseToTxs,
      safeTxHashCache: existingCache?.safeTxHashCache || new Map(),
      lastUpdated: Date.now()
    });
  };

  // Function to check if cache is stale (older than 5 minutes)
  const isCacheStale = () => {
    const cached = vestingDataCache.get(contractAddress);
    if (!cached) return true;
    return Date.now() - cached.lastUpdated > 5 * 60 * 1000; // 5 minutes
  };

  async function fetchCurrentUserAddress() {
    if (!(window as any).ethereum) {
      logger.error("MetaMask is not installed");
      return;
    }
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      logger.debug("Current user address", address);
      setCurrentUserAddress(address);
    } catch (error) {
      logger.error("Error fetching current user address", error);
    }
  }

  async function handleConfirmTransaction(tx: any) {
    if (!(window as any).ethereum) {
      logger.error("MetaMask is not installed");
      return;
    }

    logger.transactionStart('transaction confirmation', tx.safeTxHash);

    setOngoingTransaction(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();
      
      logger.networkInfo(network.name, network.chainId.toString());

      // Get the RPC URL for the provider
      let rpcUrl = "";
      switch (BigInt(network.chainId)) {
        case BigInt(bsc.id):
          rpcUrl = process.env.REACT_APP_RPC_BSC_MAINNET || '';
          break;
        case BigInt(bscTestnet.id):
          rpcUrl = process.env.REACT_APP_RPC_BSC_TESTNET || '';
          break;
        default:
          rpcUrl = process.env.REACT_APP_RPC_BSC_MAINNET || '';
          logger.warn('Unsupported network detected, defaulting to BSC Mainnet.');
      }

      if (!rpcUrl) {
        throw new Error(`No RPC URL configured for network ${network.name}`);
      }

      // Use the safe address from environment if tx.safeAddress is not available
      const safeAddressToUse = tx.safeAddress || process.env.REACT_APP_SAFE_WALLET;
      
      if (!safeAddressToUse) {
        throw new Error("No safe address available. Please check REACT_APP_SAFE_WALLET environment variable.");
      }

      // Create Safe client with proper configuration
      const safeClient = await createSafeClient({
        provider: window.ethereum,
        signer: await signer.getAddress(),
        safeAddress: safeAddressToUse,
        apiKey: process.env.REACT_APP_SAFE_API_KEY,
      });

      logger.debug('Confirming transaction', { 
        safeTxHash: tx.safeTxHash, 
        safeAddress: safeAddressToUse 
      });

      const txResponse = await safeClient.confirm({
        safeTxHash: tx.safeTxHash,
      });

      logger.transactionSuccess('transaction confirmation', tx.safeTxHash);

      // Check if auto-execution is enabled
      logger.debug('Checking auto-execution setting', process.env.REACT_APP_AUTO_EXECUTE_ENABLED);
      
      if (process.env.REACT_APP_AUTO_EXECUTE_ENABLED === 'true') {
        logger.info('Auto-execution is enabled, checking threshold...');
        
        // Poll for confirmation threshold
        const maxAttempts = 10;
        let attempt = 0;
        let found = false;
        let updatedTx = null;
        let delay = 1000; // Start with 1 second delay
        
        while (attempt < maxAttempts && !found) {
          try {
            const pendingTxs = await safeClient.getPendingTransactions();
            updatedTx = pendingTxs.results.find((t: any) => t.safeTxHash === tx.safeTxHash);
            
            if (updatedTx && updatedTx.confirmations && updatedTx.confirmations.length >= updatedTx.confirmationsRequired) {
              found = true;
              logger.info(`Confirmation threshold reached! Confirmations: ${updatedTx.confirmations.length}/${updatedTx.confirmationsRequired}`);
            } else {
              logger.debug(`Polling attempt ${attempt + 1}/${maxAttempts} (delay: ${delay}ms)`);
              await new Promise(resolve => setTimeout(resolve, delay));
              delay = Math.min(delay * 2, 4000); // exponential backoff, max 4s
            }
          } catch (pollError) {
            logger.error("Error polling for confirmation threshold", pollError);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay = Math.min(delay * 2, 4000); // exponential backoff, max 4s
          }
          attempt++;
        }
        
        if (found && updatedTx) {
          logger.info(`Auto-executing transaction ${tx.safeTxHash} after confirmation threshold reached`);
          await handleExecuteTransaction(updatedTx, true); // true indicates auto-execution
          alert("Transaction completed successfully");
        } else {
          logger.warn(`Transaction ${tx.safeTxHash} confirmation threshold not reached within timeout period`);
          alert("Transaction confirmed");
        }
      } else {
        alert("Transaction confirmed");
      }
      
      fetchPendingTransactions(); // Refresh the list of pending transactions
    } catch (error: any) {
      logger.transactionError('transaction confirmation', error, tx.safeTxHash);
      alert(`Confirmation failed: ${error.message}`);
    } finally {
      setOngoingTransaction(false);
    }
  }

  async function handleExecuteTransaction(tx: any, isAutoExecution: boolean = false) {
    if (!(window as any).ethereum) {
      logger.error("MetaMask is not installed");
      return;
    }

    logger.transactionStart('transaction execution', tx.safeTxHash);

    setOngoingTransaction(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();
      
      logger.networkInfo(network.name, network.chainId.toString());

      // Get the RPC URL for the provider
      let rpcUrl = "";
      switch (BigInt(network.chainId)) {
        case BigInt(bsc.id):
          rpcUrl = process.env.REACT_APP_RPC_BSC_MAINNET || '';
          break;
        case BigInt(bscTestnet.id):
          rpcUrl = process.env.REACT_APP_RPC_BSC_TESTNET || '';
          break;
        default:
          rpcUrl = process.env.REACT_APP_RPC_BSC_MAINNET || '';
          logger.warn('Unsupported network detected, defaulting to BSC Mainnet.');
      }

      if (!rpcUrl) {
        throw new Error(`No RPC URL configured for network ${network.name}`);
      }

      // Use the safe address from environment if tx.safeAddress is not available
      const safeAddressToUse = tx.safeAddress || process.env.REACT_APP_SAFE_WALLET;
      
      if (!safeAddressToUse) {
        throw new Error("No safe address available. Please check REACT_APP_SAFE_WALLET environment variable.");
      }

      // Create Safe instance using Core SDK
      const safe = await Safe.init({
        provider: window.ethereum,
        signer: await signer.getAddress(),
        safeAddress: safeAddressToUse,
      });

      logger.debug('Executing transaction', { safeTxHash: tx.safeTxHash });

      const txResponse = await safe.executeTransaction(tx.safeTxHash);

      logger.transactionSuccess('transaction execution', tx.safeTxHash);

      // Refresh data after execution
      logger.info('Refreshing data after execution');
      fetchPendingTransactions();
      fetchVestingData();

      alert("Transaction executed");
    } catch (error: any) {
      logger.transactionError('transaction execution', error, tx.safeTxHash);
      alert(`Execution failed: ${error.message}`);
    } finally {
      setOngoingTransaction(false);
    }
  }

  async function fetchVestingData() {
    if (!(window as any).ethereum) {
      logger.error("MetaMask is not installed");
      return;
    }

    logger.dataFetch('vesting data', undefined);

    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const contract = new ethers.Contract(contractAddress, contractABI, provider);

      logger.debug('Fetching vesting data', { title, contractAddress });

      // Get all beneficiaries from VestingScheduleCreated events
      const events = await contract.queryFilter(contract.filters.VestingScheduleCreated());
      logger.debug('Raw events found', events.length);
      const beneficiaries = [...new Set(events.map((event: any) => event.args.beneficiary))];

      logger.dataFetch('beneficiaries', beneficiaries.length);

      // Get global start time
      const globalStartTime = await contract.globalStartTime();
      logger.debug('Global start time', globalStartTime.toString());

      const schedules = await Promise.all(beneficiaries.map(async (beneficiary: string, index: number) => {
        const schedule = await contract.vestingSchedules(beneficiary);
        const currentlyReleasable = await contract.getCurrentlyReleasableAmount(beneficiary);

        let status = "Pending";
        if (schedule.releasedAmount > 0 && schedule.releasedAmount < schedule.totalAmount) {
            status = "In Progress";
        } else if (schedule.releasedAmount > 0 && schedule.releasedAmount === schedule.totalAmount) {
            status = "Completed";
        }

        // Calculate local releasable amount for comparison
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const localReleasable = getCurrentlyReleasableAmountLocal(
          schedule,
          globalStartTime,
          currentTimestamp
        );

        logger.debug(`Beneficiary ${beneficiary}`, {
          totalAmount: schedule.totalAmount.toString(),
          releasedAmount: schedule.releasedAmount.toString(),
          currentlyReleasable: currentlyReleasable.toString(),
          localReleasable: localReleasable.toString(),
          status
        });

        // Initial release status - will be updated by useEffect
        const initialReleaseStatus = currentlyReleasable > 0 ? "Available" : "Not Available";

        return {
          address: beneficiary,
          totalVesting: Number(ethers.formatUnits(schedule.totalAmount, 18)),
          totalPayout: Number(ethers.formatUnits(schedule.releasedAmount, 18)),
          currentRelease: Number(ethers.formatUnits(currentlyReleasable, 18)),
          status: status,
          releaseStatus: initialReleaseStatus, // Will be updated by useEffect
          safeTxHash: undefined, // Will be populated by useEffect
          safeAddress: undefined, // Will be populated by useEffect
        };
      }));

      // Sort by release status (Available first), then by total vesting amount (descending)
      const sortedSchedules = schedules.sort((a, b) => {
        // First priority: Available status
        if (a.releaseStatus === "Available" && b.releaseStatus !== "Available") return -1;
        if (b.releaseStatus === "Available" && a.releaseStatus !== "Available") return 1;
        
        // Second priority: total vesting amount (descending)
        return b.totalVesting - a.totalVesting;
      });

      logger.dataFetch('vesting schedules', sortedSchedules.length);
      
      setVestingData(sortedSchedules);
      
      // Update cache with new data
      updateCache(sortedSchedules, createVestingTransactions, releaseToTransactions);
      
      logger.transactionSuccess('vesting data fetch');
      
    } catch (error: any) {
      logger.error("Error fetching vesting data", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPendingTransactions() {
    const safeAddress = process.env.REACT_APP_SAFE_WALLET;
    if (!safeAddress) {
      logger.warn('Safe wallet address not configured');
      return;
    }

    if (!window.ethereum) {
      logger.warn('MetaMask not installed');
      return;
    }

    // If we have cached pending transactions and it's not stale, don't fetch again
    if (!isCacheStale() && createVestingTransactions.length > 0) {
      logger.debug(`Using cached pending transactions for ${title} vesting`);
      return;
    }

    setRefreshingPending(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Create Safe client with proper configuration
      const safeClient = await createSafeClient({
        provider: window.ethereum,
        signer: await signer.getAddress(),
        safeAddress: safeAddress,
        apiKey: process.env.REACT_APP_SAFE_API_KEY,
      });

      const pendingTxs = await safeClient.getPendingTransactions();
      
      // Log the complete Safe API response
      console.log('=== PENDING TRANSACTIONS SAFE API RESPONSE ===');
      console.log('Full response:', JSON.stringify(pendingTxs, null, 2));
      console.log('Results count:', pendingTxs.results?.length || 0);
      
      if (pendingTxs.results && pendingTxs.results.length > 0) {
        const sampleTx = pendingTxs.results[0] as any;
        console.log('Sample transaction structure:', JSON.stringify(sampleTx, null, 2));
        console.log('Sample transaction keys:', Object.keys(sampleTx));
        console.log('Sample transaction hash properties:', {
          id: sampleTx.id,
          safeTxHash: sampleTx.safeTxHash,
          transactionHash: sampleTx.transactionHash,
          txHash: sampleTx.txHash,
          hash: sampleTx.hash
        });
      }
      
      // Filter transactions by contract address first
      const contractTxs = (pendingTxs.results || []).filter((tx: any) => 
        tx.to?.toLowerCase() === contractAddress.toLowerCase()
      );
      
      console.log('Contract address filter:', contractAddress);
      console.log('Filtered contract transactions:', contractTxs.length);
      if (contractTxs.length > 0) {
        console.log('Sample contract transaction:', JSON.stringify(contractTxs[0], null, 2));
      }

      // Then filter by method (check both dataDecoded and raw data)
      const createVestingTxs = contractTxs.filter((tx: any) => {
        // Check if method is createVestingSchedule
        if (tx.dataDecoded?.method === 'createVestingSchedule') {
          console.log('Found createVestingSchedule via dataDecoded:', (tx as any).id);
          return true;
        }
        // Check raw data for createVestingSchedule function signature
        if (tx.data && tx.data.startsWith('0x')) {
          // createVestingSchedule function signature hash
          const createVestingSignature = '0x' + ethers.id('createVestingSchedule(address,uint256,uint256,uint256,uint256)').slice(2, 10);
          if (tx.data.startsWith(createVestingSignature)) {
            console.log('Found createVestingSchedule via raw data:', (tx as any).id);
            return true;
          }
        }
        return false;
      });
      
      console.log('Create vesting transactions found:', createVestingTxs.length);
      if (createVestingTxs.length > 0) {
        const sampleTx = createVestingTxs[0] as any;
        console.log('Sample create vesting transaction:', JSON.stringify(sampleTx, null, 2));
        console.log('Create vesting transaction hash mapping:', {
          originalId: sampleTx.id,
          originalSafeTxHash: sampleTx.safeTxHash,
          originalTransactionHash: sampleTx.transactionHash,
          mappedSafeTxHash: sampleTx.safeTxHash || sampleTx.id || sampleTx.transactionHash
        });
      }

      const releaseToTxs = contractTxs.filter((tx: any) => {
        // Check if method is releaseTo
        if (tx.dataDecoded?.method === 'releaseTo') {
          return true;
        }
        // Check raw data for releaseTo function signature
        if (tx.data && tx.data.startsWith('0x')) {
          // releaseTo function signature hash
          const releaseToSignature = '0x' + ethers.id('releaseTo(address)').slice(2, 10);
          if (tx.data.startsWith(releaseToSignature)) {
            return true;
          }
        }
        return false;
      });

      // Only update state if there are actual changes
      setPendingTransactions(prev => {
        const newTxs = pendingTxs.results || [];
        const hasChanged = JSON.stringify(prev) !== JSON.stringify(newTxs);
        if (hasChanged) {
          logger.dataFetch('pending transactions', newTxs.length);
        }
        return newTxs;
      });

      // Update create vesting transactions with smart comparison
      setCreateVestingTransactions(prev => {
        let newTxs = createVestingTxs.map((tx: any) => ({
          ...tx,
          safeTxHash: tx.safeTxHash || tx.id || tx.transactionHash
        }));
        
        // If we found transactions for this contract but couldn't categorize them, 
        // show them all in the createVesting section as a fallback
        if (contractTxs.length > 0 && createVestingTxs.length === 0 && releaseToTxs.length === 0) {
          newTxs = contractTxs.map((tx: any) => ({
            ...tx,
            safeTxHash: tx.safeTxHash || tx.id || tx.transactionHash
          }));
        }
        
        console.log('=== FINAL PENDING TRANSACTIONS FOR TABLE ===');
        console.log('Total pending transactions:', newTxs.length);
        if (newTxs.length > 0) {
          console.log('Sample pending transaction for table:', JSON.stringify(newTxs[0], null, 2));
          console.log('Pending transaction safeTxHash for display:', newTxs[0].safeTxHash);
        }
        
        const hasChanged = JSON.stringify(prev) !== JSON.stringify(newTxs);
        if (hasChanged) {
          logger.dataFetch('create vesting transactions', newTxs.length);
        }
        return newTxs;
      });
      
      // Also fetch executed transactions to show completed vesting schedule creations
      fetchExecutedTransactions();

      // Update release to transactions with smart comparison
      setReleaseToTransactions(prev => {
        const releaseTxsWithHash = releaseToTxs.map((tx: any) => ({
          ...tx,
          safeTxHash: tx.safeTxHash || tx.id || tx.transactionHash
        }));
        
        const hasChanged = JSON.stringify(prev) !== JSON.stringify(releaseTxsWithHash);
        if (hasChanged) {
          logger.dataFetch('release to transactions', releaseTxsWithHash.length);
        }
        return releaseTxsWithHash;
      });

      // Update cache with new pending transaction data
      updateCache(vestingData, createVestingTxs.length > 0 ? createVestingTxs : contractTxs, releaseToTxs);

    } catch (error: any) {
      logger.error("Error fetching pending transactions", error);
    } finally {
      setRefreshingPending(false);
    }
  }

  async function fetchExecutedTransactions() {
    const safeAddress = process.env.REACT_APP_SAFE_WALLET;
    if (!safeAddress) {
      logger.warn('Safe wallet address not configured');
      return;
    }

    if (!window.ethereum) {
      logger.warn('MetaMask not installed');
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      
      // Get the chain ID for the Safe API
      const chainId = network.chainId.toString();
      
      // Determine the correct Safe API URL based on network
      let safeApiUrl;
      if (chainId === '56' || chainId === '0x38') { // BSC Mainnet
        safeApiUrl = `https://safe-transaction-bsc.safe.global/api/v1/safes/${safeAddress}/multisig-transactions/`;
      } else if (chainId === '97' || chainId === '0x61') { // BSC Testnet
        safeApiUrl = `https://safe-transaction-bsc.safe.global/api/v1/safes/${safeAddress}/multisig-transactions/`;
      } else { // Default to mainnet
        safeApiUrl = `https://safe-transaction-mainnet.safe.global/api/v1/safes/${safeAddress}/multisig-transactions/`;
      }
      
      const response = await fetch(`${safeApiUrl}?executed=true&limit=100`);
      
      if (!response.ok) {
        logger.warn('Failed to fetch executed transactions from Safe API');
        return;
      }
      
      const data = await response.json();
      const executedTxs = data.results || [];
      
      // Log the complete Safe API response for executed transactions
      console.log('=== EXECUTED TRANSACTIONS SAFE API RESPONSE ===');
      console.log('API URL used:', safeApiUrl);
      console.log('Response status:', response.status);
      console.log('Full response:', JSON.stringify(data, null, 2));
      console.log('Results count:', executedTxs.length);
      
      if (executedTxs.length > 0) {
        const sampleTx = executedTxs[0] as any;
        console.log('Sample executed transaction structure:', JSON.stringify(sampleTx, null, 2));
        console.log('Sample executed transaction keys:', Object.keys(sampleTx));
        console.log('Sample executed transaction hash properties:', {
          id: sampleTx.id,
          safeTxHash: sampleTx.safeTxHash,
          transactionHash: sampleTx.transactionHash,
          txHash: sampleTx.txHash,
          hash: sampleTx.hash
        });
      }
      
      // Filter transactions by contract address
      const contractTxs = executedTxs.filter((tx: any) => 
        tx.to?.toLowerCase() === contractAddress.toLowerCase()
      );
      
      console.log('Executed contract address filter:', contractAddress);
      console.log('Filtered executed contract transactions:', contractTxs.length);
      if (contractTxs.length > 0) {
        console.log('Sample executed contract transaction:', JSON.stringify(contractTxs[0], null, 2));
      }
      
      // Filter by createVestingSchedule method
      const createVestingTxs = contractTxs.filter((tx: any) => {
        if (tx.dataDecoded?.method === 'createVestingSchedule') {
          console.log('Found executed createVestingSchedule via dataDecoded:', (tx as any).id);
          return true;
        }
        if (tx.data && tx.data.startsWith('0x')) {
          const createVestingSignature = '0x' + ethers.id('createVestingSchedule(address,uint256,uint256,uint256,uint256)').slice(2, 10);
          if (tx.data.startsWith(createVestingSignature)) {
            console.log('Found executed createVestingSchedule via raw data:', (tx as any).id);
            return true;
          }
        }
        return false;
      });
      
      console.log('Executed create vesting transactions found:', createVestingTxs.length);
      if (createVestingTxs.length > 0) {
        const sampleTx = createVestingTxs[0] as any;
        console.log('Sample executed create vesting transaction:', JSON.stringify(sampleTx, null, 2));
        console.log('Executed create vesting transaction hash mapping:', {
          originalId: sampleTx.id,
          originalSafeTxHash: sampleTx.safeTxHash,
          originalTransactionHash: sampleTx.transactionHash,
          mappedSafeTxHash: sampleTx.safeTxHash || sampleTx.id || sampleTx.transactionHash
        });
      }
      
      // Filter by releaseTo method (executed releases for active schedules)
      const executedReleaseTxs = contractTxs.filter((tx: any) => {
        if (tx.dataDecoded?.method === 'releaseTo') {
          return true;
        }
        if (tx.data && tx.data.startsWith('0x')) {
          const releaseToSignature = '0x' + ethers.id('releaseTo(address)').slice(2, 10);
          if (tx.data.startsWith(releaseToSignature)) {
            return true;
          }
        }
        return false;
      });

      // Keep track of merged create vesting transactions for cache updates
      let mergedCreateVestingTxs: any[] | null = null;

      // Merge executed transactions with existing pending transactions
      setCreateVestingTransactions(prev => {
        // Create a map of existing transactions by safeTxHash to avoid duplicates
        const existingTxs = new Map(prev.map(tx => [tx.safeTxHash || tx.id, tx]));
        
        // Add executed createVestingSchedule transactions that aren't already in the list
        createVestingTxs.forEach((tx: any) => {
          // Use safeTxHash if available, otherwise use id or transactionHash
          const txId = tx.safeTxHash || tx.id || tx.transactionHash;
          if (txId && !existingTxs.has(txId)) {
            // Ensure the transaction has a safeTxHash property for consistency
            const txWithHash = {
              ...tx,
              safeTxHash: tx.safeTxHash || tx.id || tx.transactionHash
            };
            existingTxs.set(txId, txWithHash);
          }
        });
        const mergedTxs = Array.from(existingTxs.values());
        mergedCreateVestingTxs = mergedTxs;
        
        console.log('=== FINAL MERGED TRANSACTIONS FOR TABLE ===');
        console.log('Total merged transactions:', mergedTxs.length);
        if (mergedTxs.length > 0) {
          console.log('Sample merged transaction for table:', JSON.stringify(mergedTxs[0], null, 2));
          console.log('Merged transaction safeTxHash for display:', mergedTxs[0].safeTxHash);
        }
        
        const hasChanged = JSON.stringify(prev) !== JSON.stringify(mergedTxs);
        if (hasChanged) {
          logger.dataFetch('executed create vesting transactions', createVestingTxs.length);
        }
        return mergedTxs;
      });

      // Map the latest executed release transaction to each beneficiary
      const latestReleaseTxs = new Map<string, { tx: any; timestamp: number }>();
      executedReleaseTxs.forEach((tx: any) => {
        const beneficiaryAddress = getBeneficiaryAddress(tx);
        if (!beneficiaryAddress) {
          return;
        }
        const normalizedAddress = beneficiaryAddress.toLowerCase();
        const executionTimestamp = tx.executionDate ? new Date(tx.executionDate).getTime() : 0;
        const existingEntry = latestReleaseTxs.get(normalizedAddress);

        if (!existingEntry || executionTimestamp >= existingEntry.timestamp) {
          latestReleaseTxs.set(normalizedAddress, {
            tx,
            timestamp: executionTimestamp,
          });
        }
      });

      // Map the executed createVestingSchedule transactions to each beneficiary
      const createVestingTxsMap = new Map<string, { tx: any; timestamp: number }>();
      createVestingTxs.forEach((tx: any) => {
        const beneficiaryAddress = getBeneficiaryAddress(tx);
        if (!beneficiaryAddress) {
          return;
        }
        const normalizedAddress = beneficiaryAddress.toLowerCase();
        const executionTimestamp = tx.executionDate ? new Date(tx.executionDate).getTime() : 0;
        createVestingTxsMap.set(normalizedAddress, {
          tx,
          timestamp: executionTimestamp,
        });
      });
      
      console.log('=== VESTING SCHEDULE TRANSACTION MAPPING ===');
      console.log('Release transactions mapped:', latestReleaseTxs.size);
      console.log('CreateVesting transactions mapped:', createVestingTxsMap.size);
      if (createVestingTxsMap.size > 0) {
        console.log('Sample createVesting mapping:', Array.from(createVestingTxsMap.entries())[0]);
      }

      // Update vesting data with executed transaction hashes (both release and createVestingSchedule)
      let updatedVestingData: VestingItem[] | null = null;
      if (latestReleaseTxs.size > 0 || createVestingTxsMap.size > 0) {
        setVestingData(prev => {
          let hasChanges = false;
          const updated = prev.map(item => {
            const releaseEntry = latestReleaseTxs.get(item.address.toLowerCase());
            const createEntry = createVestingTxsMap.get(item.address.toLowerCase());
            
            // Prioritize release transaction hash if available, otherwise use createVestingSchedule hash
            const txEntry = releaseEntry || createEntry;
            if (!txEntry || !txEntry.tx.safeTxHash) {
              return item;
            }

            const safeAddr = process.env.REACT_APP_SAFE_WALLET || txEntry.tx.safeAddress || item.safeAddress;
            const shouldUpdate =
              item.safeTxHash !== txEntry.tx.safeTxHash || item.safeAddress !== safeAddr;

            if (!shouldUpdate) {
              return item;
            }

            hasChanges = true;
            return {
              ...item,
              safeTxHash: txEntry.tx.safeTxHash,
              safeAddress: safeAddr,
            };
          });

          if (hasChanges) {
            updatedVestingData = updated;
            return updated;
          }

          return prev;
        });
      }

      if (updatedVestingData) {
        updateCache(
          updatedVestingData,
          mergedCreateVestingTxs || createVestingTransactions,
          releaseToTransactions
        );
      }
      
      logger.info(`Fetched ${createVestingTxs.length} executed createVesting transactions`);

    } catch (error: any) {
      logger.error("Error fetching executed transactions", error);
    }
  }

  useEffect(() => {
    fetchCurrentUserAddress();
    
    // Always use cached data if available, regardless of staleness
    if (cachedData && cachedData.vestingData.length > 0) {
      logger.debug(`Using cached data for ${title} vesting`);
      setVestingData(cachedData.vestingData);
      setCreateVestingTransactions(cachedData.createVestingTransactions);
      setReleaseToTransactions(cachedData.releaseToTransactions);
    } else {
      // Only fetch if no cached data exists
      fetchVestingData();
      fetchPendingTransactions();
    }
    
    // Always fetch executed transactions to populate Safe TxHash for completed transactions
    // This will be called from fetchPendingTransactions as well
    fetchExecutedTransactions();
  }, [contractAddress, contractABI]);

  // Set up periodic refresh for pending transactions (every 10 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPendingTransactions();
      // Also refresh executed transactions periodically
      fetchExecutedTransactions();
    }, 10000); // 10 seconds instead of full page refresh

    return () => clearInterval(interval);
  }, [contractAddress]);

  // Set up scheduler for automatic vesting data refresh (every 5 minutes)
  useEffect(() => {
    const scheduler = setInterval(() => {
      logger.info(`Scheduled refresh for ${title} vesting data`);
      fetchVestingData();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(scheduler);
  }, [contractAddress, contractABI, title]);

  useEffect(() => {
    // Update release status for each vesting item based on pending transactions
    setVestingData(prevData => 
      prevData.map(item => {
        const pendingTx = releaseToTransactions.find(tx => 
          getBeneficiaryAddress(tx)?.toLowerCase() === item.address.toLowerCase()
        );
        
        if (pendingTx) {
          const hasConfirmed = pendingTx.confirmations?.some((c: any) => 
            c.owner.toLowerCase() === currentUserAddress?.toLowerCase()
          );
          const isInitiator = pendingTx.origin?.toLowerCase() === currentUserAddress?.toLowerCase();
          
          return {
            ...item,
            releaseStatus: `${pendingTx.confirmations?.length || 0}/${pendingTx.confirmationsRequired || 0}`,
            pendingReleaseTx: pendingTx,
            confirmations: pendingTx.confirmations,
            confirmationsRequired: pendingTx.confirmationsRequired,
            isExecuted: pendingTx.isExecuted,
            origin: pendingTx.origin,
            safeTxHash: pendingTx.safeTxHash,
            safeAddress: pendingTx.safeAddress
          };
        }
        
        // For items without pending transactions, try to find executed transactions
        // This would require fetching from Safe API or blockchain events
        // For now, we'll show the basic status
        return {
          ...item,
          releaseStatus: item.currentRelease > 0 ? "Available" : "Not Available",
          pendingReleaseTx: undefined,
          confirmations: undefined,
          confirmationsRequired: undefined,
          isExecuted: undefined,
          origin: undefined,
          safeTxHash: undefined,
          safeAddress: undefined
        };
      })
    );
  }, [releaseToTransactions, currentUserAddress]);

  function getVestingAmount(tx: any) {
    try {
      if (tx.dataDecoded?.parameters) {
        const totalAmountParam = tx.dataDecoded.parameters.find((p: any) => p.name === 'totalAmount');
        if (totalAmountParam) {
          return `${Number(ethers.formatUnits(totalAmountParam.value, 18)).toFixed(2)}`;
        }
      }
      // If we can't decode, show the raw data length as a fallback
      if (tx.data && tx.data.length > 10) {
        return "Transaction data available";
      }
      return "Unknown amount";
    } catch (error) {
      return "Error parsing amount";
    }
  }

  function getBeneficiary(tx: any) {
    try {
      logger.beneficiaryExtraction(tx.safeTxHash, 'getBeneficiary');
      
      // First try to get from decoded parameters
      if (tx.dataDecoded?.parameters) {
        logger.debug('Checking decoded parameters', tx.dataDecoded.parameters);
        
        // Look for beneficiary parameter
        const beneficiaryParam = tx.dataDecoded.parameters.find((p: any) => p.name === 'beneficiary');
        if (beneficiaryParam && beneficiaryParam.value) {
          logger.beneficiaryFound('beneficiary parameter', beneficiaryParam.value);
          return beneficiaryParam.value;
        }
        
        // Try alternative parameter names
        const addressParam = tx.dataDecoded.parameters.find((p: any) => 
          p.name === 'address' || p.name === 'to' || p.name === 'recipient' || p.name === 'user'
        );
        if (addressParam && addressParam.value) {
          logger.beneficiaryFound('address parameter', addressParam.value);
          return addressParam.value;
        }
        
        // Look for any parameter that looks like an address (starts with 0x and is 42 chars)
        const addressLikeParam = tx.dataDecoded.parameters.find((p: any) => 
          p.value && typeof p.value === 'string' && p.value.startsWith('0x') && p.value.length === ETHEREUM_ADDRESS_LENGTH
        );
        if (addressLikeParam && addressLikeParam.value) {
          logger.beneficiaryFound('address-like parameter', addressLikeParam.value);
          return addressLikeParam.value;
        }
      }
      
      // Try to extract from raw transaction data if available
      if (tx.to && tx.to !== '0x0000000000000000000000000000000000000000') {
        logger.beneficiaryFound('tx.to', tx.to);
        return tx.to;
      }
      
      // Try to extract from origin
      if (tx.origin && tx.origin !== '0x0000000000000000000000000000000000000000') {
        logger.beneficiaryFound('tx.origin', tx.origin);
        return tx.origin;
      }
      
      // If we can't decode, try to extract from raw data
      if (tx.data && tx.data.length > 10) {
        logger.beneficiaryFallback(tx.safeTxHash, 'Contract transaction');
        return "Contract transaction";
      }
      
      // Fallback: use safeTxHash as unique identifier if no address found
      if (tx.safeTxHash) {
        const fallbackId = `Tx-${tx.safeTxHash.slice(0, 8)}`;
        logger.beneficiaryFallback(tx.safeTxHash, fallbackId);
        return fallbackId;
      }
      
      logger.warn('No address found for transaction', tx.safeTxHash);
      return "Unknown address";
    } catch (error) {
      logger.error("Error parsing beneficiary address", error);
      return "Error parsing address";
    }
  }

  function getBeneficiaryAddress(tx: any): string | null {
    try {
      // First try to get from decoded parameters
      if (tx.dataDecoded?.parameters) {
        // Look for beneficiary parameter
        const beneficiaryParam = tx.dataDecoded.parameters.find((p: any) => p.name === 'beneficiary');
        if (beneficiaryParam && beneficiaryParam.value) {
          return beneficiaryParam.value;
        }
        
        // Try alternative parameter names
        const addressParam = tx.dataDecoded.parameters.find((p: any) => 
          p.name === 'address' || p.name === 'to' || p.name === 'recipient' || p.name === 'user'
        );
        if (addressParam && addressParam.value) {
          return addressParam.value;
        }
        
        // Look for any parameter that looks like an address (starts with 0x and is 42 chars)
        const addressLikeParam = tx.dataDecoded.parameters.find((p: any) => 
          p.value && typeof p.value === 'string' && p.value.startsWith('0x') && p.value.length === ETHEREUM_ADDRESS_LENGTH
        );
        if (addressLikeParam && addressLikeParam.value) {
          return addressLikeParam.value;
        }
      }
      
      // Try to extract from raw transaction data if available
      if (tx.to && tx.to !== '0x0000000000000000000000000000000000000000') {
        return tx.to;
      }
      
      // Try to extract from origin
      if (tx.origin && tx.origin !== '0x0000000000000000000000000000000000000000') {
        return tx.origin;
      }
      
      // Fallback: use safeTxHash as unique identifier if no address found
      if (tx.safeTxHash) {
        return `Tx-${tx.safeTxHash.slice(0, 8)}`;
      }
      
      return null;
    } catch (error) {
      logger.error("Error parsing beneficiary address", error);
      return null;
    }
  }

  async function handleRelease(beneficiaryAddress: string) {
    if (!(window as any).ethereum) {
      logger.error("MetaMask is not installed");
      return;
    }

    logger.transactionStart('release transaction creation', undefined);

    setOngoingTransaction(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();
      
      logger.networkInfo(network.name, network.chainId.toString());

      // Get the RPC URL for the provider
      let rpcUrl = "";
      switch (BigInt(network.chainId)) {
        case BigInt(bsc.id):
          rpcUrl = process.env.REACT_APP_RPC_BSC_MAINNET || '';
          break;
        case BigInt(bscTestnet.id):
          rpcUrl = process.env.REACT_APP_RPC_BSC_TESTNET || '';
          break;
        default:
          rpcUrl = process.env.REACT_APP_RPC_BSC_MAINNET || '';
          logger.warn('Unsupported network detected, defaulting to BSC Mainnet.');
      }

      if (!rpcUrl) {
        throw new Error(`No RPC URL configured for network ${network.name}`);
      }

      // Use the safe address from environment
      const safeAddressToUse = process.env.REACT_APP_SAFE_WALLET;
      
      if (!safeAddressToUse) {
        throw new Error("No safe address available. Please check REACT_APP_SAFE_WALLET environment variable.");
      }

      // Create Safe client with proper configuration
      const safeClient = await createSafeClient({
        provider: window.ethereum,
        signer: await signer.getAddress(),
        safeAddress: safeAddressToUse,
        apiKey: process.env.REACT_APP_SAFE_API_KEY,
      });

      // Create the transaction data for releaseTo function
      const releaseToData = {
        to: contractAddress,
        value: '0',
        data: new ethers.Interface(contractABI).encodeFunctionData('releaseTo', [beneficiaryAddress]),
      };

      logger.debug('Creating release transaction', { 
        beneficiaryAddress, 
        contractAddress, 
        releaseToData 
      });

      const txResponse = await safeClient.send({ transactions: [releaseToData] });

      logger.transactionSuccess('release transaction creation');

      alert("Release transaction created");
      
      // Refresh pending transactions to show the new transaction
      fetchPendingTransactions();
    } catch (error: any) {
      logger.transactionError('release transaction creation', error);
      alert(`Release failed: ${error.message}`);
    } finally {
      setOngoingTransaction(false);
    }
  }

  return (
    <div className="relative size-full">
      <div>
        <div className="flex justify-between items-center mb-4 p-6">
          <div className="font-['Nunito:Bold',_sans-serif] font-bold text-[#030229] text-[24px]">
            <p>{title} Vesting Status</p>
          </div>
        </div>

        {/* Pending Transactions Section */}
        <div className="mx-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Vesting Candidates</h2>
            <button
              onClick={() => {
                fetchPendingTransactions();
                fetchExecutedTransactions();
              }}
              className="bg-[#605bff] text-white px-4 py-2 rounded-lg hover:bg-[#4a47cc] transition-colors text-sm disabled:bg-gray-400"
              disabled={ongoingTransaction || refreshingPending}
            >
              {refreshingPending ? "🔄 Refreshing..." : "🔄 Refresh"}
            </button>
          </div>
          <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
            <table className="w-full text-sm text-left rtl:text-right text-gray-500">
              <thead className="font-['Nunito:Bold',_sans-serif] font-bold text-[#030229] bg-gray-50">
                <tr>
                  <th scope="col" className="py-3 px-6"></th>
                  <th scope="col" className="py-3 px-6 text-left">
                    <div>
                      <div>Address</div>
                    </div>
                  </th>
                  <th scope="col" className="py-3 px-6 text-left">
                    <div>Vesting Amount</div>
                  </th>
                  <th scope="col" className="py-3 px-6 text-left">
                    <div>Transaction Hash</div>
                  </th>
                  <th scope="col" className="py-3 px-6 text-left">
                    <div>
                      <div>Nonce</div>
                    </div>
                  </th>
                  <th scope="col" className="py-3 px-6 text-left">
                    <div>
                      <div>Confirmations</div>
                    </div>
                  </th>
                  <th scope="col" className="py-3 px-6 text-left">
                    <div>
                      <div>Actions</div>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {createVestingTransactions.length > 0 ? (
                  createVestingTransactions.map((tx: any, index: number) => {
                    const beneficiaryAddress = getBeneficiaryAddress(tx);
                    const beneficiary = getBeneficiary(tx);
                    const hasConfirmed = tx.confirmations.some((c: any) => c.owner.toLowerCase() === currentUserAddress?.toLowerCase());
                    const isInitiator = tx.origin?.toLowerCase() === currentUserAddress?.toLowerCase(); // Assuming tx.origin holds the initiator
                    const canConfirm = currentUserAddress && !hasConfirmed && !isInitiator && !tx.isExecuted; // Assuming tx.isExecuted exists
                    
                    // Debug logging for beneficiary addresses
                    logger.debug(`Transaction ${index} debug`, {
                      beneficiaryAddress,
                      beneficiary,
                      txData: tx.dataDecoded,
                      txTo: tx.to,
                      safeTxHash: tx.safeTxHash
                    });

                    return (
                      <tr key={index} className="bg-white border-b hover:bg-gray-50">
                        <td className="py-4 px-6">
                          {beneficiaryAddress && <Jazzicon address={beneficiaryAddress} size={32} />}
                        </td>
                        <td className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setClickedCandidateAddress(clickedCandidateAddress === getBeneficiary(tx) ? null : getBeneficiary(tx))}
                              className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
                              title="Click to show full address"
                            >
                              {clickedCandidateAddress === getBeneficiary(tx) ? getBeneficiary(tx) : truncateAddress(getBeneficiary(tx))}
                            </button>
                            <button
                              onClick={() => handleCopyCandidateAddress(getBeneficiary(tx))}
                              className="p-1 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              title="Copy address"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                            {copiedCandidateMessage === getBeneficiary(tx) && (
                              <span className="text-xs text-green-500">Copied!</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">{getVestingAmount(tx)}</td>
                        <td className="py-4 px-6">
                          {tx.safeTxHash ? (
                        <a
                          href={getSafeTransactionUrlForCandidates(tx.safeTxHash, tx.safeAddress)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-mono text-blue-600 hover:text-blue-800 underline cursor-pointer"
                          title={`View Safe transaction: ${tx.safeTxHash}`}
                        >
                          {formatSafeTxHash(tx.safeTxHash)}
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">No TxHash</span>
                      )}
                    </td>
                        <td className="py-4 px-6">{tx.nonce}</td>
                        <td className="py-4 px-6">{tx.confirmations.length} / {tx.confirmationsRequired}</td>
                        <td className="py-4 px-6">
                          <div className="flex gap-2">
                            {canConfirm ? (
                              <button 
                                onClick={() => handleConfirmTransaction(tx)}
                                className="bg-blue-500 text-white px-3 py-1 rounded-lg disabled:bg-gray-400 text-sm"
                                disabled={ongoingTransaction}
                              >
                                Confirm
                              </button>
                            ) : (
                              <div className="text-sm text-gray-500">
                                {!currentUserAddress && "No wallet connected"}
                                {currentUserAddress && hasConfirmed && "Confirmed"}
                                {currentUserAddress && isInitiator && "You initiated this"}
                                {currentUserAddress && tx.isExecuted && "Already executed"}
                                {currentUserAddress && !hasConfirmed && !isInitiator && !tx.isExecuted && "Can confirm"}
                              </div>
                            )}
                            
                            {/* Execute button - HIDDEN */}
                            {/* {tx.confirmations.length >= tx.confirmationsRequired && !tx.isExecuted && (
                              <button 
                                onClick={() => handleExecuteTransaction(tx, false)}
                                className="bg-green-500 text-white px-3 py-1 rounded-lg disabled:bg-gray-400 text-sm"
                                disabled={ongoingTransaction}
                              >
                                Execute
                              </button>
                            )} */}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-4">No createVesting transactions found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Active Vesting Schedules Section */}
        <div className="mx-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Active Vesting Schedules</h2>
          </div>
          <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
          <table className="w-full text-sm text-left rtl:text-right text-gray-500">
            <thead className="font-['Nunito:Bold',_sans-serif] font-bold text-[#030229] bg-gray-50">
              <tr>
                <th scope="col" className="py-3 px-6"></th>
                <th scope="col" className="py-3 px-6 text-left">
                  <div>
                    <div>Address</div>
                  </div>
                </th>
                <th scope="col" className="py-3 px-6 text-left">
                  <div>Total Vesting</div>
                </th>
                <th scope="col" className="py-3 px-6 text-left">
                  <div>Total Payout</div>
                </th>
                <th scope="col" className="py-3 px-6 text-left">
                  <div>Current Release</div>
                </th>
                <th scope="col" className="py-3 px-6 text-left">
                  <div>Release Status</div>
                </th>
                <th scope="col" className="py-3 px-6 text-left">
                  <div>Transaction Hash</div>
                </th>
                <th scope="col" className="py-3 px-6 text-left">
                  <div>
                    <div>Action</div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-4">Loading...</td></tr>
              ) : vestingData.length > 0 ? (
                vestingData.map((vesting: VestingItem, index: number) => (
                  <tr key={index} className="bg-white border-b hover:bg-gray-50">
                    <td className="py-4 px-6"><Jazzicon address={vesting.address} size={32} /></td>
                    <td className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setClickedAddress(clickedAddress === vesting.address ? null : vesting.address)}
                          className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
                          title="Click to show full address"
                        >
                          {clickedAddress === vesting.address ? vesting.address : truncateAddress(vesting.address)}
                        </button>
                        <button
                          onClick={() => handleCopyAddress(vesting.address)}
                          className="p-1 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          title="Copy address"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        {copiedMessage === vesting.address && (
                          <span className="text-xs text-green-500">Copied!</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">{vesting.totalVesting}</td>
                    <td className="py-4 px-6">{vesting.totalPayout}</td>
                    <td className="py-4 px-6">{vesting.currentRelease}</td>
                    <td className="py-4 px-6">{vesting.releaseStatus}</td>
                    <td className="py-4 px-6">
                      {vesting.safeTxHash ? (
                        <a
                          href={getSafeTransactionUrlForSchedules(vesting.safeTxHash, vesting.safeAddress)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-mono text-blue-600 hover:text-blue-800 underline cursor-pointer"
                          title={`View Safe transaction: ${vesting.safeTxHash}`}
                        >
                          {formatSafeTxHash(vesting.safeTxHash)}
                        </a>
                      ) : vesting.pendingReleaseTx?.safeTxHash ? (
                        <a
                          href={getSafeTransactionUrlForSchedules(vesting.pendingReleaseTx.safeTxHash, vesting.pendingReleaseTx.safeAddress)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-mono text-blue-600 hover:text-blue-800 underline cursor-pointer"
                          title={`View Safe transaction: ${vesting.pendingReleaseTx.safeTxHash}`}
                        >
                          {formatSafeTxHash(vesting.pendingReleaseTx.safeTxHash)}
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {vesting.pendingReleaseTx ? (
                        // Show confirmation buttons for pending transactions
                        <div className="flex gap-2">
                          {vesting.confirmations && vesting.confirmationsRequired && 
                           vesting.confirmations.some((c: any) => c.owner.toLowerCase() === currentUserAddress?.toLowerCase()) ? (
                            <div className="text-sm text-gray-500">Confirmed</div>
                          ) : vesting.origin?.toLowerCase() === currentUserAddress?.toLowerCase() ? (
                            <div className="text-sm text-gray-500">You initiated this</div>
                          ) : vesting.isExecuted ? (
                            <div className="text-sm text-gray-500">Already executed</div>
                          ) : currentUserAddress ? (
                            <button 
                              onClick={() => handleConfirmTransaction(vesting.pendingReleaseTx)}
                              className="bg-blue-500 text-white px-3 py-1 rounded-lg disabled:bg-gray-400 text-sm"
                              disabled={ongoingTransaction}
                            >
                              Confirm
                            </button>
                          ) : (
                            <div className="text-sm text-gray-500">No wallet connected</div>
                          )}
                        </div>
                      ) : vesting.currentRelease > 0 && vesting.releaseStatus === "Available" ? (
                        <button 
                          onClick={() => handleRelease(vesting.address)}
                          className="bg-green-500 text-white px-3 py-1 rounded-lg disabled:bg-gray-400 text-sm"
                          disabled={ongoingTransaction}
                        >
                          Release
                        </button>
                      ) : (
                        <span className="text-gray-500 text-sm">
                          No Release Available
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={8} className="text-center py-4">No vesting schedules found.</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}
