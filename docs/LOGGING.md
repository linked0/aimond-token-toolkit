# Logging System Documentation

## Overview

The application uses a structured logging system with configurable log levels to provide clean, organized logging for development and production environments.

## Log Levels

| Level | Value | Description | Usage |
|-------|-------|-------------|-------|
| ERROR | 0 | Critical errors that need immediate attention | Production |
| WARN  | 1 | Warnings about potential issues | Production |
| INFO  | 2 | Important information about application flow | Production |
| DEBUG | 3 | Detailed debugging information | Development only |

## Usage

### Basic Logging

```typescript
import { createLogger } from '../utils/logger';

const logger = createLogger('ComponentName');

// Different log levels
logger.error('Something went wrong', errorObject);
logger.warn('This might be an issue', warningData);
logger.info('Important information', infoData);
logger.debug('Detailed debugging info', debugData);
```

### Specialized Logging Methods

```typescript
// Transaction logging
logger.transactionStart('transaction confirmation', txHash);
logger.transactionSuccess('transaction confirmation', txHash);
logger.transactionError('transaction confirmation', error, txHash);

// Data operations
logger.dataFetch('vesting data', 25); // Shows count
logger.dataFetch('beneficiaries'); // No count

// Network information
logger.networkInfo('BSC Mainnet', '56');

// Beneficiary extraction
logger.beneficiaryExtraction(txHash, 'getBeneficiary');
logger.beneficiaryFound('parameter extraction', address);
logger.beneficiaryFallback(txHash, 'Contract transaction');
```

## Development Scripts

### Using npm/yarn scripts (Recommended)

```bash
# Start with DEBUG logging (mainnet)
npm run start:debug
# or
yarn start:debug

# Start with DEBUG logging (testnet)
npm run start:test:debug
# or
yarn start:test:debug
```

### Using shell scripts

#### Unix/Linux/macOS
```bash
# Make executable (first time only)
chmod +x scripts/dev-debug.sh

# Run development server with DEBUG logging
./scripts/dev-debug.sh
```

#### Windows
```cmd
# Run development server with DEBUG logging
scripts\dev-debug.bat
```

## Environment Configuration

### Environment Variables

| Variable | Values | Description |
|----------|--------|-------------|
| `REACT_APP_LOG_LEVEL` | 0-3 | Sets the minimum log level to display |
| `NODE_ENV` | development/production | Automatically sets log level if REACT_APP_LOG_LEVEL is not set |

### Automatic Configuration

- **Development** (`NODE_ENV=development`): DEBUG level (3) by default
- **Production** (`NODE_ENV=production`): INFO level (2) by default
- **Custom**: Override with `REACT_APP_LOG_LEVEL` environment variable

## Log Output Examples

### Development Mode (DEBUG level)
```
[VestingAdmin] 🚀 Starting transaction confirmation (a1b2c3d4...)
[VestingAdmin] 🌐 Connected to BSC Mainnet (Chain ID: 56)
[VestingAdmin] 🔍 Extracting beneficiary from getBeneficiary
[VestingAdmin] ✅ Found beneficiary via beneficiary parameter: 0x1234...
[VestingAdmin] 📊 vesting data: 15 items
[VestingAdmin] ✅ transaction confirmation completed successfully (a1b2c3d4...)
```

### Production Mode (INFO level)
```
[VestingAdmin] 🚀 Starting transaction confirmation (a1b2c3d4...)
[VestingAdmin] 🌐 Connected to BSC Mainnet (Chain ID: 56)
[VestingAdmin] 📊 vesting data: 15 items
[VestingAdmin] ✅ transaction confirmation completed successfully (a1b2c3d4...)
```

## Best Practices

### 1. Use Appropriate Log Levels
- **ERROR**: Only for actual errors that need attention
- **WARN**: For potential issues or fallback scenarios
- **INFO**: For important application flow information
- **DEBUG**: For detailed debugging information

### 2. Include Relevant Context
```typescript
// Good
logger.debug('Processing beneficiary', { address, txHash: txHash.slice(0, 8) });

// Avoid
logger.debug('Processing beneficiary', beneficiary);
```

### 3. Use Specialized Methods
```typescript
// Good - uses specialized method
logger.transactionStart('release transaction', txHash);

// Avoid - generic logging
logger.info('Starting release transaction', txHash);
```

### 4. Component-Specific Loggers
```typescript
// Create component-specific logger
const logger = createLogger('VestingAdmin');

// This will show [VestingAdmin] in all log messages
```

## Migration from console.log

### Before (excessive console logging)
```typescript
console.log("🎯 ===== handleConfirmTransaction START =====");
console.log(`Network detected: ${network.name} (Chain ID: ${network.chainId})`);
console.log(`Confirming transaction with safeTxHash: ${tx.safeTxHash}`);
console.log("Transaction confirmed:", txResponse);
```

### After (structured logging)
```typescript
logger.transactionStart('transaction confirmation', tx.safeTxHash);
logger.networkInfo(network.name, network.chainId.toString());
logger.debug('Confirming transaction', { safeTxHash: tx.safeTxHash });
logger.transactionSuccess('transaction confirmation', tx.safeTxHash);
```

## Troubleshooting

### Logs not showing in development
1. Check if `REACT_APP_LOG_LEVEL` is set correctly
2. Verify you're using the debug development script
3. Ensure the logger is imported correctly

### Too many logs in production
1. Check `NODE_ENV` is set to `production`
2. Verify `REACT_APP_LOG_LEVEL` is not set to DEBUG (3)
3. Review log level usage in your code

### Performance concerns
- DEBUG logs are automatically filtered out in production
- Only ERROR, WARN, and INFO logs run in production
- Log data is only processed if the log level allows it