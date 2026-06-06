import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MobileBottomNav } from "./MobileBottomNav";

describe("MobileBottomNav", () => {
  it("renders Home and Notifications links", () => {
    render(<MobileBottomNav inGroup={false} />);
    expect(screen.getByRole("link", { name: /home/i })).toHaveAttribute(
      "href",
      "/app",
    );
    expect(
      screen.getByRole("link", { name: /notifications/i }),
    ).toHaveAttribute("href", "/app/notifications");
  });
  it("shows a Group link only when the user is in a group", () => {
    const { rerender } = render(<MobileBottomNav inGroup={false} />);
    expect(screen.queryByRole("link", { name: /group/i })).toBeNull();
    rerender(<MobileBottomNav inGroup={true} />);
    expect(screen.getByRole("link", { name: /group/i })).toHaveAttribute(
      "href",
      "/app/group",
    );
  });
});
