import { Component, computed, DestroyRef, effect, inject, input, model, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { DialogModule } from 'primeng/dialog';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';

import { PokemonService } from '../../../services/pokemon.service';
import { EvolutionLink, Pokemon, PokemonSpecies } from '../../../shared/models/pokemon.model';
import { getTypeColor, getTypeTextColor } from '../../../shared/utils/type-colors';

// ─── Local interfaces ────────────────────────────────────────────────────────

interface EvolutionStep {
  name: string;
  id: number;
  imageUrl: string;
}

interface LevelUpMove {
  name: string;
  level: number;
}

interface FormVariant {
  pokemonName: string;  // name used for API call, e.g. 'charizard-mega-x'
  label: string;        // display text, e.g. 'Mega X'
  badgeClass: string;   // Tailwind classes for the badge chip
}

// ─── Z-Moves are NOT in a Pokémon's learn set — they are activated by
// Z-Crystals that transform an existing move. We derive them from context:
//   • Generic Z-moves  →  based on the Pokémon's type(s)
//   • Exclusive Z-moves →  hardcoded per Pokémon species

const TYPE_Z_MOVES: Record<string, string> = {
  normal:   'Breakneck Blitz',
  fire:     'Inferno Overdrive',
  water:    'Hydro Vortex',
  electric: 'Gigavolt Havoc',
  grass:    'Bloom Doom',
  ice:      'Subzero Slammer',
  fighting: 'All-Out Pummeling',
  poison:   'Acid Downpour',
  ground:   'Tectonic Rage',
  flying:   'Supersonic Skystrike',
  psychic:  'Shattered Psyche',
  bug:      'Savage Spin-Out',
  rock:     'Continental Crush',
  ghost:    'Never-Ending Nightmare',
  dragon:   'Devastating Drake',
  dark:     'Black Hole Eclipse',
  steel:    'Corkscrew Crash',
  fairy:    'Twinkle Tackle',
};

// keyed by the species name (base form name, lowercase)
const EXCLUSIVE_Z_MOVES: Record<string, string[]> = {
  'pikachu':     ['Catastropika'],
  'pikachu-ash': ['10,000,000 Volt Thunderbolt'],
  'eevee':       ['Extreme Evoboost'],
  'snorlax':     ['Pulverizing Pancake'],
  'mew':         ['Genesis Supernova'],
  'decidueye':   ['Sinister Arrow Raid'],
  'incineroar':  ['Malicious Moonsault'],
  'primarina':   ['Oceanic Operetta'],
  'tapu-koko':   ['Guardian of Alola'],
  'tapu-lele':   ['Guardian of Alola'],
  'tapu-bulu':   ['Guardian of Alola'],
  'tapu-fini':   ['Guardian of Alola'],
  'marshadow':   ['Soul-Stealing 7-Star Strike'],
  'kommo-o':     ['Clangorous Soulblaze'],
  'lycanroc':    ['Splintered Stormshards'],
  'mimikyu':     ["Let's Snuggle Forever"],
  'necrozma':    ['Searing Sunraze Smash', 'Menacing Moonraze Maelstrom', 'Light That Burns the Sky'],
  'lunala':      ['Menacing Moonraze Maelstrom'],
  'solgaleo':    ['Searing Sunraze Smash'],
  'rotom':       ['Storming Oblivion'],
  'alolan-raichu': ['Stoked Sparksurfer'],
};

// ─── Form classification ─────────────────────────────────────────────────────

function classifyForm(pokemonName: string): FormVariant {
  if (pokemonName.includes('-mega-x'))
    return { pokemonName, label: 'Mega X',     badgeClass: 'bg-orange-100 text-orange-700 border-orange-300' };
  if (pokemonName.includes('-mega-y'))
    return { pokemonName, label: 'Mega Y',     badgeClass: 'bg-blue-100 text-blue-700 border-blue-300' };
  if (pokemonName.includes('-mega'))
    return { pokemonName, label: 'Mega',       badgeClass: 'bg-orange-100 text-orange-700 border-orange-300' };
  if (pokemonName.includes('-gmax'))
    return { pokemonName, label: 'Gigantamax', badgeClass: 'bg-red-100 text-red-700 border-red-300' };
  if (pokemonName.includes('-alola'))
    return { pokemonName, label: 'Alolan',     badgeClass: 'bg-yellow-100 text-yellow-700 border-yellow-300' };
  if (pokemonName.includes('-galar'))
    return { pokemonName, label: 'Galarian',   badgeClass: 'bg-purple-100 text-purple-700 border-purple-300' };
  if (pokemonName.includes('-hisui'))
    return { pokemonName, label: 'Hisuian',    badgeClass: 'bg-teal-100 text-teal-700 border-teal-300' };
  if (pokemonName.includes('-paldea'))
    return { pokemonName, label: 'Paldean',    badgeClass: 'bg-indigo-100 text-indigo-700 border-indigo-300' };
  if (pokemonName.includes('-ash'))
    return { pokemonName, label: 'Ash Form',   badgeClass: 'bg-blue-100 text-blue-700 border-blue-300' };

  // Generic — capitalize the suffix
  const parts = pokemonName.split('-');
  const label = parts.slice(1).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return { pokemonName, label: label || pokemonName, badgeClass: 'bg-gray-100 text-gray-700 border-gray-300' };
}

// ─── Component ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-pokemon-detail-dialog',
  standalone: true,
  imports: [DialogModule, SkeletonModule, TagModule, TabsModule, ButtonModule],
  template: `
    <p-dialog
      [visible]="visible()"
      (visibleChange)="visible.set($event)"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '95vw', maxWidth: '820px' }"
      [contentStyle]="{ padding: '0' }"
      styleClass="overflow-hidden rounded-2xl"
    >
      @if (pokemon()) {

        <!-- ── Header ─────────────────────────────────────────────────── -->
        <ng-template pTemplate="header">
          <div class="flex items-center gap-2 w-full flex-wrap">
            <span class="text-xl font-bold capitalize text-gray-800">
              {{ displayPokemon()?.name ?? pokemon()!.name }}
            </span>
            <span class="text-gray-400 font-medium text-sm">{{ formattedId() }}</span>

            @if (activeForm()) {
              <span class="px-2 py-0.5 rounded-full text-xs font-bold border {{ activeFormVariant()?.badgeClass }}">
                {{ activeFormVariant()?.label }}
              </span>
            }
            @if (speciesData()?.is_legendary) {
              <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-300">Legendary</span>
            }
            @if (speciesData()?.is_mythical) {
              <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-300">Mythical</span>
            }
            @if (speciesData()?.is_baby) {
              <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-pink-100 text-pink-700 border border-pink-300">Baby</span>
            }
          </div>
        </ng-template>

        <!-- ── Hero image ─────────────────────────────────────────────── -->
        <div
          class="relative flex items-center justify-center py-8 transition-colors duration-500"
          [style.background-color]="primaryColor()"
        >
          @if (formLoading()) {
            <div class="w-40 h-40 flex items-center justify-center">
              <i class="pi pi-spin pi-spinner text-4xl text-white/60"></i>
            </div>
          } @else {
            <img
              [src]="imageUrl()"
              [alt]="displayPokemon()?.name"
              class="w-40 h-40 object-contain drop-shadow-xl transition-opacity duration-300"
              (error)="onImageError($event)"
            />
          }

          <!-- Shiny toggle -->
          <button
            class="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md transition-all duration-200 cursor-pointer border"
            [class.bg-yellow-400]="showShiny()"
            [class.border-yellow-500]="showShiny()"
            [class.text-yellow-900]="showShiny()"
            [class.bg-white]="!showShiny()"
            [class.border-white]="!showShiny()"
            [class.text-gray-600]="!showShiny()"
            (click)="showShiny.set(!showShiny())"
          >
            ✨ {{ showShiny() ? 'Shiny' : 'Normal' }}
          </button>

          <!-- Generation label -->
          @if (generationName()) {
            <span class="absolute bottom-3 left-3 px-2 py-0.5 rounded-full text-xs font-semibold bg-white/70 text-gray-600">
              {{ generationName() }}
            </span>
          }
        </div>

        <!-- ── Form selector ─────────────────────────────────────────── -->
        @if (formVariants().length > 0) {
          <div class="px-4 py-3 bg-gray-50 border-b border-gray-100 flex gap-2 flex-wrap items-center">
            <span class="text-xs text-gray-400 font-medium mr-1">Forms:</span>

            <!-- Base form button -->
            <button
              class="px-3 py-1 rounded-full text-xs font-semibold border cursor-pointer transition-all duration-150"
              [class.bg-gray-700]="!activeForm()"
              [class.text-white]="!activeForm()"
              [class.border-gray-700]="!activeForm()"
              [class.bg-white]="!!activeForm()"
              [class.text-gray-600]="!!activeForm()"
              [class.border-gray-300]="!!activeForm()"
              (click)="selectForm(null)"
            >
              Base
            </button>

            @for (variant of formVariants(); track variant.pokemonName) {
              <button
                class="px-3 py-1 rounded-full text-xs font-semibold border cursor-pointer transition-all duration-150 {{ variant.badgeClass }}"
                [class.ring-2]="activeForm() === variant.pokemonName"
                [class.ring-offset-1]="activeForm() === variant.pokemonName"
                [class.ring-gray-400]="activeForm() === variant.pokemonName"
                [class.opacity-60]="formLoading() && activeForm() !== variant.pokemonName"
                [disabled]="formLoading()"
                (click)="selectForm(variant.pokemonName)"
              >
                {{ variant.label }}
              </button>
            }
          </div>
        }

        <!-- ── Tabs ──────────────────────────────────────────────────── -->
        <p-tabs value="about">
          <p-tablist>
            <p-tab value="about">About</p-tab>
            <p-tab value="stats">Base Stats</p-tab>
            <p-tab value="moves">Moves</p-tab>
            <p-tab value="evolution">Evolution</p-tab>
          </p-tablist>

          <p-tabpanels>

            <!-- ── ABOUT ───────────────────────────────────────────── -->
            <p-tabpanel value="about">
              <div class="p-4 flex flex-col gap-5">

                <!-- Pokédex entry -->
                @if (evolutionLoading()) {
                  <p-skeleton height="3rem" />
                } @else if (flavorText()) {
                  <p class="text-sm text-gray-600 italic leading-relaxed bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                    "{{ flavorText() }}"
                  </p>
                }

                <!-- Physical -->
                <div>
                  <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Physical</p>
                  <div class="grid grid-cols-3 gap-3">
                    <div class="bg-gray-50 rounded-xl p-3 text-center">
                      <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Height</p>
                      <p class="text-base font-bold text-gray-800">{{ heightMeters() }}</p>
                    </div>
                    <div class="bg-gray-50 rounded-xl p-3 text-center">
                      <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Weight</p>
                      <p class="text-base font-bold text-gray-800">{{ weightKg() }}</p>
                    </div>
                    <div class="bg-gray-50 rounded-xl p-3 text-center">
                      <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Base EXP</p>
                      <p class="text-base font-bold text-gray-800">{{ displayPokemon()?.base_experience ?? '—' }}</p>
                    </div>
                  </div>
                </div>

                <!-- Training -->
                @if (speciesData()) {
                  <div>
                    <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Training</p>
                    <div class="grid grid-cols-2 gap-3">
                      <div class="bg-gray-50 rounded-xl p-3 text-center">
                        <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Catch Rate</p>
                        <p class="text-base font-bold text-gray-800">{{ speciesData()!.capture_rate }}</p>
                        <p class="text-xs text-gray-400">/ 255</p>
                      </div>
                      <div class="bg-gray-50 rounded-xl p-3 text-center">
                        <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Base Happiness</p>
                        <p class="text-base font-bold text-gray-800">{{ speciesData()!.base_happiness }}</p>
                        <p class="text-xs text-gray-400">/ 255</p>
                      </div>
                    </div>
                  </div>

                  <!-- Breeding -->
                  <div>
                    <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Breeding</p>
                    <div class="flex flex-col gap-3">
                      @if (genderInfo()?.type === 'genderless') {
                        <div class="flex items-center gap-2">
                          <span class="text-xs text-gray-500 w-20 shrink-0">Gender</span>
                          <span class="text-sm text-gray-500 italic">Genderless</span>
                        </div>
                      } @else if (genderInfo()?.type === 'gendered') {
                        <div class="flex items-center gap-2">
                          <span class="text-xs text-gray-500 w-20 shrink-0">Gender</span>
                          <div class="flex-1 h-3 rounded-full overflow-hidden flex">
                            <div class="bg-blue-400 h-full" [style.width]="genderInfo()!.male + '%'"></div>
                            <div class="bg-pink-400 h-full" [style.width]="genderInfo()!.female + '%'"></div>
                          </div>
                          <span class="text-xs text-blue-500 font-medium">♂ {{ genderInfo()!.male }}%</span>
                          <span class="text-xs text-pink-500 font-medium">♀ {{ genderInfo()!.female }}%</span>
                        </div>
                      }
                      <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-500 w-20 shrink-0">Egg Groups</span>
                        <span class="text-sm text-gray-700">{{ eggGroups() }}</span>
                      </div>
                    </div>
                  </div>
                }

                <!-- Abilities -->
                <div>
                  <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Abilities</p>
                  <div class="flex flex-col gap-2">
                    @for (abilitySlot of displayPokemon()?.abilities ?? []; track abilitySlot.slot) {
                      <div class="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <span class="capitalize text-sm text-gray-700 font-medium">
                          {{ formatName(abilitySlot.ability.name) }}
                        </span>
                        @if (abilitySlot.is_hidden) {
                          <span class="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">Hidden</span>
                        }
                      </div>
                    }
                  </div>
                </div>

                <!-- Types -->
                <div>
                  <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Types</p>
                  <div class="flex gap-2 flex-wrap">
                    @for (typeSlot of displayPokemon()?.types ?? []; track typeSlot.slot) {
                      <span
                        class="px-4 py-1 rounded-full text-sm font-semibold capitalize"
                        [style.background-color]="getTypeColor(typeSlot.type.name)"
                        [style.color]="getTypeTextColor(typeSlot.type.name)"
                      >
                        {{ typeSlot.type.name }}
                      </span>
                    }
                  </div>
                </div>

              </div>
            </p-tabpanel>

            <!-- ── STATS ────────────────────────────────────────────── -->
            <p-tabpanel value="stats">
              <div class="p-4">
                @if (activeForm() && formLoading()) {
                  <div class="flex flex-col gap-3">
                    @for (i of [1,2,3,4,5,6]; track i) {
                      <p-skeleton height="1.5rem" />
                    }
                  </div>
                } @else {
                  <div class="flex flex-col gap-3">
                    @for (statSlot of displayPokemon()?.stats ?? []; track statSlot.stat.name) {
                      <div class="flex items-center gap-3">
                        <span class="text-xs font-semibold text-gray-500 w-16 text-right shrink-0">
                          {{ statDisplayName(statSlot.stat.name) }}
                        </span>
                        <span class="text-sm font-bold text-gray-700 w-8 shrink-0 text-right">
                          {{ statSlot.base_stat }}
                        </span>
                        <div class="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            class="h-full rounded-full transition-all duration-700"
                            [style.width]="statPercentage(statSlot.base_stat)"
                            [style.background-color]="statBarColor(statSlot.stat.name)"
                          ></div>
                        </div>
                        <span class="text-xs text-gray-400 w-8 shrink-0">/ 200</span>
                      </div>
                    }
                    <div class="flex items-center gap-3 pt-2 border-t border-gray-100">
                      <span class="text-xs font-bold text-gray-600 w-16 text-right shrink-0">TOTAL</span>
                      <span class="text-sm font-bold text-gray-800 w-8 shrink-0 text-right">{{ totalStats() }}</span>
                      <div class="flex-1"></div>
                    </div>
                  </div>
                }
              </div>
            </p-tabpanel>

            <!-- ── MOVES ────────────────────────────────────────────── -->
            <p-tabpanel value="moves">
              <div class="p-4 flex flex-col gap-5">

                <!-- Level-up moves -->
                @if (levelUpMoves().length > 0) {
                  <div>
                    <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      Level-Up Moves
                    </p>
                    <div class="grid grid-cols-2 gap-2">
                      @for (move of levelUpMoves(); track move.name) {
                        <div class="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                          <span
                            class="text-xs font-bold rounded-full w-8 h-8 flex items-center justify-center shrink-0 text-white"
                            [style.background-color]="primaryColor()"
                          >
                            {{ move.level }}
                          </span>
                          <span class="text-sm text-gray-700 capitalize font-medium">
                            {{ formatName(move.name) }}
                          </span>
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- Z-Moves: type-based -->
                @if (typeZMoves().length > 0) {
                  <div>
                    <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      Z-Moves — Type Crystal ⚡
                    </p>
                    <div class="flex flex-wrap gap-2">
                      @for (move of typeZMoves(); track move) {
                        <span class="flex items-center gap-1 px-3 py-1 bg-yellow-50 text-yellow-800 rounded-full text-xs font-semibold border border-yellow-200">
                          ⚡ {{ move }}
                        </span>
                      }
                    </div>
                  </div>
                }

                <!-- Z-Moves: exclusive -->
                @if (exclusiveZMoves().length > 0) {
                  <div>
                    <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      Exclusive Z-Move ⭐
                    </p>
                    <div class="flex flex-wrap gap-2">
                      @for (move of exclusiveZMoves(); track move) {
                        <span class="flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-800 rounded-full text-xs font-semibold border border-purple-200">
                          ⭐ {{ move }}
                        </span>
                      }
                    </div>
                  </div>
                }

                <!-- TM / HM moves -->
                @if (tmMoves().length > 0) {
                  <div>
                    <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      TM / HM Moves ({{ tmMoves().length }})
                    </p>
                    <div class="flex flex-wrap gap-2">
                      @for (move of tmMoves(); track move) {
                        <span class="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100 capitalize">
                          {{ formatName(move) }}
                        </span>
                      }
                    </div>
                  </div>
                }

                <!-- Egg moves -->
                @if (eggMoves().length > 0) {
                  <div>
                    <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      Egg Moves ({{ eggMoves().length }})
                    </p>
                    <div class="flex flex-wrap gap-2">
                      @for (move of eggMoves(); track move) {
                        <span class="px-3 py-1 bg-pink-50 text-pink-700 rounded-full text-xs font-medium border border-pink-100 capitalize">
                          {{ formatName(move) }}
                        </span>
                      }
                    </div>
                  </div>
                }

                @if (levelUpMoves().length === 0 && tmMoves().length === 0 && eggMoves().length === 0 && typeZMoves().length === 0 && exclusiveZMoves().length === 0) {
                  <p class="text-gray-400 text-sm text-center py-6">No move data available.</p>
                }

              </div>
            </p-tabpanel>

            <!-- ── EVOLUTION ────────────────────────────────────────── -->
            <p-tabpanel value="evolution">
              <div class="p-4">
                <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Evolution Chain</p>

                @if (evolutionLoading()) {
                  <div class="flex gap-4 justify-center">
                    @for (i of [1, 2, 3]; track i) {
                      <div class="flex flex-col items-center gap-2">
                        <p-skeleton shape="circle" size="4rem" />
                        <p-skeleton width="4rem" height="0.75rem" />
                      </div>
                    }
                  </div>
                } @else if (evolutionSteps().length <= 1) {
                  <p class="text-gray-400 text-sm text-center py-6">This Pokémon does not evolve.</p>
                } @else {
                  <div class="flex items-center justify-center gap-2 flex-wrap">
                    @for (step of evolutionSteps(); track step.id; let last = $last) {
                      <div class="flex flex-col items-center gap-1">
                        <div
                          class="w-20 h-20 rounded-full flex items-center justify-center border-2 transition-colors duration-200"
                          [class.border-red-400]="step.name === pokemon()!.name"
                          [class.border-gray-200]="step.name !== pokemon()!.name"
                          [style.background-color]="primaryColor() + '33'"
                        >
                          <img [src]="step.imageUrl" [alt]="step.name" class="w-14 h-14 object-contain" />
                        </div>
                        <span class="text-xs capitalize text-gray-600 font-medium">{{ step.name }}</span>
                        <span class="text-xs text-gray-400">#{{ step.id }}</span>
                      </div>
                      @if (!last) {
                        <i class="pi pi-arrow-right text-gray-300 text-lg mb-6"></i>
                      }
                    }
                  </div>
                }
              </div>
            </p-tabpanel>

          </p-tabpanels>
        </p-tabs>

      }
    </p-dialog>
  `,
})
export class PokemonDetailDialogComponent {
  private pokemonService = inject(PokemonService);
  private destroyRef = inject(DestroyRef);

