/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-use-before-define */
import * as React from 'react';
import { useEffect, useState } from 'react';
import { Icon, Spin, Layout, notification, Modal, Button, List } from 'antd';
import { fileOpen, directoryOpen } from 'browser-fs-access';
import { v4 as uuidv4 } from 'uuid';
import { useApi } from '@backstage/core-plugin-api';
import { useEntity } from '@backstage/plugin-catalog-react';

import { Sidebar } from './Sidebar';
import { TabData, TabList } from './TabList';
import {
  EditorTabsStorage,
  deleteRequestInfo,
  getProtos,
  getRequestInfo,
  getTabs,
  storeProtos,
  storeRequestInfo,
  storeTabs,
} from '../../storage';
import { EditorEnvironment } from "./Editor";
import { getEnvironments as getEnvFromStorage, saveEnvironments } from "../../storage/environments";

import {
  bloomRPCApiRef,
  EntitySpec,
  GRPCTargetInfo,
  loadProtos,
  ProtoFile,
  ProtoService,
  SavedProto,
  RawPlaceholderFile,
  LoadProtoStatus,
  OnProtoUpload,
  UploadProtoResponse,
  FileWithImports,
  EditorTabs,
  PlaceholderFile,
  RawEntitySpec
} from '../../api';
import { arrayMoveImmutable as arrayMove } from '../../utils'
import { Store } from '../../storage/Store';

import './app.css';

function combineTargetToUrl(target: GRPCTargetInfo): string {
  return `${target.host}:${target.port}`;
}

interface BloomRPCApplicationProps {
  appId: string;
  spec?: RawEntitySpec;
}

const DEFAULT_APP_ID = 'standalone';

