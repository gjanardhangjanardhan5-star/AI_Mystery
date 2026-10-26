const { z } = require('zod');

const settingsSchema = z.object({
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  tone: z.enum(['cozy', 'suspenseful', 'lighthearted']).default('suspenseful'),
  length: z.enum(['short', 'standard', 'long']).default('standard'),
});

const createCaseSchema = z.object({
  premise: z.string().trim().min(20, 'Please provide at least 20 characters of premise.').max(1000, 'The premise is too long. Keep it under 1000 characters.'),
  settings: settingsSchema.optional().default({}),
});

const suspectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(80),
  description: z.string().min(8).max(220),
  publicMotive: z.string().min(8).max(220),
});

const evidenceSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['chat', 'document', 'image_description', 'camera_log', 'transcript', 'other']),
  title: z.string().min(3).max(120),
  body: z.string().min(12).max(2000),
  occurredAt: z.union([z.string(), z.null()]).optional(),
  suspectIds: z.array(z.string()).default([]),
  fictionalLabel: z.string().min(5).max(200),
});

const timelineItemSchema = z.object({
  time: z.string().min(1).max(80),
  event: z.string().min(1).max(220),
});

const clueAnalysisSchema = z.object({
  evidenceId: z.string().min(1),
  significance: z.string().min(6).max(500),
});

const solutionSchema = z.object({
  culpritSuspectId: z.string().min(1),
  motive: z.string().min(8).max(500),
  timeline: z.array(timelineItemSchema).min(2).max(12),
  explanation: z.string().min(30).max(2000),
  clueAnalysis: z.array(clueAnalysisSchema).min(1).max(12),
  redHerringAnalysis: z.string().min(8).max(500),
});

const generatedCaseSchema = z.object({
  title: z.string().min(5).max(120),
  briefing: z.string().min(20).max(2000),
  setting: z.string().min(10).max(500),
  incident: z.string().min(10).max(500),
  suspects: z.array(suspectSchema).min(3).max(5),
  evidence: z.array(evidenceSchema).min(3).max(12),
  solution: solutionSchema,
});

function validateCreateBody(body) {
  return createCaseSchema.parse(body);
}

function validateGeneratedCase(payload) {
  const parsed = generatedCaseSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: parsed.error.format() };
  }

  const culpritExists = parsed.data.suspects.some((suspect) => suspect.id === parsed.data.solution.culpritSuspectId);
  if (!culpritExists) {
    return { success: false, error: { culpritSuspectId: ['The culprit must match an existing suspect ID.'] } };
  }

  const validEvidenceIds = new Set(parsed.data.evidence.map((item) => item.id));
  const clueIdsAreValid = parsed.data.solution.clueAnalysis.every((clue) => validEvidenceIds.has(clue.evidenceId));
  if (!clueIdsAreValid) {
    return { success: false, error: { clueAnalysis: ['Each clue must reference an existing evidence ID.'] } };
  }

  return { success: true, data: parsed.data };
}

module.exports = {
  settingsSchema,
  validateCreateBody,
  validateGeneratedCase,
};
