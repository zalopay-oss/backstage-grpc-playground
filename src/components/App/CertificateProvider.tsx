import { configApiRef, useApi } from "@backstage/core-plugin-api";
import { notification } from "antd";
import { fileOpen, FileWithHandle } from "browser-fs-access";
import React, { PropsWithChildren, useContext, useEffect, useRef, useState } from "react";
import { CertType, Certificate, UploadCertificateResponse, CertFile, GrpcPlaygroundApi, LoadCertStatus, grpcPlaygroundApiRef } from "../../api";
import { isSameCertificate, serverCertificate, wellKnownCertExtensions, wellKnownPKFileExtensions } from "../../utils/certificates";
import { getTLSList as getTLSListLocal, storeTLSList as storeTLSListLocal } from "../../storage";
import useEventEmitter, { EventHandler } from "../../utils/useEventEmitter";

export type CertificateContextType = {
  missingCertificate?: Certificate;
  certs: Certificate[];
  setCerts: (props: Certificate[]) => void;
  addUploadedListener: (selectedCertificate: Certificate, handler: (certificate: Certificate, cert: CertFile) => void) => string;
  removeUploadedListener: (selectedCertificate: Certificate, handlerId: string) => void;
  handleMissingCert: () => void;
  handleCertResult: (res: UploadCertificateResponse, successEmit?: boolean) => void;
  handleDeleteCertificate: (certificate: Certificate) => Promise<void>;
  toggleModalMissingCerts: () => void;
  handleImportCert: (
    api: GrpcPlaygroundApi,
    type?: CertType,
    missing?: CertFile[],
    certificate?: Certificate
  ) => Promise<Certificate | undefined>;
  modalMissingCertsOpen: boolean;
  missingCertFiles: CertFile[];
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
  const missingCertificate = useRef<Certificate | undefined>(undefined);
  const grpcPlaygroundApi = useApi(grpcPlaygroundApiRef);
  const configApi = useApi(configApiRef);
  const isUseCertStore = !!configApi.getOptional('grpcPlayground.certStore.enabled');

  /**
   * Internal ref of current listener of entities
   * 
   * This is for ref only, not real listeners
   */
  const currentUploadedListener = useRef<Record<string, string | undefined>>({});
  const missingCertFiles = React.useRef<CertFile[]>([]);

  const { emit: certUploadEmit, addEventListener, removeEventListener } = useEventEmitter('cert-upload');

  useEffect(() => {
    getTLSList().then(setCerts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function getTLSList(): Promise<Certificate[]> {
    // First get from localStorage regardless of isUseCertStore
    let certificates = getTLSListLocal();

    if (isUseCertStore) {
      const getCertificateRes = await grpcPlaygroundApi.getCertificates();

      if (Array.isArray(getCertificateRes)) {
        certificates = getCertificateRes;
        // serverCertificate is not saved in certStore so always add it to top of the list
        certificates.splice(0, 0, serverCertificate);
      }
    }

    return certificates;
  }

  function setCerts(newCerts: Certificate[]) {
    setStateCerts(newCerts);
    // Store TLS list in local storage regardless of isUseCertStore
    storeTLSListLocal(newCerts);
  }

  const toggleModalMissingCerts = () => {
    setModalMissingCertsOpen(o => !o);
  }

  function handleMissingCert() {
    if (!missingCertFiles.current?.length) return;
    toggleModalMissingCerts();
  }

  const handleCertResult = (res: UploadCertificateResponse, successEmit?: boolean) => {
    const onCertUpload = handleCertUpload(setCerts, certs);
    const certificate = res.certificate;

    if (res.certs) {
      if (missingCertFiles.current.length) {
        missingCertFiles.current = missingCertFiles.current.filter(current => {
          return !res.certs.find(resolved => resolved.filePath === current.filePath);
        });
      }
    }

    if (res.certificate) {
      missingCertificate.current = res.certificate;
    }

    switch (res?.status) {
      case LoadCertStatus.part: {
        if (res.missingCerts?.length) {
          if (res.certs) {
            onCertUpload(res.certs, certificate);
          }

          // Merge missing certs
          const map = new Map<string, CertFile>();
          const addToMap = (cert: CertFile) => map.set(cert.filePath, cert);

          missingCertFiles.current.concat(res.missingCerts).forEach(addToMap);
          missingCertFiles.current = Array.from(map.values());
        }
        break;
      }
      case LoadCertStatus.ok:
        if (res.certs) {
          onCertUpload(res.certs, certificate);

          if (successEmit && !missingCertFiles.current.length) {
            certUploadEmit(CertUploadAction.SUCCESS, certificate, res.certs);
          }
        }
        break;

      default:
      case LoadCertStatus.fail:
        onCertUpload([], certificate, new Error(res.message || 'Unknown error'));
        break;
    }

    if (missingCertFiles.current.length) {
      // still missing imports
      handleMissingCert();
    }
  }

  function removeUploadedListener(certificate: Certificate, handlerId: string) {
    removeEventListener(CertUploadAction.SUCCESS, handlerId);
    setCurrentUploadedListener(certificate);
  }

  function setCurrentUploadedListener(certificate: Certificate, handlerId?: string) {
    const rootCertPath = certificate.rootCert.filePath;
    currentUploadedListener.current[rootCertPath] = handlerId;
  };

  function getCurrentUploadedListener(certificate: Certificate) {
    const rootCertPath = certificate.rootCert.filePath;
    return currentUploadedListener.current[rootCertPath];
  }

  function addUploadedListener(certificate: Certificate, handler: EventHandler) {
    const currentListener = getCurrentUploadedListener(certificate);

    if (currentListener) {
      // Make sure only one listener is registered for one certificate
      // To prevent multiple listeners for the same certificate 
      // that can be executed once the certificate is uploaded
      removeUploadedListener(certificate, currentListener);
    }

    const handlerId = addEventListener(CertUploadAction.SUCCESS, handler);
    setCurrentUploadedListener(certificate, handlerId);
    return handlerId;
  }

  const ignoreCurrentMissingCert = () => {
    missingCertFiles.current = [];
    toggleModalMissingCerts();

    if (missingCertFiles.current.length) {
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
              type: match.type,
            };
          }

          return acc;
        }, {} as typeof fileMappings);
      }

      const certificateRes = await api.uploadCertificate({
        files: files as any,
        fileMappings,
        certificate,
      });

      handleCertResult(certificateRes, true);

      if (certificateRes.certificate) {
        return certificateRes.certificate;
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('OUTPUT ~ CertificateContextProvider ~ err', e);
      // No file selected.
    }

    return certificate;
  }

  async function handleDeleteCertificate(certificate: Certificate) {
    if (isUseCertStore) {
      grpcPlaygroundApi.deleteCertificate(certificate.id!)
        .catch(err => {
          // eslint-disable-next-line no-console
          console.log('OUTPUT ~ handleDeleteCertificate ~ err', err);
        });
    }

    const certIndex = certs.findIndex((cert) => isSameCertificate(cert, certificate));

    // side-case
    // also clear missing certs
    missingCertFiles.current = missingCertFiles.current.filter(c => {
      return certificate[c.type]?.filePath !== c.filePath;
    });

    const certificates = [...certs];
    certificates.splice(certIndex, 1);

    setCerts(certificates);
  }

  return (
    <CertificateContext.Provider
      value={{
        certs,
        setCerts,
        handleDeleteCertificate,
        missingCertificate: missingCertificate.current,
        handleMissingCert,
        handleCertResult,
        addUploadedListener,
        removeUploadedListener,
        toggleModalMissingCerts,
        modalMissingCertsOpen,
        handleImportCert,
        ignoreCurrentMissingCert,
        missingCertFiles: missingCertFiles.current,
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
      extensions: wellKnownCertExtensions,
    },
    'privateKey': {
      id: 'private-key',
      extensions: wellKnownPKFileExtensions,
    },
    'certChain': {
      id: 'cert-chain',
      extensions: wellKnownCertExtensions,
    },
    multiple: {
      id: 'multiple-certs',
      extensions: wellKnownCertExtensions.concat(wellKnownPKFileExtensions),
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
  return function onCertUpload(newCerts: CertFile[], certificate?: Certificate, err?: Error) {
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

      if (certificate) {
        // Upload private key or cert chain
        let isFound = false;

        appCerts = certs.map(cert => {
          if (!isSameCertificate(cert, certificate)) {
            return cert;
          }

          isFound = true;

          const updatedCert = { ...cert };

          for (const newCert of newCerts) {
            updatedCert[newCert.type] = {
              ...newCert,
            };
          }

          return updatedCert;
        });

        if (!isFound) {
          appCerts.push(certificate);
        }
      } else {
        // New certificate
        const newCertificate = newCerts.reduce((acc, cert) => {
          acc[cert.type] = cert;

          return acc;
        }, {} as Certificate);

        appCerts.push(newCertificate);
      }

      setCerts(appCerts);
    }
  }
}
