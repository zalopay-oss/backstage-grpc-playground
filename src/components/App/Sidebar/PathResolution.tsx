/* eslint-disable jsx-a11y/no-autofocus */
import * as React from 'react';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { Input, Table, Tooltip } from "antd";
import { useState } from "react";
import { storeImportPaths } from "../../../storage";
import { importResolvePath } from '../../../api';

interface PathResolutionProps {
  onImportsChange?: (paths: string[]) => void
  importPaths: string[]
}

interface TablePath {
  value: string
}

export function PathResolution({ importPaths, onImportsChange }: PathResolutionProps) {
  const [pathValue, setPathStateValue] = useState("");
  const tablePaths = importPaths.map(importPath => ({
    value: importPath,
  }));

  return (
    <div>
      <Table
        dataSource={tablePaths}
        pagination={false}
        rowKey={(path) => path.value || "addPath"}
      >
        <Table.Column
          title="Path"
          width="90%"
          key="pathColumn"
          render={(text, record: TablePath) => {
            return (
              <>
                {!record.value ? (
                  <Input.Search
                    value={pathValue}
                    placeholder="Absolute path"
                    enterButton="..."
                    autoFocus={pathValue === ""}
                    onChange={(e) => {
                      setPathStateValue(e.target.value);
                    }}
                    onSearch={async () => {
                      try {
                        const path = await importResolvePath();

                        if (path !== null) {
                          setPathStateValue(path);
                          addImportPath(path, importPaths, onImportsChange);
                        }
                      } catch (e) {
                        // No file selected.
                      }
                    }}
                  />
                ) : (
                  <span>{record.value}</span>
                )}
              </>
            );
          }}
        />

        <Table.Column
          title=""
          key="actionColumn"
          render={(text, path: TablePath) => (
            <>
              {path.value ? (
                <Tooltip placement="top" title="Remove">
                  <CloseOutlined
                    style={{ fontSize: 16, cursor: "pointer", marginTop: 5 }}
                    onClick={() => removePath(path.value, importPaths, onImportsChange)} />
                </Tooltip>
              ) : (
                <Tooltip placement="top" title="Add">
                  <PlusOutlined
                    style={{ color: '#28d440', fontSize: 18, cursor: "pointer", marginTop: 5 }}
                    onClick={() => {
                      const pathAdded = addImportPath(pathValue, importPaths, onImportsChange);
                      if (pathAdded) {
                        setPathStateValue("");
                      }
                    }} />
                </Tooltip>
              )}
            </>
          )}
        />
      </Table>
    </div>
  );
}

function addImportPath(
  path: string,
  importPaths: string[],
  setImportPath?: (path: string[]) => void,
): boolean {
  if (path !== "" && importPaths.indexOf(path) === -1) {
    const paths = [...importPaths, path];
    setImportPath?.(paths);
    storeImportPaths(paths);
    return true;
  }

  return false;
}

function removePath(
  path: string,
  importPaths: string[],
  setImportPath?: (path: string[]) => void,
) {
  const newPaths = importPaths.filter(currentPath => currentPath !== path);
  setImportPath?.(newPaths);
  storeImportPaths(newPaths);
}
