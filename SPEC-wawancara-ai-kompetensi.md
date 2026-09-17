# Spesifikasi Teknis: Aplikasi Wawancara AI + Coding Kompetensi Otomatis

**Status:** Konsep tervalidasi via pilot (artifact interaktif) — siap masuk tahap pengembangan
**Proyek:** Terpisah dari COA App, bagian dari Dept. Assessment tooling — Alfamidi
**Terakhir diperbarui:** hasil sesi brainstorming lengkap (belum ada kode produksi)

---

## 1. Latar Belakang & Tujuan

Alfamidi menggunakan kerangka **16 Kompetensi MIDI** (3 cluster: Core Value, Leadership & Managerial, Personal Effectiveness) untuk talent management. Selama ini penggalian bukti perilaku (BEI) dan coding kompetensi dilakukan manual oleh assessor.

Aplikasi ini bertujuan **mengotomasi wawancara BEI dan coding kompetensi awal menggunakan AI**, dengan hasil yang tetap **direview dan difinalisasi oleh assessor manusia** sebelum dipakai sebagai keputusan resmi. Bukan pengganti assessor — tapi alat bantu percepatan tahap awal (penggalian bukti + draft penilaian).

Ini proyek terpisah dari COA App yang sudah ada, meski berbagi filosofi dan sebagian data sumber yang sama.

---

## 2. Konsep Inti yang Sudah Divalidasi (via Pilot)

Pilot berbasis artifact (HTML + AI call langsung) sudah menguji dan memvalidasi:

- **AI mampu melakukan probing BEI yang natural** — menggali cerita Situasi/Tindakan/Hasil, bukan sekadar membaca skrip pertanyaan — untuk 3 karakter kompetensi berbeda:
  - **Integritas** (Core Value — normatif/etis)
  - **Kepemimpinan Tim** (Leadership & Managerial — interpersonal)
  - **Analisa Penyelesaian Masalah** (Personal Effectiveness — analitis)
- **AI coding** (menilai level Basic/Intermediate/Advance per Key Behaviour dari transkrip, dengan kutipan bukti + alasan) menghasilkan output yang dinilai masuk akal oleh assessor (pengujian kualitatif, subjek terbatas).
- **Kompetensi dapat disembunyikan dari peserta** — AI tidak pernah menyebut nama/kategori kompetensi ke kandidat; transisi antar kompetensi memakai kalimat netral.
- ⚠️ **Belum divalidasi secara mendalam**: akurasi coding across banyak subjek dengan gaya jawaban beragam (panjang/pendek, kooperatif/tidak). Direkomendasikan sebelum go-live.
- ⚠️ **Belum dibandingkan**: kualitas Gemini vs Claude untuk use case spesifik ini (lihat §9).

---

## 3. Sumber Data (Sudah Tersedia di Project)

| Data | Sumber | Isi |
|---|---|---|
| Competency Dictionary | `Worksheet Job Family Kompetensi 16 MIDI_Share — Competency Dictionary.csv` | 16 kompetensi, cluster, deskripsi, Key Behaviour (4-9 per kompetensi), deskripsi perilaku per level (Basic/Intermediate/Advance) |
| Data Posisi/Jabatan | `Worksheet Job Family Kompetensi 16 MIDI Data.xlsx`, sheet **"Job Family Jabatan"** | 944 posisi: kode, nama, grade, divisi, departemen, level jabatan, dan **kompetensi apa saja yang melekat + level yang dipersyaratkan (B/I/A)** per posisi |
| Mode Pengukuran | Sheet **"Master"** di file yang sama | Konfirmasi dua mode: **Profiling** & **Assessment** |
| Matriks Konversi NILAI | Diberikan user (gambar tabel) | Jumlah Indikator (4-9) × Jumlah Tercapai → NILAI (1-5) |

Kedua file sumber (CSV + XLSX) sudah pernah diparse penuh selama sesi ini — semua 16 kompetensi & 944 posisi sudah diekstrak ke format JSON siap pakai (embedded di pilot artifact terakhir).

---

## 4. Alur Pengguna Lengkap

