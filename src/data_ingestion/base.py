"""Shared utilities and abstract base classes for data ingestion connectors."""

from __future__ import annotations

import abc
import json
import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Optional

import requests
from pydantic import ValidationError

logger = logging.getLogger(__name__)


@dataclass
class IngestionResult:
    source: str
    records_fetched: int
    output_paths: list[Path]
    metadata: dict[str, Any]


class BaseIngestor(abc.ABC):
    """Abstract base class encapsulating shared ingestion behaviors."""

    def __init__(self, source_name: str, output_dir: Path, config: dict[str, Any]) -> None:
        self.source_name = source_name
        self.output_dir = output_dir
        self.config = config
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "CosmicOracle/1.0 (Research; +http://localhost)",
            "Accept": "application/json"
        })
        logger.debug("Initialized %s ingestor with output_dir=%s", source_name, output_dir)
        self._record_model = getattr(self, "record_model", None)

    @abc.abstractmethod
    def fetch(self, *args: Any, **kwargs: Any) -> Iterable[dict[str, Any]]:
        """Retrieve data records from the upstream source."""

    def validate_record(self, record: dict[str, Any]) -> dict[str, Any]:
        if self._record_model is None:
            return record
        try:
            model_instance = self._record_model.model_validate(record)
        except ValidationError as exc:
            logger.error("Validation failed for %s record: %s", self.source_name, exc)
            raise ValueError(f"Invalid record for {self.source_name}") from exc
        return model_instance.model_dump()

    def persist(self, records: Iterable[dict[str, Any]]) -> IngestionResult:
        paths: list[Path] = []
        count = 0
        for idx, record in enumerate(records):
            validated = self.validate_record(record)
            target_path = self.output_dir / f"record_{idx:05d}.json"
            target_path.write_text(json.dumps(validated, indent=2))
            paths.append(target_path)
            count += 1
        logger.info("Persisted %d records for %s", count, self.source_name)
        return IngestionResult(self.source_name, count, paths, metadata={})

    def run(self, *args: Any, **kwargs: Any) -> IngestionResult:
        logger.info("Running ingestion for %s", self.source_name)
        records = self.fetch(*args, **kwargs)
        result = self.persist(records)
        logger.info("Completed ingestion for %s", self.source_name)
        return result

    def get_auth_header(self) -> dict[str, str]:
        env_key = self.config.get("auth_env")
        if not env_key:
            return {}
        token = os.getenv(env_key)
        if not token:
            logger.warning("Environment variable %s not set; falling back to stubbed payload", env_key)
            return {}
        header_template = self.config.get("auth_header", "Authorization")
        return {header_template: f"Bearer {token}"}


class StubbedIngestor(BaseIngestor):
    """Placeholder ingestor that returns mocked data for local development."""

    def fetch(self, sample_payload: Optional[list[dict[str, Any]]] = None, **_: Any) -> Iterable[dict[str, Any]]:
        payload = sample_payload or self.config.get("sample_payload", [])
        logger.debug("Stubbed fetch returning %d records", len(payload))
        return payload
