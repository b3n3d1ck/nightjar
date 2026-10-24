# NIGHTJAR

Tempat buat ngereview temuan keamanan web: apa yang kebaca dari sebuah situs,
kenapa itu penting, dan gimana cara benerinnya — semuanya dalam satu scope yang
kamu memang boleh tes. Anggap NIGHTJAR ini lapisan "baca hasil"-nya, yang duduk
di atas engine command-line kayak
[ghostmap](https://github.com/b3n3d1ck/ghostmap) sama
[shellhound](https://github.com/b3n3d1ck/shellhound).

> Jujur dari awal: sebagian halaman (dashboard & history) pakai **data contoh**
> yang jelas ditandai "Demo". Yang beneran jalan ke server itu halaman Scan.
> Nggak ada angka yang digede-gedein di sini.

## Bisa ngapain aja

- **Scan URL (live, pasif)** — masukin situs yang kamu punya izinnya, server
  bakal ngecek apa yang kebuka: info host (IP, reverse DNS, server, teknologi),
  header keamanan yang hilang, cookie tanpa flag, versi yang bocor, file sensitif
  yang kebuka (rahasianya disensor), directory listing, deteksi login/upload/
  webshell, sama cek HTTP→HTTPS. Cuma GET, nggak nyerang. Hasilnya bisa diekspor
  ke Markdown atau JSON.
- **Analisis URL / phishing (offline)** — cek link mencurigakan tanpa ngirim
  request ke mana-mana: trik `user@host`, punycode/homoglyph, host IP mentah,
  nama brand yang dipakai di domain yang salah, TLD berisiko, subdomain
  bertingkat-tingkat. Ini indikator, bukan vonis.
- **Findings** — tabel temuan yang bisa dicari & difilter, ada panel detail,
  status bisa kamu set (kesimpen di browser), bisa ekspor Markdown.
- **Dashboard, History, Learn, Settings** — ringkasan postur, riwayat run (demo),
  penjelasan tiap jenis kelemahan, sama pengaturan.
- **Command palette** (⌘K / Ctrl+K) buat lompat ke halaman atau temuan mana aja.

## Yang beneran jalan vs demo

Biar nggak salah paham:

| Bagian | Status |
|---|---|
| Scan URL (`/scan`) | **Nyata** — jalan ke server beneran, pasif. |
| SSRF guard, cek redirect, enforce scope | **Nyata**, dijaga di backend, ada testnya. |
| Analisis URL (`/analyze`) | **Nyata**, offline, tanpa network. |
| Status temuan + progress remediasi, settings | **Nyata tapi per-browser** (localStorage), nggak kesimpen di server. |
| Angka dashboard & History (`/scans`) | **Data demo**, jelas ditandai, bukan hasil scan beneran. |
| Autentikasi / multi-user | **Belum ada.** |

Hasil scan live sama data demo nggak pernah dicampur.

## Stack

- Next.js (App Router, React, mostly Server Components)
- TypeScript (strict)
- Tailwind CSS v4 — token desain ada di `src/app/globals.css`

## Cara jalanin

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # build production (sekalian type-check)
npm run lint
npm test        # unit + component test (Vitest)
```

## Soal scope

NIGHTJAR itu buat orang yang **punya izin** buat nge-tes sebuah sistem. Dia nggak
ngasih izin itu. Jalanin assessment cuma ke sistem yang kamu punya atau yang
emang dibolehin. Detail teknis soal batasan (DNS rebinding, serverless, dll) ada
di `docs/AUDIT.md` dan `SECURITY.md`.