### 4.1 Admin / Assessor — Setup Sesi

1. Assessor **cari jabatan** (nama atau kode posisi) dari database 944 posisi
2. Sistem otomatis tampilkan **kompetensi yang melekat pada jabatan itu + level yang dipersyaratkan** (dari data Job Family Jabatan)
3. Assessor **pilih manual** (default: semua tercentang) kompetensi mana yang akan diuji di sesi ini
4. Sistem **generate kode akses unik** untuk sesi ini (terikat ke konfigurasi: jabatan, kompetensi terpilih, level acuan masing-masing)
5. Kode akses dibagikan ke peserta

### 4.2 Peserta — Login & Data Diri

1. Login pakai **kode akses**
2. Isi **form data diri lengkap**: Nama, NIK (Nomor Induk Karyawan), Cabang, Jabatan Saat Ini, Jabatan Tujuan, Tanggal Proses, Jenis Pengukuran
   - Field **Jabatan / Jenis Pengukuran** di form ini **terkunci otomatis** sesuai yang sudah di-setup assessor di kode akses (peserta tidak bisa ubah)
   - **Jabatan Tujuan wajib diisi hanya jika Jenis Pengukuran = Assessment** (Profiling tidak butuh field ini)

### 4.3 Peserta — Pengantar

- Halaman penjelasan proses tes wawancara AI
- **Permintaan izin mikrofon eksplisit** (tombol jelas + test), karena ini titik kritis secara teknis (lihat §8)

### 4.4 Peserta — Wawancara AI

- **AI bertanya via teks** (bukan suara — kualitas TTS Bahasa Indonesia belum meyakinkan); **peserta menjawab via suara** (Web Speech API, `lang: 'id-ID'`), dengan fallback ketik manual kapan saja
- Peserta **tidak pernah tahu** kompetensi/Key Behaviour apa yang sedang digali — tidak ada nama kompetensi ditampilkan di UI maupun disebut AI
- Progress hanya ditampilkan generik: **"Bagian X dari N"**
- Berjalan berurutan melalui semua kompetensi terpilih, transisi antar kompetensi natural & tidak membocorkan topik berikutnya
- **Auto-save** — progress tersimpan otomatis terikat ke kode akses; peserta bisa keluar & lanjut nanti dengan kode akses yang sama (tombol eksplisit "Jeda & Lanjutkan Nanti" tersedia)
- **Batas waktu** (safety net, tidak ditampilkan ke peserta sebagai countdown):
  - Maksimal **10 menit per kompetensi** — kalau tercapai, sistem lanjut ke kompetensi berikutnya secara natural
  - Maksimal **120 menit total sesi** — kalau tercapai, wawancara diakhiri; kompetensi yang belum sempat dibahas ditandai "tidak sempat dibahas" di hasil (bukan dianggap gagal/nol)

### 4.5 AI Coding (otomatis, setelah wawancara selesai/dihentikan)

- Untuk setiap kompetensi yang sempat dibahas: AI analisis transkrip → tentukan level (Basic/Intermediate/Advance) per Key Behaviour + kutipan bukti + alasan singkat
- Output terstruktur (JSON) per Key Behaviour

### 4.6 Assessor — Review & Finalisasi

1. Dashboard: daftar sesi (kode akses, jabatan, status: belum dipakai/berjalan/selesai, tanggal)
2. Buka sesi selesai → lihat data diri peserta, transkrip lengkap per kompetensi, hasil AI coding per Key Behaviour (level + bukti + alasan)
3. Assessor bisa **override level** per Key Behaviour + tambah catatan
4. **NILAI final (1-5) per kompetensi dihitung otomatis & live** (lihat §5) setiap assessor mengubah level
5. **Finalisasi**: tombol mengunci hasil (read-only). Tersedia **"Buka Kunci untuk Edit"** untuk koreksi setelah finalisasi — setiap perubahan pasca-unlock **tercatat jejak audit** (siapa, kapan, apa yang berubah)
6. **Ekspor transkrip ke Word (.docx)** — generation client-side

---

