#!/usr/bin/env bash
# Rehearse this branch's migrations on a copy of staging (rem0020), as before every deploy by hand:
#   rehearse-migrations.sh open-firewall / close-firewall   allow this runner's ip on the Hetzner
#                                     firewall for the dump, then remove the rule
#   rehearse-migrations.sh dump       staging → $DUMP_FILE (the only step given STAGING_DB_URL)
#   rehearse-migrations.sh rehearse   restore twice, migrate up, drift check, migrate down, compare
# Staging's data never reaches the log (public on this repo): only migration names, table names and
# row counts. Runs locally too, against pg-dev, with the same env.
#
# env:
#   STAGING_DB_URL  dump only: the read-only staging url (secret STAGING_DB_URL_READONLY)
#   PG_URL          rehearse only: the local server, no db name (postgres://postgres:postgres@127.0.0.1:5432)
#   DUMP_FILE       where the dump goes (default $RUNNER_TEMP/staging.dump)
#   BASE_REF        the branch the PR targets (default staging): its migrations are already deployed
#   PAYLOAD_SECRET  any value: payload needs one to start
set -euo pipefail

DUMP_FILE="${DUMP_FILE:-${RUNNER_TEMP:-/tmp}/staging.dump}"
BASE_REF="${BASE_REF:-staging}"
SUMMARY="${GITHUB_STEP_SUMMARY:-/dev/stdout}"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

# a line in the job summary (and the log when run locally)
summary() {
  echo "$*" >> "$SUMMARY"
}

# `::error::` annotation, then stop
fail() {
  echo "::error::$*"
  summary "❌ $*"
  exit 1
}

# per-table row counts of one database, `table|count` sorted by table
row_counts() {
  local db=$1
  psql "$PG_URL/$db" -v ON_ERROR_STOP=1 -tA -c "select table_name || '|' || (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', table_name), false, true, '')))[1]::text from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1"
}

# names (no extension) of the migrations this branch adds compared with BASE_REF
new_migrations() {
  git diff --name-only --diff-filter=A "origin/$BASE_REF...HEAD" -- 'src/migrations/*.ts' \
    | sed -e '/\/index\.ts$/d' -e 's|^src/migrations/||' -e 's|\.ts$||'
}

# payload cli on one local database; output to $WORK_DIR/<log>, never printed (staging values can
# appear in constraint errors). NODE_ENV=test: no dev schema push on the copy
payload_on() {
  local db=$1 log=$2
  shift 2
  DATABASE_URI="$PG_URL/$db" NODE_ENV=test yarn -s payload "$@" </dev/null >"$WORK_DIR/$log" 2>&1
}

# Hetzner Cloud firewall in front of staging: the runner has no fixed ip, so each run allows its own
# ip on the db port and removes the rule afterwards (rules tagged by description, replaced as a set).
#   HCLOUD_TOKEN, HCLOUD_FIREWALL_ID (secrets), DB_PORT (default 6003)
FW_TAG='ci-rehearsal'

hcloud() {
  local method=$1 path=$2 body=${3:-}
  curl -fsS -X "$method" "https://api.hetzner.cloud/v1$path" \
    -H "Authorization: Bearer $HCLOUD_TOKEN" -H 'Content-Type: application/json' \
    ${body:+--data "$body"}
}

# the firewall's rules without any left by this job (an earlier run that died before closing)
fw_rules_without_ci() {
  hcloud GET "/firewalls/$HCLOUD_FIREWALL_ID" \
    | jq --arg tag "$FW_TAG" '[.firewall.rules[] | select((.description // "") | startswith($tag) | not)]'
}

fw_set_rules() {
  hcloud POST "/firewalls/$HCLOUD_FIREWALL_ID/actions/set_rules" "{\"rules\": $1}" >/dev/null
}

