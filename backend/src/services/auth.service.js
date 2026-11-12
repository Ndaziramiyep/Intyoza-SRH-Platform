import { prisma } from '../lib/db.js';
import { signAccessToken } from '../lib/jwt.js';
import bcrypt from 'bcryptjs';

const ALLOWED_LANGUAGES = ['EN', 'RW'];
const ALLOWED_AGE_BANDS = ['UNKNOWN', 'AGE_10_14', 'AGE_15_19', 'AGE_20_24', 'AGE_25_PLUS'];
const ALLOWED_GENDERS = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'];

export async function registerUser({ email, password, ageBand, gender, district, language }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error('Email already in use');
    err.status = 409;
    err.code = 'EMAIL_IN_USE';
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      language: ALLOWED_LANGUAGES.includes(language) ? language : 'EN',
      ageBand: ALLOWED_AGE_BANDS.includes(ageBand) ? ageBand : 'UNKNOWN',
      gender: ALLOWED_GENDERS.includes(gender) ? gender : 'PREFER_NOT_TO_SAY',
      district: district || null,
    },
  });

  const token = signAccessToken(user);
  return { user, token };
}

export async function loginUser(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Check if user exists and has a password (OAuth users won't)
  if (!user || !user.passwordHash) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const token = signAccessToken(user);
  return { user, token };
}

export async function updateProfile(userId, { alias, ageBand, gender, district, language }) {
  if (alias) {
    const existing = await prisma.user.findUnique({ where: { alias } });
    if (existing && existing.id !== userId) {
      const err = new Error('Username already taken');
      err.status = 409;
      err.code = 'ALIAS_IN_USE';
      throw err;
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(alias ? { alias } : {}),
      ...(ALLOWED_AGE_BANDS.includes(ageBand) ? { ageBand } : {}),
      ...(ALLOWED_GENDERS.includes(gender) ? { gender } : {}),
      ...(ALLOWED_LANGUAGES.includes(language) ? { language } : {}),
      ...(district ? { district } : {}),
    },
  });

  return updated;
}