type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
}

class Logger {
  private log(level: LogLevel, message: string, context?: Record<string, any>) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    if (process.env.NODE_ENV === "production" && level === "debug") {
      return;
    }

    // In a real production app, you would send this to a service like Sentry or Datadog
    // For now, we print to stdout/stderr with structure
    const output = JSON.stringify(entry);

    switch (level) {
      case "error":
        console.error(output);
        break;
      case "warn":
        console.warn(output);
        break;
      case "info":
      case "debug":
        console.log(output);
        break;
    }
  }

  info(message: string, context?: Record<string, any>) {
    this.log("info", message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log("warn", message, context);
  }

  error(message: string, context?: Record<string, any>) {
    this.log("error", message, context);
  }

  debug(message: string, context?: Record<string, any>) {
    this.log("debug", message, context);
  }
}

export const logger = new Logger();
