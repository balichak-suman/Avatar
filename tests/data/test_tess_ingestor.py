from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import Any

import numpy as np
import pytest
from astropy.io import fits

from src.data_ingestion.tess_ingestor import create_tess_ingestor


class StubResponse:
    def __init__(self, *, json_data: Any | None = None, content: bytes = b"", status_code: int = 200) -> None:
        self._json_data = json_data
        self.content = content
        self.status_code = status_code

    def json(self) -> Any:
        if self._json_data is None:
            raise ValueError("No JSON payload configured")
        return self._json_data

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP error {self.status_code}")


class StubSession:
    def __init__(self, post_responses: list[StubResponse], get_responses: list[StubResponse]) -> None:
        self._post_responses = post_responses
        self._get_responses = get_responses
        self.post_calls: list[dict[str, Any]] = []
        self.get_calls: list[dict[str, Any]] = []

    def post(self, url: str, json: dict[str, Any] | None = None, headers: dict[str, str] | None = None, timeout: int | None = None) -> StubResponse:  # noqa: D401,E501
        if not self._post_responses:
            raise AssertionError("No more stub POST responses available")
        self.post_calls.append({"url": url, "json": json})
        return self._post_responses.pop(0)

    def get(self, url: str, params: dict[str, Any] | None = None, headers: dict[str, str] | None = None, timeout: int | None = None) -> StubResponse:  # noqa: D401,E501
        if not self._get_responses:
            raise AssertionError("No more stub GET responses available")
        self.get_calls.append({"url": url, "params": params})
        return self._get_responses.pop(0)


@pytest.fixture()
def fits_payload() -> bytes:
    time = np.array([1.0, 2.0, np.nan, 3.0], dtype=float)
    flux = np.array([10.0, 11.0, 12.0, 13.0], dtype=float)
    hdu = fits.BinTableHDU.from_columns(
        [
            fits.Column(name="TIME", array=time, format="E"),
            fits.Column(name="PDCSAP_FLUX", array=flux, format="E"),
        ]
    )
    hdul = fits.HDUList([fits.PrimaryHDU(), hdu])
    buffer = BytesIO()
    hdul.writeto(buffer)
    buffer.seek(0)
    return buffer.read()


def test_tess_ingestor_fetches_lightcurve(tmp_path: Path, fits_payload: bytes, monkeypatch: pytest.MonkeyPatch) -> None:
    config = {
        "invoke_url": "https://mast.stsci.edu/api/v0/invoke",
        "observation_service": "Mast.Caom.Filtered",
        "product_service": "Mast.Caom.Products",
        "download_url": "https://mast.stsci.edu/api/v0.1/Download/file",
        "query": {"pagesize": 5},
        "lightcurve": {"max_points": 100, "flux_columns": ["PDCSAP_FLUX"], "time_column": "TIME"},
    }

    ingestor = create_tess_ingestor(tmp_path, config)

    observation_payload = {
        "data": [
            {
                "obsid": 123,
                "target_name": "TIC 987654321",
                "sequence_number": 99,
            }
        ]
    }
    products_payload = {
        "data": [
            {
                "productType": "SCIENCE",
                "productSubGroupDescription": "TIMESERIES",
                "dataURI": "mast:TESS/product/test_lightcurve.fits",
                "productFilename": "tess2020000000-s0099-0000000987654321-0123-s_lc.fits",
            }
        ]
    }

    post_responses = [
        StubResponse(json_data=observation_payload),
        StubResponse(json_data=products_payload),
    ]
    get_responses = [StubResponse(content=fits_payload)]

    stub_session = StubSession(post_responses, get_responses)
    monkeypatch.setattr(ingestor, "session", stub_session)
    monkeypatch.setenv("TESS_API_TOKEN", "dummy-token")

    records = list(ingestor.fetch(limit=1))

    assert len(records) == 1
    record = records[0]
    assert record["tic_id"] == "TIC987654321"
    assert record["sector"] == 99
    assert record["cadence"] == "short"
    assert record["mast_data_uri"] == "mast:TESS/product/test_lightcurve.fits"
    assert record["mast_obsid"] == 123
    assert record["time"] == [1.0, 2.0, 3.0]  # NaN dropped
    assert record["flux"] == [10.0, 11.0, 13.0]

    assert len(stub_session.post_calls) == 2
    assert stub_session.post_calls[0]["json"]["service"] == "Mast.Caom.Filtered"
    assert stub_session.get_calls[0]["url"].endswith("Download/file")