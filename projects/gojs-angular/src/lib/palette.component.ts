import { Component, ElementRef, EventEmitter, Input, IterableDiffers, KeyValueDiffer, KeyValueDiffers, NgZone, Output, ViewChild } from '@angular/core';
import * as go from 'gojs';
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

  // model changed listener function for palette
  @Input() public modelChangedListener: (e: go.ChangedEvent) => void | null = null;

  // event emitter -- fires when palette model changes. Capture this emitted event in parent component
  @Output() public modelChange: EventEmitter<go.IncrementalData> = new EventEmitter<go.IncrementalData>();

  @ViewChild('ngPalette', { static: true }) public paletteDiv: ElementRef;

  // The Palette itself
  public palette: go.Palette | null = null;

  // Differs for array Inputs (link / node data arrays)
  public _ndaDiffer: any;
  public _ldaDiffer: any;

  // differ for modelData object
  private _mdDiffer: KeyValueDiffer<string, any>;

  constructor(private _differs: IterableDiffers, private _kvdiffers: KeyValueDiffers, public zone: NgZone) {
    // differs used to check if there have been changed to the array @Inputs
    // without them, changes to the input arrays won't register in ngOnChanges,
    // since the array reference itself may be the same
    this._ndaDiffer = this._differs.find([]).create(null);
    this._ldaDiffer = this._differs.find([]).create(null);

    // also watch if model data changes; this differ must be initialized in ngOnInit
  } // end constructor

  public ngOnInit() {
    // initialize the differ that listens for changes to modelData object
    if (this.modelData) {
      this._mdDiffer = this._kvdiffers.find(this.modelData).create();
    }
  } // end ngOnInit

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
      }, null);
    });


    // initializer listener
    this.modelChangedListener = (e: go.ChangedEvent) => {
      if (e.isTransactionFinished) {
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
    const nodeDataArrayChanges = this._ndaDiffer.diff(this.nodeDataArray);
    const linkDataArrayChanges = this._ldaDiffer.diff(this.linkDataArray);
    let modelDataChanges = null;
    if (this._mdDiffer) {
      modelDataChanges = this._mdDiffer.diff(this.modelData);
    }
    if (nodeDataArrayChanges || linkDataArrayChanges || modelDataChanges) {
      this.updateFromAppData();
    }
  } // end ngDoCheck

  /**
   * Some input property has changed (or its contents changed) in parent component.
   * Update palette data accordingly
   */
  public updateFromAppData() {
    if (!this.palette) return;
    const model = this.palette.model;

    model.startTransaction('update data');
    model.mergeNodeDataArray(model.cloneDeep(this.nodeDataArray));
    if (this.linkDataArray && model instanceof go.GraphLinksModel) {
      model.mergeLinkDataArray(model.cloneDeep(this.linkDataArray));
    }
    if (this.modelData) {
      model.assignAllDataProperties(model.modelData, this.modelData);
    }
    model.commitTransaction('update data');

  }

}
