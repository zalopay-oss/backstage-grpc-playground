import { notification } from "antd";
import { fileOpen, FileWithHandle } from "browser-fs-access";
import React, { PropsWithChildren, useContext, useEffect, useRef, useState } from "react";
import { CertType, Certificate, UploadCertificateResponse, CertFile, GrpcPlaygroundApi, LoadCertStatus } from "../../api";
import { getTLSList, storeTLSList } from "../../storage";
import useEventEmitter, { EventHandler } from "../../utils/useEventEmitter";

export type CertificateContextType = {
  selectedCertifcate?: Certificate;
  certs: Certificate[];
  setCerts: (props: Certificate[]) => void;
  addUploadedListener: (handler: (certificate: Certificate, cert: CertFile) => void) => string;
  removeUploadedListener: (handlerId: string) => void;
  handleMissingCert: () => void;
  handleCertResult: (res: UploadCertificateResponse, tlsSelected: Certificate, successEmit?: boolean) => void;
  toggleModalMissingCerts: () => void;
  handleImportCert: (
    api: GrpcPlaygroundApi,
    type?: CertType,
    missing?: CertFile[],
    certificate?: Certificate
  ) => Promise<Certificate | undefined>;
  modalMissingCertsOpen: boolean;
  missingCerts: CertFile[];
  ignoreCurrentMissingCert: () => void;
}

export enum CertUploadAction {
  SUCCESS = 'success',
  FAILED = 'failed',
}

export const CertificateContext = React.createContext<CertificateContextType | null>(null);

export function useCertificateContext() {
  return useContext(CertificateContext);
}

