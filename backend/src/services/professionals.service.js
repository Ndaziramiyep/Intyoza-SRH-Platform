import { prisma } from '../lib/db.js';

// user actions

export async function createReferral({ userId, contactMethod, topic }) {
  if (!contactMethod) {
    const err = new Error('Contact method (phone or email) is required');
    err.status = 400;
    err.code = 'INVALID_INPUT';
    throw err;
  }

  return prisma.proReferral.create({
    data: { userId, contactMethod, topic },
  });
}

export async function getUserReferrals(userId) {
  return prisma.proReferral.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

// admin actions

export async function getAllReferrals({ status } = {}) {
  const where = {};
  if (status) where.status = status;

  return prisma.proReferral.findMany({
    where,
    include: {
      user: { select: { id: true, alias: true, ageBand: true, district: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateReferralStatus(id, { status, notes }) {
  return prisma.proReferral.update({
    where: { id },
    data: { status, notes },
  });
}