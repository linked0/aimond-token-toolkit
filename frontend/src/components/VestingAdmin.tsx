import React, { useState, useEffect } from 'react';
import Jazzicon from './Jazzicon';
import { ethers } from 'ethers';
import { bsc, bscTestnet } from 'viem/chains';
import { createSafeClient } from '@safe-global/sdk-starter-kit';
import Safe from '@safe-global/protocol-kit';

const imgPlus = "/assets/plus.svg";

interface VestingItem {
  address: string;
  totalVesting: number;
  totalPayout: number;
  currentRelease: number;
  status: string;
  releaseStatus: string;
  pendingReleaseTx?: any;
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
  
  const [vestingData, setVestingData] = useState<VestingItem[]>(cachedData?.vestingData || []);
  const [loading, setLoading] = useState(false);
  const [ongoingTransaction, setOngoingTransaction] = useState(false);
  const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);
  const [createVestingTransactions, setCreateVestingTransactions] = useState<any[]>(cachedData?.createVestingTransactions || []);
  const [releaseToTransactions, setReleaseToTransactions] = useState<any[]>(cachedData?.releaseToTransactions || []);
  const [currentUserAddress, setCurrentUserAddress] = useState<string | null>(null);
  const [refreshingPending, setRefreshingPending] = useState(false);

  // Function to update cache
  const updateCache = (vestingData: VestingItem[], createVestingTxs: any[], releaseToTxs: any[]) => {
    vestingDataCache.set(contractAddress, {
      vestingData,
      createVestingTransactions: createVestingTxs,
      releaseToTransactions: releaseToTxs,
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
      console.error("MetaMask is not installed");
      return;
    }
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      console.log("Current user address:", address);
      setCurrentUserAddress(address);
    } catch (error) {
      console.error("Error fetching current user address:", error);
    }
  }

  async function handleConfirmTransaction(tx: any) {
    if (!(window as any).ethereum) {
      console.error("MetaMask is not installed");
      // MetaMask not installed - user can install it themselves
      return;
    }

    console.log("🎯 ===== handleConfirmTransaction START =====");  

    setOngoingTransaction(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();
      
      // Network detection for RPC URL selection
      console.log(`Network detected: ${network.name} (Chain ID: ${network.chainId})`);

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
          console.warn('Unsupported network detected, defaulting to BSC Mainnet.');
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
      // Use window.ethereum directly for signing operations
      const safeClient = await createSafeClient({
        provider: window.ethereum, // Use window.ethereum directly for signing
        signer: await signer.getAddress(), // Use the wallet address as signer
        safeAddress: safeAddressToUse,
        apiKey: process.env.REACT_APP_SAFE_API_KEY,
      });

      console.log(`Confirming transaction with safeTxHash: ${tx.safeTxHash}`);
      console.log("Transaction object:", tx);
      console.log("Safe address from transaction:", tx.safeAddress);
      console.log("Safe address from env:", process.env.REACT_APP_SAFE_WALLET);
      console.log("Using safe address:", safeAddressToUse);

      const txResponse = await safeClient.confirm({
        safeTxHash: tx.safeTxHash,
      });

      console.log("Transaction confirmed:", txResponse);

      // Check if auto-execution is enabled
      console.log("🔍 Checking auto-execution setting:", process.env.REACT_APP_AUTO_EXECUTE_ENABLED);
      
      if (process.env.REACT_APP_AUTO_EXECUTE_ENABLED === 'true') {
        console.log("⚡ Auto-execution is enabled, checking threshold...");
        
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
              console.log(`✅ Confirmation threshold reached! Confirmations: ${updatedTx.confirmations.length}/${updatedTx.confirmationsRequired}`);
            } else {
              console.log(`🔄 Polling attempt ${attempt + 1}/${maxAttempts} (delay: ${delay}ms)`);
              await new Promise(resolve => setTimeout(resolve, delay));
              delay = Math.min(delay * 2, 4000); // exponential backoff, max 4s
            }
          } catch (pollError) {
            console.error("Error polling for confirmation threshold:", pollError);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay = Math.min(delay * 2, 4000); // exponential backoff, max 4s
          }
          attempt++;
        }
        
        if (found && updatedTx) {
          console.log(`🚀 Auto-executing transaction ${tx.safeTxHash} after confirmation threshold reached`);
          await handleExecuteTransaction(updatedTx, true); // true indicates auto-execution
          alert("Transaction completed successfully");
        } else {
          console.warn(`⚠️ Transaction ${tx.safeTxHash} confirmation threshold not reached within timeout period`);
          alert("Transaction confirmed");
        }
      } else {
        alert("Transaction confirmed");
      }
      
      fetchPendingTransactions(); // Refresh the list of pending transactions
    } catch (error: any) {
      console.error("Error confirming transaction:", error);
      alert(`Confirmation failed: ${error.message}`);
    } finally {
      setOngoingTransaction(false);
    }
  }

  async function handleExecuteTransaction(tx: any, isAutoExecution: boolean = false) {
    if (!(window as any).ethereum) {
      console.error("MetaMask is not installed");
      // MetaMask not installed - user can install it themselves
      return;
    }

    console.log("🎯 ===== handleExecuteTransaction START =====");   

    setOngoingTransaction(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();
      
      // Network detection for RPC URL selection
      console.log(`Network detected: ${network.name} (Chain ID: ${network.chainId})`);

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
          console.warn('Unsupported network detected, defaulting to BSC Mainnet.');
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

      console.log(`⚡ Executing transaction with safeTxHash: ${tx.safeTxHash}`);

      const txResponse = await safe.executeTransaction(tx.safeTxHash);

      console.log("🎉 Transaction executed:", txResponse);

      // Refresh data after execution
      console.log("🔄 Refreshing pending transactions...");
      fetchPendingTransactions();
      console.log("🔄 Refreshing vesting data...");
      fetchVestingData();

      alert("Transaction executed");
    } catch (error: any) {
      console.error("Error executing transaction:", error);
      alert(`Execution failed: ${error.message}`);
    } finally {
      setOngoingTransaction(false);
    }
  }

  async function fetchVestingData() {
    if (!(window as any).ethereum) {
      console.error("MetaMask is not installed");
      // MetaMask not installed - user can install it themselves
      return;
    }

    // If we have cached data and it's not stale, don't fetch again
    if (!isCacheStale() && vestingData.length > 0) {
      console.log(`📋 Using cached vesting data for ${title} vesting (${contractAddress})`);
      return;
    }

    console.log("🚀 ===== fetchVestingData START =====");

    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const contract = new ethers.Contract(contractAddress, contractABI, provider);

      console.log("Fetching vesting data for Mock Vesting...");

      // Get all beneficiaries from VestingScheduleCreated events
      const events = await contract.queryFilter(contract.filters.VestingScheduleCreated());
      const beneficiaries = [...new Set(events.map((event: any) => event.args.beneficiary))];

      console.log("Found beneficiaries:", beneficiaries);

      // Get global start time
      const globalStartTime = await contract.globalStartTime();
      console.log("Global start time:", globalStartTime.toString());

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

        console.log(`Beneficiary ${beneficiary}:`, {
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

      setVestingData(sortedSchedules);
      
      // Update cache with new data
      updateCache(sortedSchedules, createVestingTransactions, releaseToTransactions);
      
    } catch (error: any) {
      console.error("Error fetching vesting data:", error);
      // Error fetching vesting data - check console for details
    } finally {
      setLoading(false);
    }
  }

  async function fetchPendingTransactions() {
    const safeAddress = process.env.REACT_APP_SAFE_WALLET;
    if (!safeAddress) {
      // Safe wallet address not configured - check environment variables
      return;
    }

    if (!window.ethereum) {
      // MetaMask not installed - user can install it themselves
      return;
    }

    // If we have cached pending transactions and it's not stale, don't fetch again
    if (!isCacheStale() && createVestingTransactions.length > 0) {
      console.log(`📋 Using cached pending transactions for ${title} vesting (${contractAddress})`);
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
      
      // Filter transactions by contract address first
      const contractTxs = (pendingTxs.results || []).filter((tx: any) => 
        tx.to?.toLowerCase() === contractAddress.toLowerCase()
      );

      // Then filter by method (check both dataDecoded and raw data)
      const createVestingTxs = contractTxs.filter((tx: any) => {
        // Check if method is createVestingSchedule
        if (tx.dataDecoded?.method === 'createVestingSchedule') {
          return true;
        }
        // Check raw data for createVestingSchedule function signature
        if (tx.data && tx.data.startsWith('0x')) {
          // createVestingSchedule function signature hash
          const createVestingSignature = '0x' + ethers.id('createVestingSchedule(address,uint256,uint256,uint256,uint256)').slice(2, 10);
          if (tx.data.startsWith(createVestingSignature)) {
            return true;
          }
        }
        return false;
      });

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
          console.log(`📊 Pending transactions updated for ${title} vesting: ${newTxs.length} total`);
        }
        return newTxs;
      });

      // Update create vesting transactions with smart comparison
      setCreateVestingTransactions(prev => {
        let newTxs = createVestingTxs;
        
        // If we found transactions for this contract but couldn't categorize them, 
        // show them all in the createVesting section as a fallback
        if (contractTxs.length > 0 && createVestingTxs.length === 0 && releaseToTxs.length === 0) {
          newTxs = contractTxs;
        }
        
        const hasChanged = JSON.stringify(prev) !== JSON.stringify(newTxs);
        if (hasChanged) {
          console.log(`📋 Create vesting transactions updated: ${newTxs.length} transactions`);
        }
        return newTxs;
      });

      // Update release to transactions with smart comparison
      setReleaseToTransactions(prev => {
        const hasChanged = JSON.stringify(prev) !== JSON.stringify(releaseToTxs);
        if (hasChanged) {
          console.log(`🔄 Release to transactions updated: ${releaseToTxs.length} transactions`);
        }
        return releaseToTxs;
      });

      // Update cache with new pending transaction data
      updateCache(vestingData, createVestingTxs.length > 0 ? createVestingTxs : contractTxs, releaseToTxs);

    } catch (error: any) {
      console.error("Error fetching pending transactions:", error);
      // Don't clear existing data on error, just log the error
    } finally {
      setRefreshingPending(false);
    }
  }

  useEffect(() => {
    fetchCurrentUserAddress();
    
    // Only show loading if we don't have cached data
    if (!cachedData || isCacheStale()) {
      fetchVestingData();
      fetchPendingTransactions();
    } else {
      console.log(`📋 Using cached data for ${title} vesting (${contractAddress})`);
    }
  }, [contractAddress, contractABI]);

  // Set up periodic refresh for pending transactions (every 10 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPendingTransactions();
    }, 10000); // 10 seconds instead of full page refresh

    return () => clearInterval(interval);
  }, [contractAddress]);

  useEffect(() => {
    // Update release status for each vesting item based on pending transactions
    setVestingData(prevData => 
      prevData.map(item => {
        const hasPendingRelease = releaseToTransactions.some(tx => 
          getBeneficiaryAddress(tx)?.toLowerCase() === item.address.toLowerCase()
        );
        
        return {
          ...item,
          releaseStatus: hasPendingRelease ? "Pending Release" : 
                        item.currentRelease > 0 ? "Available" : "Not Available",
          pendingReleaseTx: hasPendingRelease ? 
            releaseToTransactions.find(tx => 
              getBeneficiaryAddress(tx)?.toLowerCase() === item.address.toLowerCase()
            ) : undefined
        };
      })
    );
  }, [releaseToTransactions]);

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
      if (tx.dataDecoded?.parameters) {
        const beneficiaryParam = tx.dataDecoded.parameters.find((p: any) => p.name === 'beneficiary');
        if (beneficiaryParam) {
          return truncateAddress(beneficiaryParam.value);
        }
      }
      // If we can't decode, try to extract from raw data
      if (tx.data && tx.data.length > 10) {
        return "Contract transaction";
      }
      return "Unknown beneficiary";
    } catch (error) {
      return "Error parsing beneficiary";
    }
  }

  function getBeneficiaryAddress(tx: any): string | null {
    try {
      if (tx.dataDecoded?.parameters) {
        const beneficiaryParam = tx.dataDecoded.parameters.find((p: any) => p.name === 'beneficiary');
        if (beneficiaryParam) {
          return beneficiaryParam.value;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async function handleRelease(beneficiaryAddress: string) {
    if (!(window as any).ethereum) {
      console.error("MetaMask is not installed");
      // MetaMask not installed - user can install it themselves
      return;
    }

    console.log("✅ ===== handleRelease START =====");

    setOngoingTransaction(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();
      
      // Network detection for RPC URL selection
      console.log(`Network detected: ${network.name} (Chain ID: ${network.chainId})`);

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
          console.warn('Unsupported network detected, defaulting to BSC Mainnet.');
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
        provider: window.ethereum, // Use window.ethereum directly for signing
        signer: await signer.getAddress(), // Use the wallet address as signer
        safeAddress: safeAddressToUse,
        apiKey: process.env.REACT_APP_SAFE_API_KEY,
      });

      // Create the transaction data for releaseTo function
      const releaseToData = {
        to: contractAddress,
        value: '0',
        data: new ethers.Interface(contractABI).encodeFunctionData('releaseTo', [beneficiaryAddress]),
      };

      console.log(`Creating release transaction for ${beneficiaryAddress}...`);
      console.log("Contract address:", contractAddress);
      console.log("Function data:", releaseToData);

      const txResponse = await safeClient.send({ transactions: [releaseToData] });

      console.log("Release transaction created:", txResponse);

      alert("Release transaction created");
      
      // Refresh pending transactions to show the new transaction
      fetchPendingTransactions();
    } catch (error: any) {
      console.error("Error creating release transaction:", error);
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
          <button onClick={() => { setView('createVestingSchedule'); setActiveItem('Create Vesting'); }} className="bg-[#605bff] h-[42px] w-[231px] rounded-[10px] text-white text-[16px] font-['Nunito:Regular',_sans-serif] flex items-center justify-center transition-all duration-150 active:bg-[#4c47d4]">
            <div className="h-[20px] relative shrink-0 w-[17px]">
              <img alt="" className="block max-w-none size-full" src={imgPlus} />
            </div>
            <p className="leading-[normal] ml-2">New Vesting Schedule</p>
          </button>
        </div>

        {/* Pending Transactions Section */}
        <div className="mx-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Vesting Candidates</h2>
            <button 
              onClick={fetchPendingTransactions}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm disabled:bg-gray-400"
              disabled={ongoingTransaction || refreshingPending}
            >
              {refreshingPending ? "🔄 Refreshing..." : "🔄 Refresh"}
            </button>
          </div>
          <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
            <table className="w-full text-sm text-left rtl:text-right text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th scope="col" className="py-3 px-6"></th>
                  <th scope="col" className="py-3 px-6">Beneficiary</th>
                  <th scope="col" className="py-3 px-6">Amount</th>
                  <th scope="col" className="py-3 px-6">SafeTxHash</th>
                  <th scope="col" className="py-3 px-6">Nonce</th>
                  <th scope="col" className="py-3 px-6">Confirmations</th>
                  <th scope="col" className="py-3 px-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {createVestingTransactions.length > 0 ? (
                  createVestingTransactions.map((tx: any, index: number) => {
                    const beneficiaryAddress = getBeneficiaryAddress(tx);
                    const hasConfirmed = tx.confirmations.some((c: any) => c.owner.toLowerCase() === currentUserAddress?.toLowerCase());
                    const isInitiator = tx.origin?.toLowerCase() === currentUserAddress?.toLowerCase(); // Assuming tx.origin holds the initiator
                    const canConfirm = currentUserAddress && !hasConfirmed && !isInitiator && !tx.isExecuted; // Assuming tx.isExecuted exists
                    
                    // Debug logging
                    console.log(`Transaction ${index}:`, {
                      currentUserAddress,
                      hasConfirmed,
                      isInitiator,
                      isExecuted: tx.isExecuted,
                      canConfirm,
                      confirmations: tx.confirmations,
                      origin: tx.origin
                    });

                    return (
                      <tr key={index} className="bg-white border-b hover:bg-gray-50">
                        <td className="py-4 px-6">
                          {beneficiaryAddress && <Jazzicon address={beneficiaryAddress} size={32} />}
                        </td>
                        <td className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap">{getBeneficiary(tx)}</td>
                        <td className="py-4 px-6">{getVestingAmount(tx)}</td>
                        <td className="py-4 px-6">
                          {truncateAddress(tx.safeTxHash)}
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
                            
                            {/* Execute button - only show if transaction has enough confirmations and is not executed */}
                            {tx.confirmations.length >= tx.confirmationsRequired && !tx.isExecuted && (
                              <button 
                                onClick={() => handleExecuteTransaction(tx, false)}
                                className="bg-green-500 text-white px-3 py-1 rounded-lg disabled:bg-gray-400 text-sm"
                                disabled={ongoingTransaction}
                              >
                                Execute
                              </button>
                            )}
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
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th scope="col" className="py-3 px-6"></th>
                <th scope="col" className="py-3 px-6">Address</th>
                <th scope="col" className="py-3 px-6">Total Vesting</th>
                <th scope="col" className="py-3 px-6">Total Payout</th>
                <th scope="col" className="py-3 px-6">Current Release</th>
                <th scope="col" className="py-3 px-6">Release Status</th>
                <th scope="col" className="py-3 px-6">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-4">Loading...</td></tr>
              ) : vestingData.length > 0 ? (
                vestingData.map((vesting: VestingItem, index: number) => (
                  <tr key={index} className="bg-white border-b hover:bg-gray-50">
                    <td className="py-4 px-6"><Jazzicon address={vesting.address} size={32} /></td>
                    <td className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap">
                      {truncateAddress(vesting.address)}
                    </td>
                    <td className="py-4 px-6">{vesting.totalVesting}</td>
                    <td className="py-4 px-6">{vesting.totalPayout}</td>
                    <td className="py-4 px-6">{vesting.currentRelease}</td>
                    <td className="py-4 px-6">{vesting.releaseStatus}</td>
                    <td className="py-4 px-6">
                      {vesting.currentRelease > 0 && vesting.releaseStatus === "Available" ? (
                        <button 
                          onClick={() => handleRelease(vesting.address)}
                          className="bg-green-500 text-white px-3 py-1 rounded-lg disabled:bg-gray-400 text-sm"
                          disabled={ongoingTransaction}
                        >
                          Release
                        </button>
                      ) : (
                        <span className="text-gray-500 text-sm">
                          {vesting.releaseStatus === "Pending Release" ? "Release Pending" : "No Release Available"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={7} className="text-center py-4">No vesting schedules found.</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}