// Matriks resmi Alfamidi: minimum jumlah Key Behaviour "tercapai" untuk tiap NILAI (1-5),
// per total jumlah indikator (4-9) dalam satu kompetensi.
//
// ASUMSI BELUM DIKONFIRMASI: untuk sel berisi rentang di tabel asli (mis. "2-3", "5-6"),
// nilai di bawah ini mengambil BATAS BAWAH rentang sebagai ambang minimum.
// Contoh: kolom 6 indikator, NILAI 5 = "5-6" di tabel asli -> di sini jadi threshold 5
// (artinya "tercapai >= 5 dari 6" sudah cukup untuk NILAI 5).
// -> WAJIB dikonfirmasi ke pemilik metodologi sebelum dipakai untuk keputusan resmi.
export const NILAI_MATRIX = {
  4: [0, 1, 2, 3, 4],
  5: [1, 2, 3, 4, 5],
  6: [1, 2, 3, 4, 5],
  7: [1, 2, 3, 5, 6],
  8: [1, 2, 4, 5, 7],
  9: [1, 2, 4, 6, 8],
};

export const LEVEL_ORDER = { Basic: 1, Intermediate: 2, Advance: 3 };

/**
 * Hitung NILAI (1-5) dari jumlah Key Behaviour yang tercapai, terhadap total indikator kompetensi.
 */
export function computeNilai(totalIndikator, jumlahTercapai) {
  const clamped = Math.min(9, Math.max(4, totalIndikator));
  const thresholds = NILAI_MATRIX[totalIndikator] || NILAI_MATRIX[clamped];
  let nilai = 1;
  for (let n = 5; n >= 1; n--) {
    if (jumlahTercapai >= thresholds[n - 1]) {
      nilai = n;
      break;
    }
  }
  return nilai;
}

/**
 * Hitung berapa Key Behaviour "tercapai": level final assessor >= level yang dipersyaratkan.
 * @param {Array<{finalLevel: 'Basic'|'Intermediate'|'Advance'}>} finalResults
 * @param {'Basic'|'Intermediate'|'Advance'} requiredLevel
 */
export function countTercapai(finalResults, requiredLevel) {
  return finalResults.filter((r) => LEVEL_ORDER[r.finalLevel] >= LEVEL_ORDER[requiredLevel]).length;
}
