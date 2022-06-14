/* eslint-disable @typescript-eslint/no-use-before-define */
import React from 'react';
import { useEffect } from 'react';
import { Tabs } from 'antd';
import * as Mousetrap from 'mousetrap';

import 'mousetrap/plugins/global-bind/mousetrap-global-bind';

import { Editor, EditorEnvironment, EditorRequest } from '../Editor';
import { DraggableItem, DraggableTabs } from "./DraggableTabList";
import { ProtoInfo, ProtoService } from '../../../api';

interface TabListProps {
  tabs: TabData[]
  activeKey?: string
  onChange?: (activeKey: string) => void
  onDelete?: (activeKey: string | React.MouseEvent<Element> | React.KeyboardEvent<Element>) => void
  onEditorRequestChange?: (requestInfo: EditorTabRequest) => void
  onDragEnd: (indexes: { oldIndex: number, newIndex: number }) => void
  environmentList?: EditorEnvironment[],
  onEnvironmentChange?: () => void
}

export interface TabData {
  tabKey: string
  methodName: string
  service: ProtoService
  initialRequest?: EditorRequest,
}

export interface EditorTabRequest extends EditorRequest {
  id: string
}

export function TabList({ tabs, activeKey, onChange, onDelete, onDragEnd, onEditorRequestChange, environmentList, onEnvironmentChange }: TabListProps) {
  const tabsWithMatchingKey =
    tabs.filter(tab => tab.tabKey === activeKey);

  const tabActiveKey = tabsWithMatchingKey.length === 0
    ? [...tabs.map(tab => tab.tabKey)].pop()
    : [...tabsWithMatchingKey.map(tab => tab.tabKey)].pop();

  useEffect(() => {
    Mousetrap.bindGlobal(['command+w', 'ctrl+w'], () => {
      if (tabActiveKey) {
        onDelete?.(tabActiveKey);
      }
      return false;
    });

    return () => {
      Mousetrap.unbind(['command+w', 'ctrl+w']);
    }
  });

  return (
    <Tabs
      className="draggable-tabs"
      onEdit={(targetKey, action) => {
        if (action === "remove") {
          onDelete?.(targetKey);
        }
      }}
      onChange={onChange}
      tabBarStyle={styles.tabBarStyle}
      style={styles.tabList}
      activeKey={tabActiveKey || "0"}
      hideAdd
      type="editable-card"
      renderTabBar={(props, DefaultTabBar: any) => {
        return (
          <DraggableTabs
            onSortEnd={onDragEnd}
            lockAxis="x"
            axis="x"
            pressDelay={120}
            helperClass="draggable draggable-tab"
          >
            <DefaultTabBar {...props}>
              {(node: any) => {
                const nodeIndex = tabs.findIndex(tab => tab.tabKey === node.key);
                const nodeTab = tabs.find(tab => tab.tabKey === node.key);
                return (
                  <DraggableItem
                    active={nodeTab && nodeTab.tabKey === activeKey}
                    index={nodeIndex}
                    key={node.key}
                  >
                    {node}
                  </DraggableItem>
                )
              }}
            </DefaultTabBar>
          </DraggableTabs>
        )
      }}
    >
      {tabs.length === 0 ? (
        <Tabs.TabPane
          tab="New Tab"
          key="0"
          closable={false}
        >
          <Editor
            active
            environmentList={environmentList}
            onEnvironmentListChange={onEnvironmentChange}
          />
        </Tabs.TabPane>
      ) : tabs.map((tab) => (
        <Tabs.TabPane
          tab={`${tab.service.serviceName}.${tab.methodName}`}
          key={tab.tabKey}
          closable
        >
          <Editor
            active={tab.tabKey === activeKey}
            environmentList={environmentList}
            protoInfo={new ProtoInfo(tab.service, tab.methodName)}
            key={tab.tabKey}
            initialRequest={tab.initialRequest}
            onEnvironmentListChange={onEnvironmentChange}
            onRequestChange={(editorRequest: EditorRequest) => {
              onEditorRequestChange?.({
                id: tab.tabKey,
                ...editorRequest
              })
            }}
          />
        </Tabs.TabPane>
      ))}
    </Tabs>
  );
}

const styles = {
  tabList: {
    height: "100%"
  },
  tabBarStyle: {
    height: '50px',
    padding: "10px 0px 0px 20px",
    marginBottom: "0px",
  }
};
