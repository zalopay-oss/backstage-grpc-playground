import { createApiRef } from "@backstage/core-plugin-api";
import { ProtoFile } from "./protobuf";
import { EntitySpec, LoadProtoStatus, FileWithImports, PlaceholderFile } from "./types";

/**
 * Options you can pass into a catalog request for additional information.
 *
 * @public
 */
export interface BloomRPCRequestOptions {
  token?: string;
  fetcher?: typeof fetch;
  fetchOptions?: any;
}

export interface GetProtoPayload {
  entitySpec: EntitySpec;
}

export interface UploadProtoPayload {
  files: FileList | File[];
  importFor?: FileWithImports;
  fileMappings?: Record<string, string>;
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
  // stream?: ReadableStream;
  methodName: string;
  serviceName: string;
  url: string;
  interactive?: boolean;
}

export interface SendRequestStreamPayload {
  requestId: string;
  proto: string;
  stream: ReadableStream;
  methodName: string;
  serviceName: string;
  url: string;
  interactive?: boolean;
}

export interface SendRequestResponse extends Response {

}

export const bloomRPCApiRef = createApiRef<BloomRPCApi>({
  id: 'plugin.bloomrpc.service',
});

export interface GetProtoRequest {
  (payload: GetProtoPayload, options?: BloomRPCRequestOptions): Promise<UploadProtoResponse>
}

export interface UploadProtoRequest {
  (payload: UploadProtoPayload, options?: BloomRPCRequestOptions): Promise<UploadProtoResponse>
}

export interface SendServerRequest {
  (payload: SendRequestPayload, options?: BloomRPCRequestOptions): Promise<SendRequestResponse>
  // (payload: SendRequestStreamPayload, options?: BloomRPCRequestOptions): Promise<SendRequestResponse>
}

export interface SendServerRequestStream {
  (payload: SendRequestStreamPayload, options?: BloomRPCRequestOptions): Promise<SendRequestResponse>
}

export interface BloomRPCApi {
  uploadProto: UploadProtoRequest;
  sendServerRequest: SendServerRequest;
  sendServerRequestStream: SendServerRequestStream;
  getProto: GetProtoRequest;
  setEntityName: (entity: string) => void;
}
