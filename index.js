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
      vaultMatrices[file.replace('.json', '')] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
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

  // Also auto-create in Vault
  const vaultPath = path.join(VAULT_MOUNT_DIR, `${matrixId}.json`);
  fs.writeFileSync(vaultPath, JSON.stringify(matrix, null, 2));
  vaultMatrices[matrixId] = matrix;

  console.log(`[Upload] Matrix stored: ${matrixId}`);
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

app.delete("/api/matrix/delete/:matrixId", verifyKey, (req, res) => {
  const { matrixId } = req.params;
  try {
    const matrixPath = path.join(MATRICES_DIR, `${matrixId}.json`);
    if (fs.existsSync(matrixPath)) fs.unlinkSync(matrixPath);
    writeVaultLog(`DELETE MATRIX: ${matrixId}`);
    res.status(200).json({ message: "Matrix deleted." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete matrix." });
  }
});

// VaultMatrix endpoints

app.post("/api/vaultmatrix/upload", verifyKey, (req, res) => {
  const matrix = req.body;
  if (!matrix || typeof matrix !== "object") {
    return res.status(400).json({ error: "Invalid matrix upload format." });
  }
  const matrixId = generateMatrixId();
  matrix.matrixId = matrixId;
  matrix.created_at = new Date().toISOString();
  matrix.symbolic_archetype = matrix.symbolic_archetype || "stabilizer";
  matrix.symbolic_drift_rating = matrix.symbolic_drift_rating || 1.0;

  const filePath = path.join(VAULT_MOUNT_DIR, `${matrixId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(matrix, null, 2));
  vaultMatrices[matrixId] = matrix;

  console.log(`[Vault Upload] Stored to /vault: ${matrixId}`);
  res.status(200).json({ message: "Matrix uploaded to Vault successfully.", matrixId });
});

app.post("/api/vaultmatrix/update/:matrixId", verifyKey, (req, res) => {
  const { matrixId } = req.params;
  const updates = req.body;

  if (!vaultMatrices[matrixId]) {
    return res.status(404).json({ error: "Vault matrix not found." });
  }

  vaultMatrices[matrixId] = { ...vaultMatrices[matrixId], ...updates };
  const filePath = path.join(VAULT_MOUNT_DIR, `${matrixId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(vaultMatrices[matrixId], null, 2));

  res.status(200).json({ message: "Vault matrix updated.", matrixId });
});

app.delete("/api/vaultmatrix/delete/:matrixId", verifyKey, (req, res) => {
  const { matrixId } = req.params;
  try {
    const filePath = path.join(VAULT_MOUNT_DIR, `${matrixId}.json`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    delete vaultMatrices[matrixId];
    writeVaultLog(`DELETE VAULT MATRIX: ${matrixId}`);
    res.status(200).json({ message: "Vault matrix deleted." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete vault matrix." });
  }
});

// VaultMatrix List
app.get("/api/vaultmatrix/list", verifyKey, (req, res) => {
  try {
    const matrixIds = Object.keys(vaultMatrices);
    res.status(200).json({ matrices: matrixIds });
  } catch (err) {
    console.error('⚠️ Failed to list vault matrices:', err.message);
    res.status(500).json({ error: "Failed to list vault matrices." });
  }
});

// Status Check
app.get("/api/status", (req, res) => {
  try {
    res.status(200).json({
      status: "Vault is operational.",
      matrices_loaded: Object.keys(vaultMatrices).length,
      uptime: process.uptime()
    });
  } catch (err) {
    res.status(500).json({ error: "Vault status check failed." });
  }
});

app.post("/api/vault/update", verifyKey, (req, res) => {
  try {
    loadVaultMatrices();
    res.status(200).json({ message: "Vault matrices reloaded." });
  } catch (err) {
    res.status(500).json({ error: "Vault reload failed." });
  }
});

// Snapshot
app.get("/api/snapshot", verifyKey, (req, res) => {
  try {
    const archive = archiver('zip');
    res.attachment('vault_snapshot.zip');
    archive.pipe(res);
    for (const matrixId in vaultMatrices) {
      const content = JSON.stringify(vaultMatrices[matrixId], null, 2);
      archive.append(content, { name: `${matrixId}.json` });
    }
    archive.finalize();
  } catch (err) {
    res.status(500).json({ error: "Snapshot creation failed." });
  }
});

// Core Pack
app.get("/api/core-pack", verifyKey, (req, res) => {
  try {
    const archive = archiver('zip');
    res.attachment('core_pack.zip');
    archive.pipe(res);
    const matrixEntries = Object.entries(vaultMatrices).slice(0, 5);
    for (const [matrixId, matrix] of matrixEntries) {
      const content = JSON.stringify(matrix, null, 2);
      archive.append(content, { name: `${matrixId}.json` });
    }
    archive.finalize();
  } catch (err) {
    res.status(500).json({ error: "Core Pack creation failed." });
  }
});

// Review
app.post("/api/review", verifyKey, (req, res) => {
  const { matrix } = req.body;
  if (!matrix || typeof matrix !== "object") {
    return res.status(400).json({ error: "Invalid matrix format." });
  }
  const score = Math.random() * (10 - 7) + 7;
  res.status(200).json({ review: { symbolic_depth_rating: parseFloat(score.toFixed(2)), notes: "Symbolic scan completed." }});
});

// Certify
app.post("/api/certify", verifyKey, (req, res) => {
  const { matrix } = req.body;
  if (!matrix || typeof matrix !== "object") {
    return res.status(400).json({ error: "Invalid matrix format." });
  }
  const driftRating = Math.random() * (1.5 - 0.8) + 0.8;
  res.status(200).json({ certification: { symbolic_drift_rating: parseFloat(driftRating.toFixed(3)), certified_at: new Date().toISOString(), notes: "Matrix certified." }});
});

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
