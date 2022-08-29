import React, { useEffect } from 'react';
import AceEditor from 'react-ace';
import { Drawer, Spin } from 'antd';
import { grpcPlaygroundApiRef, ProtoInfo } from '../../../api';
import { useAsyncFn } from 'react-use';
import { useApi } from '@backstage/core-plugin-api';

interface ProtoFileViewerProps {
  protoInfo: ProtoInfo
  visible: boolean
  onClose: () => void
}

export function ProtoFileViewer({ protoInfo, visible, onClose }: ProtoFileViewerProps) {
  const grpcPlaygroundApi = useApi(grpcPlaygroundApiRef);
  const [{ loading, error, value }, getProtoTextAsync] = useAsyncFn(grpcPlaygroundApi.getProtoText, [])

  useEffect(() => {
    if (visible) {
      getProtoTextAsync(protoInfo.service.proto.filePath);
    }
  }, [visible, protoInfo.service.proto.filePath, getProtoTextAsync]);

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
      {loading ? (
        <Spin />
      ) : (
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
          value={value?.protoText || ''}
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
      )}
    </Drawer>
  );
}
