import './globals.css'
import { AuthProvider } from '../contexts/AuthContext'

export const metadata = {
  title: 'AI Document Assistant',
  description: 'Chat with your documents using AI',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}