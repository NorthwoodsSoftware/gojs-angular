import { Component, ElementRef, EventEmitter, Input, NgZone, Output, ViewChild } from '@angular/core';
import * as go from 'gojs';
import { NgDiagramHelper } from './ng-diagram-helper';

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
  /**  Node data for diagram */
  @Input() public nodeDataArray: Array<go.ObjectData>;
  /**  Link data for diagram. Optional. */
  @Input() public linkDataArray: Array<go.ObjectData> = null;
  /** Model data for diagram. Optional. */
  @Input() public modelData: go.ObjectData = null; 
  /** Diagram div class name. Use this name to style your diagram in CSS. */
  @Input() public divClassName: string;
  /** Model changed listener function for diagram */
  public modelChangedListener: ((e: go.ChangedEvent) => void) | null = null;
  /** Whether or not to skip merging app data with GoJS model data (set to true if update is coming from GoJS, false if coming from app-level, usually) */
  @Input() public skipsDiagramUpdate: boolean = false;
  /** Event emitter -- fires when diagram model changes. Capture this emitted event in parent component */
  @Output() public modelChange: EventEmitter<go.IncrementalData> = new EventEmitter<go.IncrementalData>();
  /** The DIV element holding the Diagram */
  @ViewChild('ngDiagram', { static: true }) public diagramDiv: ElementRef;
  /** The Diagram itself */
  public diagram: go.Diagram = null;

  constructor(public zone: NgZone) {  }

  /**
   * Initializes diagram / model after view init
   */
  public ngAfterViewInit() {
    if (!this.diagramDiv) {
      throw new Error("diagramDiv is not defined");
    }
    this.diagram = this.initDiagram();
    if (!(this.diagram instanceof go.Diagram)) {
      throw new Error("initDiagram function did not return a go.Diagram");
    } 

    // reduces change detection on mouse moves, boosting performance
    NgDiagramHelper.makeMouseMoveRunOutsideAngularZone(this.diagram, this.zone);

    // assign the Diagram's div, which (among many other things) will attach a bunch of listeners to the canvas,
    // using the overridden addEventListener function defined in makeMouseMoveRunOutsideAngularZone
    const divRef = this.diagramDiv.nativeElement;
    if (divRef === null) return;
    this.diagram.div = divRef;

    // initialize the diagram model with the provided node / link / model data
    NgDiagramHelper.initializeModel(this.diagram, this.nodeDataArray, this.linkDataArray, this.modelData);
    // initializer model listener
    NgDiagramHelper.initializeModelChangedListener(this);
  } // end ngAfterViewInit

  /**
   * If a change has occured on an @Input property, merge the app-level changes with GoJS
   */
  public ngOnChanges() {
    if (!this.diagram || !this.diagram.model || this.skipsDiagramUpdate) return;
    NgDiagramHelper.mergeAppDataWithModel(this);
  } // end ngOnChanges

  public ngOnDestroy() {
    this.diagram.div = null; // removes event listeners
  }

}
