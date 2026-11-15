// Provider presets are part of the medium: any story uses the same classifier
// adapters and the same connection panel.

export const PROVIDER_PRESETS = {
  demo: {
    model: 'local-demo',
    endpoint: '',
    help: 'Demo mode classifies locally with simple keyword rules. It needs no model account and sends no text anywhere.'
  },
  'claude-app': {
    model: 'Claude (in-app)',
    endpoint: '',
    help: 'Uses the host app’s Claude integration. This depends on app-session access and may use Claude quota.'
  },
  anthropic: {
    model: 'claude-haiku-5-5',
    endpoint: 'https://api.anthropic.com/v1/messages',
    help: 'Calls Anthropic directly with your API key. The key stays in this tab; browser CORS or account settings may prevent direct calls.'
  },
  openai: {
    model: 'gpt-4o-mini',
    endpoint: 'https://api.openai.com/v1',
    help: 'Calls OpenAI’s chat completions API with your key. The key stays in this tab.'
  },
  qwen: {
    model: 'qwen-plus',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    help: 'Calls Qwen’s OpenAI-compatible endpoint. Change the endpoint for your region if needed.'
  },
  local: {
    model: 'qwen2.5:7b-instruct',
    endpoint: 'http://localhost:11434/v1',
    help: 'OpenAI-compatible local endpoint (for example Ollama at localhost:11434/v1 or LM Studio at localhost:1234/v1). CORS must allow this page origin.'
  },
  jev: {
    model: 'jev-latest',
    endpoint: 'https://api.typesafe.ai',
    help: 'Uses Jev’s typed choice API. Supply a TypeSafe API key. Jev classifies choices; local code resolves story consequences.'
  }
};
