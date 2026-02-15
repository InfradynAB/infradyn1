import autocannon from "autocannon";

const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const authCookie = process.env.AUTH_COOKIE || "";
const authCookieName = process.env.AUTH_COOKIE_NAME || "better-auth.session_token";
const duration = Number(process.env.DURATION || 30);
const connections = Number(process.env.CONNECTIONS || 40);
const pipelining = Number(process.env.PIPELINING || 1);

function normalizeCookieHeader(value) {
  if (!value) return "";
  if (value.includes("=") && value.includes(";")) return value;
  if (value.includes("=") && !value.includes(" ")) return value;
  return `${authCookieName}=${value}`;
}

const cookieHeader = normalizeCookieHeader(authCookie);
const headers = cookieHeader ? { cookie: cookieHeader } : {};

const scenarios = [
  {
    name: "Dashboard Analytics",
    url: `${baseUrl}/api/dashboard/analytics?timeframe=30d`,
  },
  {
    name: "Command Center",
    url: `${baseUrl}/api/dashboard/command-center`,
  },
  {
    name: "Dashboard Export (JSON)",
    url: `${baseUrl}/api/dashboard/export?format=json&source=executive&type=detailed&timeframe=30d`,
  },
];

function runScenario({ name, url }) {
  return new Promise((resolve, reject) => {
    const instance = autocannon(
      {
        title: name,
        url,
        method: "GET",
        duration,
        connections,
        pipelining,
        headers,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({ name, result });
      }
    );

    autocannon.track(instance, { renderProgressBar: true });
  });
}

function summarize(name, result) {
  const p97_5 = result.latency?.p97_5 ?? 0;
  const p99 = result.latency?.p99 ?? 0;
  const avg = result.latency?.average ?? 0;
  const reqAvg = result.requests?.average ?? 0;
  const bytesAvg = result.throughput?.average ?? 0;
  const r2xx = result["2xx"] ?? 0;
  const r3xx = result["3xx"] ?? 0;
  const r4xx = result["4xx"] ?? 0;
  const r5xx = result["5xx"] ?? 0;

  return {
    endpoint: name,
    requestsPerSec: reqAvg,
    latencyAvgMs: avg,
    latencyP97_5Ms: p97_5,
    latencyP99Ms: p99,
    throughputBytesPerSec: bytesAvg,
    r2xx,
    r3xx,
    r4xx,
    r5xx,
    non2xx: result.non2xx,
    errors: result.errors,
    timeouts: result.timeouts,
  };
}

async function preflight() {
  const url = `${baseUrl}/api/dashboard/analytics?timeframe=30d`;
  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    let body = "";
    try {
      body = await response.text();
    } catch {
      body = "";
    }

    console.error("\nPreflight failed. Stress test aborted because authentication/context is invalid.");
    console.error(`Status: ${response.status}`);
    if (body) {
      console.error(`Body: ${body.slice(0, 300)}`);
    }
    process.exitCode = 1;
    return false;
  }

  const cacheHeader = response.headers.get("x-infradyn-cache");
  console.log(`Preflight OK (status ${response.status})${cacheHeader ? ` | cache=${cacheHeader}` : ""}`);
  return true;
}

async function main() {
  console.log("\n=== Infradyn Dashboard Stress Test ===");
  console.log(`BASE_URL=${baseUrl}`);
  console.log(`DURATION=${duration}s | CONNECTIONS=${connections} | PIPELINING=${pipelining}`);
  if (!cookieHeader) {
    console.warn("No AUTH_COOKIE provided. Protected endpoints may return 401/403 and skew results.");
  } else {
    console.log(`Cookie mode: ${authCookie.includes("=") ? "explicit" : `token + inferred name (${authCookieName})`}`);
  }

  const preflightOk = await preflight();
  if (!preflightOk) {
    return;
  }

  const summaries = [];
  for (const scenario of scenarios) {
    console.log(`\n--- Running: ${scenario.name} ---`);
    const { name, result } = await runScenario(scenario);
    summaries.push(summarize(name, result));
  }

  console.log("\n=== Summary ===");
  console.table(summaries);
}

main().catch((error) => {
  console.error("Stress test failed:", error);
  process.exitCode = 1;
});
