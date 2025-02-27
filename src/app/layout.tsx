export const metadata = {
  title: 'Chatbot Vendor Detector',
  description: 'Identify chatbot vendors on a given webpage using advanced detection algorithms.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
