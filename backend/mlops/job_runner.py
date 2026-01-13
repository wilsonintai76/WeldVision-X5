"""Lightweight background job runner for long-running MLOps tasks.

This intentionally avoids Celery/RQ to keep local dev setup simple.
Jobs are executed in a daemon thread and persisted in the DB.
"""

from __future__ import annotations

import os
import subprocess
import threading
from pathlib import Path
from typing import Dict, List, Optional

from django.conf import settings
from django.db import close_old_connections
from django.utils import timezone

from .models import MLJob


def _ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def _media_jobs_root() -> Path:
    return Path(getattr(settings, "MEDIA_ROOT", Path.cwd() / "media")) / "mlops_jobs"


def _job_dir(job_id: int) -> Path:
    return _media_jobs_root() / str(job_id)


def start_subprocess_job(
    *,
    job: MLJob,
    command: List[str],
    cwd: Optional[str] = None,
    env: Optional[Dict[str, str]] = None,
) -> MLJob:
    """Start a background thread that runs a subprocess and updates job status."""

    job_dir = _job_dir(job.id)
    _ensure_dir(job_dir)

    stdout_path = job_dir / "stdout.log"
    stderr_path = job_dir / "stderr.log"

    job.stdout_path = str(stdout_path)
    job.stderr_path = str(stderr_path)
    job.command = command
    job.status = MLJob.Status.QUEUED
    job.save(update_fields=["stdout_path", "stderr_path", "command", "status"])

    def _run() -> None:
        close_old_connections()
        MLJob.objects.filter(id=job.id).update(status=MLJob.Status.RUNNING, started_at=timezone.now())

        merged_env = os.environ.copy()
        if env:
            merged_env.update(env)

        try:
            with open(stdout_path, "w", encoding="utf-8") as stdout_f, open(
                stderr_path, "w", encoding="utf-8"
            ) as stderr_f:
                process = subprocess.Popen(
                    command,
                    cwd=cwd,
                    env=merged_env,
                    stdout=stdout_f,
                    stderr=stderr_f,
                    text=True,
                )
                return_code = process.wait()

            if return_code == 0:
                MLJob.objects.filter(id=job.id).update(status=MLJob.Status.SUCCEEDED, completed_at=timezone.now())
            else:
                MLJob.objects.filter(id=job.id).update(
                    status=MLJob.Status.FAILED,
                    completed_at=timezone.now(),
                    error_message=f"Process exited with code {return_code}",
                )

        except Exception as exc:
            MLJob.objects.filter(id=job.id).update(
                status=MLJob.Status.FAILED,
                completed_at=timezone.now(),
                error_message=str(exc),
            )
        finally:
            close_old_connections()

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()

    return job
