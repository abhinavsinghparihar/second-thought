import {
  AI_PROVIDERS,
  loadSettings,
  saveSettings,
  type Settings,
} from '../shared/settings';
import { detectProvider } from '../providers/registry';
import type { SettingsResponse, TabInfoResponse } from '../shared/types';

const CAPABILITY_LABEL: Record<string, string> = {
  supported: 'Supported',
  partial: 'Beta',
  unknown: 'Experimental',
};

async function init(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url ?? '';
  let hostname = '';
  try {
    hostname = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    hostname = '';
  }

  const response = (await chrome.runtime.sendMessage({ type: 'st/settings-get' })) as SettingsResponse | undefined;
  const settings: Settings | undefined = response?.settings;

  const siteName = document.getElementById('site-name')!;
  const siteChip = document.getElementById('site-chip')!;
  const detection = hostname === '' ? { adapter: null } : detectProvider(hostname, settings?.customSites ?? []);
  if (detection.adapter) {
    siteName.textContent = detection.adapter.name;
    siteChip.textContent = CAPABILITY_LABEL[detection.adapter.capability] ?? 'Unknown';
    siteChip.className = `chip ${detection.adapter.capability}`;
  } else {
    siteName.textContent = hostname === '' ? 'Unknown page' : hostname;
    siteChip.textContent = 'Passive';
    siteChip.className = 'chip off';
  }

  const tgEnabled = document.getElementById('tg-enabled') as HTMLInputElement;
  const tgIntercept = document.getElementById('tg-intercept') as HTMLInputElement;
  if (settings) {
    tgEnabled.checked = settings.enabled;
    tgIntercept.checked = settings.autoIntercept;
  }
  tgEnabled.addEventListener('change', () => void saveSettings({ enabled: tgEnabled.checked }));
  tgIntercept.addEventListener('change', () => void saveSettings({ autoIntercept: tgIntercept.checked }));

  document.getElementById('open-options')!.addEventListener('click', () => {
    void chrome.runtime.openOptionsPage();
  });

  const refineBtn = document.getElementById('refine-draft') as HTMLButtonElement;
  const note = document.getElementById('note')!;
  refineBtn.addEventListener('click', async () => {
    if (!tab?.id) return;
    refineBtn.disabled = true;
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'st/open-panel' });
      window.close();
    } catch {
      note.textContent = 'Second Thought is not active on this page. Open an AI chat site (ChatGPT, Claude, Gemini, Copilot) and try again.';
      refineBtn.disabled = false;
    }
  });

  document.getElementById('link-history')!.addEventListener('click', (evt) => {
    evt.preventDefault();
    void chrome.runtime.openOptionsPage();
  });

  void AI_PROVIDERS; // keep import for future inline engine switcher
}

void init();
