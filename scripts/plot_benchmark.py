#!/usr/bin/env python3
"""Plot benchmark_voxcpm.py results as a PNG image."""

from __future__ import annotations

import argparse
import csv
from pathlib import Path

import matplotlib.pyplot as plt


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser("Plot VoxCPM benchmark CSV")
    parser.add_argument("--csv", default="benchmarks/base_rithy_smoke/results.csv")
    parser.add_argument("--output", default="")
    parser.add_argument("--title", default="VoxCPM2 Benchmark")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    csv_path = Path(args.csv)
    output_path = Path(args.output) if args.output else csv_path.with_name("benchmark_plot.png")

    with csv_path.open("r", encoding="utf-8") as input_file:
        rows = list(csv.DictReader(input_file))

    if not rows:
        raise ValueError(f"No rows found in {csv_path}")

    labels = [row["id"].replace("khmer_", "").replace("_", "\n") for row in rows]
    rtf = [float(row["rtf"]) for row in rows]
    wall = [float(row["wall_sec"]) for row in rows]
    duration = [float(row["audio_duration_sec"]) for row in rows]

    fig, axes = plt.subplots(1, 3, figsize=(13, 4.2))
    panels = [
        (rtf, "RTF lower is faster", "RTF", "#0a7b78"),
        (wall, "Generation time", "seconds", "#a15c07"),
        (duration, "Audio duration", "seconds", "#4f6f52"),
    ]

    for axis, (values, title, ylabel, color) in zip(axes, panels):
        bars = axis.bar(labels, values, color=color, width=0.58)
        axis.set_title(title, fontsize=11, pad=10)
        axis.set_ylabel(ylabel)
        axis.grid(axis="y", alpha=0.25)
        axis.tick_params(axis="x", labelsize=9)
        for bar in bars:
            height = bar.get_height()
            axis.text(
                bar.get_x() + bar.get_width() / 2,
                height,
                f"{height:.2f}",
                ha="center",
                va="bottom",
                fontsize=9,
            )

    fig.suptitle(args.title, fontsize=14, fontweight="bold")
    fig.tight_layout(rect=[0, 0, 1, 0.92])
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_path, dpi=180, bbox_inches="tight")
    print(output_path.resolve())


if __name__ == "__main__":
    main()
