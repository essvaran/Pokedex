import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/pages/home.component').then(
        (m) => m.HomeComponent
      ),
  },
  {
    path: 'pokemon',
    loadComponent: () =>
      import('./features/pokemon-list/pages/pokemon-list.component').then(
        (m) => m.PokemonListComponent
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
