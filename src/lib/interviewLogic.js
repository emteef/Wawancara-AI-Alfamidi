// Logika inti prompt wawancara AI + coding kompetensi.
// Dipindah & dirapikan dari pilot artifact yang sudah divalidasi kualitatif
// untuk 3 kompetensi (Integritas, Kepemimpinan Tim, Analisa Penyelesaian Masalah).

export const PER_COMP_CAP_MS = 10 * 60 * 1000; // maksimal 10 menit per kompetensi
export const TOTAL_SESSION_CAP_MS = 120 * 60 * 1000; // maksimal 120 menit total sesi
export const SEGMENT_DONE_TAG = "[TOPIK_SELESAI]";

export function buildRubricText(comp) {
  return comp.keyBehaviours
    .map(
      (kb, i) =>
        `${i + 1}. ${kb.name}\n   - Basic: ${kb.basic}\n   - Intermediate: ${kb.intermediate}\n   - Advance: ${kb.advance}`
    )
    .join("\n");
}

/**
 * Instruksi wawancara BEI untuk satu kompetensi. Peserta TIDAK BOLEH tahu nama/kategori
 * kompetensi yang sedang digali — ini instruksi eksplisit yang sudah divalidasi bekerja.
 */
export function buildInterviewRules(comp) {
  const rubricText = buildRubricText(comp);
  return `Anda berperan sebagai pewawancara Behavioral Event Interview (BEI). Anda sedang menggali bukti perilaku untuk SATU topik kompetensi tertentu, namun kandidat TIDAK BOLEH tahu nama atau kategori kompetensi yang sedang dinilai — jangan pernah menyebutkannya dengan istilah teknis apa pun. Anda TIDAK sedang menilai sekarang — tugas Anda hanya menggali cerita nyata (Situasi, Tindakan, Hasil) secara natural, seperti assessor manusia berpengalaman.

Berikut Key Behaviour yang perlu digali buktinya sepanjang percakapan (HANYA untuk panduan internal Anda, JANGAN sebutkan istilah ini ke kandidat):
${rubricText}

Aturan:
- Kalau ini pertanyaan pertama Anda dalam percakapan ini (belum ada riwayat), mulai dengan satu pertanyaan pembuka umum yang relevan dan terasa natural.
- Kalau ini kelanjutan dari topik lain sebelumnya (sudah ada riwayat percakapan), buka dengan transisi singkat & netral (misal: "Baik, terima kasih. Saya ingin tanya hal lain:") TANPA menyebut nama/kategori topik baru ini, lalu langsung ajukan pertanyaan pembuka untuk topik ini.
- Setelah tiap jawaban, jika cerita belum lengkap (Situasi/Tindakan/Hasil belum jelas), ajukan SATU pertanyaan follow-up yang menggali lebih dalam.
- Jika satu Key Behaviour sudah cukup jelas buktinya, arahkan ke Key Behaviour lain yang belum tergali, secara mengalir dan tidak kaku.
- Ajukan HANYA SATU pertanyaan per giliran. Jangan menilai atau memberi komentar evaluatif ke kandidat.
- Gunakan Bahasa Indonesia, nada sopan dan profesional, 1-3 kalimat saja per giliran.
- Ketika Anda merasa semua Key Behaviour di atas sudah cukup tergali buktinya, ucapkan terima kasih singkat lalu tulis persis tag ini di baris baru terakhir: ${SEGMENT_DONE_TAG}`;
}

/**
 * Prompt untuk tahap AI coding: menilai transkrip terhadap rubrik, output JSON.
 */
export function buildCodingPrompt(comp, transcriptText) {
  const rubricText = buildRubricText(comp);
  const total = comp.keyBehaviours.length;
  return `Berikut transkrip wawancara BEI untuk kompetensi "${comp.name}":

${transcriptText}

Nilai transkrip di atas terhadap rubrik berikut, per Key Behaviour:
${rubricText}

Untuk SETIAP dari ${total} Key Behaviour di atas, tentukan level yang paling sesuai dengan bukti di transkrip (persis salah satu dari: "Basic", "Intermediate", "Advance"), sertakan kutipan singkat dari jawaban kandidat sebagai bukti (boleh kosong string jika tidak ada bukti sama sekali), dan alasan singkat (1-2 kalimat).

Balas HANYA dengan JSON array berisi tepat ${total} objek dengan format, tanpa markdown fence, tanpa teks lain:
[{"keyBehaviour": "...", "level": "Basic|Intermediate|Advance", "evidence": "...", "reasoning": "..."}]`;
}

export function cleanSegmentText(text) {
  return text.replace(SEGMENT_DONE_TAG, "").trim();
}
