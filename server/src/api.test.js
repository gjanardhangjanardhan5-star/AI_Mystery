const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('./index');

test('POST /api/v1/cases returns a public case DTO without solution', async () => {
  const response = await request(app)
    .post('/api/v1/cases')
    .send({
      premise: 'A rare manuscript disappears during a storm at a remote hill estate with four suspects and a locked attic.',
      settings: { difficulty: 'medium', tone: 'suspenseful', length: 'standard' },
    })
    .expect(201);

  assert.match(response.body.case.id, /[a-f0-9]+/);
  assert.equal(typeof response.body.case.title, 'string');
  assert.equal(response.body.case.solution, undefined);
  assert.ok(response.body.case.suspects.length >= 3);
});

test('POST /api/v1/cases rejects short premise text', async () => {
  const response = await request(app)
    .post('/api/v1/cases')
    .send({
      premise: 'Too short',
      settings: { difficulty: 'easy', tone: 'cozy', length: 'short' },
    })
    .expect(400);

  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
});

test('POST /api/v1/cases/:caseId/accusation reveals the outcome', async () => {
  const created = await request(app)
    .post('/api/v1/cases')
    .send({
      premise: 'Someone steals a ceremonial clock from a lighthouse during a freezing night, and four staff members become suspects.',
      settings: { difficulty: 'hard', tone: 'suspenseful', length: 'short' },
    })
    .expect(201);

  const caseId = created.body.case.id;
  const suspectId = created.body.case.suspects[2].id;

  const accusation = await request(app)
    .post(`/api/v1/cases/${caseId}/accusation`)
    .send({ suspectId })
    .expect(200);

  assert.ok(accusation.body.reveal);
  assert.equal(typeof accusation.body.reveal.culprit, 'object');
  assert.ok(['correct', 'incorrect'].includes(accusation.body.reveal.outcome));
});
