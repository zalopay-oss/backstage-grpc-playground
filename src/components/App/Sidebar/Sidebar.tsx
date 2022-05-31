/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/no-use-before-define */
import React, { useEffect, useState, CSSProperties } from "react";

import {
  DeleteOutlined,
  EyeOutlined,
  FileOutlined,
  FileSearchOutlined,
  FilterOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

import { Menu, Button, Dropdown, Modal, Tooltip, Tree, Input, TreeDataNode } from 'antd';
import { Badge } from '../Badge/Badge';
import { PathResolution } from "./PathResolution";
import { getImportPaths } from "../../../storage";
import { UrlResolution } from "./UrlResolution";
import {
  ProtoFile, ProtoService,
  importProtosFromServerReflection,
  OnProtoUpload,
} from '../../../api';

interface SidebarProps {
  protos: ProtoFile[]
  onMethodSelected: (methodName: string, protoService: ProtoService) => void
  onProtoUpload: OnProtoUpload
  onDeleteAll: () => void
  onReload: () => void
  openFileUpload: (directory?: boolean) => void;
  onMethodDoubleClick: (methodName: string, protoService: ProtoService) => void
}

export function Sidebar({ protos, onMethodSelected, openFileUpload, onProtoUpload, onDeleteAll, onReload, onMethodDoubleClick }: SidebarProps) {

  const [importPaths, setImportPaths] = useState<string[]>([""]);
  const [importPathVisible, setImportPathsVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filterMatch, setFilterMatch] = useState<string | null>(null);
  const [importReflectionVisible, setImportReflectionVisible] = useState(false);

  useEffect(() => {
    setImportPaths(getImportPaths());
  }, []);

  /**
   * An internal function to retrieve protobuff from the selected key
   * @param selected The selected key from the directory tree
   */
  function processSelectedKey(selected: string | undefined) {
    // We handle only methods.
    if (!selected || !selected.includes("method:")) {
      return undefined;
    }

    const fragments = selected.split('||');
    const fileName = fragments[0];
    const methodName = fragments[1].replace('method:', '');
    const serviceName = fragments[2].replace('service:', '');

    const protodef = protos.find((protoFile) => {
      const match = Object.keys(protoFile.services).find(
        (service) => service === serviceName &&
          fileName === protoFile.services[serviceName].proto.filePath
      );
      return Boolean(match);
    });

    if (!protodef) {
      return undefined;
    }
    return { methodName, protodef, serviceName }
  }

  function toggleFilter() {
    setFilterVisible(!filterVisible);
    if (filterVisible) {
      setFilterMatch(null);
    }
  }

  const menu = (
    <Menu
      items={[
        {
          'key': '1',
          onClick: () => {
            openFileUpload();
          },
          icon: <FileOutlined />,
          label: 'Import from file'
        },
      ]}
    />
  );

  const treeData: TreeDataNode[] = protos.map(proto => ({
    icon: <Badge type="protoFile"> P </Badge>,
    key: proto.proto.filePath,
    title: proto.fileName,
    children: Object.keys(proto.services).map((service) => ({
      icon: <Badge type="service"> S </Badge>,
      title: service,
      key: `${proto.fileName}-${service}`,
      children: proto.services[service].methodsName
        .filter((name) => {
          if (filterMatch === null) return true;
          return name.toLowerCase().includes(filterMatch.toLowerCase());
        })
        .map((method: any) => ({
          icon: <Badge type="method"> M </Badge>,
          title: method,
          key: `${proto.proto.filePath}||method:${method}||service:${service}`
        }))
    }))
  }));

  return (
    <>
      <div style={styles.sidebarTitleContainer}>
        <div>
          <h3 style={styles.sidebarTitle}>Protos</h3>
        </div>

        <div
          style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}
        >
          <Dropdown.Button
            type="primary"
            // onClick={() => {
            //   importProtos(onProtoUpload, importPaths)
            // }}
            onClick={() => openFileUpload()}
            overlay={menu}
          >
            <PlusOutlined />
          </Dropdown.Button>
        </div>
      </div>

      <div style={styles.optionsContainer}>
        <div style={{ width: "50%" }}>
          <Tooltip title="Reload" placement="bottomLeft" align={{ offset: [-8, 0] }}>
            <Button
              style={{ paddingRight: 5, paddingLeft: 5 }}
              onClick={onReload}
              icon={<ReloadOutlined style={{ cursor: "pointer", color: "#1d93e6" }} />}
              size='small'
            />
          </Tooltip>

          <Tooltip title="Import Paths" placement="bottomLeft" align={{ offset: [-8, 0] }}>
            <Button
              style={{ paddingRight: 5, paddingLeft: 5, marginLeft: 5 }}
              onClick={() => setImportPathsVisible(true)}
              icon={<FileSearchOutlined style={{ cursor: "pointer", color: "#1d93e6" }} />}
              size='small'
            />
          </Tooltip>

          <Tooltip title="Filter method names" placement="bottomLeft" align={{ offset: [-8, 0] }}>
            <Button
              style={{ paddingRight: 5, paddingLeft: 5, marginLeft: 5 }}
              onClick={() => toggleFilter()}
              icon={<FilterOutlined style={{ cursor: "pointer", color: "#1d93e6" }} />}
              size='small'
            />
          </Tooltip>

          <Modal
            title={(
              <div>
                <FileSearchOutlined />
                <span style={{ marginLeft: 10 }}> Import Paths </span>
              </div>
            )}
            visible={importPathVisible}
            onCancel={() => setImportPathsVisible(false)}
            onOk={() => setImportPathsVisible(false)}
            bodyStyle={{ padding: 0 }}
            width={750}
            footer={[
              <Button key="back" onClick={() => setImportPathsVisible(false)}>Close</Button>
            ]}
          >
            <PathResolution
              onImportsChange={setImportPaths}
              importPaths={importPaths}
            />
          </Modal>

          <Modal
            title={(
              <div>
                <EyeOutlined />
                <span style={{ marginLeft: 10 }}> Import from server reflection </span>
              </div>
            )}
            visible={importReflectionVisible}
            onCancel={() => setImportReflectionVisible(false)}
            onOk={() => setImportReflectionVisible(false)}
            width={750}
            footer={[
              <Button key="back" onClick={() => setImportReflectionVisible(false)}>Close</Button>
            ]}
          >
            <UrlResolution
              onImportFromUrl={(url) => {
                importProtosFromServerReflection(onProtoUpload, url)
                setImportReflectionVisible(false)
              }}
            />
          </Modal>
        </div>
        <div style={{ width: "50%", textAlign: "right" }}>
          <Tooltip title="Delete all" placement="bottomRight" align={{ offset: [10, 0] }}>
            <Button
              style={{ paddingRight: 5, paddingLeft: 5 }}
              onClick={onDeleteAll}
              icon={<DeleteOutlined style={{ cursor: "pointer", color: "red" }} />}
              size='small'
             />
          </Tooltip>
        </div>
      </div>

      <div style={{
        overflow: "auto",
        maxHeight: "calc(100vh - 85px)",
        height: "100%"
      }}>

        <Input
          placeholder="Filter methods"
          hidden={!filterVisible}
          onChange={(v) => setFilterMatch(v.target.value || null)}
        />

        {protos.length > 0 && <Tree.DirectoryTree
          showIcon
          defaultExpandAll
          onSelect={async (selectedKeys) => {
            const selected = selectedKeys.pop();
            const protoDefinitions = processSelectedKey(selected?.toString() || '');

            if (!protoDefinitions) {
              return;
            }

            onMethodSelected(protoDefinitions.methodName, protoDefinitions.protodef.services[protoDefinitions.serviceName]);
          }}
          onDoubleClick={async (_event, treeNode) => {
            const selected = treeNode.key;
            const protoDefinitions = processSelectedKey(selected.toString());

            if (!protoDefinitions) {
              return;
            }

            // if the original one table doesn't exist, then ignore it
            onMethodDoubleClick(protoDefinitions.methodName, protoDefinitions.protodef.services[protoDefinitions.serviceName])
          }}
          treeData={treeData}
        />}
      </div>
    </>
  );
}

const styles: {
  [key: string]: CSSProperties
} = {
  sidebarTitleContainer: {
    display: "flex",
    justifyContent: "space-between",
    paddingTop: 6,
    paddingBottom: 4,
    paddingLeft: 20,
    paddingRight: 10,
    borderBottom: "1px solid #eee",
    background: "#001529"
  },
  sidebarTitle: {
    color: "#fff",
    marginTop: "0.5em"
  },
  icon: {
    fontSize: 23,
    marginBottom: 7,
    marginRight: 12,
    marginTop: -2,
    color: "#28d440",
    border: "2px solid #f3f6f9",
    borderRadius: "50%",
    cursor: "pointer"
  },
  menuIcon: {
    marginRight: 8
  },
  optionsContainer: {
    background: "#fafafa",
    padding: "3px 6px",
    display: "flex",
    alignContent: "space-between",
    borderBottom: "1px solid #e0e0e0",
  },
};
