/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-use-before-define */
import React, { useRef } from 'react';
import { useEffect, useState } from 'react';
import {
  FileAddOutlined,
  FileOutlined,
  FolderAddOutlined,
  LoadingOutlined,
  MenuOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { Spin, Layout, Modal, Button, List, Drawer } from 'antd';
import { fileOpen, directoryOpen } from 'browser-fs-access';
import { v4 as uuidv4 } from 'uuid';
import pathParse from 'path-parse';
import { configApiRef, useApi } from '@backstage/core-plugin-api';
import { useEntity } from '@backstage/plugin-catalog-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

import 'antd/dist/antd.css';
import 'github-markdown-css';

import { handleProtoUpload, ProtoContextProvider, useProtoContext } from './ProtoProvider';
import { Sidebar } from './Sidebar';
import { TabData, TabList } from './TabList';
import {
  EditorTabsStorage,
  deleteRequestInfo,
  getProtos,
  getRequestInfo,
  getTabs,
  storeRequestInfo,
  storeTabs,
} from '../../storage';
import { EditorEnvironment } from "./Editor";
import { DocSidebar } from './Sidebar';
import { getEnvironments as getEnvFromStorage, saveEnvironments } from "../../storage/environments";

import {
  grpcPlaygroundApiRef,
  EntitySpec,
  GRPCTargetInfo,
  ProtoFile,
  ProtoService,
  RawPlaceholderFile,
  UploadProtoResponse,
  EditorTabs,
  PlaceholderFile,
  RawEntitySpec,
  Library,
  RawLibrary
} from '../../api';
import { arrayMoveImmutable as arrayMove } from '../../utils'
import { Store } from '../../storage/Store';

import './app.css';
import { CertificateContextProvider, useCertificateContext } from './CertificateProvider';

function combineTargetToUrl(target: GRPCTargetInfo): string {
  if (!target.port) {
    return target.host;
  }

  if (target.port === 80) return target.host;
  if (target.port === 443) return `https://${target.host}`;

  return `${target.host}:${target.port}`;
}

interface GrpcPlaygroundApplicationProps {
  appId: string;
  spec?: RawEntitySpec;
}

const DEFAULT_APP_ID = 'standalone';

const GrpcPlaygroundApplication: React.FC<GrpcPlaygroundApplicationProps> = ({ appId, spec }) => {
  const [isLoading, setLoading] = useState(false);
  const [editorTabs, setEditorTabs] = useState<EditorTabs>({
    activeKey: "0",
    tabs: [],
  });
  const {
    protos,
    setProtos,
    handleProtoResult,
    toggleModalMissingImports,
    modalMissingImportsOpen,
    importFor,
    ignoreCurrentMissingImport,
  } = useProtoContext()!;

  const {
    missingCertificate,
    missingCertFiles,
    handleImportCert,
    modalMissingCertsOpen,
    ignoreCurrentMissingCert,
    toggleModalMissingCerts,
  } = useCertificateContext()!;

  const grpcPlaygroundApi = useApi(grpcPlaygroundApiRef);
  const configApi = useApi(configApiRef);

  const [environments, setEnvironments] = useState<EditorEnvironment[]>(getEnvironments());

  function setTabs(props: EditorTabs) {
    setEditorTabs(props);
    storeTabs(props);
  }

  useEffect(() => {
    Store.setGlobalKey(appId);
    grpcPlaygroundApi.setEntityName(appId);
  }, [appId, grpcPlaygroundApi])

  useEffect(() => {
    // Preload editor with stored data.
    hydrateEditor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getEnvironments(): EditorEnvironment[] {
    const fromStorage = getEnvFromStorage();

    const map = new Map<string, EditorEnvironment>();

    fromStorage.forEach(env => {
      map.set(env.name, env);
    })

    if (spec?.targets) {
      // fromSpec = Object.keys(spec.targets).map(name => {
      Object.keys(spec.targets).forEach(name => {
        map.set(name, {
          name,
          url: combineTargetToUrl(spec.targets![name]),
          isDefault: true,
          metadata: '',
          interactive: false,
          tlsCertificate: null as any
        });
      });
    }

    const result = Array.from(map.values());

    saveEnvironments(result);

    return result;
  }

  /**
   * Hydrate editor from persisted storage
   */
  async function hydrateEditor() {
    setLoading(true);
    const isGenDoc = configApi.getOptionalBoolean('grpcPlayground.document.enabled');

    const entitySpec = parseRawEntitySpec(spec);

    grpcPlaygroundApi.getProto({ entitySpec, isGenDoc })
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
    } else if (importFor) {
      fileMappings = {};
      let relativePath: string | undefined;

      try {
        relativePath = pathParse(importFor.missing?.[0].filePath || '').dir;
      } catch (err) {
        // ignore
      }

      uploadFiles.forEach(file => {
        fileMappings![file.name] = file.webkitRelativePath ||
          (relativePath ? [relativePath, file.name].join('/') : '');
      });
    }

    const isGenDoc = configApi.getOptionalBoolean('grpcPlayground.document.enabled');

    const res: UploadProtoResponse = await grpcPlaygroundApi.uploadProto({
      files: uploadFiles,
      importFor: importFor,
      fileMappings,
      isGenDoc
    });

    handleProtoResult(res, true);
  }

  const onClickOpenFile = () => {
    toggleModalMissingImports();
    openFileUpload();
  }

  const onClickOpenCertFile = () => {
    toggleModalMissingCerts();

    handleImportCert(
      grpcPlaygroundApi,
      undefined,
      missingCertFiles,
      missingCertificate,
    );
  }

  const onClickOpenDirectory = () => {
    toggleModalMissingImports();
    openFileUpload(true);
  }

  return (
    <Spin spinning={isLoading} indicator={<LoadingOutlined style={{ fontSize: 24 }} />}>
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
              onDelete={(activeKey: string | React.MouseEvent<Element> | React.KeyboardEvent<Element>) => {
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
                <Button key="open-file" icon={<FileAddOutlined />} type="primary" onClick={onClickOpenFile}>
                  Import file
                </Button>,
                <Button key="open-directory" icon={<FolderAddOutlined />} type="primary" onClick={onClickOpenDirectory}>
                  Import directory
                </Button>,
                <Button key="back" danger icon={<StopOutlined />} onClick={ignoreCurrentMissingImport}>
                  Ignore
                </Button>,
              ]}
              title="Missing dependencies"
              destroyOnClose
              onCancel={ignoreCurrentMissingImport}
              visible={modalMissingImportsOpen}
            >
              {importFor ? (
                <>
                  <strong>{importFor.filePath}</strong> is missing these files
                  <List
                    bordered={false}
                    dataSource={importFor?.missing}
                    renderItem={item => (
                      <List.Item>
                        <FileOutlined style={{ marginRight: 10 }} />
                        {item.filePath}
                      </List.Item>
                    )}
                  />
                </>
              ) : null}

            </Modal>

            <Modal
              footer={[
                <Button key="open-file" icon={<FileAddOutlined />} type="primary" onClick={onClickOpenCertFile}>
                  Import file
                </Button>,
                <Button key="back" danger icon={<StopOutlined />} onClick={ignoreCurrentMissingCert}>
                  Ignore
                </Button>,
              ]}
              title="Missing certificate files"
              destroyOnClose
              onCancel={ignoreCurrentMissingCert}
              visible={modalMissingCertsOpen}
            >
              {missingCertFiles.length ? (
                <>
                  Missing these files
                  <List
                    bordered={false}
                    dataSource={missingCertFiles}
                    renderItem={item => (
                      <List.Item>
                        <FileOutlined style={{ marginRight: 10 }} />
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

const GrpcDocApplication: React.FC<GrpcPlaygroundApplicationProps> = ({ appId, spec }) => {
  const [isLoading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<ProtoFile | undefined>();
  const [isShowDrawer, setShowDrawer] = useState(false);
  const containerRef = useRef<HTMLElement | null>(null);

  const {
    protos,
    handleProtoResult,
    toggleModalMissingImports,
    modalMissingImportsOpen,
    importFor,
    ignoreCurrentMissingImport,
    addUploadedListener,
    removeUploadedListener
  } = useProtoContext()!;

  const grpcPlaygroundApi = useApi(grpcPlaygroundApiRef);

  useEffect(() => {
    Store.setGlobalKey(appId);
    grpcPlaygroundApi.setEntityName(appId);
  }, [appId, grpcPlaygroundApi])

  useEffect(() => {
    // Preload editor with stored data.
    hydrateEditor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Hydrate editor from persisted storage
   */
  async function hydrateEditor() {
    setLoading(true);

    const entitySpec = parseRawEntitySpec(spec);

    grpcPlaygroundApi.getProto({ entitySpec, isGenDoc: true })
      .then(res => {
        if (res.protos?.length) {
          setSelectedFile(res.protos[0])
        }

        handleProtoResult(res);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  const onProtofileSelected = (protoFile: ProtoFile) => {
    setSelectedFile(protoFile);
  }

  const onClickOpenFile = () => {
    toggleModalMissingImports();
    openFileUpload();
  }

  const onClickOpenDirectory = () => {
    toggleModalMissingImports();
    openFileUpload(true);
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
    } else if (importFor) {
      fileMappings = {};
      let relativePath: string | undefined;

      try {
        relativePath = pathParse(importFor.missing?.[0].filePath || '').dir;
      } catch (err) {
        // ignore
      }

      uploadFiles.forEach(file => {
        fileMappings![file.name] = file.webkitRelativePath ||
          (relativePath ? [relativePath, file.name].join('/') : '');
      });
    }

    const isGenDoc = true;

    if (isGenDoc) {
      // eslint-disable-next-line prefer-const
      const handlerId = addUploadedListener(protos => {
        removeUploadedListener(handlerId!);

        if (protos?.length) {
          // Select first file to display doc
          setSelectedFile(protos[0])
        }
      })
    }

    const res: UploadProtoResponse = await grpcPlaygroundApi.uploadProto({
      files: uploadFiles,
      importFor: importFor,
      fileMappings,
      isGenDoc
    });

    handleProtoResult(res, true);
  }

  return (
    <Spin spinning={isLoading} indicator={<LoadingOutlined style={{ fontSize: 24 }} />}>
      <Layout style={styles.layout}>
        <Layout ref={containerRef}>
          <Drawer
            title='Protos'
            getContainer={false}
            placement='left'
            style={{
              position: 'absolute',
              transform: 'translateX(-16px)',
            }}
            visible={isShowDrawer}
            maskClosable
            onClose={() => setShowDrawer(false)}
          >
            <DocSidebar
              protos={protos}
              onProtofileSelected={onProtofileSelected}
            />
          </Drawer>

          <Layout.Content>
            {selectedFile?.proto?.protoDoc ? (
              <ReactMarkdown
                children={selectedFile.proto.protoDoc}
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                transformLinkUri={(uri: string) => uri || undefined as any}
                className="markdown-body"
                components={{
                  h1: ({ node, ...props }) => {
                    return (
                      <h1 style={{ display: 'flex', alignItems: 'center' }}>
                        <Button style={{ marginRight: 20 }} shape="circle" onClick={() => setShowDrawer(true)}>
                          <MenuOutlined />
                        </Button>
                        {props.children}
                      </h1>
                    )
                  }
                }}
              />
            ) : null}
            <Modal
              footer={[
                <Button key="open-file" icon={<FileAddOutlined />} type="primary" onClick={onClickOpenFile}>
                  Import file
                </Button>,
                <Button key="open-directory" icon={<FolderAddOutlined />} type="primary" onClick={onClickOpenDirectory}>
                  Import directory
                </Button>,
                <Button key="back" danger icon={<StopOutlined />} onClick={ignoreCurrentMissingImport}>
                  Ignore
                </Button>,
              ]}
              title="Missing dependencies"
              destroyOnClose
              onCancel={ignoreCurrentMissingImport}
              visible={modalMissingImportsOpen}
            >
              {importFor ? (
                <>
                  <strong>{importFor.filePath}</strong> is missing these files
                  <List
                    bordered={false}
                    dataSource={importFor?.missing}
                    renderItem={item => (
                      <List.Item>
                        <FileOutlined style={{ marginRight: 10 }} />
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
    </Spin >
  );
}

export function StandaloneApp() {
  return (
    <ProtoContextProvider>
      <CertificateContextProvider>
        <GrpcPlaygroundApplication
          appId={DEFAULT_APP_ID}
        />
      </CertificateContextProvider>
    </ProtoContextProvider>
  )
}

export function DocApp() {
  const { entity } = useEntity();

  return (
    <ProtoContextProvider>
      <GrpcDocApplication
        appId={entity?.metadata?.name || DEFAULT_APP_ID}
        spec={entity?.spec as unknown as (RawEntitySpec | undefined)}
      />
    </ProtoContextProvider>
  )
}

export function App() {
  const { entity } = useEntity();

  return (
    <ProtoContextProvider>
      <CertificateContextProvider>
        <GrpcPlaygroundApplication
          appId={entity?.metadata?.name || DEFAULT_APP_ID}
          spec={entity?.spec as unknown as (RawEntitySpec | undefined)}
        />
      </CertificateContextProvider>
    </ProtoContextProvider>
  )
}

function parseRawEntitySpec(spec?: RawEntitySpec): EntitySpec {
  const rawSpec = { ...(spec || {}) } as RawEntitySpec;
  const entitySpec: EntitySpec = {
    owner: rawSpec.owner,
    system: rawSpec.system,
    lifecycle: rawSpec.lifecycle,
    type: rawSpec.type,
    definition: rawSpec.definition,
    libraries: rawSpec.libraries?.map(mapRawLibrary),
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

  return entitySpec;
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

const mapRawLibrary = ({
  name,
  path,
  url,
  is_preloaded,
  version,
}: RawLibrary): Library => {
  return {
    path,
    url,
    name,
    isPreloaded: is_preloaded,
    version
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
