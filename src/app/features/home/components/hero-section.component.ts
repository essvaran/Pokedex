import { Component, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-hero-section',
  standalone: true,
  imports: [ButtonModule],
  template: `
    <section class="relative flex flex-col items-center justify-center text-center px-6 py-24 overflow-hidden">

      <!-- Background decorative circles -->
      <div class="absolute top-[-80px] left-[-80px] w-96 h-96 bg-red-100 rounded-full opacity-40 blur-3xl"></div>
      <div class="absolute bottom-[-80px] right-[-80px] w-96 h-96 bg-yellow-100 rounded-full opacity-40 blur-3xl"></div>

      <!-- Pokéball icon -->
      <div class="relative mb-6">
        <div class="w-24 h-24 rounded-full border-8 border-gray-800 flex items-center justify-center bg-white shadow-2xl overflow-hidden">
          <div class="absolute top-0 w-full h-1/2 bg-red-500"></div>
          <div class="absolute bottom-0 w-full h-1/2 bg-white"></div>
          <div class="absolute w-8 h-8 bg-white border-4 border-gray-800 rounded-full z-10"></div>
        </div>
      </div>

      <!-- Title -->
      <h1 class="relative text-5xl md:text-7xl font-extrabold text-gray-800 mb-4 tracking-tight">
        Pokédex
      </h1>

      <!-- Subtitle -->
      <p class="relative text-lg md:text-xl text-gray-500 max-w-xl mb-10 leading-relaxed">
        Explore the world of Pokémon. Search, filter, and discover detailed
        information about all your favourite Pokémon from every region.
      </p>

      <!-- CTA Button -->
      <p-button
        label="View Pokémon"
        icon="pi pi-arrow-right"
        iconPos="right"
        size="large"
        (onClick)="viewPokemon.emit()"
        styleClass="!bg-red-500 !border-red-500 hover:!bg-red-600 !px-8 !py-3 !text-lg !font-semibold !rounded-full shadow-lg transition-all duration-200"
      />
    </section>
  `,
})
export class HeroSectionComponent {
  viewPokemon = output<void>();
}
