# gojs-angular

### By Northwoods Software for [GoJS 2.1](https://gojs.net)

This project provides Angular components for [GoJS](https://gojs.net/latest/index.html) Diagrams, Palettes, and Overviews to simplify usage of GoJS within an Angular application.
See the [gojs-angular-basic project](https://github.com/NorthwoodsSoftware/gojs-angular-basic) for example usage and the
[Intro page on using GoJS with Angular](https://gojs.net/latest/intro/angular.html) for more information.

## Installation

gojs-angular can be installed via NPM. This package has peer dependencies on GoJS and Angular, so make sure those are also installed or included on your page.

### NPM

```bash
npm install --save gojs-angular
```

## Usage

This package provides three components - DiagramComponent, PaletteComponent, and OverviewComponent - corresponding to the related GoJS classes.
The [gojs-angular-basic repository](https://github.com/NorthwoodsSoftware/gojs-angular-basic) provides example usage.
Feel free to use these components as examples for setting up your own Angular components for GoJS.

```html
<gojs-diagram
  [divClassName]='myDiagramDiv'
  [initDiagram]='initDiagram'
  [nodeDataArray]='diagramNodeDataArray'
  [linkDataArray]='diagramLinkDataArray'
  [modelData]='diagramModelData'
  (modelChange)='paletteModelChange($event)'
></gojs-diagram>

<gojs-palette
  [divClassName]='myPaletteDiv'
  [initPalette]='initPalette'
  [nodeDataArray]='paletteNodeData'
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
Specifies the array of links for the Diagram's model.

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
Specifies a modelData object for the Diagram's model.

#### onModelChange (DiagramComponent and PaletteComponent only)
Specifies a function to be called when a GoJS transaction has completed.
This function will typically be responsible for updating app-level state.

```js
// When the diagram model changes, update app data to reflect those changes
public diagramModelChange = function(changes: go.IncrementalData) {
  this.diagramNodeData = DataSyncService.syncNodeData(changes, this.diagramNodeData);
  this.diagramLinkData = DataSyncService.syncLinkData(changes, this.diagramLinkData);
  this.diagramModelData = DataSyncService.syncModelData(changes, this.diagramModelData);
};
```

Notice the use of the three functions of the DataSyncService, which is included with this package to make syncing your app-level data with Diagram / Palette data simple.

#### observedDiagram (OverviewComponent only)
Specifies the go.Diagram which the Overview will observe.

## License

This project is intended to be used alongside [GoJS](https://gojs.net/latest/index.html),
and is covered by the GoJS <a href="https://gojs.net/latest/license.html">software license</a>.

Copyright 1998-2020 by Northwoods Software Corporation.
