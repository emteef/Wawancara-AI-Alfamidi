import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSession, updateParticipantData } from "../lib/sessions";

export default function ParticipantBiodata() {
  const { kodeAkses } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [nama, setNama] = useState("");
  const [jabatanTampil, setJabatanTampil] = useState("");
  const [cabang, setCabang] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSession(kodeAkses).then((s) => {
      if (!s) { setError("Sesi tidak ditemukan."); return; }
      setSession(s);
      setNama(s.participant?.nama || "");
      setJabatanTampil(s.participant?.jabatanTampil || s.positionName || "");
      setCabang(s.participant?.cabang || "");
    });
  }, [kodeAkses]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nama || !jabatanTampil || !cabang) return;
    setSaving(true);
    setError(null);
    try {
      await updateParticipantData(kodeAkses, { nama, jabatanTampil, cabang });
      navigate(`/peserta/pengantar/${kodeAkses}`);
    } catch (e2) {
      setError("Gagal menyimpan: " + e2.message);
    } finally {
      setSaving(false);
    }
  }

  if (error && !session) return <div className="page"><p style={{ color: "var(--danger)" }}>{error}</p></div>;
  if (!session) return <div className="page"><p>Memuat...</p></div>;

  return (
    <div className="page">
      <p className="eyebrow">Data Diri Peserta</p>
      <h1>Konfirmasi Data Diri</h1>
      <p className="note">
        NIK: <strong>{session.participant?.nik}</strong> &middot; Tanggal Proses: <strong>{session.participant?.tanggalProses}</strong> &middot; Jenis Pengukuran: <strong>{session.jenisPengukuran}</strong>
        <br />Nama dan Jabatan sudah diisi assessor — boleh dikoreksi kalau ada yang salah. Kompetensi yang diuji tetap mengikuti jabatan yang ditentukan assessor, tidak berubah walau Anda koreksi teks jabatan di bawah.
      </p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="nama">Nama Lengkap</label>
        <input id="nama" type="text" value={nama} onChange={(e) => setNama(e.target.value)} required />

        <label htmlFor="jabatan">Jabatan</label>
        <input id="jabatan" type="text" value={jabatanTampil} onChange={(e) => setJabatanTampil(e.target.value)} required />

        <label htmlFor="cabang">Cabang</label>
        <input id="cabang" type="text" value={cabang} onChange={(e) => setCabang(e.target.value)} placeholder="Isi cabang tempat Anda bertugas" required />

        {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}

        <button className="primary" type="submit" style={{ width: "100%", marginTop: 16, padding: 13 }} disabled={saving}>
          {saving ? "Menyimpan..." : "Lanjutkan"}
        </button>
      </form>
    </div>
  );
}
