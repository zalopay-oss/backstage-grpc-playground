// eslint-disable-next-line no-restricted-imports
import { Root, Service } from 'protobufjs';
import { ServiceMethodsPayload } from './bloomrpc-mock';
import { GrpcObject } from './makeClient';

export interface Proto {
  fileName: string;
  filePath: string;
  importPaths?: string[];
  protoText: string;
  ast: GrpcObject;
  root: Root;
}

export interface SavedProto {
  fileName: string;
  filePath: string;
  protoText?: string;
  importPaths?: string[];
}

export interface ProtoFile {
  proto: Proto;
  fileName: string;
  services: ProtoServiceList;
}

export interface ProtoServiceList {
  [key: string]: ProtoService,
}

export interface ProtoService {
  proto: Proto,
  serviceName: string,
  methodsMocks: ServiceMethodsPayload,
  definition: Service;
  methodsName: string[],
}

export type OnProtoUpload = (protoFiles: ProtoFile[], err?: Error) => void
