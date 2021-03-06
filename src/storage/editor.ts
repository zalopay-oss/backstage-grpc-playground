import { ProtoFile, EditorTabs, EditorRequest, EditorTabRequest, SavedProto, PlaceholderFile } from '../api';
import { Store } from './Store';

const EditorStore = new Store({
  name: "editor",
});

const KEYS = {
  URL: "url",
  PROTOS: "protos",
  TABS: "tabs",
  REQUESTS: "requests",
  INTERACTIVE: "interactive",
  METADATA: "metadata",
};

/**
 * Store URL
 * @param url
 */
export function storeUrl(url: string) {
  EditorStore.set(KEYS.URL, url);
}

/**
 * Get URL
 */
export function getUrl(): string | void {
  return EditorStore.get(KEYS.URL);
}

/**
 * Store Proto List on the sidebar
 * @param protos
 */
export function storeProtos(protos: ProtoFile[]) {
  const protosToSave: SavedProto[] = protos.map(proto => ({
    fileName: proto.fileName,
    filePath: proto.proto.filePath,
    imports: proto.proto.imports,
  }));

  EditorStore.set(KEYS.PROTOS, protosToSave);
}

/**
 * Get proto list
 */
export function getProtos(): SavedProto[] {
  return EditorStore.get(KEYS.PROTOS, []);
}

/**
 * Store tabs
 * @param editorTabs
 */
export function storeTabs(editorTabs: EditorTabs) {
  const tabsToSave: EditorTabsStorage = {
    activeKey: editorTabs.activeKey,
    tabs: editorTabs.tabs.map((tab) => ({
      methodName: tab.methodName,
      serviceName: tab.service.serviceName,
      protoPath: tab.service.proto.filePath,
      importPaths: tab.service.proto.imports,
      tabKey: tab.tabKey,
    }))
  };

  EditorStore.set(KEYS.TABS, tabsToSave)
}

export interface EditorTabsStorage {
  activeKey: string,
  tabs: {
    protoPath: string,
    methodName: string,
    serviceName: string,
    tabKey: string,
    imports?: PlaceholderFile[]
  }[]
}

/**
 * Get tabs
 */
export function getTabs(): EditorTabsStorage | void {
  return EditorStore.get(KEYS.TABS);
}

interface TabRequestInfo extends EditorRequest {
  id: string
}

/**
 * Store editor request info
 * @param id
 * @param url
 * @param data
 * @param inputs
 * @param metadata
 * @param interactive
 * @param tlsCertificate
 */
export function storeRequestInfo({id, url, data, inputs, metadata, interactive, tlsCertificate, environment, grpcWeb}: EditorTabRequest) {
  const request = {
    id,
    url,
    data: inputs || data,
    metadata,
    interactive,
    tlsCertificate,
    environment,
    grpcWeb,
    createdAt: new Date().toISOString(),
  };

  const requestList = EditorStore.get('requests', [])
    .filter((requestItem: TabRequestInfo) => requestItem.id !== id);

  EditorStore.set(KEYS.REQUESTS, [...requestList, request]);
}

export function storeMetadata(metadata: string) {
  EditorStore.set(KEYS.METADATA, metadata);
}

export function getMetadata() {
  return EditorStore.get(KEYS.METADATA);
}

/**
 * Get editor request info
 * @param tabKey
 */
export function getRequestInfo(tabKey: string): EditorRequest | undefined {
  const requests = EditorStore.get(KEYS.REQUESTS, []);
  return requests.find((request: TabRequestInfo) => request.id === tabKey);
}

/**
 * Delete editor request info
 * @param tabKey
 */
export function deleteRequestInfo(tabKey: string) {
  const requests = EditorStore.get(KEYS.REQUESTS, [])
    .filter((requestItem: TabRequestInfo) => requestItem.id !== tabKey);

  EditorStore.set('requests', requests);
}

export function clearEditor() {
  EditorStore.clear();
}

export { EditorStore };


