export default function Loading() {
  return (
    <div className="container max-w-4xl py-8 space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="h-9 bg-gradient-to-r from-muted via-muted/60 to-muted rounded-md w-64 animate-pulse" />
          <div className="h-5 bg-gradient-to-r from-muted/70 via-muted/40 to-muted/70 rounded-md w-96 animate-pulse" />
        </div>
        <div className="h-10 bg-gradient-to-r from-muted via-muted/60 to-muted rounded-md w-[140px] animate-pulse" />
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {[180, 120, 140, 160].map((width, i) => (
          <div
            key={i}
            className="h-10 bg-gradient-to-r from-muted via-muted/60 to-muted rounded-full animate-pulse"
            style={{
              width: `${width}px`,
              animationDelay: `${i * 75}ms`,
            }}
          />
        ))}
      </div>

      <div className="rounded-lg border bg-card overflow-hidden shadow-sm">
        <div className="p-6 space-y-2 border-b bg-muted/20">
          <div className="h-7 bg-gradient-to-r from-muted via-muted/60 to-muted rounded-md w-64 animate-pulse" />
          <div className="h-4 bg-gradient-to-r from-muted/70 via-muted/40 to-muted/70 rounded-md w-80 animate-pulse" />
        </div>

        <div className="p-6 space-y-6">
          {Array.from({ length: 7 }).map((_, dayIndex) => (
            <div
              key={dayIndex}
              className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg border bg-card/50"
              style={{ animationDelay: `${dayIndex * 50}ms` }}
            >
              <div className="w-32 flex items-center gap-2">
                <div className="h-6 w-11 bg-gradient-to-r from-muted via-muted/60 to-muted rounded-full animate-pulse" />
                <div
                  className="h-5 bg-gradient-to-r from-muted via-muted/60 to-muted rounded-md animate-pulse"
                  style={{ width: dayIndex === 2 ? "80px" : "70px" }}
                />
              </div>

              <div className="flex-1 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-[100px] bg-gradient-to-r from-muted via-muted/60 to-muted rounded-md animate-pulse" />
                  <div className="h-4 w-3 bg-muted/60 rounded animate-pulse" />
                  <div className="h-10 w-[100px] bg-gradient-to-r from-muted via-muted/60 to-muted rounded-md animate-pulse" />
                </div>

                <div className="ml-auto h-9 w-9 bg-gradient-to-r from-muted via-muted/60 to-muted rounded-md animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 text-muted-foreground/60">
        <div
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <div
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <div
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}
