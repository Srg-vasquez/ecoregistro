import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
    Activity,
    ArrowDownToLine,
    ArrowRight,
    ArrowUpRight,
    Building2,
    CalendarDays,
    Check,
    CheckCheck,
    ChevronRight,
    CircleHelp,
    ClipboardCheck,
    Clock3,
    FileCheck2,
    FileText,
    Leaf,
    LayoutDashboard,
    LogOut,
    Plus,
    RefreshCw,
    Search,
    ShieldCheck,
    Sprout,
    TrendingDown,
    X,
    Zap,
    AlertCircle,
    Layers3,
    Menu,
    Monitor,
    Moon,
    Sun,
} from "lucide-react";
import "../css/ecoregistro.css";
import "../css/ecoregistro-theme.css";

const THEME_STORAGE_KEY = "ecoregistro-theme-preference";

function systemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
}

function resolvePreference() {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "system" || stored === "light" || stored === "dark") {
        return stored;
    }
    return "system";
}

function resolveAppliedTheme(preference) {
    if (preference === "light" || preference === "dark") {
        return preference;
    }
    return systemTheme();
}

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", theme === "dark" ? "#0c1210" : "#1a5c47");
}

function useTheme() {
    const [preference, setPreference] = useState(() => resolvePreference());
    const [appliedTheme, setAppliedTheme] = useState(() =>
        resolveAppliedTheme(resolvePreference()),
    );

    useEffect(() => {
        const next = resolveAppliedTheme(preference);
        setAppliedTheme(next);
        applyTheme(next);
        localStorage.setItem(THEME_STORAGE_KEY, preference);
    }, [preference]);

    useEffect(() => {
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const onChange = () => {
            if (preference !== "system") {
                return;
            }
            const next = systemTheme();
            setAppliedTheme(next);
            applyTheme(next);
        };
        media.addEventListener("change", onChange);
        return () => media.removeEventListener("change", onChange);
    }, [preference]);

    const cycleTheme = () => {
        setPreference((current) =>
            current === "system" ? "light" : current === "light" ? "dark" : "system",
        );
    };

    return { preference, appliedTheme, cycleTheme };
}

applyTheme(resolveAppliedTheme(resolvePreference()));

function ThemeToggle({
    preference,
    appliedTheme,
    onCycle,
    className = "",
    compact = false,
}) {
    const labels = {
        system: "Sistema",
        light: "Claro",
        dark: "Oscuro",
    };
    const nextLabels = {
        system: "claro fijo",
        light: "oscuro fijo",
        dark: "seguir el sistema",
    };
  const icons = {
        system: Monitor,
        light: Sun,
        dark: Moon,
    };
    const Icon = icons[preference] ?? Monitor;
    return (
        <button
            type="button"
            className={`theme-toggle ${className}`.trim()}
            onClick={onCycle}
            aria-label={`Tema ${labels[preference]} · cambiar a ${nextLabels[preference]}`}
            title={`Tema: ${labels[preference]}${preference === "system" ? ` (${appliedTheme === "dark" ? "oscuro" : "claro"} del sistema)` : ""}`}
        >
            <Icon size={16} />
            {!compact && <span>{labels[preference]}</span>}
        </button>
    );
}

let csrf = document.querySelector('meta[name="csrf-token"]')?.content || "";
async function api(path, options = {}) {
    const response = await fetch(`/api${path}`, {
        credentials: "same-origin",
        ...options,
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": csrf,
            ...options.headers,
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });
    const data = await response.json().catch(() => ({}));
    if (data.csrf_token) csrf = data.csrf_token;
    if (!response.ok) {
        const error = new Error(
            data.message ||
                (response.status === 419
                    ? "Tu sesión expiró. Recarga la página."
                    : "No se pudo completar la operación."),
        );
        error.errors = data.errors || {};
        error.status = response.status;
        throw error;
    }
    return data;
}
const number = (value, digits = 0) =>
    value == null
        ? "—"
        : new Intl.NumberFormat("es-CL", {
              maximumFractionDigits: digits,
              minimumFractionDigits: digits,
          }).format(value);
const monthName = (value, short = false) =>
    new Date(`${value}-15T12:00:00`).toLocaleDateString("es-CL", {
        month: short ? "short" : "long",
        ...(short ? {} : { year: "numeric" }),
    });
const statuses = {
    draft: ["Borrador", "gray"],
    submitted: ["En revisión", "amber"],
    changes_requested: ["Por corregir", "red"],
    approved: ["Aprobado", "green"],
    missing: ["Sin registro", "gray"],
};
const actions = {
    created: "Registro creado",
    updated: "Información actualizada",
    submit: "Enviado a revisión",
    approve: "Registro aprobado",
    request_changes: "Corrección solicitada",
};
function Status({ status = "missing" }) {
    const [label, color] = statuses[status] || statuses.missing;
    return (
        <span className={`badge ${color}`}>
            <span />
            {label}
        </span>
    );
}
function Brand({ light = false, onSurface = false }) {
    return (
        <div
            className={`brand ${light ? "light" : ""} ${onSurface ? "brand-surface" : ""}`}
        >
            <span className="brand-icon">
                <Leaf size={24} />
            </span>
            <div>
                EcoRegistro<small>GESTIÓN AMBIENTAL</small>
            </div>
        </div>
    );
}
function ErrorBox({ error }) {
    if (!error) return null;
    return (
        <div className="error-box" role="alert">
            <AlertCircle size={18} />
            <div>
                {Object.values(error.errors || {}).flat().length
                    ? Object.values(error.errors).flat().join(" ")
                    : error.message}
            </div>
        </div>
    );
}
function Spinner() {
    return (
        <div className="loading">
            <RefreshCw className="spin" size={26} />
            <span>Cargando tu espacio de trabajo…</span>
        </div>
    );
}

