import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useQuery } from "wasp/client/operations";
import { BrandingProvider, useBranding, BrandedLogo } from "./BrandingContext";

const mockUseQuery = useQuery as ReturnType<typeof vi.fn>;

// Helper component that displays branding values for testing
function BrandingDisplay() {
  const branding = useBranding();
  return (
    <div>
      <span data-testid="app-name">{branding.appName}</span>
      <span data-testid="domain">{branding.domain}</span>
      <span data-testid="tagline">{branding.tagline}</span>
      <span data-testid="logo-url">{branding.logoUrl || "none"}</span>
      <span data-testid="primary-color">{branding.primaryColor}</span>
    </div>
  );
}

describe("BrandingContext", () => {
  describe("defaults (no data loaded)", () => {
    it("provides default values when query has no data", () => {
      mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });

      render(
        <BrandingProvider>
          <BrandingDisplay />
        </BrandingProvider>
      );

      expect(screen.getByTestId("app-name")).toHaveTextContent("mAutomate");
      expect(screen.getByTestId("domain")).toHaveTextContent("mautomate.ai");
      expect(screen.getByTestId("tagline")).toHaveTextContent("Marketing OS");
      expect(screen.getByTestId("primary-color")).toHaveTextContent("#bd711d");
    });
  });

  describe("with branding data", () => {
    it("maps server settings to branding config", () => {
      mockUseQuery.mockReturnValue({
        data: {
          "branding.app_name": "GenDonkey",
          "branding.domain": "gendonkey.com",
          "branding.tagline": "AI Donkey",
          "branding.primary_color": "#ff0000",
          "branding.logo_url": "https://cdn.example.com/logo.png",
        },
        isLoading: false,
      });

      render(
        <BrandingProvider>
          <BrandingDisplay />
        </BrandingProvider>
      );

      expect(screen.getByTestId("app-name")).toHaveTextContent("GenDonkey");
      expect(screen.getByTestId("domain")).toHaveTextContent("gendonkey.com");
      expect(screen.getByTestId("tagline")).toHaveTextContent("AI Donkey");
      expect(screen.getByTestId("primary-color")).toHaveTextContent("#ff0000");
      expect(screen.getByTestId("logo-url")).toHaveTextContent("https://cdn.example.com/logo.png");
    });

    it("uses direct signed URL from server (no redirect needed)", () => {
      mockUseQuery.mockReturnValue({
        data: {
          "branding.logo_s3key": "user/logo.png",
          "branding.logo_url": "https://s3.signed.url/logo.png",
        },
        isLoading: false,
      });

      render(
        <BrandingProvider>
          <BrandingDisplay />
        </BrandingProvider>
      );

      // Should use the direct URL, not /api/branding/logo
      expect(screen.getByTestId("logo-url")).toHaveTextContent("https://s3.signed.url/logo.png");
    });

    it("shows empty logo URL when no s3key and no url", () => {
      mockUseQuery.mockReturnValue({
        data: {
          "branding.logo_s3key": "",
          "branding.logo_url": "",
        },
        isLoading: false,
      });

      render(
        <BrandingProvider>
          <BrandingDisplay />
        </BrandingProvider>
      );

      expect(screen.getByTestId("logo-url")).toHaveTextContent("none");
    });
  });
});

describe("BrandedLogo", () => {
  it("renders logo image when URL exists", () => {
    mockUseQuery.mockReturnValue({
      data: {
        "branding.app_name": "GenDonkey",
        "branding.logo_url": "https://cdn.example.com/logo.png",
      },
      isLoading: false,
    });

    render(
      <BrandingProvider>
        <BrandedLogo className="h-8" />
      </BrandingProvider>
    );

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://cdn.example.com/logo.png");
    expect(img).toHaveAttribute("alt", "GenDonkey");
  });

  it("renders nothing when no logo URL and no fallback", () => {
    mockUseQuery.mockReturnValue({
      data: { "branding.logo_url": "" },
      isLoading: false,
    });

    const { container } = render(
      <BrandingProvider>
        <BrandedLogo />
      </BrandingProvider>
    );

    expect(container.querySelector("img")).toBeNull();
  });

  it("uses fallback when no branding logo", () => {
    mockUseQuery.mockReturnValue({
      data: { "branding.logo_url": "" },
      isLoading: false,
    });

    render(
      <BrandingProvider>
        <BrandedLogo fallbackSrc="/static/default-logo.png" />
      </BrandingProvider>
    );

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "/static/default-logo.png");
  });
});
