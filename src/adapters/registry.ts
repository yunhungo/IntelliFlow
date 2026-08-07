import { ChatGptAdapter } from './chatgpt';
import { AdapterError, type SiteAdapter } from './site-adapter';

export class AdapterRegistry {
  constructor(private readonly adapters: SiteAdapter[]) {}

  resolve(url: URL): SiteAdapter {
    const adapter = this.adapters.find((candidate) => candidate.matches(url));
    if (adapter == null) {
      throw new AdapterError('IntelliFlow does not support this website yet.', 'unsupported-site');
    }
    return adapter;
  }
}

export function createDefaultAdapterRegistry(document: Document): AdapterRegistry {
  return new AdapterRegistry([new ChatGptAdapter(document)]);
}
