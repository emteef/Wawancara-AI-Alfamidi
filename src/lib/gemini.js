// Wrapper pemanggilan Gemini API (client-side), konsisten dengan pola yang sudah dipakai di COA App.
// PENTING (keamanan): API key client-side bisa dibaca siapa pun yang inspect network tab.
// Mitigasi minimum: aktifkan "API key restriction" (HTTP referrer) di Google AI Studio / Cloud Console,
// batasi hanya domain Firebase Hosting produksi yang boleh memakai key ini.

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL = import.meta.env.VITE_GEMINI_MODEL || "gemini-3.6-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

/**
 * Kirim satu giliran percakapan ke Gemini.
 * @param {Array<{role: 'user'|'model', content: string}>} turns - riwayat percakapan
 * @returns {Promise<string>} teks balasan
 */
export async function askGemini(turns) {
  const contents = turns.map((t) => ({
    role: t.role === "assistant" ? "model" : "user",
    parts: [{ text: t.content }],
  }));

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
  if (!text) throw new Error("Gemini API: respons kosong / tidak terduga");
  return text;
}

/**
 * Minta Gemini membalas dalam format JSON murni, lalu parse.
 * Menambahkan instruksi "balas HANYA JSON" secara implisit lewat prompt yang dikirim caller.
 */
export async function askGeminiJSON(prompt) {
  const raw = await askGemini([{ role: "user", content: prompt }]);
  // Gemini kadang membungkus JSON dengan ```json ... ``` — bersihkan dulu.
  const cleaned = raw.replace(/```json\s*|```\s*$/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error("Gagal parse JSON dari Gemini: " + e.message + "\nRaw: " + raw.slice(0, 300));
  }
}
