import React from 'react';
import VestingAdmin from './VestingAdmin';
import { employeeVestingAddress, employeeVestingABI } from '../constants/contracts';

interface VestingAdminProps {
  setView: (view: string) => void;
  setActiveItem: (item: string) => void;
}

export default function EmployeeVestingAdmin({ setView, setActiveItem }: VestingAdminProps) {
  return (
    <VestingAdmin
      setView={setView}
      setActiveItem={setActiveItem}
      contractAddress={employeeVestingAddress}
      contractABI={employeeVestingABI}
      title="Employee"
    />
  );
}