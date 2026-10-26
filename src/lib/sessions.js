import {
  doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs,
  query, orderBy, serverTimestamp, arrayUnion,
} from "firebase/firestore";
import { db } from "../firebase";

function randomCode(len = 7) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const sessionRef = (k) => doc(db, "sessions", k);

export async function createSession({ position, jenisPengukuran, applicableCompetencyKeys, requiredLevels, participant, createdBy }) {
  let kodeAkses = randomCode();
  const ex = await getDoc(sessionRef(kodeAkses));
  if (ex.exists()) kodeAkses = randomCode();
  await setDoc(sessionRef(kodeAkses), {
    status: "belum_dipakai",
    createdAt: serverTimestamp(),
    createdBy: createdBy || null,
    positionCode: position.code,
    positionName: position.name,
    jenisPengukuran,
    selectedCompetencyKeys: applicableCompetencyKeys,
    requiredLevels,
    participant: {
      nama: participant.nama,
      nik: participant.nik,
      tanggalProses: participant.tanggalProses,
      cabang: null,
      jabatanTampil: position.name,
    },
    segments: {},
    aiCoding: {},
    assessorReview: {},
    auditLog: [],
  });
  return kodeAkses;
}

export async function deleteSession(k) { await deleteDoc(sessionRef(k)); }

export async function getSession(k) {
  const s = await getDoc(sessionRef(k));
  return s.exists() ? { id: s.id, ...s.data() } : null;
}

export async function updateParticipantData(k, { nama, jabatanTampil, cabang }) {
  await updateDoc(sessionRef(k), {
    "participant.nama": nama,
    "participant.jabatanTampil": jabatanTampil,
    "participant.cabang": cabang,
    "participant.filledAt": serverTimestamp(),
    status: "berjalan",
  });
}

export async function saveSegmentTurns(k, ck, turns, extra = {}) {
  await updateDoc(sessionRef(k), { [`segments.${ck}`]: { turns, ...extra } });
}

export async function saveAiCoding(k, ck, results) {
  await updateDoc(sessionRef(k), { [`aiCoding.${ck}`]: results });
}

export async function markSessionSelesai(k) { await updateDoc(sessionRef(k), { status: "selesai" }); }

export async function saveAssessorReview(k, ck, finalResults, nilaiFinal) {
  await updateDoc(sessionRef(k), { [`assessorReview.${ck}`]: { finalResults, nilaiFinal, finalizedAt: null } });
}

export async function finalizeSession(k, by) {
  await updateDoc(sessionRef(k), { status: "final", auditLog: arrayUnion({ action: "finalize", by, at: new Date().toISOString() }) });
}

export async function unlockSession(k, by, reason) {
  await updateDoc(sessionRef(k), { status: "selesai", auditLog: arrayUnion({ action: "unlock", by, at: new Date().toISOString(), reason: reason || null }) });
}

export async function logAuditEdit(k, by, detail) {
  await updateDoc(sessionRef(k), { auditLog: arrayUnion({ action: "edit", by, at: new Date().toISOString(), detail }) });
}

export async function listSessions() {
  const q = query(collection(db, "sessions"), orderBy("createdAt", "desc"));
  const s = await getDocs(q);
  return s.docs.map((d) => ({ id: d.id, ...d.data() }));
}
