import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './config.js';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Intyoza SRH Platform API',
    version: config.version,
    description: 'API documentation for the Intyoza platform. Covers Authentication, AI Chat, Learning Hub, Health Connect, Community, and Admin CMS.',
  },
  servers: [
    {
      // Relative URL: "Try it out" calls whichever host served the docs
      // (localhost in dev, the Vercel domain in production).
      url: '/',
      description: 'This server',
    },
  ],
  tags: [
    { name: 'Authentication', description: 'User registration, login, Google OAuth, and profile updates' },
    { name: 'AI Chat', description: 'Endpoints for the Intyoza AI assistant' },
    { name: 'Learning Hub', description: 'Articles and categories' },
    { name: 'Myth Buster', description: 'Fact-checking and myth-busting content' },
    { name: 'Health Connect', description: 'Youth-friendly clinics and facilities' },
    { name: 'Community', description: 'Peer support spaces, posts, and comments' },
    { name: 'Professionals', description: 'Callback requests for nurses and counselors' },
    { name: 'Admin', description: 'Protected routes for content management and moderation' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              requestId: { type: 'string' },
            },
          },
        },
      },
      FacilityInput: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Kacyiru Health Center' },
          facilityType: { type: 'string', example: 'Health Center' },
          ownership: { type: 'string', enum: ['PUBLIC', 'FAITH_BASED', 'PRIVATE', 'UNKNOWN'] },
          province: { type: 'string', example: 'Kigali City' },
          district: { type: 'string', example: 'Gasabo' },
          sector: { type: 'string', example: 'Kacyiru' },
          cell: { type: 'string', example: 'Kamatamu' },
          address: { type: 'string' },
          latitude: { type: 'number', example: -1.9441 },
          longitude: { type: 'number', example: 30.0619 },
          phone: { type: 'string' },
          openingHours: { type: 'string' },
          isYouthFriendly: { type: 'string', enum: ['YES', 'LIKELY', 'NO', 'UNKNOWN'] },
          isIsange: { type: 'string', enum: ['YES', 'LIKELY', 'NO', 'UNKNOWN'] },
          showInApp: { type: 'boolean', default: true },
          verifiedAt: { type: 'string', format: 'date-time', nullable: true },
          services: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                serviceName: { type: 'string', example: 'CONTRACEPTION' },
                status: { type: 'string', enum: ['YES', 'LIKELY', 'NO', 'UNKNOWN'] },
                costType: { type: 'string', enum: ['FREE', 'SUBSIDIZED', 'PAID', 'UNKNOWN'] },
              },
            },
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': {
      get: { tags: ['System'], summary: 'Health check', responses: { 200: { description: 'Server is running' } } },
    },
    '/api/v1/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email', example: 'user@example.com' },
                  password: { type: 'string', example: 'Password123!' },
                  ageBand: { type: 'string', enum: ['UNKNOWN', 'AGE_10_14', 'AGE_15_19', 'AGE_20_24', 'AGE_25_PLUS'] },
                  gender: { type: 'string', enum: ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'] },
                  district: { type: 'string' },
                  language: { type: 'string', enum: ['EN', 'RW'] },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User registered successfully' },
          400: { description: 'Validation error' },
          409: { description: 'Email already in use' }
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login for all users',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email', example: 'user@example.com' },
                  password: { type: 'string', example: 'Password123!' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful, returns user and token' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/api/v1/auth/google': {
      get: {
        tags: ['Authentication'],
        summary: 'Redirect to Google Sign-In',
        security: [],
        responses: {
          302: { description: 'Redirects to Google consent screen' },
        },
      },
    },
    '/api/v1/auth/google/callback': {
      get: {
        tags: ['Authentication'],
        summary: 'Google OAuth callback',
        security: [],
        parameters: [
          { name: 'code', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          302: { description: 'Redirects to frontend with JWT token in query params' },
        },
      },
    },
    '/api/v1/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get the authenticated user profile',
        responses: {
          200: { description: 'Authenticated user details' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/v1/auth/profile': {
      patch: {
        tags: ['Authentication'],
        summary: 'Update user profile (Alias, Age, Gender, etc.)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  alias: { type: 'string', description: 'Community Username', example: 'BraveLion' },
                  ageBand: { type: 'string' },
                  gender: { type: 'string' },
                  district: { type: 'string' },
                  language: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Profile updated successfully' },
          409: { description: 'Alias already taken' },
        },
      },
    },
    '/api/v1/ai/chat': {
      post: {
        tags: ['AI Chat'],
        summary: 'Send a message to the AI SRH assistant (Guests allowed)',
        description: 'Guests can chat, but their history is NOT saved. Authenticated users have their chat stored in the database.',
        security: [], 
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['message'],
                properties: {
                  message: { type: 'string', description: 'The user question or message to the SRH assistant' },
                  sessionId: { type: 'string', description: 'Optional session identifier (only works if authenticated)' },
                  suggestion: { type: 'boolean', description: 'True when the message is a suggested question the user tapped' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'AI response returned' },
          400: { description: 'Invalid message payload' },
          503: { description: 'AI service unreachable' },
        },
      },
    },
    '/api/v1/learning/categories': {
      get: {
        tags: ['Learning Hub'],
        summary: 'Get all learning categories',
        responses: { 200: { description: 'List of categories' } },
      },
    },
    '/api/v1/learning/articles': {
      get: {
        tags: ['Learning Hub'],
        summary: 'Get all learning articles',
        parameters: [
          { name: 'categoryId', in: 'query', schema: { type: 'string' } },
          { name: 'language', in: 'query', schema: { type: 'string', enum: ['EN', 'RW'] } },
          { name: 'isLowData', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: { 200: { description: 'List of articles' } },
      },
    },
    '/api/v1/myths': {
      get: {
        tags: ['Myth Buster'],
        summary: 'Get all myths and facts',
        parameters: [
          { name: 'language', in: 'query', schema: { type: 'string', enum: ['EN', 'RW'] } },
        ],
        responses: { 200: { description: 'List of myths' } },
      },
    },
    '/api/v1/facilities': {
      get: {
        tags: ['Health Connect'],
        summary: 'Get youth-friendly health facilities (Public)',
        parameters: [
          { name: 'district', in: 'query', schema: { type: 'string', example: 'Gasabo' } },
          { name: 'province', in: 'query', schema: { type: 'string', example: 'Kigali City' } },
          { name: 'sector', in: 'query', schema: { type: 'string', example: 'Kacyiru' } },
          { name: 'cell', in: 'query', schema: { type: 'string', example: 'Kamatamu' } },
          { name: 'serviceName', in: 'query', schema: { type: 'string', example: 'CONTRACEPTION' } },
          { name: 'isYouthFriendly', in: 'query', schema: { type: 'string', enum: ['YES', 'LIKELY', 'NO', 'UNKNOWN'] } },
          { name: 'isIsange', in: 'query', schema: { type: 'string', enum: ['YES', 'LIKELY', 'NO', 'UNKNOWN'] } },
        ],
        responses: { 200: { description: 'List of facilities' } },
      },
    },
    '/api/v1/community/spaces': {
      get: {
        tags: ['Community'],
        summary: 'Get community spaces',
        responses: { 200: { description: 'List of spaces' } },
      },
      post: {
        tags: ['Community'],
        summary: 'Create a community space (Admin only usually, but open here for testing)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { 
                  name: { type: 'string', example: 'Young Mothers' }, 
                  description: { type: 'string', example: 'A safe space for young mothers.' },
                  imageUrl: { type: 'string', example: 'https://example.com/community-image.jpg' },
                  moderatorId: { type: 'string', example: 'uuid-of-moderator' }
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Space created' } },
      },
    },
    '/api/v1/community/spaces/{spaceId}/posts': {
      get: {
        tags: ['Community'],
        summary: 'Get posts in a specific space',
        parameters: [{ name: 'spaceId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'List of posts' } },
      },
      post: {
        tags: ['Community'],
        summary: 'Create a post in a space',
        parameters: [{ name: 'spaceId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { content: { type: 'string' } },
              },
            },
          },
        },
        responses: { 201: { description: 'Post created' } },
      },
    },
    '/api/v1/community/report': {
      post: {
        tags: ['Community'],
        summary: 'Report a post or comment',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  postId: { type: 'string' },
                  commentId: { type: 'string' },
                  reason: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Report submitted' } },
      },
    },
    '/api/v1/professionals/referrals': {
      post: {
        tags: ['Professionals'],
        summary: 'Request a callback from a health professional',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  contactMethod: { type: 'string', example: '+250788000000' },
                  topic: { type: 'string', example: 'Contraception' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Referral created' } },
      },
      get: {
        tags: ['Professionals'],
        summary: 'Get my referral requests',
        responses: { 200: { description: 'List of referrals' } },
      },
    },
    '/api/v1/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'Get all registered users',
        responses: { 200: { description: 'List of users' } },
      },
    },
    '/api/v1/admin/learning/categories': {
      post: {
        tags: ['Admin'],
        summary: 'Create a learning category',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { slug: { type: 'string' }, nameEn: { type: 'string' }, nameRw: { type: 'string' } },
              },
            },
          },
        },
        responses: { 201: { description: 'Category created' } },
      },
    },
    '/api/v1/admin/learning/articles': {
      post: {
        tags: ['Admin'],
        summary: 'Create a learning article',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  categoryId: { type: 'string' },
                  language: { type: 'string', enum: ['EN', 'RW'] },
                  title: { type: 'string' },
                  content: { type: 'string' },
                  format: { type: 'string', enum: ['ARTICLE', 'VIDEO', 'AUDIO', 'QUIZ'] },
                  isLowData: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Article created' } },
      },
    },
    '/api/v1/admin/myths': {
      post: {
        tags: ['Admin'],
        summary: 'Create a myth buster entry',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  language: { type: 'string', enum: ['EN', 'RW'] },
                  mythText: { type: 'string' },
                  factText: { type: 'string' },
                  sources: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Myth created' } },
      },
    },
    '/api/v1/admin/facilities': {
      get: {
        tags: ['Admin'],
        summary: 'Get all facilities (including hidden)',
        responses: { 200: { description: 'List of all facilities' } },
      },
      post: {
        tags: ['Admin'],
        summary: 'Create a single health facility',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/FacilityInput' },
            },
          },
        },
        responses: { 201: { description: 'Facility created' } },
      },
    },
    '/api/v1/admin/facilities/{id}': {
      patch: {
        tags: ['Admin'],
        summary: 'Update a health facility',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/FacilityInput' },
            },
          },
        },
        responses: { 200: { description: 'Facility updated' } },
      },
    },
    '/api/v1/admin/facilities/import': {
      post: {
        tags: ['Admin'],
        summary: 'Bulk import the 625 facilities list',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  facilities: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/FacilityInput' },
                  },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Facilities imported successfully' } },
      },
    },
    '/api/v1/admin/community/spaces/{spaceId}': {
      patch: {
        tags: ['Admin'],
        summary: 'Edit a community space',
        parameters: [{ name: 'spaceId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { 
                  name: { type: 'string' }, 
                  description: { type: 'string' }, 
                  imageUrl: { type: 'string' }, 
                  moderatorId: { type: 'string' } 
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Space updated' } },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Delete a community space',
        parameters: [{ name: 'spaceId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Space deleted' } },
      },
    },
    '/api/v1/admin/community/spaces/{spaceId}/users': {
      get: {
        tags: ['Admin'],
        summary: 'Get users active in a specific community',
        parameters: [{ name: 'spaceId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'List of users' } },
      },
    },
    '/api/v1/admin/community/reports': {
      get: {
        tags: ['Admin'],
        summary: 'Get pending community reports',
        responses: { 200: { description: 'List of pending reports' } },
      },
    },
    '/api/v1/admin/community/reports/{reportId}': {
      patch: {
        tags: ['Admin'],
        summary: 'Resolve or dismiss a report',
        parameters: [{ name: 'reportId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { status: { type: 'string', enum: ['RESOLVED', 'DISMISSED'] } },
              },
            },
          },
        },
        responses: { 200: { description: 'Report updated' } },
      },
    },
    '/api/v1/admin/community/posts/{postId}': {
      delete: {
        tags: ['Admin'],
        summary: 'Delete a reported post entirely',
        parameters: [{ name: 'postId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Post deleted' } },
      },
    },
    '/api/v1/admin/community/comments/{commentId}': {
      delete: {
        tags: ['Admin'],
        summary: 'Delete a reported comment entirely',
        parameters: [{ name: 'commentId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Comment deleted' } },
      },
    },
    '/api/v1/admin/community/posts/{postId}/hide': {
      patch: {
        tags: ['Admin'],
        summary: 'Hide a community post',
        parameters: [{ name: 'postId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Post hidden successfully' } },
      },
    },
    '/api/v1/admin/referrals': {
      get: {
        tags: ['Admin'],
        summary: 'Get all professional referrals',
        responses: { 200: { description: 'List of referrals' } },
      },
    },
    '/api/v1/admin/referrals/{id}': {
      patch: {
        tags: ['Admin'],
        summary: 'Update a referral status and add notes',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['PENDING', 'CONTACTED', 'RESOLVED', 'CANCELLED'] },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Referral updated' } },
      },
    },
  },
};

export const swaggerSpec = swaggerJsdoc({
  definition: swaggerDefinition,
  apis: [], 
});

export const swaggerUiOptions = {
  explorer: true,
  customSiteTitle: 'Intyoza API Docs',
};