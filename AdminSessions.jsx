import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listSessions } from "../lib/sessions";

const STATUS_LABEL = {
  belum_dipakai: "Belum Dipakai",
  berjalan: "Sedang Berjalan",
  selesai: "Selesai (Perlu Review)",
  final: "Final",
};

export default function AdminSessions() {
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    listSessions().then(setSessions).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <p className="eyebrow">Admin</p>
      <div className="row between">
        <h1>Daftar Sesi</h1>
        <Link to="/admin"><button className="primary">+ Sesi Baru</button></Link>
      </div>

      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      {!sessions && !error && <p>Memuat...</p>}
      {sessions && sessions.length === 0 && <p>Belum ada sesi dibuat.</p>}

      {sessions && sessions.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Kode</th>
              <th>Jabatan</th>
              <th>Jenis</th>
              <th>Peserta</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td><code>{s.id}</code></td>
                <td>{s.positionName}</td>
                <td>{s.jenisPengukuran}</td>
                <td>{s.participant?.nama || <em style={{ color: "var(--text-muted)" }}>belum diisi</em>}</td>
                <td><span className={`badge status-${s.status}`}>{STATUS_LABEL[s.status] || s.status}</span></td>
                <td>
                  {(s.status === "selesai" || s.status === "final") && (
                    <Link to={`/admin/review/${s.id}`}><button>Review</button></Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
