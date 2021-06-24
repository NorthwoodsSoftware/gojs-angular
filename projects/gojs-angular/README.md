# gojs-angular
Version 2.0
### By Northwoods Software for [GoJS 2.1](https://gojs.net)

This project provides Angular components for [GoJS](https://gojs.net/latest/index.html) Diagrams, Palettes, and Overviews to simplify usage of GoJS within an Angular application.
The implementation for these components is inside the projects/gojs-angular folder.
See the [gojs-angular-basic project](https://github.com/NorthwoodsSoftware/gojs-angular-basic) for example usage and the
[Intro page on using GoJS with Angular](https://gojs.net/latest/intro/angular.html) for more information.

Version 2.0 expects immutability of all @Input properties to Diagram|Palette|Overview components, and removes `skipsPaletteUpdate` and `modelChange` properties from PaletteComponent. 

## Installation

gojs-angular can be installed via NPM. This package has peer dependencies on GoJS and Angular, so make sure those are also installed or included on your page.

### NPM

```bash
npm install --save gojs-angular
```

## Making Changes

If you want to change how the GoJS / Angular components are implemented, you will need to edit the files in `projects/gojs-angular`, then, from the main directory, run

```bash
npm run package
```

which will create a new package in the folder, dist/angular-gojs, for you to use. Currently, gojs-angular depends on TypeScript and [immer](https://github.com/immerjs/immer).

## Usage

This package provides three components - DiagramComponent, PaletteComponent, and OverviewComponent - corresponding to the related GoJS classes.

**Note**: As of version 2.0, `gojs-angular` assumes immutability of the `@Input` properties given to Diagram/Palette components. The [gojs-angular-basic repository](https://github.com/NorthwoodsSoftware/gojs-angular-basic) provides example usage of these components, as well as preserving state immutability (that project uses [immer](https://github.com/immerjs/immer) to maintain immutability, but you can use whatever you like best).

Below is an example of how you might pass properties to each of the components provided by `gojs-angular`. Here, for immutable data properties that may change, they are stored in an object called `state`. This is not required, but helps with organization.

```html
<gojs-diagram
  [initDiagram]='initDiagram'
  [divClassName]='myDiagramDiv'
  [nodeDataArray]='state.diagramNodeDataArray'
  [linkDataArray]='state.diagramLinkDataArray'
  [modelData]='state.diagramModelData'
  (modelChange)='diagramModelChange($event)'
  [skipsDiagramUpdate]='state.skipsDiagramUpdate'
></gojs-diagram>

<gojs-palette
  [initPalette]='initPalette'
  [divClassName]='myPaletteDiv'
  [nodeDataArray]='state.paletteNodeData'
></gojs-palette>

<gojs-overview
  [initOverview]='initOverview'
  [divClassName]='myOverviewDiv'
  [observedDiagram]='observedDiagram'
></gojs-overview>
```

### Component Properties

#### initDiagram/initPalette/initOverview
Specifies a function that is reponsible for initializing and returning
a GoJS Diagram, Palette, or Overview. In the case of an Overview, this
is an optional property and when not provided, an Overview with default
properties and centered content will be created.

```js
function initDiagram() {
  const $ = go.GraphObject.make;

  const diagram = $(go.Diagram,
    {
      'undoManager.isEnabled': true,
      model: $(go.GraphLinksModel, {
        linkKeyProperty: 'key'  // this should always be set when using a GraphLinksModel
      })
    });

  diagram.nodeTemplate =
    $(go.Node, 'Auto',  // the Shape will go around the TextBlock
      $(go.Shape, 'RoundedRectangle', { strokeWidth: 0, fill: 'white' },
        // Shape.fill is bound to Node.data.color
        new go.Binding('fill', 'color')),
      $(go.TextBlock,
        { margin: 8 },  // some room around the text
        // TextBlock.text is bound to Node.data.key
        new go.Binding('text', 'key'))
    );

  return diagram;
}
```

#### divClassName
Specifies the CSS classname to add to the rendered div.
This should usually specify a width/height.

```css
.myDiagramDiv {
  width: 400px;
  height: 400px;
  border: 1px solid black;
}
```

#### nodeDataArray (DiagramComponent and PaletteComponent only)
Specifies the array of nodes for the Diagram's model.

```js
nodeDataArray: [
  { key: 'Alpha', color: 'lightblue' },
  { key: 'Beta', color: 'orange' },
  { key: 'Gamma', color: 'lightgreen' },
  { key: 'Delta', color: 'pink' }
]
```

#### Optional - linkDataArray (DiagramComponent and PaletteComponent only)

Specifies the array of links for the Diagram's model, only needed when using a [GraphLinksModel](https://gojs.net/latest/api/symbols/GraphLinksModel.html), not for Models or TreeModels. If are using this property, make sure to set the GraphLinksModel's linkKeyProperty in its corresponding initDiagram or initPalette function.

```js
linkDataArray: [
  { key: -1, from: 'Alpha', to: 'Beta' },
  { key: -2, from: 'Alpha', to: 'Gamma' },
  { key: -3, from: 'Beta', to: 'Beta' },
  { key: -4, from: 'Gamma', to: 'Delta' },
  { key: -5, from: 'Delta', to: 'Alpha' }
]
```

#### Optional - modelData (DiagramComponent and PaletteComponent only)
Specifies a shared modelData object for the Diagram's model.

#### skipsDiagramUpdate (DiagramComponent only)
Specifies whether the Diagram component should skip updating, often set to true when updating state from a GoJS model change. 

Because GoJS Palettes are read-only by default, this property is not present in PaletteComponent.

#### modelChange (DiagramComponent)
Specifies a function to be called when a GoJS transaction has completed.
This function will typically be responsible for updating app-level state. Remember, these state properties are assumed to be immutable. This example `modelChange`, is taken from the [gojs-angular-basic](https://github.com/NorthwoodsSoftware/gojs-angular-basic) project, which uses [immer](https://github.com/immerjs/immer)'s `produce` function to maintain immutability.

It is important that state updates made in this function include setting `skipsDiagramUpdate` to true, since the changes are known by GoJS.

Because GoJS Palettes are read-only by default, this property is not present on PaletteComponent. Although there won't be user-driven changes to a Palette's model due to the read-only nature of Palettes, changes to the nodeDataArray, linkDataArray, or shared modelData props described above allow for a Palette's model to be changed, if necessary.

```js
// When the diagram model changes, update app data to reflect those changes. Be sure to preserve immutability
  public diagramModelChange = function(changes: go.IncrementalData) {
    const appComp = this;
    this.state = produce(this.state, draft => {
      // set skipsDiagramUpdate: true since GoJS already has this update
      draft.skipsDiagramUpdate = true;
      draft.diagramNodeData = DataSyncService.syncNodeData(changes, draft.diagramNodeData, appComp.observedDiagram.model);
      draft.diagramLinkData = DataSyncService.syncLinkData(changes, draft.diagramLinkData, appComp.observedDiagram.model);
      draft.diagramModelData = DataSyncService.syncModelData(changes, draft.diagramModelData);
    });
  };
```

Notice the use of the three static functions of the `DataSyncService` (`syncNodeData`, `syncLinkData`, and `syncModelData`), which is included with this package to make syncing your app-level data with Diagram / Palette data simple. 
**Be aware**: If you have set your Diagram's [model.nodeKeyProperty](https://gojs.net/latest/api/symbols/Model.html#nodeKeyProperty) or [model.linkKeyProperty](https://gojs.net/latest/api/symbols/GraphLinksModel.html#linkKeyProperty) to anything other than 'key', you will need to pass your Diagram's model as a third parameter to `DataSyncService.syncNodeData` and `DataSyncService.syncLinkData`.

#### observedDiagram (OverviewComponent only)
Specifies the [Diagram](https://gojs.net/latest/api/symbols/Diagram.html) which the Overview will observe.

## License

This project is intended to be used alongside [GoJS](https://gojs.net/latest/index.html),
and is covered by the GoJS <a href="https://gojs.net/latest/license.html">software license</a>.

Copyright 1998-2021 by Northwoods Software Corporation.