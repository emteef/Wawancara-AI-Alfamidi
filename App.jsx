import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import AdminSetup from "./pages/AdminSetup";
import AdminSessions from "./pages/AdminSessions";
import ParticipantLogin from "./pages/ParticipantLogin";
import ParticipantBiodata from "./pages/ParticipantBiodata";
import Pengantar from "./pages/Pengantar";
import Interview from "./pages/Interview";
import ParticipantDone from "./pages/ParticipantDone";
import AssessorReview from "./pages/AssessorReview";

function Home() {
  return (
    <div className="page" style={{ textAlign: "center", paddingTop: 100 }}>
      <h1>Wawancara AI + Coding Kompetensi</h1>
      <p style={{ color: "var(--text-muted)" }}>Pilih peran Anda:</p>
      <div className="row" style={{ justifyContent: "center" }}>
        <Link to="/admin"><button className="primary">Saya Assessor / Admin</button></Link>
        <Link to="/peserta"><button>Saya Peserta</button></Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Admin / Assessor */}
        <Route path="/admin" element={<AdminSetup />} />
        <Route path="/admin/sesi" element={<AdminSessions />} />
        <Route path="/admin/review/:kodeAkses" element={<AssessorReview />} />

        {/* Peserta */}
        <Route path="/peserta" element={<ParticipantLogin />} />
        <Route path="/peserta/biodata/:kodeAkses" element={<ParticipantBiodata />} />
        <Route path="/peserta/pengantar/:kodeAkses" element={<Pengantar />} />
        <Route path="/peserta/wawancara/:kodeAkses" element={<Interview />} />
        <Route path="/peserta/selesai/:kodeAkses" element={<ParticipantDone />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
