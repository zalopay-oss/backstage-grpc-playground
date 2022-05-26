/* eslint-disable no-console */
import { parse, Service } from 'protobufjs';
import { fromJSON } from '@grpc/proto-loader';
import { v4 as uuid } from 'uuid';

import { OnProtoUpload, Proto, ProtoFile, ProtoService as ProtoServiceClient, SavedProto } from './protobuf';
import { mockRequestMethods, walkServices } from './bloomrpc-mock';
import { loadPackageDefinition } from './makeClient';

export interface FileWithContent extends Pick<File, 'name' | 'type' | 'size' | 'lastModified' | 'webkitRelativePath'> {
  content?: string;
}

/**
 * Upload protofiles
 * // TODO: Not implemented
 * 
 * @param onProtoUploaded
 * @param importPaths
 */
export async function importProtos(onProtoUploaded: OnProtoUpload, importPaths?: string[]) {
  const filePaths: string[] = [];
  if (!filePaths) {
    return;
  }

  // await loadProtos(filePaths, onProtoUploaded);
}

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
 * Load protocol buffer files
 * @deprecated
 * 
 * @param filePaths
 * @param importPaths
 * @param onProtoUploaded
 */
export function loadProtos(protoPaths: SavedProto[], onProtoUploaded?: OnProtoUpload): ProtoFile[] {
  return loadProtosFromSavedProtos(protoPaths, onProtoUploaded);
}

export function createProtoFromFile(file: FileWithContent): Proto | null {
  if (!file.content) return null;

  return createProtoFromProtoText(file.content, file.name);
}

export function createProtoFileFromProto(proto: Proto): ProtoFile {
  const services = parseServices(proto);

  return {
    proto,
    fileName: proto.fileName,
    services,
  };
}

export function createProtoFromProtoText(protoText: string, pFileName?: string): Proto {
  const parseResult = parse(protoText);
  let ast = parseResult.root as any;

  // eslint-disable-next-line no-param-reassign
  const fileName = pFileName || `api-${uuid({})}.proto`;

  // TODO: display error
  try {
    const packageDefinition = fromJSON(parseResult.root);

    ast = loadPackageDefinition(packageDefinition);
  } catch (err) {
    console.log('OUTPUT ~ createProtoFromProtoText ~ err', err);
    // ignore
  }

  const proto: Proto = {
    ast,
    fileName,
    filePath: fileName,
    protoText: protoText,
    root: parseResult.root
  };

  return proto;
}

/**
 * Read multiple files
 * @param files 
 */
export async function loadProtosFromFiles(files: FileList): Promise<ProtoFile[]> {
  const protoFiles: ProtoFile[] = [];

  if (!files.length) return protoFiles;

  const filesWithContent = await readMultifiles(files);

  return filesWithContent.reduce((pFiles: ProtoFile[], p: FileWithContent) => {
    const proto = createProtoFromFile(p);

    if (proto) {
      pFiles.push(createProtoFileFromProto(proto));
    }

    return pFiles
  }, [])

}

/**
 * Read multiple files
 * @param files 
 */
export async function readMultifiles(files: FileList): Promise<FileWithContent[]> {
  const contents: FileWithContent[] = [];

  if (!files.length) return contents;

  return new Promise(resolve => {
    function readFile(index: number) {
      if (index >= files.length) {
        resolve(contents);

        return;
      }

      const reader = new FileReader();
      const file = files[index];

      reader.onload = function (e) {
        const fileContent = e.target?.result;

        contents.push({
          lastModified: file.lastModified,
          size: file.size,
          type: file.type,
          name: file.name,
          webkitRelativePath: file.webkitRelativePath,
          content: fileContent as string,
        });
        // next file
        readFile(index + 1);
      }

      reader.readAsText(file);
    }

    readFile(0);
  })
}

/**
 * Load protocol buffer files
 * @param filePaths
 * @param importPaths
 * @param onProtoUploaded
 */
export function loadProtosFromSavedProtos(savedProtos: SavedProto[], onProtoUploaded?: OnProtoUpload): ProtoFile[] {
  try {
    const protoList = savedProtos.reduce((list: ProtoFile[], savedFile) => {
      const proto = createProtoFromProtoText(savedFile.protoText!, savedFile.fileName);

      const services = parseServices(proto);

      list.push({
        proto,
        fileName: proto.fileName,
        services,
      });

      return list;
    }, [])

    onProtoUploaded?.(protoList, undefined);
    return protoList;

  } catch (e) {
    console.error(e);
    onProtoUploaded?.([], e);

    if (!onProtoUploaded) {
      throw e;
    }

    return [];
  }
}

/**
 * Load protocol buffer files
 * @param filePaths
 * @param importPaths
 * @param onProtoUploaded
 */
export function loadProtosFromProtoTexts(protoTexts: string[], onProtoUploaded?: OnProtoUpload): ProtoFile[] {
  try {
    const protoList = protoTexts.reduce((list: ProtoFile[], protoText) => {
      const proto = createProtoFromProtoText(protoText);

      const services = parseServices(proto);

      list.push({
        proto,
        fileName: proto.fileName,
        services,
      });

      return list;
    }, [])

    onProtoUploaded?.(protoList, undefined);
    return protoList;

  } catch (e) {
    console.error(e);
    onProtoUploaded?.([], e);

    if (!onProtoUploaded) {
      throw e;
    }

    return [];
  }
}

/**
 * Load protocol buffer files from gRPC server reflection
 * // TODO: Not implemented
 * 
 * @param host
 * @param onProtoUploaded
 */
export async function loadProtoFromReflection(host: string, onProtoUploaded?: OnProtoUpload): Promise<ProtoFile[]> {
  return [];
}

/**
 * // TODO: Not implemented
 */
export function importResolvePath(): Promise<string | null> {
  return new Promise(async (resolve, reject) => {
    resolve(null);
  });
}

/**
 * Parse Grpc services from root
 * @param proto
 */
function parseServices(proto: Proto) {

  const services: { [key: string]: ProtoServiceClient } = {};

  walkServices(proto, (service: Service, _: any, serviceName: string) => {
    const mocks = mockRequestMethods(service);
    services[serviceName] = {
      serviceName,
      proto,
      definition: proto.root.lookupService(serviceName),
      methodsMocks: mocks,
      methodsName: Object.keys(mocks),
    };
  });

  return services;
}
