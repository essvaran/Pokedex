import { Component, computed, input, output } from '@angular/core';
import { Pokemon } from '../../../shared/models/pokemon.model';
import { getTypeColor, getTypeTextColor } from '../../../shared/utils/type-colors';

@Component({
  selector: 'app-pokemon-card',
  standalone: true,
  imports: [],
  template: `
    <div
      class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer
             hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group"
      (click)="cardClick.emit(pokemon())"
    >
      <!-- Card image area -->
      <div
        class="relative flex items-center justify-center p-4 h-36"
        [style.background-color]="primaryColor()"
      >
        <!-- ID badge -->
        <span class="absolute top-2 left-3 text-xs font-bold opacity-60 text-white">
          {{ formattedId() }}
        </span>

        <!-- Pokemon image -->
        <img
          [src]="imageUrl()"
          [alt]="pokemon().name"
          class="h-28 w-28 object-contain drop-shadow-md group-hover:scale-110 transition-transform duration-200"
          loading="lazy"
        />
      </div>

      <!-- Card info -->
      <div class="p-3 text-center">
        <h3 class="text-sm font-semibold text-gray-800 capitalize mb-2">
          {{ pokemon().name }}
        </h3>

        <!-- Type badges -->
        <div class="flex gap-1 justify-center flex-wrap">
          @for (typeSlot of pokemon().types; track typeSlot.slot) {
            <span
              class="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
              [style.background-color]="getTypeColor(typeSlot.type.name)"
              [style.color]="getTypeTextColor(typeSlot.type.name)"
            >
              {{ typeSlot.type.name }}
            </span>
          }
        </div>
      </div>
    </div>
  `,
})
export class PokemonCardComponent {
  pokemon = input.required<Pokemon>();
  cardClick = output<Pokemon>();

  // Derived signals — auto-update when pokemon() changes
  formattedId = computed(() =>
    `#${String(this.pokemon().id).padStart(3, '0')}`
  );

  imageUrl = computed(() =>
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${this.pokemon().id}.png`
  );

  primaryColor = computed(() => {
    const firstType = this.pokemon().types[0]?.type.name ?? 'normal';
    return getTypeColor(firstType);
  });

  // Expose utility functions to the template
  getTypeColor = getTypeColor;
  getTypeTextColor = getTypeTextColor;
}
