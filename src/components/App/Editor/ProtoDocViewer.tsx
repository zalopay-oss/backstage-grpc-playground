import React from 'react';
import { Drawer } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

import { ProtoInfo } from '../../../api';

interface ProtoDocViewerProps {
  protoInfo: ProtoInfo
  visible: boolean
  onClose: () => void
}

export function ProtoDocViewer({ protoInfo, visible, onClose }: ProtoDocViewerProps) {

  return (
    <Drawer
      title={protoInfo.service.proto.fileName.split('/').pop()}
      className='proto-doc-drawer'
      placement="right"
      width='100%'
      getContainer={false}
      style={{ position: 'absolute' }}
      onClose={onClose}
      visible={visible}
    >
      <ReactMarkdown
        children={protoInfo.service.proto.protoDoc}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        transformLinkUri={(uri: string) => uri || undefined as any}
        className="markdown-body"
      />
    </Drawer>
  );
}
