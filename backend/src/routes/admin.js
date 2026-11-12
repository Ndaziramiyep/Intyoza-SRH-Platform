import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

// Services
import { createCategory, createArticle } from '../services/learning.service.js';
import { updateFacility, importFacilities } from '../services/facilities.service.js';
import { 
  hidePost, 
  updateSpace, 
  deleteSpace, 
  getSpaceUsers,
  deletePost,
  deleteComment,
  updateReportStatus
} from '../services/community.service.js';
import { getAllReferrals, updateReferralStatus } from '../services/professionals.service.js';
import { prisma } from '../lib/db.js';

export const adminRouter = Router();

adminRouter.use(authRequired, requireRole('ADMIN'));

// ==========================================
// 0. USER MANAGEMENT
// ==========================================
adminRouter.get('/users', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, email: true, alias: true, ageBand: true, gender: true, district: true, role: true, createdAt: true,
        _count: { select: { posts: true, comments: true, aiSessions: true, proReferrals: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ users });
  } catch (err) { next(err); }
});

// ==========================================
// 1. LEARNING HUB CMS
// ==========================================
adminRouter.post('/learning/categories', async (req, res, next) => {
  try {
    const category = await createCategory(req.body);
    res.status(201).json({ category });
  } catch (err) { next(err); }
});

adminRouter.post('/learning/articles', async (req, res, next) => {
  try {
    const article = await createArticle(req.body);
    res.status(201).json({ article });
  } catch (err) { next(err); }
});

// ==========================================
// 2. MYTH BUSTER CMS
// ==========================================
adminRouter.post('/myths', async (req, res, next) => {
  try {
    const { language, mythText, factText, sources } = req.body;
    const myth = await prisma.myth.create({ data: { language, mythText, factText, sources } });
    res.status(201).json({ myth });
  } catch (err) { next(err); }
});

adminRouter.delete('/myths/:id', async (req, res, next) => {
  try {
    await prisma.myth.delete({ where: { id: req.params.id } });
    res.json({ message: 'Myth deleted' });
  } catch (err) { next(err); }
});

// ==========================================
// 3. YOUTH HEALTH CONNECT CMS
// ==========================================
adminRouter.post('/facilities', async (req, res, next) => {
  try {
    const facility = await prisma.facility.create({ data: req.body, include: { services: true } });
    res.status(201).json({ facility });
  } catch (err) { next(err); }
});

adminRouter.get('/facilities', async (req, res, next) => {
  try {
    const facilities = await prisma.facility.findMany({ include: { services: true }, orderBy: { name: 'asc' } });
    res.json({ facilities });
  } catch (err) { next(err); }
});

adminRouter.patch('/facilities/:id', async (req, res, next) => {
  try {
    const facility = await updateFacility(req.params.id, req.body);
    res.json({ facility });
  } catch (err) { next(err); }
});

adminRouter.post('/facilities/import', async (req, res, next) => {
  try {
    const { facilities } = req.body;
    if (!Array.isArray(facilities)) {
      return res.status(400).json({ error: { message: 'Expected an array of facilities', requestId: req.id } });
    }
    const imported = await importFacilities(facilities);
    res.status(201).json({ count: imported.length, message: 'Facilities imported successfully' });
  } catch (err) { next(err); }
});

// ==========================================
// 4. COMMUNITY MODERATION & MANAGEMENT
// ==========================================
// Edit a Community Space
adminRouter.patch('/community/spaces/:spaceId', async (req, res, next) => {
  try {
    const space = await updateSpace(req.params.spaceId, req.body);
    res.json({ space });
  } catch (err) { next(err); }
});

// Delete a Community Space (Cascades to delete posts/comments inside it)
adminRouter.delete('/community/spaces/:spaceId', async (req, res, next) => {
  try {
    await deleteSpace(req.params.spaceId);
    res.json({ message: 'Community space deleted successfully' });
  } catch (err) { next(err); }
});

// Get users active in a specific community
adminRouter.get('/community/spaces/:spaceId/users', async (req, res, next) => {
  try {
    const users = await getSpaceUsers(req.params.spaceId);
    res.json({ users });
  } catch (err) { next(err); }
});

// Get pending reports
adminRouter.get('/community/reports', async (req, res, next) => {
  try {
    const reports = await prisma.report.findMany({
      where: { status: 'PENDING' },
      include: { post: true, comment: true, reporter: { select: { alias: true, email: true } } },
    });
    res.json({ reports });
  } catch (err) { next(err); }
});

// Resolve or dismiss a report
adminRouter.patch('/community/reports/:reportId', async (req, res, next) => {
  try {
    const { status } = req.body; // RESOLVED or DISMISSED
    const report = await updateReportStatus(req.params.reportId, status);
    res.json({ report });
  } catch (err) { next(err); }
});

// Hide a community post (keeps it in DB, removes from feed)
adminRouter.patch('/community/posts/:postId/hide', async (req, res, next) => {
  try {
    const post = await hidePost(req.params.postId);
    res.json({ post });
  } catch (err) { next(err); }
});

// Delete a post entirely (for severe violations)
adminRouter.delete('/community/posts/:postId', async (req, res, next) => {
  try {
    await deletePost(req.params.postId);
    res.json({ message: 'Post deleted' });
  } catch (err) { next(err); }
});

// Delete a comment entirely
adminRouter.delete('/community/comments/:commentId', async (req, res, next) => {
  try {
    await deleteComment(req.params.commentId);
    res.json({ message: 'Comment deleted' });
  } catch (err) { next(err); }
});

// ==========================================
// 5. PROFESSIONALS (Phase 2 Callbacks)
// ==========================================
adminRouter.get('/referrals', async (req, res, next) => {
  try {
    const referrals = await getAllReferrals({ status: req.query.status });
    res.json({ referrals });
  } catch (err) { next(err); }
});

adminRouter.patch('/referrals/:id', async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const referral = await updateReferralStatus(req.params.id, { status, notes });
    res.json({ referral });
  } catch (err) { next(err); }
});