import { prisma } from '../lib/db.js';

export async function getCategories() {
  return prisma.category.findMany({
    orderBy: { nameEn: 'asc' },
  });
}

export async function getArticles({ categoryId, language, isLowData } = {}) {
  const where = { published: true };
  if (categoryId) where.categoryId = categoryId;
  if (language) where.language = language;
  if (isLowData !== undefined) where.isLowData = isLowData;

  return prisma.article.findMany({
    where,
    select: {
      id: true,
      title: true,
      format: true,
      isLowData: true,
      language: true,
      categoryId: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getArticleById(id) {
  const article = await prisma.article.findUnique({
    where: { id, published: true },
    include: { category: true },
  });
  
  if (!article) {
    const err = new Error('Article not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return article;
}

// --- Admin Functions ---

export async function createCategory({ slug, nameEn, nameRw }) {
  return prisma.category.create({
    data: { slug, nameEn, nameRw },
  });
}

export async function createArticle(data) {
  return prisma.article.create({
    data,
  });
}