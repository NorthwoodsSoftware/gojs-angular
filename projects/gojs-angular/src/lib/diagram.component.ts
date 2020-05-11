import { Component, ElementRef, EventEmitter, Input, IterableDiffers, IterableDiffer, KeyValueDiffer, KeyValueDiffers, NgZone, Output, ViewChild, KeyValueChangeRecord } from '@angular/core';
import * as go from 'gojs';

@Component({
  selector: 'gojs-diagram',
  template: '<div #ngDiagram [className]=divClassName></div>'
})
export class DiagramComponent {

  /**
   * Diagram initialization function. Returns a go.Diagram.
   * Do not initialize model data in this function.
   */
  @Input() public initDiagram: () => go.Diagram;

  // Node data for diagram
  @Input() public nodeDataArray: Array<go.ObjectData>;

  // Link data for diagram
  @Input() public linkDataArray: Array<go.ObjectData> = null; // optional

  // Model data for diagram
  @Input() public modelData: go.ObjectData = null; // optional

  // Diagram div class name. Use this name to style your diagram in CSS
  @Input() public divClassName: string;

  // model changed listener function for diagram
  @Input() public modelChangedListener: (e: go.ChangedEvent) => void | null = null;

  @Input()
  public skipsDiagramUpdate: boolean = false;

  // event emitter -- fires when diagram model changes. Capture this emitted event in parent component
  @Output() public modelChange: EventEmitter<go.IncrementalData> = new EventEmitter<go.IncrementalData>();

  @ViewChild('ngDiagram', { static: true }) public diagramDiv: ElementRef;
  public diagram: go.Diagram = null;

  // differs for array inputs (node / link data arrays)
  private _ndaDiffer: KeyValueDiffer<string, any>;
  private _ldaDiffer: KeyValueDiffer<string, any>;
  // differ for modelData object
  private _mdDiffer: KeyValueDiffer<string, any>;


  constructor(private _differs: IterableDiffers, private _kvdiffers: KeyValueDiffers, public zone: NgZone) {
    // differs used to check if there have been changed to the array @Inputs
    // without them, changes to the input arrays won't register in ngOnChanges,
    // since the array reference itself may be the same
    this._ndaDiffer = this._kvdiffers.find([]).create();
    this._ldaDiffer = this._kvdiffers.find([]).create();

    // also watch if model data changes; this differ must be initialized in ngOnInit
  }

  public ngOnInit() {
    // initialize the differ that listens for changes to modelData object
    if (this.modelData) {
      this._mdDiffer = this._kvdiffers.find(this.modelData).create();
    }
  } // end ngOnInit

