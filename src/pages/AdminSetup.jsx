import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { searchPositions, getApplicableCompetencies } from "../lib/dataStore";
import { createSession, deleteSession } from "../lib/sessions";
import { auth } from "../firebase";

function emptyRow(id) {
  return {
    id,
    nama: "",
    nik: "",
    tanggalProses: new Date().toISOString().slice(0, 10),
    jenisPengukuran: "Profiling",
    jabatanQuery: "",
    jabatanResults: [],
    position: null,
    kodeAkses: null,
    generating: false,
    error: null,
  };
}

export default function AdminSetup() {
  const nextId = useRef(1);
  const [rows, setRows] = useState([emptyRow(0)]);

  function addRow() {
    nextId.current += 1;
    setRows((prev) => [...prev, emptyRow(nextId.current)]);
  }

  function updateRow(id, patch) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function onJabatanSearch(id, value) {
    const results = value.trim().length >= 2 ? searchPositions(value) : [];
    updateRow(id, { jabatanQuery: value, jabatanResults: results });
  }

  function selectJabatan(id, position) {
    updateRow(id, { position, jabatanQuery: "", jabatanResults: [] });
  }

  async function handleGenerate(id) {
    const row = rows.find((r) => r.id === id);
    if (!row.nama || !row.nik || !row.position) {
      updateRow(id, { error: "Lengkapi Nama, NIK, dan Jabatan dulu." });
      return;
    }
    updateRow(id, { generating: true, error: null });
    try {
      const applicableKeys = getApplicableCompetencies(row.position);
      if (applicableKeys.length === 0) {
        updateRow(id, { generating: false, error: "Jabatan ini tidak punya kompetensi dengan rubrik lengkap di sistem." });
        return;
      }
      const requiredLevels = {};
      applicableKeys.forEach((k) => (requiredLevels[k] = row.position.competencies[k] || "Intermediate"));

      const kodeAkses = await createSession({
        position: row.position,
        jenisPengukuran: row.jenisPengukuran,
        applicableCompetencyKeys: applicableKeys,
        requiredLevels,
        participant: { nama: row.nama, nik: row.nik, tanggalProses: row.tanggalProses },
        createdBy: auth.currentUser?.email || "admin",
      });
      updateRow(id, { kodeAkses, generating: false });
    } catch (e) {
      updateRow(id, { generating: false, error: "Gagal generate: " + e.message });
    }
  }

  async function handleHapus(id) {
    const row = rows.find((r) => r.id === id);
    if (row.kodeAkses) {
      if (!window.confirm(`Hapus kode akses ${row.kodeAkses}? Data wawancara yang sudah dimulai (kalau ada) akan ikut terhapus.`)) return;
      try {
        await deleteSession(row.kodeAkses);
      } catch (e) {
        updateRow(id, { error: "Gagal menghapus: " + e.message });
        return;
      }
    }
    setRows((prev) => (prev.length === 1 ? [emptyRow(0)] : prev.filter((r) => r.id !== id)));
  }

  return (
    <div className="page" style={{ maxWidth: 980 }}>
      <p className="eyebrow">Admin &middot; Setup Sesi</p>
      <div className="row between">
        <h1>Buat Sesi Wawancara</h1>
        <Link to="/admin/sesi"><button>Lihat Semua Sesi</button></Link>
      </div>
      <p className="note">
        Isi data tiap peserta di bawah — jabatan boleh berbeda-beda per baris. Kompetensi yang diuji otomatis
        mengikuti semua kompetensi yang melekat pada jabatan yang dipilih (dengan level yang dipersyaratkan
        dari data jabatan). Klik "Generate" per baris untuk membuat kode aksesnya.
      </p>

      {rows.map((row, idx) => (
        <div key={row.id} className="card">
          <div className="row between" style={{ marginBottom: 4 }}>
            <strong style={{ fontSize: 13, color: "var(--text-muted)" }}>Peserta #{idx + 1}</strong>
            <button onClick={() => handleHapus(row.id)} className="danger" style={{ padding: "4px 10px", fontSize: 12 }}>
              Hapus
            </button>
          </div>

          {row.kodeAkses ? (
            <div className="row between" style={{ alignItems: "center" }}>
              <div>
                <div><strong>{row.nama}</strong> &middot; {row.position.name}</div>
                <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{row.jenisPengukuran} &middot; NIK {row.nik}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Kode Akses</div>
                <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "0.06em" }}>{row.kodeAkses}</div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                <div>
                  <label>Nama</label>
                  <input type="text" value={row.nama} onChange={(e) => updateRow(row.id, { nama: e.target.value })} />
                </div>
                <div>
                  <label>NIK</label>
                  <input type="text" value={row.nik} onChange={(e) => updateRow(row.id, { nik: e.target.value })} />
                </div>
                <div>
                  <label>Tanggal Proses</label>
                  <input type="date" value={row.tanggalProses} onChange={(e) => updateRow(row.id, { tanggalProses: e.target.value })} />
                </div>
                <div>
                  <label>Jenis Pengukuran</label>
                  <select value={row.jenisPengukuran} onChange={(e) => updateRow(row.id, { jenisPengukuran: e.target.value })}>
                    <option value="Profiling">Profiling (jabatan saat ini)</option>
                    <option value="Assessment">Assessment (jabatan tujuan)</option>
                  </select>
                </div>
              </div>

              <label>Jabatan untuk Diukur</label>
              {row.position ? (
                <div className="row between" style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "8px 12px" }}>
                  <div>
                    <strong>{row.position.name}</strong>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {row.position.code} &middot; Grade {row.position.grade || "-"} &middot; {getApplicableCompetencies(row.position).length} kompetensi akan diuji
                    </div>
                  </div>
                  <button onClick={() => updateRow(row.id, { position: null })}>Ganti</button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Cari nama atau kode jabatan..."
                    value={row.jabatanQuery}
                    onChange={(e) => onJabatanSearch(row.id, e.target.value)}
                    autoComplete="off"
                  />
                  {row.jabatanResults.length > 0 && (
                    <div className="result-list">
                      {row.jabatanResults.map((p) => (
                        <div key={p.code} className="result-item" onClick={() => selectJabatan(row.id, p)}>
                          <div>
                            <strong>{p.name}</strong>
                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.code} &middot; Grade {p.grade || "-"} &middot; {p.division || "-"}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {row.error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{row.error}</p>}

              <button
                className="primary"
                style={{ marginTop: 12 }}
                disabled={row.generating}
                onClick={() => handleGenerate(row.id)}
              >
                {row.generating ? "Membuat..." : "Generate Kode Akses"}
              </button>
            </>
          )}
        </div>
      ))}

      <button onClick={addRow} style={{ width: "100%", padding: 12 }}>+ Tambah Peserta</button>
    </div>
  );
}
