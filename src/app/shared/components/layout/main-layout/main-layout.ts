import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '@shared/layout';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, Header],
  template: `
    <div class="h-screen w-full flex flex-col">
      <app-header class="w-full shrink-0 z-50"></app-header>
      <main class="flex-1 overflow-y-auto w-full custom-scrollbar relative">
        <div class="w-full h-full flex flex-col">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100vh;
        width: 100%;
      }
    `,
  ],
})
export class MainLayoutComponent {}
