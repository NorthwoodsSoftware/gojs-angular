import { Component, ElementRef, EventEmitter, Input, KeyValueDiffer, KeyValueDiffers, NgZone, Output, ViewChild } from '@angular/core';
import * as go from 'gojs';
import { DiagramComponent } from './diagram.component';
@Component({
  selector: 'gojs-palette',
  template: '<div #ngPalette [className]=divClassName></div>'
})
export class PaletteComponent {

  /**
   * Palette initialization function. Returns a go.Palette.
   * Do not initialize model data in this function.
   */
  @Input() public initPalette: () => go.Palette;

  // Node data for palette
  @Input() public nodeDataArray: Array<go.ObjectData>;

  // Link data for palette. Optional
  @Input() public linkDataArray: Array<go.ObjectData> = null;

  // Model data for palette. Optional
  @Input() public modelData: go.ObjectData = null;

  // Palette div class name. Use this name to style your palette in CSS
  @Input() public divClassName: string;

  @Input() public skipsPaletteUpdate: boolean = false;

  // model changed listener function for palette
  public modelChangedListener: (e: go.ChangedEvent) => void | null = null;

  // event emitter -- fires when palette model changes. Capture this emitted event in parent component
  @Output() public modelChange: EventEmitter<go.IncrementalData> = new EventEmitter<go.IncrementalData>();

  @ViewChild('ngPalette', { static: true }) public paletteDiv: ElementRef;

  // The Palette itself
  public palette: go.Palette | null = null;

  // differs for array inputs (node / link data arrays)
  private _ndaDiffer: KeyValueDiffer<string, any>;
  private _ldaDiffer: KeyValueDiffer<string, any>;

  constructor(private _kvdiffers: KeyValueDiffers, public zone: NgZone) {
    // differs used to check if there have been changed to the array @Inputs
    // without them, changes to the input arrays won't register in ngOnChanges,
    // since the array reference itself may be the same
    this._ndaDiffer = this._kvdiffers.find([]).create();
    this._ldaDiffer = this._kvdiffers.find([]).create();
  } // end constructor

  /**
   * Initialize Palette after view init
   */
  public ngAfterViewInit() {
    if (!this.paletteDiv) return;

    this.palette = this.initPalette();

    // This bit of code makes sure the mousemove event listeners on the canvas are run outside NgZone
    // This makes it so change detection isn't triggered every time the mouse is moved inside the canvas, greatly improving performance
    // If some state-altering behavior must happen on a mousemove event inside the palette,
    // you will have to using zone.run() to make sure that event triggers angular change detection
    this.palette.addEventListener = (DOMElement: Element | Window | Document, name: string, listener: any, capture: boolean) => {
      const superAddEventListener = go.Diagram.prototype.addEventListener;
      if (name === 'mousemove') {
        this.zone.runOutsideAngular(() => superAddEventListener.call(this, DOMElement, name, listener, capture));
      } else {
        this.zone.run(() => {
          superAddEventListener.call(this, DOMElement, name, listener, capture);
        });
      }
    };

    // assign the Palette's div, which (among many other things) will attach a bunch of listeners to the canvas,
    // using the overridden addEventListener function above
    const divRef = this.paletteDiv.nativeElement;
    this.palette.div = divRef;

    // initialize palette model
    this.palette.delayInitialization(() => {
      const model = this.palette.model;
      model.commit((m: go.Model) => {
        m.mergeNodeDataArray(m.cloneDeep(this.nodeDataArray));
        if (this.linkDataArray && m instanceof go.GraphLinksModel) {
          m.mergeLinkDataArray(m.cloneDeep(this.linkDataArray));
        }
        if (this.modelData) {
          m.assignAllDataProperties(m.modelData, this.modelData);
        }
        this.palette.layoutDiagram(true);
      }, null);
    });


    // initializer listener
    this.modelChangedListener = (e: go.ChangedEvent) => {
      if (e.isTransactionFinished && this.palette && this.palette.model && !this.palette.model.isReadOnly) {
        // this must be done within a NgZone.run block, so changes are detected in the parent component
        this.zone.run(() => {
          const dataChanges = e.model!.toIncrementalData(e);
          this.modelChange.emit(dataChanges);
        });
      }
    };
    this.palette.addModelChangedListener(this.modelChangedListener);
  } // end ngAfterViewInit

  /**
   * Always be checking if array Input data has changed (node and link data arrays)
   */
  public ngDoCheck() {

    if (!this.palette) return;
    if (!this.palette.model) return;

    // these need to be run each check, even if no merging happens
    // otherwise, they will detect all diffs that happened since last time skipsPaletteUpdate was false,
    // such as remove ops that happened in GoJS when skipsPaletteUpdate = true, 
    // and then realllllly bad stuff happens (deleting random nodes, updating the wrong Parts)
    // Angular differs are a lot of fun
    var nodeDiffs = this._ndaDiffer.diff(this.nodeDataArray);
    var linkDiffs = this._ldaDiffer.diff(this.linkDataArray);

    if (this.skipsPaletteUpdate) return;

    // don't need model change listener while performing known data updates
    if (this.modelChangedListener !== null) this.palette.model.removeChangedListener(this.modelChangedListener);

    this.palette.model.startTransaction('update data');
    // update modelData first, in case bindings on nodes / links depend on model data
    this.palette.model.assignAllDataProperties(this.palette.model.modelData, this.modelData);
    DiagramComponent.mergeChanges(this, nodeDiffs, "n");
    DiagramComponent.mergeChanges(this, linkDiffs, "l");
    this.palette.model.commitTransaction('update data');
    // reset the model change listener
    if (this.modelChangedListener !== null) this.palette.model.addChangedListener(this.modelChangedListener);

  } // end ngDoCheck

  public ngOnDestroy() {
    this.palette.div = null; // removes event listeners
  }

}
