from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import pytest

from scripts import ingest_stream
from src.data_ingestion.base import BaseIngestor


class StubIngestor(BaseIngestor):
    def __init__(self, source_name: str, output_dir: Path, config: dict[str, Any], store: dict[str, Any]) -> None:
        super().__init__(source_name, output_dir, config)
        self.store = store

    def fetch(self, *args: Any, **kwargs: Any):  # type: ignore[override]
        self.store["fetch_kwargs"] = kwargs
        return [
            {
                "object_id": "ZTF_TEST",
                "ra": 10.0,
                "dec": -3.0,
                "mjd": 59800.0,
                "mag_psf": 18.0,
                "filter": "g",
            }
        ]


@pytest.fixture()
def config_file(tmp_path: Path) -> Path:
    config = {"data_sources": {"ztf": {}}}
    path = tmp_path / "config.yaml"
    path.write_text(json.dumps(config))
    return path


def test_ingest_stream_dry_run_with_irsa_overrides(monkeypatch: pytest.MonkeyPatch, tmp_path: Path, config_file: Path, capsys: pytest.CaptureFixture[str]) -> None:
    store: dict[str, Any] = {}

    def factory(output_dir: Path, source_cfg: dict[str, Any]) -> StubIngestor:
        return StubIngestor("ztf", output_dir, source_cfg, store)

    monkeypatch.setitem(ingest_stream.INGESTOR_FACTORY, "ztf", factory)  # type: ignore[arg-type]

    argv = [
        "ingest_stream.py",
        "--source",
        "ztf",
        "--config",
        str(config_file),
        "--limit",
        "5",
        "--dry-run",
        "--output",
        str(tmp_path),
        "--irsa-ra",
        "210.8",
        "--irsa-dec",
        "54.3",
        "--irsa-radius",
        "0.1",
        "--irsa-filter",
        "zg",
        "--irsa-mjd-range",
        "59800",
        "59810",
    ]

    monkeypatch.setattr(sys, "argv", argv)

    ingest_stream.main()

    captured = capsys.readouterr().out
    summary = json.loads(captured)

    assert summary["records"] == 1
    assert summary["sample"]["object_id"] == "ZTF_TEST"
    assert store["fetch_kwargs"] == {
        "limit": 5,
        "ra": 210.8,
        "dec": 54.3,
        "radius": 0.1,
        "filters": ["zg"],
        "mjd_range": (59800.0, 59810.0),
    }


def test_ingest_stream_dry_run_all_sources(monkeypatch: pytest.MonkeyPatch, tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    class MultiSourceStub(StubIngestor):
        def fetch(self, *args: Any, **kwargs: Any):  # type: ignore[override]
            self.store["fetch_kwargs"] = kwargs
            return [
                {
                    "object_id": f"{self.source_name.upper()}_TEST",
                    "ra": 1.0,
                    "dec": 2.0,
                    "mjd": 59800.0,
                    "mag_psf": 18.0,
                    "filter": "g",
                }
            ]

    stores: dict[str, dict[str, Any]] = {}

    def make_factory(source: str):
        def factory(output_dir: Path, source_cfg: dict[str, Any]) -> MultiSourceStub:
            store = stores.setdefault(source, {})
            return MultiSourceStub(source, output_dir, source_cfg, store)

        return factory

    for name in ("ztf", "tess", "mast"):
        monkeypatch.setitem(ingest_stream.INGESTOR_FACTORY, name, make_factory(name))  # type: ignore[arg-type]

    config = {"data_sources": {name: {} for name in ("ztf", "tess", "mast")}}
    config_path = tmp_path / "config_multi.yaml"
    config_path.write_text(json.dumps(config))

    argv = [
        "ingest_stream.py",
        "--source",
        "all",
        "--config",
        str(config_path),
        "--limit",
        "3",
        "--dry-run",
        "--output",
        str(tmp_path),
        "--irsa-ra",
        "210.0",
        "--irsa-dec",
        "45.0",
        "--irsa-radius",
        "0.2",
        "--irsa-filter",
        "zg",
        "--irsa-mjd-range",
        "59800",
        "59805",
    ]

    monkeypatch.setattr(sys, "argv", argv)

    ingest_stream.main()

    captured = capsys.readouterr().out
    summary = json.loads(captured)

    assert summary["total_records"] == 3
    assert set(summary["sources"].keys()) == {"ztf", "tess", "mast"}
    assert summary["sources"]["ztf"]["records"] == 1
    assert summary["sources"]["tess"]["records"] == 1
    assert summary["sources"]["mast"]["records"] == 1

    assert stores["ztf"]["fetch_kwargs"] == {
        "limit": 3,
        "ra": 210.0,
        "dec": 45.0,
        "radius": 0.2,
        "filters": ["zg"],
        "mjd_range": (59800.0, 59805.0),
    }
    assert stores["tess"]["fetch_kwargs"] == {"limit": 3}
    assert stores["mast"]["fetch_kwargs"] == {"limit": 3}
