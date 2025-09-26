import React from 'react';
import VestingAdmin from './VestingAdmin';
import { mockVestingAddress, mockVestingABI } from '../constants/contracts';

interface VestingAdminProps {
  setView: (view: string) => void;
  setActiveItem: (item: string) => void;
}

export default function MockVestingAdmin({ setView, setActiveItem }: VestingAdminProps) {
  return (
    <VestingAdmin
      setView={setView}
      setActiveItem={setActiveItem}
      contractAddress={mockVestingAddress}
      contractABI={mockVestingABI}
      title="Mock"
    />
  );
}