#!/usr/bin/env bash

set -Eeuo pipefail

# pnpm/Expo and Gradle may choose their own color mode. Clear both inherited
# variables so Node does not report a NO_COLOR/FORCE_COLOR conflict.
unset FORCE_COLOR NO_COLOR

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "$script_dir/.." && pwd)"
mobile_dir="$repo_root/apps/mobile"
stamp="$(date +%Y%m%d-%H%M%S)"
log_dir="$script_dir/mobile-build-logs/$stamp"
mkdir -p "$log_dir"

failures=()

run_step() {
  local label="$1"
  shift
  local log_file="$log_dir/$label.log"
  local status

  printf '\n===== %s =====\n' "$label"
  printf 'Log: %s\n' "$log_file"

  set +e
  "$@" 2>&1 | tee "$log_file"
  status=${PIPESTATUS[0]}
  set -e

  if (( status != 0 )); then
    printf 'FAILED (%s): %s\n' "$status" "$label" >&2
    return "$status"
  fi

  printf 'PASSED: %s\n' "$label"
}

cd "$repo_root"

if run_step "01-install" corepack pnpm install --frozen-lockfile --prefer-offline; then :; else failures+=("01-install"); fi
if run_step "02-mobile-format" corepack pnpm --filter @turismo/mobile format; then :; else failures+=("02-mobile-format"); fi
if run_step "03-mobile-lint" corepack pnpm --filter @turismo/mobile lint; then :; else failures+=("03-mobile-lint"); fi
if run_step "04-mobile-typecheck" corepack pnpm --filter @turismo/mobile typecheck; then :; else failures+=("04-mobile-typecheck"); fi
if run_step "05-mobile-tests" corepack pnpm --filter @turismo/mobile test; then :; else failures+=("05-mobile-tests"); fi
if run_step "06-expo-doctor" bash -lc "cd '$mobile_dir' && corepack pnpm dlx expo-doctor@latest"; then :; else failures+=("06-expo-doctor"); fi
if run_step "07-expo-config" bash -lc "cd '$mobile_dir' && corepack pnpm exec expo config --type public --json"; then :; else failures+=("07-expo-config"); fi
if run_step "08-export-web" bash -lc "cd '$mobile_dir' && corepack pnpm exec expo export --platform web --output-dir '$log_dir/export-web'"; then :; else failures+=("08-export-web"); fi
if run_step "09-export-android" bash -lc "cd '$mobile_dir' && corepack pnpm exec expo export --platform android --output-dir '$log_dir/export-android'"; then :; else failures+=("09-export-android"); fi

printf '\n===== warning summary =====\n'
warning_pattern='(?<![[:alnum:]_./-])(warning|warn|deprecated|deprecat|mismatch|unsupported|peer[[:space:]]+dep|peerDependency)(?![[:alnum:]_./-])'
failure_pattern='(?<![[:alnum:]_./-])(FAILURE:|BUILD FAILED|ERROR|Exception|failed|FAILED)(?![[:alnum:]_./-])'
warning_count=$(rg -n -i --pcre2 --glob '*.log' "$warning_pattern" "$log_dir" | wc -l || true)
failure_count=$(rg -n --pcre2 --glob '*.log' "$failure_pattern" "$log_dir" | wc -l || true)
printf 'Matched warning lines: %s\n' "$warning_count"
printf 'Matched failure lines: %s\n' "$failure_count"
if ! rg -n --pcre2 --glob '*.log' "$failure_pattern" "$log_dir" | tail -80; then
  printf 'No failure patterns found in the captured logs.\n'
fi
printf '\nTop warning families:\n'
rg -o -i --pcre2 --glob '*.log' "$warning_pattern" "$log_dir" \
  | sed 's/.*://' \
  | tr '[:upper:]' '[:lower:]' \
  | sort \
  | uniq -c \
  | sort -nr \
  | head -20 || true

printf '\nLogs saved in: %s\n' "$log_dir"
if ((${#failures[@]} > 0)); then
  printf 'Failed steps: %s\n' "${failures[*]}" >&2
  exit 1
fi

printf 'All mobile audit steps passed.\n'
