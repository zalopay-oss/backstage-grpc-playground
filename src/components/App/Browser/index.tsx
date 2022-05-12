/* eslint-disable @typescript-eslint/no-shadow */
import { AppBar, makeStyles } from '@material-ui/core';
import React, { useState } from 'react'
import { ProtoFile, EditorEnvironment, EditorTabRequest, EditorTabs, TabData } from '../../../api';
import { TabList } from './TabList';
import { arrayMoveImmutable as arrayMove } from '../../../utils'
import { Message } from 'protobufjs';

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
    width: '100%',
    backgroundColor: theme.palette.background.paper,
  },
}));

// TODO
function getEnvironments() {
  return [];
}

// TODO
function storeRequestInfo(requestInfo: EditorTabRequest) {

}

const testTabs: TabData[] = [
  {
    methodName: 'methodName',
    tabKey: 'TabKey1',
    service: {
      proto: {
        fileName: 'fileName',
        filePath: 'filePath',
        protoText: 'protoText',
        ast: {},
        root: {} as any,
      },
      serviceName: 'serviceName',
      methodsMocks: {
        get: () => ({
          plain: {
            plain1: 'plain1'
          },
          message: new Message({
            test1: 'test1'
          }),
        })
      },
      methodsName: ['get']
    }
  }
]

const Browser: React.FC = () => {
  const classes = useStyles();
  const [tab, setTab] = React.useState<number>(0);

  const [protos, setProtosState] = useState<ProtoFile[]>([]);
  const [editorTabs, setEditorTabs] = useState<EditorTabs>({
    activeKey: "0",
    tabs: testTabs,
  });

  const [environments, setEnvironments] = useState<EditorEnvironment[]>(getEnvironments());

  function setTabs(props: EditorTabs) {
    setEditorTabs(props);
    // TODO
    // storeTabs(props);
  }

  const handleChangeTab = (activeKey: string) => {
    setTabs({
      activeKey,
      tabs: editorTabs.tabs || [],
    })
  };

  // TODO
  const deleteRequestInfo = (activeKey: string) => {

  }

  const onEnvironmentChange = () => {
    setEnvironments(getEnvironments());
  }

  const onEditorRequestChange = (editorRequestInfo: EditorTabRequest) => {
    storeRequestInfo(editorRequestInfo);
  }

  const onDelete = (activeKey: string) => {
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

    deleteRequestInfo(activeKey);

    setTabs({
      activeKey: newActiveKey,
      tabs: editorTabs.tabs.filter(tab => tab.tabKey !== activeKey),
    });
  }

  const onDragEnd = ({ oldIndex, newIndex }: { oldIndex: number; newIndex: number }) => {
    const newTab = editorTabs.tabs[oldIndex];

    setTabs({
      activeKey: newTab && newTab.tabKey || editorTabs.activeKey,
      tabs: arrayMove(
        editorTabs.tabs,
        oldIndex,
        newIndex,
      ).filter(e => e),
    })
  }

  return (
    <div className={classes.root}>
      <TabList
        tabs={editorTabs.tabs || []}
        onDragEnd={onDragEnd}
        activeKey={editorTabs.activeKey}
        environmentList={environments}
        onEnvironmentChange={onEnvironmentChange}
        onEditorRequestChange={onEditorRequestChange}
        onDelete={onDelete}
        onChange={handleChangeTab}
      />
    </div>
  )
}

export default Browser