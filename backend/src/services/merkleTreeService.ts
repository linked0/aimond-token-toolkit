import { ethers } from "ethers";
import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';
import { PgAllocationRepository } from '../repositories/pg/PgAllocationRepository';
import { PgUserRepository } from '../repositories/pg/PgUserRepository';
import { PgMerkleDistributionRepository } from '../repositories/pg/PgMerkleDistributionRepository';
import { PgMerkleProofRepository } from '../repositories/pg/PgMerkleProofRepository';
import pool from '../database/db';
import * as fs from 'fs';
import { loyaltyPointAddress, loyaltyPointABI } from '../constants/contracts';
import { chains } from '../constants/chains';
import { checkKeystorePassword } from '../utils/authUtils';

const userRepository = new PgUserRepository(pool);
const allocationRepository = new PgAllocationRepository(pool);
const merkleDistributionRepository = new PgMerkleDistributionRepository(pool);
const merkleProofRepository = new PgMerkleProofRepository(pool);

export async function generateMerkleTree() {
  try {
    console.log('[MerkleTreeService] Starting Merkle tree generation...');

    const unclaimedAllocations = await allocationRepository.findUnclaimed();

    const userAllocationsMap = new Map<number, { walletAddress: string, cumulativeAmount: bigint }>();

    if (unclaimedAllocations.length > 0) {
      for (const alloc of unclaimedAllocations) {
        const user = await userRepository.findById(alloc.user_id);
        if (!user) {
          console.warn(`[MerkleTreeService] User with ID ${alloc.user_id} not found for allocation ${alloc.allocation_id}. Skipping.`);
          continue;
        }

        const currentAmount = userAllocationsMap.get(user.user_id)?.cumulativeAmount || ethers.toBigInt(0);
        const newAmount = currentAmount + ethers.parseUnits(alloc.amount, 18);

        userAllocationsMap.set(user.user_id, {
          walletAddress: user.wallet_address,
          cumulativeAmount: newAmount,
        });
      }
    }

    let merkleRoot: string;
    let leaves: string[];
    let tree: MerkleTree; // Declare tree here

    if (userAllocationsMap.size === 0) {
      console.log('[MerkleTreeService] No valid user allocations found. Setting Merkle root to ZeroHash.');
      leaves = [];
      tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
      merkleRoot = ethers.ZeroHash;
    } else {
      // FIX: Removed the outer keccak256() call. 
      // ethers.solidityPackedKeccak256 already produces the final hash.
      leaves = Array.from(userAllocationsMap.values()).map(data =>
        ethers.solidityPackedKeccak256(['address', 'uint256'], [data.walletAddress, data.cumulativeAmount])
      );
      tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
      merkleRoot = tree.getHexRoot();
    }

    console.log(`[MerkleTreeService] Generated Merkle Root: ${merkleRoot}`);

    await merkleDistributionRepository.deactivateAll();

    const newDistribution = await merkleDistributionRepository.create({
      distribution_name: `Distribution-${new Date().toISOString()}`,
      merkle_root: merkleRoot,
      is_active: true,
    });
    console.log(`[MerkleTreeService] New Merkle distribution created with ID: ${newDistribution.distribution_id}`);

    console.log('[MerkleTreeService] Updating Merkle root on smart contract...');
    const keystorePath = './keystore/keystore-loyalty-point-admin.json';
    const rpcUrl = process.env.RPC_URL || chains.bsc.rpcUrls[0];
    console.log(`process.env.RPC_URL: ${process.env.RPC_URL}`);
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const readOnlyLoyaltyPointContract = new ethers.Contract(loyaltyPointAddress, loyaltyPointABI, provider);

    let currentRootOnContract: string;
    try {
      currentRootOnContract = await (readOnlyLoyaltyPointContract as any).merkleRoot();
      console.log(`[MerkleTreeService] Current Merkle Root on contract: ${currentRootOnContract}`);
    } catch (error) {
      console.warn('[MerkleTreeService] Could not fetch current root from contract. Proceeding with update assumption.', (error as Error).message);
      currentRootOnContract = ''; // Set to empty to force update if cannot read
    }

    if (merkleRoot === currentRootOnContract) {
      console.log('[MerkleTreeService] Merkle Root on contract is already up to date. Skipping update.');
    } else {
      console.log('[MerkleTreeService] Merkle Root has changed. Proceeding to update smart contract.');
      const keystoreJson = fs.readFileSync(keystorePath, 'utf8');
      const password = checkKeystorePassword();
      console.log(`[MerkleTreeService] Using RPC URL: ${rpcUrl}`);

      try {
        const wallet = await ethers.Wallet.fromEncryptedJson(keystoreJson, password);
        const connectedWallet = wallet.connect(provider);
        const loyaltyPointContract = new ethers.Contract(loyaltyPointAddress, loyaltyPointABI, connectedWallet);

        console.log(`[MerkleTreeService] LoyaltyPointAddress: ${loyaltyPointAddress}`);
        console.log('[MerkleTreeService] Attempting to send updateRoot transaction...');
        const tx = await (loyaltyPointContract as any).updateRoot(merkleRoot);
        console.log(`[MerkleTreeService] Merkle root update transaction sent. Tx hash: ${tx.hash}`);
        const receipt = await tx.wait();

        if (receipt && receipt.status === 1) {
          console.log('[MerkleTreeService] Merkle root updated on smart contract successfully.');
          const event = receipt.logs.find(
            (log: any) => loyaltyPointContract.interface.parseLog(log)?.name === 'RootUpdated'
          );
          if (event) {
            const parsedEvent = loyaltyPointContract.interface.parseLog(event);
            console.log(`[MerkleTreeService] RootUpdated event emitted with root: ${parsedEvent?.args[0]}`);
          } else {
            console.warn('[MerkleTreeService] RootUpdated event not found in transaction receipt. Full receipt: ', receipt);
          }
        } else {
          console.error('[MerkleTreeService] Merkle root update transaction failed or reverted. Full receipt: ', receipt);
          throw new Error('Merkle root update transaction failed or reverted.');
        }
      } catch (error: unknown) {
        console.error('[MerkleTreeService] Error during smart contract update:', (error as Error).message);
        throw new Error(`Error updating Merkle root on smart contract: ${(error as Error).message}`);
      }
    }

    for (const [userId, data] of userAllocationsMap.entries()) {
      // FIX: Removed the outer keccak256() call here as well.
      const leaf = ethers.solidityPackedKeccak256(['address', 'uint256'], [data.walletAddress, data.cumulativeAmount]);
      const proof = tree.getHexProof(leaf);

      await merkleProofRepository.create({
        distribution_id: newDistribution.distribution_id,
        user_id: userId,
        amount: data.cumulativeAmount.toString(),
        proof: proof,
      });
      console.log(`[MerkleTreeService] Stored Merkle proof for user ID: ${userId}`);
    }

    


    return { message: 'Merkle tree generated and proofs stored successfully.', merkleRoot };
  } catch (error: unknown) {
    console.error('[MerkleTreeService] Error generating Merkle tree:', (error as Error).message);
    throw new Error(`Error generating Merkle tree: ${(error as Error).message}`);
  }
}
