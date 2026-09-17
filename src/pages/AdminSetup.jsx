import { useState } from "react";
import { Link } from "react-router-dom";
import { searchPositions, getApplicableCompetencies, COMPETENCIES } from "../lib/dataStore";
import { createSession } from "../lib/sessions";
import { auth } from "../firebase";

export default function AdminSetup() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [position, setPosition] = useState(null);
  const [jenisPengukuran, setJenisPengukuran] = useState("Profiling");
  const [checkedKeys, setCheckedKeys] = useState([]);
  const [generatedCode, setGeneratedCode] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function onSearchChange(v) {
    setQuery(v);
    setResults(v.trim().length >= 2 ? searchPositions(v) : []);
  }

  function selectPosition(p) {
    setPosition(p);
    setQuery("");
    setResults([]);
    const keys = getApplicableCompetencies(p);
    setCheckedKeys(keys); // default: semua tercentang
  }

  function toggleKey(key) {
    setCheckedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function handleGenerate() {
    if (!position || checkedKeys.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const requiredLevels = {};
      checkedKeys.forEach((k) => (requiredLevels[k] = position.competencies[k] || "Intermediate"));
      const kode = await createSession({
        position,
        jenisPengukuran,
        selectedCompetencyKeys: checkedKeys,
        requiredLevels,
        createdBy: auth.currentUser?.email || "admin",
      });
      setGeneratedCode(kode);
    } catch (e) {
      setError("Gagal membuat sesi: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  if (generatedCode) {
    return (
      <div className="page">
        <p className="eyebrow">Admin &middot; Setup Sesi</p>
        <h1>Sesi berhasil dibuat</h1>
        <div className="card" style={{ background: "var(--accent-soft)", borderColor: "var(--accent)" }}>
          <p style={{ margin: 0, fontSize: 13 }}>Kode Akses untuk peserta:</p>
          <p style={{ fontSize: 32, fontWeight: 700, letterSpacing: "0.08em", margin: "6px 0" }}>{generatedCode}</p>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
            Bagikan kode ini ke peserta. Peserta akan mengisi data dirinya sendiri setelah login.
          </p>
        </div>
        <div className="row">
          <button onClick={() => window.location.reload()}>Buat Sesi Lain</button>
          <Link to="/admin/sesi"><button className="primary">Lihat Semua Sesi</button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <p className="eyebrow">Admin &middot; Setup Sesi</p>
      <h1>Buat Sesi Wawancara</h1>
      <p className="note">
        Cari jabatan — sistem otomatis menampilkan kompetensi yang melekat beserta level yang dipersyaratkan.
        Peserta tidak akan melihat nama kompetensi ini saat wawancara berlangsung.
      </p>

      <label htmlFor="jenisPengukuran">Jenis Pengukuran</label>
      <select id="jenisPengukuran" value={jenisPengukuran} onChange={(e) => setJenisPengukuran(e.target.value)}>
        <option value="Profiling">Profiling (kompetensi jabatan saat ini)</option>
        <option value="Assessment">Assessment (kompetensi jabatan tujuan)</option>
      </select>

      <label htmlFor="jabatanSearch">
        Cari Jabatan {jenisPengukuran === "Assessment" ? "Tujuan" : "Saat Ini"} (nama atau kode posisi)
      </label>
      <input
        id="jabatanSearch"
        type="text"
        placeholder="Contoh: Store Manager, atau kode T7060..."
        value={query}
        onChange={(e) => onSearchChange(e.target.value)}
        autoComplete="off"
      />
      {results.length > 0 && (
        <div className="result-list">
          {results.map((p) => (
            <div key={p.code} className="result-item" onClick={() => selectPosition(p)}>
              <div>
                <strong>{p.name}</strong>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {p.code} &middot; {p.division || "-"} &middot; Grade {p.grade || "-"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {position && (
        <>
          <div className="card row between" style={{ marginTop: 14 }}>
            <div>
              <strong>{position.name}</strong>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                {position.code} &middot; {position.division || "-"} &middot; {position.levelJabatan || "-"}
              </div>
            </div>
            <button onClick={() => { setPosition(null); setCheckedKeys([]); }}>Ganti</button>
          </div>

          <label>Kompetensi yang diuji (otomatis tercentang sesuai data, bisa dikurangi)</label>
          <div className="result-list">
            {getApplicableCompetencies(position).map((key) => {
              const c = COMPETENCIES[key];
              const lvl = position.competencies[key];
              return (
                <label key={key} className="result-item" style={{ cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={checkedKeys.includes(key)}
                    onChange={() => toggleKey(key)}
                    style={{ marginTop: 3 }}
                  />
                  <div>
                    <strong>{c.name}</strong> <span className="badge Intermediate">{lvl}</span>
                    <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                      {c.cluster} &middot; {c.keyBehaviours.length} indikator
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}

          <button
            className="primary"
            style={{ width: "100%", marginTop: 20, padding: 13 }}
            disabled={checkedKeys.length === 0 || saving}
            onClick={handleGenerate}
          >
            {saving ? "Membuat sesi..." : "Generate Kode Akses"}
          </button>
        </>
      )}
    </div>
  );
}
