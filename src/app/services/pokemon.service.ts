import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import {
  Pokemon,
  PokemonListResponse,
  PokemonListItem,
  EvolutionChain,
  PokemonSpecies,
} from '../shared/models/pokemon.model';

@Injectable({
  providedIn: 'root',
})
export class PokemonService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiBaseUrl;

  getPokemonList(limit: number = 151, offset: number = 0): Observable<PokemonListResponse> {
    return this.http.get<PokemonListResponse>(
      `${this.baseUrl}/pokemon?limit=${limit}&offset=${offset}`
    );
  }

  getPokemonDetail(nameOrId: string | number): Observable<Pokemon> {
    return this.http.get<Pokemon>(`${this.baseUrl}/pokemon/${nameOrId}`);
  }

  getPokemonBatch(items: PokemonListItem[]): Observable<Pokemon[]> {
    const requests = items.map((item) => this.http.get<Pokemon>(item.url));
    return forkJoin(requests);
  }

  getIdFromUrl(url: string): number {
    const parts = url.split('/').filter(Boolean);
    return Number(parts[parts.length - 1]);
  }

  // Fetches species data and evolution chain in two requests, returns both together
  getSpeciesAndEvolution(pokemonId: number): Observable<{ species: PokemonSpecies; chain: EvolutionChain }> {
    return this.http
      .get<PokemonSpecies>(`${this.baseUrl}/pokemon-species/${pokemonId}`)
      .pipe(
        switchMap((species) =>
          this.http.get<EvolutionChain>(species.evolution_chain.url).pipe(
            map((chain) => ({ species, chain }))
          )
        )
      );
  }

  // Kept for backward compatibility
  getEvolutionChain(pokemonId: number): Observable<EvolutionChain> {
    return this.getSpeciesAndEvolution(pokemonId).pipe(map(({ chain }) => chain));
  }
}
