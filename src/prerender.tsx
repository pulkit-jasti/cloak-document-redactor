import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import { CloakProvider } from '@/context/CloakContext'
import UploadPage from '@/pages/UploadPage'
import Navbar from '@/components/Navbar'

export async function prerender() {
  const html = renderToString(
    <ThemeProvider>
      <StaticRouter location="/">
        <CloakProvider>
          <Navbar />
          <UploadPage />
        </CloakProvider>
      </StaticRouter>
    </ThemeProvider>
  )

  return { html }
}
