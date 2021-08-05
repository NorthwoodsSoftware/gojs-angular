import { Component, ElementRef, EventEmitter, Input, KeyValueDiffer, KeyValueDiffers, NgZone, Output, ViewChild, KeyValueChangeRecord } from '@angular/core';
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
  public modelChangedListener: (e: go.ChangedEvent) => void | null = null;

  @Input() public skipsDiagramUpdate: boolean = false;

  // event emitter -- fires when diagram model changes. Capture this emitted event in parent component
  @Output() public modelChange: EventEmitter<go.IncrementalData> = new EventEmitter<go.IncrementalData>();

  @ViewChild('ngDiagram', { static: true }) public diagramDiv: ElementRef;
  public diagram: go.Diagram = null;

  // differs for array inputs (node / link data arrays)
  private _ndaDiffer: KeyValueDiffer<string, any>;
  private _ldaDiffer: KeyValueDiffer<string, any>;
  private _mdaDiffer: KeyValueDiffer<string, any>;

  /** An internal flag used to tell ngOnChanges to treat the next sync operation as a Diagram initialization */
  private wasCleared: boolean = false;

  constructor(private _kvdiffers: KeyValueDiffers, public zone: NgZone) {
    // differs used to check if there have been changed to the array @Inputs
    // without them, changes to the input arrays won't register in ngOnChanges,
    // since the array reference itself may be the same
    this._ndaDiffer = this._kvdiffers.find([]).create();
    this._ldaDiffer = this._kvdiffers.find([]).create();

    this._mdaDiffer = this._kvdiffers.find([]).create();
  }

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
      if (e.isTransactionFinished && this.diagram && this.diagram.model && !this.diagram.model.isReadOnly) {
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
   * Merges changes from app data into GoJS model data, 
   * making sure only actual changes (and not falsely flagged no-ops on array / obj data props) are logged
   * @param component an instance of DiagramComponent or PaletteComponent
   * @param kvchanges The kvchanges object produced by either a node or link Angular differ object
   * @param str "n" for node data changes, "l" for link data changes
   *  */ 
  public static mergeChanges(component, kvchanges, str): boolean {

    // helper function
    function compareObjs(obj1, obj2) {

      if (!obj1 || !obj2) return false;

      // Loop through properties in object 1
      for (const p in obj1) {
        // Check property exists on both objects
        if (obj1.hasOwnProperty(p) !== obj2.hasOwnProperty(p)) return false;

        switch (typeof (obj1[p])) {
          // Deep compare objects
          case 'object':
            if (!compareObjs(obj1[p], obj2[p])) return false;
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

    var dia = component instanceof DiagramComponent ? component.diagram : component.palette;

    if (!dia || !dia.model) return;

    if (kvchanges) {

      // handle added nodes / links
      kvchanges.forEachAddedItem((r: KeyValueChangeRecord<string, any>) => {
        switch (str) {
          case "n": {
            dia.model.addNodeData(r.currentValue);
            break;
          }
          case "l": {
            var m = <go.GraphLinksModel>dia.model;
            m.addLinkData(r.currentValue);
            break;
          }
        }
      });

      // handle removed nodes / links
      kvchanges.forEachRemovedItem((r: KeyValueChangeRecord<string, any>) => {
        switch (str) {
          case "n": {
            let m = dia.model;
            let keyPropName = m.nodeKeyProperty.toString();
            var node = dia.findNodeForKey(r.previousValue[keyPropName]);
            if (node) {
              dia.remove(node);
            }
            break;
          }
          case "l": {
            let m = <go.GraphLinksModel>dia.model;
            var keyPropName = m.linkKeyProperty.toString();
            var link = dia.findLinkForKey(r.previousValue[keyPropName]);
            if (link) {
              dia.remove(link);
            }
            break;
          }
        }
      });

      // handle changed data for nodes / links
      kvchanges.forEachChangedItem((r: KeyValueChangeRecord<string, any>) => {
        
        // ensure "changes" to array / object / enumerable data properties are legit
        const sameVals = compareObjs(r.currentValue, r.previousValue);

        // update proper data object for node or link
        if (!sameVals) {
          switch (str) {
            case "n": {
              let m = dia.model;
              let keyPropName = m.nodeKeyProperty.toString();
              var node = dia.findNodeForKey(r.previousValue[keyPropName]);
              if (node) {
                // if the entry was replaced with null or undefined, just remove the entry altogther
                // this is still pretty bad practice -- instead, users should remove entries in their node / link / model data, not set them to null
                if (!r.currentValue) {
                  dia.remove(node);
                } else {
                  dia.model.assignAllDataProperties(node.data, r.currentValue);
                }
              }
              break;
            }
            case "l": {
              let m = <go.GraphLinksModel>dia.model;
              var keyPropName = m.linkKeyProperty.toString();
              var link = dia.findLinkForKey(r.previousValue[keyPropName]);
              if (link) {
                // if the entry was replaced with null or undefined, just remove the entry altogther
                // this is still pretty bad practice -- instead, users should remove entries in their node / link / model data, not set them to null
                if (!r.currentValue) {
                  dia.remove(link);
                } else {
                  dia.model.assignAllDataProperties(link.data, r.currentValue);
                }
              }
              break;
            }
          }
        }
        
      });
    }
    
  } // end mergeChanges function

  /**
   * Always be checking if array Input data has changed (node and link data arrays)
   */
  public ngDoCheck() {

    if (!this.diagram) return;
    if (!this.diagram.model) return;

    // these need to be run each check, even if no merging happens
    // otherwise, they will detect all diffs that happened since last time skipsDiagram was false,
    // such as remove ops that happened in GoJS when skipsDiagram = true, 
    // and then realllllly bad stuff happens (deleting random nodes, updating the wrong Parts)
    // Angular differs are a lot of fun
    var nodeDiffs = this._ndaDiffer.diff(this.nodeDataArray);
    var linkDiffs = this._ldaDiffer.diff(this.linkDataArray);

    var modelDiffs = this._mdaDiffer.diff(this.modelData);

    if (!nodeDiffs && !linkDiffs && !modelDiffs) return;

    if (this.skipsDiagramUpdate) return;

    if (this.wasCleared) {
      this.diagram.delayInitialization(() => {
        this.mergeAppDataWithModel(this, nodeDiffs, linkDiffs, true);
        this.wasCleared = false;
      });  
    } else {
      this.mergeAppDataWithModel(this, nodeDiffs, linkDiffs, false);
    }

  } // end ngDoCheck

  private mergeAppDataWithModel(component: DiagramComponent, nodeDiffs, linkDiffs, isInit?: boolean) {
    // don't need model change listener while performing known data updates
    if (component.modelChangedListener !== null) this.diagram.model.removeChangedListener(this.modelChangedListener);

    component.diagram.model.startTransaction('update data');
   // if (isInit) component.diagram.model.modelData = {};
    // update modelData first, in case bindings on nodes / links depend on model data
    component.diagram.model.assignAllDataProperties(this.diagram.model.modelData, this.modelData);
    // merge node / link data
    // if (isInit) component.diagram.model.nodeDataArray = [];
    // DiagramComponent.mergeChanges(component, nodeDiffs, "n");
    this.diagram.model.mergeNodeDataArray(this.nodeDataArray);
    if (component.linkDataArray && component.diagram.model instanceof go.GraphLinksModel) {
      // if (isInit) component.diagram.model.linkDataArray = [];
      component.diagram.model.mergeLinkDataArray(this.linkDataArray);
      // DiagramComponent.mergeChanges(component, linkDiffs, "l");
    }
    component.diagram.model.commitTransaction('update data');

    // reset the model change listener
    if (component.modelChangedListener !== null) component.diagram.model.addChangedListener(this.modelChangedListener);
  } // end mergeAppDataWithModel function

  /**
   * Clears the diagram of all nodes, links, and model data.
   * Also clears the UndoManager history and clipboard.
   * The next state update will be treated as diagram initialization.
   */
   public clear(): void {
    const diagram = this.diagram;
    if (diagram !== null) {
      diagram.clear();
      this.wasCleared = true;
    }
  } // end clear function

  public ngOnDestroy() {
    this.diagram.div = null; // removes event listeners
  } // end ngOnDestroy function

} // end DiagramComponent class
