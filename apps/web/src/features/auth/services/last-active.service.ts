import { prisma } from '@smart-expense-control/database';

const LAST_ACTIVE_TOUCH_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Throttled activity ping — at most once per hour per user to avoid write storms.
 */
export function touchUserLastActive(userId: string, lastActiveAt?: Date | null): void {
  const now = Date.now();
  if (lastActiveAt && now - lastActiveAt.getTime() < LAST_ACTIVE_TOUCH_INTERVAL_MS) {
    return;
  }

  void prisma.user
    .update({
      where: { id: userId },
      data: { lastActiveAt: new Date(now) },
    })
    .catch(() => {
      // Best-effort; never block authenticated requests on activity tracking.
    });
}
