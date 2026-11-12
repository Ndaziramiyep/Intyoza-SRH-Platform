import { Router } from 'express';
import { getCategories, getArticles, getArticleById } from '../services/learning.service.js';

export const learningRouter = Router();

learningRouter.get('/categories', async (req, res, next) => {
  try {
    const categories = await getCategories();
    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

learningRouter.get('/articles', async (req, res, next) => {
  try {
    const { categoryId, language, isLowData } = req.query;
    const articles = await getArticles({ 
      categoryId, 
      language, 
      isLowData: isLowData === 'true' ? true : isLowData === 'false' ? false : undefined 
    });
    res.json({ articles });
  } catch (err) {
    next(err);
  }
});

learningRouter.get('/articles/:id', async (req, res, next) => {
  try {
    const article = await getArticleById(req.params.id);
    res.json({ article });
  } catch (err) {
    next(err);
  }
});