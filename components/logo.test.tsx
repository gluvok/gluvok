import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Logo, LogoHorizontal, LogoVertical } from "./logo";

describe("Logo Components", () => {
  it("renders Logo with defined width and does not have hidden class", () => {
    const { getByAltText } = render(<Logo size={32} className="test-logo" />);
    const img = getByAltText("Gluvok logo");

    expect(img).toBeDefined();
    expect(img.getAttribute("width")).toBe("32");
    expect(img.className).not.toContain("hidden");
    expect(img.className).toContain("test-logo");
  });

  it("renders LogoHorizontal with static import and width", () => {
    const { getByAltText } = render(<LogoHorizontal size={64} />);
    const img = getByAltText("Gluvok logo");

    expect(img).toBeDefined();
    expect(img.getAttribute("width")).toBe("64");
    expect(img.className).not.toContain("hidden");
    expect(img.className).toContain("object-contain");
  });

  it("renders LogoVertical with static import and width", () => {
    const { getByAltText } = render(<LogoVertical size={100} />);
    const img = getByAltText("Gluvok logo");

    expect(img).toBeDefined();
    expect(img.getAttribute("width")).toBe("100");
    expect(img.className).not.toContain("hidden");
    expect(img.className).toContain("object-contain");
  });

  it("supports custom style and class overrides", () => {
    const { getByAltText } = render(
      <LogoHorizontal size={80} className="custom-class" style={{ opacity: 0.8 }} />,
    );
    const img = getByAltText("Gluvok logo");

    expect(img.className).toContain("custom-class");
    expect(img.getAttribute("width")).toBe("80");
  });
});
