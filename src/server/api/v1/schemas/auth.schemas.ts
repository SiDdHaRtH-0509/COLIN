/**
 * COLIN Authentication Request Validation Schemas
 * Phase 4A.2.3: Authentication & Authorization Integration
 * 
 * Strict Zod validation schemas enforcing input hygiene,
 * email format, strong password criteria, and safe public role boundaries.
 */

import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email cannot exceed 255 characters')
    .transform((val) => val.toLowerCase().trim()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password cannot exceed 128 characters'),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name cannot exceed 100 characters')
    .transform((val) => val.trim()),
  lastName: z
    .string()
    .max(100, 'Last name cannot exceed 100 characters')
    .optional()
    .transform((val) => val?.trim() || ''),
  phone: z
    .string()
    .transform((val) => val.replace(/\s+/g, ''))
    .refine((val) => !val || /^\+?[1-9]\d{7,14}$/.test(val), {
      message: 'Phone number must be a valid international format (E.164)',
    })
    .optional(),
  // Public registration strictly permits only STUDENT or OWNER. ADMIN registration is prohibited.
  role: z
    .enum(['STUDENT', 'OWNER'], {
      message: "Role must be either 'STUDENT' or 'OWNER'",
    })
    .default('STUDENT'),
  collegeName: z.string().max(255).optional(),
  businessName: z.string().max(255).optional(),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .transform((val) => val.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters long')
    .max(128, 'New password cannot exceed 128 characters'),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .transform((val) => val.toLowerCase().trim()),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters long')
    .max(128, 'New password cannot exceed 128 characters'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export const adminLoginSchema = z.object({
  identifier: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});
