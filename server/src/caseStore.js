const crypto = require('crypto');
const { caseTtlDays } = require('./config');
const Case = require('./models/Case');

const caseMap = new Map();

function buildCaseRecord({ premise, settings, generatedCase }) {
  const id = crypto.randomBytes(12).toString('hex');
  const now = new Date();
  const record = {
    caseId: id,
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

  return record;
}

function serializeCase(record) {
  if (!record) return null;
  const value = typeof record.toObject === 'function' ? record.toObject() : record;
  return { ...value, id: value.caseId || value.id };
}

async function createCaseRecord(input) {
  const record = buildCaseRecord(input);
  if (Case.db.readyState === 1) {
    return serializeCase(await Case.create(record));
  }
  caseMap.set(record.caseId, record);
  return serializeCase(record);
}

async function getCaseRecord(caseId) {
  if (Case.db.readyState === 1) {
    const record = await Case.findOne({ caseId, expiresAt: { $gt: new Date() } }).lean();
    return serializeCase(record);
  }
  const record = caseMap.get(caseId);
  if (!record) return null;

  if (new Date(record.expiresAt).getTime() < Date.now()) {
    caseMap.delete(caseId);
    return null;
  }

  return serializeCase(record);
}

function toPublicCase(record) {
  return {
    id: record.caseId || record.id,
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

async function saveCompletion(record) {
  if (Case.db.readyState === 1) {
    await Case.updateOne({ caseId: record.caseId || record.id }, { $set: { completion: record.completion } });
  } else {
    caseMap.set(record.caseId || record.id, record);
  }
}

async function submitAccusation(record, suspectId) {
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
  await saveCompletion(record);

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
  saveCompletion,
  toRevealPayload,
};
