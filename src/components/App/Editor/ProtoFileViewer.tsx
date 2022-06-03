import React from 'react';
import AceEditor from 'react-ace';
import { Drawer } from 'antd';
import { ProtoInfo } from '../../../api';

interface ProtoFileViewerProps {
  protoInfo: ProtoInfo
  visible: boolean
  onClose: () => void
}

export function ProtoFileViewer({ protoInfo, visible, onClose }: ProtoFileViewerProps) {

  return (
    <Drawer
      title={protoInfo.service.proto.fileName.split('/').pop()}
      className='proto-drawer'
      placement="right"
      width="50vw"
      closable={false}
      onClose={onClose}
      visible={visible}
    >
      <AceEditor
        style={{ 
          marginTop: "10px",
          background: "#fff",
        }}
        width="100%"
        height="100%"
        mode="protobuf"
        theme="textmate"
        name="output"
        fontSize={13}
        showPrintMargin={false}
        wrapEnabled
        showGutter
        readOnly
        value={protoInfo.service.proto.protoText}
        onLoad={(editor: any) => {
          editor.renderer.$cursorLayer.element.style.display = "none";
          editor.gotoLine(0, 0, true);
        }}
        setOptions={{
          useWorker: true,
          displayIndentGuides: false,
          fixedWidthGutter: true,
          tabSize: 1,
        }}
      />
    </Drawer>
  );
}
