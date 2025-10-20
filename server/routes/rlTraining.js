// routes/rlTraining.js
const express = require("express");
const { rlSaveTraining } = require("../services/rlClient");
const ProjectLog = require("../models/ProjectLog");

const router = express.Router();
const sanitizeKey = (key) => key.replace(/\./g, "_").replace(/\?$/, "");

// PUT /api/rl/rate
router.put("/rate", async (req, res) => {
  try {
    const clamp = (v) => Math.max(-1, Math.min(1, Number.isFinite(v) ? v : 0));

    if (!req.body?.state?.service || !req.body?.question) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing state.service or question" });
    }

    const payload = {
      ...req.body,
      timestamp: req.body.timestamp || new Date(),
    };

    payload.state = payload.state || {};
    payload.state.language = payload.state.language || payload.language || "it";

    if ("questionReward" in payload)
      payload.questionReward = clamp(Number(payload.questionReward));
    if ("optionsReward" in payload)
      payload.optionsReward = clamp(Number(payload.optionsReward));

    const ok = await rlSaveTraining(payload);
    if (!ok) {
      return res.status(502).json({ ok: false, error: "RL update failed" });
    }

    // mirror su ProjectLog (opzionale)
    const { sessionId, question } = payload;
    if (sessionId && question) {
      const key = sanitizeKey(question);
      const set = {};
      if ("questionReward" in payload) set[`ratings.${key}.q`] = payload.questionReward;
      if ("optionsReward" in payload) set[`ratings.${key}.o`] = payload.optionsReward;
      if (Object.keys(set).length) {
        set["ratingsLastAt"] = new Date();
        await ProjectLog.updateOne({ sessionId }, { $set: set }).exec();
      }

      // ✅ usa l’oggetto stored che hai costruito
      const stored = { sessionId, key };
      if ("questionReward" in payload) stored.q = payload.questionReward;
      if ("optionsReward" in payload) stored.o = payload.optionsReward;

      return res.json({ ok: true, stored });
    }

    return res.json({ ok: true });
  } catch (e) {
    const status = e.response?.status || 500;
    const data = e.response?.data || e.message;
    console.error("RL rate error:", status, data);
    return res.status(status).json({ ok: false, error: data });
  }
});

module.exports = router;
