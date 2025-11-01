import './globals.css'

export const metadata = {
  title: 'Board Game Selector',
  description: 'Spin the wheel to decide what board game to play!',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
