// @vitest-environment jsdom
import React from "react";
import { afterEach, it, expect, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { AuditView, WidgetView } from "../src/ui/views.js";
import { buildReport, defaultRates } from "../src/domain.js";
import { row } from "./fixtures.js";
// Node 26 exposes an unavailable localStorage getter; supply browser-like storage in jsdom.
const stored = new Map<string, string>();
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
    clear: () => stored.clear(),
  },
});
afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
const report = () =>
  buildReport(
    [
      row(),
      row({
        id: "2",
        issueId: "other",
        identifier: "TOK-2",
        title: "Investigate incident",
        model: "unknown",
      }),
    ],
    defaultRates,
    "2026-10-01",
    "2026-10-08",
    1,
  );
it("renders partial estimates and missing run coverage explicitly", () => {
  render(<AuditView report={report()} taskHref={(id) => `/issues/${id}`} />);
  expect(screen.getByRole("status").textContent).toContain("unknown, not zero");
  expect(screen.getByText("Unpriced")).toBeTruthy();
});
it("filters, opens record details, links the task and exports the full audit", () => {
  const data = report(),
    exporter = vi.fn();
  render(
    <AuditView
      report={data}
      taskHref={(id) => `/issues/${id}`}
      onExport={exporter}
    />,
  );
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "TOK-1" },
  });
  expect(screen.queryByText("Investigate incident")).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: /Build a useful plugin/ }),
  );
  expect(
    screen.getByRole("region", { name: "Usage record details" }),
  ).toBeTruthy();
  expect(
    screen.getByRole("link", { name: /Open task/ }).getAttribute("href"),
  ).toBe("/issues/22222222-2222-4222-8222-222222222222");
  fireEvent.click(screen.getByRole("button", { name: /Export full/ }));
  expect(exporter).toHaveBeenCalledWith(data);
});
it("compares a monthly fee with usage so far without claiming savings", () => {
  const data = buildReport([row()], defaultRates, "2026-10-01", "2026-10-08");
  render(<AuditView report={data} taskHref={(id) => id} />);
  fireEvent.change(screen.getByLabelText("GPT / OpenAI monthly cost (USD)"), {
    target: { value: "200" },
  });
  expect(screen.getByText("$197.35")).toBeTruthy();
  expect(screen.getByText(/month is still in progress/)).toBeTruthy();
  expect(
    screen.queryByLabelText("Other system cost (USD, optional)"),
  ).toBeNull();
});
it("withholds a monthly verdict for incomplete coverage", () => {
  render(<AuditView report={report()} taskHref={(id) => id} />);
  fireEvent.change(screen.getByLabelText("GPT / OpenAI monthly cost (USD)"), {
    target: { value: "200" },
  });
  expect(screen.getByText(/prevent a full comparison/)).toBeTruthy();
});
it("renders empty and error widget states without fabricated totals", () => {
  const retry = vi.fn();
  render(
    <WidgetView
      report={null}
      loading={false}
      error="Database unavailable"
      href="/token-clip"
      onRetry={retry}
    />,
  );
  expect(screen.getByRole("alert").textContent).toContain(
    "Database unavailable",
  );
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(retry).toHaveBeenCalled();
  expect(screen.queryByText("$0.00")).toBeNull();
});
it("paginates task groups and resets the page after filtering", () => {
  const rows = Array.from({ length: 28 }, (_, i) =>
    row({
      id: String(i),
      issueId: String(i),
      identifier: `TOK-${i}`,
      title: `Task number ${i}`,
    }),
  );
  render(
    <AuditView
      report={buildReport(rows, defaultRates, "2026-10-08", "2026-10-08")}
      taskHref={(id) => id}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByText("2 / 2")).toBeTruthy();
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "TOK-27" },
  });
  expect(screen.getByText("1 / 1")).toBeTruthy();
});

it("shows five provider slots and remembers fees by company and month", () => {
  const data = buildReport([row()], defaultRates, "2026-10-01", "2026-10-08");
  const view = render(
    <AuditView report={data} taskHref={(id) => id} companyId="company-a" />,
  );
  expect(screen.getAllByRole("spinbutton")).toHaveLength(5);
  fireEvent.change(screen.getByLabelText("GPT / OpenAI monthly cost (USD)"), {
    target: { value: "200" },
  });
  expect(
    screen.getByRole("columnheader", { name: "Allocated subscription" }),
  ).toBeTruthy();
  view.unmount();
  render(
    <AuditView report={data} taskHref={(id) => id} companyId="company-a" />,
  );
  expect(
    (
      screen.getByLabelText(
        "GPT / OpenAI monthly cost (USD)",
      ) as HTMLInputElement
    ).value,
  ).toBe("200");
  cleanup();
  render(
    <AuditView report={data} taskHref={(id) => id} companyId="company-b" />,
  );
  expect(
    (
      screen.getByLabelText(
        "GPT / OpenAI monthly cost (USD)",
      ) as HTMLInputElement
    ).value,
  ).toBe("");
  cleanup();
  render(
    <AuditView
      report={{ ...data, from: "2026-09-01", to: "2026-09-30" }}
      taskHref={(id) => id}
      companyId="company-a"
    />,
  );
  expect(
    (
      screen.getByLabelText(
        "GPT / OpenAI monthly cost (USD)",
      ) as HTMLInputElement
    ).value,
  ).toBe("");
});
