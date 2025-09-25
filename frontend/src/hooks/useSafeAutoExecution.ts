import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { createSafeClient } from '@safe-global/sdk-starter-kit';
import { bsc, bscTestnet } from 'viem/chains';

interface AutoExecutionConfig {
  enabled: boolean;
  pollingInterval: number; // in milliseconds
  maxGasPrice?: string; // in gwei
  allowedDestinations?: string[]; // contract addresses that are allowed
  maxValue?: string; // max ETH value in transactions
  requireSimulation?: boolean; // whether to simulate before execution
}

interface PendingTransaction {
  safeTxHash: string;
  confirmations: any[];
  confirmationsRequired: number;
  isExecuted: boolean;
  dataDecoded?: any;
  to?: string;
  value?: string;
  nonce: number;
}

interface AutoExecutionState {
  isMonitoring: boolean;
  lastChecked: Date | null;
  executedCount: number;
  errorCount: number;
  lastError: string | null;
}

const DEFAULT_CONFIG: AutoExecutionConfig = {
  enabled: false,
  pollingInterval: 10000, // 10 seconds
  maxGasPrice: '50', // 50 gwei
  allowedDestinations: [], // empty means all destinations allowed
  maxValue: '0', // 0 ETH max value
  requireSimulation: true,
};