  pokemon = input.required<Pokemon | null>();
  visible = model(false);

  // ── State ─────────────────────────────────────────────────────────────────
  evolutionSteps = signal<EvolutionStep[]>([]);
  evolutionLoading = signal(false);
  speciesData = signal<PokemonSpecies | null>(null);
  showShiny = signal(false);

  // Active form — null means base form, string is the form's pokemon name
  activeForm = signal<string | null>(null);
  activeFormData = signal<Pokemon | null>(null);
  formLoading = signal(false);

  // ── Derived display Pokémon (base or active form) ─────────────────────────
  displayPokemon = computed(() => this.activeFormData() ?? this.pokemon());

  // The FormVariant object for the active form (for badge display)
  activeFormVariant = computed(() => {
    const name = this.activeForm();
    if (!name) return null;
    return classifyForm(name);
  });

  // Non-default forms from species varieties
  formVariants = computed((): FormVariant[] => {
    const varieties = this.speciesData()?.varieties ?? [];
    return varieties
      .filter((v) => !v.is_default)
      .map((v) => classifyForm(v.pokemon.name));
  });

  // ── Display computed values ───────────────────────────────────────────────

  formattedId = computed(() => {
    const p = this.displayPokemon();
    return p ? `#${String(p.id).padStart(3, '0')}` : '';
  });

