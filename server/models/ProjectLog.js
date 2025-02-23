const mongoose = require('mongoose');

const ProjectLogSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  formData: {
    brandName: { type: String, required: false, default: "" },
    projectType: { type: String, required: true },
    businessField: { type: String, required: true },
    otherBusinessField: { type: String, default: "" },
    projectObjectives: { type: String, default: "" },
    contactInfo: {
      name: { type: String, required: false },
      email: { type: String, required: false },
      phone: { type: String, default: "" },
    },
    currentLogo: { type: String },
    budget: { type: String, required: true, default: "" }, 
  },
  questions: {
    type: Array,
    required: true,
  },
  answers: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
    required: true,
  },
  projectPlan: { type: String },
  questionCount: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  servicesQueue: {
    type: [String],
    required: true,
  },
  currentServiceIndex: {
    type: Number,
    default: 0,
  },
  serviceQuestionCount: {
    type: Map,
    of: Number,
    default: {},
  },
  maxQuestionsPerService: {
    type: Number,
    required: true,
  },
  totalQuestions: {
    type: Number,
    required: true,
  },
  askedQuestions: {
    type: Map,
    of: [String],
    default: {},
  },
});

module.exports = mongoose.model('ProjectLog', ProjectLogSchema);