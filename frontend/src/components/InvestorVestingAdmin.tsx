import React from 'react';
import VestingAdmin from './VestingAdmin';
import { investorVestingAddress, investorVestingABI } from '../constants/contracts';

interface VestingAdminProps {
  setView: (view: string) => void;
  setActiveItem: (item: string) => void;
}

export default function InvestorVestingAdmin({ setView, setActiveItem }: VestingAdminProps) {
  return (
    <VestingAdmin
      setView={setView}
      setActiveItem={setActiveItem}
      contractAddress={investorVestingAddress}
      contractABI={investorVestingABI}
      title="Investor"
    />
  );
}