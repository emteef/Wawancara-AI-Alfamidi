import {
  doc, setDoc, getDoc, updateDoc, collection, getDocs,
  query, orderBy, serverTimestamp, arrayUnion,
} from "firebase/firestore";
import { db } from "../firebase";

function randomCode(len = 7) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa karakter ambigu (0/O, 1/I)
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const sessionRef = (kodeAkses) => doc(db, "sessions", kodeAkses);

/** Dipanggil dari halaman Admin Setup setelah assessor pilih jabatan + kompetensi. */
export async function createSession({ position, jenisPengukuran, selectedCompetencyKeys, requiredLevels, createdBy }) {
  let kodeAkses = randomCode();
  // best-effort hindari tabrakan kode (jarang terjadi, tapi dicek sekali)
  const existing = await getDoc(sessionRef(kodeAkses));
  if (existing.exists()) kodeAkses = randomCode();

  await setDoc(sessionRef(kodeAkses), {
    status: "belum_dipakai",
    createdAt: serverTimestamp(),
    createdBy: createdBy || null,
    positionCode: position.code,
    positionName: position.name,
    jenisPengukuran,
    selectedCompetencyKeys,
    requiredLevels, // { competencyKey: 'Basic'|'Intermediate'|'Advance' }
    participant: null,
    segments: {}, // competencyKey -> { turns: [...], completedAt, cappedByTime }
    aiCoding: {}, // competencyKey -> [{ keyBehaviour, level, evidence, reasoning }]
    assessorReview: {}, // competencyKey -> { finalResults, nilaiFinal, finalizedAt, finalizedBy }
    auditLog: [],
  });
  return kodeAkses;
}

export async function getSession(kodeAkses) {
  const snap = await getDoc(sessionRef(kodeAkses));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function saveParticipantData(kodeAkses, participant) {
  await updateDoc(sessionRef(kodeAkses), {
    participant: { ...participant, filledAt: serverTimestamp() },
    status: "berjalan",
  });
}

/** Simpan progress percakapan satu kompetensi (dipanggil tiap giliran, untuk auto-save). */
export async function saveSegmentTurns(kodeAkses, competencyKey, turns, extra = {}) {
  await updateDoc(sessionRef(kodeAkses), {
    [`segments.${competencyKey}`]: { turns, ...extra },
  });
}

export async function saveAiCoding(kodeAkses, competencyKey, results) {
  await updateDoc(sessionRef(kodeAkses), {
    [`aiCoding.${competencyKey}`]: results,
  });
}

export async function markSessionSelesai(kodeAkses) {
  await updateDoc(sessionRef(kodeAkses), { status: "selesai" });
}

/** Assessor menyimpan hasil review (belum final, masih bisa diubah bebas). */
export async function saveAssessorReview(kodeAkses, competencyKey, finalResults, nilaiFinal) {
  await updateDoc(sessionRef(kodeAkses), {
    [`assessorReview.${competencyKey}`]: { finalResults, nilaiFinal, finalizedAt: null },
  });
}

/** Kunci hasil (finalisasi). */
export async function finalizeSession(kodeAkses, by) {
  await updateDoc(sessionRef(kodeAkses), {
    status: "final",
    auditLog: arrayUnion({ action: "finalize", by, at: new Date().toISOString() }),
  });
}

/** Buka kunci untuk edit setelah finalisasi — WAJIB tercatat di audit log. */
export async function unlockSession(kodeAkses, by, reason) {
  await updateDoc(sessionRef(kodeAkses), {
    status: "selesai",
    auditLog: arrayUnion({ action: "unlock", by, at: new Date().toISOString(), reason: reason || null }),
  });
}

export async function logAuditEdit(kodeAkses, by, detail) {
  await updateDoc(sessionRef(kodeAkses), {
    auditLog: arrayUnion({ action: "edit", by, at: new Date().toISOString(), detail }),
  });
}

/** Daftar semua sesi untuk dashboard admin (urut terbaru dulu). */
export async function listSessions() {
  const q = query(collection(db, "sessions"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
