import { OnProtoUpload, ProtoFile } from './protobuf';

/**
 * Upload protofiles from gRPC server reflection
 * 
 * @param onProtoUploaded
 * @param host
 */
export async function importProtosFromServerReflection(onProtoUploaded: OnProtoUpload, host: string) {
  await loadProtoFromReflection(host, onProtoUploaded);
}

/**
 * Load protocol buffer files from gRPC server reflection
 * // TODO: Not implemented
 * 
 * @param host
 * @param onProtoUploaded
 */
export async function loadProtoFromReflection(host: string, onProtoUploaded?: OnProtoUpload): Promise<ProtoFile[]> {
  throw new Error('Not implemented');
}

/**
 * // TODO: Not implemented
 */
export function importResolvePath(): Promise<string | null> {
  throw new Error('Not implemented');
}
