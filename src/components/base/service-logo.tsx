"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { getLogoUrl, updateLogoCache, extractDomain } from "@/lib/logo-utils";

// Cache to store logo states
const logoStateCache: Record<string, { url: string | null; hasError: boolean }> = {};

interface ServiceLogoProps {
  name: string;
  size?: number;
}

export default function ServiceLogo({ name, size = 32 }: ServiceLogoProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    // Check cache first
    if (logoStateCache[name]) {
      setLogoUrl(logoStateCache[name].url);
      setHasError(logoStateCache[name].hasError);
      setIsLoading(false);
      return;
    }

    // Get the logo URL for this service name
    const url = getLogoUrl(name);
    setLogoUrl(url);

    // Reset states when name changes and not in cache
    setIsLoading(!!url);
    setHasError(false);
  }, [name]);

  const handleImageLoad = () => {
    setIsLoading(false);
    // Cache successful load
    logoStateCache[name] = { url: logoUrl, hasError: false };

    // Update cache that this image exists
    if (logoUrl) {
      const domains = extractDomain(name);
      if (domains.length > 0) {
        updateLogoCache(domains[0], true);
      }
    }
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
    // Cache error state
    logoStateCache[name] = { url: logoUrl, hasError: true };

    // Update cache that this image doesn't exist
    if (logoUrl) {
      const domains = extractDomain(name);
      if (domains.length > 0) {
        updateLogoCache(domains[0], false);
      }
    }
  };

  // Show fallback (first letter of service name)
  if (!logoUrl || hasError) {
    return (
      <div
        className="flex items-center justify-center bg-primary/10 rounded-md flex-shrink-0"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <span className="text-primary font-semibold text-sm">
          {name.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-md">
          <Loader2
            size={size / 2}
            className="animate-spin text-muted-foreground"
          />
        </div>
      )}
      <img
        src={logoUrl || ""}
        alt={`${name} logo`}
        width={size}
        height={size}
        className={`w-full h-full object-contain rounded-md ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
    </div>
  );
}