open_firewall() {
  [[ -n "${HCLOUD_TOKEN:-}" && -n "${HCLOUD_FIREWALL_ID:-}" ]] || fail "no HCLOUD_TOKEN or HCLOUD_FIREWALL_ID"
  local ip rules
  ip="$(curl -fsS https://api.ipify.org)" || fail "could not find the runner's public ip"
  [[ "$ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "unexpected runner ip"
  rules="$(fw_rules_without_ci)" || fail "reading the Hetzner firewall failed (token or firewall id)"
  rules="$(jq --arg ip "$ip/32" --arg port "${DB_PORT:-6003}" --arg tag "$FW_TAG ${GITHUB_RUN_ID:-local}" \
    '. + [{direction: "in", protocol: "tcp", port: $port, source_ips: [$ip], description: $tag}]' <<<"$rules")"
  fw_set_rules "$rules" || fail "adding the runner's ip to the Hetzner firewall failed"
  # Hetzner applies rules within seconds; the dump retries the connection meanwhile
  summary "firewall opened for this runner on port ${DB_PORT:-6003}"
}

close_firewall() {
  [[ -n "${HCLOUD_TOKEN:-}" && -n "${HCLOUD_FIREWALL_ID:-}" ]] || fail "no HCLOUD_TOKEN or HCLOUD_FIREWALL_ID"
  local rules
  rules="$(fw_rules_without_ci)" || fail "reading the Hetzner firewall failed: remove the '$FW_TAG' rule by hand"
  fw_set_rules "$rules" || fail "removing the runner's rule failed: remove the '$FW_TAG' rule by hand"
  summary "firewall closed again"
}

dump() {
  [[ -n "${STAGING_DB_URL:-}" ]] || fail "no STAGING_DB_URL"

  # Mask password, host and resolved IPs before touching the network
  local rest="${STAGING_DB_URL#*://}"
  local auth="${rest%@*}"
  local pass="${auth#*:}"
  local hostport="${rest##*@}"
  hostport="${hostport%%/*}"
  local host="${hostport%%:*}"
  [[ -n "$pass" && "$pass" != "$auth" ]] && echo "::add-mask::$pass"
  if [[ -n "$host" ]]; then
    echo "::add-mask::$host"
    local ip
    while IFS= read -r ip; do
      [[ -n "$ip" ]] && echo "::add-mask::$ip"
    done < <({ getent ahosts "$host" || true; } | awk '{print $1}' | sort -u)
  fi

  [[ "$(pg_dump --version)" =~ \(PostgreSQL\)\ 16\. ]] || fail "pg_dump must be 16.x (got: $(pg_dump --version))"

  # a few tries: a firewall rule added just before takes a few seconds to apply
  local try
  for try in 1 2 3 4 5 6; do
    PGOPTIONS='-c default_transaction_read_only=on' pg_dump -Fc -f "$DUMP_FILE" "$STAGING_DB_URL" 2>/dev/null && break
    [[ $try -lt 6 ]] || fail "dumping staging failed (connection or permissions)"
    sleep 5
  done

  summary "staging dumped ($(du -h "$DUMP_FILE" | cut -f1))"
}

rehearse() {
  [[ -n "${PG_URL:-}" ]] || fail "no PG_URL"
  [[ -f "$DUMP_FILE" ]] || fail "no dump file at $DUMP_FILE"

  local db
  for db in stg_orig_test stg_rehearsal_test; do
    psql "$PG_URL/postgres" -v ON_ERROR_STOP=1 -tA \
      -c "SET client_min_messages = warning" \
      -c "DROP DATABASE IF EXISTS $db" \
      -c "CREATE DATABASE $db" >/dev/null
    pg_restore --no-owner --no-acl -d "$PG_URL/$db" "$DUMP_FILE" >/dev/null 2>&1 || fail "restore failed"
  done

  local new_list=() m
  while IFS= read -r m; do
    [[ -n "$m" ]] && new_list+=("$m")
  done < <(new_migrations)
  local stg_count
  stg_count="$(psql "$PG_URL/stg_orig_test" -v ON_ERROR_STOP=1 -tA -c 'SELECT count(*) FROM public.payload_migrations')"
  local new_label="${new_list[*]:-none}"
  summary "staging has $stg_count migrations, this branch adds: $new_label"

  # Migrate up and compare per-table row counts
  row_counts stg_rehearsal_test >"$WORK_DIR/before"
  if ! payload_on stg_rehearsal_test up.log migrate; then
    local failed_mig
    failed_mig="$(sed $'s/\x1b\\[[0-9;]*m//g' "$WORK_DIR/up.log" | sed -n 's/.*Migrating: \([0-9A-Za-z_]*\).*/\1/p' | tail -n 1)"
    fail "migration ${failed_mig:-unknown} fails on staging data; rehearse locally from a fresh dump for details"
  fi
  row_counts stg_rehearsal_test >"$WORK_DIR/after"
  local changed
  changed="$(awk -F'|' '
    NR==FNR { before[$1]=$2; next }
    !($1 in before) || before[$1] != $2 {
      b = ($1 in before) ? before[$1] : "new"
      printf "- `%s`: %s → %s\n", $1, b, $2
    }
  ' "$WORK_DIR/before" "$WORK_DIR/after")"
  if [[ -n "$changed" ]]; then
    summary "row counts changed by up:"
    summary "$changed"
  else
    summary "row counts changed by up: none"
  fi

  # Drift check against a fresh migrations-only database
  psql "$PG_URL/postgres" -v ON_ERROR_STOP=1 -tA \
    -c "SET client_min_messages = warning" \
    -c "DROP DATABASE IF EXISTS cms_empty_test" \
    -c "CREATE DATABASE cms_empty_test" >/dev/null
  payload_on cms_empty_test empty.log migrate || fail "migrate on empty database failed"

  pg_dump -s --no-owner --no-acl "$PG_URL/stg_rehearsal_test" 2>/dev/null \
    | grep -v -E '^(\\restrict|\\unrestrict|--|$)' >"$WORK_DIR/rehearsal_up.schema"
  pg_dump -s --no-owner --no-acl "$PG_URL/cms_empty_test" 2>/dev/null \
    | grep -v -E '^(\\restrict|\\unrestrict|--|$)' >"$WORK_DIR/empty.schema"
  if ! diff "$WORK_DIR/rehearsal_up.schema" "$WORK_DIR/empty.schema" >"$WORK_DIR/drift.diff"; then
    local drift_objs
    drift_objs="$(grep -E '^[<>] (CREATE|ALTER) ' "$WORK_DIR/drift.diff" | head -n 40 | tr '\n' ' ' || true)"
    # column or index lines only: say how many, the details stay off the public log
    [[ -n "$drift_objs" ]] || drift_objs="$(grep -c '^[<>]' "$WORK_DIR/drift.diff") schema lines (columns, defaults or indexes; diff locally)"
    fail "staging's schema after migrating differs from a migrations-only database: $drift_objs"
  fi

  if [[ ${#new_list[@]} -eq 0 ]]; then
    summary "no new migrations: up ran, nothing to roll back"
    return 0
  fi

  # Move only this branch's new migrations into a new top batch and roll them back
  local in_list=""
  for m in "${new_list[@]}"; do
    [[ "$m" =~ ^[0-9]{8}_[0-9]{6}_[a-z0-9_]+$ ]] || fail "invalid migration name: $m"
    in_list+="${in_list:+,}'$m'"
  done
  psql "$PG_URL/stg_rehearsal_test" -v ON_ERROR_STOP=1 -tA \
    -c "UPDATE payload_migrations SET batch = (SELECT max(batch)+1 FROM payload_migrations) WHERE name IN ($in_list)" >/dev/null
  payload_on stg_rehearsal_test down.log migrate:down || fail "migrate:down of $new_label fails"

  # Compare schema and row counts after down against untouched staging copy
  pg_dump -s --no-owner --no-acl "$PG_URL/stg_orig_test" 2>/dev/null \
    | grep -v -E '^(\\restrict|\\unrestrict|--|$)' >"$WORK_DIR/orig.schema"
  pg_dump -s --no-owner --no-acl "$PG_URL/stg_rehearsal_test" 2>/dev/null \
    | grep -v -E '^(\\restrict|\\unrestrict|--|$)' >"$WORK_DIR/rehearsal_down.schema"
  if ! diff "$WORK_DIR/orig.schema" "$WORK_DIR/rehearsal_down.schema" >"$WORK_DIR/down_schema.diff"; then
    local down_objs
    down_objs="$(grep -E '^[<>] (CREATE|ALTER) ' "$WORK_DIR/down_schema.diff" | head -n 40 | tr '\n' ' ' || true)"
    [[ -n "$down_objs" ]] || down_objs="$(grep -c '^[<>]' "$WORK_DIR/down_schema.diff") schema lines (columns, defaults or indexes; diff locally)"
    fail "schema after down differs: $down_objs"
  fi

  row_counts stg_rehearsal_test >"$WORK_DIR/after_down"
  if ! diff "$WORK_DIR/before" "$WORK_DIR/after_down" >"$WORK_DIR/down_counts.diff"; then
    local diff_tables
    diff_tables="$(sed -n 's/^[<>] \([^|]*\)|.*/\1/p' "$WORK_DIR/down_counts.diff" | sort -u | paste -sd, -)"
    fail "row counts after down differ: $diff_tables"
  fi

  summary "✅ up, drift and down green for $new_label"
}

case "${1:-}" in
  open-firewall) open_firewall ;;
  dump) dump ;;
  close-firewall) close_firewall ;;
  rehearse) rehearse ;;
  *)
    echo "usage: $0 open-firewall|dump|close-firewall|rehearse" >&2
    exit 2
    ;;
esac
