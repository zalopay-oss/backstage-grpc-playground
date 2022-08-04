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
  id?: string;
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

export type CertType = 'rootCert' | 'privateKey' | 'certChain';

export interface CertFile extends BaseFile {
  type: CertType;
 }

export interface PlaceholderFile extends FileWithImports {
  isPreloaded?: boolean;
  url?: string;
  isLibrary?: boolean;
}

export interface FileWithImports extends BaseFile {
  imports?: PlaceholderFile[];
  missing?: PlaceholderFile[];
}

export interface RawPlaceholderFile {
  file_name: string;
  file_path: string;
  is_preloaded?: boolean;
  imports?: RawPlaceholderFile[];
  is_library?: boolean;
  url?: string;
}

export interface EditorTabRequest extends EditorRequest {
  id: string
}

export interface GRPCTarget {
  [envName: string]: GRPCTargetInfo;
}

export interface GRPCTargetInfo {
  host: string;
  port?: number;
}

export interface EntitySpec {
  type: string;
  lifecycle: string;
  owner: string;
  definition: string;
  files: PlaceholderFile[];
  system?: string;
  targets?: GRPCTarget;
  imports?: PlaceholderFile[];
}

export interface RawEntitySpec {
  type: string;
  lifecycle: string;
  owner: string;
  definition: string;
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

export enum LoadCertStatus {
  ok = 3,
  fail = 4,
  part = 5
}