import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideFluid } from '@angel-r/fluid-functionalism-angular';
import { provideSiteIcons } from './site-icons';
import { CopyPromptButton } from './copy-prompt-button';

@Component({
  selector: 'app-copy-probe',
  imports: [CopyPromptButton],
  template: `
    <app-copy-prompt-button label="Copy install prompt" prompt="the brief" size="compact" class="w-full" (copiedPrompt)="copies = copies + 1" />
  `,
})
class CopyProbe {
  copies = 0;
}

const render = async () => {
  TestBed.configureTestingModule({ providers: [provideFluid({ icons: {} }), provideSiteIcons()] });
  const fixture = TestBed.createComponent(CopyProbe);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, button: fixture.nativeElement.querySelector('button') as HTMLButtonElement };
};

describe('CopyPromptButton', () => {
  it('lays the glyph out in the Button icon slot at the requested size', async () => {
    const { button } = await render();
    // Compact with a leading icon: 28px tall, 8px on the icon side, 4px gap.
    expect(button.classList).toContain('h-7');
    expect(button.classList).toContain('pl-2');
    expect(button.classList).toContain('gap-1');
    // The caller's width replaces the default w-fit.
    expect(button.classList).toContain('w-full');
    expect(button.classList).not.toContain('w-fit');
    // The label goes through the Button's optically centered label span.
    const label = button.querySelector('[class*="text-box"]');
    expect(label?.textContent?.trim()).toBe('Copy install prompt');
    // Both glyphs share one cell the compact icon size (14px).
    const cell = button.querySelector('.grid') as HTMLElement;
    expect(cell.style.width).toBe('14px');
    expect(cell.querySelectorAll('svg').length).toBe(2);
  });

  it('copies the prompt and announces it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const { fixture, button } = await render();
    button.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(writeText).toHaveBeenCalledWith('the brief');
    expect(fixture.componentInstance.copies).toBe(1);
    expect(button.querySelector('[aria-live]')?.textContent).toBe('Copied');
  });
});