## 5. Logika Penilaian (Agregasi Key Behaviour → NILAI Kompetensi)

### Definisi "Tercapai"
Satu Key Behaviour dianggap **tercapai** jika level yang ditunjukkan kandidat (hasil coding AI, sudah difinalisasi assessor) **≥ level yang dipersyaratkan** untuk kompetensi tersebut.

Level yang dipersyaratkan diambil dari data posisi (§3), sesuai jabatan yang relevan dengan mode:
- **Mode Profiling** → level dari **jabatan saat ini**
- **Mode Assessment** → level dari **jabatan tujuan**

(Catatan: satu level acuan berlaku untuk *semua* Key Behaviour dalam kompetensi itu, karena di data sumber, persyaratan level memang per-kompetensi, bukan per-Key-Behaviour.)

### Matriks Konversi ke NILAI (1-5)

Jumlah Key Behaviour yang tercapai dibandingkan terhadap total indikator kompetensi tsb (4-9), lalu dicocokkan ke matriks resmi Alfamidi:

| Jumlah Indikator → | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|
| **NILAI 1** | 0 | 1 | 1 | 1 | 1 | 1 |
| **NILAI 2** | 1 | 2 | 2 | 2 | 2-3 | 2-3 |
| **NILAI 3** | 2 | 3 | 3 | 3-4 | 4 | 4-5 |
| **NILAI 4** | 3 | 4 | 4 | 5 | 5-6 | 6-7 |
| **NILAI 5** | 4 | 5 | 5-6 | 6-7 | 7-8 | 8-9 |

⚠️ **ASUMSI BELUM DIKONFIRMASI SECARA EKSPLISIT**: untuk sel berisi rentang (mis. "2-3"), pilot ini mengambil **batas bawah sebagai ambang minimum** (mis. "minimal 2 tercapai = NILAI 2"). Sebelum dipakai produksi, konfirmasikan ke pemilik metodologi apakah interpretasi ini benar, atau apakah rentang berarti sesuatu yang lain (mis. harus tepat berada di rentang itu).

**NILAI 1-5 ini adalah rating akhir kompetensi itu sendiri** — berdiri sendiri, TIDAK dipetakan balik ke label Basic/Intermediate/Advance.

---

## 6. Skema Data (Firestore — draft)

```
positions/            (opsional: bisa dibaca live dari Google Sheet seperti Competency List App,
                        atau di-sync ke Firestore untuk kecepatan)
  { code, name, grade, division, dept, levelJabatan,
    competencies: { <competencyKey>: "Basic"|"Intermediate"|"Advance", ... } }

sessions/{kodeAkses}
  {
    status: "belum_dipakai" | "berjalan" | "selesai" | "final",
    createdAt, createdBy (assessor),
    positionCode, positionName,
    jenisPengukuran: "Profiling" | "Assessment",
    selectedCompetencyKeys: [...],
    requiredLevels: { <competencyKey>: "Basic"|"Intermediate"|"Advance" },

    participant: {
      nama, nik, cabang, jabatanSaatIni, jabatanTujuan (nullable),
      tanggalProses, filledAt
    },

    /segments (subcollection, satu per kompetensi)
      {
        competencyKey,
        turns: [{ role: "assistant"|"user", content, timestamp }],
        startedAt, completedAt, cappedByTime: boolean
      }

    /aiCoding (subcollection, satu per kompetensi)
      { competencyKey,
        results: [{ keyBehaviour, level, evidence, reasoning }] }

    /assessorReview (subcollection, satu per kompetensi)
      { competencyKey,
        finalResults: [{ keyBehaviour, finalLevel, assessorNote }],
        nilaiFinal: 1-5,
        finalizedAt, finalizedBy,
        auditLog: [{ action: "unlock"|"edit"|"finalize", by, at, detail }]
      }
  }
```

---

## 7. Tumpukan Teknis (Konsisten dengan Tooling Existing)

