// Lekki logger dla backendu — dodaje znaczniki czasu, poziom, zachowuje zwięzłość
// w produkcji. Eksportuje też helper do owijania wywołań YouTube/Innertube,
// aby zapewnić traceability w razie zmian po stronie API.

"use strict";

const COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
};

const LEVELS = ["debug", "info", "warn", "error"];
const LEVEL_PRIORITY = Object.fromEntries(LEVELS.map((l, i) => [l, i]));
const ACTIVE_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug");

function shouldLog(level) {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[ACTIVE_LEVEL];
}

function ts() {
  return new Date().toISOString();
}

function format(level, scope, message, extra) {
  const color =
    level === "error" ? COLORS.red :
    level === "warn" ? COLORS.yellow :
    level === "info" ? COLORS.cyan :
    COLORS.dim;
  const stamp = `${COLORS.dim}${ts()}${COLORS.reset}`;
  const tag = `${color}[${level.toUpperCase()}]${COLORS.reset}`;
  const scopeStr = scope ? ` ${COLORS.cyan}[${scope}]${COLORS.reset}` : "";
  const extraStr =
    extra !== undefined
      ? ` ${COLORS.dim}${typeof extra === "string" ? extra : JSON.stringify(extra)}${COLORS.reset}`
      : "";
  return `${stamp} ${tag}${scopeStr} ${message}${extraStr}`;
}

function makeLogger(scope) {
  return {
    debug: (message, extra) => {
      if (shouldLog("debug")) console.log(format("debug", scope, message, extra));
    },
    info: (message, extra) => {
      if (shouldLog("info")) console.log(format("info", scope, message, extra));
    },
    warn: (message, extra) => {
      if (shouldLog("warn")) console.warn(format("warn", scope, message, extra));
    },
    error: (message, extra) => {
      if (shouldLog("error")) console.error(format("error", scope, message, extra));
    },
  };
}

// Wrapper dla zapytań do zewnętrznego API z logowaniem czasu i błędów.
async function trace(scope, label, fn) {
  const log = makeLogger(scope);
  const start = Date.now();
  try {
    const result = await fn();
    const elapsed = Date.now() - start;
    log.debug(`${label} OK in ${elapsed}ms`);
    return result;
  } catch (err) {
    const elapsed = Date.now() - start;
    log.error(`${label} FAILED in ${elapsed}ms: ${err?.message || err}`);
    throw err;
  }
}

module.exports = {
  makeLogger,
  trace,
  default: makeLogger("server"),
};
