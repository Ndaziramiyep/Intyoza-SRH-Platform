import { prisma } from '../lib/db.js';

export async function getMyths({ language } = {}) {
  const where = {};
  if (language) where.language = language;

  return prisma.myth.findMany({
    where,
    orderBy: { id: 'asc' },
  });
}