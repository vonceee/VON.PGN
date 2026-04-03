import { Injectable } from '@angular/core';

export interface Glicko2Player {
  rating: number;
  rd: number;
  vol: number;
}

export interface RatingResult {
  player: Glicko2Player;
  change: number;
}

@Injectable({
  providedIn: 'root',
})
export class Glicko2Service {
  private readonly TAU = 0.5;
  private readonly DEFAULT_RATING = 1500;
  private readonly DEFAULT_RD = 350;
  private readonly DEFAULT_VOL = 0.06;

  private readonly MIN_RD = 30;
  private readonly MAX_RD = 350;
  private readonly MIN_RATING = 100;
  private readonly MAX_RATING = 3500;
  private readonly MIN_VOL = 0.04;
  private readonly MAX_VOL = 0.1;

  createPlayer(rating: number = this.DEFAULT_RATING, rd: number = this.DEFAULT_RD, vol: number = this.DEFAULT_VOL): Glicko2Player {
    return {
      rating: this.clampRating(rating),
      rd: this.clampRd(rd),
      vol: this.clampVol(vol),
    };
  }

  calculateExpectedScore(player: Glicko2Player, opponent: Glicko2Player): number {
    const g = this.gFunction(opponent.rd);
    const E = 1 / (1 + Math.pow(10, (-g * (player.rating - opponent.rating) / 400)));
    return E;
  }

  updateRating(player: Glicko2Player, opponent: Glicko2Player, score: number): RatingResult {
    const g = this.gFunction(opponent.rd);
    const E = this.calculateExpectedScore(player, opponent);
    
    const d2 = 1 / (Math.pow(g, 2) * Math.pow(E, 2) * (1 - E) * Math.pow(this.TAU, 2));
    
    const newVol = this.calculateNewVolatility(player.vol, d2, player.rating, opponent.rating, E, score);
    
    const newRd = Math.sqrt(1 / (1 / Math.pow(player.rd, 2) + 1 / d2));
    
    const change = Math.pow(newRd, 2) * g * (score - E);
    const newRating = player.rating + change;
    
    return {
      player: {
        rating: this.clampRating(newRating),
        rd: this.clampRd(newRd),
        vol: this.clampVol(newVol),
      },
      change: Math.round(change),
    };
  }

  updateRatingWithMultipleOpponents(player: Glicko2Player, opponents: { player: Glicko2Player; score: number }[]): Glicko2Player {
    if (opponents.length === 0) {
      return player;
    }

    let sum1 = 0;
    let sum2 = 0;

    for (const { player: opp, score } of opponents) {
      const g = this.gFunction(opp.rd);
      const E = this.calculateExpectedScore(player, opp);
      const d2 = 1 / (Math.pow(g, 2) * Math.pow(E, 2) * (1 - E) * Math.pow(this.TAU, 2));
      
      sum1 += Math.pow(g, 2) * (score - E);
      sum2 += 1 / d2;
    }

    const d2_total = 1 / sum2;
    
    const newVol = this.calculateNewVolatilityMulti(player.vol, d2_total, sum1);
    const newRd = Math.sqrt(1 / (1 / Math.pow(player.rd, 2) + 1 / d2_total));
    const change = Math.pow(newRd, 2) * sum1;
    const newRating = player.rating + change;

    return {
      rating: this.clampRating(newRating),
      rd: this.clampRd(newRd),
      vol: this.clampVol(newVol),
    };
  }

  private gFunction(rd: number): number {
    return 1 / Math.sqrt(1 + (3 * Math.pow(rd, 2) / Math.pow(Math.PI, 2)));
  }

  private calculateNewVolatility(vol: number, d2: number, rating: number, opponentRating: number, E: number, score: number): number {
    const a = Math.log(vol * vol);
    const delta = (rating - opponentRating) / 400;
    
    const functionA = (x: number) => {
      const ex = Math.exp(x);
      const num = ex * (Math.pow(delta, 2) - d2 - Math.pow(this.gFunction(this.DEFAULT_RD), 2) * ex * E * (1 - E));
      const den = 2 * Math.pow(d2 + ex, 2);
      return num / den - (x - a) / Math.pow(this.TAU, 2);
    };

    let A = a;
    if (Math.pow(delta, 2) > Math.pow(this.gFunction(this.DEFAULT_RD), 2)) {
      A = Math.log(Math.pow(delta, 2) - Math.pow(this.gFunction(this.DEFAULT_RD), 2));
    }

    let B: number;
    if (Math.pow(delta, 2) > Math.pow(this.gFunction(this.DEFAULT_RD), 2)) {
      B = Math.log(Math.pow(delta, 2) - Math.pow(this.gFunction(this.DEFAULT_RD), 2));
    } else {
      let k = 1;
      while (functionA(a - k * this.TAU) < 0) {
        k++;
      }
      B = a - k * this.TAU;
    }

    let fA = functionA(A);
    let fB = functionA(B);

    let iteration = 0;
    const maxIterations = 100;
    const epsilon = 0.000001;

    while (Math.abs(B - A) > epsilon && iteration < maxIterations) {
      const C = A + (A - B) * fA / (fB - fA);
      const fC = functionA(C);

      if (fC * fB < 0) {
        A = B;
        fA = fB;
      } else {
        fA = fA / 2;
      }

      B = C;
      fB = fC;
      iteration++;
    }

    return Math.exp(A / 2);
  }

  private calculateNewVolatilityMulti(vol: number, d2_total: number, sum1: number): number {
    const a = Math.log(vol * vol);
    const delta = sum1;
    
    const functionA = (x: number) => {
      const ex = Math.exp(x);
      const num = ex * (Math.pow(delta, 2) - d2_total - Math.pow(this.gFunction(this.DEFAULT_RD), 2) * ex * 0.5 * 0.5);
      const den = 2 * Math.pow(d2_total + ex, 2);
      return num / den - (x - a) / Math.pow(this.TAU, 2);
    };

    let A = a;
    let B = a - 10 * this.TAU;

    let fA = functionA(A);
    let fB = functionA(B);

    let iteration = 0;
    const maxIterations = 100;
    const epsilon = 0.000001;

    while (Math.abs(B - A) > epsilon && iteration < maxIterations) {
      const C = A + (A - B) * fA / (fB - fA);
      const fC = functionA(C);

      if (fC * fB < 0) {
        A = B;
        fA = fB;
      } else {
        fA = fA / 2;
      }

      B = C;
      fB = fC;
      iteration++;
    }

    return Math.exp(A / 2);
  }

  private clampRating(rating: number): number {
    return Math.max(this.MIN_RATING, Math.min(this.MAX_RATING, rating));
  }

  private clampRd(rd: number): number {
    return Math.max(this.MIN_RD, Math.min(this.MAX_RD, rd));
  }

  private clampVol(vol: number): number {
    return Math.max(this.MIN_VOL, Math.min(this.MAX_VOL, vol));
  }

  getRatingClass(rating: number): string {
    if (rating < 1200) return 'beginner';
    if (rating < 1400) return 'novice';
    if (rating < 1600) return 'intermediate';
    if (rating < 1800) return 'advanced';
    if (rating < 2000) return 'expert';
    if (rating < 2200) return 'master';
    return 'grandmaster';
  }

  getRatingTitle(rating: number): string {
    if (rating < 1200) return 'Beginner';
    if (rating < 1400) return 'Novice';
    if (rating < 1600) return 'Intermediate';
    if (rating < 1800) return 'Advanced';
    if (rating < 2000) return 'Expert';
    if (rating < 2200) return 'Master';
    return 'Grandmaster';
  }
}