function Login({ onLogin, preference, appliedTheme, onCycleTheme }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    async function submit(event) {
        event.preventDefault();
        setBusy(true);
        setError(null);
        try {
            const data = await api("/login", {
                method: "POST",
                body: { email, password },
            });
            onLogin(data.user);
        } catch (e) {
            setError(e);
        } finally {
            setBusy(false);
        }
    }
    return (
        <main className="login-page">
            <section className="login-story">
                <Brand light />
                <span className="eyebrow light-text">CADA DATO CUENTA</span>
                <h1>
                    Mejores datos.
                    <br />
                    Decisiones con
                    <br />
                    <em>menos impacto.</em>
                </h1>
                <p>
                    Del consumo de una instalación a un cierre mensual
                    confiable. Reúne, revisa y comprende tu información
                    ambiental.
                </p>
                <div className="story-proof">
                    <ShieldCheck size={22} />
                    <div>
                        Información con respaldo
                        <small>
                            Un origen, una revisión y un historial para cada
                            registro.
                        </small>
                    </div>
                </div>
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <Sprout className="hero-sprout" strokeWidth={0.7} />
            </section>
            <section className="login-form">
                <ThemeToggle
                    preference={preference}
                    appliedTheme={appliedTheme}
                    onCycle={onCycleTheme}
                    className="theme-toggle--login"
                />
                <div className="login-card">
                    <Brand onSurface />
                    <span className="mini-label">
                        <span className="live-dot" /> ESPACIO DE DEMOSTRACIÓN
                    </span>
                    <h2>Bienvenido a EcoRegistro</h2>
                    <p>Ingresa para continuar con tu gestión ambiental.</p>
                    <ErrorBox error={error} />
                    <form onSubmit={submit}>
                        <label>
                            Correo electrónico
                            <input
                                type="email"
                                autoComplete="username"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="tu@empresa.cl"
                            />
                        </label>
                        <label>
                            Contraseña
                            <input
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Ingresa tu contraseña"
                            />
                        </label>
                        <button
                            className="button primary login-submit"
                            disabled={busy}
                        >
                            {busy ? "Ingresando…" : "Ingresar al espacio"}
                            <ArrowRight size={18} />
                        </button>
                    </form>
                    <div className="demo-accounts">
                        <span>Explora los dos roles de la demo</span>
                        <div>
                            <button
                                onClick={() => {
                                    setEmail("operador@ecoregistro.test");
                                    setPassword("EcoRegistroDemo2026!");
                                }}
                            >
                                Operador <ArrowUpRight size={14} />
                            </button>
                            <button
                                onClick={() => {
                                    setEmail("revisor@ecoregistro.test");
                                    setPassword("EcoRegistroDemo2026!");
                                }}
                            >
                                Revisor <ArrowUpRight size={14} />
                            </button>
                        </div>
                        <small>
                            Las cuentas rápidas usan la contraseña del entorno
                            de demostración.
                        </small>
                    </div>
                    <p className="login-note">
                        <Leaf size={15} /> Datos y factores ficticios para
                        aprendizaje. Sin certificación ambiental.
                    </p>
                </div>
            </section>
        </main>
    );
}

