import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import { CloakProvider } from '@/context/CloakContext'
import { OllamaProvider } from '@/context/OllamaContext'
import { NerModelProvider } from '@/context/NerModelContext'
import UploadPage from '@/pages/UploadPage'
import VerifyPage from '@/pages/VerifyPage'
import { VERIFY_DESCRIPTION, VERIFY_TITLE } from '@/pages/VerifyPage/content'
import PrivacyPage from '@/pages/PrivacyPage'
import { PRIVACY_DESCRIPTION, PRIVACY_TITLE } from '@/pages/PrivacyPage/content'

const SITE = 'https://cloakdoc.app'

type PageMeta = { title: string; description: string; page: React.ReactNode }

// Per-page tags. Shared tags (image, card type, icons, structured data) stay in index.html.
const PAGES: Record<string, PageMeta> = {
  '/': {
    title: 'Cloak | Redact PDFs Privately in Your Browser',
    description:
      'Redact names, emails, phone numbers and other personal info from PDFs right in your browser. Free, no uploads, no sign-up. Your files never leave your device.',
    page: <UploadPage />,
  },
  '/verify': {
    title: VERIFY_TITLE,
    description: VERIFY_DESCRIPTION,
    page: <VerifyPage />,
  },
  '/privacy': {
    title: PRIVACY_TITLE,
    description: PRIVACY_DESCRIPTION,
    page: <PrivacyPage />,
  },
}

export async function prerender({ url }: { url: string }) {
  const path = url.replace(/\/$/, '') || '/'
  const { title, description, page } = PAGES[path] ?? PAGES['/']
  const canonical = `${SITE}${path === '/' ? '/' : path}`

  const html = renderToString(
    <ThemeProvider>
      <OllamaProvider>
        <NerModelProvider>
          <StaticRouter location={path}>
            <CloakProvider>{page}</CloakProvider>
          </StaticRouter>
        </NerModelProvider>
      </OllamaProvider>
    </ThemeProvider>
  )

  return {
    html,
    links: new Set(Object.keys(PAGES)),
    head: {
      title,
      elements: new Set([
        { type: 'meta', props: { name: 'description', content: description } },
        { type: 'link', props: { rel: 'canonical', href: canonical } },
        { type: 'meta', props: { property: 'og:url', content: canonical } },
        { type: 'meta', props: { property: 'og:title', content: title } },
        { type: 'meta', props: { property: 'og:description', content: description } },
        { type: 'meta', props: { name: 'twitter:title', content: title } },
        { type: 'meta', props: { name: 'twitter:description', content: description } },
      ]),
    },
  }
}
