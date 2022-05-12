/* eslint-disable no-console */
import { Proto, ProtoFile, ProtoService as ProtoServiceClient } from './protobuf';
// eslint-disable-next-line import/no-extraneous-dependencies
import { parse, Service } from 'protobufjs';
import { mockRequestMethods, walkServices } from './bloomrpc-mock';
import { v4 as uuid } from 'uuid';

export type OnProtoUpload = (protoFiles: ProtoFile[], err?: Error) => void

export interface FileWithContent extends Pick<File, 'name' | 'type' | 'size' | 'lastModified' | 'webkitRelativePath'> {
  content?: string;
}

/**
 * Upload protofiles
 * @param onProtoUploaded
 * @param importPaths
 */
export async function importProtos(onProtoUploaded: OnProtoUpload, importPaths?: string[]) {
  const filePaths: string[] = [];
  if (!filePaths) {
    return;
  }

  await loadProtos(filePaths, onProtoUploaded);
}

/**
 * Upload protofiles from gRPC server reflection
 * @param onProtoUploaded
 * @param host
 */
export async function importProtosFromServerReflection(onProtoUploaded: OnProtoUpload, host: string) {
  await loadProtoFromReflection(host, onProtoUploaded);
}

/**
 * Load protocol buffer files
 * @param filePaths
 * @param importPaths
 * @param onProtoUploaded
 */
export async function loadProtos(protoPaths: string[], onProtoUploaded?: OnProtoUpload): Promise<ProtoFile[]> {
  return loadProtosFromProtoTexts(protoPaths, onProtoUploaded);
}

export function createProtoFromFile(file: FileWithContent): Proto | null {
  if (!file.content) return null;

  const parseResult = parse(file.content);

  const fileName = file.name || `api-${uuid()}.proto`;

  const proto: Proto = {
    ast: parseResult.root,
    fileName,
    filePath: fileName,
    protoText: file.content,
    root: parseResult.root
  };

  return proto;
}

export function createProtoFileFromProto(proto: Proto): ProtoFile {
  const services = parseServices(proto);

  return {
    proto,
    fileName: proto.fileName,
    services,
  };
}

export function createProtoFromProtoText(protoText: string): Proto {
  const parseResult = parse(protoText);

  const fileName = `api-${uuid({})}.proto`;

  const proto: Proto = {
    ast: parseResult.root,
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
export async function loadProtosFromProtoTexts(protoTexts: string[], onProtoUploaded?: OnProtoUpload): Promise<ProtoFile[]> {
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
 * @param host
 * @param onProtoUploaded
 */
export async function loadProtoFromReflection(host: string, onProtoUploaded?: OnProtoUpload): Promise<ProtoFile[]> {
  return [];
}

export function importResolvePath(): Promise<string | null> {
  return new Promise(async (resolve, reject) => {
    // const openDialogResult = await remote.dialog.showOpenDialog(remote.getCurrentWindow(), {
    //   properties: ['openDirectory'],
    //   filters: []
    // });

    // const filePaths = openDialogResult.filePaths;

    // if (!filePaths) {
    //   return reject("No folder selected");
    // }
    // resolve(filePaths[0]);

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
      methodsMocks: mocks,
      methodsName: Object.keys(mocks),
    };
  });

  return services;
}
