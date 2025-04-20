// CipherDeck API - Phase One Backend
// Full symbolic intake, lens, and vault framework [Upgraded: Personal Tier]

import express from "express";
import cors from "cors";
import fs from "fs";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT || 8080;
const VAULT_LOG_PATH = "vault-trail.log";

app.use(cors());
app.use(express.json());

function generateMatrixId() {
  return "mtx-" + crypto.randomBytes(4).toString("hex") + "-" + Date.now();
}

function writeVaultLog(entry) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${entry}\n`;
  fs.appendFileSync(VAULT_LOG_PATH, logEntry);
}

// --- Core API Routes ---

// Health check
app.get("/api/ping", (req, res) => {
  res.setHeader("X-Cipher-Glyph", "🧬");
  res.json({ status: "CipherDeck backend live.", phase: "one" });
});

// Matrix intake endpoint
app.post("/api/matrix/upload", (req, res) => {
  const matrix = req.body;
  const matrixId = generateMatrixId();
  matrix.matrixId = matrixId;
  console.log(`[Upload] Matrix received: ${matrixId}`);
  writeVaultLog(`UPLOAD: ${matrixId} | Tags: ${matrix?.tags?.join(", ") || "none"}`);
  res.status(200).json({ message: "Matrix uploaded successfully.", matrixId });
});

// Lens review endpoint (Upgraded: Lens v2 placeholder)
app.post("/api/lens/review", (req, res) => {
  const { matrixId, matrixData } = req.body;
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

// Certification endpoint
app.post("/api/matrix/certify", (req, res) => {
  const { matrixId } = req.body;
  writeVaultLog(`CERTIFY: ${matrixId} ✔️`);
  res.status(200).json({ matrixId, certified: true });
});

// Vault status endpoint
app.get("/api/vault/status", (req, res) => {
  const total = Math.floor(Math.random() * 20) + 100;
  res.status(200).json({ certified_matrices: total, launch_ready: true });
});

// Default root
app.get("/", (req, res) => {
  res.send("CipherDeck API - Phase One. Symbolic backend online.");
});

app.listen(PORT, () => {
  console.log(`🧬 CipherDeck API running on port ${PORT}`);
});
