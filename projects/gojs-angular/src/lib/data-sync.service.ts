import { Injectable } from '@angular/core';
import * as go from 'gojs';
import produce, { current } from "immer";

@Injectable()
export class DataSyncService {

  /**
   * Sync a node data array with a set of changes
   * @param changes The set of changes to the GoJS model
   * @param nodeData The node data array to merge these changes with
   * @param model Required if you have defined your model.nodeKeyProperty to be something other than 'key'
   * @returns A node data array, merged with the changes
   */
  public static syncNodeData(changes: go.IncrementalData, nodeData: Array<go.ObjectData>, model?: go.Model) {
    if (!changes) return nodeData;
    if (!changes.modifiedNodeData && !changes.insertedNodeKeys && !changes.removedNodeKeys) return nodeData;

    // maintain a map of modified nodes for fast lookup during insertion
    const modifiedNodesMap = new go.Map<go.Key, go.ObjectData>();
    // generate a map of keys -> indices for faster operations
    const keyIdxMap = new Map<go.Key, number>();
    nodeData.forEach((nd, idx) => {
      const key = model ? model.getKeyForNodeData(nd) : nd['key'];
      keyIdxMap.set(key, idx);
    });

    // nodeData is immutable, modify it using the immer package's "produce" function (creates new array)
    var newNodeDataArray = produce(nodeData, (draft) => {
      // account for modified node data
      if (changes.modifiedNodeData) {
        changes.modifiedNodeData.forEach((nd: go.ObjectData) => {
          // Get the value of the node key property checking wether is a function or a string
          const key = model ? model.getKeyForNodeData(nd) : nd['key'];
          modifiedNodesMap.set(key, nd);
          const idx = keyIdxMap.get(key);
          if (idx !== undefined && idx >= 0) {
            draft[idx] = nd;
          }
        });
      }

      // account for inserted node data
      if (changes.insertedNodeKeys) {
        changes.insertedNodeKeys.forEach((key: go.Key) => {
          const nd = modifiedNodesMap.get(key);
          if (nd && !keyIdxMap.has(key)) {
            draft.push(nd);
          }
        });
      }

      // account for removed node data
      if (changes.removedNodeKeys) {
        const removals = changes.removedNodeKeys.map(key => keyIdxMap.get(key)) as number[];
        removals.sort((a, b) => a - b);
        for (let i = removals.length - 1; i >= 0; i--) {
          draft.splice(removals[i], 1);
        }
      }
    });

    return newNodeDataArray;
  }

  /**
   * Sync a link data array with a set of changes
   * @param changes The set of changes to the GoJS model
   * @param linkData The link data array to merge these changes with
   * @param model Required if you have defined your model.linkKeyProperty to be something other than 'key'
   * @returns A link data array, merged with the changes
   */
  public static syncLinkData(changes: go.IncrementalData, linkData: Array<go.ObjectData>, model?: go.GraphLinksModel) {
    if (!changes) return linkData;
    if (!changes.modifiedLinkData && !changes.insertedLinkKeys && !changes.removedLinkKeys) return linkData;

    // maintain a map of modified nodes for fast lookup during insertion
    const modifiedLinksMap = new go.Map<go.Key, go.ObjectData>();
    // generate a map of keys -> indices for faster operations
    const keyIdxMap = new Map<go.Key, number>();
    linkData.forEach((ld, idx) => {
      const key = model ? model.getKeyForLinkData(ld) : ld['key'];
      keyIdxMap.set(key, idx);
    });

    // linkData is immutable, modify it using the immer package's "produce" function (creates new array)
    linkData = produce(linkData, draft => {
      // account for modified link data
      if (changes.modifiedLinkData) {
        changes.modifiedLinkData.forEach((ld: go.ObjectData) => {
          // Get the value of the link key
          const key = model ? model.getKeyForLinkData(ld) : ld['key'];
          modifiedLinksMap.set(key, ld);
          const idx = keyIdxMap.get(key);
          if (idx !== undefined && idx >= 0) {
            draft[idx] = ld;
          }
        });
      }

      // account for inserted link data
      if (changes.insertedLinkKeys) {
        changes.insertedLinkKeys.forEach((key: go.Key) => {
          const nd = modifiedLinksMap.get(key);
          if (nd && !keyIdxMap.has(key)) {
            draft.push(nd);
          }
        });
      }

      // account for removed link data
      if (changes.removedLinkKeys) {
        const removals = changes.removedLinkKeys.map(key => keyIdxMap.get(key)) as number[];
        removals.sort((a, b) => a - b);
        for (let i = removals.length - 1; i >= 0; i--) {
          draft.splice(removals[i], 1);
        }
      }
    });

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
