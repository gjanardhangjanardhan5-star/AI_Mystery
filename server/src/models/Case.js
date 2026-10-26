const mongoose = require('mongoose');

const suspectSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  publicMotive: { type: String, required: true },
}, { _id: false });

const evidenceSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  occurredAt: { type: Date, default: null },
  suspectIds: [{ type: String }],
  fictionalLabel: { type: String, required: true },
}, { _id: false });

const timelineSchema = new mongoose.Schema({
  time: { type: String, required: true },
  event: { type: String, required: true },
}, { _id: false });

const clueAnalysisSchema = new mongoose.Schema({
  evidenceId: { type: String, required: true },
  significance: { type: String, required: true },
}, { _id: false });

const caseSchema = new mongoose.Schema({
  caseId: { type: String, required: true, unique: true, index: true },
  schemaVersion: { type: Number, default: 1 },
  status: { type: String, enum: ['ready', 'completed'], default: 'ready' },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  premise: { type: String, required: true },
  settings: {
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'] },
    tone: { type: String, enum: ['cozy', 'suspenseful', 'lighthearted'] },
    length: { type: String, enum: ['short', 'standard', 'long'] },
  },
  playerFacing: {
    title: { type: String, required: true },
    briefing: { type: String, required: true },
    setting: { type: String, required: true },
    incident: { type: String, required: true },
    suspects: [suspectSchema],
    evidence: [evidenceSchema],
  },
  solution: {
    culpritSuspectId: { type: String, required: true },
    motive: { type: String, required: true },
    timeline: [timelineSchema],
    explanation: { type: String, required: true },
    clueAnalysis: [clueAnalysisSchema],
    redHerringAnalysis: { type: String, required: true },
  },
  completion: {
    submittedSuspectId: { type: String, default: null },
    outcome: { type: String, enum: ['correct', 'incorrect', 'revealed', null], default: null },
    completedAt: { type: Date, default: null },
  },
}, { timestamps: false });

caseSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Case', caseSchema);
