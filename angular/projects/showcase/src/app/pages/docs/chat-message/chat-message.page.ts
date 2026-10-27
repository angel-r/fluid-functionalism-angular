// /docs/chat-message, ported from app/docs/chat-message/page.tsx: a transcript
// with the hover-revealed meta row, the two roles, and a real attachment
// thumbnail. The entrance and layout springs live in the component.

import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ChatMessage, Icon, cn, injectShape } from '@angel-r/fluid-functionalism-angular';
import { ComponentPreview } from '../../../docs-kit/component-preview';
import { DocPage, DocSection } from '../../../docs-kit/doc-page';
import { PropsTable } from '../../../docs-kit/props-table';
import { apiReference } from '../../../docs-kit/api/chat-message';

const conversationCode = `import { ChatMessage } from "@angel-r/fluid-functionalism-angular";

// Timestamp + icon buttons are revealed on hover; their height is always
// reserved, so the gap between bubbles never shifts. The timestamp is a
// user-message affordance — assistant replies show their actions alone.
<ng-template #actions>
  <button type="button" aria-label="Copy">
    <ff-icon name="copy" [size]="13" [strokeWidth]="1.5" />
  </button>
  <button type="button" aria-label="Regenerate">
    <ff-icon name="rotate-ccw" [size]="13" [strokeWidth]="1.5" />
  </button>
</ng-template>

<div class="flex flex-col gap-2">
  <ff-chat-message from="user" time="Wednesday 6:06 PM" [actions]="actions">
    What does "good design" actually mean? Everyone says it, no one defines it.
  </ff-chat-message>
  <ff-chat-message from="assistant" [actions]="actions">
    Good design is mostly invisible — you only notice it when it's missing. It's less about how something looks and more about how effortlessly it lets you do what you came to do.
  </ff-chat-message>
  <ff-chat-message from="user" time="Wednesday 6:07 PM" [actions]="actions">
    So function over form?
  </ff-chat-message>
  <ff-chat-message from="assistant" [actions]="actions">
    Not quite. Form is part of function — something that feels good to use is, in a real sense, working better. The split between the two is mostly a myth.
  </ff-chat-message>
  <ff-chat-message from="user" time="Wednesday 6:08 PM" [actions]="actions">
    That reframes it completely.
  </ff-chat-message>
</div>`;

const rolesCode = `import { ChatMessage } from "@angel-r/fluid-functionalism-angular";

<div class="flex flex-col gap-2">
  <ff-chat-message from="user">Right-aligned accent bubble.</ff-chat-message>
  <ff-chat-message from="assistant">Left-aligned, no background.</ff-chat-message>
</div>`;

const attachmentsCode = `import { ChatMessage } from "@angel-r/fluid-functionalism-angular";

// \`files\` is a standard File[] — e.g. straight from InputMessage's files output.
<ff-chat-message from="user" [files]="files">
  Can you use this as my new avatar?
</ff-chat-message>`;

