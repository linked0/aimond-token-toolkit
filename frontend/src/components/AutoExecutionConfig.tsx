import React, { useState } from 'react';

interface AutoExecutionConfigProps {
  config: {
    enabled: boolean;
    pollingInterval: number;
    maxGasPrice: string;
    allowedDestinations: string[];
    maxValue: string;
    requireSimulation: boolean;
  };
  onConfigChange: (config: any) => void;
  onClose: () => void;
}

export default function AutoExecutionConfig({ config, onConfigChange, onClose }: AutoExecutionConfigProps) {
  const [localConfig, setLocalConfig] = useState(config);

  const handleSave = () => {
    onConfigChange(localConfig);
    onClose();
  };

  const handleReset = () => {
    setLocalConfig(config);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Auto-Execution Configuration</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* Basic Settings */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">Basic Settings</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-600">
                  Enable Auto-Execution
                </label>
                <input
                  type="checkbox"
                  checked={localConfig.enabled}
                  onChange={(e) => setLocalConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Polling Interval (seconds)
                </label>
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={localConfig.pollingInterval / 1000}
                  onChange={(e) => setLocalConfig(prev => ({ 
                    ...prev, 
                    pollingInterval: parseInt(e.target.value) * 1000 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  How often to check for transactions ready to execute (5-300 seconds)
                </p>
              </div>
            </div>
          </div>

          {/* Safety Settings */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">Safety Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Maximum Gas Price (gwei)
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={localConfig.maxGasPrice}
                  onChange={(e) => setLocalConfig(prev => ({ ...prev, maxGasPrice: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Transactions will not execute if gas price exceeds this limit
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Maximum Transaction Value (ETH)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={localConfig.maxValue}
                  onChange={(e) => setLocalConfig(prev => ({ ...prev, maxValue: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Transactions with higher ETH value will not execute (0 = no ETH transfers allowed)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Allowed Contract Addresses
                </label>
                <textarea
                  value={localConfig.allowedDestinations.join('\n')}
                  onChange={(e) => setLocalConfig(prev => ({ 
                    ...prev, 
                    allowedDestinations: e.target.value.split('\n').filter(addr => addr.trim())
                  }))}
                  placeholder="Enter one contract address per line&#10;Leave empty to allow all destinations"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Only transactions to these contracts will be auto-executed. Leave empty to allow all destinations.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-600">
                  Require Transaction Simulation
                </label>
                <input
                  type="checkbox"
                  checked={localConfig.requireSimulation}
                  onChange={(e) => setLocalConfig(prev => ({ ...prev, requireSimulation: e.target.checked }))}
                  className="rounded"
                />
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">Advanced Settings</h3>
            
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-yellow-800">Important Security Notes</h4>
                    <div className="mt-2 text-sm text-yellow-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>Auto-execution will execute transactions immediately when threshold is reached</li>
                        <li>Make sure your Safe threshold is appropriate for your security needs</li>
                        <li>Consider using allowed destinations to limit which contracts can be called</li>
                        <li>Monitor the execution logs regularly for any unexpected behavior</li>
                        <li>Test thoroughly on testnet before using on mainnet</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}