export const mockProvider = {
  name: 'mock',
  async generate({ language = 'EN', message = '', profile = {} } = {}) {
    const isEmergency = /emergency|bleeding|help/i.test(message);
    
    const replies = {
      EN: 'This is a mock reply from the Intyoza AI stub. The real AI service will replace this.',
      RW: 'Iki ni igisubizo cy’ikigereranyo cy’ubuhanga bwa Intyoza. Serivisi nyayo izasimbuza iyi.',
    };
    return {
      reply: replies[language] || replies.EN,
      escalate: isEmergency,
      escalateReason: isEmergency ? 'emergency' : null,
      sources: ['https://example.com/mock-source'],
    };
  },
};