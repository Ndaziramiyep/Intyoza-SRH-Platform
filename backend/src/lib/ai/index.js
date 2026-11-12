import { config } from '../../config.js';
import { mockProvider } from './mock.js';
import { intyozaProvider } from './intyoza.js';

const providers = {
  mock: mockProvider,
  intyoza: intyozaProvider,
};

const provider = providers[config.aiProvider];

if (!provider) {
  throw new Error(`Unknown AI_PROVIDER: ${config.aiProvider}`);
}

export const aiClient = {
  name: provider.name,
  generate: (input) => provider.generate(input),
};