  imageUrl = computed(() => {
    const p = this.displayPokemon();
    if (!p) return '';
    const base = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork';
    return this.showShiny() ? `${base}/shiny/${p.id}.png` : `${base}/${p.id}.png`;
  });

  primaryColor = computed(() => {
    const firstType = this.displayPokemon()?.types[0]?.type.name || 'normal';
    return getTypeColor(firstType);
  });

  heightMeters = computed(() => {
    const p = this.displayPokemon();
    return p ? `${(p.height / 10).toFixed(1)} m` : '';
  });

  weightKg = computed(() => {
    const p = this.displayPokemon();
    return p ? `${(p.weight / 10).toFixed(1)} kg` : '';
  });

  totalStats = computed(() => {
    const stats = this.displayPokemon()?.stats ?? [];
    return stats.reduce((sum, s) => sum + s.base_stat, 0);
  });

  flavorText = computed(() => {
    const entries = this.speciesData()?.flavor_text_entries;
    if (!entries) return '';
    const entry = entries.find((e) => e.language.name === 'en');
    return entry ? entry.flavor_text.replace(/[\f\n]/g, ' ').trim() : '';
  });

  generationName = computed(() => {
    const gen = this.speciesData()?.generation.name ?? '';
    if (!gen) return '';
    const num = gen.replace('generation-', '');
    const roman: Record<string, string> = {
      i: 'I', ii: 'II', iii: 'III', iv: 'IV',
      v: 'V', vi: 'VI', vii: 'VII', viii: 'VIII', ix: 'IX',
    };
    return `Gen ${roman[num] ?? num.toUpperCase()}`;
  });

