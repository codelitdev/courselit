import { readFile, rename, writeFile } from "node:fs/promises";

const apiBaseUrl = (process.env.SENDLIT_API_BASE_URL || "http://sendlit-api:3001")
  .replace(/\/+$/, "");
const apiKey = process.env.SENDLIT_DELIVERY_SETUP_API_KEY?.trim();
const espName = process.env.SENDLIT_DELIVERY_ESP_NAME || "CourseLit Local Mailpit";
const fromName = process.env.SENDLIT_DELIVERY_FROM_NAME || "CourseLit Local";
const fromEmail = process.env.SENDLIT_DELIVERY_FROM_EMAIL || "courselit@localhost.test";
const testRecipient = process.env.SENDLIT_DELIVERY_TEST_TO || "admin@example.com";
const statePath = "/var/lib/sendlit-delivery-setup/state.json";

if (!apiKey) {
  console.log("SendLit delivery setup skipped: no delivery setup key is configured.");
  process.exit(0);
}

async function request(method, path, body) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${apiKey}`,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const raw = await response.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : undefined;
  } catch {
    data = undefined;
  }
  if (!response.ok) {
    const error = typeof data?.error === "string" ? data.error : response.statusText;
    throw new Error(`${method} ${path} failed (${response.status}): ${error}`);
  }
  return data;
}

function validateMailpitEsp(esp) {
  if (
    esp.provider !== "smtp" ||
    esp.host !== "mailpit" ||
    esp.port !== 1025 ||
    esp.secure !== false
  ) {
    throw new Error(
      `ESP "${esp.name}" is not configured for local Mailpit at mailpit:1025; refusing to change it automatically.`,
    );
  }
}

async function readState() {
  try {
    return JSON.parse(await readFile(statePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw new Error(`Could not read delivery setup state: ${error.message}`);
  }
}

async function saveState(state) {
  const temporaryPath = `${statePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, {
    mode: 0o600,
  });
  await rename(temporaryPath, statePath);
}

async function main() {
  const organization = await request("GET", "/provisioning/organization");
  const organizationId = organization.organizationId;
  if (!organizationId) {
    throw new Error("SendLit did not return the organization public ID.");
  }

  const previousState = await readState();
  if (previousState) {
    if (previousState.organizationId !== organizationId) {
      throw new Error(
        "The persisted delivery setup marker belongs to a different organization; inspect the local setup volume before proceeding.",
      );
    }
    console.log(
      `SendLit delivery setup already completed (${previousState.result}); leaving current delivery settings unchanged.`,
    );
    return;
  }

  const orgPath = `/organizations/${encodeURIComponent(organizationId)}`;
  const policy = await request("GET", `${orgPath}/delivery-policy`);
  let esp;

  if (policy.defaultEspId) {
    // If an operator already chose another ESP, do not replace that choice on
    // local stack startup. If the configured Mailpit ESP is already the
    // default, continue so automatic grants can be enabled once.
    esp = await request(
      "GET",
      `${orgPath}/esps/${encodeURIComponent(policy.defaultEspId)}`,
    );
    if (esp.name !== espName) {
      console.log(
        `SendLit delivery setup preserved existing default ESP "${esp.name}"; no settings were changed.`,
      );
      await saveState({
        organizationId,
        espId: policy.defaultEspId,
        result: "existing-default-preserved",
        completedAt: new Date().toISOString(),
      });
      return;
    }
  } else {
    const response = await request("GET", `${orgPath}/esps`);
    const matchingEsps = (response.items || []).filter((item) => item.name === espName);
    if (matchingEsps.length > 1) {
      throw new Error(
        `More than one organization ESP is named "${espName}"; resolve the duplicate before running local delivery setup.`,
      );
    }

    esp = matchingEsps[0];
    if (!esp) {
      esp = await request("POST", `${orgPath}/esps`, {
        name: espName,
        provider: "smtp",
        host: "mailpit",
        port: 1025,
        secure: false,
        fromName,
        fromEmail,
      });
    }
  }

  validateMailpitEsp(esp);

  const testResult = await request(
    "POST",
    `${orgPath}/esps/${encodeURIComponent(esp.espId)}/test`,
    { to: testRecipient },
  );
  if (!testResult?.success) {
    throw new Error(
      `SendLit could not send the ESP test message${testResult?.error ? `: ${testResult.error}` : "."}`,
    );
  }

  if (esp.status !== "active") {
    if (esp.status !== "draft") {
      throw new Error(
        `ESP "${espName}" has status "${esp.status}"; refusing to activate it automatically.`,
      );
    }
    esp = await request(
      "POST",
      `${orgPath}/esps/${encodeURIComponent(esp.espId)}/activate`,
    );
  }

  let result = "already-configured";
  if (!policy.defaultEspId || !policy.autoGrantDefaultEsp) {
    await request("PUT", `${orgPath}/delivery-policy`, {
      ...(!policy.defaultEspId ? { defaultEspId: esp.espId } : {}),
      autoGrantDefaultEsp: true,
    });
    result = "mailpit-default-configured";
  }

  await saveState({
    organizationId,
    espId: esp.espId,
    result,
    completedAt: new Date().toISOString(),
  });
  console.log(
    `SendLit local Mailpit ESP is active and delivery setup is complete (test sent to ${testRecipient}).`,
  );
}

main().catch((error) => {
  console.error(`SendLit local delivery setup failed: ${error.message}`);
  process.exitCode = 1;
});