const BloomRPCApplication: React.FC<BloomRPCApplicationProps> = ({ appId, spec }) => {
  const [isLoading, setLoading] = useState(false);
  const [protos, setProtosState] = useState<ProtoFile[]>([]);
  const [editorTabs, setEditorTabs] = useState<EditorTabs>({
    activeKey: "0",
    tabs: [],
  });
  const [modalMissingImportsOpen, setModalMissingImportsOpen] = useState(false);

  const isImport = React.useRef<FileWithImports | undefined>();
  const missingImports = React.useRef<FileWithImports[]>([]);

  const bloomRPCApi = useApi(bloomRPCApiRef);

  const [environments, setEnvironments] = useState<EditorEnvironment[]>(getEnvironments());

  function setTabs(props: EditorTabs) {
    setEditorTabs(props);
    storeTabs(props);
  }

  function setProtos(props: ProtoFile[]) {
    setProtosState(props);
    storeProtos(props);
  }

  useEffect(() => {
    Store.setGlobalKey(appId);
    bloomRPCApi.setEntityName(appId);
  }, [appId, bloomRPCApi])

  useEffect(() => {
    // Preload editor with stored data.
    hydrateEditor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getEnvironments(): EditorEnvironment[] {
    const fromStorage = getEnvFromStorage();

    if (spec?.targets && !fromStorage?.length) {
      const fromSpec = Object.keys(spec.targets).map(name => {
        return {
          name,
          url: combineTargetToUrl(spec.targets![name]),
          isDefault: true,
          metadata: '',
          interactive: false,
          tlsCertificate: null as any
        }
      });

      saveEnvironments(fromSpec);
      return fromSpec;
    }

    return fromStorage;
  }

  /**
   * Hydrate editor from persisted storage
   */
  async function hydrateEditor() {
    setLoading(true);
    const rawSpec = { ...(spec || {}) } as RawEntitySpec;
    const entitySpec: EntitySpec = {
      owner: rawSpec.owner,
      system: rawSpec.system,
      lifecycle: rawSpec.lifecycle,
      type: rawSpec.type,
      definition: rawSpec.definition,
      imports: rawSpec.imports?.map(mapRawPlaceholderFile),
      files: rawSpec.files?.map(mapRawPlaceholderFile) || [],
      targets: rawSpec.targets,
    };

    const savedProtos = getProtos();

    if (savedProtos.length) {
      const processProtos: PlaceholderFile[] = savedProtos.map(p => ({
        ...p,
        isPreloaded: true,
      }));

      const fromSpec = entitySpec.files || [];

      // unique protofiles
      fromSpec.forEach((proto: PlaceholderFile) => {
        if (!proto) return;

        // check if saved
        const index = processProtos.findIndex(({ filePath }) => filePath === proto.filePath);
        if (index > -1) {
          processProtos[index] = {
            ...processProtos[index],
            url: proto.url,
          }
        } else {
          processProtos.push(proto);
        }
      });

      entitySpec.files = processProtos;
    }

    bloomRPCApi.getProto({ entitySpec })
      .then(res => {
        handleProtoResult(res);

        const savedEditorTabs = getTabs();
        if (savedEditorTabs) {
          try {
            const tabs = loadTabs(savedEditorTabs, res.protos || protos);

            setEditorTabs(tabs as EditorTabs);
          } catch (err) {
            setEditorTabs({ activeKey: "0", tabs: [] })
          }
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function handleMissingImport() {
    const [missingFor] = missingImports.current || [];
    if (!missingFor) return;
    isImport.current = missingFor;

    toggleModalMissingImports();
  }

  const toggleModalMissingImports = () => {
    setModalMissingImportsOpen(o => !o);
  }

  const handleProtoResult = (res: UploadProtoResponse) => {
    const onProtoUpload = handleProtoUpload(setProtos, protos);

    isImport.current = undefined;

    if (res.protos) {
      if (missingImports.current.length) {
        missingImports.current = missingImports.current.filter(current => {
          return !res.protos!.find(resolved => resolved.proto.filePath === current.filePath)
        })
      }
    }

    switch (res?.status) {
      case LoadProtoStatus.part: {
        if (res.protos) {
          onProtoUpload(res.protos);
        }

        if (res.missingImports?.length) {
          // Merge missing imports
          const map = new Map<string, FileWithImports>();
          const addToMap = (imp: FileWithImports) => map.set(imp.filePath, imp);

          missingImports.current.concat(res.missingImports).forEach(addToMap);
          missingImports.current = Array.from(map.values());
        }
        break;
      }
      case LoadProtoStatus.ok:
        if (res.protos) {
          onProtoUpload(res.protos);
        }
        break;

      default:
      case LoadProtoStatus.fail:
        onProtoUpload(protos, new Error(res.message || 'Unknown error'));
        break;
    }

    if (missingImports.current.length) {
      // still missing imports
      handleMissingImport();
    }
  }

  const openFileUpload = async (directory?: boolean) => {
    let choosenFiles;

    try {
      choosenFiles = !directory
        ? await fileOpen({
          multiple: true,
          id: 'protos',
          extensions: ['.proto'],
        })
        : await directoryOpen({
          recursive: true,
          id: 'proto-directory',
        });
    } catch (err) {
      // User closed file chooser
    }

    if (!choosenFiles) return;

    let fileMappings: Record<string, string> | undefined;

    // filter only proto files
    const uploadFiles = !directory
      ? choosenFiles
      : choosenFiles.filter(file => {
        return file.name.endsWith('.proto');
      });

    if (directory) {
      fileMappings = {};
      uploadFiles.forEach(file => {
        fileMappings![file.name] = file.webkitRelativePath;
      });
    }

    const res: UploadProtoResponse = await bloomRPCApi.uploadProto({
      files: uploadFiles,
      isImport: isImport.current,
      fileMappings,
    });

    handleProtoResult(res);
  }

  const onClickOpenFile = () => {
    toggleModalMissingImports();
    openFileUpload();
  }

  const onClickOpenDirectory = () => {
    toggleModalMissingImports();
    openFileUpload(true);
  }

  const onClickIgnore = () => {
    missingImports.current = missingImports.current.filter(f => {
      return f.filePath !== isImport.current?.filePath
    });
    isImport.current = undefined;

    toggleModalMissingImports();

    if (missingImports.current.length) {
      // 100ms is for current modalMissingImport to finish its closing animation
      setTimeout(() => {
        handleMissingImport();
      }, 100);
    }
  }

  return (
    <Spin spinning={isLoading} indicator={<Icon type="loading" style={{ fontSize: 24 }} />}>
      <Layout style={styles.layout}>
        <Layout>
          <Layout.Sider style={styles.sider} width={300}>
            <Sidebar
              protos={protos}
              openFileUpload={openFileUpload}
              onProtoUpload={handleProtoUpload(setProtos, protos)}
              onReload={hydrateEditor}
              onMethodSelected={handleMethodSelected(editorTabs, setTabs)}
              onDeleteAll={() => {
                setProtos([]);
              }}
              onMethodDoubleClick={handleMethodDoubleClick(editorTabs, setTabs)}
            />
          </Layout.Sider>

          <Layout.Content>
            <TabList
              tabs={editorTabs.tabs || []}
              onDragEnd={({ oldIndex, newIndex }) => {
                const newTab = editorTabs.tabs[oldIndex];

                setTabs({
                  activeKey: newTab && newTab.tabKey || editorTabs.activeKey,
                  tabs: arrayMove(
                    editorTabs.tabs,
                    oldIndex,
                    newIndex,
                  ).filter(e => e),
                })
              }}
              activeKey={editorTabs.activeKey}
              environmentList={environments}
              onEnvironmentChange={() => {
                setEnvironments(getEnvironments());
              }}
              onEditorRequestChange={(editorRequestInfo) => {
                storeRequestInfo(editorRequestInfo);
              }}
              onDelete={(activeKey: string | React.MouseEvent<HTMLElement>) => {
                let newActiveKey = "0";

                const index = editorTabs.tabs
                  .findIndex(tab => tab.tabKey === activeKey);

                if (index === -1) {
                  return;
                }

                if (editorTabs.tabs.length > 1) {
                  if (activeKey === editorTabs.activeKey) {
                    const newTab = editorTabs.tabs[index - 1] || editorTabs.tabs[index + 1];
                    newActiveKey = newTab.tabKey;
                  } else {
                    newActiveKey = editorTabs.activeKey;
                  }
                }

                deleteRequestInfo(activeKey as string);

                setTabs({
                  activeKey: newActiveKey,
                  tabs: editorTabs.tabs.filter(tab => tab.tabKey !== activeKey),
                });

              }}
              onChange={(activeKey: string) => {
                setTabs({
                  activeKey,
                  tabs: editorTabs.tabs || [],
                })
              }}
            />

            <Modal
              footer={[
                <Button key="open-file" icon='file-add' type="primary" onClick={onClickOpenFile}>
                  Import file
                </Button>,
                <Button key="open-directory" icon='folder-add' type="primary" onClick={onClickOpenDirectory}>
                  Import directory
                </Button>,
                <Button key="back" type="danger" icon='stop' onClick={onClickIgnore}>
                  Ignore
                </Button>,
              ]}
              title="Missing dependencies"
              destroyOnClose
              onCancel={onClickIgnore}
              visible={modalMissingImportsOpen}
            >
              {isImport.current ? (
                <>
                  <strong>{isImport.current.filePath}</strong> is missing these files
                  <List
                    bordered={false}
                    dataSource={isImport.current?.missing}
                    renderItem={item => (
                      <List.Item>
                        <Icon type='file' style={{ marginRight: 10 }} />
                        {item.filePath}
                      </List.Item>
                    )}
                  />
                </>
              ) : null}

            </Modal>
          </Layout.Content>
        </Layout>

      </Layout>
    </Spin>
  );
}

export function StandaloneApp() {
  return (
    <BloomRPCApplication
      appId={DEFAULT_APP_ID}
    />
  )
}

export function App() {
  const { entity } = useEntity();

  return (
    <BloomRPCApplication
      appId={entity?.metadata?.name || DEFAULT_APP_ID}
      spec={entity?.spec as RawEntitySpec | undefined}
    />
  )
}

/**
 * Hydrate editor from persisted storage
 * @deprecated - we now get protos from BE plugin with API
 * 
 * @param setProtos
 * @param setEditorTabs
 */
async function hydrateEditor(setProtos: React.Dispatch<ProtoFile[]>, setEditorTabs: React.Dispatch<EditorTabs>, defaultProto?: SavedProto) {
  const savedProtos = getProtos();

  if (savedProtos) {
    const processProtos = [...savedProtos];

    if (!savedProtos.length && defaultProto) {
      // load default definition
      processProtos.push(defaultProto);
    }

    const loadedProtos = loadProtos(processProtos, handleProtoUpload(setProtos, []));

    const savedEditorTabs = getTabs();
    if (savedEditorTabs) {
      try {
        const tabs = loadTabs(savedEditorTabs, loadedProtos)

        setEditorTabs(tabs as EditorTabs)
      } catch (err) {
        setEditorTabs({ activeKey: "0", tabs: [] })
      }
    }
  }
}

/**
 * Load tabs
 * @param editorTabs
 */
function loadTabs(editorTabs: EditorTabsStorage, loadedProtos?: ProtoFile[]): EditorTabs {
  const storedEditTabs: EditorTabs = {
    activeKey: editorTabs.activeKey,
    tabs: [],
  };

  const previousTabs = editorTabs.tabs.map((tab) => {
    const def = loadedProtos?.find((protoFile) => {
      const match = Object.keys(protoFile.services).find((service) => service === tab.serviceName);
      return Boolean(match);
    });

    // Old Definition Not found
    if (!def) {
      return false;
    }

    return {
      tabKey: tab.tabKey,
      methodName: tab.methodName,
      service: def.services[tab.serviceName],
      initialRequest: getRequestInfo(tab.tabKey),
    }
  });

  storedEditTabs.tabs = previousTabs.filter((tab) => tab) as TabData[];

  return storedEditTabs;
}

/**
 *
 * @param setProtos
 * @param protos
 */
function handleProtoUpload(setProtos: React.Dispatch<ProtoFile[]>, protos: ProtoFile[]): OnProtoUpload {
  return function (newProtos: ProtoFile[], err: Error | void) {
    if (err) {
      notification.error({
        message: "Error while importing protos",
        description: err.message,
        duration: 5,
        placement: "bottomLeft",
        style: {
          width: "89%",
          wordBreak: "break-all",
        }
      });
    }

    const protoMinusExisting = protos.filter((proto) => {
      return !newProtos.find((p) => p.fileName === proto.fileName)
    });

    const appProtos = [...protoMinusExisting, ...newProtos];
    setProtos(appProtos);

    return appProtos;
  }
}

/**
 * Handle method selected
 * @param editorTabs
 * @param setTabs
 */
function handleMethodSelected(editorTabs: EditorTabs, setTabs: React.Dispatch<EditorTabs>) {
  return (methodName: string, protoService: ProtoService) => {
    const tab = {
      tabKey: `${protoService.proto.filePath}${protoService.serviceName}${methodName}`,
      methodName,
      service: protoService
    };

    const tabExists = editorTabs.tabs
      .find(exisingTab => exisingTab.tabKey === tab.tabKey);

    if (tabExists) {
      setTabs({
        activeKey: tab.tabKey,
        tabs: editorTabs.tabs,
      });
      return;
    }

    const newTabs = [...editorTabs.tabs, tab];

    setTabs({
      activeKey: tab.tabKey,
      tabs: newTabs,
    });
  }
}

function handleMethodDoubleClick(editorTabs: EditorTabs, setTabs: React.Dispatch<EditorTabs>) {
  return (methodName: string, protoService: ProtoService) => {
    const tab = {
      tabKey: `${protoService.serviceName}${methodName}-${uuidv4()}`,
      methodName,
      service: protoService
    };

    const newTabs = [...editorTabs.tabs, tab];

    setTabs({
      activeKey: tab.tabKey,
      tabs: newTabs,
    });
  }

}

const mapRawPlaceholderFile = ({
  file_name, is_library, file_path,
  url, is_preloaded, imports,
}: RawPlaceholderFile): PlaceholderFile => ({
  fileName: file_name,
  filePath: file_path,
  isPreloaded: is_preloaded,
  isLibrary: is_library,
  imports: imports?.map(mapRawPlaceholderFile),
  url
});


const styles = {
  layout: {
    // height: "100vh"
  },
  header: {
    color: "#fff",
    fontWeight: 900,
    fontSize: 20,
    display: "flex",
    justifyContent: "space-between",
  },
  sider: {
    zIndex: 20,
    borderRight: "1px solid rgba(0, 21, 41, 0.18)",
    backgroundColor: "white",
    boxShadow: "3px 0px 4px 0px rgba(0,0,0,0.10)",
  },
};
