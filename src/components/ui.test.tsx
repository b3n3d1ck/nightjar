import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListChecks } from "lucide-react";
import {
  SeverityBadge,
  StatusBadge,
  Button,
  EmptyState,
  DemoTag,
  buttonClass,
} from "./ui";

describe("SeverityBadge", () => {
  it("labels the severity and renders an icon (not colour alone)", () => {
    const { container } = render(<SeverityBadge severity="critical" />);
    expect(screen.getByText("Critical")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});

describe("StatusBadge", () => {
  it("renders the human status label", () => {
    render(<StatusBadge status="remediated" />);
    expect(screen.getByText("Remediated")).toBeInTheDocument();
  });
});

describe("Button", () => {
  it("fires onClick and carries the btn class", async () => {
    const onClick = vi.fn();
    render(
      <Button variant="primary" onClick={onClick}>
        Go
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Go" });
    expect(btn.className).toContain("btn-primary");
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("buttonClass composes base + variant + size", () => {
    expect(buttonClass("secondary", "sm")).toContain("btn");
    expect(buttonClass("secondary", "sm")).toContain("btn-secondary");
    expect(buttonClass("secondary", "sm")).toContain("btn-sm");
  });
});

describe("EmptyState / DemoTag", () => {
  it("shows the empty-state title", () => {
    render(<EmptyState icon={ListChecks} title="No findings match" />);
    expect(screen.getByText("No findings match")).toBeInTheDocument();
  });

  it("marks demo data", () => {
    render(<DemoTag />);
    expect(screen.getByText("Demo")).toBeInTheDocument();
  });
});
