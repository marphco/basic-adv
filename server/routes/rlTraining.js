// routes/rlTraining.js
const express = require("express");
const { rlSaveTraining } = require("../services/rlClient");
const ProjectLog = require("../models/ProjectLog");

const router = express.Router();
const sanitizeKey = (key) => key.replace(/\./g, "_").replace(/\?$/, "");

// PUT /api/rl/rate
router.put("/rl/rate", async (req, res) => {
  try {
    const payload = { ...req.body, timestamp: req.body.timestamp || new Date() };
    const ok = await rlSaveTraining(payload);
    if (!ok) return res.status(502).json({ ok: false, error: "RL update failed" });

    const { sessionId, question } = req.body;
    if (sessionId && question) {
      const key = sanitizeKey(question);
      const set = {};
      if ("questionReward" in req.body) set[`ratings.${key}.q`] = req.body.questionReward;
      if ("optionsReward" in req.body)  set[`ratings.${key}.o`] = req.body.optionsReward;
      if (Object.keys(set).length) await ProjectLog.updateOne({ sessionId }, { $set: set }).exec();
    }

    return res.json({ ok: true });
  } catch (e) {
    const status = e.response?.status || 500;
    const data = e.response?.data || e.message;
    console.error("RL rate error:", status, data);
    return res.status(status).json({ ok: false, error: data });
  }
});

// POST /api/rl/generate  -> stub che evita errori (torna lista vuota)
router.post("/rl/generate", async (_req, res) => {
  return res.json({ questions: [] });
});

module.exports = router;
