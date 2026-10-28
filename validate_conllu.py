#!/usr/bin/env python3
"""Validator CoNLL-U dasar untuk contoh pembelajaran (bukan validator resmi UD)."""
from __future__ import annotations

import argparse
from pathlib import Path


def validate_file(path: Path) -> None:
    raw = path.read_text(encoding="utf-8").strip()
    sentences = 0
    for block in raw.split("\n\n"):
        if not block.strip():
            continue
        sent_id = "<tanpa sent_id>"
        words = {}
        for line in block.splitlines():
            if line.startswith("# sent_id = "):
                sent_id = line.partition("=")[2].strip()
                continue
            if not line or line.startswith("#"):
                continue
            fields = line.split("\t")
            if len(fields) != 10:
                raise ValueError(f"{sent_id}: harus 10 kolom (TAB), dapat {len(fields)}")
            if not fields[0].isdigit():
                continue  # multiword tokens dan empty nodes tidak membentuk basic tree
            token_id = int(fields[0])
            if token_id in words:
                raise ValueError(f"{sent_id}: ID duplikat {token_id}")
            try:
                head = int(fields[6])
            except ValueError as e:
                raise ValueError(f"{sent_id}: HEAD token {token_id} bukan integer") from e
            words[token_id] = {"form": fields[1], "head": head, "deprel": fields[7]}
        if not words:
            continue
        roots = [i for i, word in words.items() if word["head"] == 0]
        if len(roots) != 1:
            raise ValueError(f"{sent_id}: seharusnya 1 root, ditemukan {len(roots)}")
        root_id = roots[0]
        if words[root_id]["deprel"] != "root":
            raise ValueError(f"{sent_id}: token root harus DEPREL=root")
        for i, word in words.items():
            if word["head"] != 0 and word["head"] not in words:
                raise ValueError(f"{sent_id}: ID {i}, HEAD {word['head']} tidak ditemukan")
            if i != root_id and word["deprel"] == "root":
                raise ValueError(f"{sent_id}: hanya root boleh DEPREL=root")
            visited = set()
            current = i
            while current != 0:
                if current in visited:
                    raise ValueError(f"{sent_id}: dependency cycle terdeteksi pada ID {i}")
                visited.add(current)
                current = words[current]["head"]
        sentences += 1
        print(f"OK: {sent_id} — {len(words)} syntactic words, root: {words[root_id]['form']}")
    if not sentences:
        raise ValueError("Tidak ditemukan sentence dengan syntactic words")
    print(f"Validasi dasar selesai: {sentences} sentence(s) lolos.")


if __name__ == "__main__":
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("path", type=Path, help="path ke file .conllu")
    args = cli.parse_args()
    validate_file(args.path)
