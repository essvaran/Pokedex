import { TitleCasePipe } from '@angular/common';
import { Component, computed, DestroyRef, effect, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';

import { SkeletonModule } from 'primeng/skeleton';
import { ButtonModule } from 'primeng/button';

import { PokemonService } from '../../../services/pokemon.service';
import { Pokemon } from '../../../shared/models/pokemon.model';
import { PokemonCardComponent } from '../components/pokemon-card.component';
import { FilterPanelComponent } from '../components/filter-panel.component';
import { PokemonDetailDialogComponent } from '../components/pokemon-detail-dialog.component';

// ID ranges used by the filter computed signal
const REGION_RANGES: Record<string, [number, number]> = {
  kanto:  [1,    151],
  johto:  [152,  251],
  hoenn:  [252,  386],
  sinnoh: [387,  493],
  unova:  [494,  649],
  kalos:  [650,  721],
  alola:  [722,  809],
  galar:  [810,  905],
  paldea: [906, 1025],
};

// API parameters (limit + offset) for each region
const REGION_API_CONFIG: Record<string, { limit: number; offset: number }> = {
  kanto:  { limit: 151, offset: 0   },
  johto:  { limit: 100, offset: 151 },
  hoenn:  { limit: 135, offset: 251 },
  sinnoh: { limit: 107, offset: 386 },
  unova:  { limit: 156, offset: 493 },
  kalos:  { limit: 72,  offset: 649 },
  alola:  { limit: 88,  offset: 721 },
  galar:  { limit: 96,  offset: 809 },
  paldea: { limit: 120, offset: 905 },
};

@Component({
  selector: 'app-pokemon-list',
  standalone: true,
  imports: [PokemonCardComponent, FilterPanelComponent, PokemonDetailDialogComponent, SkeletonModule, ButtonModule, TitleCasePipe],
  template: `
    <!-- Navbar -->
    <nav class="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center gap-4 shadow-sm">
      <button
        class="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
        (click)="goHome()"
      >
        <i class="pi pi-arrow-left text-xs"></i>
        Back
      </button>
      <div class="flex-1">
        <h1 class="text-xl font-bold text-gray-800">Pokédex</h1>
      </div>
      <span class="text-sm text-gray-400">
        {{ filteredPokemons().length }} / {{ pokemons().length }} Pokémon
      </span>
    </nav>

    <!-- Filter Panel -->
    <app-filter-panel
      [(search)]="searchQuery"
      [(selectedType)]="selectedType"
      [(selectedRegion)]="selectedRegion"
      [(sortOption)]="sortOption"
    />

    <!-- Region loading banner — shows while a new region is being fetched -->
    @if (regionLoading()) {
      <div class="bg-blue-50 border-b border-blue-100 px-6 py-2 flex items-center gap-2 text-sm text-blue-600">
        <i class="pi pi-spin pi-spinner"></i>
        Loading {{ selectedRegion() | titlecase }} Pokémon...
      </div>
    }

    <main class="max-w-7xl mx-auto px-4 py-8">

      <!-- Error State -->
      @if (error()) {
        <div class="flex flex-col items-center justify-center py-24 gap-4">
          <i class="pi pi-exclamation-triangle text-5xl text-red-400"></i>
          <p class="text-gray-600 text-lg">{{ error() }}</p>
          <p-button label="Try Again" icon="pi pi-refresh" (onClick)="loadPokemon()" />
        </div>
      }

      <!-- Initial Loading State — full skeleton grid -->
      @if (loading()) {
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          @for (item of skeletonItems; track item) {
            <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <p-skeleton height="9rem" styleClass="rounded-none" />
              <div class="p-3 flex flex-col items-center gap-2">
                <p-skeleton width="70%" height="1rem" />
                <p-skeleton width="50%" height="1.25rem" borderRadius="9999px" />
              </div>
            </div>
          }
        </div>
      }

      <!-- Empty State -->
      @if (!loading() && !error() && filteredPokemons().length === 0 && !regionLoading()) {
        <div class="flex flex-col items-center justify-center py-24 gap-3">
          <i class="pi pi-search text-5xl text-gray-300"></i>
          <p class="text-gray-500 text-lg">No Pokémon match your filters.</p>
          <p class="text-gray-400 text-sm">Try adjusting your search or clearing the filters.</p>
        </div>
      }

      <!-- Data State -->
      @if (!loading() && !error() && filteredPokemons().length > 0) {
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          @for (pokemon of filteredPokemons(); track pokemon.id) {
            <app-pokemon-card
              [pokemon]="pokemon"
              (cardClick)="onCardClick($event)"
            />
          }
        </div>
      }

    </main>

    <!-- Detail Dialog -->
    <app-pokemon-detail-dialog
      [pokemon]="selectedPokemon()"
      [(visible)]="dialogVisible"
    />
  `,
})
export class PokemonListComponent implements OnInit {
  private pokemonService = inject(PokemonService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);

  // ── Source data ───────────────────────────────────────────
  pokemons = signal<Pokemon[]>([]);
  loading = signal<boolean>(true);        // initial full-page skeleton
  regionLoading = signal<boolean>(false); // subtle banner for region loads
  error = signal<string | null>(null);

  // Tracks which regions have already been fetched (avoids duplicate calls)
  private loadedRegions = new Set<string>();

  // ── Dialog ────────────────────────────────────────────────
  selectedPokemon = signal<Pokemon | null>(null);
  dialogVisible = signal(false);

  // ── Filters ───────────────────────────────────────────────
  searchQuery = signal('');
  selectedType = signal('');
  selectedRegion = signal('');
  sortOption = signal('id-asc');

  // ── Derived filtered + sorted list ───────────────────────
  filteredPokemons = computed(() => {
    let result = this.pokemons();

    const query = this.searchQuery().trim().toLowerCase();
    if (query) {
      result = result.filter(
        (p) => p.name.toLowerCase().includes(query) || String(p.id).includes(query)
      );
    }

    const type = this.selectedType();
    if (type) {
      result = result.filter((p) => p.types.some((t) => t.type.name === type));
    }

    const region = this.selectedRegion();
    if (region && REGION_RANGES[region]) {
      const [min, max] = REGION_RANGES[region];
      result = result.filter((p) => p.id >= min && p.id <= max);
    }

    const sort = this.sortOption();
    return [...result].sort((a, b) => {
      switch (sort) {
        case 'name-asc':  return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'id-desc':   return b.id - a.id;
        default:          return a.id - b.id;
      }
    });
  });

  skeletonItems = Array(18).fill(0);

  constructor() {
    // React to region selection — fetch only if not already loaded
    effect(() => {
      const region = this.selectedRegion();
      if (region && !this.loadedRegions.has(region)) {
        this.loadRegion(region);
      }
    });
  }

  ngOnInit(): void {
    this.loadPokemon();
  }

  // Initial load — Kanto
  loadPokemon(): void {
    this.loading.set(true);
    this.error.set(null);

    this.pokemonService
      .getPokemonList(151, 0)
      .pipe(
        switchMap((response) => this.pokemonService.getPokemonBatch(response.results)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (data) => {
          this.pokemons.set(data.sort((a, b) => a.id - b.id));
          this.loadedRegions.add('kanto');
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Failed to load Pokémon. Check your connection and try again.');
          this.loading.set(false);
        },
      });
  }

  // On-demand region load — triggered by effect() when region changes
  private loadRegion(region: string): void {
    const config = REGION_API_CONFIG[region];
    if (!config) return;

    this.regionLoading.set(true);

    this.pokemonService
      .getPokemonList(config.limit, config.offset)
      .pipe(
        switchMap((response) => this.pokemonService.getPokemonBatch(response.results)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (data) => {
          // Merge new Pokémon into the existing list, sorted by ID
          this.pokemons.update((existing) => {
            const existingIds = new Set(existing.map((p) => p.id));
            const newOnes = data.filter((p) => !existingIds.has(p.id));
            return [...existing, ...newOnes].sort((a, b) => a.id - b.id);
          });
          this.loadedRegions.add(region);
          this.regionLoading.set(false);
        },
        error: () => {
          this.error.set(`Failed to load ${region} Pokémon. Please try again.`);
          this.regionLoading.set(false);
        },
      });
  }

  onCardClick(pokemon: Pokemon): void {
    this.selectedPokemon.set(pokemon);
    this.dialogVisible.set(true);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
