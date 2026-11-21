/**
 * Prompt composition.
 *
 * Answers become a structured prompt that (a) keeps the user's original
 * wording verbatim as the head so nothing is lost and no intent is
 * overwritten, (b) states every collected requirement under a heading the
 * model can act on, and (c) ends with a precedence rule so the original
 * request always wins over a mis-clicked option.
 *
 * This is intentionally a *structured brief*, not a "prompt rewrite". Second
 * Thought is a requirement-discovery layer: it adds the requirements the user
 * forgot, it does not put words in their mouth.
 */

import { schemaFor } from './schema';
import type { RequirementModel, TaskType } from './types';
import { asList, bare, capitalize, clip, joinNatural, squash, unique } from './text';

export interface ComposeInput {
  original: string;
  taskType: TaskType;
  fields: Record<string, string | string[]>;
  intent?: string;
  preserveOriginal?: boolean;
  /** Labels for non-schema slots (see ComposeOptions.labels). */
  labels?: Record<string, string>;
}

interface Section {
  heading: string;
  lines: string[];
}

const ROLE: Record<TaskType, string> = {
  software: 'a senior software engineer',
  website: 'a senior front-end engineer and web designer',
  mobile: 'a senior mobile engineer',
  coding: 'a senior engineer pair-programming with me',
  writing: 'an experienced writer and editor',
  research: 'a rigorous research analyst',
  image: 'a professional visual artist and art director',
  business: 'a pragmatic business strategist',
  education: 'a patient, insightful tutor',
  general: 'a capable, careful assistant',
};

const SUCCESS: Record<TaskType, string> = {
  software: 'The result is runnable, production-shaped, and respects every constraint stated above.',
  website: 'Every requested page exists, the layout is responsive, and the visual direction is applied consistently.',
  mobile: 'The core flow works end to end on the target platform and the app handles empty, loading and error states.',
  coding: 'The fix or code is correct, minimal, and explains why it works.',
  writing: 'The piece speaks to the stated reader, holds the stated tone throughout, and needs no rework to be usable.',
  research: 'Claims are specific and checkable, uncertainty is acknowledged, and the output makes the decision easier.',
  image: 'The image matches the subject, style and framing exactly, with no stray text or artefacts.',
  business: 'The plan is sequenced, realistic under the stated constraints, and defines what "done" looks like.',
  education: 'The explanation starts from the stated level, builds intuition before detail, and includes a concrete example.',
  general: 'The answer addresses the actual objective, in the requested shape, without padding.',
};

export function composePrompt(input: ComposeInput): string {
  const { original, taskType } = input;
  const fields = input.fields;
  const keepOriginal = input.preserveOriginal !== false;
  const sections: Section[] = [];

  // The task type is stated explicitly: `software`, `coding` and `website`
  // share a role family, and without this line the model cannot tell a
  // debugging request from a build request.
  sections.push({
    heading: 'Role',
    lines: [`You are ${ROLE[taskType]}.`, `Task type: ${taskType}.`],
  });

  if (keepOriginal) {
    sections.push({
      heading: 'My request, in my own words',
      lines: [`“${squash(original)}”`],
    });
  }

  const taskSections = taskSpecificSections(taskType, fields, original, keepOriginal, input.labels ?? {});
  sections.push(...taskSections);

  const shared = sharedLines(fields);
  if (shared.length > 0) {
    sections.push({ heading: 'Shared requirements', lines: shared });
  }

  sections.push({ heading: 'What a good result looks like', lines: [SUCCESS[taskType]] });

  sections.push({
    heading: 'Precedence',
    lines: [
      'Where this brief and my original request disagree, my original request wins.',
      'If something is still genuinely ambiguous, state your assumption in one line and proceed — do not stall.',
    ],
  });

  return sections
    .filter((s) => s.lines.filter((l) => l.trim() !== '').length > 0)
    .map((s) => `## ${s.heading}\n${s.lines.join('\n')}`)
    .join('\n\n');
}

