import { prisma } from '../lib/db.js';
import { aiClient } from '../lib/ai/index.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function processChatMessage({ user, sessionId, message, language, suggestion = false }) {
  // 1. GUEST MODE (No user)
  if (!user) {
    try {
      const aiResponse = await aiClient.generate({
        userId: 'guest',
        conversationId: sessionId || 'guest-session',
        language: language || 'EN',
        history: [], 
        message,
        suggestion,
        profile: {}, // Empty profile for guests
      });

      return {
        sessionId: sessionId || null,
        reply: aiResponse.reply,
        escalate: aiResponse.escalate,
        escalateReason: aiResponse.escalateReason || null,
        sources: aiResponse.sources || [],
        type: aiResponse.type ?? null,
        title: aiResponse.title ?? null,
        topic: aiResponse.topic ?? null,
        suggestions: aiResponse.suggestions ?? [],
        disclaimer: aiResponse.disclaimer ?? null,
        bestGuess: aiResponse.bestGuess ?? false,
        confidence: aiResponse.confidence ?? null,
        isGuest: true,
      };
    } catch (error) {
      return {
        sessionId: null,
        reply: "I'm currently offline. Please try again later.",
        escalate: false,
        isGuest: true,
      };
    }
  }

  // 2. AUTHENTICATED MODE
  let session;
  if (sessionId) {
    session = UUID.test(String(sessionId))
      ? await prisma.aIChatSession.findUnique({
          where: { id: sessionId, userId: user.id },
        })
      : null;

    if (!session) {
      const err = new Error('Chat session not found');
      err.status = 404;
      err.code = 'SESSION_NOT_FOUND';
      throw err;
    }
  } else {
    session = await prisma.aIChatSession.create({
      data: { userId: user.id, language: language || 'EN' },
    });
  }

  // Fetch history BEFORE saving the new message
  const pastMessages = await prisma.aIChatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const history = pastMessages
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((m) => ({ role: m.role.toLowerCase(), content: m.content }));

  // 3. SAVE USER MESSAGE FIRST
  await prisma.aIChatMessage.create({
    data: { sessionId: session.id, role: 'USER', content: message },
  });

  // 4. Build Profile for AI
  const profile = {
    gender: user.gender?.toLowerCase(),
    district: user.district,
    language: user.language?.toLowerCase(),
  };

  // 5. CALL AI (Wrapped in try/catch)
  try {
    const aiResponse = await aiClient.generate({
      userId: user.id,
      conversationId: session.id,
      language: session.language,
      history,
      message,
      suggestion,
      profile, // Pass the profile
      ageBand: user.ageBand, // Pass ageBand directly
    });

    // 6. Save AI Reply
    const savedReply = await prisma.aIChatMessage.create({
      data: {
        sessionId: session.id,
        role: 'ASSISTANT',
        content: aiResponse.reply,
        escalate: aiResponse.escalate,
      },
    });

    return {
      sessionId: session.id,
      reply: savedReply.content,
      escalate: savedReply.escalate,
      escalateReason: aiResponse.escalateReason || null,
      sources: aiResponse.sources || [],
      type: aiResponse.type ?? null,
      title: aiResponse.title ?? null,
      topic: aiResponse.topic ?? null,
      suggestions: aiResponse.suggestions ?? [],
      disclaimer: aiResponse.disclaimer ?? null,
      bestGuess: aiResponse.bestGuess ?? false,
      confidence: aiResponse.confidence ?? null,
      isGuest: false,
    };
  } catch (error) {
    // AI Failed, but the user's message is already saved!
    // We return the sessionId and a fallback message so the frontend doesn't break.
    const errorReply = "I'm having trouble connecting to my knowledge base right now. Your message has been saved, please try again in a moment.";
    
    await prisma.aIChatMessage.create({
      data: {
        sessionId: session.id,
        role: 'ASSISTANT',
        content: errorReply,
        escalate: false,
      },
    });

    return {
      sessionId: session.id,
      reply: errorReply,
      escalate: false,
      escalateReason: null,
      sources: [],
      type: 'system_error',
      isGuest: false,
    };
  }
}