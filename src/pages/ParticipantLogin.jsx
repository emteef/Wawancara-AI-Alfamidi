import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../lib/sessions";

export default function ParticipantLogin() {
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    const kode = code.trim().toUpperCase();
    if (!kode) return;
    setLoading(true);
    setError(null);
    try {
      const session = await getSession(kode);
      if (!session) {
        setError("Kode akses tidak ditemukan. Periksa kembali kode Anda.");
        return;
      }
      if (session.status === "final") {
        setError("Sesi ini sudah selesai dan dikunci. Hubungi assessor Anda jika ada pertanyaan.");
        return;
      }
      // Sudah pernah isi biodata? langsung lanjut sesuai progress.
      if (!session.participant) {
        navigate(`/peserta/biodata/${kode}`);
      } else {
        navigate(`/peserta/pengantar/${kode}`);
      }
    } catch (e2) {
      setError("Terjadi kendala: " + e2.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page" style={{ maxWidth: 420, paddingTop: 80 }}>
      <p className="eyebrow">Wawancara Kompetensi</p>
      <h1>Masukkan Kode Akses</h1>
      <p className="note">
        Kode akses diberikan oleh assessor/HR Anda. Kalau Anda sebelumnya sempat menjeda wawancara,
        masukkan kode akses yang sama untuk melanjutkan dari titik terakhir.
      </p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="code">Kode Akses</label>
        <input
          id="code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Contoh: 7K3PQRT"
          autoComplete="off"
          style={{ textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 20, textAlign: "center" }}
        />
        {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
        <button className="primary" type="submit" style={{ width: "100%", marginTop: 16, padding: 13 }} disabled={loading}>
          {loading ? "Memeriksa..." : "Masuk"}
        </button>
      </form>
    </div>
  );
}
