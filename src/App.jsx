import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminSetup from "./pages/AdminSetup";
import AdminSessions from "./pages/AdminSessions";
import ParticipantLogin from "./pages/ParticipantLogin";
import ParticipantBiodata from "./pages/ParticipantBiodata";
import Pengantar from "./pages/Pengantar";
import Interview from "./pages/Interview";
import ParticipantDone from "./pages/ParticipantDone";
import AssessorReview from "./pages/AssessorReview";
import RequireAssessor from "./components/RequireAssessor";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/peserta" replace />} />

        {/* Admin / Assessor */}
        <Route path="/admin" element={<RequireAssessor><AdminSetup /></RequireAssessor>} />
        <Route path="/admin/sesi" element={<RequireAssessor><AdminSessions /></RequireAssessor>} />
        <Route path="/admin/review/:kodeAkses" element={<RequireAssessor><AssessorReview /></RequireAssessor>} />

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
