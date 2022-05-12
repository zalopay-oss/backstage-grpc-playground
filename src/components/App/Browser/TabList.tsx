/* eslint-disable @typescript-eslint/no-unused-expressions */
import * as React from 'react';
import { useEffect } from 'react';
// import { Editor } from '../Editor';
import { DraggableItem, DraggableTabs } from "./DraggableTabList";
import * as Mousetrap from 'mousetrap';
import 'mousetrap/plugins/global-bind/mousetrap-global-bind';
import { EditorEnvironment, EditorRequest, EditorTabRequest, TabData } from '../../../api';
import { AppBar, Tab, Tabs } from '@material-ui/core';
import TabPanel from './TabPanel';

interface TabListProps {
  tabs: TabData[]
  activeKey?: string;
  onChange?: (activeKey: string) => void
  onDelete?: (activeKey: string) => void
  onEditorRequestChange?: (requestInfo: EditorTabRequest) => void
  onDragEnd: (indexes: { oldIndex: number, newIndex: number }) => void
  environmentList?: EditorEnvironment[],
  onEnvironmentChange?: () => void
}


function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
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

  const pOnChangeTab = (_: any, key: string) => {
    onChange?.(key);
  }

  return (
    <>
      <AppBar position="static" color="default">
        <Tabs
          value={activeKey}
          onChange={pOnChangeTab}
          className="draggable-tabs"
          indicatorColor="primary"
          textColor="primary"
        // onChange={onChange}
        // tabBarStyle={styles.tabBarStyle}
        // style={styles.tabList}
        // activeKey={tabActiveKey || "0"}
        // type="editable-card"
        // renderTabBar={(props, DefaultTabBar: any) => {
        //   return (
        //     <DraggableTabs
        //       onSortEnd={onDragEnd}
        //       lockAxis="x"
        //       axis="x"
        //       pressDelay={120}
        //       helperClass="draggable draggable-tab"
        //     >
        //       <DefaultTabBar {...props}>
        //         {(node: any) => {
        //           const nodeIndex = tabs.findIndex(tab => tab.tabKey === node.key);
        //           const nodeTab = tabs.find(tab => tab.tabKey === node.key);
        //           return (
        //             <DraggableItem
        //               active={nodeTab && nodeTab.tabKey === activeKey}
        //               index={nodeIndex}
        //               key={node.key}
        //             >
        //               {node}
        //             </DraggableItem>
        //           )
        //         }}
        //       </DefaultTabBar>
        //     </DraggableTabs>
        //   )
        // }}
        >
          <DraggableTabs
            onSortEnd={onDragEnd}
            lockAxis="x"
            axis="x"
            pressDelay={120}
            helperClass="draggable draggable-tab"
          >
            {tabs.map((tab, index) => (
              <DraggableItem
                active={tab.tabKey === activeKey}
                key={tab.tabKey}
                index={index}
              >
                <Tab
                  label={`${tab.service.serviceName}.${tab.methodName}`}
                  {...a11yProps(index)}
                />
              </DraggableItem>
            ))}
          </DraggableTabs>
          {/* <Tab label="Untitled" {...a11yProps(0)} />
          <Tab label="Create" {...a11yProps(1)} /> */}
        </Tabs>
      </AppBar>

      {tabs.length === 0 ? (
        <TabPanel
          tab="New Tab"
          key="0"
          closable={false}
          style={{ height: "100%" }}
        >
          Panel new tab
          {/* <Editor
          active
          environmentList={environmentList}
          onEnvironmentListChange={onEnvironmentChange}
        /> */}
        </TabPanel>
      ) : tabs.map((tab) => (
        <TabPanel
          tab={`${tab.service.serviceName}.${tab.methodName}`}
          key={tab.tabKey}
          closable
          style={{ height: "100%" }}
        >
          Tab panel haha
          {/* <Editor
            active={tab.tabKey === activeKey}
            environmentList={environmentList}
            protoInfo={new ProtoInfo(tab.service, tab.methodName)}
            key={tab.tabKey}
            initialRequest={tab.initialRequest}
            onEnvironmentListChange={onEnvironmentChange}
            onRequestChange={(editorRequest: EditorRequest) => {
              onEditorRequestChange && onEditorRequestChange({
                id: tab.tabKey,
                ...editorRequest
              })
            }}
          /> */}
        </TabPanel>
      ))}
    </>
  );
}
