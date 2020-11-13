import { Injectable } from '@angular/core';
import * as go from 'gojs';

@Injectable({
  providedIn: 'root'
})
export class DataSyncService {

  constructor() { }

  /**
   * Sync a node data array with a set of changes
   * @param changes The set of changes to the GoJS model
   * @param nodeData The node data array to merge these changes with
   * @returns A node data array, merged with the changes
   */
  public static syncNodeData(changes: go.IncrementalData, nodeData: Array<go.ObjectData>, model?: go.Model) {
    if (!changes) return nodeData;
    if (!changes.modifiedNodeData && !changes.insertedNodeKeys && !changes.removedNodeKeys) return nodeData;

    // get the property name that will return a unique value for the node
    const nodeKeyProperty = model ? model.nodeKeyProperty : 'key';

    // maintain a map of modified nodes for fast lookup during insertion
    const modifiedNodesMap = new go.Map<go.Key, go.ObjectData>();

    // account for modified node data
    if (changes.modifiedNodeData) {
      changes.modifiedNodeData.forEach((nd: go.ObjectData) => {
        // Get the value of the node key property checking wether is a function or a string
        const key = (nodeKeyProperty instanceof Function) ? nodeKeyProperty(nd).toString() : nd[nodeKeyProperty];
        modifiedNodesMap.set(key, nd);
        for (let i = 0; i < nodeData.length; i++) {
          const ndEntry = nodeData[i];
          const keyNdEntry = (nodeKeyProperty instanceof Function) ? nodeKeyProperty(ndEntry).toString() : ndEntry[nodeKeyProperty];
          if (keyNdEntry === key) {
            nodeData[i] = nd;
          }
        }
      });
    }

    // account for inserted node data
    if (changes.insertedNodeKeys) {
      changes.insertedNodeKeys.forEach((key: go.Key) => {
        const nd = modifiedNodesMap.get(key);
        if (nd) {
          nodeData.push(nd);
        }
      });
    }

    // account for removed node data
    if (changes.removedNodeKeys) {
      nodeData = nodeData.filter((nd: go.ObjectData) => {
        const key = (nodeKeyProperty instanceof Function) ? nodeKeyProperty(nd).toString() : nd[nodeKeyProperty];
        if (changes.removedNodeKeys.includes(key)) {
          return false;
        } return true;
      });
    }

    return nodeData;
  }

  /**
   * Sync a link data array with a set of changes
   * @param changes The set of changes to the GoJS model
   * @param linkData The link data array to merge these changes with
   * @returns A link data array, merged with the changes
   */
  public static syncLinkData(changes: go.IncrementalData, linkData: Array<go.ObjectData>, model?: go.GraphLinksModel) {
    if (!changes) return linkData;
    if (!changes.modifiedLinkData && !changes.insertedLinkKeys && !changes.removedLinkKeys) return linkData;

    // get the property name that will return a unique value for the node
    const linkKeyProperty = model ? model.linkKeyProperty : 'key';

    // maintain a map of modified nodes for fast lookup during insertion
    const modifiedLinksMap = new go.Map<go.Key, go.ObjectData>();

    // account for modified link data
    if (changes.modifiedLinkData) {
      changes.modifiedLinkData.forEach((ld: go.ObjectData) => {
        // Get the value of the node key property checking wether is a function or a string
        const key = (linkKeyProperty instanceof Function) ? linkKeyProperty(ld).toString() : ld[linkKeyProperty];

        modifiedLinksMap.set(key, ld);

        for (let i = 0; i < linkData.length; i++) {
          const ldEntry = linkData[i];
          const keyLdEntry = (linkKeyProperty instanceof Function) ? linkKeyProperty(ldEntry).toString() : ldEntry[linkKeyProperty];
          if (keyLdEntry === key) {
            linkData[i] = ld;
          }
        }
      });
    }

    // account for inserted link data
    if (changes.insertedLinkKeys) {
      changes.insertedLinkKeys.forEach((key: go.Key) => {
        const nd = modifiedLinksMap.get(key);
        if (nd) {
          linkData.push(nd);
        }
      });
    }

    // account for removed link data
    if (changes.removedLinkKeys) {
      linkData = linkData.filter((ld: go.ObjectData) => {
        const key = (linkKeyProperty instanceof Function) ? linkKeyProperty(ld).toString() : ld[linkKeyProperty];
        if (changes.removedLinkKeys.includes(key)) {
          return false;
        } return true;
      });
    }

    return linkData;
  }

  /**
   * Sync modelData with a set of changes
   * @param changes The set of changes to the GoJS model
   * @param modelData The modelData to merge these changes with
   * @returns A modelData object, merged with the changes
   */
  public static syncModelData(changes: go.IncrementalData, modelData: go.ObjectData) {
    if (!changes) return modelData;
    if (!changes.modelData) return modelData;
    if (changes.modelData) {
      return changes.modelData;
    }
  }


}
