import { LINKS } from '@/lib/links'

export const PRIVACY_TITLE = 'Privacy Policy | Cloak'
export const PRIVACY_DESCRIPTION =
  'Cloak processes your PDFs entirely in your browser. No uploads, no accounts, no analytics and no tracking cookies. Read exactly what is and isn\'t handled.'
export const PRIVACY_UPDATED = 'November 21, 2026'

export const PRIVACY_EMAIL = 'privacy@cloakdoc.app'

export const PRIVACY_LINKS = {
  cloudflare: 'https://www.cloudflare.com/privacypolicy/',
  jsdelivr: 'https://www.jsdelivr.com/terms/privacy-policy-jsdelivr-net',
  github: 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement',
  issues: `${LINKS.repo}/issues`,
  security: `${LINKS.repo}/security/policy`,
  history: `${LINKS.repo}/commits/master/src/pages/PrivacyPage`,
  repo: LINKS.repo,
  verify: LINKS.verify,
}
