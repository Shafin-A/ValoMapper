"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0c0a09",
          color: "#fafafa",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 380, textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              color: "#ef4444",
              fontSize: 12,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            Something went wrong
          </p>
          <h1 style={{ margin: "8px 0 0", fontSize: 24 }}>
            Unexpected error
          </h1>
          <p style={{ margin: "8px 0 0", color: "#a1a1aa", fontSize: 14 }}>
            Try again, or reload the page.
          </p>
          {error.digest && (
            <p
              style={{
                margin: "8px 0 0",
                color: "#71717a",
                fontSize: 11,
                fontFamily: "ui-monospace, monospace",
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={() => reset()}
            style={{
              marginTop: 24,
              width: "100%",
              padding: "10px 16px",
              borderRadius: 6,
              border: "none",
              background: "#4d7c0f",
              color: "#f7fee7",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
