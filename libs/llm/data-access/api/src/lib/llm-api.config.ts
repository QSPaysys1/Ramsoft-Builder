import { InjectionToken } from '@angular/core';

export interface LlmApiConfig {
  audioToTextUrl: string;
  videoToTextUrl: string;
  generateTextUrl: string;
  urlToTextUrl: string;
}

export const LLM_API_CONFIG = new InjectionToken<LlmApiConfig>('LLM_API_CONFIG');
