/**
 * Utility functions for working with Clearbit logo API
 */

// Cache for logo URLs to avoid unnecessary requests
interface LogoCache {
  [key: string]: {
    url: string
    exists: boolean
  }
}

// In-memory cache
const logoCache: LogoCache = {}

/**
 * Common top-level domains to try when extracting domains
 */
const COMMON_TLDS = ["com", "net", "org", "io", "app", "dev", "edu", "gov"]

/**
 * Extracts a domain from an authenticator name
 */
export function extractDomain(name: string): string[] {
  // Clean and normalize the name
  const cleanName = name.toLowerCase().trim()
  const domains: string[] = []

  // Check if the name already contains a domain with a TLD
  const domainRegex = /\b([a-z0-9-]+)\.([a-z]{2,})\b/
  const domainMatch = cleanName.match(domainRegex)

  if (domainMatch) {
    // Return the full domain if it exists in the name
    domains.push(domainMatch[0])
    return domains
  }

  // Extract the main part of the name (first word or whole name)
  const words = cleanName.split(/[\s_-]+/)

  // Try the first word if it's meaningful (longer than 2 chars)
  const firstWord = words[0]
  if (firstWord && firstWord.length > 2) {
    // Generate possible domains with common TLDs
    COMMON_TLDS.forEach((tld) => {
      domains.push(`${firstWord}.${tld}`)
    })
  }

  // If the name has multiple words, try the full name without spaces
  if (words.length > 1) {
    const combined = words.join("")
    if (combined.length > 2) {
      COMMON_TLDS.forEach((tld) => {
        domains.push(`${combined}.${tld}`)
      })
    }
  }

  // If the first word is short but there are other words, try the second word
  if (firstWord.length <= 2 && words.length > 1) {
    const secondWord = words[1]
    if (secondWord && secondWord.length > 2) {
      COMMON_TLDS.forEach((tld) => {
        domains.push(`${secondWord}.${tld}`)
      })
    }
  }

  // For very specific services, add their known domains
  if (cleanName.includes("google")) {
    domains.unshift("google.com")
  }
  if (cleanName.includes("github")) {
    domains.unshift("github.com")
  }
  if (cleanName.includes("facebook")) {
    domains.unshift("facebook.com")
  }
  if (cleanName.includes("amazon")) {
    domains.unshift("amazon.com")
  }
  if (cleanName.includes("apple")) {
    domains.unshift("apple.com")
  }
  if (cleanName.includes("microsoft")) {
    domains.unshift("microsoft.com")
  }
  if (cleanName.includes("twitter") || cleanName.includes("x ")) {
    domains.unshift("twitter.com")
  }

  return domains
}

/**
 * Checks if a logo URL exists
 */
export function checkLogoUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = url
  })
}

/**
 * Gets a logo URL for an authenticator name
 * Returns null if no logo is found
 */
export function getLogoUrl(name: string): string | null {
  // Generate the domain based on the name
  const possibleDomains = extractDomain(name)

  // Use the first domain, which is our best guess
  if (possibleDomains.length > 0) {
    const domain = possibleDomains[0]

    // Check cache
    if (logoCache[domain]) {
      return logoCache[domain].exists ? logoCache[domain].url : null
    }

    // Create the logo URL
    const logoUrl = `https://logo.clearbit.com/${domain}`

    // Store in cache (assume it exists for now)
    logoCache[domain] = { url: logoUrl, exists: true }

    // Return the URL - the component will handle errors
    return logoUrl
  }

  return null
}

/**
 * Updates the cache with information about whether a logo exists
 */
export function updateLogoCache(domain: string, exists: boolean): void {
  const logoUrl = `https://logo.clearbit.com/${domain}`
  logoCache[domain] = { url: logoUrl, exists }
}
