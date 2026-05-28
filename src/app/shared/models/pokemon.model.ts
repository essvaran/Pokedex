// ─── List endpoint response ────────────────────────────────────────────────

export interface PokemonListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PokemonListItem[];
}

export interface PokemonListItem {
  name: string;
  url: string;
}

// ─── Full Pokemon detail ───────────────────────────────────────────────────

export interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number;
  sprites: PokemonSprites;
  types: PokemonTypeSlot[];
  abilities: PokemonAbilitySlot[];
  stats: PokemonStatSlot[];
  moves: PokemonMoveSlot[];
}

export interface PokemonSprites {
  front_default: string;
  front_shiny: string;
  other: {
    'official-artwork': {
      front_default: string;
      front_shiny: string;
    };
  };
}

export interface PokemonTypeSlot {
  slot: number;
  type: NamedResource;
}

export interface PokemonAbilitySlot {
  ability: NamedResource;
  is_hidden: boolean;
  slot: number;
}

export interface PokemonStatSlot {
  base_stat: number;
  effort: number;
  stat: NamedResource;
}

export interface PokemonMoveSlot {
  move: NamedResource;
  version_group_details: MoveVersionDetail[];
}

export interface MoveVersionDetail {
  level_learned_at: number;
  move_learn_method: NamedResource;
  version_group: NamedResource;
}

// ─── Shared utility type ──────────────────────────────────────────────────

export interface NamedResource {
  name: string;
  url: string;
}

// ─── Evolution chain ──────────────────────────────────────────────────────

export interface EvolutionChain {
  chain: EvolutionLink;
}

export interface EvolutionLink {
  species: NamedResource;
  evolves_to: EvolutionLink[];
}

// ─── Species detail ───────────────────────────────────────────────────────

export interface PokemonSpecies {
  evolution_chain: { url: string };
  flavor_text_entries: FlavorTextEntry[];
  gender_rate: number;        // -1 = genderless, 0–8 = female eighths
  capture_rate: number;
  base_happiness: number;
  egg_groups: NamedResource[];
  generation: NamedResource;
  is_legendary: boolean;
  is_mythical: boolean;
  is_baby: boolean;
  varieties: PokemonVariety[];
}

export interface PokemonVariety {
  is_default: boolean;
  pokemon: NamedResource;
}

export interface FlavorTextEntry {
  flavor_text: string;
  language: NamedResource;
  version: NamedResource;
}
