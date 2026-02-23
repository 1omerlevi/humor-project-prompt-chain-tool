import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'

export const metadata = {
  title: 'Prompt Chain Tool',
  description: 'Manage humor flavors and prompt-chain steps',
}

function ThemeBootScript() {
  const code = `(() => { try { const mode = localStorage.getItem('pct_theme_mode') || 'system'; const root = document.documentElement; if (mode === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', mode); } catch {} })();`
  return <script dangerouslySetInnerHTML={{ __html: code }} />
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeBootScript />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