@Component({
  selector: 'app-chat-message-page',
  imports: [DocPage, DocSection, ComponentPreview, PropsTable, ChatMessage, Icon],
  template: `
    <!-- Icon-only action buttons for the hover-revealed meta row. Assistant
         replies get copy + regenerate; user messages get copy + edit.
         Illustrative only — the buttons carry no behaviour in the docs demo. -->
    <ng-template #userActions>
      <button type="button" aria-label="Copy message" [class]="actionClass()">
        <ff-icon name="copy" [size]="13" [strokeWidth]="1.5" />
      </button>
      <button type="button" aria-label="Edit message" [class]="actionClass()">
        <ff-icon name="pencil" [size]="13" [strokeWidth]="1.5" />
      </button>
    </ng-template>
    <ng-template #assistantActions>
      <button type="button" aria-label="Copy message" [class]="actionClass()">
        <ff-icon name="copy" [size]="13" [strokeWidth]="1.5" />
      </button>
      <button type="button" aria-label="Regenerate response" [class]="actionClass()">
        <ff-icon name="rotate-ccw" [size]="13" [strokeWidth]="1.5" />
      </button>
    </ng-template>

    <app-doc-page
      title="ChatMessage"
      slug="chat-message"
      description="A single chat transcript entry with baked-in entrance and layout motion. Right-aligned accent bubble for the user, left-aligned plain text for the assistant, with optional file attachments and a hover-revealed meta row."
      [installUsage]="conversationCode"
      [installProps]="installProps"
    >
      <app-doc-section title="Conversation">
        <app-component-preview [code]="conversationCode" minHeightClass="min-h-[220px]">
          <div class="w-full max-w-xl flex flex-col gap-2">
            <ff-chat-message from="user" time="Wednesday 6:06 PM" [actions]="userActions">
              What does &ldquo;good design&rdquo; actually mean? Everyone says it, no one defines it.
            </ff-chat-message>
            <ff-chat-message from="assistant" [actions]="assistantActions">
              Good design is mostly invisible — you only notice it when it&rsquo;s missing. It&rsquo;s less about how
              something looks and more about how effortlessly it lets you do what you came to do.
            </ff-chat-message>
            <ff-chat-message from="user" time="Wednesday 6:07 PM" [actions]="userActions">
              So function over form?
            </ff-chat-message>
            <ff-chat-message from="assistant" [actions]="assistantActions">
              Not quite. Form is part of function — something that feels good to use is, in a real sense, working
              better. The split between the two is mostly a myth.
            </ff-chat-message>
            <ff-chat-message from="user" time="Wednesday 6:08 PM" [actions]="userActions">
              That reframes it completely.
            </ff-chat-message>
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Roles">
        <app-component-preview [code]="rolesCode" minHeightClass="min-h-[160px]">
          <div class="w-full max-w-xl flex flex-col gap-2">
            <ff-chat-message from="user">Right-aligned accent bubble.</ff-chat-message>
            <ff-chat-message from="assistant">Left-aligned, no background.</ff-chat-message>
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="Attachments">
        <app-component-preview [code]="attachmentsCode" minHeightClass="min-h-[200px]">
          <div class="w-full max-w-xl flex flex-col gap-2">
            <ff-chat-message from="user" [files]="sampleFiles()">
              Can you use this as my new avatar?
            </ff-chat-message>
            <ff-chat-message from="assistant">
              Looks great — it&rsquo;ll crop cleanly into the circle.
            </ff-chat-message>
          </div>
        </app-component-preview>
      </app-doc-section>

      <app-doc-section title="API Reference">
        <app-props-table [groups]="api" />
      </app-doc-section>
    </app-doc-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ChatMessagePage {
  protected readonly api = apiReference;
  /** One line per prop, for the page's install prompt. */
  protected readonly installProps = this.api.flatMap((table) =>
    table.props
      .filter((prop) => !prop.name.startsWith('<') && !prop.name.startsWith('...'))
      .map((prop) => `${prop.name}: ${prop.type}. ${prop.description}`),
  );

  protected readonly conversationCode = conversationCode;
  protected readonly rolesCode = rolesCode;
  protected readonly attachmentsCode = attachmentsCode;

  private readonly shape = injectShape();
  private readonly destroyRef = inject(DestroyRef);

  protected readonly actionClass = computed(() =>
    cn(
      'inline-flex size-6 items-center justify-center text-muted-foreground hover:text-foreground hover:bg-hover transition-colors duration-100 cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
      this.shape().button,
    ),
  );

  /** A real File so the attachments demo renders an actual thumbnail. Fetched
   *  from the site's profile image at mount (resolves against <base href>, so
   *  it also works under the deployed sub-path) and wrapped as a File. */
  protected readonly sampleFiles = signal<File[]>([]);

  constructor() {
    let cancelled = false;
    this.destroyRef.onDestroy(() => {
      cancelled = true;
    });
    fetch('micka.png')
      .then((res) => res.blob())
      .then((blob) => {
        if (cancelled) return;
        this.sampleFiles.set([new File([blob], 'micka.png', { type: blob.type || 'image/png' })]);
      })
      .catch(() => {});
  }
}
