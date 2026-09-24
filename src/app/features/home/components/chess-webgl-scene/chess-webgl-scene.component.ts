import {
  Component,
  ElementRef,
  inject,
  PLATFORM_ID,
  viewChild,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  NgZone,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type * as THREE from 'three';

@Component({
  selector: 'app-chess-webgl-scene',
  standalone: true,
  template: `
    <div #container class="w-full h-full relative overflow-hidden pointer-events-none">
      <canvas #webglCanvas class="w-full h-full block pointer-events-none"></canvas>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChessWebGLSceneComponent implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly ngZone = inject(NgZone);

  private readonly containerRef = viewChild.required<ElementRef<HTMLDivElement>>('container');
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('webglCanvas');

  // Three.js Module Reference
  private three?: typeof THREE;

  // Three.js Core Instances
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private animFrameId?: number;
  private resizeObserver?: ResizeObserver;
  private intersectionObserver?: IntersectionObserver;

  // Render Loop Lifecycle Flags
  private isVisible = true;
  private isTabActive = true;
  private lastRenderTime = 0;
  private readonly targetFrameInterval = 1000 / 60; // Max 60fps to prevent 120Hz-240Hz laptop overheating

  // 3D Chessboard Group
  private boardGroup?: THREE.Group;
  private orbitRing?: THREE.Mesh;

  // Responsive target X coordinate (centered in dedicated container)
  private baseX = 0;

  // Resource Disposal Tracking
  private materials: THREE.Material[] = [];
  private geometries: THREE.BufferGeometry[] = [];
  private visibilityHandler?: () => void;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.ngZone.runOutsideAngular(async () => {
      const threeModule = await import('three');
      this.three = threeModule;
      this.boardGroup = new threeModule.Group();

      this.initThreeScene();
      this.initVisibilityAndIntersectionObservers();
    });
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.stopAnimation();

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }

    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }

    this.disposeResources();
  }


  private initThreeScene(): void {
    if (!this.three || !this.boardGroup) return;
    const THREE = this.three;

    const canvas = this.canvasRef().nativeElement;
    const container = this.containerRef().nativeElement;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 500;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 40);
    this.camera.position.set(0, 0.42, 5.9);
    this.camera.lookAt(0, 0.05, 0);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'default',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.setupLighting(THREE);
    this.buildChessBoard(THREE);
    this.scene.add(this.boardGroup);
    this.updateResponsivePosition(width);
    this.startAnimation();
    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(container);
  }

  /**
   * Studio lighting setup (1 Key Light + 1 Electric Blue Rim Light + 1 Ambient Light).
   */
  private setupLighting(THREE: typeof import('three')): void {
    if (!this.scene) return;

    // Soft Ambient Light
    const ambientLight = new THREE.AmbientLight(0xf8fafc, 1.6);
    this.scene.add(ambientLight);

    // Key Directional Light
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
    keyLight.position.set(6, 9, 6);
    this.scene.add(keyLight);

    // Subtle Cyan-Blue Accent Rim Light
    const rimLight = new THREE.DirectionalLight(0x3b82f6, 2.0);
    rimLight.position.set(-6, 4, -4);
    this.scene.add(rimLight);
  }

  /**
   * Builds the procedural 3D Chessboard with 8x8 precision tiles, chamfered chassis,
   * coordinate bevels, and metallic perimeter trim.
   */
  private buildChessBoard(THREE: typeof import('three')): void {
    if (!this.boardGroup) return;

    // 1. Materials
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.35,
      metalness: 0.65,
    });
    this.materials.push(chassisMat);

    const lightSquareMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.18,
      metalness: 0.08,
    });
    this.materials.push(lightSquareMat);

    const darkSquareMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.28,
      metalness: 0.2,
    });
    this.materials.push(darkSquareMat);

    const goldAccentMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      roughness: 0.25,
      metalness: 0.8,
    });
    this.materials.push(goldAccentMat);

    // 2. Base Chassis Block (Solid Chamfered Slab)
    const chassisGeo = new THREE.BoxGeometry(4.7, 0.24, 4.7);
    this.geometries.push(chassisGeo);
    const chassisMesh = new THREE.Mesh(chassisGeo, chassisMat);
    chassisMesh.position.y = -0.12;
    this.boardGroup.add(chassisMesh);

    // 3. Inner Raised Border
    const borderGeo = new THREE.BoxGeometry(4.42, 0.04, 4.42);
    this.geometries.push(borderGeo);
    const borderMesh = new THREE.Mesh(borderGeo, goldAccentMat);
    borderMesh.position.y = 0.01;
    this.boardGroup.add(borderMesh);

    // 4. 8x8 Grid of Checkered Tiles
    const tileSize = 0.51;
    const tileHeight = 0.05;
    const tileGeo = new THREE.BoxGeometry(tileSize, tileHeight, tileSize);
    this.geometries.push(tileGeo);

    const offset = 3.5;
    const spacing = 0.53; // Slight 0.02 gap for precision laser-milled look

    for (let file = 0; file < 8; file++) {
      for (let rank = 0; rank < 8; rank++) {
        const isLight = (file + rank) % 2 === 1;
        const squareMesh = new THREE.Mesh(tileGeo, isLight ? lightSquareMat : darkSquareMat);

        const xPos = (file - offset) * spacing;
        const zPos = (rank - offset) * spacing;

        squareMesh.position.set(xPos, 0.04, zPos);
        this.boardGroup.add(squareMesh);
      }
    }

    // 5. Ambient Floating Halo Ring below board
    const ringGeo = new THREE.TorusGeometry(3.3, 0.012, 12, 64);
    this.geometries.push(ringGeo);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.35,
    });
    this.materials.push(ringMat);
    this.orbitRing = new THREE.Mesh(ringGeo, ringMat);
    this.orbitRing.rotation.x = Math.PI / 2;
    this.orbitRing.position.y = -0.22;
    this.boardGroup.add(this.orbitRing);

    // Initial Low-Angle Side-Profile Orientation
    this.boardGroup.rotation.set(0.32, -0.78, 0.08);
    this.boardGroup.position.set(this.baseX, -0.22, 0.2);
    this.boardGroup.scale.set(0.58, 0.58, 0.58);
  }

  /**
   * Responsive layout sizing:
   * Centers the board within its dedicated flex container.
   */
  private updateResponsivePosition(width: number): void {
    if (!this.boardGroup) return;
    this.baseX = 0;
    if (width < 1024) {
      this.boardGroup.scale.set(0.50, 0.50, 0.50);
    } else {
      this.boardGroup.scale.set(0.58, 0.58, 0.58);
    }
  }

  /**
   * Pauses rendering when scrolled offscreen or when tab is inactive.
   */
  private initVisibilityAndIntersectionObservers(): void {
    const container = this.containerRef().nativeElement;

    // 1. Intersection Observer: Pause WebGL when hero is scrolled out of viewport
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        this.isVisible = entry.isIntersecting;
        if (this.isVisible && this.isTabActive) {
          this.startAnimation();
        } else {
          this.stopAnimation();
        }
      },
      { threshold: 0.05 },
    );
    this.intersectionObserver.observe(container);

    // 2. Tab Visibility: Pause when user changes tabs
    this.visibilityHandler = () => {
      this.isTabActive = !document.hidden;
      if (this.isTabActive && this.isVisible) {
        this.startAnimation();
      } else {
        this.stopAnimation();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private startAnimation(): void {
    if (this.animFrameId) return;
    this.animate();
  }

  private stopAnimation(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = undefined;
    }
  }

  /**
   * 60fps capped render loop with thermal throttle protection.
   */
  private animate = (): void => {
    if (!this.isVisible || !this.isTabActive) {
      this.animFrameId = undefined;
      return;
    }

    this.animFrameId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const elapsed = now - this.lastRenderTime;

    // Throttle frame rate to max 60fps on 120Hz/240Hz screens
    if (elapsed < this.targetFrameInterval) {
      return;
    }
    this.lastRenderTime = now - (elapsed % this.targetFrameInterval);

    if (!this.boardGroup) return;

    const time = now * 0.0006;

    // Dramatic side-profile orientation with subtle ambient idle drift
    this.boardGroup.rotation.x = 0.32 + Math.cos(time * 0.5) * 0.02;
    this.boardGroup.rotation.y = -0.78 + time * 0.08;
    this.boardGroup.rotation.z = 0.08;

    // Gentle breathing float
    this.boardGroup.position.y = -0.22 + Math.sin(time * 1.1) * 0.035;
    this.boardGroup.position.x = this.baseX;

    if (this.orbitRing) {
      this.orbitRing.rotation.z = time * 0.3;
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  private onResize(): void {
    if (!this.renderer || !this.camera) return;

    const container = this.containerRef().nativeElement;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 500;

    this.updateResponsivePosition(width);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private disposeResources(): void {
    for (const geo of this.geometries) {
      geo.dispose();
    }
    this.geometries = [];

    for (const mat of this.materials) {
      mat.dispose();
    }
    this.materials = [];

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer = undefined;
    }

    this.scene = undefined;
    this.camera = undefined;
    this.boardGroup = undefined;
  }
}
