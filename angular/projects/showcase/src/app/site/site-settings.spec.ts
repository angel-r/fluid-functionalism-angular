import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Icon, provideFluid } from '@angel-r/fluid-functionalism-angular';
import { provideSiteIcons } from './site-icons';
import { SiteSettingsService } from './site-settings.service';
import { SETTINGS_KEYS } from './site-settings';

@Component({ selector: 'app-site-probe', imports: [Icon], template: `<ff-icon name="check" />` })
class CheckProbe {}

const configure = () =>
  TestBed.configureTestingModule({
    providers: [provideFluid({ icons: {} }), provideSiteIcons()],
  });

describe('SiteSettingsService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('repaints every icon when the Icons setting changes', () => {
    configure();
    const settings = TestBed.inject(SiteSettingsService);
    const fixture = TestBed.createComponent(CheckProbe);
    fixture.detectChanges();
    TestBed.tick();
    const el = fixture.nativeElement as HTMLElement;

    settings.setIcons('lucide');
    TestBed.tick();
    const lucide = el.querySelector('svg')!.outerHTML;

    settings.setIcons('untitledui');
    TestBed.tick();
    expect(el.querySelector('svg')!.outerHTML).not.toBe(lucide);

    settings.setIcons('lucide');
    TestBed.tick();
    expect(el.querySelector('svg')!.outerHTML).toBe(lucide);
  });

  it('stores a setting when it changes, not before', () => {
    configure();
    const settings = TestBed.inject(SiteSettingsService);
    TestBed.tick();
    expect(localStorage.getItem(SETTINGS_KEYS.size)).toBeNull();

    settings.setSize('compact');
    TestBed.tick();
    expect(localStorage.getItem(SETTINGS_KEYS.size)).toBe('compact');
    expect(document.documentElement.dataset['size']).toBe('compact');

    settings.setIcons('tabler');
    TestBed.tick();
    expect(localStorage.getItem(SETTINGS_KEYS.icons)).toBe('tabler');
  });

  it('cycles the radius, the size and the icon library', () => {
    configure();
    const settings = TestBed.inject(SiteSettingsService);

    settings.cycleShape();
    expect(settings.shape()).toBe('pill');
    settings.cycleSize();
    expect(settings.size()).toBe('compact');
    settings.cycleIcons();
    expect(settings.icons()).toBe('lucide');
  });
});
