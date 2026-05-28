import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HeroSectionComponent } from '../components/hero-section.component';
import { FeaturesSectionComponent } from '../components/features-section.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [HeroSectionComponent, FeaturesSectionComponent],
  template: `
    <!-- Navbar -->
    <nav class="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm">
      <div class="flex items-center gap-2">
        <span class="text-2xl">&#9679;</span>
        <span class="text-xl font-bold text-gray-800">Pokédex</span>
      </div>
      <button
        class="text-sm font-medium text-red-500 hover:text-red-600 transition-colors cursor-pointer"
        (click)="goToPokemonList()"
      >
        Browse Pokémon →
      </button>
    </nav>

    <!-- Hero Section -->
    <app-hero-section (viewPokemon)="goToPokemonList()" />

    <!-- Features Section -->
    <app-features-section />

    <!-- Footer -->
    <footer class="text-center py-8 text-sm text-gray-400 border-t border-gray-100">
      Built with Angular 19 · PrimeNG · Tailwind CSS · PokéAPI
    </footer>
  `,
})
export class HomeComponent {
  private router = inject(Router);

  goToPokemonList(): void {
    this.router.navigate(['/pokemon']);
  }
}