/** Slots rendered under "Shared requirements" for every task type. */
const SHARED_ORDER = ['output_format', 'deadline', 'language_out', 'budget'];

function sharedLines(fields: Record<string, string | string[]>): string[] {
  const lines: string[] = [];
  for (const slot of SHARED_ORDER) {
    if (slot === 'budget' && fields['budget'] === undefined) continue;
    const line = bullet(labelFor(slot), fields[slot]);
    if (line !== '') lines.push(line);
  }
  return lines;
}

function labelFor(slot: string): string {
  const map: Record<string, string> = {
    purpose: 'Purpose',
    site_type: 'Site type',
    audience: 'Audience',
    pages: 'Pages',
    design_direction: 'Design direction',
    features: 'Features',
    tech_stack: 'Stack',
    backend: 'Backend',
    auth: 'Authentication',
    database: 'Database',
    deployment: 'Deployment',
    content: 'Content',
    platform: 'Platform',
    language: 'Language',
    framework: 'Framework',
    constraints: 'Constraints',
    interfaces: 'Interfaces',
    data_storage: 'Data storage',
    scale: 'Scale',
    output_shape: 'Deliverable',
    testing: 'Tests',
    mobile_os: 'Mobile platform',
    notifications: 'Notifications',
    store: 'Distribution',
    goal: 'Goal',
    problem: 'Problem / code',
    context: 'Context',
    error: 'Error',
    level: 'Level',
    content_type: 'Content type',
    topic: 'Topic',
    tone: 'Tone',
    length: 'Length',
    structure: 'Structure',
    must_include: 'Must include',
    question: 'Research question',
    scope: 'Scope',
    decision: 'Decision it informs',
    depth: 'Depth',
    sources: 'Sources',
    recency: 'Recency',
    geography: 'Geography',
    output_format: 'Output format',
    subject: 'Subject',
    style: 'Style',
    composition: 'Composition',
    environment: 'Environment',
    lighting: 'Lighting',
    aspect_ratio: 'Aspect ratio',
    palette: 'Palette',
    text_in_image: 'Text in image',
    offering: 'Offering',
    market: 'Market',
    stage: 'Stage',
    timeframe: 'Timeframe',
    budget: 'Budget',
    language_out: 'Output language',
    deadline: 'Deadline',
    deliverable: 'Deliverable',
    must_avoid: 'Must avoid',
  };
  return map[slot] ?? capitalize(slot.replace(/[_.]+/g, ' '));
}


/**
 * True when a value merely restates the user's own words.
 *
 * The engine extracts `purpose` from the prompt itself, so it is usually a
 * paraphrase of the sentence printed directly above it under "My request".
 * Repeating it as a requirement reads like padding and makes the brief look
 * generated rather than considered. Only genuinely *added* information is
 * rendered.
 */
function restatesOriginal(value: string, original: string): boolean {
  const words = squash(value)
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((w) => w.length > 2);
  if (words.length === 0) return true;
  const source = ` ${squash(original).toLowerCase()} `;
  const hits = words.filter((w) => source.includes(w)).length;
  return hits / words.length >= 0.8;
}

function bullet(label: string, value: string | string[] | undefined): string {
  const list = asList(value).map((v) => squash(v)).filter((v) => v !== '');
  if (list.length === 0) return '';
  if (list.length === 1) return `- ${label}: ${bare(list[0]!)}`;
  return `- ${label}: ${list.map((v) => bare(v)).join('; ')}`;
}

function section(heading: string, lines: string[]): Section | null {
  const kept = lines.filter((l) => l.trim() !== '');
  return kept.length > 0 ? { heading, lines: kept } : null;
}

