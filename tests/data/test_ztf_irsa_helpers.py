from __future__ import annotations

from dataclasses import dataclass
from typing import Any, List

import pytest

from src.data_ingestion.ztf_ingestor import ZTFIngestor


@dataclass
class _DummyResponse:
    payload: Any

    def raise_for_status(self) -> None:
        return None

    def json(self) -> Any:
        return self.payload


class _DummySession:
    def __init__(self, responses: List[Any]) -> None:
        self._responses = iter(responses)
        self.calls: list[dict[str, Any]] = []

    def get(self, url: str, params: dict[str, Any], timeout: int) -> _DummyResponse:
        self.calls.append({"url": url, "params": params, "timeout": timeout})
        try:
            payload = next(self._responses)
        except StopIteration:  # pragma: no cover - defensive guard
            payload = []
        return _DummyResponse(payload)


@pytest.fixture()
def ztf_ingestor(tmp_path) -> ZTFIngestor:
    ingestor = ZTFIngestor("ztf", tmp_path, config={"irsa": {"timeout": 5}})
    return ingestor


def test_extract_irsa_entries_handles_lightcurve_payload(ztf_ingestor: ZTFIngestor) -> None:
    payload = {"LightCurve": [{"oid": "ZTF1", "ra": 10.1, "dec": -3.2, "mjd": 59832.1}]}

    entries = ztf_ingestor._extract_irsa_entries(payload)

    assert entries == payload["LightCurve"]


def test_normalise_irsa_entry_maps_fields(ztf_ingestor: ZTFIngestor) -> None:
    entry = {
        "oid": "ZTF2",
        "ra": 123.45,
        "dec": -54.32,
        "jd": 2459832.1234,
        "fid": 2,
        "magpsf": 19.1,
    }

    record = ztf_ingestor._normalise_irsa_entry(entry, filter_hint=None)

    assert record is not None
    assert record["object_id"] == "ZTF2"
    assert record["filter"] == "r"  # fid=2 -> r-band
    assert record["mjd"] == pytest.approx(59831.6234)
    assert record["mag_psf"] == pytest.approx(19.1)


def test_fetch_from_irsa_deduplicates_entries(tmp_path) -> None:
    duplicate_entry = {
        "oid": "ZTF_DUP",
        "ra": 210.8,
        "dec": 54.3,
        "mjd": 59800.0,
        "fid": 1,
    }
    responses = [[duplicate_entry, duplicate_entry]]
    ingestor = ZTFIngestor("ztf", tmp_path, config={"irsa": {"timeout": 5}})
    ingestor.session = _DummySession(responses)

    records = ingestor._fetch_from_irsa(
        limit=5,
        ra=210.8,
        dec=54.3,
        radius=0.05,
        filters=["zg"],
        mjd_range=None,
    )

    assert len(records) == 1
    assert records[0]["filter"] == "g"
    call = ingestor.session.calls[0]
    assert call["params"]["BANDNAME"] == "zg"
    assert call["params"]["POS"].startswith("CIRCLE 210.8 54.3")
