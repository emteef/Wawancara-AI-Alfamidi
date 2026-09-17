import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSession, saveParticipantData } from "../lib/sessions";

export default function ParticipantBiodata() {
  const { kodeAkses } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [form, setForm] = useState({ nama: "", nik: "", cabang: "", jabatanSaatIni: "", jabatanTujuan: "", tanggalProses: "" });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSession(kodeAkses).then((s) => {
      if (!s) { setError("Sesi tidak ditemukan."); return; }
      setSession(s);
      setForm((f) => ({ ...f, tanggalProses: new Date().toISOString().slice(0, 10) }));
    });
  }, [kodeAkses]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nama || !form.nik || !form.cabang) return;
    if (session.jenisPengukuran === "Assessment" && !form.jabatanTujuan) return;
    setSaving(true);
    setError(null);
    try {
      await saveParticipantData(kodeAkses, {
        ...form,
        // jabatan & jenisPengukuran mengikuti setting assessor, bukan input bebas peserta,
        // kecuali jabatanSaatIni/jabatanTujuan yang memang perlu diisi peserta sebagai konteks.
        jenisPengukuran: session.jenisPengukuran,
        jabatanDiujiCode: session.positionCode,
        jabatanDiujiNama: session.positionName,
      });
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
      <h1>Lengkapi Data Diri</h1>
      <p className="note">
        Jenis Pengukuran: <strong>{session.jenisPengukuran}</strong> &middot; Jabatan yang diuji: <strong>{session.positionName}</strong>
        {" "}(ditentukan oleh assessor, tidak bisa diubah di sini)
      </p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="nama">Nama Lengkap</label>
        <input id="nama" type="text" value={form.nama} onChange={(e) => update("nama", e.target.value)} required />

        <label htmlFor="nik">NIK (Nomor Induk Karyawan)</label>
        <input id="nik" type="text" value={form.nik} onChange={(e) => update("nik", e.target.value)} required />

        <label htmlFor="cabang">Cabang</label>
        <input id="cabang" type="text" value={form.cabang} onChange={(e) => update("cabang", e.target.value)} required />

        <label htmlFor="jabatanSaatIni">Jabatan Saat Ini</label>
        <input id="jabatanSaatIni" type="text" value={form.jabatanSaatIni} onChange={(e) => update("jabatanSaatIni", e.target.value)} required />

        {session.jenisPengukuran === "Assessment" && (
          <>
            <label htmlFor="jabatanTujuan">Jabatan Tujuan</label>
            <input id="jabatanTujuan" type="text" value={form.jabatanTujuan} onChange={(e) => update("jabatanTujuan", e.target.value)} required />
          </>
        )}

        <label htmlFor="tanggalProses">Tanggal Proses</label>
        <input id="tanggalProses" type="date" value={form.tanggalProses} onChange={(e) => update("tanggalProses", e.target.value)} required />

        {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}

        <button className="primary" type="submit" style={{ width: "100%", marginTop: 16, padding: 13 }} disabled={saving}>
          {saving ? "Menyimpan..." : "Lanjutkan"}
        </button>
      </form>
    </div>
  );
}