  genderInfo = computed(() => {
    const species = this.speciesData();
    if (!species) return null;
    if (species.gender_rate === -1) return { type: 'genderless' as const, male: 0, female: 0 };
    const female = Math.round((species.gender_rate / 8) * 100);
    return { type: 'gendered' as const, male: 100 - female, female };
  });

  eggGroups = computed(() => {
    const groups = this.speciesData()?.egg_groups ?? [];
    return groups.map((e) => this.formatName(e.name)).join(', ') || '—';
  });

  // Moves always come from the base Pokémon (forms share the move pool)
  levelUpMoves = computed((): LevelUpMove[] => {
    const moves = this.pokemon()?.moves;
    if (!moves?.length) return [];
    const map = new Map<string, number>();
    moves.forEach((slot) => {
      slot.version_group_details.forEach((d) => {
        if (d.move_learn_method.name === 'level-up' && d.level_learned_at > 0) {
          const cur = map.get(slot.move.name);
          if (cur === undefined || d.level_learned_at < cur) {
            map.set(slot.move.name, d.level_learned_at);
          }
        }
      });
    });
    return Array.from(map.entries())
      .map(([name, level]) => ({ name, level }))
      .sort((a, b) => a.level - b.level)
      .slice(0, 30);
  });

  // Generic Z-moves this Pokémon can use — one per type it has
  typeZMoves = computed((): string[] => {
    const types = this.displayPokemon()?.types ?? [];
    return types
      .map((t) => TYPE_Z_MOVES[t.type.name])
      .filter((z): z is string => !!z);
  });

