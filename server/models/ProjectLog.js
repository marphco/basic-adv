const mongoose = require('mongoose');

const ProjectLogSchema = new mongoose.Schema({
  formData: Object,
  questions: Array,
  answers: Object,
  additionalDetails: Object,
  contactInfo: Object,
  projectPlan: String,
  questionCount: { type: Number, default: 1 },
  sessionId: String, // Assicurati di avere il sessionId se usato
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ProjectLog', ProjectLogSchema);
