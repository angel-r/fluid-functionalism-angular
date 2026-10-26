import { Routes } from '@angular/router';
import { demos } from './demos/registry';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: demos[0].slug },
  ...demos.map((demo) => ({ path: demo.slug, title: demo.title, loadComponent: demo.load })),
  { path: '**', redirectTo: '' },
];
