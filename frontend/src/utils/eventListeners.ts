import { ethers } from 'ethers';

export const listenForVestingScheduleCreated = (
  contract: ethers.Contract,
  callback: (beneficiary: string, totalVestingDuration: number, cliffDuration: number, releaseDuration: number, installmentCount: number, totalAmount: number) => void
) => {
  contract.on('VestingScheduleCreated', (beneficiary, totalVestingDuration, cliffDuration, releaseDuration, installmentCount, totalAmount, event) => {
    console.log('VestingScheduleCreated event received:', {
      beneficiary,
      totalVestingDuration,
      cliffDuration,
      releaseDuration,
      installmentCount,
      totalAmount: totalAmount.toString(), // Convert BigNumber to string for logging
      event,
    });
    callback(beneficiary, totalVestingDuration, cliffDuration, releaseDuration, installmentCount, totalAmount);
  });

  console.log('Listening for VestingScheduleCreated events...');
};
