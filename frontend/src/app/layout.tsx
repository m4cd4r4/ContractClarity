import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ContractClarity | M&A Due Diligence',
  description: 'AI-powered contract analysis for M&A due diligence',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
