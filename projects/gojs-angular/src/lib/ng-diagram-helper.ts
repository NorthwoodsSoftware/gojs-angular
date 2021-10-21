import { NgZone } from "@angular/core";
import { EventEmitter } from "events";
import * as go from "gojs";
import { DiagramComponent } from "./diagram.component";

/**
 * An interface to allow methods defined below to accept Palette or Diagram Components,
 * without requiring DiagramComponent or PaletteComponent directly in this file
 * (that would create a circular dependency)
 */
export interface IDiagramOrPaletteComponent {
  modelChange: EventEmitter<go.IncrementalData>,
  zone: NgZone,
  nodeDataArray: Array<go.ObjectData>,
  linkDataArray: Array<go.ObjectData>,
  modelData: go.ObjectData
}

/**
 * Defines some shared helper static functions, used in Diagram / Palette / Overview Components
 */
export class NgDiagramHelper{
  constructor() {}

  /**
   * Ensures mousemove event listeners on a diagram's canvas are run outside NgZone.
   * This way, change detection isn't triggered on each mousemove, improving performance.
   *
   * If some state-alteration must happen on a mousemove event inside the diagram, use zone.run() to make sure the event triggers angular change detection.
   * Used by DiagramComponent, PaletteComponent, and OverviewComponent in their ngAfterViewInit lifecycle hooks
   * @param diagram
   * @param zone
   */
  public static makeMouseMoveRunOutsideAngularZone(diagram: go.Diagram, zone: NgZone) {
    diagram.addEventListener = (DOMElement: Element | Window | Document, name: string, listener: any, capture: boolean) => {
      const superAddEventListener = go.Diagram.prototype.addEventListener;
      if (name === 'mousemove') {
        zone.runOutsideAngular(() => superAddEventListener.call(this, DOMElement, name, listener, capture));
      } else {
        zone.run(() => {
          superAddEventListener.call(this, DOMElement, name, listener, capture);
        });
      }
    };
  }

  /**
   * Initialize a given diagram's model with given node / link / model data
   * @param diagram
   * @param nodeDataArray
   * @param linkDataArray
   * @param modelData
   */
  public static initializeModel(diagram: go.Diagram | go.Palette, nodeDataArray: Array<go.ObjectData>, linkDataArray: Array<go.ObjectData>, modelData: go.ObjectData) {
    diagram.delayInitialization(() => {
      const model = diagram.model;
      model.commit((m: go.Model) => {
        if (modelData) {
          m.assignAllDataProperties(m.modelData, modelData);
        }
        m.mergeNodeDataArray(m.cloneDeep(nodeDataArray));
        if (linkDataArray && m instanceof go.GraphLinksModel) {
          m.mergeLinkDataArray(m.cloneDeep(linkDataArray));
        }
      }, null);
    });
  }

  /**
   * Initialize the model changed listener for the Palette / Diagram of a given compoennt; ensure it runs inside the component's ngZone.
   * Those changes will be emitted through a the component's modelChange EventEmitter.
   * @param component
   */
  public static initializeModelChangedListener(component: DiagramComponent) {
    var diagram = null;
    if (!(component.hasOwnProperty("diagram")) && !(component.hasOwnProperty("palette"))) return;
    if (component.hasOwnProperty("diagram")) diagram = component["diagram"];
    if (component.hasOwnProperty("palette")) diagram = component["palette"];
    component.modelChangedListener = (e: go.ChangedEvent) => {
      if (e.isTransactionFinished && e.model && !e.model.isReadOnly && component.modelChange) {
        // this must be done within a NgZone.run block, so changes are detected in the parent component
        component.zone.run(() => {
          const dataChanges = e.model!.toIncrementalData(e);
          if (dataChanges !== null) component.modelChange.emit(dataChanges);
        });
      }
    };
    diagram.addModelChangedListener(component.modelChangedListener);
  }

  /**
   * Merge the app-level node / link / model data of a supplied Diagram|Palette Component with its underlying Diagram|Palette model data
   * @param component
   * @param isInit Whether or not to treat this update as a Diagram initialization
   */
  public static mergeAppDataWithModel(component: IDiagramOrPaletteComponent, isInit?: boolean) {
    var diagram = null;
    if (component.hasOwnProperty("diagram")) diagram = component["diagram"];
    if (component.hasOwnProperty("palette")) diagram = component["palette"];

    diagram.model.commit((m: go.Model) => {
      if (isInit) diagram.model.modelData = {};
      // update modelData first, in case bindings on nodes / links depend on model data
      diagram.model.assignAllDataProperties(diagram.model.modelData, component.modelData);
      // merge node / link data
      if (isInit) diagram.model.nodeDataArray = [];
      diagram.model.mergeNodeDataArray(component.nodeDataArray);
      if (component.linkDataArray && diagram.model instanceof go.GraphLinksModel) {
        if (isInit) diagram.model.linkDataArray = [];
        diagram.model.mergeLinkDataArray(component.linkDataArray);
      }
    }, isInit ? null : 'update data');

  }

}
