/**
 * Automated Architecture, Circular Dependency & Security Boundary Validator.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "src");

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else if (full.endsWith(".js") || full.endsWith(".vue")) {
      files.push(full);
    }
  }
  return files;
}

function resolveLocalImport(fromFile, spec) {
  if (!spec.startsWith(".")) return null;
  const base = resolve(dirname(fromFile), spec);
  const candidates = [base, `${base}.js`, `${base}.vue`, join(base, "index.js")];
  for (const c of candidates) {
    if (existsSync(c) && statSync(c).isFile()) {
      return c;
    }
  }
  return null;
}

const violations = [];
const allFiles = walk(ROOT);
const graph = new Map();

for (const file of allFiles) {
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  const content = readFileSync(file, "utf-8");

  // 1. Security hygiene
  if (/\beval\s*\(/.test(content) || /\bnew\s+Function\s*\(/.test(content)) {
    violations.push(`${rel}: dilarang menggunakan eval() atau new Function()`);
  }
  if (/v-html\s*=/.test(content)) {
    violations.push(`${rel}: hindari v-html untuk mencegah XSS`);
  }
  if (rel.startsWith("utils/crypto/") && /Math\.random\s*\(/.test(content)) {
    violations.push(`${rel}: dilarang menggunakan Math.random() pada modul kriptografi`);
  }
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(content) && !content.includes("placeholder=")) {
    violations.push(`${rel}: terindikasi private key hardcoded`);
  }
  if (rel !== "config/demo.js" && /Admin@2026!|KeyPass@2026!|PtXyz_StrongDbPass/.test(content)) {
    violations.push(`${rel}: terindikasi kredensial demo/hardcoded di luar config/demo.js`);
  }
  if (rel !== "utils/logger.js" && /\bconsole\.(log|info|warn|error)\s*\(/.test(content)) {
    violations.push(`${rel}: gunakan utils/logger.js terpusat, jangan gunakan console.* langsung`);
  }

  // 2. Layer boundary rules
  if (
    rel.startsWith("views/") ||
    rel.startsWith("components/") ||
    rel.startsWith("stores/") ||
    rel.startsWith("composables/") ||
    rel.startsWith("i18n/")
  ) {
    if (/from\s+["']axios["']|fetch\(|httpClient|repositories/.test(content)) {
      violations.push(`${rel}: View/Component/Store/Composable/i18n tidak boleh mengakses HTTP client atau Repository langsung`);
    }
  }
  if (rel.startsWith("services/")) {
    if (/from\s+["']axios["']|fetch\(|httpClient|from\s+["'].*\/(views|components)\//.test(content)) {
      violations.push(`${rel}: Service tidak boleh mengakses HTTP client langsung atau mengimpor View/Component`);
    }
  }
  if (rel.startsWith("repositories/")) {
    if (/from\s+["'].*\/(services|stores|views|components)\//.test(content)) {
      violations.push(`${rel}: Repository tidak boleh bergantung pada Service, Store, View, atau Component`);
    }
  }

  // 3. Collect local dependency graph for cycle detection
  const deps = [];
  const importRegex = /import\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const resolved = resolveLocalImport(file, match[1]);
    if (resolved) deps.push(resolved);
  }
  graph.set(file, deps);
}

// 4. Circular dependency DFS
const state = new Map(); // 0=unvisited, 1=visiting, 2=done
function dfs(node, stack) {
  state.set(node, 1);
  for (const next of graph.get(node) || []) {
    const nextState = state.get(next) || 0;
    if (nextState === 1) {
      const cycleStart = stack.indexOf(next);
      const cycle = [...stack.slice(cycleStart), next].map((f) => relative(ROOT, f).replace(/\\/g, "/"));
      violations.push(`Circular dependency terdeteksi: ${cycle.join(" -> ")}`);
    } else if (nextState === 0) {
      dfs(next, [...stack, next]);
    }
  }
  state.set(node, 2);
}

for (const file of allFiles) {
  if ((state.get(file) || 0) === 0) {
    dfs(file, [file]);
  }
}

if (violations.length > 0) {
  console.error("Architecture & Security Check FAILED:");
  for (const v of violations) {
    console.error(" - " + v);
  }
  process.exit(1);
}

console.log(`Architecture, Cycle & Security Check PASSED (${allFiles.length} files scanned, 0 violations).`);