export function CertificateContextProvider({ children }: PropsWithChildren<{}>) {
  const [certs, setStateCerts] = useState<Certificate[]>([]);
  const [modalMissingCertsOpen, setModalMissingCertsOpen] = useState(false);
  const selectedCertifcate = useRef<Certificate | undefined>(undefined);

  const missingCerts = React.useRef<CertFile[]>([]);

  const { emit: certUploadEmit, addEventListener, removeEventListener } = useEventEmitter('cert-upload');

  useEffect(() => {
    setCerts(getTLSList());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  function setCerts(newCerts: Certificate[]) {
    setStateCerts(newCerts);
    storeTLSList(newCerts);
  }

  const toggleModalMissingCerts = () => {
    setModalMissingCertsOpen(o => !o);
  }

  function handleMissingCert() {
    const [missingFor] = missingCerts.current || [];
    if (!missingFor) return;

    toggleModalMissingCerts();
  }

  const handleCertResult = (res: UploadCertificateResponse, tlsSelected?: Certificate, successEmit?: boolean) => {
    const onCertUpload = handleCertUpload(setCerts, certs);

    if (res.certs) {
      if (missingCerts.current.length) {
        missingCerts.current = missingCerts.current.filter(current => {
          return !res.certs.find(resolved => resolved.filePath === current.filePath);
        });
      }
    }

    if (res.certificate) {
      selectedCertifcate.current = res.certificate;
    }

    switch (res?.status) {
      case LoadCertStatus.part: {
        if (res.missingCerts?.length) {
          if (res.certs) {
            onCertUpload(res.certs, tlsSelected);
          }

          // Merge missing certs
          const map = new Map<string, CertFile>();
          const addToMap = (cert: CertFile) => map.set(cert.filePath, cert);

          missingCerts.current.concat(res.missingCerts).forEach(addToMap);
          missingCerts.current = Array.from(map.values());
        }
        break;
      }
      case LoadCertStatus.ok:
        if (res.certs) {
          onCertUpload(res.certs, tlsSelected);

          if (successEmit && !missingCerts.current.length) {
            certUploadEmit(CertUploadAction.SUCCESS, tlsSelected, res.certs);
          }
        }
        break;

      default:
      case LoadCertStatus.fail:
        onCertUpload([], tlsSelected, new Error(res.message || 'Unknown error'));
        break;
    }

    if (missingCerts.current.length) {
      // still missing imports
      handleMissingCert();
    }
  }

  const addUploadedListener = (handler: EventHandler) => {
    return addEventListener(CertUploadAction.SUCCESS, handler);
  }

  const removeUploadedListener = (handlerId: string) => {
    removeEventListener(CertUploadAction.SUCCESS, handlerId);
  }

  const ignoreCurrentMissingCert = () => {
    missingCerts.current = [];

    toggleModalMissingCerts();

    if (missingCerts.current.length) {
      // 100ms is for current modalMissingImport to finish its closing animation
      setTimeout(() => {
        handleMissingCert();
      }, 100);
    }
  }

  async function handleImportCert(
    api: GrpcPlaygroundApi,
    singleUploadType?: CertType,
    missings?: CertFile[],
    certificate?: Certificate,
  ): Promise<Certificate | undefined> {
    try {
      /**
       * Mapping by name
       */
      let fileMappings: Record<string, CertFile>;
      // const certificate = await importRootCert();
      // const files: any = await fileOpen(getFileOpenPropsByType(type));
      const files = await fileOpen(getFileOpenPropsByType(singleUploadType ?? 'multiple'));

      if (singleUploadType) {
        // Single upload
        const file = files as FileWithHandle;

        fileMappings = {
          [file.name]: {
            fileName: file.name,
            filePath: [file.webkitRelativePath, file.name].filter(Boolean).join('/'),
            type: singleUploadType,
          }
        };
      } else {
        fileMappings = (files as FileWithHandle[]).reduce((acc: typeof fileMappings, file: FileWithHandle) => {
          const match = missings?.find(f => f.fileName === file.name);

          if (match) {
            acc[file.name] = {
              filePath: match.filePath,
              fileName: match.fileName,
              type: match.type
            };
          }

          return acc;
        }, {} as typeof fileMappings);
      }

      const certificateRes = await api.uploadCertificate({
        files: files as any,
        fileMappings,
      });


      handleCertResult(certificateRes, certificate, true);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('OUTPUT ~ CertificateContextProvider ~ err', e);
      // No file selected.
    }

    return certificate;
  }

  return (
    <CertificateContext.Provider
      value={{
        certs,
        setCerts,
        selectedCertifcate: selectedCertifcate.current,
        handleMissingCert,
        handleCertResult,
        addUploadedListener,
        removeUploadedListener,
        toggleModalMissingCerts,
        modalMissingCertsOpen,
        handleImportCert,
        ignoreCurrentMissingCert,
        missingCerts: missingCerts.current,
      }}
    >
      {children}
    </CertificateContext.Provider>
  )
}

function getFileOpenPropsByType(type: CertType | 'multiple') {
  return {
    'rootCert': {
      id: 'root-cert',
      extensions: ['.crt'],
    },
    'privateKey': {
      id: 'private-key',
    },
    'certChain': {
      id: 'cert-chain',
    },
    multiple: {
      id: 'multiple-certs',
      multiple: true,
    }
  }[type];
}

/**
 *
 * @param setCerts
 * @param certs
 */
export function handleCertUpload(setCerts: React.Dispatch<Certificate[]>, certs: Certificate[]) {
  return function (newCerts: CertFile[], selectedCertifcate?: Certificate, err?: Error) {
    if (err) {
      notification.error({
        message: "Error while importing certificates",
        description: err.message,
        duration: 5,
        placement: "bottomLeft",
        style: {
          width: "89%",
          wordBreak: "break-all",
        }
      });
    }

    if (newCerts.length) {
      let appCerts = [...certs];

      if (selectedCertifcate) {
        // Upload private key or cert chain
        appCerts = certs.map(cert => {
          if (cert.rootCert!.filePath !== selectedCertifcate.rootCert.filePath) {
            return cert;
          }

          const updatedCert = { ...cert };

          for (const newCert of newCerts) {
            updatedCert[newCert.type] = {
              ...newCert,
              // certificate: selectedCertifcate,
            };
          }

          return updatedCert;
        });
      } else {
        // New certificate
        const newCertificate = newCerts.reduce((acc, cert) => {
          acc[cert.type] = cert;

          return acc;
        }, {} as Certificate);

        appCerts.push(newCertificate);
      }

      // eslint-disable-next-line no-console
      console.log('OUTPUT ~ appCerts', appCerts);
      setCerts(appCerts);
    }
  }
}
