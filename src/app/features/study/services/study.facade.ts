import { Injectable, inject, DestroyRef } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';

import { StudyService } from '../../../core/services/study.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { EngineService } from '../../../core/services/engine.service';
import { MoveNode, StudyChapter } from '../../../core/models/study.model';

import { StudyNavigationFacade } from './study-navigation.facade';
import { StudyEngineFacade } from './study-engine.facade';
import { StudyCollaborationFacade } from './study-collaboration.facade';

import { RequestControlDialogComponent } from '../dialogs/request-control-dialog/request-control-dialog.component';
import { EditMetadataDialogComponent } from '../dialogs/edit-metadata-dialog/edit-metadata-dialog.component';

@Injectable({
  providedIn: 'root',
})
export class StudyFacade {
  private studyService = inject(StudyService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private dialog = inject(Dialog);
  public engineService = inject(EngineService);
  private destroyRef = inject(DestroyRef);

  // Sub-facades
  public nav = inject(StudyNavigationFacade);
  public engine = inject(StudyEngineFacade);
  public collab = inject(StudyCollaborationFacade);

  // Exposed Study Service States (delegated from StudyService)
  study = this.studyService.currentStudy;
  currentChapter = this.studyService.currentChapter;
  isLoading = this.studyService.isLoading;
  viewerCount = this.studyService.viewerCount;
  viewerNames = this.studyService.viewerNames;
  classStartedAt = this.studyService.classStartedAt;

  // Navigation & Move tree states (delegated from StudyNavigationFacade)
  currentFen = this.nav.currentFen;
  moveTree = this.nav.moveTree;
  currentNode = this.nav.currentNode;
  currentPly = this.nav.currentPly;
  boardOrientation = this.nav.boardOrientation;
  remoteShapes = this.nav.remoteShapes;
  isSyncing = this.nav.isSyncing;
  isActionInProgress = this.nav.isActionInProgress;
  activeTab = this.nav.activeTab;
  activeSection = this.nav.activeSection;
  splitSection = this.nav.splitSection;

  tags = this.nav.tags;
  result = this.nav.result;
  whitePlayer = this.nav.whitePlayer;
  blackPlayer = this.nav.blackPlayer;
  activePath = this.nav.activePath;
  whiteClock = this.nav.whiteClock;
  blackClock = this.nav.blackClock;
  activeColor = this.nav.activeColor;
  topPlayerColor = this.nav.topPlayerColor;
  bottomPlayerColor = this.nav.bottomPlayerColor;
  topPlayer = this.nav.topPlayer;
  bottomPlayer = this.nav.bottomPlayer;
  topClock = this.nav.topClock;
  bottomClock = this.nav.bottomClock;
  isTopPlayerTurn = this.nav.isTopPlayerTurn;
  isBottomPlayerTurn = this.nav.isBottomPlayerTurn;
  mergedShapes = this.nav.mergedShapes;
  initialPly = this.nav.initialPly;
  lastMoveSquares = this.nav.lastMoveSquares;
  isOwner = this.nav.isOwner;
  canEdit = this.nav.canEdit;
  boardInteractive = this.nav.boardInteractive;
  openingName = this.nav.openingName;
  openingEco = this.nav.openingEco;

  // Engine states (delegated from StudyEngineFacade)
  isEngineActive = this.engine.isEngineActive;
  showEngineSettings = this.engine.showEngineSettings;
  engineDepth = this.engine.engineDepth;
  engineNodes = this.engine.engineNodes;
  engineNps = this.engine.engineNps;
  isEngineError = this.engine.isEngineError;
  pvLines = this.engine.pvLines;
  multiPv = this.engine.multiPv;
  searchMode = this.engine.searchMode;
  formattedPvLines = this.engine.formattedPvLines;
  formattedNps = this.engine.formattedNps;
  engineEval = this.engine.engineEval;
  isEngineVisible = this.engine.isEngineVisible;

  // Collaboration / Classroom states (delegated from StudyCollaborationFacade)
  classDuration = this.collab.classDuration;
  showDeleteModal = this.collab.showDeleteModal;
  showStartClassDialog = this.collab.showStartClassDialog;
  showEndClassDialog = this.collab.showEndClassDialog;
  showJoinClassDialog = this.collab.showJoinClassDialog;
  isDeleting = this.collab.isDeleting;
  isClassActive = this.collab.isClassActive;
  lockHolderId = this.collab.lockHolderId;
  hasBoardControl = this.collab.hasBoardControl;
  hasJoinedClass = this.collab.hasJoinedClass;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.cleanup();
    });
  }

  // Delegation methods for navigation
  getPlayerResult(color: 'white' | 'black'): string {
    return this.nav.getPlayerResult(color);
  }

  updateCurrentPosition(node: MoveNode | null) {
    this.nav.updateCurrentPosition(node);
  }

  onMoveMade(event: any, boardUndo?: () => void) {
    // Intercept student requests to move without board control
    if (
      this.studyService.isClassActive() &&
      !this.isOwner() &&
      this.hasJoinedClass() &&
      !this.hasBoardControl()
    ) {
      if (boardUndo) boardUndo();

      const dialogRef = this.dialog.open<boolean>(RequestControlDialogComponent, {
        width: '450px',
        maxWidth: '95vw',
        backdropClass: ['bg-black/50'],
      });

      dialogRef.closed.subscribe((requested) => {
        if (requested) {
          const user = this.authService.currentUser();
          const userId = String(user?.uid || user?.id || '');
          const userName = String(
            user?.username || user?.displayName || user?.name || 'Student'
          );
          this.studyService.requestMovePermission(userId, userName);
          this.toastService.show('Move permission request sent to tutor!', 'success');
        }
      });
      return;
    }

    this.nav.onMoveMade(event, boardUndo);
  }

  onNodeClicked(node: MoveNode) {
    this.nav.onNodeClicked(node);
  }

  onDeleteFromHere(target: MoveNode) {
    this.nav.onDeleteFromHere(target);
  }

  onPromoteToMainline(target: MoveNode) {
    this.nav.onPromoteToMainline(target);
  }

  onNavigateToPly(ply: number) {
    this.nav.onNavigateToPly(ply);
  }

  onPrevMove() {
    this.nav.onPrevMove();
  }

  onNextMove() {
    this.nav.onNextMove();
  }

  onAnnotateMove(node: MoveNode) {
    this.nav.onAnnotateMove(node);
  }

  saveAnnotation(node: MoveNode, comment: string, glyphs: number[]) {
    this.nav.saveAnnotation(node, comment, glyphs);
  }

  onShapeDrawn(shapes: any[]) {
    this.nav.onShapeDrawn(shapes);
  }

  onSaveMetadata(tags: Record<string, string>) {
    this.nav.onSaveMetadata(tags);
  }

  onEditMetadata() {
    const c = this.currentChapter();
    if (!c || !this.canEdit()) return;

    const dialogRef = this.dialog.open(EditMetadataDialogComponent, {
      data: c.pgn_tags || {},
    });

    dialogRef.closed.subscribe((result: any) => {
      if (result) {
        this.onSaveMetadata(result);
      }
    });
  }

  quickAnnotate(node: MoveNode, glyphId: number) {
    this.nav.quickAnnotate(node, glyphId);
  }

  selectChapter(chap: StudyChapter) {
    this.nav.selectChapter(chap);
  }

  nextChapter() {
    this.nav.nextChapter();
  }

  prevChapter() {
    this.nav.prevChapter();
  }

  flipBoard(currentOrientation: 'white' | 'black', callback: (newO: 'white' | 'black') => void) {
    this.nav.flipBoard(currentOrientation, callback);
  }

  // Delegation methods for collaboration
  toggleClassSession() {
    this.collab.toggleClassSession();
  }

  onStartClassConfirmed() {
    this.collab.onStartClassConfirmed();
  }

  onStartClassCancelled() {
    this.collab.onStartClassCancelled();
  }

  onEndClassConfirmed() {
    this.collab.onEndClassConfirmed();
  }

  onEndClassCancelled() {
    this.collab.onEndClassCancelled();
  }

  joinClassSession() {
    this.collab.joinClassSession();
  }

  onJoinClassConfirmed() {
    this.collab.onJoinClassConfirmed();
  }

  onJoinClassCancelled() {
    this.collab.onJoinClassCancelled();
  }

  toggleSync() {
    this.collab.toggleSync();
  }

  onDeleteConfirmed(onSuccess: () => void) {
    this.collab.onDeleteConfirmed(onSuccess);
  }

  cleanup() {
    this.studyService.disconnect();
    this.collab.cleanup();
    this.engine.cleanup();
  }
}
