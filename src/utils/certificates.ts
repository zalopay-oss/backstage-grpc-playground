import { Certificate } from "../api";

// Default Server certificate
export const serverCertificate: Certificate = {
  useServerCertificate: true,
  rootCert: {
    fileName: "Server Certificate",
    filePath: "",
    type: 'rootCert',
  },
};

export function isSameCertificate(cert1?: Certificate, cert2?: Certificate) {
  if (typeof cert1 !== typeof cert2) return false;

  if (!(cert1 && cert2)) {
    return false;
  }

  return cert1?.rootCert?.filePath === cert2?.rootCert?.filePath;
}