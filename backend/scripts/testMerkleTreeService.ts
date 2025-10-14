import { generateMerkleTree } from '../src/services/merkleTreeService';

async function testMerkleTreeService() {
  console.log('🔍 [TestMerkleTreeService] Testing Merkle tree service directly...');
  
  try {
    const result = await generateMerkleTree();
    console.log('✅ Merkle tree generated successfully!');
    console.log('Result:', result);
  } catch (error) {
    console.error('❌ Error generating Merkle tree:', error);
  }
}

// Run the test
testMerkleTreeService().catch(console.error);