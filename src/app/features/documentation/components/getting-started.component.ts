import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-docs-getting-started',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <h2 class="text-3xl font-semibold mb-6 border-b border-border-base pb-4">
      Getting Started
    </h2>
    <div class="prose prose-slate max-w-none text-muted">
      <p class="text-lg leading-relaxed mb-6">
        Welcome to vonchess. This guide will walk you through setting up your account, customizing your
        preferences, and finding your first game or training drills.
      </p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
        <div class="p-6 rounded-2xl bg-white border border-border-base flex flex-col gap-3">
          <span class="text-xs font-semibold uppercase text-accent">Step 1</span>
          <h3 class="text-lg font-semibold text-content m-0">Create your account</h3>
          <p class="text-sm leading-relaxed m-0 text-muted">
            Register at the <a routerLink="/register" class="text-accent underline font-medium">Register Page</a>.
            All you need is an email address and a password.
          </p>
        </div>

        <div class="p-6 rounded-2xl bg-white border border-border-base flex flex-col gap-3">
          <span class="text-xs font-semibold uppercase text-accent">Step 2</span>
          <h3 class="text-lg font-semibold text-content m-0">Verify email</h3>
          <p class="text-sm leading-relaxed m-0 text-muted">
            Check your inbox for a verification link to activate competitive match play and access ratings.
          </p>
        </div>

        <div class="p-6 rounded-2xl bg-white border border-border-base flex flex-col gap-3">
          <span class="text-xs font-semibold uppercase text-accent">Step 3</span>
          <h3 class="text-lg font-semibold text-content m-0">Set up profile</h3>
          <p class="text-sm leading-relaxed m-0 text-muted">
            Navigate to your <a routerLink="/profile" class="text-accent underline font-medium">Profile
              Dashboard</a> to configure settings, choose board styles, and view ratings.
          </p>
        </div>

        <div class="p-6 rounded-2xl bg-white border border-border-base flex flex-col gap-3">
          <span class="text-xs font-semibold uppercase text-accent">Step 4</span>
          <h3 class="text-lg font-semibold text-content m-0">Find a game</h3>
          <p class="text-sm leading-relaxed m-0 text-muted">
            Visit the <a routerLink="/play" class="text-accent underline font-medium">Play Portal</a> to queue up
            for matchmaking or create custom challenges.
          </p>
        </div>
      </div>
    </div>
  `
})
export class GettingStartedComponent {}
