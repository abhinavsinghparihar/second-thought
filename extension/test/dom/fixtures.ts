/**
 * DOM fixtures for the provider adapters.
 *
 * These reproduce the *structure* the adapters rely on (a composer, a send
 * button, a form) rather than pixel-accurate copies of each site. They prove
 * the adapter contract — find, read, write, submit, and fail safely — against
 * realistic markup. They do **not** prove that a selector still matches the
 * live site on any given day; only a real browser on the real site can do
 * that, and the UI labels reflect that distinction.
 *
 * React-controlled textareas are simulated (`simulateReactTextarea`) because
 * that is precisely the case where `el.value = text` silently fails.
 */

/** Visible element with a real box, as jsdom returns 0×0 for everything. */
function makeVisible(element: HTMLElement, width = 320, height = 44): HTMLElement {
  (element as unknown as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect = () =>
    ({ width, height, top: 0, left: 0, right: width, bottom: height, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  return element;
}

export interface Fixture {
  root: HTMLElement;
  input: HTMLElement;
  button: HTMLElement | null;
  submitted: () => number;
}

function onSubmitCounting(root: HTMLElement): () => number {
  let count = 0;
  root.addEventListener('submit', (evt) => {
    evt.preventDefault();
    count += 1;
  });
  return () => count;
}

/**
 * A React-controlled textarea: the DOM `value` property is shadowed by a
 * React-owned value, and only the *native* setter plus an `input` event makes
 * the framework accept the change.
 */
export function simulateReactTextarea(textarea: HTMLTextAreaElement): void {
  let reactValue = textarea.value;
  Object.defineProperty(textarea, 'value', {
    configurable: true,
    get: () => reactValue,
    set: (next: string) => {
      // A naive assignment from framework-unaware code is ignored, exactly
      // like React does: the DOM text changes but state does not.
      void next;
    },
  });
  textarea.addEventListener('input', () => {
    reactValue = (textarea as unknown as { __domValue?: string }).__domValue ?? reactValue;
  });
  // Track what the *native* setter wrote.
  const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  Object.defineProperty(textarea, '__setNative', {
    configurable: true,
    value: (next: string) => nativeSetter?.call(textarea, next),
  });
}

/** ChatGPT-shaped composer: contenteditable ProseMirror + aria-labelled button. */
export function chatgptFixture(): Fixture {
  document.body.innerHTML = `
    <main>
      <form>
        <div class="composer">
          <div id="prompt-textarea" contenteditable="true" role="textbox" data-placeholder="Message ChatGPT"></div>
          <button data-testid="send-button" aria-label="Send prompt">Send</button>
        </div>
      </form>
    </main>`;
  const root = document.body;
  const input = makeVisible(document.querySelector<HTMLElement>('#prompt-textarea')!);
  const button = makeVisible(document.querySelector<HTMLElement>('[data-testid="send-button"]')!);
  const submitted = onSubmitCounting(root);
  button.addEventListener('click', () => {
    // A submit button inside a form would submit; recorded through the form.
    document.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
  });
  return { root, input, button, submitted };
}

/** Claude-shaped composer: ProseMirror div + aria-label submit button. */
export function claudeFixture(): Fixture {
  document.body.innerHTML = `
    <div class="chat">
      <fieldset>
        <div contenteditable="true" class="ProseMirror" role="textbox" aria-label="Write your prompt to Claude"></div>
        <button aria-label="Send message" type="button">Send</button>
      </fieldset>
    </div>`;
  const root = document.body;
  const input = makeVisible(document.querySelector<HTMLElement>('.ProseMirror')!);
  const button = makeVisible(document.querySelector<HTMLElement>('button[aria-label="Send message"]')!);
  let clicks = 0;
  button.addEventListener('click', () => {
    clicks += 1;
  });
  return { root, input, button, submitted: () => clicks };
}

/** Gemini-shaped composer: a rich-textarea with a nested contenteditable. */
export function geminiFixture(): Fixture {
  document.body.innerHTML = `
    <div class="input-area">
      <rich-textarea>
        <div class="ql-editor" contenteditable="true" role="textbox" aria-label="Enter a prompt here"></div>
      </rich-textarea>
      <button class="send-button" aria-label="Send message">Send</button>
    </div>`;
  const root = document.body;
  const input = makeVisible(document.querySelector<HTMLElement>('.ql-editor')!);
  const button = makeVisible(document.querySelector<HTMLElement>('button[aria-label="Send message"]')!);
  let clicks = 0;
  button.addEventListener('click', () => {
    clicks += 1;
  });
  return { root, input, button, submitted: () => clicks };
}

/** Copilot-shaped composer: textarea + submit button. */
export function copilotFixture(): Fixture {
  document.body.innerHTML = `
    <form id="copilot">
      <textarea id="userInput" placeholder="Ask me anything..."></textarea>
      <button type="submit" aria-label="Submit message">Send</button>
    </form>`;
  const root = document.body;
  const input = makeVisible(document.querySelector<HTMLElement>('#userInput')!);
  const button = makeVisible(document.querySelector<HTMLElement>('button[type="submit"]')!);
  const submitted = onSubmitCounting(root);
  return { root, input, button, submitted };
}

/**
 * A hidden template editor that appears *before* the real composer in the DOM.
 * Adapters must skip it — this is the classic "typed into a hidden field"
 * failure mode that the original code had.
 */
export function hiddenDecoyFixture(): Fixture {
  document.body.innerHTML = `
    <div style="display:none">
      <textarea id="hidden-composer"></textarea>
    </div>
    <form>
      <div id="prompt-textarea" contenteditable="true" role="textbox"></div>
      <button data-testid="send-button" aria-label="Send prompt">Send</button>
    </form>`;
  const root = document.body;
  const decoy = document.querySelector<HTMLElement>('#hidden-composer')!;
  (decoy as unknown as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect = () =>
    ({ width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  const input = makeVisible(document.querySelector<HTMLElement>('#prompt-textarea')!);
  const button = makeVisible(document.querySelector<HTMLElement>('[data-testid="send-button"]')!);
  const submitted = onSubmitCounting(root);
  return { root, input, button, submitted };
}

/** Site with no composer at all — adapters must return null, never throw. */
export function emptyFixture(): void {
  document.body.innerHTML = '<main><p>Nothing here</p></main>';
}

/** React-controlled textarea composer (e.g. Copilot's newer UI). */
export function reactTextareaFixture(): { textarea: HTMLTextAreaElement; reads: string[] } {
  document.body.innerHTML = `
    <form id="react-form">
      <textarea id="prompt-textarea" placeholder="Message"></textarea>
      <button type="submit">Send</button>
    </form>`;
  const textarea = document.querySelector<HTMLTextAreaElement>('#prompt-textarea')!;
  makeVisible(textarea);
  const button = document.querySelector<HTMLElement>('button[type="submit"]')!;
  makeVisible(button);
  simulateReactTextarea(textarea);
  const reads: string[] = [];
  textarea.addEventListener('input', () => reads.push(textarea.value));
  return { textarea, reads };
}

/** A send button that exists but starts disabled (the "click does nothing" bug). */
export function disabledButtonFixture(): Fixture {
  document.body.innerHTML = `
    <form>
      <div id="prompt-textarea" contenteditable="true" role="textbox"></div>
      <button data-testid="send-button" aria-label="Send prompt" disabled>Send</button>
    </form>`;
  const root = document.body;
  const input = makeVisible(document.querySelector<HTMLElement>('#prompt-textarea')!);
  const button = makeVisible(document.querySelector<HTMLElement>('[data-testid="send-button"]')!);
  let enterPresses = 0;
  let buttonClicks = 0;
  input.addEventListener('keydown', (evt) => {
    if ((evt as KeyboardEvent).key === 'Enter') enterPresses += 1;
  });
  button.addEventListener('click', () => {
    buttonClicks += 1;
  });
  // `submitted` counts real submissions (Enter), `buttonClicks` proves the
  // adapter did NOT try to click a disabled control.
  return {
    root,
    input,
    button,
    submitted: () => enterPresses,
    buttonClicks: () => buttonClicks,
  } as Fixture & { buttonClicks: () => number };
}
