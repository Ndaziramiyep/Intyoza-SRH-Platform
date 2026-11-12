import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import {
  getSpaces, createSpace,
  getPosts, createPost,
  getComments, createComment,
  reportContent,
} from '../services/community.service.js';

export const communityRouter = Router();

// Require login to access the community at all
communityRouter.use(authRequired);

// spaces
communityRouter.get('/spaces', async (req, res, next) => {
  try {
    const spaces = await getSpaces();
    res.json({ spaces });
  } catch (err) {
    next(err);
  }
});

communityRouter.post('/spaces', async (req, res, next) => {
  try {
    const { name, description, imageUrl, moderatorId } = req.body || {};
    
    if (!name || !description) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Name and description are required', requestId: req.id },
      });
    }

    const space = await createSpace({ name, description, imageUrl, moderatorId });
    res.status(201).json({ space });
  } catch (err) {
    next(err);
  }
});

// posts
communityRouter.get('/spaces/:spaceId/posts', async (req, res, next) => {
  try {
    const posts = await getPosts(req.params.spaceId);
    res.json({ posts });
  } catch (err) {
    next(err);
  }
});

communityRouter.post('/spaces/:spaceId/posts', async (req, res, next) => {
  try {
    const post = await createPost({
      spaceId: req.params.spaceId,
      userId: req.user.id,
      content: req.body.content,
    });
    res.status(201).json({ post });
  } catch (err) {
    next(err);
  }
});

// comments
communityRouter.get('/posts/:postId/comments', async (req, res, next) => {
  try {
    const comments = await getComments(req.params.postId);
    res.json({ comments });
  } catch (err) {
    next(err);
  }
});

communityRouter.post('/posts/:postId/comments', async (req, res, next) => {
  try {
    const comment = await createComment({
      postId: req.params.postId,
      userId: req.user.id,
      content: req.body.content,
    });
    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
});

// reports
communityRouter.post('/report', async (req, res, next) => {
  try {
    const { postId, commentId, reason } = req.body;
    const report = await reportContent({
      reporterId: req.user.id,
      postId,
      commentId,
      reason,
    });
    res.status(201).json({ report });
  } catch (err) {
    next(err);
  }
});