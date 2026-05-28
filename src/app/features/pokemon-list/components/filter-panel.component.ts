import { Component, computed, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

interface SelectOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-filter-panel',
  standalone: true,
  imports: [
    FormsModule,
    SelectModule,
    InputTextModule,
    ButtonModule,
    IconFieldModule,
    InputIconModule,
  ],
  template: `
    <div class="bg-white border-b border-gray-100 px-4 py-4 shadow-sm">
      <div class="max-w-7xl mx-auto flex flex-wrap gap-3 items-center">

        <!-- Search -->
        <p-iconfield class="flex-1 min-w-48">
          <p-inputicon styleClass="pi pi-search" />
          <input
            pInputText
            type="text"
            placeholder="Search by name or ID..."
            class="w-full"
            [ngModel]="search()"
            (ngModelChange)="search.set($event)"
          />
        </p-iconfield>

        <!-- Type filter -->
        <p-select
          [options]="typeOptions"
          [ngModel]="selectedType()"
          (ngModelChange)="selectedType.set($event)"
          optionLabel="label"
          optionValue="value"
          placeholder="All Types"
          styleClass="min-w-36"
        />

        <!-- Region filter -->
        <p-select
          [options]="regionOptions"
          [ngModel]="selectedRegion()"
          (ngModelChange)="selectedRegion.set($event)"
          optionLabel="label"
          optionValue="value"
          placeholder="All Regions"
          styleClass="min-w-40"
        />

        <!-- Sort -->
        <p-select
          [options]="sortOptions"
          [ngModel]="sortOption()"
          (ngModelChange)="sortOption.set($event)"
          optionLabel="label"
          optionValue="value"
          styleClass="min-w-36"
        />

        <!-- Clear filters button — only shown when a filter is active -->
        @if (hasActiveFilters()) {
          <p-button
            label="Clear"
            icon="pi pi-times"
            severity="secondary"
            size="small"
            (onClick)="clearFilters()"
          />
        }

      </div>
    </div>
  `,
})
export class FilterPanelComponent {
  // model() creates a two-way bindable signal
  search = model('');
  selectedType = model('');
  selectedRegion = model('');
  sortOption = model('id-asc');

  // Shows the clear button only when at least one filter is active
  hasActiveFilters = computed(
    () => !!this.search() || !!this.selectedType() || !!this.selectedRegion()
  );

  clearFilters(): void {
    this.search.set('');
    this.selectedType.set('');
    this.selectedRegion.set('');
    this.sortOption.set('id-asc');
  }

  typeOptions: SelectOption[] = [
    { label: 'All Types', value: '' },
    { label: 'Normal', value: 'normal' },
    { label: 'Fire', value: 'fire' },
    { label: 'Water', value: 'water' },
    { label: 'Grass', value: 'grass' },
    { label: 'Electric', value: 'electric' },
    { label: 'Ice', value: 'ice' },
    { label: 'Fighting', value: 'fighting' },
    { label: 'Poison', value: 'poison' },
    { label: 'Ground', value: 'ground' },
    { label: 'Flying', value: 'flying' },
    { label: 'Psychic', value: 'psychic' },
    { label: 'Bug', value: 'bug' },
    { label: 'Rock', value: 'rock' },
    { label: 'Ghost', value: 'ghost' },
    { label: 'Dragon', value: 'dragon' },
    { label: 'Dark', value: 'dark' },
    { label: 'Steel', value: 'steel' },
    { label: 'Fairy', value: 'fairy' },
  ];

  regionOptions: SelectOption[] = [
    { label: 'All Regions',    value: ''       },
    { label: 'Kanto (Gen 1)',  value: 'kanto'  },
    { label: 'Johto (Gen 2)',  value: 'johto'  },
    { label: 'Hoenn (Gen 3)',  value: 'hoenn'  },
    { label: 'Sinnoh (Gen 4)', value: 'sinnoh' },
    { label: 'Unova (Gen 5)',  value: 'unova'  },
    { label: 'Kalos (Gen 6)',  value: 'kalos'  },
    { label: 'Alola (Gen 7)',  value: 'alola'  },
    { label: 'Galar (Gen 8)',  value: 'galar'  },
    { label: 'Paldea (Gen 9)', value: 'paldea' },
  ];

  sortOptions: SelectOption[] = [
    { label: 'Lowest ID', value: 'id-asc' },
    { label: 'Highest ID', value: 'id-desc' },
    { label: 'A → Z', value: 'name-asc' },
    { label: 'Z → A', value: 'name-desc' },
  ];
}
