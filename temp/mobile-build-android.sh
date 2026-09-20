#!/usr/bin/env bash

set -Eeuo pipefail

# Let Node/Gradle choose their own color mode without an inherited conflict.
unset FORCE_COLOR NO_COLOR

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "$script_dir/.." && pwd)"
mobile_dir="$repo_root/apps/mobile"
stamp="$(date +%Y%m%d-%H%M%S)"
log_dir="$script_dir/mobile-build-logs/android-$stamp"
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

if run_step "01-install" bash -lc "cd '$repo_root' && corepack pnpm install --frozen-lockfile --prefer-offline"; then :; else failures+=("01-install"); fi
if run_step "02-prebuild-android" bash -lc "cd '$mobile_dir' && corepack pnpm exec expo prebuild --platform android --no-install"; then :; else failures+=("02-prebuild-android"); fi
if run_step "03-gradle-clean" bash -lc "cd '$mobile_dir/android' && ./gradlew clean --warning-mode all --stacktrace --no-daemon"; then :; else failures+=("03-gradle-clean"); fi
if run_step "04-gradle-debug" bash -lc "cd '$mobile_dir/android' && ./gradlew :app:assembleDebug --warning-mode all --stacktrace --no-daemon"; then :; else failures+=("04-gradle-debug"); fi
if run_step "05-android-lint" bash -lc "cd '$mobile_dir/android' && ./gradlew :app:lintDebug --warning-mode all --stacktrace --no-daemon"; then :; else failures+=("05-android-lint"); fi
if run_step "06-gradle-release" bash -lc "cd '$mobile_dir/android' && ./gradlew :app:assembleRelease --warning-mode all --stacktrace --no-daemon"; then :; else failures+=("06-gradle-release"); fi
if run_step "07-gradle-bundle-release" bash -lc "cd '$mobile_dir/android' && ./gradlew :app:bundleRelease --warning-mode all --stacktrace --no-daemon"; then :; else failures+=("07-gradle-bundle-release"); fi

printf '\n===== warning summary =====\n'
warning_pattern='(?<![[:alnum:]_./-])(warning|warn|deprecated|deprecat|mismatch|unsupported|peer[[:space:]]+dep)(?![[:alnum:]_./-])'
failure_pattern='(?<![[:alnum:]_./-])(FAILURE:|BUILD FAILED|ERROR|Exception|failed|FAILED|Cannot[[:space:]]+find[[:space:]]+a[[:space:]]+KaModule|Lint[[:space:]]+found)(?![[:alnum:]_./-])'
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

printf 'All Android build steps passed.\n'
