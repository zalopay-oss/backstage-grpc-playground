import { createApiRef } from "@backstage/core-plugin-api";
import { ProtoFile } from "./protobuf";
import { EntitySpec, LoadProtoStatus, FileWithImports, PlaceholderFile } from "./types";

/**
 * Options you can pass into a catalog request for additional information.
 *
 * @public
 */
export interface GRPCPlaygroundRequestOptions {
  token?: string;
  fetcher?: typeof fetch;
  fetchOptions?: any;
}

export interface GetProtoPayload {
  entitySpec: EntitySpec;
  isGenDoc?: boolean;
}

export interface UploadProtoPayload {
  files: FileList | File[];
  importFor?: FileWithImports;
  fileMappings?: Record<string, string>;
  isGenDoc?: boolean;
}

export interface UploadProtoResponse {
  status: LoadProtoStatus;
  protos?: ProtoFile[];
  missingImports?: FileWithImports[];
  message?: string;
}

export interface SendRequestPayload {
  requestId: string;
  proto: string;
  imports?: PlaceholderFile[];
  requestData: {
    inputs: Object;
    metadata: Object;
  };
  methodName: string;
  serviceName: string;
  url: string;
  interactive?: boolean;
}

export interface SendRequestResponse extends Response { }

export const grpcPlaygroundApiRef = createApiRef<GrpcPlaygroundApi>({
  id: 'plugin.grpc-playground.service',
});

export interface GetProtoRequest {
  (payload: GetProtoPayload, options?: GRPCPlaygroundRequestOptions): Promise<UploadProtoResponse>
}

export interface UploadProtoRequest {
  (payload: UploadProtoPayload, options?: GRPCPlaygroundRequestOptions): Promise<UploadProtoResponse>
}

export interface SendServerRequest {
  (payload: SendRequestPayload, options?: GRPCPlaygroundRequestOptions): Promise<SendRequestResponse>
}

export interface GrpcPlaygroundApi {
  uploadProto: UploadProtoRequest;
  sendServerRequest: SendServerRequest;
  getProto: GetProtoRequest;
  setEntityName: (entity: string) => void;
}
