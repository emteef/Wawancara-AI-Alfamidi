import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "../firebase";

// Pembungkus halaman admin: wajib login assessor (Firebase Auth email + password).
// Pengamanan yang sebenarnya ada di firestore.rules (daftar email assessor);
// komponen ini hanya mengatur tampilan.
export default function RequireAssessor({ children }) {
  const [user, setUser] = useState(undefined); // undefined = belum tahu
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u || null)), []);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError("Email atau password salah, atau akun belum terdaftar.");
    } finally {
      setBusy(false);
    }
  }

  if (user === undefined) {
    return <div className="page"><p className="hint">Memuat...</p></div>;
  }

  if (!user) {
    return (
      <div className="page" style={{ maxWidth: 420, paddingTop: 80 }}>
        <h1>Login Assessor</h1>
        <p className="hint">Halaman ini khusus assessor / admin.</p>
        <form className="card" onSubmit={handleLogin}>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
          <label style={{ marginTop: 12 }}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p style={{ color: "#c0392b" }}>{error}</p>}
          <button className="primary" type="submit" disabled={busy} style={{ marginTop: 16 }}>
            {busy ? "Masuk..." : "Masuk"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <>
      <header className="admin-nav">
        <div className="admin-nav-inner">
          <div className="admin-brand">Wawancara AI · Assessor</div>
          <nav className="admin-tabs">
            <NavLink to="/admin" end className={({ isActive }) => "admin-tab" + (isActive ? " active" : "")}>
              Buat Kode Akses
            </NavLink>
            <NavLink to="/admin/sesi" className={({ isActive }) => "admin-tab" + (isActive ? " active" : "")}>
              Semua Sesi
            </NavLink>
          </nav>
          <div className="admin-user">
            <span>{user.email}</span>
            <button onClick={() => signOut(auth)}>Keluar</button>
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
