// Mini UD Indonesia: parser CoNLL-U dan visualisasi SVG tanpa external library.
// HEAD menunjuk ke head; panah visual bergerak dari head ke dependent.
const SVG_NS = "http://www.w3.org/2000/svg";

// Semantic roles ini ditetapkan MANUAL untuk tujuan pedagogis.
// Agent/Patient/Location bukan output parser UD dan bukan bagian dari DEPREL.
const SEMANTIC_ROLES = {
  aktif: { 1: "agent", 3: "patient", 5: "location" },
  pasif: { 1: "patient", 4: "agent", 6: "location" },
};
const ROLE_NAME = { agent: "Agent", patient: "Patient", location: "Location" };
const CHANGING_ROLES = new Set(["agent", "patient"]);
let sentences = {};

function parseConllu(raw) {
  const results = [];
  // Baris kosong memisahkan sentence. Setiap word line harus 10 kolom (TAB).
  for (const block of raw.trim().split(/\r?\n\s*\r?\n/)) {
    const sentence = { id: "", text: "", tokens: [] };
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith("# sent_id = ")) {
        sentence.id = line.slice("# sent_id = ".length).trim();
      } else if (line.startsWith("# text = ")) {
        sentence.text = line.slice("# text = ".length).trim();
      } else if (line.startsWith("#") || !line.trim()) {
        continue;
      } else {
        const fields = line.split("\t");
        if (fields.length !== 10) {
          throw new Error(`Format CoNLL-U salah: butuh 10 kolom: ${line}`);
        }
        // Untuk basic tree: lewati baris multiword token (1-2) dan empty node (3.1).
        if (!/^\d+$/.test(fields[0])) continue;
        sentence.tokens.push({
          id: Number(fields[0]), form: fields[1], lemma: fields[2],
          upos: fields[3], feats: fields[5], head: Number(fields[6]),
          deprel: fields[7], misc: fields[9],
        });
      }
    }
    if (sentence.tokens.length) results.push(sentence);
  }
  return results;
}

function svgElement(tag, attrs = {}, value = "") {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [name, attrValue] of Object.entries(attrs)) el.setAttribute(name, attrValue);
  if (value) el.textContent = value;
  return el;
}

function renderTree(sentence, highlightChanges, highlightCase, showUpos, showPunct) {
  const svg = svgElement("svg", {
    viewBox: "0 0 850 370", role: "img",
    "aria-label": `Dependency tree: ${sentence.text}`,
  });
  const tokens = sentence.tokens.filter(t => showPunct || t.upos !== "PUNCT");
  const positions = new Map();
  const left = 88, right = 740, baseY = 290;
  const step = tokens.length > 1 ? (right - left) / (tokens.length - 1) : 0;
  tokens.forEach((t, index) => positions.set(t.id, left + step * index));

  const defs = svgElement("defs");
  for (const [id, color] of [["arrow", "#8291a8"], ["arrow-change", "#be2c42"], ["arrow-case", "#16835f"]]) {
    const marker = svgElement("marker", {
      id, markerWidth: "7", markerHeight: "7", refX: "5.9", refY: "3.5",
      orient: "auto", markerUnits: "strokeWidth",
    });
    marker.appendChild(svgElement("path", { d: "M0 0 L7 3.5 L0 7 Z", fill: color }));
    defs.appendChild(marker);
  }
  svg.appendChild(defs);

  // Edge lebih dulu, supaya node tidak tertutup panah.
  for (const t of tokens) {
    if (t.head === 0 || !positions.has(t.head)) continue;
    const role = SEMANTIC_ROLES[sentence.id]?.[t.id];
    const changed = highlightChanges && CHANGING_ROLES.has(role);
    const isCase = highlightCase && t.deprel === "case";
    const x1 = positions.get(t.head), x2 = positions.get(t.id);
    const span = Math.abs(tokens.findIndex(v => v.id === t.id) - tokens.findIndex(v => v.id === t.head));
    const arcTop = Math.max(32, baseY - 51 - 35 * span);

    let edgeClass = "edge";
    let markerId = "url(#arrow)";
    let labelClass = "edge-label";

    if (changed) {
      edgeClass = "edge changed";
      markerId = "url(#arrow-change)";
      labelClass = "edge-label changed";
    } else if (isCase) {
      edgeClass = "edge case-edge";
      markerId = "url(#arrow-case)";
      labelClass = "edge-label case-label";
    }

    const path = svgElement("path", {
      d: `M${x1} ${baseY - 17} C${x1} ${arcTop}, ${x2} ${arcTop}, ${x2} ${baseY - 17}`,
      class: edgeClass,
      "marker-end": markerId,
    });
    const label = svgElement("text", {
      x: (x1 + x2) / 2, y: arcTop + 10, "text-anchor": "middle",
      class: labelClass,
    }, t.deprel);
    svg.append(path, label);
  }

  for (const t of tokens) {
    const x = positions.get(t.id);
    if (t.head === 0) {
      svg.appendChild(svgElement("text", { x, y: 38, class: "root-text" }, "ROOT ↓"));
    }
    const role = SEMANTIC_ROLES[sentence.id]?.[t.id] || "";
    const isCaseNode = highlightCase && t.deprel === "case";
    const width = Math.max(83, 18 + t.form.length * 13.2);
    const g = svgElement("g", {
      class: `node ${role ? "role-" + role : ""} ${t.head === 0 ? "is-root" : ""} ${isCaseNode ? "is-case" : ""}`,
      tabindex: "0", role: "button",
      "aria-label": `${t.form}, ${t.deprel}. Detail token`,
    });
    g.appendChild(svgElement("rect", {
      x: x - width / 2, y: baseY - 16, rx: 10, width, height: 43,
    }));
    g.appendChild(svgElement("text", { x, y: baseY + 10, class: "node-token" }, t.form));
    g.appendChild(svgElement("text", { x, y: baseY + 52, class: `node-pos ${showUpos ? "" : "hidden"}` }, t.upos));
    const title = svgElement("title", {}, `${t.form} — ${t.deprel} → HEAD ${t.head}`);
    g.appendChild(title);
    const show = () => inspectToken(sentence, t, role);
    g.addEventListener("click", show);
    g.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault(); show();
      }
    });
    svg.appendChild(g);
  }
  return svg;
}

