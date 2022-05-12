import { createApiRef } from "@backstage/core-plugin-api";
import { ProtoFile } from "./protobuf";

/**
 * Options you can pass into a catalog request for additional information.
 *
 * @public
 */
export interface BloomRPCRequestOptions {
  token?: string;
}

export interface UploadProtoPayload {
  files: FileList;
}

export interface UploadProtoResponse {
  status: string;
  protos?: ProtoFile[]
}

export interface SendRequestPayload {

}

export interface SendRequestResponse {

}

export const bloomRPCApiRef = createApiRef<BloomRPCApi>({
  id: 'plugin.bloomrpc.service',
});

export interface BloomRPCApi {
  uploadProto(payload: UploadProtoPayload, options?: BloomRPCRequestOptions): Promise<UploadProtoResponse>;
  sendServerRequest(payload: SendRequestPayload, options?: BloomRPCRequestOptions): Promise<SendRequestResponse>;
}