import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import Navbar from '../components/Navbar'
import { LanguageProvider } from '../contexts/LanguageContext'

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const hideNavbar = router.pathname === '/recruiter'

  return (
    <LanguageProvider>
      {!hideNavbar && <Navbar />}
      <Component {...pageProps} />
    </LanguageProvider>
  )
}
