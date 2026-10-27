const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { port, clientOrigin } = require('./config');
const { connectDatabase } = require('./db');
const { validateCreateBody } = require('./validators');
const { generateCaseFromPremise } = require('./services/caseGenerator');
const { createCaseRecord, getCaseRecord, toPublicCase, submitAccusation, toRevealPayload, saveCompletion } = require('./caseStore');

const app = express();

const createRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many case creations. Please wait a few minutes and try again.', details: [] } },
  skipSuccessfulRequests: false,
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      objectSrc: ["'none'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

app.use(cors({
  origin: clientOrigin,
  methods: ['GET', 'POST'],
  credentials: false,
}));
app.use(express.json({ limit: '16kb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'ai-mystery-room-server' });
});

app.post('/api/v1/cases', createRateLimiter, async (req, res, next) => {
  try {
    const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
    const body = validateCreateBody(req.body || {});

    const alreadyCreated = idempotencyKey && global.__caseRequests && global.__caseRequests[idempotencyKey];
    if (alreadyCreated) {
      return res.status(200).json({ case: alreadyCreated });
    }

    const generatedCase = await generateCaseFromPremise(body.premise, body.settings);

    const record = await createCaseRecord({
      premise: body.premise,
      settings: body.settings,
      generatedCase,
    });

    if (idempotencyKey) {
      global.__caseRequests = global.__caseRequests || {};
      global.__caseRequests[idempotencyKey] = toPublicCase(record);
    }

    res.status(201).json({ case: toPublicCase(record) });
  } catch (error) {
    if (error?.name === 'ZodError') {
      const details = error.issues.map((issue) => ({ field: issue.path.join('.') || 'request', message: issue.message }));
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Please review your premise and settings.', details } });
    }

    next(error);
  }
});

app.get('/api/v1/cases/:caseId', async (req, res, next) => {
  try {
    const record = await getCaseRecord(req.params.caseId);
    if (!record) {
      return res.status(404).json({ error: { code: 'CASE_NOT_FOUND', message: 'This mystery is no longer available.', details: [] } });
    }

    const publicCase = toPublicCase(record);
    const shouldReveal = record.completion ? { reveal: toRevealPayload(record) } : {};
    return res.json({ case: publicCase, ...shouldReveal });
  } catch (error) {
    next(error);
  }
});

app.post('/api/v1/cases/:caseId/accusation', async (req, res, next) => {
  try {
    const record = await getCaseRecord(req.params.caseId);
    if (!record) {
      return res.status(404).json({ error: { code: 'CASE_NOT_FOUND', message: 'This mystery is no longer available.', details: [] } });
    }

    if (record.completion) {
      return res.status(409).json({ error: { code: 'CASE_ALREADY_COMPLETED', message: 'This case has already been solved.', details: [] } });
    }

    const suspectId = String(req.body?.suspectId || '').trim();
    if (!suspectId) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Select a suspect before accusing them.', details: [] } });
    }

    const suspectIds = record.playerFacing.suspects.map((suspect) => suspect.id);
    if (!suspectIds.includes(suspectId)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'That suspect is not part of this case.', details: [] } });
    }

    const result = await submitAccusation(record, suspectId);
    return res.status(200).json({ case: result.case, reveal: result.reveal });
  } catch (error) {
    next(error);
  }
});

app.post('/api/v1/cases/:caseId/reveal', async (req, res, next) => {
  try {
    const record = await getCaseRecord(req.params.caseId);
    if (!record) {
      return res.status(404).json({ error: { code: 'CASE_NOT_FOUND', message: 'This mystery is no longer available.', details: [] } });
    }

    if (!record.completion) {
      record.completion = {
        submittedSuspectId: null,
        outcome: 'revealed',
        completedAt: new Date(),
      };
      await saveCompletion(record);
    }

    return res.status(200).json({ case: toPublicCase(record), reveal: toRevealPayload(record) });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const status = error?.status || 500;
  const code = error?.code || 'INTERNAL_ERROR';

  res.status(status).json({
    error: {
      code,
      message: error?.publicMessage || 'Something went wrong while preparing the mystery.',
      details: [],
    },
  });
});

const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    return res.sendFile(path.join(clientDist, 'index.html'));
  });
}

if (require.main === module) {
  connectDatabase()
    .then(() => app.listen(port, () => console.log(`AI Mystery Room listening on port ${port}`)))
    .catch((error) => {
      console.error('Startup failed:', error.message);
      process.exit(1);
    });
}

module.exports = app;
