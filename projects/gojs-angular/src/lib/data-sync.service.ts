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
  public static syncNodeData(changes: go.IncrementalData, nodeData: Array<go.ObjectData>) {
    if (!changes) return nodeData;
    if (!changes.modifiedNodeData && !changes.insertedNodeKeys && !changes.removedNodeKeys) return nodeData;

    // maintain a map of modified nodes for fast lookup during insertion
    const modifiedNodesMap = new go.Map<go.Key, go.ObjectData>();

    // account for modified node data
    if (changes.modifiedNodeData) {
      changes.modifiedNodeData.forEach((nd: go.ObjectData) => {
        modifiedNodesMap.set(nd.key, nd);
        const key = nd.key;
        for (let i = 0; i < nodeData.length; i++) {
          const ndEntry = nodeData[i];
          if (ndEntry.key === key) {
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
        if (changes.removedNodeKeys.includes(nd.key)) {
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
  public static syncLinkData(changes: go.IncrementalData, linkData: Array<go.ObjectData>) {
    if (!changes) return linkData;
    if (!changes.modifiedLinkData && !changes.insertedLinkKeys && !changes.removedLinkKeys) return linkData;

    // maintain a map of modified nodes for fast lookup during insertion
    const modifiedLinksMap = new go.Map<go.Key, go.ObjectData>();

    // account for modified link data
    if (changes.modifiedLinkData) {
      changes.modifiedLinkData.forEach((ld: go.ObjectData) => {
        modifiedLinksMap.set(ld.key, ld);
        const key = ld.key;
        for (let i = 0; i < linkData.length; i++) {
          const ldEntry = linkData[i];
          if (ldEntry.key === key) {
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
        if (changes.removedLinkKeys.includes(ld.key)) {
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
