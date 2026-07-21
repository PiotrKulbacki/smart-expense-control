import { prisma } from '@lyamo/database';
import { generateToken, hashToken } from '@web/features/auth/lib/tokens';
import {
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
} from '@web/features/auth/services/auth-email.service';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export async function createAndSendPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });

  // Always no-op outwardly; only send when the account has a local password.
  if (!user?.passwordHash) {
    return;
  }

  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  });

  const token = generateToken();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });

  await sendPasswordResetEmail({ email: user.email, token });
}

export async function resetPasswordWithToken(
  token: string,
  passwordHash: string
): Promise<boolean> {
  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return false;
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { userId: record.userId, usedAt: null, id: { not: record.id } },
    }),
  ]);

  return true;
}

export async function createAndSendEmailVerification(userId: string, email: string): Promise<void> {
  await prisma.emailVerificationToken.deleteMany({
    where: { userId, usedAt: null },
  });

  const token = generateToken();
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });

  await sendEmailVerificationEmail({ email, token });
}

export async function verifyEmailWithToken(token: string): Promise<boolean> {
  const tokenHash = hashToken(token);
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return false;
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.emailVerificationToken.deleteMany({
      where: { userId: record.userId, usedAt: null, id: { not: record.id } },
    }),
  ]);

  return true;
}

export async function resendEmailVerification(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.emailVerifiedAt || !user.passwordHash) {
    return;
  }

  await createAndSendEmailVerification(user.id, user.email);
}
