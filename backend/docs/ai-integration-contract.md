# Intyoza AI — Integration Contract

This document defines the boundary between the Intyoza backend and the AI service.

## Entry point

The backend calls:
```js
import { aiClient } from './src/lib/ai/index.js';
const result = await aiClient.generate(input);