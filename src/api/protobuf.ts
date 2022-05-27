// eslint-disable-next-line no-restricted-imports
import { Root, Service } from 'protobufjs';
import { ServiceMethodsPayload } from './bloomrpc-mock';
import { GrpcObject } from './makeClient';
import { PlaceholderFile } from './types';

export interface Proto {
  fileName: string;
  filePath: string;
  imports?: PlaceholderFile[];
  protoText: string;
  ast: GrpcObject;
  root: Root;
}

export interface SavedProto {
  fileName: string;
  filePath: string;
  protoText?: string;
  imports?: PlaceholderFile[];
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