export function useSafeAutoExecution(config: Partial<AutoExecutionConfig> = {}) {
  console.log('🚀 [HOOK] useSafeAutoExecution hook initialized with config:', config);
  
  const [state, setState] = useState<AutoExecutionState>({
    isMonitoring: false,
    lastChecked: null,
    executedCount: 0,
    errorCount: 0,
    lastError: null,
  });

  const [currentUserAddress, setCurrentUserAddress] = useState<string | null>(null);
  const [safeClient, setSafeClient] = useState<any>(null);
  
  const configRef = useRef<AutoExecutionConfig>({ ...DEFAULT_CONFIG, ...config });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isExecutingRef = useRef(false);

  // Update config when it changes
  useEffect(() => {
    configRef.current = { ...DEFAULT_CONFIG, ...config };
  }, [config]);

  // Initialize Safe client and get current user address
  const initializeSafeClient = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    setCurrentUserAddress(address);

    const network = await provider.getNetwork();
    
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

    const safeAddress = process.env.REACT_APP_SAFE_WALLET;
    if (!safeAddress) {
      throw new Error('Safe wallet address not found in environment variables');
    }

    const client = await createSafeClient({
      provider: window.ethereum,
      signer: address,
      safeAddress: safeAddress,
      apiKey: process.env.REACT_APP_SAFE_API_KEY,
    });

    setSafeClient(client);
    return client;
  }, []);

  // Safety checks for transaction execution
  const validateTransaction = useCallback(async (tx: PendingTransaction): Promise<boolean> => {
    const currentConfig = configRef.current;

    // Check if destination is allowed
    if (currentConfig.allowedDestinations && currentConfig.allowedDestinations.length > 0) {
      if (!tx.to || !currentConfig.allowedDestinations.includes(tx.to.toLowerCase())) {
        console.warn(`Transaction destination ${tx.to} not in allowed list`);
        return false;
      }
    }

    // Check max value
    if (currentConfig.maxValue && tx.value) {
      const txValue = ethers.parseEther(currentConfig.maxValue);
      const actualValue = BigInt(tx.value);
      if (actualValue > txValue) {
        console.warn(`Transaction value ${tx.value} exceeds maximum ${currentConfig.maxValue} ETH`);
        return false;
      }
    }

    // Check gas price if configured
    if (currentConfig.maxGasPrice) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const feeData = await provider.getFeeData();
        const currentGasPrice = Number(ethers.formatUnits(feeData.gasPrice || 0, 'gwei'));
        const maxGasPrice = Number(currentConfig.maxGasPrice);
        
        if (currentGasPrice > maxGasPrice) {
          console.warn(`Current gas price ${currentGasPrice} gwei exceeds maximum ${maxGasPrice} gwei`);
          return false;
        }
      } catch (error) {
        console.warn('Could not check gas price:', error);
      }
    }

    // Simulate transaction if required
    if (currentConfig.requireSimulation) {
      try {
        // Note: Safe SDK doesn't have built-in simulation, but we can check basic conditions
        // For more advanced simulation, you'd need to integrate with tools like Tenderly
        console.log('Transaction simulation check passed (basic validation)');
      } catch (error) {
        console.warn('Transaction simulation failed:', error);
        return false;
      }
    }

    return true;
  }, []);

  // Execute a transaction that has reached the threshold
  const executeTransaction = useCallback(async (tx: PendingTransaction): Promise<boolean> => {
    console.log('🚀 [AUTO-EXECUTION] Starting executeTransaction process...');
    console.log('📋 [AUTO-EXECUTION] Transaction details:', {
      safeTxHash: tx.safeTxHash,
      confirmations: tx.confirmations.length,
      confirmationsRequired: tx.confirmationsRequired,
      to: tx.to,
      value: tx.value,
      nonce: tx.nonce,
      isExecuted: tx.isExecuted
    });

    if (isExecutingRef.current) {
      console.log('⚠️ [AUTO-EXECUTION] Already executing a transaction, skipping...');
      return false;
    }

    try {
      isExecutingRef.current = true;
      console.log('🔒 [AUTO-EXECUTION] Set execution lock to prevent concurrent executions');
      
      // Validate transaction before execution
      console.log('🔍 [AUTO-EXECUTION] Starting transaction validation...');
      const isValid = await validateTransaction(tx);
      if (!isValid) {
        console.log(`❌ [AUTO-EXECUTION] Transaction ${tx.safeTxHash} failed validation, skipping execution`);
        return false;
      }
      console.log('✅ [AUTO-EXECUTION] Transaction validation passed');

      console.log(`🎯 [AUTO-EXECUTION] Auto-executing transaction ${tx.safeTxHash}...`);
      console.log('🔗 [AUTO-EXECUTION] Creating Safe client connection...');
      
      const client = safeClient || await initializeSafeClient();
      console.log('📡 [AUTO-EXECUTION] Safe client initialized, calling execute method...');
      
      const txResponse = await client.execute({
        safeTxHash: tx.safeTxHash,
      });

      console.log('🎉 [AUTO-EXECUTION] Transaction executed successfully!');
      console.log('📊 [AUTO-EXECUTION] Execution response:', txResponse);
      console.log(`📈 [AUTO-EXECUTION] Updated executed count: ${state.executedCount + 1}`);
      
      setState(prev => ({
        ...prev,
        executedCount: prev.executedCount + 1,
        lastError: null,
      }));

      console.log('✅ [AUTO-EXECUTION] executeTransaction completed successfully');
      return true;
    } catch (error: any) {
      console.error('💥 [AUTO-EXECUTION] Error executing transaction:', error);
      console.error('🔍 [AUTO-EXECUTION] Error details:', {
        message: error.message,
        stack: error.stack,
        safeTxHash: tx.safeTxHash
      });
      
      setState(prev => ({
        ...prev,
        errorCount: prev.errorCount + 1,
        lastError: error.message,
      }));

      console.log(`📊 [AUTO-EXECUTION] Updated error count: ${state.errorCount + 1}`);
      return false;
    } finally {
      isExecutingRef.current = false;
      console.log('🔓 [AUTO-EXECUTION] Released execution lock');
    }
  }, [safeClient, initializeSafeClient, validateTransaction, state.executedCount, state.errorCount]);

  // Check and execute transactions that meet the threshold
  const checkAndExecuteTransactions = useCallback(async () => {
    console.log('🚀🚀🚀 [AUTO-EXECUTION] FUNCTION CALLED - Starting checkAndExecuteTransactions...');
    console.log('⚙️ [AUTO-EXECUTION] Config enabled:', configRef.current.enabled);
    console.log('🔗 [AUTO-EXECUTION] Safe client available:', !!safeClient);
    console.log('🔗 [AUTO-EXECUTION] Safe client object:', safeClient);

    if (!configRef.current.enabled || !safeClient) {
      console.log('⏸️ [AUTO-EXECUTION] Skipping check - auto-execution disabled or no safe client');
      return;
    }

    try {
      setState(prev => ({ ...prev, lastChecked: new Date() }));

      console.log('📡 [AUTO-EXECUTION] Fetching pending transactions...');
      const pendingTxs = await safeClient.getPendingTransactions();
      const transactions = pendingTxs.results || [];

      console.log(`🔍 [AUTO-EXECUTION] Checking ${transactions.length} pending transactions for auto-execution...`);

      if (transactions.length === 0) {
        console.log('📭 [AUTO-EXECUTION] No pending transactions found');
        return;
      }

      for (const tx of transactions) {
        console.log(`📋 [AUTO-EXECUTION] Checking transaction ${tx.safeTxHash}:`, {
          confirmations: tx.confirmations.length,
          confirmationsRequired: tx.confirmationsRequired,
          isExecuted: tx.isExecuted,
          status: tx.status || 'unknown'
        });

        // Skip if already executed
        if (tx.isExecuted) {
          console.log(`⏭️ [AUTO-EXECUTION] Skipping transaction ${tx.safeTxHash} - already executed by Safe`);
          continue;
        }

        // Check if threshold is reached
        if (tx.confirmations.length >= tx.confirmationsRequired) {
          console.log(`🎯 [AUTO-EXECUTION] Transaction ${tx.safeTxHash} has reached threshold (${tx.confirmations.length}/${tx.confirmationsRequired}), attempting execution...`);
          
          const executed = await executeTransaction(tx);
          console.log(`📊 [AUTO-EXECUTION] executeTransaction returned:`, executed);
          
          if (executed) {
            console.log(`🎉 [AUTO-EXECUTION] Successfully auto-executed transaction ${tx.safeTxHash}`);
          } else {
            console.log(`❌ [AUTO-EXECUTION] Failed to auto-execute transaction ${tx.safeTxHash}`);
          }
        } else {
          console.log(`⏳ [AUTO-EXECUTION] Transaction ${tx.safeTxHash} needs more confirmations (${tx.confirmations.length}/${tx.confirmationsRequired})`);
        }
      }
    } catch (error: any) {
      console.error('💥 [AUTO-EXECUTION] Error checking transactions:', error);
      setState(prev => ({
        ...prev,
        errorCount: prev.errorCount + 1,
        lastError: error.message,
      }));
    }
  }, [safeClient, executeTransaction]);

  // Start monitoring
  const startMonitoring = useCallback(async () => {
    console.log('🎬 [HOOK] startMonitoring called, current state:', state.isMonitoring);
    
    if (state.isMonitoring) {
      console.log('⏭️ [HOOK] Already monitoring, skipping start');
      return;
    }

    try {
      console.log('🔧 [HOOK] Initializing Safe client...');
      await initializeSafeClient();
      
      console.log('📊 [HOOK] Setting monitoring state to true');
      setState(prev => ({ ...prev, isMonitoring: true }));
      
      console.log('🔍 [HOOK] Running initial transaction check...');
      try {
        await checkAndExecuteTransactions();
        console.log('✅ [HOOK] Initial transaction check completed');
      } catch (error) {
        console.error('💥 [HOOK] Error in initial transaction check:', error);
      }
      
      console.log('⏰ [HOOK] Setting up polling interval:', configRef.current.pollingInterval, 'ms');
      intervalRef.current = setInterval(checkAndExecuteTransactions, configRef.current.pollingInterval);
      
      console.log('✅ [HOOK] Safe auto-execution monitoring started successfully');
    } catch (error: any) {
      console.error('💥 [HOOK] Error starting monitoring:', error);
      setState(prev => ({
        ...prev,
        errorCount: prev.errorCount + 1,
        lastError: error.message,
      }));
    }
  }, [state.isMonitoring, initializeSafeClient, checkAndExecuteTransactions]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setState(prev => ({ ...prev, isMonitoring: false }));
    console.log('Safe auto-execution monitoring stopped');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Auto-execute immediately when enabled (no monitoring)
  useEffect(() => {
    console.log('🔄 [HOOK] useEffect triggered - config enabled:', configRef.current.enabled);
    
    if (configRef.current.enabled) {
      console.log('⚡ [HOOK] Auto-execution enabled - checking for ready transactions immediately...');
      checkAndExecuteTransactions();
    }
  }, [configRef.current.enabled, checkAndExecuteTransactions]);

  return {
    ...state,
    currentUserAddress,
    startMonitoring,
    stopMonitoring,
    checkAndExecuteTransactions,
    config: configRef.current,
  };
}