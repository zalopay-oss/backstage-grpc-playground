// eslint-disable-next-line no-restricted-imports
import { Root } from 'protobufjs';
import { ServiceMethodsPayload } from './bloomrpc-mock';
import { GrpcObject } from './makeClient';

export interface Proto {
  fileName: string;
  filePath: string;
  protoText: string;
  ast: GrpcObject;
  root: Root;
}

export interface SavedProto {
  fileName: string;
  protoText: string;
}

export interface ProtoFile {
  proto: Proto,
  fileName: string
  services: ProtoServiceList;
}

export interface ProtoServiceList {
  [key: string]: ProtoService,
}

export interface ProtoService {
  proto: Proto,
  serviceName: string,
  methodsMocks: ServiceMethodsPayload,
  methodsName: string[],
}
