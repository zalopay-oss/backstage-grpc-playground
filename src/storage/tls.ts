import { Certificate } from "../api";
import { serverCertificate } from "../utils/certificates";
import { Store } from "./Store";

const TLSStore = new Store({
  name: "tls",
});

const TLS_KEYS = {
  CERTIFICATES: 'certificates'
};

export function storeTLSList(certs: Certificate[]) {
  TLSStore.set(TLS_KEYS.CERTIFICATES, certs);
}

function checkEmptyTLSList(val: any) {
  return val === null || val === undefined || (val as []).length === 0;
}

export function getTLSList() {
  return TLSStore.get(TLS_KEYS.CERTIFICATES, [serverCertificate], checkEmptyTLSList);
}

export function clearTLS() {
  return TLSStore.clear();
}
