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


/**
 * @see https://www.ssls.com/knowledgebase/what-are-certificate-formats-and-what-is-the-difference-between-them/
 */
export const wellKnownCertExtensions = [
  // Base64 (ASCII)
  // PEM
  '.pem',
  '.crt',
  '.ca-bundle',
  // PKCS#7
  '.p7b',
  '.p7s',

  // Binary
  // DER
  '.der',
  '.cer',
  // PKCS#12
  '.pfx',
  '.p12',
];

export const wellKnownPKFileExtensions = [
  '.pem',
  '.key',
  '.pkcs12'
];
