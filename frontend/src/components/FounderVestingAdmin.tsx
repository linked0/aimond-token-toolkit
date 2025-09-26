import React from 'react';
import VestingAdmin from './VestingAdmin';
import { founderVestingAddress, founderVestingABI } from '../constants/contracts';

interface VestingAdminProps {
  setView: (view: string) => void;
  setActiveItem: (item: string) => void;
}

export default function FounderVestingAdmin({ setView, setActiveItem }: VestingAdminProps) {
  return (
    <VestingAdmin
      setView={setView}
      setActiveItem={setActiveItem}
      contractAddress={founderVestingAddress}
      contractABI={founderVestingABI}
      title="Founder"
    />
  );
}