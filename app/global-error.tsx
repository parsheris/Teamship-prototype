"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f1ea",
          color: "#303943",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <main>
          <h1 style={{ fontSize: "1.15rem", fontWeight: 500 }}>Something went wrong</h1>
          <p style={{ marginTop: 8, fontSize: "0.875rem", opacity: 0.55 }}>
            The kiosk hit an unexpected error.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              height: 44,
              borderRadius: 8,
              border: 0,
              background: "#303943",
              color: "#ffffff",
              padding: "0 24px",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
