# Mini UD Indonesia — Active–Passive Visualizer

**Disusun oleh:** Mohamad Arif (Individu)

Proyek visualisasi **Universal Dependencies (UD)** dalam Bahasa Indonesia melalui studi perbandingan kalimat aktif vs kalimat pasif:

- **Active:** Siti membaca buku di perpustakaan.
- **Passive:** Buku dibaca oleh Siti di perpustakaan.

---

## Cara Menjalankan

Buka terminal di dalam folder proyek ini:

```bash
python -m http.server 8000
```

Buka URL di browser: **<http://localhost:8000/>** (atau gunakan `python3` jika di macOS/Linux).

> Tanpa instalasi framework atau library JavaScript tambahan. Python hanya digunakan sebagai *local web server*.

---

## Struktur Berkas

```text
├── README.md               # Dokumentasi proyek
├── laporan.md              # Laporan analisis lengkap (Task A–D & Bonus)
├── screenshot.png          # Bukti tangkapan layar antarmuka aplikasi
├── index.html              # Antarmuka visualisasi web
├── style.css               # Styling layout, SVG, dan inspector
├── app.js                  # Engine parsing CoNLL-U dan visualisasi SVG interaktif
├── validate_conllu.py      # Skrip validator format data CoNLL-U
└── data/
    └── contoh_kalimat.conllu  # Dataset anotasi sintaksis CoNLL-U (UD v2)
```

---

## Fitur yang Diimplementasikan (Task D & Bonus Challenge)

1. **Highlight Case Markers (`di`, `oleh`):** Penandaan visual khusus relasi preposisi penanda kasus dengan warna hijau zamrud (`#16835f`) dan panah kustom.
2. **Toggle Label UPOS:** Checkbox interaktif untuk menampilkan atau menyembunyikan label *Universal Part-of-Speech* di bawah kata.
3. **Tabel Komparasi 5 Kolom:** Menampilkan perbandingan kestabilan peran semantik (*semantic roles*) vs transformasi relasi gramatikal (*grammatical relations*).
4. **Analisis Interaktif Token Inspector:** Penjelasan teoritis kontekstual saat mengklik token *case* atau verba utama.
5. **Panel Analisis Bonus Challenge ("di" vs "di-"):** Tinjauan komparasi preposisi mandiri leksikal vs afiks infleksional pasif sesuai prinsip *Lexicalism* (§2.1) dan *Treatment of Prepositions* (§2.5).

---

## Validasi Data Anotasi

Untuk memverifikasi keabsahan data CoNLL-U:

```bash
python validate_conllu.py data/contoh_kalimat.conllu
```

---

## Referensi

- de Marneffe et al. (2015 revision). [*Universal Dependencies: A cross-linguistic typology*](https://nlp.stanford.edu/~manning/papers/USD_LREC14_UD_revision.pdf).
- [Universal Dependencies v2 Guidelines](https://universaldependencies.org/u/dep/index.html).
- [UD Indonesian-GSD Treebank](https://universaldependencies.org/treebanks/id_gsd/index.html).
