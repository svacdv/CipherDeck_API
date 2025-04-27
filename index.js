// CipherDeck API v2.0 - Improved Version

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
const PORT = process.env.PORT || 8080;

const CONFIG = {
  VAULT_LOG_PATH: "vault-trail.log",
  API_KEY: process.env.CIPHER_API_KEY || "cipher-secret",
  MATRICES_DIR: path.join(__dirname, "matrices"),
  MEMORY_PATH: path.join(__dirname, "Vault_Memory_Anchor.json"),
  VAULT_MOUNT_DIR: "/vault"
};

let vaultMemory = {};
let vaultMatrices = {};

const initializeVaultMemory = () => {
  try {
    if (fs.existsSync(CONFIG.MEMORY_PATH)) {
      const rawData = fs.readFileSync(CONFIG.MEMORY_PATH, "utf8");
      vaultMemory = JSON.parse(rawData);
      console.log("🔐 Vault memory loaded.");
    } else {
      console.log("⚠️ No Vault memory found. Starting with empty memory.");
    }
  } catch (err) {
    console.error("⚠️ Failed to load Vault memory:", err.message);
  }
};

const loadVaultMatrices = () => {
  try {
    if (!fs.existsSync(CONFIG.VAULT_MOUNT_DIR)) {
      fs.mkdirSync(CONFIG.VAULT_MOUNT_DIR, { recursive: true });
      console.log(`[Vault] Created ${CONFIG.VAULT_MOUNT_DIR} directory.`);
    }
    const files = fs.readdirSync(CONFIG.VAULT_MOUNT_DIR);
    vaultMatrices = files.reduce((acc, file) => {
      const filePath = path.join(CONFIG.VAULT_MOUNT_DIR, file);
      acc[file.replace(".json", "")] = JSON.parse(fs.readFileSync(filePath, "utf8"));
      return acc;
    }, {});
    console.log(`[Vault] Loaded ${files.length} matrices.`);
  } catch (err) {
    console.error("[Vault] Error:", err.message);
  }
};

const generateMatrixId = () => "mtx-" + crypto.randomBytes(4).toString("hex") + "-" + Date.now();

const verifyKey = (req, res, next) => {
  const key = req.headers["x-api-key"];
  if (key !== CONFIG.API_KEY) return res.status(403).json({ error: "Unauthorized" });
  next();
};

const writeVaultLog = (entry) => {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(path.join(__dirname, CONFIG.VAULT_LOG_PATH), `[${timestamp}] ${entry}\n`);
};

app.use(cors());
app.use(express.json());

app.get("/api/status", (req, res) => res.json({ status: "operational", matrices_loaded: Object.keys(vaultMatrices).length, uptime: process.uptime() }));

app.route("/api/matrix/:matrixId?")
  .get(verifyKey, (req, res) => {
    const { matrixId } = req.params;
    if (!matrixId) {
      const files = fs.readdirSync(CONFIG.MATRICES_DIR).map(f => f.replace(".json", ""));
      return res.json({ matrices: files });
    }
    const matrixPath = path.join(CONFIG.MATRICES_DIR, `${matrixId}.json`);
    if (!fs.existsSync(matrixPath)) return res.status(404).json({ error: "Matrix not found." });
    res.json(JSON.parse(fs.readFileSync(matrixPath)));
  })
  .post(verifyKey, (req, res) => {
    const matrixId = generateMatrixId();
    const matrix = { ...req.body, matrixId, created_at: new Date().toISOString() };
    fs.writeFileSync(path.join(CONFIG.MATRICES_DIR, `${matrixId}.json`), JSON.stringify(matrix, null, 2));
    fs.writeFileSync(path.join(CONFIG.VAULT_MOUNT_DIR, `${matrixId}.json`), JSON.stringify(matrix, null, 2));
    vaultMatrices[matrixId] = matrix;
    writeVaultLog(`UPLOAD: ${matrixId}`);
    res.json({ message: "Matrix stored.", matrixId });
  })
  .delete(verifyKey, (req, res) => {
    const { matrixId } = req.params;
    fs.unlinkSync(path.join(CONFIG.MATRICES_DIR, `${matrixId}.json`));
    delete vaultMatrices[matrixId];
    writeVaultLog(`DELETE: ${matrixId}`);
    res.json({ message: "Matrix deleted." });
  });

// Archiving routes
app.get("/api/archive/:type", verifyKey, (req, res) => {
  const { type } = req.params;
  const archive = archiver("zip");
  res.attachment(`${type}_archive.zip`);
  archive.pipe(res);

  if (type === "snapshot") Object.entries(vaultMatrices).forEach(([id, data]) => archive.append(JSON.stringify(data), { name: `${id}.json` }));
  else if (type === "core-pack") Object.entries(vaultMatrices).slice(0, 5).forEach(([id, data]) => archive.append(JSON.stringify(data), { name: `${id}.json` }));

  archive.finalize();
});

app.listen(PORT, () => {
  initializeVaultMemory();
  loadVaultMatrices();
  console.log(`🧬 CipherDeck API running on port ${PORT}`);
});
