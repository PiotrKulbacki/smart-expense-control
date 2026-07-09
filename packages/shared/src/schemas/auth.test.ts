import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from '../features/auth/schemas';

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'Secure1!',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'Secure1!',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'Sh0rt!',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password without digit', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'Secure!!',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password without special character', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'Secure12',
    });
    expect(result.success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('accepts valid registration data', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'Secure1!',
      confirmPassword: 'Secure1!',
      name: 'John',
    });
    expect(result.success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'Secure1!',
      confirmPassword: 'Other1!',
    });
    expect(result.success).toBe(false);
  });
});
