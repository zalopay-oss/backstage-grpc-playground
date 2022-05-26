import { ProtoService } from './protobuf';

export interface EditorTabs {
  activeKey: string
  tabs: TabData[]
}

export interface TabData {
  tabKey: string
  methodName: string
  service: ProtoService
  initialRequest?: EditorRequest,
}

export interface EditorAction {
  [key: string]: any
  type: string
}

export interface EditorEnvironment {
  name: string
  url: string
  metadata: string,
  interactive: boolean
  tlsCertificate: Certificate,
}

export interface EditorRequest {
  url: string
  data: string
  inputs?: string // @deprecated
  metadata: string
  interactive: boolean
  environment?: string
  grpcWeb: boolean
  tlsCertificate?: Certificate
}

export interface Certificate {
  rootCert: CertFile;
  privateKey?: CertFile;
  certChain?: CertFile;
  sslTargetHost?: string;
  useServerCertificate?: boolean;
}

export interface BaseFile {
  fileName: string;
  filePath: string;
}

export interface CertFile extends BaseFile { }

export interface EditorTabRequest extends EditorRequest {
  id: string
}

export interface GRPCTarget {
  [envName: string]: GRPCTargetInfo;
}

export interface GRPCTargetInfo {
  host?: string;
  port?: number;
}

export interface MissingImportFile extends BaseFile {
  importPaths?: string[];
}

export interface RawPlaceholderFile {
  file_name: string;
  file_path: string;
  is_preloaded?: boolean;
  import_paths?: string[];
  is_library?: boolean;
  url?: string;
}

export interface EntitySpec {
  type: string;
  lifecycle: string;
  owner: string;
  definition: string; // stringified PlaceholderFile
  files: RawPlaceholderFile[];
  system?: string;
  targets?: GRPCTarget;
  imports?: RawPlaceholderFile[];
}

export enum LoadProtoStatus {
  ok = 1,
  fail = -1,
  part = 0
}