function TrendChart({ trend, metric }) {
    const max = Math.max(
        ...trend.map((p) =>
            metric === "electricity_kwh" ? p[metric] / 1000 : p[metric],
        ),
        1,
    );
    return (
        <div
            className="chart"
            aria-label="Consumo y emisiones aprobados por mes"
        >
            <div className="chart-y">
                {[1, 0.75, 0.5, 0.25, 0].map((v) => (
                    <span key={v}>
                        {number(max * v, metric === "electricity_kwh" ? 0 : 1)}
                    </span>
                ))}
            </div>
            <div className="chart-plot">
                <div className="grid-lines">
                    {[1, 2, 3, 4, 5].map((x) => (
                        <i key={x} />
                    ))}
                </div>
                <div className="bars">
                    {trend.map((p, i) => {
                        const val =
                            metric === "electricity_kwh"
                                ? p[metric] / 1000
                                : p[metric];
                        return (
                            <div className="bar-group" key={p.period}>
                                <div className="bar-tooltip">
                                    {monthName(p.period)}
                                    <strong>
                                        {number(val, 2)}{" "}
                                        {metric === "electricity_kwh"
                                            ? "MWh"
                                            : "tCO₂e"}
                                    </strong>
                                    <span>
                                        {p.approved_count}/{p.expected_count}{" "}
                                        instalaciones aprobadas
                                    </span>
                                </div>
                                <div
                                    className={`bar ${i === trend.length - 1 ? "selected" : ""} ${p.approved_count < p.expected_count ? "partial" : ""}`}
                                    style={{
                                        height: `${Math.max(1, (val / max) * 100)}%`,
                                    }}
                                    tabIndex={0}
                                    aria-label={`${monthName(p.period)}: ${number(val, 2)}, ${p.approved_count} aprobados`}
                                />
                                <span className="bar-month">
                                    {monthName(p.period, true).replace(".", "")}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function Overview({ data, onView, onOpen, period }) {
    const [metric, setMetric] = useState("electricity_kwh");
    const m = data.metrics;
    const periodIncomplete = m.coverage_pct < 100 || m.missing_count > 0;
    const hasGlobalPending = m.pending_review > 0;
    const closureBlocked = periodIncomplete || hasGlobalPending;
    const closureMessage = periodIncomplete
        ? `Solo los datos aprobados entran al reporte. En ${monthName(period)} faltan ${m.missing_count} registro(s), hay cobertura ${number(m.coverage_pct)} % y el cierre de este mes no es confiable todavía.`
        : hasGlobalPending
          ? `Este mes tiene cobertura completa, pero aún hay ${m.pending_review} envío(s) por revisar en la organización. Hasta aprobarlos, el dato puede quedar fuera del siguiente cierre.`
          : "Consulta los indicadores aprobados y detecta qué falta para completar el cierre.";
    const cards = [
        {
            title: "Consumo eléctrico",
            value: number(m.electricity_kwh / 1000, 1),
            unit: "MWh",
            note: "Electricidad de registros aprobados",
            icon: Zap,
            theme: "lime",
        },
        {
            title: "Emisiones estimadas",
            value: number(m.emissions_tonnes, 2),
            unit: "tCO₂e",
            note: "Alcance 2 · factor de demostración",
            icon: Leaf,
            theme: "mint",
        },
        {
            title: "Intensidad energética",
            value: number(m.intensity, 1),
            unit: "kWh/t",
            note: m.production_tonnes
                ? `${number(m.production_tonnes, 1)} t de producción reportada`
                : "Sin producción aprobada para calcular",
            icon: Activity,
            theme: "sand",
        },
        {
            title: "Cobertura del cierre",
            value: number(m.coverage_pct),
            unit: "%",
            note: `${m.approved_count} de ${m.expected_count} instalaciones aprobadas`,
            icon: ClipboardCheck,
            theme: "blue",
            warn: periodIncomplete,
        },
    ];
    return (
        <>
            <div
                className={`overview-callout${closureBlocked ? " alert" : ""}`}
            >
                <div className="callout-leaf">
                    {closureBlocked ? (
                        <AlertCircle size={22} />
                    ) : (
                        <Sprout size={25} />
                    )}
                </div>
                <div>
                    <strong>
                        {periodIncomplete
                            ? "El cierre mensual aún no está listo."
                            : hasGlobalPending
                              ? "Hay registros esperando revisión."
                              : "Una visión clara de tu operación."}
                    </strong>
                    <p>{closureMessage}</p>
                </div>
                <span className="callout-pill">
                    <span className="live-dot" />
                    {periodIncomplete
                        ? "Cierre incompleto"
                        : hasGlobalPending
                          ? "Revisión pendiente"
                          : "Datos trazables"}
                </span>
            </div>
            <div className="metric-grid">
                {cards.map((c) => (
                    <article
                        className={`metric-card${c.warn ? " metric-warn" : ""}`}
                        key={c.title}
                    >
                        <div className="metric-top">
                            <span>{c.title}</span>
                            <span className={`metric-icon ${c.theme}`}>
                                <c.icon size={18} />
                            </span>
                        </div>
                        <div className="metric-value">
                            {c.value}
                            <span>{c.unit}</span>
                        </div>
                        <p>{c.note}</p>
                    </article>
                ))}
            </div>
            <div className="dashboard-grid">
                <section className="panel trend-panel">
                    <div className="panel-heading">
                        <div>
                            <h2>Evolución de la operación</h2>
                            <p>
                                Últimos seis meses · solo información aprobada
                            </p>
                        </div>
                        <select
                            aria-label="Indicador del gráfico"
                            value={metric}
                            onChange={(e) => setMetric(e.target.value)}
                        >
                            <option value="electricity_kwh">
                                Electricidad · MWh
                            </option>
                            <option value="emissions_tonnes">
                                Emisiones · tCO₂e
                            </option>
                        </select>
                    </div>
                    <TrendChart trend={data.trend} metric={metric} />
                    <div className="chart-legend">
                        <span>
                            <i />
                            Instalaciones aprobadas
                        </span>
                        <span>
                            <i className="hatch" />
                            Cobertura incompleta
                        </span>
                        <span>Sin registros ≠ consumo cero</span>
                    </div>
                </section>
                <section
                    className={`panel closure-panel${periodIncomplete ? " closure-panel--blocked" : ""}`}
                >
                    <div className="panel-heading">
                        <div>
                            <h2>Tu cierre mensual</h2>
                            <p className="capitalize">{monthName(period)}</p>
                        </div>
                        <CalendarDays size={19} />
                    </div>
                    {periodIncomplete && (
                        <div className="closure-problem" role="status">
                            <strong>Problema que ataca este MVP</strong>
                            <span>
                                Sin trazabilidad y sin cobertura visible, el
                                cierre se arma con datos incompletos o
                                reconstruidos a mano. Cierra las brechas antes
                                de usar los totales como evidencia.
                            </span>
                        </div>
                    )}
                    <div className="closure-number">
                        {m.approved_count}
                        <span>/{m.expected_count}</span>
                    </div>
                    <p>instalaciones con información aprobada</p>
                    <div className="progress-track">
                        <div style={{ width: `${m.coverage_pct || 0}%` }} />
                    </div>
                    <div className="closure-row">
                        <span>
                            <span className="status-dot amber-dot" />
                            Por revisar, todos los meses
                        </span>
                        <strong>{m.pending_review}</strong>
                    </div>
                    <div className="closure-row">
                        <span>
                            <span className="status-dot gray-dot" />
                            Sin registro este mes
                        </span>
                        <strong>{m.missing_count}</strong>
                    </div>
                    <button
                        className="button subtle full"
                        onClick={() => onView("review")}
                    >
                        Revisar pendientes
                        <ArrowRight size={16} />
                    </button>
                </section>
            </div>
            <section className="panel">
                <div className="panel-heading">
                    <div>
                        <h2>Instalaciones</h2>
                        <p>Estado y desempeño en el período seleccionado</p>
                    </div>
                    <button
                        className="text-button"
                        onClick={() => onView("records")}
                    >
                        Ver registros
                        <ArrowRight size={16} />
                    </button>
                </div>
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Instalación</th>
                                <th>Consumo eléctrico</th>
                                <th>Intensidad</th>
                                <th>Emisiones estimadas</th>
                                <th>Estado</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {data.facilities.map((f) => (
                                <tr
                                    key={f.id}
                                    onClick={() => f.record && onOpen(f.record)}
                                    className={f.record ? "clickable" : ""}
                                >
                                    <td>
                                        <div className="facility-cell">
                                            <span className="facility-icon">
                                                <Building2 size={18} />
                                            </span>
                                            <div>
                                                <strong>{f.name}</strong>
                                                <small>{f.location}</small>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        {f.record
                                            ? `${number(f.record.electricity_kwh)} kWh`
                                            : "Sin registro"}
                                    </td>
                                    <td>
                                        {f.record
                                            ? `${number(f.record.intensity, 1)} kWh/t`
                                            : "—"}
                                    </td>
                                    <td>
                                        {f.record?.status === "approved"
                                            ? `${number(f.record.emissions_tonnes, 2)} tCO₂e`
                                            : "Pendiente de aprobación"}
                                    </td>
                                    <td>
                                        <Status status={f.record?.status} />
                                    </td>
                                    <td>
                                        {f.record && (
                                            <button
                                                className="icon-button"
                                                aria-label={`Ver ${f.name}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOpen(f.record);
                                                }}
                                            >
                                                <ChevronRight size={18} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
            <div className="bottom-grid">
                <section className="panel">
                    <div className="panel-heading">
                        <div>
                            <h2>Actividad reciente</h2>
                            <p>La historia detrás de cada dato</p>
                        </div>
                        <Clock3 size={18} />
                    </div>
                    <div className="activity-list">
                        {data.recent_events.map((e) => (
                            <button
                                key={e.id}
                                onClick={() => onOpen({ id: e.record_id })}
                            >
                                <span className="activity-icon">
                                    {e.action === "approve" ? (
                                        <CheckCheck size={17} />
                                    ) : (
                                        <FileText size={17} />
                                    )}
                                </span>
                                <span>
                                    <strong>{actions[e.action]}</strong>
                                    <small>
                                        {e.user} · Registro #{e.record_id}
                                    </small>
                                </span>
                                <ArrowUpRight size={15} />
                            </button>
                        ))}
                    </div>
                </section>
                <section className="knowledge-card">
                    <span className="eyebrow">MÁS ALLÁ DEL TOTAL</span>
                    <TrendingDown size={35} strokeWidth={1.5} />
                    <h2>
                        Consumir más no siempre significa ser menos eficiente.
                    </h2>
                    <p>
                        Compara el consumo absoluto con los kWh por tonelada
                        producida. Son preguntas distintas y ambas importan.
                    </p>
                    <button
                        className="text-button"
                        onClick={() => onView("methodology")}
                    >
                        Entender los indicadores
                        <ArrowRight size={16} />
                    </button>
                </section>
            </div>
        </>
    );
}

function Records({ records, review, onOpen, user, onNew }) {
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const relevant = records.filter((r) =>
        review ? ["submitted", "changes_requested"].includes(r.status) : true,
    );
    const filtered = relevant.filter(
        (r) =>
            (filter === "all" || r.status === filter) &&
            `${r.facility.name} ${r.period} ${r.evidence_ref}`
                .toLowerCase()
                .includes(search.toLowerCase()),
    );
    return (
        <section className="panel records-panel">
            <div className="panel-heading">
                <div>
                    <h2>
                        {review
                            ? "Bandeja de revisión"
                            : "Registro de consumos"}
                    </h2>
                    <p>
                        {review
                            ? "Todos los períodos · verifica la evidencia antes de aprobar"
                            : "Todos los períodos · un registro por instalación y mes"}
                    </p>
                </div>
                {!review && user.role === "operator" && (
                    <button className="button primary" onClick={() => onNew()}>
                        <Plus size={16} />
                        Nuevo registro
                    </button>
                )}
            </div>
            <div className="table-tools">
                <div className="search-field">
                    <Search size={17} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        aria-label="Buscar registros"
                        placeholder="Buscar instalación, período o referencia…"
                    />
                </div>
                <select
                    aria-label="Filtrar por estado"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                >
                    <option value="all">Todos los estados</option>
                    {Object.entries(statuses)
                        .filter(
                            ([k]) =>
                                k !== "missing" &&
                                (!review ||
                                    ["submitted", "changes_requested"].includes(
                                        k,
                                    )),
                        )
                        .map(([key, [label]]) => (
                            <option key={key} value={key}>
                                {label}
                            </option>
                        ))}
                </select>
            </div>
            <div className="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Instalación</th>
                            <th>Período</th>
                            <th>Consumo</th>
                            <th>Producción</th>
                            <th>Estado</th>
                            <th>Responsable</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((r) => (
                            <tr
                                className="clickable"
                                key={r.id}
                                onClick={() => onOpen(r)}
                            >
                                <td>
                                    <strong>{r.facility.name}</strong>
                                    <small className="cell-sub">
                                        {r.facility.code} · #{r.id}
                                    </small>
                                </td>
                                <td className="capitalize">
                                    {monthName(r.period)}
                                </td>
                                <td>{number(r.electricity_kwh)} kWh</td>
                                <td>{number(r.production_tonnes, 1)} t</td>
                                <td>
                                    <Status status={r.status} />
                                </td>
                                <td>{r.author.split(" · ")[0]}</td>
                                <td>
                                    <button
                                        className="icon-button"
                                        aria-label={`Abrir registro ${r.id}`}
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!filtered.length && (
                    <div className="empty-state">
                        <ClipboardCheck size={32} />
                        <h3>
                            {review
                                ? "No hay registros para revisar"
                                : "No encontramos registros"}
                        </h3>
                        <p>
                            {review
                                ? "Los registros enviados aparecerán aquí."
                                : "Prueba otro filtro o crea un nuevo registro."}
                        </p>
                    </div>
                )}
            </div>
            <div className="table-footer">
                {filtered.length} registros · Datos de demostración
                {review && user.role === "operator" && (
                    <span>
                        Tu rol puede enviar y corregir. La aprobación
                        corresponde al revisor.
                    </span>
                )}
            </div>
        </section>
    );
}

function Methodology({ meta }) {
    return (
        <div className="methodology-grid">
            <section className="panel method-main">
                <span className="eyebrow">METODOLOGÍA Y TRAZABILIDAD</span>
                <h2>Un resultado que puedes explicar.</h2>
                <p>
                    EcoRegistro estima las emisiones asociadas a electricidad
                    adquirida. Cada cálculo conserva el período, la evidencia de
                    consumo y la versión del factor utilizado.
                </p>
                <div className="formula">
                    <span>
                        Consumo eléctrico <small>kWh</small>
                    </span>
                    <b>×</b>
                    <span>
                        Factor de emisión <small>kgCO₂e / kWh</small>
                    </span>
                    <b>÷ 1.000 =</b>
                    <strong>
                        Emisiones<small>tCO₂e</small>
                    </strong>
                </div>
                <h3>Antes de interpretar el reporte</h3>
                <div className="method-rules">
                    <p>
                        <Check size={18} />
                        <span>
                            <strong>Solo datos aprobados.</strong> Los
                            borradores y registros pendientes no se incorporan a
                            los totales del dashboard ni al CSV.
                        </span>
                    </p>
                    <p>
                        <Check size={18} />
                        <span>
                            <strong>Una intensidad ponderada.</strong> Se divide
                            el consumo total por la producción total aprobada.
                            Si no hay producción, el indicador queda sin
                            definir.
                        </span>
                    </p>
                    <p>
                        <Check size={18} />
                        <span>
                            <strong>Los vacíos son visibles.</strong> Un mes
                            incompleto se marca como cobertura parcial. No se
                            interpreta como una reducción.
                        </span>
                    </p>
                    <p>
                        <Check size={18} />
                        <span>
                            <strong>El historial permanece.</strong> Una
                            aprobación conserva una copia del factor y bloquea
                            la edición de ese registro.
                        </span>
                    </p>
                </div>
                <h3>Ejemplo: volumen y eficiencia</h3>
                <div className="comparison">
                    <div>
                        <small>ENERO</small>
                        <strong>10.000 kWh</strong>
                        <span>100 t producidas → 100 kWh/t</span>
                    </div>
                    <ArrowRight size={24} />
                    <div>
                        <small>FEBRERO</small>
                        <strong>12.000 kWh</strong>
                        <span>150 t producidas → 80 kWh/t</span>
                    </div>
                </div>
                <p>
                    El consumo aumentó 20 %, mientras que la intensidad
                    disminuyó 20 %. Eso describe una mejora de eficiencia
                    observada; no demuestra por sí solo una reducción de
                    emisiones absolutas ni explica su causa.
                </p>
            </section>
            <aside>
                <section className="panel factor-card">
                    <span className="factor-icon">
                        <Layers3 size={24} />
                    </span>
                    <h2>Catálogo de factores</h2>
                    {meta.factors.map((f) => (
                        <div className="factor-item" key={f.id}>
                            <span className="badge amber">
                                {f.is_demo
                                    ? "Factor ficticio"
                                    : "Fuente documentada"}
                            </span>
                            <h3>{f.version}</h3>
                            <p>
                                {f.grid} · Año {f.year}
                            </p>
                            <strong>
                                {number(Number(f.kg_co2e_per_kwh), 4)}
                                <small>kgCO₂e / kWh</small>
                            </strong>
                            <p>{f.source_label}</p>
                        </div>
                    ))}
                </section>
                <div className="method-note">
                    <CircleHelp size={20} />
                    <p>
                        Este MVP utiliza datos y factores ficticios. No
                        cuantifica todos los alcances ni entrega
                        certificaciones. Antes de usar datos reales hay que
                        verificar límites, fuente y pertinencia del factor.
                    </p>
                    <a
                        href="https://huellachile.mma.gob.cl/recursos-material-de-apoyo/"
                        target="_blank"
                        rel="noreferrer"
                    >
                        Recursos de HuellaChile
                        <ArrowUpRight size={15} />
                    </a>
                </div>
            </aside>
        </div>
    );
}

function RecordForm({ record, meta, period, onSaved, onClose }) {
    const [values, setValues] = useState(
        record
            ? {
                  ...record,
                  electricity_kwh: String(record.electricity_kwh),
                  production_tonnes: String(record.production_tonnes),
                  notes: record.notes || "",
              }
            : {
                  facility_id: String(meta.facilities[0]?.id || ""),
                  period,
                  electricity_kwh: "",
                  production_tonnes: "",
                  evidence_ref: "",
                  notes: "",
                  emission_factor_id: "",
              },
    );
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const facility = meta.facilities.find(
        (f) => Number(f.id) === Number(values.facility_id),
    );
    const factors = meta.factors.filter(
        (f) =>
            f.year === Number(values.period.slice(0, 4)) &&
            f.grid === facility?.grid,
    );
    useEffect(() => {
        setValues((v) => ({
            ...v,
            emission_factor_id: String(
                factors.find((f) => f.id === Number(v.emission_factor_id))
                    ?.id ||
                    factors[0]?.id ||
                    "",
            ),
        }));
    }, [values.facility_id, values.period]);
    const field = (key) => ({
        value: values[key],
        onChange: (e) => setValues((v) => ({ ...v, [key]: e.target.value })),
    });
    async function save(e) {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const body = Object.fromEntries(
            [
                "facility_id",
                "period",
                "electricity_kwh",
                "production_tonnes",
                "emission_factor_id",
                "evidence_ref",
                "notes",
            ].map((k) => [k, values[k]]),
        );
        if (record) body.lock_version = record.lock_version;
        try {
            const result = await api(
                `/records${record ? `/${record.id}` : ""}`,
                { method: record ? "PUT" : "POST", body },
            );
            onSaved(
                result.record,
                "Registro guardado. Puedes enviarlo a revisión.",
            );
        } catch (e) {
            setError(e);
        } finally {
            setBusy(false);
        }
    }
    return (
        <form onSubmit={save}>
            <div className="modal-heading">
                <div>
                    <span className="eyebrow">CARGA DE INFORMACIÓN</span>
                    <h2>
                        {record ? "Editar registro" : "Nuevo registro mensual"}
                    </h2>
                    <p>
                        Conserva una referencia para revisar el origen del
                        consumo.
                    </p>
                </div>
                <button
                    type="button"
                    className="icon-button"
                    aria-label="Cerrar"
                    onClick={onClose}
                >
                    <X size={21} />
                </button>
            </div>
            <div className="modal-body">
                <ErrorBox error={error} />
                <div className="form-grid">
                    <label>
                        Instalación
                        <select required {...field("facility_id")}>
                            {meta.facilities.map((f) => (
                                <option value={f.id} key={f.id}>
                                    {f.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Período
                        <input type="month" required {...field("period")} />
                    </label>
                    <label>
                        Consumo eléctrico <small>kWh</small>
                        <input
                            type="number"
                            min="0"
                            max="100000000"
                            step="0.001"
                            required
                            placeholder="Ej. 12000"
                            {...field("electricity_kwh")}
                        />
                    </label>
                    <label>
                        Producción <small>toneladas</small>
                        <input
                            type="number"
                            min="0"
                            max="100000000"
                            step="0.001"
                            required
                            placeholder="Ej. 150"
                            {...field("production_tonnes")}
                        />
                    </label>
                    <label className="span-two">
                        Factor de emisión
                        <select required {...field("emission_factor_id")}>
                            {!factors.length && (
                                <option value="">
                                    No hay factor para ese año y sistema
                                    eléctrico
                                </option>
                            )}
                            {factors.map((f) => (
                                <option value={f.id} key={f.id}>
                                    {f.version} · {f.kg_co2e_per_kwh} kgCO₂e/kWh
                                    · {f.is_demo ? "FICTICIO" : f.source_label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="span-two">
                        Referencia de evidencia
                        <input
                            maxLength={200}
                            minLength={3}
                            required
                            placeholder="Ej. Factura ficticia PL-01-2026-06"
                            {...field("evidence_ref")}
                        />
                        <small>
                            Solo referencia textual en este MVP; no adjuntes
                            datos personales.
                        </small>
                    </label>
                    <label className="span-two">
                        Observaciones <small>Opcional</small>
                        <textarea
                            rows={3}
                            maxLength={2000}
                            placeholder="Contexto necesario para interpretar el dato…"
                            {...field("notes")}
                        />
                    </label>
                </div>
                <div className="info-note">
                    <ShieldCheck size={18} />
                    El registro se guardará como borrador. Los totales del
                    reporte usan únicamente registros aprobados.
                </div>
            </div>
            <div className="modal-footer">
                <button
                    type="button"
                    className="button secondary"
                    onClick={onClose}
                >
                    Cancelar
                </button>
                <button
                    className="button primary"
                    disabled={busy || !factors.length}
                >
                    {busy ? "Guardando…" : "Guardar registro"}
                    <Check size={16} />
                </button>
            </div>
        </form>
    );
}

function RecordDetail({ id, user, meta, onSaved, onClose }) {
    const [detail, setDetail] = useState(null);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const [editing, setEditing] = useState(false);
    const [note, setNote] = useState("");
    useEffect(() => {
        api(`/records/${id}`).then(setDetail).catch(setError);
    }, [id]);
    if (!detail)
        return (
            <>
                <div className="modal-heading">
                    <h2>Detalle del registro</h2>
                    <button
                        className="icon-button"
                        onClick={onClose}
                        aria-label="Cerrar"
                    >
                        <X />
                    </button>
                </div>
                <div className="modal-body">
                    {error ? <ErrorBox error={error} /> : <Spinner />}
                </div>
            </>
        );
    const r = detail.record;
    const canEdit =
        user.role === "operator" &&
        user.id === r.created_by &&
        ["draft", "changes_requested"].includes(r.status);
    const canReview = user.role === "reviewer" && r.status === "submitted";
    async function transition(action) {
        setBusy(true);
        setError(null);
        try {
            const result = await api(`/records/${id}/transition`, {
                method: "POST",
                body: {
                    action,
                    lock_version: r.lock_version,
                    review_note: note || null,
                },
            });
            onSaved(
                result.record,
                action === "approve"
                    ? "Registro aprobado e incorporado al reporte."
                    : action === "submit"
                      ? "Registro enviado a revisión."
                      : "Corrección solicitada.",
            );
        } catch (e) {
            setError(e);
        } finally {
            setBusy(false);
        }
    }
    if (editing)
        return (
            <RecordForm
                record={r}
                meta={meta}
                onSaved={onSaved}
                onClose={() => setEditing(false)}
            />
        );
    return (
        <>
            <div className="modal-heading">
                <div>
                    <span className="eyebrow">
                        REGISTRO #{r.id} · {r.facility.code}
                    </span>
                    <h2>{r.facility.name}</h2>
                    <p className="capitalize">
                        {monthName(r.period)} · {r.author}
                    </p>
                </div>
                <button
                    className="icon-button"
                    aria-label="Cerrar"
                    onClick={onClose}
                >
                    <X size={21} />
                </button>
            </div>
            <div className="modal-body">
                <ErrorBox error={error} />
                <div className="detail-status">
                    <Status status={r.status} />
                    <span>Versión del registro {r.lock_version}</span>
                </div>
                <div className="detail-metrics">
                    <div>
                        <small>Electricidad</small>
                        <strong>
                            {number(r.electricity_kwh)}
                            <span> kWh</span>
                        </strong>
                    </div>
                    <div>
                        <small>Producción</small>
                        <strong>
                            {number(r.production_tonnes, 1)}
                            <span> t</span>
                        </strong>
                    </div>
                    <div>
                        <small>Intensidad</small>
                        <strong>
                            {number(r.intensity, 1)}
                            <span> kWh/t</span>
                        </strong>
                    </div>
                </div>
                <div className="evidence-card">
                    <FileCheck2 size={21} />
                    <div>
                        <small>Referencia de evidencia</small>
                        <strong>{r.evidence_ref}</strong>
                        <p>{r.notes || "Sin observaciones adicionales."}</p>
                    </div>
                </div>
                <div className="factor-summary">
                    <span>
                        {r.status === "approved"
                            ? "Emisiones aprobadas"
                            : "Estimación preliminar"}
                    </span>
                    <strong>
                        {number(
                            r.status === "approved"
                                ? r.emissions_tonnes
                                : r.estimated_emissions_tonnes,
                            3,
                        )}{" "}
                        tCO₂e
                    </strong>
                    <small>
                        {r.factor.version} · {r.factor.kg_co2e_per_kwh}{" "}
                        kgCO₂e/kWh ·{" "}
                        {r.factor.is_demo
                            ? "FACTOR FICTICIO"
                            : r.factor.source_label}
                    </small>
                </div>
                {r.review_note && (
                    <div className="review-note">
                        <strong>Nota de revisión</strong>
                        <p>{r.review_note}</p>
                    </div>
                )}
                {canReview && (
                    <label className="review-input">
                        Comentario de revisión
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={2}
                            maxLength={1000}
                            placeholder="Para solicitar cambios, describe el problema (mín. 10 caracteres)."
                        />
                    </label>
                )}
                <h3 className="history-title">
                    <Clock3 size={17} />
                    Historial del registro
                </h3>
                <div className="history-list">
                    {detail.events.map((e) => (
                        <div key={e.id}>
                            <i />
                            <div>
                                <strong>{actions[e.action]}</strong>
                                <small>
                                    {e.user} ·{" "}
                                    {new Date(e.at).toLocaleString("es-CL")}
                                </small>
                                {e.action === "updated" && (
                                    <span>
                                        {[
                                            "electricity_kwh",
                                            "production_tonnes",
                                            "evidence_ref",
                                            "notes",
                                        ]
                                            .filter(
                                                (k) =>
                                                    String(e.before?.[k]) !==
                                                    String(e.after[k]),
                                            )
                                            .map(
                                                (k) =>
                                                    ({
                                                        electricity_kwh:
                                                            "Consumo",
                                                        production_tonnes:
                                                            "Producción",
                                                        evidence_ref:
                                                            "Evidencia",
                                                        notes: "Observaciones",
                                                    })[k],
                                            )
                                            .join(", ") ||
                                            "Datos del registro"}{" "}
                                        actualizados
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="modal-footer">
                <button className="button secondary" onClick={onClose}>
                    Cerrar
                </button>
                {canEdit && (
                    <>
                        <button
                            className="button secondary"
                            disabled={busy}
                            onClick={() => setEditing(true)}
                        >
                            Editar
                        </button>
                        <button
                            className="button primary"
                            disabled={busy}
                            onClick={() => transition("submit")}
                        >
                            Enviar a revisión
                            <ArrowRight size={16} />
                        </button>
                    </>
                )}
                {canReview && (
                    <>
                        <button
                            className="button secondary"
                            disabled={busy || note.trim().length < 10}
                            onClick={() => transition("request_changes")}
                        >
                            Solicitar corrección
                        </button>
                        <button
                            className="button primary"
                            disabled={busy}
                            onClick={() => transition("approve")}
                        >
                            <Check size={16} />
                            Aprobar registro
                        </button>
                    </>
                )}
            </div>
        </>
    );
}

function Modal({ children, onClose }) {
    useEffect(() => {
        const key = (e) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", key);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", key);
            document.body.style.overflow = "";
        };
    }, []);
    return (
        <div
            className="modal-backdrop"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <section
                className="modal"
                role="dialog"
                aria-modal="true"
                aria-label="Registro mensual"
            >
                {children}
            </section>
        </div>
    );
}

function Workspace({ user, onLogout, preference, appliedTheme, onCycleTheme }) {
    const [view, setView] = useState("overview");
    const [meta, setMeta] = useState(null);
    const [period, setPeriod] = useState("");
    const [data, setData] = useState(null);
    const [records, setRecords] = useState([]);
    const [error, setError] = useState(null);
    const [modal, setModal] = useState(null);
    const [toast, setToast] = useState("");
    const [revision, setRevision] = useState(0);
    const [mobile, setMobile] = useState(false);
    useEffect(() => {
        api("/meta")
            .then((m) => {
                setMeta(m);
                setPeriod(m.default_period);
            })
            .catch(setError);
    }, []);
    useEffect(() => {
        if (!period) return;
        let live = true;
        setError(null);
        Promise.all([api(`/dashboard?period=${period}`), api("/records")])
            .then(([d, r]) => {
                if (live) {
                    setData(d);
                    setRecords(r.records);
                }
            })
            .catch((e) => live && setError(e));
        return () => {
            live = false;
        };
    }, [period, revision]);
    useEffect(() => {
        if (!toast) return;
        const id = setTimeout(() => setToast(""), 4500);
        return () => clearTimeout(id);
    }, [toast]);
    const nav = [
        ["overview", LayoutDashboard, "Resumen"],
        ["records", FileText, "Registros"],
        ["review", ClipboardCheck, "Revisión"],
        ["facilities", Building2, "Instalaciones"],
        ["methodology", Layers3, "Metodología"],
    ];
    const titles = {
        overview: [
            "El pulso de tu operación",
            "Tu información ambiental, en un solo lugar.",
        ],
        records: [
            "Registros de consumo",
            "De la evidencia al dato que puedes utilizar.",
        ],
        review: [
            "Cada dato, una revisión",
            "Revisa, solicita correcciones y aprueba con respaldo.",
        ],
        facilities: [
            "Tus instalaciones",
            "Un mismo criterio, distintas operaciones.",
        ],
        methodology: [
            "El origen de cada resultado",
            "Fórmulas, factores y límites de la estimación.",
        ],
    };
    const navigate = (v) => {
        setView(v);
        setMobile(false);
    };
    function saved(r, message) {
        setRevision((v) => v + 1);
        setModal(null);
        setToast(message);
    }
    async function exportCsv() {
        try {
            const response = await fetch(`/api/export?period=${period}`, {
                headers: { Accept: "text/csv" },
            });
            if (!response.ok)
                throw new Error("No se pudo exportar. Revisa tu sesión.");
            const url = URL.createObjectURL(await response.blob());
            const a = document.createElement("a");
            a.href = url;
            a.download = `ecoregistro-${period}-aprobados.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            setError(e);
        }
    }
    async function logout() {
        try {
            await api("/logout", { method: "POST" });
            onLogout();
        } catch (e) {
            setError(e);
        }
    }
    return (
        <div className="app-shell">
            <aside className={`sidebar ${mobile ? "open" : ""}`}>
                <Brand onSurface />
                <div className="organization">
                    <span className="org-avatar">VB</span>
                    <div>
                        VerdeSur Alimentos
                        <small>Organización de demostración</small>
                    </div>
                </div>
                <span className="nav-label">ESPACIO DE TRABAJO</span>
                <nav>
                    {nav.map(([key, Icon, label]) => (
                        <button
                            key={key}
                            className={view === key ? "active" : ""}
                            onClick={() => navigate(key)}
                        >
                            <Icon size={19} />
                            <span>{label}</span>
                            {key === "review" &&
                                data?.metrics.pending_review > 0 && (
                                    <b>{data.metrics.pending_review}</b>
                                )}
                            {view === key && (
                                <span className="nav-active-dot" />
                            )}
                        </button>
                    ))}
                </nav>
                <div className="sidebar-bottom">
                    <div className="demo-note">
                        <Sprout size={20} />
                        <strong>Un espacio para aprender</strong>
                        <p>Datos sintéticos. Decisiones explicables.</p>
                        <span>DEMO · MVP 1.0</span>
                    </div>
                    <button
                        className="user-button"
                        onClick={logout}
                        title="Cerrar sesión"
                        aria-label="Cerrar sesión"
                    >
                        <span className="user-avatar">{user.name[0]}</span>
                        <div>
                            {user.name.split(" · ")[0]}
                            <small>
                                {user.role === "operator"
                                    ? "Operador"
                                    : "Revisor ambiental"}
                            </small>
                        </div>
                        <LogOut size={17} />
                    </button>
                </div>
            </aside>
            {mobile && (
                <div
                    className="mobile-shade"
                    onClick={() => setMobile(false)}
                />
            )}
            <main className="main">
                <header className="topbar">
                    <div className="breadcrumb">
                        <button
                            className="icon-button mobile-menu"
                            aria-label="Abrir menú"
                            onClick={() => setMobile(true)}
                        >
                            <Menu size={21} />
                        </button>
                        <span>Espacio de trabajo</span>
                        <ChevronRight size={14} />
                        <strong>{nav.find((n) => n[0] === view)?.[2]}</strong>
                    </div>
                    <div className="topbar-actions">
                        <ThemeToggle
                            preference={preference}
                            appliedTheme={appliedTheme}
                            onCycle={onCycleTheme}
                            compact
                        />
                        <span className="demo-chip">
                            <span />
                            Demostración
                        </span>
                    </div>
                </header>
                <div className="content">
                    <div className="page-heading">
                        <div>
                            <span className="eyebrow">
                                GESTIÓN AMBIENTAL, CON RESPALDO
                            </span>
                            <h1>{titles[view][0]}</h1>
                            <p>{titles[view][1]}</p>
                        </div>
                        <div className="page-actions">
                            {period && (
                                <label className="period-picker">
                                    <CalendarDays size={16} />
                                    <input
                                        type="month"
                                        aria-label="Período de análisis"
                                        value={period}
                                        onChange={(e) =>
                                            e.target.value &&
                                            setPeriod(e.target.value)
                                        }
                                    />
                                </label>
                            )}
                            <button
                                className="button secondary"
                                onClick={exportCsv}
                                disabled={!data}
                            >
                                <ArrowDownToLine size={16} />
                                Exportar CSV
                            </button>
                        </div>
                    </div>
                    <ErrorBox error={error} />
                    {error && (
                        <button
                            className="text-button"
                            onClick={() => {
                                if (!meta) window.location.reload();
                                else setRevision((v) => v + 1);
                            }}
                        >
                            Reintentar
                            <RefreshCw size={15} />
                        </button>
                    )}
                    {!data || !meta ? (
                        !error && <Spinner />
                    ) : (
                        <>
                            {view === "overview" && (
                                <Overview
                                    data={data}
                                    onView={navigate}
                                    onOpen={(r) => setModal({ id: r.id })}
                                    period={period}
                                />
                            )}
                            {["records", "review"].includes(view) && (
                                <Records
                                    records={records}
                                    review={view === "review"}
                                    user={user}
                                    onOpen={(r) => setModal({ id: r.id })}
                                    onNew={() => setModal({ new: true })}
                                />
                            )}
                            {view === "methodology" && (
                                <Methodology meta={meta} />
                            )}
                            {view === "facilities" && (
                                <div className="facility-grid">
                                    {data.facilities.map((f) => (
                                        <section
                                            className="panel facility-card"
                                            key={f.id}
                                        >
                                            <span className="large-facility-icon">
                                                <Building2 size={30} />
                                            </span>
                                            <span className="facility-code">
                                                {f.code}
                                            </span>
                                            <h2>{f.name}</h2>
                                            <p>{f.location}</p>
                                            <div className="facility-meta">
                                                <span>Sistema eléctrico</span>
                                                <strong>
                                                    {
                                                        meta.facilities.find(
                                                            (x) =>
                                                                x.id === f.id,
                                                        )?.grid
                                                    }
                                                </strong>
                                            </div>
                                            <div className="facility-meta">
                                                <span className="capitalize">
                                                    {monthName(period)}
                                                </span>
                                                <Status
                                                    status={f.record?.status}
                                                />
                                            </div>
                                            {f.record ? (
                                                <button
                                                    className="button subtle full"
                                                    onClick={() =>
                                                        setModal({
                                                            id: f.record.id,
                                                        })
                                                    }
                                                >
                                                    Ver registro del período
                                                    <ArrowRight size={16} />
                                                </button>
                                            ) : (
                                                user.role === "operator" && (
                                                    <button
                                                        className="button primary full"
                                                        onClick={() =>
                                                            setModal({
                                                                new: true,
                                                            })
                                                        }
                                                    >
                                                        Cargar información
                                                        <Plus size={16} />
                                                    </button>
                                                )
                                            )}
                                        </section>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                    <footer className="page-footer">
                        <span>
                            <Leaf size={14} />
                            EcoRegistro · Información que deja huella.
                        </span>
                        <span>Electricidad · Datos y factores ficticios</span>
                    </footer>
                </div>
            </main>
            {modal && meta && (
                <Modal onClose={() => setModal(null)}>
                    {modal.new ? (
                        <RecordForm
                            meta={meta}
                            period={period}
                            onSaved={saved}
                            onClose={() => setModal(null)}
                        />
                    ) : (
                        <RecordDetail
                            key={modal.id}
                            id={modal.id}
                            user={user}
                            meta={meta}
                            onSaved={saved}
                            onClose={() => setModal(null)}
                        />
                    )}
                </Modal>
            )}
            {toast && (
                <div className="toast" role="status">
                    <CheckCheck size={19} />
                    {toast}
                </div>
            )}
        </div>
    );
}

function App() {
    const { preference, appliedTheme, cycleTheme } = useTheme();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        api("/session")
            .then((d) => setUser(d.user))
            .catch(setError)
            .finally(() => setLoading(false));
    }, []);
    if (loading) return <Spinner />;
    if (error)
        return (
            <main className="startup-error">
                <Brand onSurface />
                <ErrorBox error={error} />
                <button
                    className="button primary"
                    onClick={() => window.location.reload()}
                >
                    Reintentar
                </button>
            </main>
        );
    return user ? (
        <Workspace
            user={user}
            onLogout={() => setUser(null)}
            preference={preference}
            appliedTheme={appliedTheme}
            onCycleTheme={cycleTheme}
        />
    ) : (
        <Login
            onLogin={setUser}
            preference={preference}
            appliedTheme={appliedTheme}
            onCycleTheme={cycleTheme}
        />
    );
}
createRoot(document.getElementById("root")).render(<App />);
