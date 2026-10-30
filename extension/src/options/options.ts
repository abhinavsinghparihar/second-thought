import {
  AI_PROVIDERS,
  getApiKey,
  loadSettings,
  saveSettings,
  setApiKey,
  type AiProviderId,
} from '../shared/settings';
import type { SettingsResponse } from '../shared/types';
import { buildMatchPatterns, CUSTOM_SCRIPT_ID } from '../shared/custom-sites';

function parseLines(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((l) => l.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
    .filter((l) => l !== '' && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(l));
}

async function init(): Promise<void> {
  const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

  const stEnabled = $('st-enabled') as HTMLInputElement;
  const stIntercept = $('st-intercept') as HTMLInputElement;
  const stMaxQ = $('st-maxq') as HTMLSelectElement;
  const stHistory = $('st-history') as HTMLInputElement;
  const stEngine = $('st-engine') as HTMLSelectElement;
  const stProvider = $('st-provider') as HTMLSelectElement;
  const stModel = $('st-model') as HTMLInputElement;
  const stApiKey = $('st-apikey') as HTMLInputElement;
  const keyRow = $('keyrow');
  const keyLink = $('key-link') as HTMLAnchorElement;
  const stExcluded = $('st-excluded') as HTMLTextAreaElement;
  const stCustom = $('st-custom') as HTMLTextAreaElement;
  const testStatus = $('test-status');

  const response = (await chrome.runtime.sendMessage({ type: 'st/settings-get' })) as SettingsResponse | undefined;
  const settings = response?.settings;
  if (settings) {
    stEnabled.checked = settings.enabled;
    stIntercept.checked = settings.autoIntercept;
    stMaxQ.value = String(settings.maxQuestions);
    stHistory.checked = settings.historyEnabled;
    stEngine.value = settings.analysisEngine;
    stProvider.value = settings.aiProvider;
    stModel.value = settings.aiModel;
    stExcluded.value = settings.excludedSites.join('\n');
    stCustom.value = settings.customSites.join('\n');
  }
  const hasKey = response?.hasApiKey ?? false;
  if (hasKey) stApiKey.placeholder = '••••••••••••••••  (saved)';

  function syncEngineUi(): void {
    const isAi = stEngine.value === 'ai';
    $('ai-config').style.opacity = isAi ? '1' : '0.55';
    const spec = AI_PROVIDERS.find((p) => p.id === stProvider.value);
    keyRow.classList.toggle('show', Boolean(spec?.needsKey));
    if (spec?.keyUrl) keyLink.href = spec.keyUrl;
  }
  stEngine.addEventListener('change', syncEngineUi);
  stProvider.addEventListener('change', () => {
    const spec = AI_PROVIDERS.find((p) => p.id === stProvider.value);
    if (spec) stModel.value = spec.defaultModel;
    syncEngineUi();
    void persist();
  });
  syncEngineUi();

  // Populate provider options.
  stProvider.innerHTML = '';
  for (const p of AI_PROVIDERS) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    stProvider.appendChild(opt);
  }
  if (settings) stProvider.value = settings.aiProvider;

  async function persist(): Promise<void> {
    await saveSettings({
      enabled: stEnabled.checked,
      autoIntercept: stIntercept.checked,
      maxQuestions: Number(stMaxQ.value),
      historyEnabled: stHistory.checked,
      analysisEngine: stEngine.value as 'local' | 'ai',
      aiProvider: stProvider.value as AiProviderId,
      aiModel: stModel.value.trim() || AI_PROVIDERS.find((p) => p.id === stProvider.value)!.defaultModel,
      excludedSites: parseLines(stExcluded.value),
      customSites: parseLines(stCustom.value),
    });
  }

  for (const el of [stEnabled, stIntercept, stHistory]) {
    el.addEventListener('change', () => void persist());
  }
  for (const el of [stMaxQ, stEngine, stExcluded, stCustom, stModel]) {
    el.addEventListener('change', () => void persist());
  }

  $('btn-save-key').addEventListener('click', () => {
    const key = stApiKey.value.trim();
    if (key === '') return;
    void setApiKey(key).then(() => {
      stApiKey.value = '';
      stApiKey.placeholder = '••••••••••••••••  (saved)';
    });
  });

  $('btn-test').addEventListener('click', () => {
    const btn = $('btn-test') as HTMLButtonElement;
    btn.disabled = true;
    testStatus.className = 'status';
    testStatus.textContent = 'Testing…';
    void chrome.runtime
      .sendMessage({
        type: 'st/test-connection',
        provider: stProvider.value,
        model: stModel.value.trim(),
        apiKey: stApiKey.value.trim(),
      })
      .then((res: { ok: boolean; message: string } | undefined) => {
        testStatus.className = res?.ok ? 'status ok' : 'status err';
        testStatus.textContent = res?.message ?? 'No response';
      })
      .catch(() => {
        testStatus.className = 'status err';
        testStatus.textContent = 'Connection test failed.';
      })
      .finally(() => {
        btn.disabled = false;
        void getApiKey();
      });
  });

  $('btn-clear-history').addEventListener('click', () => {
    void chrome.runtime.sendMessage({ type: 'st/history-clear' });
  });

  /**
   * Apply custom sites end-to-end: persist list → request host permissions
   * (user gesture from this button click) → (re)register a dynamic content
   * script so the controller runs on those sites across sessions.
   */
  async function applyCustomSites(): Promise<void> {
    const status = $('custom-status');
    btnApply.disabled = true;
    try {
      const sites = parseLines(stCustom.value);
      const matches = buildMatchPatterns(sites);
      const existing = await chrome.scripting.getRegisteredContentScripts();
      const isRegistered = existing.some((r) => r.id === CUSTOM_SCRIPT_ID);

      if (matches.length === 0) {
        if (isRegistered) {
          await chrome.scripting.unregisterContentScripts({ ids: [CUSTOM_SCRIPT_ID] });
        }
        status.className = 'status ok';
        status.textContent = 'Saved — custom sites cleared.';
        return;
      }

      const want = { permissions: ['scripting'] as Array<'scripting'>, origins: matches };
      const granted = (await chrome.permissions.contains(want)) || (await chrome.permissions.request(want));
      if (!granted) {
        status.className = 'status err';
        status.textContent = 'Permission denied — custom sites stay inactive.';
        return;
      }
      if (isRegistered) {
        await chrome.scripting.unregisterContentScripts({ ids: [CUSTOM_SCRIPT_ID] });
      }
      await chrome.scripting.registerContentScripts([
        {
          id: CUSTOM_SCRIPT_ID,
          js: ['content.js'],
          matches,
          runAt: 'document_idle',
          persistAcrossSessions: true,
        },
      ]);
      status.className = 'status ok';
      status.textContent = `Active on ${sites.length} site${sites.length === 1 ? '' : 's'} — refresh the site tab once.`;
    } catch (err) {
      status.className = 'status err';
      status.textContent = 'Could not apply: ' + (err instanceof Error ? err.message.slice(0, 120) : 'unknown error');
    } finally {
      btnApply.disabled = false;
    }
  }

  const btnApply = $('btn-apply-custom') as HTMLButtonElement;
  btnApply.addEventListener('click', () => void applyCustomSites());
}

void init();