  // Exclusive Z-moves hardcoded to this species
  exclusiveZMoves = computed((): string[] => {
    const name = this.pokemon()?.name ?? '';
    // Check exact match first, then prefix (handles pikachu-ash, lycanroc-dusk, etc.)
    if (EXCLUSIVE_Z_MOVES[name]) return EXCLUSIVE_Z_MOVES[name];
    const prefix = Object.keys(EXCLUSIVE_Z_MOVES).find((k) => name.startsWith(k));
    return prefix ? EXCLUSIVE_Z_MOVES[prefix] : [];
  });

  tmMoves = computed((): string[] => {
    const moves = this.pokemon()?.moves;
    if (!moves?.length) return [];
    return moves
      .filter((slot) => slot.version_group_details.some((d) => d.move_learn_method.name === 'machine'))
      .map((slot) => slot.move.name)
      .slice(0, 40);
  });

  eggMoves = computed((): string[] => {
    const moves = this.pokemon()?.moves;
    if (!moves?.length) return [];
    return moves
      .filter((slot) => slot.version_group_details.some((d) => d.move_learn_method.name === 'egg'))
      .map((slot) => slot.move.name);
  });

  // ── Effects ───────────────────────────────────────────────────────────────

  constructor() {
    effect(() => {
      const p = this.pokemon();
      const isOpen = this.visible();

      if (p && isOpen) {
        this.showShiny.set(false);
        this.activeForm.set(null);
        this.activeFormData.set(null);
        this.loadSpeciesAndEvolution(p.id);
      } else {
        this.evolutionSteps.set([]);
        this.speciesData.set(null);
        this.activeForm.set(null);
        this.activeFormData.set(null);
      }
    });
  }

