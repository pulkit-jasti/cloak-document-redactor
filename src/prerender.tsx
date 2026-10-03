import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import { CloakProvider } from '@/context/CloakContext'
import { OllamaProvider } from '@/context/OllamaContext'
import { NerModelProvider } from '@/context/NerModelContext'
import UploadPage from '@/pages/UploadPage'
import Navbar from '@/components/Navbar'

export async function prerender() {
  const html = renderToString(
    <ThemeProvider>
      <OllamaProvider>
        <NerModelProvider>
          <StaticRouter location="/">
            <CloakProvider>
              <Navbar />
              <UploadPage />
            </CloakProvider>
          </StaticRouter>
        </NerModelProvider>
      </OllamaProvider>
    </ThemeProvider>
  )

  return { html }
}
