const crypto = require('crypto');
const { validateGeneratedCase } = require('../validators');

function makeId(prefix) {
  return `${prefix}_${crypto.randomBytes(4).toString('hex')}`;
}

function buildFixedCase(premise, settings) {
  const premiseText = premise.trim();
  const suspectNames = ['Rhea Wren', 'Jonas Vale', 'Mila Ash', 'Tobin Grey'];
  const suspectIds = ['suspect_1', 'suspect_2', 'suspect_3', 'suspect_4'];

  const evidenceCount = settings.length === 'short' ? 4 : settings.length === 'long' ? 8 : 6;

  const caseTitle = `${premiseText.split(' ').slice(0, 3).join(' ').replace(/[^a-zA-Z0-9 ]/g, '')} Case`;
  const suspects = [
    {
      id: suspectIds[0],
      name: suspectNames[0],
      description: 'The caretaker with a reputation for quietly fixing other people\'s problems and keeping exact records.',
      publicMotive: 'She resents being dismissed as the help and wants to prove she is indispensable to the estate.',
    },
    {
      id: suspectIds[1],
      name: suspectNames[1],
      description: 'A historian who insists every object has a story and knows the rooms better than the owners do.',
      publicMotive: 'He is deeply in debt and believes one hidden item could finance his next expedition.',
    },
    {
      id: suspectIds[2],
      name: suspectNames[2],
      description: 'A celebrated chef with impeccable timing and a habit of taking private detours through locked hallways.',
      publicMotive: 'She fears losing the estate and hopes to force a sale so her own restaurant plan can move forward.',
    },
    {
      id: suspectIds[3],
      name: suspectNames[3],
      description: 'A quiet accountant who keeps meticulous ledgers and avoids the spotlight whenever possible.',
      publicMotive: 'He is trying to protect a family secret and feels trapped by reputation, not greed.',
    },
  ];

  const evidenceIdSet = Array.from({ length: evidenceCount }, (_, index) => `ev_${index + 1}`);
  const evidence = [
    {
      id: evidenceIdSet[0],
      type: 'document',
      title: 'Maintenance Ledger Fragment',
      body: 'An annotated page notes a lock changed on the east service corridor at 7:45 PM. The handwriting in the margin reads: “No one else needed to know”.',
      occurredAt: '2025-02-13T19:40:00Z',
      suspectIds: [suspectIds[0]],
      fictionalLabel: 'Fictional AI-generated document excerpt.',
    },
    {
      id: evidenceIdSet[1],
      type: 'chat',
      title: 'Encrypted Guest Chat',
      body: '“If the storm cuts the power again, use the side passage and leave the key in the vase.” — Sent to a person who never answered the message.',
      occurredAt: '2025-02-13T20:10:00Z',
      suspectIds: [suspectIds[2], suspectIds[1]],
      fictionalLabel: 'Fictional AI-generated chat log.',
    },
    {
      id: evidenceIdSet[2],
      type: 'image_description',
      title: 'Velvet Case Photo Description',
      body: 'A fictional AI-generated still frame shows a velvet case resting on a table beside a cracked teacup. The table is dusted with wet footprints leading toward the servant stairs.',
      occurredAt: '2025-02-13T20:28:00Z',
      suspectIds: [suspectIds[3]],
      fictionalLabel: 'Fictional AI-generated visual description.',
    },
    {
      id: evidenceIdSet[3],
      type: 'camera_log',
      title: 'Gate Camera Log',
      body: 'The camera log shows a figure in a dark coat passing the gate at 20:42. The silhouette is shorter than the estate manager and never pauses under the lantern.',
      occurredAt: '2025-02-13T20:42:00Z',
      suspectIds: [suspectIds[1], suspectIds[2]],
      fictionalLabel: 'Fictional AI-generated camera-log transcript.',
    },
    {
      id: evidenceIdSet[4],
      type: 'transcript',
      title: 'Kitchen Service Transcript',
      body: '“I heard the kettle whistling from the west wing and everyone else was still in the library.” The staff member says the cook looked pale and spoke too quickly.',
      occurredAt: '2025-02-13T20:55:00Z',
      suspectIds: [suspectIds[2]],
      fictionalLabel: 'Fictional AI-generated transcript excerpt.',
    },
  ];

  if (settings.length === 'long') {
    evidence.push(
      {
        id: 'ev_6',
        type: 'other',
        title: 'Weather Board Notes',
        body: 'The wind and rain report show a brief power flicker at 20:15. It would have hidden a person moving between the corridor and the conservatory.',
        occurredAt: '2025-02-13T20:15:00Z',
        suspectIds: [suspectIds[0], suspectIds[3]],
        fictionalLabel: 'Fictional AI-generated field note.',
      },
      {
        id: 'ev_7',
        type: 'document',
        title: 'Stairwell Inventory',
        body: 'The inventory list records one missing brass key. It had been replaced with a duplicate three weeks earlier, which explains how the culprit entered without being noticed.',
        occurredAt: '2025-02-13T21:00:00Z',
        suspectIds: [suspectIds[1], suspectIds[3]],
        fictionalLabel: 'Fictional AI-generated inventory record.',
      }
    );
  }

  if (settings.length === 'short') {
    evidence.splice(4, 1);
  }

  const decisiveEvidenceIds = [evidence[1]?.id, evidence[3]?.id, evidence[Math.min(4, evidence.length - 1)]?.id].filter(Boolean);
  const culpritId = suspectIds[2];

  const generatedCase = {
    title: caseTitle,
    briefing: `The estate is under storm watch when a prized object disappears from a locked room. A short list of suspects has been assembled, but the truth is hidden in a handful of clues and a single bad alibi.`,
    setting: 'An isolated manor house on a ridge during a violent electric storm.',
    incident: `At 8:45 PM, an item of great value vanished from a sealed gallery while the staff and guests were trapped indoors by the weather. The case is fictional and all names are invented.`,
    suspects,
    evidence,
    solution: {
      culpritSuspectId: culpritId,
      motive: 'Mila Ash orchestrated the theft to force a sale on the estate and escape a financial crisis connected to debt and endangered family ties.',
      timeline: [
        { time: '7:45 PM', event: 'A lock on the corridor is altered without drawing attention.' },
        { time: '8:10 PM', event: 'The storm knocks out a light and gives cover to movement between rooms.' },
        { time: '8:42 PM', event: 'The stolen item is carried past the gate in a dark coat.' },
        { time: '8:55 PM', event: 'The culprit frames another suspect by leaving the scene in an obvious route.' },
      ],
      explanation: 'The decisive clues point to Mila Ash. Her private message references a side passage, her route fits the storm cover, and the kitchen transcript confirms she had a reason to be near the corridor without a witness. The red herring appears in the ledger and historian storyline, but those details only explain a plausible motive without matching the actual movement and timing.',
      clueAnalysis: [
        { evidenceId: decisiveEvidenceIds[0], significance: 'The chat log names the side passage and implies a coordinated exit that matches the culprit\'s own path.' },
        { evidenceId: decisiveEvidenceIds[1], significance: 'The camera log narrows the movement to someone who could pass the gate without being noticed in the lantern light.' },
        { evidenceId: decisiveEvidenceIds[2], significance: 'The kitchen transcript confirms the culprit was near the service corridor while others were still gathered, which breaks the false alibi.' },
      ],
      redHerringAnalysis: 'The historian and ledger appear suspicious because both involve access and money, but neither explains the actual movement during the storm. They are useful decoys rather than the real culprit.',
    },
  };

  const preview = validateGeneratedCase(generatedCase);
  if (!preview.success) {
    throw new Error('Generated case failed validation.');
  }

  return preview.data;
}

async function generateCaseFromPremise(premise, settings) {
  const normalizedPremise = premise.trim();
  const defaultCase = buildFixedCase(normalizedPremise, settings || { difficulty: 'medium', tone: 'suspenseful', length: 'standard' });

  const fallbackData = {
    ...defaultCase,
    title: defaultCase.title || `${normalizedPremise.slice(0, 24).trim()} Mystery`,
  };

  return fallbackData;
}

module.exports = {
  generateCaseFromPremise,
};
