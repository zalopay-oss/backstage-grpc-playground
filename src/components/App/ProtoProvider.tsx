import { notification } from 'antd';
import React, { useContext, useState, } from 'react';
import { FileWithImports, LoadProtoStatus, OnProtoUpload, ProtoFile, UploadProtoResponse } from '../../api';
import { storeProtos } from '../../storage';
import useEventEmitter, { EventHandler } from '../../utils/useEventEmitter';

export type ProtoContextType = {
  protos: ProtoFile[];
  setProtos: (props: ProtoFile[]) => void;
  handleProtoResult: (res: UploadProtoResponse, successEmit?: boolean) => void;
  addUploadedListener: (handler: (protos: ProtoFile[]) => void) => string;
  removeUploadedListener: (handlerId: string) => void;
  handleMissingImport: () => void;
  toggleModalMissingImports: () => void;
  modalMissingImportsOpen: boolean;
  importFor?: FileWithImports;
  ignoreCurrentMissingImport: () => void;
}

export enum ProtoUploadAction {
  SUCCESS = 'success',
  FAILED = 'failed',
}

export const ProtoContext = React.createContext<ProtoContextType | null>(null);

export function useProtoContext() {
  return useContext(ProtoContext);
}

export function ProtoContextProvider({ children }: { children: React.ReactNode }) {
  const [protos, setProtosState] = useState<ProtoFile[]>([]);
  const [modalMissingImportsOpen, setModalMissingImportsOpen] = useState(false);

  const importFor = React.useRef<FileWithImports | undefined>();
  const missingImports = React.useRef<FileWithImports[]>([]);

  const { emit: protoUploadEmit, addEventListener, removeEventListener } = useEventEmitter('proto-upload');

  function setProtos(props: ProtoFile[]) {
    setProtosState(props);
    storeProtos(props);
  }

  const toggleModalMissingImports = () => {
    setModalMissingImportsOpen(o => !o);
  }

  function handleMissingImport() {
    const [missingFor] = missingImports.current || [];
    if (!missingFor) return;
    importFor.current = missingFor;

    toggleModalMissingImports();
  }

  const handleProtoResult = (res: UploadProtoResponse, successEmit?: boolean) => {
    const onProtoUpload = handleProtoUpload(setProtos, protos);

    importFor.current = undefined;

    if (res.protos) {
      if (missingImports.current.length) {
        missingImports.current = missingImports.current.filter(current => {
          return !res.protos!.find(resolved => resolved.proto.filePath === current.filePath)
        })
      }
    }

    switch (res?.status) {
      case LoadProtoStatus.part: {
        if (res.protos) {
          onProtoUpload(res.protos);
        }

        if (res.missingImports?.length) {
          // Merge missing imports
          const map = new Map<string, FileWithImports>();
          const addToMap = (imp: FileWithImports) => map.set(imp.filePath, imp);

          missingImports.current.concat(res.missingImports).forEach(addToMap);
          missingImports.current = Array.from(map.values());
        }
        break;
      }
      case LoadProtoStatus.ok:
        if (res.protos) {
          onProtoUpload(res.protos);

          if (successEmit) {
            protoUploadEmit(ProtoUploadAction.SUCCESS, res.protos);
          }
        }
        break;

      default:
      case LoadProtoStatus.fail:
        onProtoUpload(protos, new Error(res.message || 'Unknown error'));
        break;
    }

    if (missingImports.current.length) {
      // still missing imports
      handleMissingImport();
    }
  }


  const addUploadedListener = (handler: EventHandler) => {
    return addEventListener(ProtoUploadAction.SUCCESS, handler);
  }

  const removeUploadedListener = (handlerId: string) => {
    removeEventListener(ProtoUploadAction.SUCCESS, handlerId);
  }

  const ignoreMissingImport = () => {
    missingImports.current = missingImports.current.filter(f => {
      return f.filePath !== importFor.current?.filePath
    });

    importFor.current = undefined;

    toggleModalMissingImports();

    if (missingImports.current.length) {
      // 100ms is for current modalMissingImport to finish its closing animation
      setTimeout(() => {
        handleMissingImport();
      }, 100);
    }
  }

  return (
    <ProtoContext.Provider
      value={{
        handleProtoResult,
        addUploadedListener,
        removeUploadedListener,
        handleMissingImport,
        modalMissingImportsOpen,
        protos,
        setProtos,
        toggleModalMissingImports,
        importFor: importFor.current,
        ignoreCurrentMissingImport: ignoreMissingImport,
      }}
    >
      {children}
    </ProtoContext.Provider>
  )
}

/**
 *
 * @param setProtos
 * @param protos
 */
export function handleProtoUpload(setProtos: React.Dispatch<ProtoFile[]>, protos: ProtoFile[]): OnProtoUpload {
  return function (newProtos: ProtoFile[], err: Error | void) {
    if (err) {
      notification.error({
        message: "Error while importing protos",
        description: err.message,
        duration: 5,
        placement: "bottomLeft",
        style: {
          width: "89%",
          wordBreak: "break-all",
        }
      });
    }

    const protoMinusExisting = protos.filter((proto) => {
      return !newProtos.find((p) => p.fileName === proto.fileName)
    });

    const appProtos = [...protoMinusExisting, ...newProtos];
    setProtos(appProtos);

    return appProtos;
  }
}
