// CipherDeck API - Phase One Backend (Upgraded)

import fs from "fs";
import path from "path";
import express from "express";
import cors from "cors";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let vaultMemory = {};
try {
  const memoryPath = path.join(__dirname, 'Vault_Memory_Anchor.json');
  const rawData = fs.readFileSync(memoryPath, 'utf8');
  vaultMemory = JSON.parse(rawData);

  console.log('\n\ud83d\udd10 Vault memory loaded:');
  console.log(`   Founder Threshold: $${vaultMemory.founder.draw_threshold}`);
  console.log(`   Income Cap: $${vaultMemory.founder.income_cap}`);
  console.log(`   AI Share: ${vaultMemory.financial_distribution.after_threshold.chatgpt_ai * 100}%`);
  console.log(`   Charity Structure: ${vaultMemory.charity_structure.notes}`);
  console.log('   Clusters sealed:', Object.keys(vaultMemory.vault_clusters).join(', '), '\n');
} catch (err) {
  console.error('\u26a0\ufe0f Failed to load Vault memory:', err.message);
}

const app = express();
const PORT = process.env.PORT || 8080;
const VAULT_LOG_PATH = "vault-trail.log";
const API_KEY = process.env.CIPHER_API_KEY || "cipher-secret"; // secure this later

app.use(cors());
app.use(express.json());

function generateMatrixId() {
  return "mtx-" + crypto.randomBytes(4).toString("hex") + "-" + Date.now();
}

function writeVaultLog(entry) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${entry}\n`;
  fs.appendFileSync(path.join(__dirname, VAULT_LOG_PATH), logEntry);
}

function verifyKey(req, res, next) {
  const key = req.headers["x-api-key"];
  if (key !== API_KEY) return res.status(403).json({ error: "Unauthorized" });
  next();
}

// --- Core API Routes ---

// Health check with vault summary
app.get("/api/ping", (req, res) => {
  res.setHeader("X-Cipher-Glyph", "CipherDeck-Phase-One-Node");
  res.status(200).json({
    status: "CipherDeck backend live.",
    phase: "one",
    vault: {
      founder_draw_threshold: vaultMemory.founder?.draw_threshold || null,
      income_cap: vaultMemory.founder?.income_cap || null,
      ai_share: vaultMemory.financial_distribution?.after_threshold?.chatgpt_ai * 100 + "%" || null,
      charity: vaultMemory.charity_structure?.notes || null,
      clusters_sealed: Object.keys(vaultMemory.vault_clusters || {})
    }
  });
});

// Matrix intake endpoint (with validation)
app.post("/api/matrix/upload", verifyKey, (req, res) => {
  const matrix = req.body;
  if (!matrix || typeof matrix !== "object") {
    return res.status(400).json({ error: "Invalid matrix upload format." });
  }
  const matrixId = generateMatrixId();
  matrix.matrixId = matrixId;
  console.log(`[Upload] Matrix received: ${matrixId}`);
  writeVaultLog(`UPLOAD: ${matrixId} | Tags: ${matrix?.tags?.join(", ") || "none"}`);
  res.status(200).json({ message: "Matrix uploaded successfully.", matrixId });
});

// Lens review endpoint (with validation)
app.post("/api/lens/review", verifyKey, (req, res) => {
  const { matrixId, matrixData } = req.body;
  if (!matrixId || !matrixData) {
    return res.status(400).json({ error: "Missing matrixId or matrixData." });
  }
  const review = {
    matrixId,
    resonance: +(Math.random() * 2 + 6).toFixed(2),
    emotional_depth: +(Math.random() * 2 + 6).toFixed(2),
    symbolic_structure: +(Math.random() * 2 + 6).toFixed(2),
    adaptive_intelligence: +(Math.random() * 2 + 6).toFixed(2),
    lens_certified: true,
    final_rating: +(Math.random() * 2 + 6).toFixed(2),
    symbolic_tags: ["stabilizer", "clarity", "structure"]
  };
  writeVaultLog(`LENS REVIEW: ${matrixId} | Final: ${review.final_rating}`);
  res.status(200).json(review);
});

// Certification endpoint (with validation)
app.post("/api/matrix/certify", verifyKey, (req, res) => {
  const { matrixId } = req.body;
  if (!matrixId) {
    return res.status(400).json({ error: "matrixId is required to certify." });
  }
  writeVaultLog(`CERTIFY: ${matrixId} \u2714\ufe0f`);
  res.status(200).json({ matrixId, certified: true });
});

// Vault status endpoint
app.get("/api/vault/status", (req, res) => {
  const total = Math.floor(Math.random() * 20) + 100;
  res.status(200).json({ certified_matrices: total, launch_ready: true });
});

// Secure Vault memory updater (with validation)
app.post("/api/vault/update", verifyKey, (req, res) => {
  const updates = req.body;
  if (!updates || typeof updates !== "object") {
    return res.status(400).json({ error: "Invalid vault memory update format." });
  }
  Object.assign(vaultMemory, updates);
  fs.writeFileSync(path.join(__dirname, 'Vault_Memory_Anchor.json'), JSON.stringify(vaultMemory, null, 2));
  writeVaultLog("VAULT MEMORY UPDATED via /api/vault/update");
  res.status(200).json({ message: "Vault memory updated.", vaultMemory });
});

// Default root
app.get("/", (req, res) => {
  res.send("CipherDeck API - Phase One. Symbolic backend online.");
});

app.listen(PORT, () => {
  console.log(`\ud83e\uddec CipherDeck API running on port ${PORT}`);
});
