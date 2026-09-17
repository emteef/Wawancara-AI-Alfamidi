import competencies from "../data/competencies.json";
import positions from "../data/positions.json";

// NOTE: untuk produksi, pertimbangkan sinkronisasi berkala dari Google Sheet sumber
// (seperti Competency List App) alih-alih file statis ini, supaya perubahan data jabatan
// tidak butuh rebuild & redeploy aplikasi.

export const COMPETENCIES = competencies;
export const POSITIONS = positions;

export function searchPositions(query, limit = 15) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return POSITIONS.filter(
    (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
  ).slice(0, limit);
}

export function getApplicableCompetencies(position) {
  // Hanya kompetensi yang (a) melekat pada posisi ini, dan (b) rubriknya tersedia di data kita.
  return Object.keys(position.competencies).filter((key) => COMPETENCIES[key]);
}

/**
 * Level yang dipersyaratkan untuk satu kompetensi pada satu posisi.
 * Jenis Pengukuran menentukan posisi mana yang dipakai (caller yang memilih posisi mana yang dikirim ke sini).
 */
export function getRequiredLevel(position, competencyKey) {
  return position?.competencies?.[competencyKey] || "Intermediate";
}
