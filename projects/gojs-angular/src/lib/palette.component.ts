import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  Output,
  ViewChild,
} from '@angular/core';
import * as go from 'gojs';
import { NgDiagramHelper } from './ng-diagram-helper';
@Component({
  selector: 'gojs-palette',
  template: '<div #ngPalette [className]=divClassName></div>',
  standalone: true,
})
export class PaletteComponent {
  /**
   * Palette initialization function. Returns a go.Palette.
   * Do not initialize model data in this function.
   */
  @Input() public initPalette: () => go.Palette;
  /** Node data for palette */
  @Input() public nodeDataArray: Array<go.ObjectData>;
  /** Link data for palette. Optional. */
  @Input() public linkDataArray: Array<go.ObjectData> = null;
  /** Model data for palette. Optional. */
  @Input() public modelData: go.ObjectData = null;
  /** Palette div class name. Use this name to style your palette in CSS */
  @Input() public divClassName: string;

  /** Event emitter -- fires when palette model changes. Capture this emitted event in parent component */
  @Output() public modelChange: EventEmitter<go.IncrementalData> =
    new EventEmitter<go.IncrementalData>();
  /** The DIV element holding the Palette */
  @ViewChild('ngPalette', { static: true }) public paletteDiv: ElementRef;

  /** The Palette itself */
  public palette: go.Palette | null = null;

  constructor(public zone: NgZone) {}

  /**
   * Initialize Palette after view init
   */
  public ngAfterViewInit() {
    if (!this.paletteDiv) {
      throw new Error('paletteDiv is not defined');
    }
    this.palette = this.initPalette();
    if (!(this.palette instanceof go.Palette)) {
      throw new Error('initPalette function did not return a go.Palette');
    }

    // reduces change detection on mouse moves, boosting performance
    NgDiagramHelper.makeMouseMoveRunOutsideAngularZone(this.palette, this.zone);

    // assign the Palette's div, which (among many other things) will attach a bunch of listeners to the canvas,
    // using the overridden addEventListener function above
    const divRef = this.paletteDiv.nativeElement;
    if (divRef == null) return;
    this.palette.div = divRef;

    // initialize palette model
    NgDiagramHelper.initializeModel(
      this.palette,
      this.nodeDataArray,
      this.linkDataArray,
      this.modelData
    );
  }

  /**
   * If a change has occured on an @Input property, merge the app-level changes with GoJS
   */
  public ngOnChanges() {
    if (!this.palette || !this.palette.model) return;
    NgDiagramHelper.mergeAppDataWithModel(this);
  } // end ngOnChanges

  public ngOnDestroy() {
    this.palette.div = null; // removes event listeners
  }
}
