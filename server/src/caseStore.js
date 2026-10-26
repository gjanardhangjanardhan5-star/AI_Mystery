const crypto = require('crypto');
const { caseTtlDays } = require('./config');

const caseMap = new Map();

function createCaseRecord({ premise, settings, generatedCase }) {
  const id = crypto.randomBytes(12).toString('hex');
  const now = new Date();
  const record = {
    id,
    schemaVersion: 1,
    status: 'ready',
    createdAt: now,
    expiresAt: new Date(now.getTime() + caseTtlDays * 24 * 60 * 60 * 1000),
    premise: premise.trim(),
    settings: {
      difficulty: settings.difficulty || 'medium',
      tone: settings.tone || 'suspenseful',
      length: settings.length || 'standard',
    },
    playerFacing: {
      title: generatedCase.title,
      briefing: generatedCase.briefing,
      setting: generatedCase.setting,
      incident: generatedCase.incident,
      suspects: generatedCase.suspects,
      evidence: generatedCase.evidence,
    },
    solution: generatedCase.solution,
    completion: null,
  };

  caseMap.set(id, record);
  return record;
}

function getCaseRecord(caseId) {
  const record = caseMap.get(caseId);
  if (!record) return null;

  if (new Date(record.expiresAt).getTime() < Date.now()) {
    caseMap.delete(caseId);
    return null;
  }

  return record;
}

function toPublicCase(record) {
  return {
    id: record.id,
    title: record.playerFacing.title,
    briefing: record.playerFacing.briefing,
    setting: record.playerFacing.setting,
    incident: record.playerFacing.incident,
    suspects: record.playerFacing.suspects,
    evidence: record.playerFacing.evidence,
    completion: record.completion,
    fictionalDisclosure: 'This case is entirely fictional and AI-generated.',
  };
}

function toRevealPayload(record) {
  return {
    outcome: record.completion ? record.completion.outcome : 'revealed',
    culprit: record.playerFacing.suspects.find((suspect) => suspect.id === record.solution.culpritSuspectId),
    motive: record.solution.motive,
    timeline: record.solution.timeline,
    explanation: record.solution.explanation,
    clueAnalysis: record.solution.clueAnalysis,
    redHerringAnalysis: record.solution.redHerringAnalysis,
    caseTitle: record.playerFacing.title,
  };
}

function submitAccusation(record, suspectId) {
  if (record.completion) {
    return { status: 'already-completed', case: toPublicCase(record), reveal: toRevealPayload(record) };
  }

  const suspectIds = record.playerFacing.suspects.map((suspect) => suspect.id);
  if (!suspectIds.includes(suspectId)) {
    return { status: 'invalid-suspect', case: toPublicCase(record) };
  }

  const isCorrect = suspectId === record.solution.culpritSuspectId;
  record.completion = {
    submittedSuspectId: suspectId,
    outcome: isCorrect ? 'correct' : 'incorrect',
    completedAt: new Date(),
  };

  return {
    status: 'completed',
    case: toPublicCase(record),
    reveal: toRevealPayload(record),
  };
}

module.exports = {
  createCaseRecord,
  getCaseRecord,
  toPublicCase,
  submitAccusation,
  toRevealPayload,
};
