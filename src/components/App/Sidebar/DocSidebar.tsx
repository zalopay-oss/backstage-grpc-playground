import { Menu } from 'antd';
import React from 'react'

import { Badge } from '../Badge/Badge';
import { ProtoFile } from '../../../api';

interface DocSidebarProps {
  protos: ProtoFile[];
  onProtofileSelected: (proto: ProtoFile) => void;
}

export const DocSidebar = ({ protos, onProtofileSelected }: DocSidebarProps) => {
  if (!protos?.length) return null;

  return (
    <Menu
      mode="inline"
      items={protos.map(proto => ({
        icon: <Badge type="protoFile" size='large'> P </Badge>,
        key: proto.proto.filePath,
        label: proto.fileName,
        onClick: () => onProtofileSelected(proto)
      }))}
    />
  )
}
