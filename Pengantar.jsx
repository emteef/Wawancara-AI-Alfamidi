import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function Pengantar() {
  const { kodeAkses } = useParams();
  const navigate = useNavigate();
  const [micStatus, setMicStatus] = useState("belum_dicoba"); // belum_dicoba | granted | denied
  const [micError, setMicError] = useState(null);
  const [requesting, setRequesting] = useState(false);

  async function requestMic() {
    setRequesting(true);
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicStatus("granted");
    } catch (e) {
      setMicStatus("denied");
      if (e.name === "NotAllowedError" || e.name === "SecurityError") {
        setMicError("Izin mikrofon ditolak. Klik ikon kunci di address bar browser untuk mengizinkan, lalu coba lagi.");
      } else if (e.name === "NotFoundError") {
        setMicError("Tidak ditemukan perangkat mikrofon di perangkat Anda.");
      } else {
        setMicError("Akses mikrofon gagal (" + e.name + ").");
      }
    } finally {
      setRequesting(false);
    }
  }

  const canContinue = micStatus === "granted";

  return (
    <div className="page">
      <p className="eyebrow">Sebelum Mulai</p>
      <h1>Pengantar Wawancara</h1>

      <div className="card">
        <p>Anda akan mengikuti wawancara kompetensi berbasis AI. Beberapa hal yang perlu diketahui:</p>
        <ul style={{ fontSize: 14, lineHeight: 1.7, paddingLeft: 20 }}>
          <li>Pertanyaan akan ditampilkan dalam bentuk <strong>teks</strong> di layar.</li>
          <li>Anda menjawab dengan <strong>suara</strong> (mikrofon) — jawaban akan otomatis diubah jadi teks. Anda juga bisa mengetik langsung kapan saja.</li>
          <li>Wawancara terbagi dalam beberapa bagian. Progress ditampilkan sebagai "Bagian X dari N".</li>
          <li>Progress Anda <strong>tersimpan otomatis</strong>. Anda bisa menjeda kapan saja dan melanjutkan nanti dengan kode akses yang sama.</li>
          <li>Jawablah dengan cerita nyata dari pengalaman Anda — sejelas dan sekonkret mungkin.</li>
        </ul>
      </div>

      <div className="card" style={{ background: micStatus === "denied" ? "var(--candidate-soft)" : "var(--accent-soft)" }}>
        <p style={{ margin: "0 0 10px", fontWeight: 600 }}>Izin Mikrofon</p>
        <p style={{ margin: "0 0 10px", fontSize: 13.5 }}>
          Wawancara ini butuh akses mikrofon untuk merekam jawaban Anda. Klik tombol di bawah untuk mengizinkan.
        </p>
        <button className="primary" onClick={requestMic} disabled={requesting || micStatus === "granted"}>
          {micStatus === "granted" ? "✓ Mikrofon Diizinkan" : requesting ? "Meminta izin..." : "🎤 Izinkan Mikrofon"}
        </button>
        {micError && <p style={{ color: "var(--danger)", fontSize: 13, marginTop: 8 }}>{micError}</p>}
      </div>

      <button
        className="primary"
        style={{ width: "100%", padding: 13, marginTop: 8 }}
        disabled={!canContinue}
        onClick={() => navigate(`/peserta/wawancara/${kodeAkses}`)}
      >
        Mulai Wawancara
      </button>
      {!canContinue && (
        <p className="hint">Izinkan mikrofon dulu untuk melanjutkan. (Anda tetap bisa mengetik jawaban nanti kalau suatu saat mikrofon bermasalah.)</p>
      )}
    </div>
  );
}
