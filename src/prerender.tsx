import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import { CloakProvider } from '@/context/CloakContext'
import { OllamaProvider } from '@/context/OllamaContext'
import UploadPage from '@/pages/UploadPage'
import Navbar from '@/components/Navbar'

export async function prerender() {
  const html = renderToString(
    <ThemeProvider>
      <OllamaProvider>
        <StaticRouter location="/">
          <CloakProvider>
            <Navbar />
            <UploadPage />
          </CloakProvider>
        </StaticRouter>
      </OllamaProvider>
    </ThemeProvider>
  )

  return { html }
}
