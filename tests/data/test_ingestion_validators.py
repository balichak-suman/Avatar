from __future__ import annotations

from pathlib import Path

import pytest

from src.data_ingestion.base import IngestionResult, StubbedIngestor
from src.data_ingestion.ztf_ingestor import ZTFIngestor


@pytest.fixture()
def sample_payload() -> list[dict[str, str | int | float]]:
    return [
        {"object_id": "ZTF21abc", "ra": 10.5, "dec": -5.2},
        {"object_id": "ZTF21def", "ra": 11.2, "dec": -4.8},
    ]


def test_stubbed_ingestor_persists_records(tmp_path: Path, sample_payload: list[dict[str, str | int | float]]) -> None:
    ingestor = StubbedIngestor("stub", tmp_path, config={})
    result: IngestionResult = ingestor.run(sample_payload=sample_payload)

    assert result.records_fetched == len(sample_payload)
    assert len(result.output_paths) == len(sample_payload)
    for path in result.output_paths:
        assert path.exists()
        content = path.read_text()
        assert "object_id" in content


def test_stubbed_ingestor_handles_empty_payload(tmp_path: Path) -> None:
    ingestor = StubbedIngestor("stub", tmp_path, config={})
    result = ingestor.run(sample_payload=[])

    assert result.records_fetched == 0
    assert result.output_paths == []


def test_ztf_ingestor_validates_records(tmp_path: Path) -> None:
    ingestor = ZTFIngestor("ztf", tmp_path, config={})
    sample = {
        "object_id": "ZTF21aabb123",
        "ra": 123.45,
        "dec": -54.32,
        "mjd": 59832.1234,
        "mag_psf": 18.2,
        "filter": "r",
    }

    validated = ingestor.validate_record(sample)

    assert validated["object_id"] == sample["object_id"]
    assert validated["ra"] == pytest.approx(sample["ra"])


def test_ztf_ingestor_rejects_invalid_record(tmp_path: Path) -> None:
    ingestor = ZTFIngestor("ztf", tmp_path, config={})
    bad_sample = {"object_id": "ZTF21aabb123", "ra": "not-a-float"}

    with pytest.raises(ValueError):
        ingestor.validate_record(bad_sample)