function taskSpecificSections(
  taskType: TaskType,
  f: Record<string, string | string[]>,
  original: string,
  keepOriginal: boolean,
  labels: Record<string, string> = {},
): Section[] {
  const out: Section[] = [];
  const add = (s: Section | null) => { if (s) out.push(s); };
  /** Render an extracted purpose only when it adds something. */
  const showPurpose = (value: string): boolean =>
    !(keepOriginal && restatesOriginal(value, original));

  switch (taskType) {
    case 'website':
      add(section('What I am building', [
        f.purpose && showPurpose(String(f.purpose))
          ? `- Purpose: ${bare(String(f.purpose))}`
          : '',
        bullet('Site type', f.site_type),
        bullet('Audience', f.audience),
      ]));
      add(section('Pages', asList(f.pages).map((p) => `- ${bare(p)}`)));
      add(section('Design direction', [
        bullet('Direction', f.design_direction),
        'The design should feel considered and consistent — real typographic hierarchy, generous spacing, no placeholder lorem that changes the layout.',
      ]));
      add(section('Features', asList(f.features).map((x) => `- ${bare(x)}`)));
      add(section('Technical', [
        bullet('Stack', f.tech_stack),
        bullet('Backend', f.backend),
        bullet('Authentication', f.auth),
        bullet('Database', f.database),
        bullet('Deployment', f.deployment),
      ]));
      add(section('Content', [bullet('Content status', f.content)]));
      break;

    case 'software':
      // `purpose` is extracted from the user's own words and appears verbatim
      // under "My request" already; only add it when it says something new.
      add(section('What it must do', [
        f.purpose && showPurpose(String(f.purpose))
          ? `- ${bare(String(f.purpose))}`
          : '',
      ]));
      add(section('Functional requirements', asList(f.features).map((x) => `- ${bare(x)}`)));
      add(section('Technical', [
        bullet('Runtime', f.platform),
        bullet('Language', f.language),
        bullet('Framework', f.framework),
        bullet('Interfaces', f.interfaces),
        bullet('Data storage', f.data_storage),
        bullet('Scale', f.scale),
      ]));
      add(section('Constraints', asList(f.constraints).map((x) => `- ${bare(x)}`)));
      add(section('Deliverable', [
        bullet('Form', f.output_shape),
        bullet('Tests', f.testing),
      ]));
      break;

    case 'mobile':
      add(section('What the app does', [
        f.purpose && showPurpose(String(f.purpose))
          ? `- ${bare(String(f.purpose))}`
          : '',
      ]));
      add(section('Target', [bullet('Platform', f.mobile_os), bullet('Users', f.audience)]));
      add(section('Features', asList(f.features).map((x) => `- ${bare(x)}`)));
      add(section('Technical', [
        bullet('Framework', f.framework),
        bullet('Backend', f.backend),
        bullet('Authentication', f.auth),
        bullet('Notifications', f.notifications),
        bullet('Distribution', f.store),
      ]));
      add(section('Design direction', [bullet('Direction', f.design_direction)]));
      break;

    case 'coding':
      add(section('What I need', [bullet('Kind of help', f.goal), bullet('Level', f.level)]));
      add(section('Code / problem', [f.problem ? String(f.problem) : '']));
      add(section('Error', [f.error ? String(f.error) : '']));
      add(section('Environment', [
        bullet('Language / runtime', f.language),
        bullet('Codebase context', f.context),
        bullet('Constraints', f.constraints),
      ]));
      add(section('Answer shape', [bullet('Preferred form', f.output_shape)]));
      break;

    case 'writing':
      add(section('Brief', [
        bullet('Format', f.content_type),
        bullet('Topic', f.topic),
        bullet('Audience', f.audience),
        bullet('Purpose', f.purpose),
      ]));
      add(section('Style', [
        bullet('Tone', f.tone),
        bullet('Length', f.length),
        bullet('Structure', f.structure),
        bullet('Language', f.language_out),
      ]));
      add(section('Must include', [f.must_include ? String(f.must_include) : '']));
      break;

    case 'research':
      add(section('Research question', [f.question ? String(f.question) : '']));
      add(section('Scope', [
        bullet('Focus areas', f.scope),
        bullet('Geography / market', f.geography),
        bullet('Recency', f.recency),
        bullet('Depth', f.depth),
      ]));
      add(section('What it informs', [f.decision ? String(f.decision) : '']));
      add(section('Sources and output', [
        bullet('Preferred sources', f.sources),
        bullet('Output shape', f.output_format),
      ]));
      break;

    case 'image': {
      const description = [
        f.subject ? bare(String(f.subject)) : '',
        f.environment ? `setting: ${bare(String(f.environment))}` : '',
        f.style ? `style: ${bare(String(f.style))}` : '',
        f.composition ? `composition: ${bare(String(f.composition))}` : '',
        f.lighting ? `lighting/mood: ${bare(String(f.lighting))}` : '',
        f.palette ? `palette: ${bare(String(f.palette))}` : '',
        f.aspect_ratio ? `aspect ratio: ${bare(String(f.aspect_ratio))}` : '',
        f.purpose ? `intended use: ${bare(String(f.purpose))}` : '',
      ].filter((x) => x !== '');
      add(section('Image description', [description.length > 0 ? `${capitalize(description.join('; '))}.` : '']));
      add(section('Text in image', [f.text_in_image ? String(f.text_in_image) : '']));
      add(section('Avoid', [
        '- Distorted anatomy, duplicated limbs, watermark artefacts, and garbled text.',
      ]));
      break;
    }

    case 'business':
      add(section('Goal', [bullet('Outcome', f.goal), bullet('Stage', f.stage)]));
      add(section('Offer and market', [
        bullet('Offering', f.offering),
        bullet('Target market', f.market),
      ]));
      add(section('Constraints', [
        bullet('Timeframe', f.timeframe),
        bullet('Budget', f.budget),
        ...asList(f.constraints).map((x) => `- ${bare(x)}`),
      ]));
      add(section('Deliverable', [bullet('Form', f.output_shape)]));
      break;

    case 'education':
      add(section('What I want to learn', [f.topic ? String(f.topic) : '']));
      add(section('Starting point', [
        bullet('Current level', f.level),
        bullet('Goal', f.goal),
        bullet('Time available', f.timeframe),
      ]));
      add(section('How to explain it', [
        bullet('Depth', f.depth),
        bullet('Preferred style', f.style),
        bullet('Language', f.language_out),
      ]));
      break;

    default:
      add(section('Objective', [f.goal ? String(f.goal) : '']));
      add(section('Context', [f.context ? String(f.context) : '']));
      add(section('Expected output', [
        bullet('Format', f.output_format),
        bullet('Audience', f.audience),
        bullet('Depth', f.depth),
      ]));
  }

  // Any extra slots the AI engine contributed that are not in the schema.
  const known = new Set(schemaFor(taskType).map((s) => s.id));
  const extras = Object.entries(f).filter(
    ([key, value]) => !known.has(key) && !SHARED_ORDER.includes(key) && asList(value).length > 0,
  );
  if (extras.length > 0) {
    add(section('Additional requirements', extras.map(([key, value]) => bullet(labels[key] ?? labelFor(key), value))));
  }

  return out;
}

/** One-line summary of what was collected, for the review screen. */
export function summariseRequirements(taskType: TaskType, fields: Record<string, string | string[]>): string[] {
  const lines: string[] = [];
  for (const slot of schemaFor(taskType)) {
    const list = asList(fields[slot.id]).filter((v) => squash(v) !== '');
    if (list.length === 0) continue;
    lines.push(`${slot.label}: ${clip(joinNatural(unique(list), 'and'), 80)}`);
  }
  return lines;
}

export function promptTitle(taskType: TaskType, model: RequirementModel): string {
  const subject = model.subject || model.domain || 'request';
  return `${capitalize(subject)} — ${taskType} brief`;
}