function inspectToken(sentence, token, role) {
  const headWord = sentence.tokens.find(t => t.id === token.head);
  const details = [
    ["Sentence", sentence.id], ["ID", token.id], ["FORM", token.form],
    ["LEMMA", token.lemma], ["UPOS", token.upos], ["FEATS", token.feats],
    ["HEAD", token.head === 0 ? "0 (ROOT)" : `${token.head} (${headWord?.form || "?"})`],
    ["DEPREL", token.deprel], ["MISC", token.misc],
    ["Semantic role*", role ? ROLE_NAME[role] : "—"],
  ];
  const target = document.getElementById("inspectorContent");
  target.replaceChildren();
  const title = document.createElement("p");
  title.className = "selected-token";
  title.textContent = `${token.form} · ${sentence.id}`;
  const dl = document.createElement("dl");
  for (const [key, value] of details) {
    const dt = document.createElement("dt"), dd = document.createElement("dd");
    dt.textContent = key;
    dd.textContent = String(value);
    dl.append(dt, dd);
  }
  target.append(title, dl);

  if (token.deprel === "case") {
    const note = document.createElement("div");
    note.className = "inspector-note";
    note.innerHTML = `<strong>💡 Catatan Case Marker (§2.5):</strong> '<code>${token.form}</code>' adalah preposisi (${token.upos}) yang menandai relasi kasus/oblique. Dalam UD, kata benda utama (<em>${headWord?.form || "head"}</em>) menjadi head, dan preposisi adalah dependent-nya.`;
    target.appendChild(note);
  } else if (token.lemma === "baca") {
    const note = document.createElement("div");
    note.className = "inspector-note";
    note.innerHTML = `<strong>💡 Catatan Lexicalism (§2.1):</strong> Bentuk '<code>${token.form}</code>' diperlakukan sebagai satu kesatuan kata sintaksis (<em>whole word</em>). Diatesis/ragam verba dinyatakan melalui fitur <code>${token.feats}</code>, bukan memecah afiks menjadi node terpisah.`;
    target.appendChild(note);
  }
}

