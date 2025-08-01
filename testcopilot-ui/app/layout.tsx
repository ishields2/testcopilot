export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body style={{ margin: 0, background: '#f9f9f9' }}>{children}</body>
        </html>
    );
}
