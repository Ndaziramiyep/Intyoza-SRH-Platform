import { prisma } from '../lib/db.js';

// --- SPACES ---
export async function getSpaces() {
  return prisma.communitySpace.findMany({
    orderBy: { name: 'asc' },
    include: { moderator: { select: { id: true, alias: true, email: true } }, _count: { select: { posts: true } } },
  });
}

export async function createSpace({ name, description, imageUrl, moderatorId }) {
  return prisma.communitySpace.create({
    data: { name, description, imageUrl, moderatorId: moderatorId || null },
    include: { moderator: { select: { id: true, alias: true, email: true } } },
  });
}

// NEW: Update a community space
export async function updateSpace(id, data) {
  return prisma.communitySpace.update({
    where: { id },
    data,
    include: { moderator: { select: { id: true, alias: true, email: true } } },
  });
}

// NEW: Delete a community space
export async function deleteSpace(id) {
  return prisma.communitySpace.delete({
    where: { id },
  });
}

// NEW: Get users who have interacted in a specific space
export async function getSpaceUsers(spaceId) {
  // Find users who either have a post in the space OR a comment in the space
  return prisma.user.findMany({
    where: {
      OR: [
        { posts: { some: { spaceId } } },
        { comments: { some: { post: { spaceId } } } }
      ]
    },
    select: {
      id: true,
      email: true,
      alias: true,
      role: true,
      createdAt: true,
      _count: { select: { posts: { where: { spaceId } }, comments: { where: { post: { spaceId } } } } }
    }
  });
}

// --- POSTS & COMMENTS ---
export async function getPosts(spaceId) {
  return prisma.post.findMany({
    where: { spaceId, isHidden: false },
    include: {
      user: { select: { id: true, alias: true } },
      _count: { select: { comments: true, reports: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createPost({ spaceId, userId, content }) {
  return prisma.post.create({
    data: { spaceId, userId, content },
  });
}

// NEW: Admin delete post
export async function deletePost(postId) {
  return prisma.post.delete({
    where: { id: postId },
  });
}

export async function getComments(postId) {
  return prisma.comment.findMany({
    where: { postId, isHidden: false },
    include: {
      user: { select: { id: true, alias: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createComment({ postId, userId, content }) {
  return prisma.comment.create({
    data: { postId, userId, content },
  });
}

// NEW: Admin delete comment
export async function deleteComment(commentId) {
  return prisma.comment.delete({
    where: { id: commentId },
  });
}

// --- MODERATION ---
export async function reportContent({ reporterId, postId, commentId, reason }) {
  if (!postId && !commentId) {
    const err = new Error('Must report either a post or a comment');
    err.status = 400;
    err.code = 'INVALID_INPUT';
    throw err;
  }

  return prisma.report.create({
    data: { reporterId, postId, commentId, reason },
  });
}

export async function hidePost(postId) {
  return prisma.post.update({
    where: { id: postId },
    data: { isHidden: true },
  });
}

// NEW: Admin resolves or dismisses a report
export async function updateReportStatus(reportId, status) {
  return prisma.report.update({
    where: { id: reportId },
    data: { status }, // PENDING, RESOLVED, DISMISSED
  });
}