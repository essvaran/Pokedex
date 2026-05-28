import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';

interface FeatureCard {
  icon: string;
  title: string;
  description: string;
  color: string;
}

@Component({
  selector: 'app-features-section',
  standalone: true,
  imports: [CardModule],
  template: `
    <section class="px-6 py-16 bg-gray-50">
      <div class="max-w-5xl mx-auto">

        <!-- Section heading -->
        <h2 class="text-3xl font-bold text-center text-gray-800 mb-2">
          Everything you need
        </h2>
        <p class="text-center text-gray-500 mb-12">
          A complete Pokémon reference in your browser
        </p>

        <!-- Feature cards grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          @for (feature of features; track feature.title) {
            <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
              <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-2xl"
                   [class]="feature.color">
                <i [class]="feature.icon"></i>
              </div>
              <h3 class="text-lg font-semibold text-gray-800 mb-2">{{ feature.title }}</h3>
              <p class="text-gray-500 text-sm leading-relaxed">{{ feature.description }}</p>
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class FeaturesSectionComponent {
  features: FeatureCard[] = [
    {
      icon: 'pi pi-search',
      title: 'Search & Filter',
      description: 'Find any Pokémon instantly by name, ID, type, or region with powerful filtering options.',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      icon: 'pi pi-star',
      title: 'Detailed Stats',
      description: 'View full stats, abilities, height, weight, and evolution chains for every Pokémon.',
      color: 'bg-yellow-100 text-yellow-600',
    },
    {
      icon: 'pi pi-globe',
      title: 'All Regions',
      description: 'Browse Pokémon from Kanto to Paldea — all generations covered in one place.',
      color: 'bg-green-100 text-green-600',
    },
  ];
}
