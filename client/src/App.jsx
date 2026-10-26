import { useEffect, useState } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';

const defaultSettings = {
  difficulty: 'medium',
  tone: 'suspenseful',
  length: 'standard',
};

async function apiFetch(path, options = {}) {
  const response = await fetch(`/api/v1${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Something went wrong.');
  }

  return data;
}

function HomePage() {
  const navigate = useNavigate();
  const [premise, setPremise] = useState('');
  const [settings, setSettings] = useState(defaultSettings);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const result = await apiFetch('/cases', {
        method: 'POST',
        body: JSON.stringify({ premise, settings }),
      });
      navigate(`/cases/${result.case.id}`);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Fictional AI mystery</p>
          <h1>AI Mystery Room</h1>
        </div>
        <div className="pill">AI-generated fictional case files</div>
      </header>

      <section className="intro">
        <div>
          <p>
            Turn a premise into a clean, playable investigation with suspects, evidence, and a hidden culprit.
            Every case is fictional and never presented as a real investigation.
          </p>
        </div>
        <div>
          <strong>Important:</strong> Scenario text is sent to Gemini to generate a fictional case. Do not include real names or personal information.
        </div>
      </section>

      <form className="case-form" onSubmit={handleSubmit}>
        <label htmlFor="premise">Premise</label>
        <textarea
          id="premise"
          value={premise}
          onChange={(event) => setPremise(event.target.value)}
          minLength={20}
          maxLength={1000}
          placeholder="A librarian disappears during a thunderstorm while a rare manuscript vanishes from a locked archive..."
          required
        />

        <div className="field-grid">
          <label>
            Difficulty
            <select value={settings.difficulty} onChange={(event) => setSettings((current) => ({ ...current, difficulty: event.target.value }))}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>

          <label>
            Tone
            <select value={settings.tone} onChange={(event) => setSettings((current) => ({ ...current, tone: event.target.value }))}>
              <option value="cozy">Cozy</option>
              <option value="suspenseful">Suspenseful</option>
              <option value="lighthearted">Lighthearted</option>
            </select>
          </label>

          <label>
            Case length
            <select value={settings.length} onChange={(event) => setSettings((current) => ({ ...current, length: event.target.value }))}>
              <option value="short">Short</option>
              <option value="standard">Standard</option>
              <option value="long">Long</option>
            </select>
          </label>
        </div>

        <button type="submit" className="primary-button" disabled={isSubmitting || premise.trim().length < 20}>
          {isSubmitting ? 'Generating mystery…' : 'Create a mystery'}
        </button>

        {error ? <p className="error-text" role="alert">{error}</p> : null}
      </form>
    </main>
  );
}

function CasePage() {
  const { caseId } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [selectedSuspectId, setSelectedSuspectId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revealData, setRevealData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadCase() {
      try {
        setLoading(true);
        const payload = await apiFetch(`/cases/${caseId}`);
        setCaseData(payload.case);
        setSelectedEvidence(payload.case.evidence[0] || null);
        setRevealData(payload.reveal || null);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }

    loadCase();
  }, [caseId]);

  async function accuseSuspect() {
    if (!selectedSuspectId) {
      setError('Choose a suspect before accusing them.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = await apiFetch(`/cases/${caseId}/accusation`, {
        method: 'POST',
        body: JSON.stringify({ suspectId: selectedSuspectId }),
      });
      setCaseData(payload.case);
      setRevealData(payload.reveal);
      setError('');
    } catch (accusationError) {
      setError(accusationError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function revealSolution() {
    try {
      const payload = await apiFetch(`/cases/${caseId}/reveal`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setRevealData(payload.reveal);
      setCaseData(payload.case);
    } catch (revealError) {
      setError(revealError.message);
    }
  }

  if (loading) return <div className="status-card">Loading case file…</div>;
  if (error) return <div className="status-card error">{error}</div>;
  if (!caseData) return <div className="status-card">No case found.</div>;

  const showReveal = Boolean(revealData);

  return (
    <main className="shell case-shell">
      <header className="case-header">
        <div>
          <p className="eyebrow">Case file</p>
          <h1>{caseData.title}</h1>
        </div>
        <Link to="/" className="secondary-link">Create another mystery</Link>
      </header>

      {showReveal ? (
        <section className="reveal-card">
          <p className="eyebrow">Reveal</p>
          <h2>{revealData.caseTitle}</h2>
          <p><strong>Outcome:</strong> {revealData.outcome}</p>
          <p><strong>Culprit:</strong> {revealData.culprit?.name}</p>
          <p><strong>Motive:</strong> {revealData.motive}</p>
          <div className="timeline-box">
            <h3>Timeline</h3>
            {revealData.timeline.map((entry) => (
              <div key={`${entry.time}-${entry.event}`} className="timeline-item">
                <strong>{entry.time}</strong>
                <span>{entry.event}</span>
              </div>
            ))}
          </div>
          <p>{revealData.explanation}</p>
          <div className="clue-list">
            {revealData.clueAnalysis.map((clue) => (
              <div key={clue.evidenceId} className="clue-box">
                <strong>Clue {clue.evidenceId}</strong>
                <p>{clue.significance}</p>
              </div>
            ))}
          </div>
          <p><strong>Red herring:</strong> {revealData.redHerringAnalysis}</p>
        </section>
      ) : (
        <>
          <section className="briefing-grid">
            <article className="panel">
              <h2>Briefing</h2>
              <p>{caseData.briefing}</p>
              <p><strong>Setting:</strong> {caseData.setting}</p>
              <p><strong>Incident:</strong> {caseData.incident}</p>
            </article>

            <aside className="panel">
              <h2>Suspects</h2>
              <div className="suspect-list">
                {caseData.suspects.map((suspect) => (
                  <button
                    key={suspect.id}
                    type="button"
                    className={`suspect-item ${selectedSuspectId === suspect.id ? 'selected' : ''}`}
                    onClick={() => setSelectedSuspectId(suspect.id)}
                  >
                    <span>{suspect.name}</span>
                    <small>{suspect.publicMotive}</small>
                  </button>
                ))}
              </div>
              <div className="confirmation-row">
                <button type="button" className="primary-button" onClick={accuseSuspect} disabled={isSubmitting || !selectedSuspectId}>
                  {isSubmitting ? 'Submitting accusation…' : 'Accuse selected suspect'}
                </button>
                <button type="button" className="secondary-button" onClick={revealSolution}>Reveal solution</button>
              </div>
            </aside>
          </section>

          <section className="panel evidence-panel">
            <h2>Evidence</h2>
            <div className="evidence-layout">
              <div className="evidence-list">
                {caseData.evidence.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`evidence-item ${selectedEvidence?.id === item.id ? 'selected' : ''}`}
                    onClick={() => setSelectedEvidence(item)}
                  >
                    <strong>{item.title}</strong>
                    <span>{item.type}</span>
                    <small>{item.occurredAt ? new Date(item.occurredAt).toLocaleString() : 'Timestamp unavailable'}</small>
                  </button>
                ))}
              </div>

              <article className="evidence-detail">
                {selectedEvidence ? (
                  <>
                    <p className="eyebrow">{selectedEvidence.type}</p>
                    <h3>{selectedEvidence.title}</h3>
                    <p className="fictional-tag">{selectedEvidence.fictionalLabel}</p>
                    <p>{selectedEvidence.body}</p>
                  </>
                ) : (
                  <p>Select an evidence item to inspect it.</p>
                )}
              </article>
            </div>
          </section>
        </>
      )}

      {error ? <p className="error-text" role="alert">{error}</p> : null}
    </main>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/cases/:caseId" element={<CasePage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
}

export default App;
