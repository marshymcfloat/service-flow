type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

const trackers = new Map<string, { count: number; expiresAt: number }>();

export function rateLimit(
  ip: string,
  config: RateLimitConfig = { windowMs: 60 * 1000, maxRequests: 100 },
) {
  const now = Date.now();
  const tracker = trackers.get(ip) || {
    count: 0,
    expiresAt: now + config.windowMs,
  };

  if (now > tracker.expiresAt) {
    tracker.count = 1;
    tracker.expiresAt = now + config.windowMs;
  } else {
    tracker.count++;
  }

  trackers.set(ip, tracker);

  // Periodic cleanup (simple optimization)
  if (Math.random() < 0.01) {
    cleanup(now);
  }

  return {
    success: tracker.count <= config.maxRequests,
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - tracker.count),
    reset: tracker.expiresAt,
  };
}

function cleanup(now: number) {
  for (const [key, value] of trackers.entries()) {
    if (now > value.expiresAt) {
      trackers.delete(key);
    }
  }
}