- **React + Vite** — frontend (sama seperti COA App)
- **Firebase**: Firestore (data sesi/peserta/transkrip), Firebase Hosting, Auth (Email/Password untuk assessor; kode akses custom untuk peserta — bukan akun formal)
- **Gemini API** (client-side call, free tier, model `gemini-2.5-flash` atau setara) — konsisten dengan COA App; lihat §9 soal evaluasi Gemini vs Claude
- **GitHub Codespaces** — dev environment (constraint laptop kerja)
- **Client-side Word export** — library JS untuk generate `.docx` di browser (pola serupa ExcelJS yang sudah dipakai)
- **Web Speech API** (`SpeechRecognition`, `lang: 'id-ID'`) — input suara peserta, browser-native, gratis

---

## 8. Temuan Teknis Kritis dari Pilot

⚠️ **Mikrofon TIDAK BOLEH dites di lingkungan artifact/tertanam (embedded iframe)** — selama pilot, izin mikrofon konsisten gagal ("izin ditolak") ketika dijalankan di dalam tampilan artifact claude.ai, walau sudah pakai Chrome dan tombol izin eksplisit (`getUserMedia`). Kemungkinan besar ini keterbatasan iframe tertanam, bukan masalah kode.

**Implikasi**: mikrofon harus diuji ulang setelah deploy sebagai **halaman mandiri** (bukan tertanam) di Firebase Hosting — kemungkinan besar akan berfungsi normal di sana karena izin browser standar berlaku untuk halaman top-level. Ini **wajib divalidasi di awal masa development**, sebelum fitur lain dibangun di atasnya.

---

## 9. Keputusan Model AI

- Saat ini pilot berjalan dengan Claude (lewat fitur AI bawaan artifact) dan hasilnya dinilai baik oleh assessor
- COA App eksisting pakai **Gemini 2.5 Flash (free tier)** — ada insentif kuat untuk konsisten pakai Gemini demi biaya, terutama karena volume API call per peserta cukup tinggi (tiap pertanyaan + coding akhir per kompetensi)
- **Belum diuji**: apakah Gemini menghasilkan kualitas probing & coding yang setara untuk task spesifik ini (instruksi nuanced: probing natural, tidak membocorkan kompetensi, output JSON konsisten)
- **Rekomendasi**: uji manual dengan prompt yang identik (rules wawancara + rules coding dari pilot ini) di Google AI Studio sebelum commit ke satu model, terutama untuk kasus edge (jawaban sangat pendek/panjang, kandidat tidak kooperatif)

---

## 10. Item yang Masih Terbuka / Perlu Diputuskan Sebelum/Selama Development

1. **Konfirmasi interpretasi matriks NILAI** untuk sel rentang (§5) ke pemilik metodologi resmi
2. **Mekanisme retensi data 12 bulan** — perlu cara hapus otomatis data lampau; stack ini historically menghindari Cloud Functions (constraint Workspace), jadi perlu solusi alternatif (mis. proses manual berkala, atau Cloud Function terbatas khusus untuk ini kalau constraint bisa dilonggarkan)
3. **Validasi akurasi coding AI lebih dalam** — uji ke banyak subjek dengan gaya jawaban beragam, bandingkan ke penilaian assessor manusia langsung
4. **Perbandingan Gemini vs Claude** untuk task ini secara langsung (§9)
5. **Firestore security rules** — pastikan hanya role assessor yang bisa baca data mentah peserta (NIK, transkrip)
6. **Rate limit Gemini free tier** — cek apakah cukup untuk volume peserta yang direncanakan, terutama kalau banyak sesi berjalan bersamaan

---

## 11. Yang TIDAK Termasuk Scope Pilot (Perlu Dibangun dari Nol saat Development)

- Autentikasi & manajemen akun assessor (admin)
- Generate & kelola kode akses per sesi (persisten, bukan sekali pakai di memori)
- Dashboard daftar semua sesi + status
- Penyimpanan data persisten lintas sesi/peserta (pilot berjalan sepenuhnya di memori browser, hilang saat reload)
- Auto-save & resume progress via kode akses (perlu Firestore, bukan hanya logic di client)
- Export Word
- Audit log finalisasi/unlock
- Firestore security rules & role-based access
