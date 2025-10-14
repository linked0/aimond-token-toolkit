import { generateMerkleTree } from '../src/services/merkleTreeService';

async function regenerateMerkleTree() {
  console.log('🔄 [RegenerateMerkleTree] Starting Merkle tree regeneration...');
  
  try {
    const result = await generateMerkleTree();
    console.log('✅ [RegenerateMerkleTree] Merkle tree regenerated successfully!');
    console.log(`📊 [RegenerateMerkleTree] New Merkle Root: ${result.merkleRoot}`);
    console.log(`📊 [RegenerateMerkleTree] Message: ${result.message}`);
  } catch (error) {
    console.error('❌ [RegenerateMerkleTree] Failed to regenerate Merkle tree:', error);
  }
}

// Run the regeneration script
regenerateMerkleTree().catch(console.error);