import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { CommandPalette, OPEN_PALETTE_EVENT } from "./command-palette";

function openPalette() {
  act(() => {
    window.dispatchEvent(new Event(OPEN_PALETTE_EVENT));
  });
}

describe("CommandPalette", () => {
  beforeEach(() => push.mockClear());

  it("is closed until opened", () => {
    render(<CommandPalette />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens on the open event and shows pages and findings", () => {
    render(<CommandPalette />);
    openPalette();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Pages")).toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(
      screen.getByText("Exposed .env file readable over HTTP"),
    ).toBeInTheDocument();
  });

  it("filters results as you type", async () => {
    render(<CommandPalette />);
    openPalette();
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "env");
    expect(
      screen.getByText("Exposed .env file readable over HTTP"),
    ).toBeInTheDocument();
    // a non-matching finding should be filtered out
    expect(
      screen.queryByText("Content-Security-Policy header absent"),
    ).not.toBeInTheDocument();
  });

  it("navigates with the router when a result is chosen", async () => {
    render(<CommandPalette />);
    openPalette();
    await userEvent.type(screen.getByRole("textbox"), "overview");
    await userEvent.keyboard("{Enter}");
    expect(push).toHaveBeenCalledWith("/dashboard");
  });
});
