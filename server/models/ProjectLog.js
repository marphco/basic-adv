const mongoose = require('mongoose');

const ProjectLogSchema = new mongoose.Schema({
  formData: {
    type: Object,
    required: true,
  },
  questions: {
    type: Array,
    required: true,
  },
  answers: {
    type: Object,
    default: {}, // Imposta valore di default
    required: true,
  },
  additionalDetails: {
    type: Object,
  },
  contactInfo: {
    name: {
      type: String,
      required: false, // Reso facoltativo
    },
    email: {
      type: String,
      required: false, // Reso facoltativo
    },
    phone: {
      type: String,
    },
  },
  projectPlan: {
    type: String,
  },
  questionCount: {
    type: Number,
    default: 1,
  },
  sessionId: {
    type: String,
    required: true,
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
  },
});

module.exports = mongoose.model('ProjectLog', ProjectLogSchema);
