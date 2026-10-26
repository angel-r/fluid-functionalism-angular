import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DemoPage } from '../../shared/demo-page';

@Component({
  selector: 'app-file-thumbnail-demo',
  imports: [DemoPage],
  template: `<app-demo-page title='File thumbnail' description='Port in progress.' />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class FileThumbnailDemo {}
