const { chromium } = require("playwright");
const { spawn, spawnSync } = require("node:child_process");
const { mkdirSync, writeFileSync } = require("node:fs");
const { randomBytes } = require("node:crypto");
const path = require("node:path");
const assert = require("node:assert/strict");

(async () => {
    const root = path.resolve(__dirname, "..");
    const folder = path.join(root, "storage/framework/testing");
    mkdirSync(folder, { recursive: true });
    const database = path.join(folder, "e2e.sqlite");
    writeFileSync(database, ""); // Dedicated test database. Never the developer's database.
    const php = process.env.PHP_BIN || "php";
    const env = {
        ...process.env,
        APP_ENV: "local",
        APP_DEBUG: "true",
        APP_KEY: `base64:${randomBytes(32).toString("base64")}`,
        APP_URL: "http://127.0.0.1:8001",
        DB_CONNECTION: "sqlite",
        DB_DATABASE: database,
        DB_URL: "",
        SESSION_DRIVER: "file",
        CACHE_STORE: "array",
        DEMO_PASSWORD: "EcoRegistroDemo2026!",
        BCRYPT_ROUNDS: "4",
    };
    const migrate = spawnSync(
        php,
        ["artisan", "migrate:fresh", "--seed", "--force"],
        { cwd: root, env, encoding: "utf8" },
    );
    if (migrate.status !== 0) throw new Error(migrate.stderr + migrate.stdout);
    const server = spawn(
        php,
        ["-S", "127.0.0.1:8001", "-t", "public", "server.php"],
        { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] },
    );
    let logs = "";
    server.stderr.on("data", (data) => {
        logs += data.toString();
    });
    let browser, page;
    const errors = [];
    try {
        let ready = false;
        for (let i = 0; i < 100; i++) {
            try {
                const response = await fetch(
                    "http://127.0.0.1:8001/api/session",
                );
                if (response.ok && (await response.json()).csrf_token) {
                    ready = true;
                    break;
                }
            } catch {}
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        assert.ok(ready, `Server did not start: ${logs}`);
        browser = await chromium.launch({
            headless: true,
            ...(process.env.CHROMIUM_BIN
                ? { executablePath: process.env.CHROMIUM_BIN }
                : {}),
            args: ["--no-sandbox", "--disable-dev-shm-usage"],
        });
        page = await browser.newPage({
            viewport: { width: 1440, height: 1100 },
        });
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("requestfailed", (request) =>
            errors.push(`${request.url()}: ${request.failure()?.errorText}`),
        );
        await page.goto("http://127.0.0.1:8001");
        await page
            .getByRole("button", { name: "Revisor", exact: false })
            .click();
        await page.getByRole("button", { name: "Ingresar al espacio" }).click();
        await page.getByText("Evolución de la operación").waitFor();
        await page.screenshot({
            path: path.join(folder, "dashboard-desktop.png"),
            fullPage: true,
        });
        assert.equal(
            await page
                .locator("body")
                .evaluate((el) => el.scrollWidth > window.innerWidth),
            false,
        );
        await page
            .getByRole("button", { name: "Metodología", exact: true })
            .click();
        await page.getByText("Un resultado que puedes explicar.").waitFor();
        await page.getByRole("button", { name: "Cerrar sesión" }).click();
        await page
            .getByRole("button", { name: "Operador", exact: false })
            .click();
        await page.getByRole("button", { name: "Ingresar al espacio" }).click();
        await page
            .getByRole("heading", { name: "El pulso de tu operación" })
            .waitFor();
        await page
            .getByRole("button", { name: "Registros", exact: true })
            .click();
        await page.getByRole("button", { name: "Nuevo registro" }).click();
        const dialog = page.getByRole("dialog");
        await dialog.getByLabel("Período", { exact: true }).fill("2026-07");
        await dialog.getByLabel(/Consumo eléctrico/).fill("12300");
        await dialog.getByLabel(/Producción/).fill("160");
        await dialog
            .getByLabel(/Referencia de evidencia/)
            .fill("Factura ficticia E2E julio");
        await dialog.getByRole("button", { name: "Guardar registro" }).click();
        await dialog.waitFor({ state: "hidden" });
        const newRow = page
            .getByRole("row")
            .filter({ hasText: "julio de 2026" });
        await newRow.click();
        await page.getByRole("button", { name: "Enviar a revisión" }).click();
        await page.getByRole("dialog").waitFor({ state: "hidden" });
        await page.getByRole("button", { name: "Cerrar sesión" }).click();
        await page
            .getByRole("button", { name: "Revisor", exact: false })
            .click();
        await page.getByRole("button", { name: "Ingresar al espacio" }).click();
        await page
            .getByRole("heading", { name: "El pulso de tu operación" })
            .waitFor();
        await page
            .getByRole("button", { name: "Revisión", exact: false })
            .first()
            .click();
        await page
            .getByRole("row")
            .filter({ hasText: "julio de 2026" })
            .click();
        await page.getByRole("button", { name: "Aprobar registro" }).click();
        await page.getByRole("dialog").waitFor({ state: "hidden" });
        await page
            .getByRole("button", { name: "Resumen", exact: true })
            .click();
        await page.getByLabel("Período de análisis").fill("2026-07");
        await page.waitForFunction(() =>
            document
                .querySelector(".metric-value")
                ?.textContent.includes("12,3"),
        );
        const downloadPromise = page.waitForEvent("download");
        await page.getByRole("button", { name: "Exportar CSV" }).click();
        const download = await downloadPromise;
        assert.match(download.suggestedFilename(), /2026-07/);
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForFunction(
            () =>
                document.querySelector(".sidebar").getBoundingClientRect()
                    .right <= 1,
        );
        await page.screenshot({
            path: path.join(folder, "dashboard-mobile.png"),
            fullPage: true,
        });
        if (
            await page
                .locator("body")
                .evaluate((el) => el.scrollWidth > window.innerWidth)
        ) {
            console.error(
                await page.evaluate(() =>
                    [...document.querySelectorAll("*")]
                        .filter(
                            (el) =>
                                el.getBoundingClientRect().right >
                                innerWidth + 1,
                        )
                        .map((el) => [
                            el.className,
                            Math.round(el.getBoundingClientRect().right),
                        ])
                        .slice(0, 20),
                ),
            );
        }
        assert.equal(
            await page
                .locator("body")
                .evaluate((el) => el.scrollWidth > window.innerWidth),
            false,
        );
        await page.getByRole("button", { name: "Abrir menú" }).click();
        await page
            .getByRole("button", { name: "Registros", exact: true })
            .click();
        await page.getByText("Registro de consumos", { exact: true }).waitFor();
        assert.deepEqual(errors, []);
        console.log(
            JSON.stringify({
                result: "passed",
                browserErrors: errors.length,
                scenarios: [
                    "login",
                    "dashboard",
                    "methodology",
                    "create",
                    "submit",
                    "independent approval",
                    "csv",
                    "mobile navigation",
                    "responsive layout",
                ],
            }),
        );
    } catch (error) {
        if (page) {
            await page
                .screenshot({
                    path: path.join(folder, "failure.png"),
                    fullPage: true,
                })
                .catch(() => {});
            console.error(
                (await page.locator("body").innerText()).slice(0, 2000),
            );
        }
        console.error(
            JSON.stringify({
                browserErrors: errors,
                serverTail: logs.slice(-1500),
            }),
        );
        throw error;
    } finally {
        if (browser) await browser.close();
        server.kill("SIGTERM");
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
