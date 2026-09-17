# Wawancara AI + Coding Kompetensi Otomatis

Scaffold aplikasi hasil brainstorming (lihat `SPEC-wawancara-ai-kompetensi.md` untuk dokumen spesifikasi lengkap). Belum production-ready — lihat "Yang Masih Perlu Dikerjakan" di bawah.

## Setup

```bash
npm install
cp .env.example .env
# isi .env dengan kredensial Firebase project Anda + Gemini API key
npm run dev
```

## ⚠️ WAJIB dites di awal: Mikrofon

Selama pilot (artifact tertanam di claude.ai), izin mikrofon TIDAK BERHASIL karena keterbatasan
iframe tertanam. Begitu `npm run dev` / hasil deploy dibuka sebagai **halaman mandiri** (bukan
tertanam), ini seharusnya berfungsi normal — **tapi validasi ini dulu** sebelum lanjut membangun
fitur lain di atasnya. Buka `/peserta/pengantar/<kode>` dan tes tombol "Izinkan Mikrofon".

## Struktur

```
src/
  data/
    competencies.json   16 kompetensi lengkap (cluster, Key Behaviour, rubrik Basic/Int/Adv)
    positions.json       944 posisi + kompetensi & level yang dipersyaratkan per posisi
  lib/
    dataStore.js         helper pencarian jabatan & kompetensi
    interviewLogic.js     prompt wawancara & coding, batas waktu
    nilaiMatrix.js         matriks konversi Key Behaviour tercapai -> NILAI 1-5
    gemini.js               wrapper call Gemini API (client-side)
    sessions.js             semua operasi Firestore untuk sesi
    exportWord.js           ekspor transkrip ke .docx
  pages/
    AdminSetup.jsx        cari jabatan, pilih kompetensi, generate kode akses
    AdminSessions.jsx     daftar semua sesi
    ParticipantLogin.jsx  masuk pakai kode akses
    ParticipantBiodata.jsx  isi data diri (jabatan terkunci dari admin)
    Pengantar.jsx          penjelasan + izin mikrofon
    Interview.jsx           wawancara AI inti (auto-save, batas waktu, hidden competency)
    ParticipantDone.jsx     halaman terima kasih
    AssessorReview.jsx      review, override level, finalisasi, unlock+audit, ekspor Word
```

## Deploy ke Firebase

```bash
npm install -g firebase-tools   # kalau belum ada
firebase login
firebase init hosting firestore  # pilih project Anda, gunakan konfigurasi default Vite (dist/)
npm run build
firebase deploy
```

Jangan lupa deploy `firestore.rules` juga (`firebase deploy --only firestore:rules`) — dan
sesuaikan dulu logic `isAssessor()` di dalamnya dengan cara Anda menandai role assessor
di Firebase Auth (custom claims / collection `assessors`).

## Yang Masih Perlu Dikerjakan (lihat SPEC untuk detail)

- [ ] Autentikasi assessor sungguhan (saat ini `auth.currentUser` dipakai tapi belum ada halaman login)
- [ ] Setup collection `assessors/{uid}` untuk role-check di security rules
- [ ] Validasi ulang mikrofon di halaman mandiri (lihat peringatan di atas)
- [ ] Mekanisme retensi/penghapusan data setelah 12 bulan
- [ ] Konfirmasi interpretasi matriks NILAI untuk sel rentang (lihat komentar di `nilaiMatrix.js`)
- [ ] Uji perbandingan kualitas Gemini vs model lain untuk task probing + coding ini
- [ ] Validasi akurasi coding AI ke lebih banyak subjek nyata sebelum go-live
- [ ] Restriksi API key Gemini (HTTP referrer) di Google Cloud Console / AI Studio
- [ ] Styling/branding Alfamidi (logo, warna) — saat ini pakai desain netral dari pilot
