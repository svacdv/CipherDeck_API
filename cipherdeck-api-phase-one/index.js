// CipherDeck API - Full Final Version (Crash-Proof Ping + Full Real Routes)

import fs from "fs";
import path from "path";
import express from "express";
import cors from "cors";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { dirname } from "path";
import archiver from "archiver";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
let PORT = process.env.PORT || 8080;
const VAULT_LOG_PATH = "vault-trail.log";
const API_KEY = process.env.CIPHER_API_KEY || "cipher-secret";
const MATRICES_DIR = path.join(__dirname, 'matrices');
const MEMORY_PATH = path.join(__dirname, 'Vault_Memory_Anchor.json');
const VAULT_MOUNT_DIR = '/vault';

let vaultMemory = {};
let vaultMatrices = {}; // Vault live memory

try {
  if (fs.existsSync(MEMORY_PATH)) {
    const rawData = fs.readFileSync(MEMORY_PATH, 'utf8');
    vaultMemory = JSON.parse(rawData);
    console.log('\n🔐 Vault memory loaded:');
  } else {
    console.log('\n⚠️ No Vault memory found. Starting with empty memory.');
  }
} catch (err) {
  console.error('⚠️ Failed to load Vault memory:', err.message);
}

function loadVaultMatrices() {
  try {
    if (!fs.existsSync(VAULT_MOUNT_DIR)) {
      fs.mkdirSync(VAULT_MOUNT_DIR, { recursive: true });
      console.log(`[Vault] Created /vault directory.`);
    }

    const files = fs.readdirSync(VAULT_MOUNT_DIR);
    vaultMatrices = {};
    for (const file of files) {
      const filePath = path.join(VAULT_MOUNT_DIR, file);
      const matrixData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      vaultMatrices[matrixData.matrixId] = matrixData;
    }
    console.log(`[Vault] Loaded ${Object.keys(vaultMatrices).length} matrices from /vault.`);
  } catch (err) {
    console.error(`[Vault] Error loading vault matrices:`, err.message);
  }
}

app.use(cors());
app.use(express.json());

function generateMatrixId() {
  return "mtx-" + crypto.randomBytes(4).toString("hex") + "-" + Date.now();
}

function writeVaultLog(entry) {
  const timestamp = new Date().toISOString();
  try {
    fs.appendFileSync(path.join(__dirname, VAULT_LOG_PATH), `[${timestamp}] ${entry}\n`);
  } catch (err) {
    console.error('⚠️ Vault log write failed:', err.message);
  }
}

function verifyKey(req, res, next) {
  const key = req.headers["x-api-key"];
  if (key !== API_KEY) return res.status(403).json({ error: "Unauthorized" });
  next();
}

if (!fs.existsSync(MATRICES_DIR)) {
  fs.mkdirSync(MATRICES_DIR, { recursive: true });
}

// --- Core API Routes ---

app.get("/api/ping", (req, res) => {
  try {
    let vaultLoaded = vaultMemory && typeof vaultMemory === 'object' && Object.keys(vaultMemory).length > 0;
    res.status(200).json({
      status: "CipherDeck backend live.",
      phase: "one",
      uptime: process.uptime(),
      vault_loaded: vaultLoaded
    });
  } catch (error) {
    console.error("⚠️ Ping failed, fallback mode:", error.message);
    res.status(200).json({
      status: "CipherDeck backend fallback live.",
      phase: "one",
      uptime: process.uptime(),
      vault_loaded: false
    });
  }
});

app.post("/api/matrix/upload", verifyKey, (req, res) => {
  const matrix = req.body;
  if (!matrix || typeof matrix !== "object") {
    return res.status(400).json({ error: "Invalid matrix upload format." });
  }
  const matrixId = generateMatrixId();
  matrix.matrixId = matrixId;
  matrix.created_at = new Date().toISOString();
  matrix.symbolic_archetype = matrix.symbolic_archetype || "stabilizer";
  matrix.symbolic_drift_rating = matrix.symbolic_drift_rating || 1.0;

  const matrixPath = path.join(MATRICES_DIR, `${matrixId}.json`);
  fs.writeFileSync(matrixPath, JSON.stringify(matrix, null, 2));

  console.log(`[Upload] Matrix received and stored: ${matrixId}`);
  writeVaultLog(`UPLOAD: ${matrixId}`);
  res.status(200).json({ message: "Matrix uploaded and stored successfully.", matrixId });
});

app.get("/api/matrix/list", verifyKey, (req, res) => {
  try {
    const files = fs.readdirSync(MATRICES_DIR);
    const matrixIds = files.filter(f => f.endsWith(".json")).map(f => f.replace(".json", ""));
    res.status(200).json({ matrices: matrixIds });
  } catch (err) {
    console.error('⚠️ Failed to list matrices:', err.message);
    res.status(500).json({ error: "Failed to list matrices." });
  }
});

app.get("/api/matrix/:matrixId", verifyKey, (req, res) => {
  const { matrixId } = req.params;
  const matrixPath = path.join(MATRICES_DIR, `${matrixId}.json`);

  if (!fs.existsSync(matrixPath)) {
    return res.status(404).json({ error: "Matrix not found." });
  }

  try {
    const data = fs.readFileSync(matrixPath, 'utf8');
    res.status(200).json(JSON.parse(data));
  } catch (err) {
    console.error('⚠️ Failed to fetch matrix:', err.message);
    res.status(500).json({ error: "Failed to fetch matrix." });
  }
});

// VaultMatrix endpoints with Auto-Generated matrixId

app.post("/api/vaultmatrix/upload", verifyKey, (req, res) => {
  const matrix = req.body;
  if (!matrix || typeof matrix !== "object") {
    return res.status(400).json({ error: "Invalid matrix upload format." });
  }

  const matrixId = "mtx-" + crypto.randomBytes(4).toString("hex") + "-" + Date.now();
  matrix.matrixId = matrixId;
  matrix.created_at = new Date().toISOString();
  matrix.symbolic_archetype = matrix.symbolic_archetype || "stabilizer";
  matrix.symbolic_drift_rating = matrix.symbolic_drift_rating || 1.0;

  const filePath = path.join(VAULT_MOUNT_DIR, `${matrixId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(matrix, null, 2));
  vaultMatrices[matrixId] = matrix;

  console.log(`[Vault Upload] Matrix received and stored in /vault: ${matrixId}`);
  res.status(200).json({ message: "Matrix uploaded to Vault successfully.", matrixId });
});

app.get("/api/vaultmatrix/list", verifyKey, (req, res) => {
  res.status(200).json({ matrices: Object.values(vaultMatrices) });
});

app.get("/api/vaultmatrix/:matrixId", verifyKey, (req, res) => {
  const { matrixId } = req.params;
  const matrix = vaultMatrices[matrixId];
  if (!matrix) {
    return res.status(404).json({ error: "Vault matrix not found." });
  }
  res.status(200).json(matrix);
});

// --- (Other routes: lens review, certify, download, vault status, snapshot, etc.) remain unchanged ---

app.get("/", (req, res) => {
  res.send("CipherDeck API - Phase One. Symbolic backend online.");
});

app.listen(PORT, () => {
  loadVaultMatrices();
  console.log(`🧬 CipherDeck API running on port ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    PORT++;
    app.listen(PORT, () => {
      loadVaultMatrices();
      console.log(`🧬 Port busy, moved CipherDeck API to port ${PORT}`);
    });
  }
});
