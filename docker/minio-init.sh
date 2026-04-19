#!/bin/sh
set -eu

MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://minio:9000}"
MINIO_ROOT_USER="${MINIO_ROOT_USER:?MINIO_ROOT_USER is required}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:?MINIO_ROOT_PASSWORD is required}"
MINIO_BUCKET="${MINIO_BUCKET:-teamcord-files}"

echo "Configuring MinIO alias..."
mc alias set local "${MINIO_ENDPOINT}" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}"

echo "Ensuring bucket exists: ${MINIO_BUCKET}"
mc mb --ignore-existing "local/${MINIO_BUCKET}"
mc anonymous set none "local/${MINIO_BUCKET}"

echo "MinIO initialization complete."
