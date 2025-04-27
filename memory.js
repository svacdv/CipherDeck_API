// memory.js
import fs from "fs";
import path from "path";

const VAULT_DIR = path.resolve("./vault");

let vaultMemory = {}; // Live in-memory store

// Load all matrices from the Vault directory into memory
function loadVaultMemory() {
  if (!fs.existsSync(VAULT_DIR)) {
    console.warn("⚠️ Vault directory not found. Creating it...");
    fs.mkdirSync(VAULT_DIR, { recursive: true });
  }

  const files = fs.readdirSync(VAULT_DIR).filter(file => file.endsWith(".json"));

  vaultMemory = {}; // Clear old memory
  for (const file of files) {
    const matrixData = JSON.parse(fs.readFileSync(path.join(VAULT_DIR, file), "utf8"));
    vaultMemory[matrixData.matrixId || file.replace(".json", "")] = matrixData;
  }

  console.log(`🧠 Loaded ${Object.keys(vaultMemory).length} matrices into memory.`);
}

// Access a specific matrix from memory
function getMatrix(matrixId) {
  return vaultMemory[matrixId] || null;
}

// Access all matrices
function listMatrices() {
  return Object.values(vaultMemory);
}

// Export the functions
export { loadVaultMemory, getMatrix, listMatrices };
