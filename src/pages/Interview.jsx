import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSession, saveSegmentTurns, saveAiCoding, markSessionSelesai } from "../lib/sessions";
import { COMPETENCIES } from "../lib/dataStore";
import {
  buildInterviewRules, buildCodingPrompt, cleanSegmentText,
  PER_COMP_CAP_MS, TOTAL_SESSION_CAP_MS, SEGMENT_DONE_TAG,
} from "../lib/interviewLogic";
import { askGemini, askGeminiJSON } from "../lib/gemini";

// NOTE (batas waktu & resume): sessionStartTime/segmentStartTime di sini mengukur waktu AKTIF
// dalam satu kali duduk (sitting). Kalau peserta menjeda lalu lanjut di lain waktu/hari, penghitung
// ini reset di awal — itu keputusan desain sengaja (supaya jeda semalam tidak dihitung sebagai
// "sudah 120 menit"). Kalau perlu total waktu aktif KUMULATIF lintas jeda, perlu tambahan field
// di Firestore untuk akumulasi durasi per segmen.

export default function Interview() {
  const { kodeAkses } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const [selectedKeys, setSelectedKeys] = useState([]);
  const [compIndex, setCompIndex] = useState(0);
  const [turns, setTurns] = useState([]);
  const [transcriptView, setTranscriptView] = useState([]);
  const [answerText, setAnswerText] = useState("");
  const [thinking, setThinking] = useState(false);
  const [sending, setSending] = useState(false);
  const [finished, setFinished] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [hint, setHint] = useState("Anda bisa mengetik jawaban, atau tekan tombol mic untuk bicara.");

  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef(null);
  const [micSupported, setMicSupported] = useState(true);

  const sessionStartTime = useRef(Date.now());
  const segmentStartTime = useRef(Date.now());
  const turnsRef = useRef([]);

  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  const initializedFor = useRef(null);

  // ---------- Load sesi & tentukan titik resume ----------
  useEffect(() => {
    if (initializedFor.current === kodeAkses) return; // cegah StrictMode double-invoke di dev
    initializedFor.current = kodeAkses;
    (async () => {
      const s = await getSession(kodeAkses);
      if (!s) { setError("Sesi tidak ditemukan."); setLoadingInitial(false); return; }
      if (s.status === "final") { navigate(`/peserta/selesai/${kodeAkses}`); return; }
      setSession(s);
      const keys = s.selectedCompetencyKeys || [];
      setSelectedKeys(keys);

      const idx = keys.findIndex((k) => !(s.segments?.[k]?.completedAt));
      const startIdx = idx === -1 ? keys.length : idx;
      setCompIndex(startIdx);

      if (startIdx >= keys.length) {
        setLoadingInitial(false);
        runFinish(keys, s);
        return;
      }

      const existingTurns = s.segments?.[keys[startIdx]]?.turns || [];
      setTurns(existingTurns);
      setTranscriptView(existingTurns.map((t) => ({ role: t.role === "assistant" ? "ai" : "candidate", text: cleanSegmentText(t.content) })));
      setLoadingInitial(false);

      if (existingTurns.length === 0) {
        askNext(keys[startIdx], []);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kodeAkses]);

  // ---------- Web Speech setup ----------
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setMicSupported(false); return; }
    const rec = new SR();
    rec.lang = "id-ID";
    rec.interimResults = true;
    rec.continuous = true;
    let finalText = "";
    rec.onstart = () => { finalText = answerText ? answerText + " " : ""; };
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + " "; else interim += t;
      }
      setAnswerText((finalText + interim).trim());
    };
    rec.onerror = (e) => {
      setRecording(false);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setHint("Izin mikrofon ditolak. Cek pengaturan situs di browser Anda, lalu coba lagi.");
      } else if (e.error === "no-speech") {
        setHint("Tidak ada suara terdeteksi. Coba lagi, bicara lebih dekat ke mikrofon.");
      } else {
        setHint("Pengenalan suara mengalami kendala (" + e.error + "). Anda tetap bisa mengetik.");
      }
    };
    rec.onend = () => setRecording(false);
    recognitionRef.current = rec;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleRecording() {
    if (!recognitionRef.current) return;
    if (recording) {
      recognitionRef.current.stop();
      setRecording(false);
    } else {
      try { recognitionRef.current.start(); setRecording(true); } catch (e) { /* ignore */ }
    }
  }

  // ---------- Alur inti wawancara ----------
  async function askNext(competencyKey, currentTurns) {
    setThinking(true);
    try {
      const comp = COMPETENCIES[competencyKey];
      const rules = buildInterviewRules(comp);
      const promptTurns = [{ role: "user", content: rules }, ...currentTurns];
      const text = await askGemini(promptTurns);
      const isDone = text.includes(SEGMENT_DONE_TAG);
      const clean = cleanSegmentText(text);

      const newTurns = [...currentTurns, { role: "assistant", content: text }];
      setTurns(newTurns);
      turnsRef.current = newTurns;
      setTranscriptView((v) => [...v, { role: "ai", text: clean }]);

      await saveSegmentTurns(kodeAkses, competencyKey, newTurns, isDone ? { completedAt: new Date().toISOString() } : {});

      if (isDone) {
        await handleSegmentDone();
      }
    } catch (e) {
      setTranscriptView((v) => [...v, { role: "ai", text: "Terjadi kendala menghubungi AI (" + e.message + "). Silakan coba kirim jawaban lagi." }]);
    } finally {
      setThinking(false);
    }
  }

  async function handleSegmentDone() {
    const nextIndex = compIndex + 1;
    if (nextIndex < selectedKeys.length) {
      setCompIndex(nextIndex);
      segmentStartTime.current = Date.now();
      setTurns([]);
      turnsRef.current = [];
      await askNext(selectedKeys[nextIndex], []);
    } else {
      await runFinish(selectedKeys, session);
    }
  }

  async function handleSend() {
    const val = answerText.trim();
    if (!val || sending || finished) return;
    if (recording) { recognitionRef.current?.stop(); setRecording(false); }

    setSending(true);
    setTranscriptView((v) => [...v, { role: "candidate", text: val }]);
    const newTurns = [...turnsRef.current, { role: "user", content: val }];
    setTurns(newTurns);
    turnsRef.current = newTurns;
    setAnswerText("");
    await saveSegmentTurns(kodeAkses, selectedKeys[compIndex], newTurns);

    const now = Date.now();
    if (now - sessionStartTime.current > TOTAL_SESSION_CAP_MS) {
      await runFinish(selectedKeys, session);
    } else if (now - segmentStartTime.current > PER_COMP_CAP_MS) {
      await handleSegmentDone();
    } else {
      await askNext(selectedKeys[compIndex], newTurns);
    }
    setSending(false);
  }

  async function runFinish(keys, s) {
    setFinishing(true);
    const latestSession = s || (await getSession(kodeAkses));
    await Promise.all(
      keys.map(async (key) => {
        const segTurns = latestSession?.segments?.[key]?.turns || (key === selectedKeys[compIndex] ? turnsRef.current : []);
        if (!segTurns || segTurns.length === 0) return;
        const comp = COMPETENCIES[key];
        const transcriptText = segTurns
          .map((t) => (t.role === "assistant" ? "Pewawancara: " : "Kandidat: ") + cleanSegmentText(t.content))
          .join("\n\n");
        try {
          const prompt = buildCodingPrompt(comp, transcriptText);
          const data = await askGeminiJSON(prompt);
          if (Array.isArray(data)) await saveAiCoding(kodeAkses, key, data);
        } catch (e) {
          console.error("Gagal coding kompetensi", key, e);
        }
      })
    );
    await markSessionSelesai(kodeAkses);
    setFinishing(false);
    setFinished(true);
    navigate(`/peserta/selesai/${kodeAkses}`);
  }

  function handleJeda() {
    navigate("/peserta");
  }

  async function handleAkhiri() {
    if (!window.confirm("Akhiri wawancara sekarang? Kompetensi yang belum sempat dibahas akan ditandai belum dibahas, dan yang sudah dibahas akan langsung dinilai.")) return;
    await runFinish(selectedKeys, session);
  }

  if (loadingInitial) return <div className="page"><p>Memuat sesi...</p></div>;
  if (error) return <div className="page"><p style={{ color: "var(--danger)" }}>{error}</p></div>;
  if (finishing) return <div className="page"><p>Menyelesaikan wawancara &amp; menilai transkrip...</p></div>;

  return (
    <div className="page">
      <p className="eyebrow">Sesi Wawancara</p>
      <h1>Wawancara Kompetensi</h1>
      <p className="progress">Bagian {Math.min(compIndex + 1, selectedKeys.length)} dari {selectedKeys.length}</p>

      <div className="transcript">
        {transcriptView.map((b, i) => (
          <div key={i} className={`bubble ${b.role}`}>
            <span className="who">{b.role === "ai" ? "Pewawancara AI" : "Anda"}</span>
            {b.text}
          </div>
        ))}
        {thinking && <p className="hint">AI sedang menyusun pertanyaan...</p>}
      </div>

      <textarea
        rows={2}
        placeholder="Jawaban akan muncul di sini setelah Anda bicara, atau ketik langsung..."
        value={answerText}
        onChange={(e) => setAnswerText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
      />
      <div className="row" style={{ marginTop: 10 }}>
        <button
          className={`mic-btn ${recording ? "recording" : ""}`}
          onClick={toggleRecording}
          disabled={!micSupported || sending}
          title="Rekam jawaban"
        >
          🎤
        </button>
        <button className="primary" onClick={handleSend} disabled={sending || thinking}>Kirim</button>
        <div style={{ flex: 1 }} />
        <button onClick={handleAkhiri}>Akhiri Wawancara</button>
        <button onClick={handleJeda}>Jeda &amp; Lanjutkan Nanti</button>
      </div>
      <p className="hint">{hint}</p>
    </div>
  );
}
