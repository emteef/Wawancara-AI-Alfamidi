import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getSession, saveAssessorReview, finalizeSession, unlockSession } from "../lib/sessions";
import { COMPETENCIES } from "../lib/dataStore";
import { computeNilai, countTercapai } from "../lib/nilaiMatrix";
import { cleanSegmentText } from "../lib/interviewLogic";
import { auth } from "../firebase";
import { exportSessionToWord } from "../lib/exportWord";

export default function AssessorReview() {
  const { kodeAkses } = useParams();
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);
  // localReview[competencyKey] = [{ keyBehaviour, finalLevel, assessorNote }]
  const [localReview, setLocalReview] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [kodeAkses]);

  async function load() {
    const s = await getSession(kodeAkses);
    if (!s) { setError("Sesi tidak ditemukan."); return; }
    setSession(s);

    const initial = {};
    (s.selectedCompetencyKeys || []).forEach((key) => {
      const comp = COMPETENCIES[key];
      const aiResults = s.aiCoding?.[key] || [];
      const existingReview = s.assessorReview?.[key]?.finalResults;
      initial[key] = comp.keyBehaviours.map((kb) => {
        const existing = existingReview?.find((r) => r.keyBehaviour === kb.name);
        if (existing) return existing;
        const ai = aiResults.find((r) => r.keyBehaviour === kb.name);
        return {
          keyBehaviour: kb.name,
          finalLevel: ai?.level && ["Basic", "Intermediate", "Advance"].includes(ai.level) ? ai.level : "Basic",
          assessorNote: "",
          evidence: ai?.evidence || "",
          reasoning: ai?.reasoning || "",
        };
      });
    });
    setLocalReview(initial);
  }

  const isLocked = session?.status === "final";

  function updateLevel(compKey, kbName, level) {
    setLocalReview((prev) => ({
      ...prev,
      [compKey]: prev[compKey].map((r) => (r.keyBehaviour === kbName ? { ...r, finalLevel: level } : r)),
    }));
  }
  function updateNote(compKey, kbName, note) {
    setLocalReview((prev) => ({
      ...prev,
      [compKey]: prev[compKey].map((r) => (r.keyBehaviour === kbName ? { ...r, assessorNote: note } : r)),
    }));
  }

  function getNilai(compKey) {
    const comp = COMPETENCIES[compKey];
    const reqLevel = session.requiredLevels?.[compKey] || "Intermediate";
    const results = localReview[compKey] || [];
    const tercapai = countTercapai(results, reqLevel);
    return { tercapai, total: comp.keyBehaviours.length, nilai: computeNilai(comp.keyBehaviours.length, tercapai), reqLevel };
  }

  async function handleSaveDraft() {
    setSaving(true);
    try {
      for (const key of session.selectedCompetencyKeys) {
        const { nilai } = getNilai(key);
        await saveAssessorReview(kodeAkses, key, localReview[key], nilai);
      }
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleFinalize() {
    await handleSaveDraft();
    await finalizeSession(kodeAkses, auth.currentUser?.email || "assessor");
    await load();
  }

  async function handleUnlock() {
    const reason = window.prompt("Alasan membuka kunci (untuk jejak audit):");
    if (reason === null) return;
    await unlockSession(kodeAkses, auth.currentUser?.email || "assessor", reason);
    await load();
  }

  function handleExportWord() {
    exportSessionToWord(session, localReview);
  }

  if (error) return <div className="page"><p style={{ color: "var(--danger)" }}>{error}</p></div>;
  if (!session) return <div className="page"><p>Memuat...</p></div>;

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <p className="eyebrow">Assessor &middot; Review Hasil</p>
      <h1>{session.participant?.nama || "(belum isi data)"}</h1>
      <div className="card">
        <table>
          <tbody>
            <tr><th>NIK</th><td>{session.participant?.nik}</td></tr>
            <tr><th>Cabang</th><td>{session.participant?.cabang}</td></tr>
            <tr><th>Jenis Pengukuran</th><td>{session.jenisPengukuran}</td></tr>
            <tr><th>Jabatan Diuji</th><td>{session.positionName}</td></tr>
            <tr><th>Status</th><td><span className={`badge status-${session.status}`}>{session.status}</span></td></tr>
          </tbody>
        </table>
      </div>

      <div className="row" style={{ marginBottom: 20 }}>
        <button onClick={handleExportWord}>Unduh Transkrip (Word)</button>
        <div style={{ flex: 1 }} />
        {!isLocked && (
          <>
            <button onClick={handleSaveDraft} disabled={saving}>{saving ? "Menyimpan..." : "Simpan Draft"}</button>
            <button className="primary" onClick={handleFinalize} disabled={saving}>Finalisasi &amp; Kunci</button>
          </>
        )}
        {isLocked && <button className="danger" onClick={handleUnlock}>Buka Kunci untuk Edit</button>}
      </div>

      {(session.selectedCompetencyKeys || []).map((key) => {
        const comp = COMPETENCIES[key];
        const results = localReview[key] || [];
        const segTurns = session.segments?.[key]?.turns || [];
        const { tercapai, total, nilai, reqLevel } = getNilai(key);

        return (
          <div key={key} style={{ marginBottom: 32 }}>
            <p className="eyebrow" style={{ textTransform: "uppercase" }}>{comp.cluster}</p>
            <h2>{comp.name}</h2>

            <div className="card" style={{ background: "var(--accent-soft)", borderColor: "var(--accent)" }}>
              <div className="row between">
                <strong>Rating Kompetensi Final (skala 1-5)</strong>
                <span className="badge Advance" style={{ fontSize: 16 }}>{nilai}</span>
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 13.5 }}>
                {tercapai} dari {total} Key Behaviour tercapai (&ge; level {reqLevel} yang dipersyaratkan untuk jabatan ini).
              </p>
            </div>

            {segTurns.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13.5 }}>Kompetensi ini tidak sempat dibahas (waktu habis atau sesi belum sampai sini).</p>
            ) : (
              <details style={{ marginBottom: 12 }}>
                <summary style={{ cursor: "pointer", fontSize: 13.5, color: "var(--text-muted)" }}>Lihat transkrip lengkap</summary>
                <div className="transcript" style={{ marginTop: 10 }}>
                  {segTurns.map((t, i) => (
                    <div key={i} className={`bubble ${t.role === "assistant" ? "ai" : "candidate"}`}>
                      <span className="who">{t.role === "assistant" ? "Pewawancara AI" : "Kandidat"}</span>
                      {cleanSegmentText(t.content)}
                    </div>
                  ))}
                </div>
              </details>
            )}

            {results.map((r) => (
              <div key={r.keyBehaviour} className="card">
                <div className="row between">
                  <strong style={{ fontSize: 14.5 }}>{r.keyBehaviour}</strong>
                  <span className={`badge ${r.finalLevel}`}>{r.finalLevel}</span>
                </div>
                {r.evidence && <p style={{ fontStyle: "italic", fontSize: 13.5, color: "var(--text-muted)", borderLeft: "2px solid var(--border)", paddingLeft: 10 }}>"{r.evidence}"</p>}
                {r.reasoning && <p style={{ fontSize: 13.5 }}>{r.reasoning}</p>}
                <div className="row" style={{ borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 6 }}>
                  <div style={{ width: 160 }}>
                    <label style={{ margin: 0 }}>Level final</label>
                    <select
                      value={r.finalLevel}
                      disabled={isLocked}
                      onChange={(e) => updateLevel(key, r.keyBehaviour, e.target.value)}
                    >
                      <option value="Basic">Basic</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advance">Advance</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ margin: 0 }}>Catatan assessor</label>
                    <input
                      type="text"
                      value={r.assessorNote}
                      disabled={isLocked}
                      onChange={(e) => updateNote(key, r.keyBehaviour, e.target.value)}
                      placeholder="Opsional..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })}

      {session.auditLog?.length > 0 && (
        <div className="audit-log">
          <strong>Jejak Audit:</strong>
          <ul>
            {session.auditLog.map((a, i) => (
              <li key={i}>{a.at} &middot; {a.by} &middot; {a.action}{a.reason ? ` (${a.reason})` : ""}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