  /**
   * Initializes diagram / model after view init
   */
  public ngAfterViewInit() {
    this.diagram = this.initDiagram();

    // This bit of code makes sure the mousemove event listeners on the canvas are run outside NgZone
    // This makes it so change detection isn't triggered every time the mouse is moved inside the canvas, greatly improving performance
    // If some state-altering behavior must happen on a mousemove event inside the diagram,
    // you will have to using zone.run() to make sure that event triggers angular change detection
    this.diagram.addEventListener = (DOMElement: Element | Window | Document, name: string, listener: any, capture: boolean) => {
      const superAddEventListener = go.Diagram.prototype.addEventListener;
      if (name === 'mousemove') {
        this.zone.runOutsideAngular(() => superAddEventListener.call(this, DOMElement, name, listener, capture));
      } else {
        this.zone.run(() => {
          superAddEventListener.call(this, DOMElement, name, listener, capture);
        });
      }
    };

    // assign the Diagram's div, which (among many other things) will attach a bunch of listeners to the canvas,
    // using the overridden addEventListener function above
    const divRef = this.diagramDiv.nativeElement;
    if (divRef === null) return;
    this.diagram.div = divRef;

    // initialize the Diagram's model
    this.diagram.delayInitialization(() => {
      const model = this.diagram.model;
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
    this.diagram.addModelChangedListener(this.modelChangedListener);

  } // end ngAfterViewInit



  /**
   * Always be checking if array Input data has changed (node and link data arrays)
   */
  public ngDoCheck() {

    if (this.skipsDiagramUpdate) return;

    function compareObjs(obj1, obj2) {
      // Loop through properties in object 1
      for (const p in obj1) {
        // Check property exists on both objects
        if (obj1.hasOwnProperty(p) !== obj2.hasOwnProperty(p)) return false;

        switch (typeof (obj1[p])) {
          // Deep compare objects
          case 'object':
            if (!compareObjs(obj1[p], obj2[p])) return false;
            break;
          // Compare function code
          case 'function':
            if (typeof (obj2[p]) === 'undefined' || (p !== 'compare' && obj1[p].toString() !== obj2[p].toString())) return false;
            break;
          // Compare values
          default:
            if (obj1[p] !== obj2[p]) return false;
        }
      }

      // Check object 2 for any extra properties
      for (const p in obj2) {
        if (typeof (obj1[p]) === 'undefined') return false;
      }
      return true;
    }

    function deepCheckChangesAreReal(kvchanges): boolean {
      // ensure "changes" to array / object / enumerable data properties are legit
      let changesChecked = 0;
      let changesActuallyTheSame = 0;
      if (kvchanges) {
        let addedItemsCount = 0;
        kvchanges.forEachAddedItem((r: KeyValueChangeRecord<string, any>) => {
          addedItemsCount++;
        });
        let removedItemsCount = 0;
        kvchanges.forEachRemovedItem((r: KeyValueChangeRecord<string, any>) => {
          removedItemsCount++;
        });
        if (addedItemsCount > 0 || removedItemsCount > 0) {
          return true;
        }
        kvchanges.forEachChangedItem((r: KeyValueChangeRecord<string, any>) => {
          const curVal = r.currentValue;
          const pVal = r.previousValue;
          const sameVals = compareObjs(curVal, pVal);
          changesChecked++;
          if (sameVals) {
            changesActuallyTheSame++;
          }
        });
      }
      if (!kvchanges || changesActuallyTheSame === changesChecked) {
        return false;
      }
      return true;
    }

    let nodeDataArrayChanges = this._ndaDiffer.diff(this.nodeDataArray);
    const areNodeChangesReal = deepCheckChangesAreReal(nodeDataArrayChanges);
    if (!areNodeChangesReal) {
      nodeDataArrayChanges = null;
    }

    let linkDataArrayChanges = this._ldaDiffer.diff(this.linkDataArray);
    const areLinkChangesReal = deepCheckChangesAreReal(linkDataArrayChanges);
    if (!areLinkChangesReal) {
      linkDataArrayChanges = null;
    }
    let modelDataChanges = null;
    if (this._mdDiffer) {
      modelDataChanges = this._mdDiffer.diff(this.modelData);
      const areModelDataChangesReal = deepCheckChangesAreReal(modelDataChanges);
      if (!areModelDataChangesReal) {
        modelDataChanges = null;
      }
    }
    if (nodeDataArrayChanges || linkDataArrayChanges || modelDataChanges) {
      this.updateFromAppData();
    }
  } // end ngDoCheck

  /**
   * Some input property has changed (or its contents changed) in parent component.
   * Update diagram data accordingly
   */
  public updateFromAppData() {
    if (!this.diagram) return;
    const model = this.diagram.model;
    // don't need model change listener while performing known data updates
    if (this.modelChangedListener !== null) model.removeChangedListener(this.modelChangedListener);

    model.startTransaction('update data');
    model.mergeNodeDataArray(model.cloneDeep(this.nodeDataArray));
    if (this.linkDataArray && model instanceof go.GraphLinksModel) {
      model.mergeLinkDataArray(model.cloneDeep(this.linkDataArray));
    }
    if (this.modelData) {
      model.assignAllDataProperties(model.modelData, this.modelData);
    }
    model.commitTransaction('update data');

    // reset the model change listener
    if (this.modelChangedListener !== null) model.addChangedListener(this.modelChangedListener);
  }

}