function createTreeCard(sentence, heading, highlightChanges, highlightCase, showUpos, showPunct) {
  const card = document.createElement("article");
  card.className = "panel tree-card";
  const titleBox = document.createElement("div");
  titleBox.className = "card-top";
  const title = document.createElement("div");
  const h2 = document.createElement("h2"), p = document.createElement("p");
  h2.textContent = heading;
  p.textContent = sentence.text;
  title.append(h2, p);
  const pill = document.createElement("span");
  pill.className = "pill";
  const verb = sentence.tokens.find(t => t.head === 0);
  pill.textContent = verb?.feats || "FEATS=_";
  titleBox.append(title, pill);
  const wrapper = document.createElement("div");
  wrapper.className = "svg-wrap";
  wrapper.appendChild(renderTree(sentence, highlightChanges, highlightCase, showUpos, showPunct));
  const caption = document.createElement("p");
  caption.className = "svg-caption";
  caption.textContent = "Arah panah: head → dependent. Klik token untuk detail.";
  card.append(titleBox, wrapper, caption);
  return card;
}

function findRoleToken(sentenceId, role) {
  const mapping = SEMANTIC_ROLES[sentenceId] || {};
  const entry = Object.entries(mapping).find(([, value]) => value === role);
  return entry ? sentences[sentenceId].tokens.find(t => t.id === Number(entry[0])) : null;
}

function renderComparison() {
  const body = document.getElementById("compareBody");
  body.replaceChildren();
  const roleMeta = {
    agent: {
      status: "Tetap (Pelaku)",
      desc: "nsubj → obl:agent (Penurunan ke argumen oblique)",
    },
    patient: {
      status: "Tetap (Sasaran/Penderita)",
      desc: "obj → nsubj:pass (Promosi menjadi subjek pasif)",
    },
    location: {
      status: "Tetap (Lokasi)",
      desc: "obl → obl (Tidak berubah)",
    },
  };

  for (const role of ["agent", "patient", "location"]) {
    const tr = document.createElement("tr");
    const name = document.createElement("td");
    name.textContent = ROLE_NAME[role];
    tr.appendChild(name);
    for (const id of ["aktif", "pasif"]) {
      const token = findRoleToken(id, role);
      const td = document.createElement("td");
      const strong = document.createElement("strong");
      strong.textContent = token ? token.form : "—";
      td.append(strong, document.createTextNode(token ? ` → ${token.deprel}` : ""));
      tr.appendChild(td);
    }
    const statusTd = document.createElement("td");
    statusTd.textContent = roleMeta[role].status;
    tr.appendChild(statusTd);

    const descTd = document.createElement("td");
    descTd.textContent = roleMeta[role].desc;
    tr.appendChild(descTd);

    body.appendChild(tr);
  }
  document.getElementById("voiceComparison").textContent =
    "Verb voice: membaca [Voice=Act] → dibaca [Voice=Pass]. Peran semantik tetap identik, namun grammatical relation berubah karena diatesis pasif.";
}

function render() {
  const mode = document.getElementById("mode").value;
  const showChanges = document.getElementById("showChanges").checked;
  const highlightCase = document.getElementById("highlightCase").checked;
  const showUpos = document.getElementById("showUpos").checked;
  const showPunct = document.getElementById("showPunct").checked;
  const target = document.getElementById("treeGrid");
  target.classList.toggle("single", mode !== "bandingkan");
  target.replaceChildren();
  if (mode !== "pasif") target.appendChild(createTreeCard(sentences.aktif, "01 · Active voice", showChanges, highlightCase, showUpos, showPunct));
  if (mode !== "aktif") target.appendChild(createTreeCard(sentences.pasif, "02 · Passive voice", showChanges, highlightCase, showUpos, showPunct));
}

async function main() {
  try {
    const response = await fetch("data/contoh_kalimat.conllu");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const parsed = parseConllu(await response.text());
    sentences = Object.fromEntries(parsed.map(sentence => [sentence.id, sentence]));
    if (!sentences.aktif || !sentences.pasif) {
      throw new Error("Butuh sent_id = aktif dan sent_id = pasif di file CoNLL-U.");
    }
    for (const input of ["mode", "showChanges", "highlightCase", "showUpos", "showPunct"]) {
      document.getElementById(input).addEventListener("change", render);
    }
    render();
    renderComparison();
  } catch (error) {
    const target = document.getElementById("treeGrid");
    target.textContent = `Gagal memuat data: ${error.message}. Jalankan: python -m http.server 8000 lalu buka http://localhost:8000/`;
    target.className = "error";
    console.error(error);
  }
}
main();