  // ── Public actions ────────────────────────────────────────────────────────

  selectForm(formName: string | null): void {
    if (formName === null) {
      this.activeForm.set(null);
      this.activeFormData.set(null);
      this.showShiny.set(false);
      return;
    }
    if (formName === this.activeForm()) return;

    this.activeForm.set(formName);
    this.activeFormData.set(null);
    this.formLoading.set(true);
    this.showShiny.set(false);

    this.pokemonService
      .getPokemonDetail(formName)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.activeFormData.set(data);
          this.formLoading.set(false);
        },
        error: () => {
          // Form not found — fall back to base
          this.activeForm.set(null);
          this.activeFormData.set(null);
          this.formLoading.set(false);
        },
      });
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    const p = this.displayPokemon();
    if (!p) return;
    // Fallback to regular (non-shiny) sprite, then to front_default
    if (this.showShiny()) {
      img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.id}.png`;
    } else {
      img.src = p.sprites?.front_default ?? '';
    }
  }

  // ── Private loaders ──────────────────────────────────────────────────────

  private loadSpeciesAndEvolution(pokemonId: number): void {
    this.evolutionLoading.set(true);
    this.speciesData.set(null);

    this.pokemonService
      .getSpeciesAndEvolution(pokemonId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ species, chain }) => {
          this.speciesData.set(species);
          this.evolutionSteps.set(this.flattenChain(chain.chain));
          this.evolutionLoading.set(false);
        },
        error: () => {
          this.evolutionLoading.set(false);
        },
      });
  }

  private flattenChain(link: EvolutionLink): EvolutionStep[] {
    const id = this.pokemonService.getIdFromUrl(link.species.url);
    const steps: EvolutionStep[] = [{
      name: link.species.name,
      id,
      imageUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
    }];
    if (link.evolves_to.length > 0) {
      steps.push(...this.flattenChain(link.evolves_to[0]));
    }
    return steps;
  }

  // ── Stat helpers ─────────────────────────────────────────────────────────

  statDisplayName(statName: string): string {
    const map: Record<string, string> = {
      hp: 'HP', attack: 'ATK', defense: 'DEF',
      'special-attack': 'SP.ATK', 'special-defense': 'SP.DEF', speed: 'SPD',
    };
    return map[statName] ?? statName;
  }

  statPercentage(value: number): string {
    return `${Math.min(Math.round((value / 200) * 100), 100)}%`;
  }

  statBarColor(statName: string): string {
    const map: Record<string, string> = {
      hp: '#ef4444', attack: '#f97316', defense: '#eab308',
      'special-attack': '#3b82f6', 'special-defense': '#22c55e', speed: '#ec4899',
    };
    return map[statName] ?? '#6b7280';
  }

  formatName(name: string): string {
    return name.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  getTypeColor = getTypeColor;
  getTypeTextColor = getTypeTextColor;
}
