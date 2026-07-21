import { describe, expect, it } from 'vitest';
import { loginSchema, passwordSchema, registerSchema } from '../features/auth/schemas';

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

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });

  it('accepts non-empty password without complexity checks', () => {
    const weakPasswords = ['Sh0rt!', 'Secure!!', 'Secure12'];
    for (const password of weakPasswords) {
      const loginResult = loginSchema.safeParse({
        email: 'user@example.com',
        password,
      });
      const strength = passwordSchema.safeParse(password);
      expect(loginResult.success).toBe(true);
      expect(strength.success).toBe(false);
    }
  });
});

describe('passwordSchema', () => {
  it('rejects short password', () => {
    const result = passwordSchema.safeParse('Sh0rt!');
    expect(result.success).toBe(false);
  });

  it('rejects password without digit', () => {
    const result = passwordSchema.safeParse('Secure!!');
    expect(result.success).toBe(false);
  });

  it('rejects password without special character', () => {
    const result = passwordSchema.safeParse('Secure12');
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
