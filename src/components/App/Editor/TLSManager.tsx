/* eslint-disable consistent-return */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';
import { CloseOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { Button, Input, Radio, Table } from "antd";
import { Certificate } from '../../../api';
import { useApi } from '@backstage/core-plugin-api';
import { grpcPlaygroundApiRef } from '../../../api';
import { useCertificateContext } from '../CertificateProvider';
import { isSameCertificate } from '../../../utils/certificates';

interface TLSManagerProps {
  selected?: Certificate
  onSelected?: (value?: Certificate) => void
}

export function TLSManager({ selected, onSelected }: TLSManagerProps) {
  const {
    certs,
    setCerts,
    handleImportCert: importCert,
    handleDeleteCertificate,
  } = useCertificateContext()!;
  const grpcPlaygroundApi = useApi(grpcPlaygroundApiRef);
  const handleImportCert = importCert.bind(null, grpcPlaygroundApi);

  return (
    <>
      <div>
        <Button
          type="primary"
          onClick={async () => {
            const cert = await handleImportCert('rootCert');
            onSelected?.(cert);
          }}
          style={{
            borderRadius: 0,
            width: "100%"
          }}
        >
          <PlusCircleOutlined /> Add Root Certificate
        </Button>
      </div>
      <Table
        dataSource={certs}
        pagination={false}
        className='table-tls'
        rowKey={(certificate: Certificate) => certificate.id ?? certificate.rootCert.filePath}
      >
        <Table.Column
          title={(
            <Radio
              name="tls"
              value=""
              checked={!selected}
              onChange={() => onSelected && onSelected()}
            />
          )}
          key="radio"
          render={(text, certificate: Certificate) => (
            <div>
              <Radio
                name="tls"
                value={certificate.rootCert.filePath}
                checked={isSameCertificate(certificate, selected)}
                onChange={() => onSelected && onSelected(certificate)}
              />
            </div>
          )}
        />
        <Table.Column
          title="Root Certificate"
          key="rootCert"
          render={(text, record: Certificate) => (
            <div>
              <span title={record.rootCert.filePath}>{record.rootCert.fileName}</span>
            </div>
          )}
        />
        <Table.Column
          title="Private Key"
          key="privateKey"
          render={(text, certificate: Certificate) => {
            const { privateKey } = certificate;
            if (certificate.useServerCertificate === true) {
              return <div>-</div>
            }
            return (
              <>
                <a
                  onClick={async (e) => {
                    e.preventDefault();
                    const cert = await handleImportCert('privateKey', undefined, certificate);
                    if (isSameCertificate(cert, selected)) {
                      onSelected?.(cert);
                    }
                  }}
                >
                  {privateKey?.fileName || 'Import Key'}
                </a>
              </>
            )
          }}
        />
        <Table.Column
          title="Cert Chain"
          dataIndex="certChain"
          key="certChain"
          render={(text, certificate: Certificate) => {
            if (certificate.useServerCertificate === true) {
              return <div>-</div>
            }
            return (
              <>
                {/* {certificate.certChain ? (
                  <span title={certificate.certChain.filePath}>
                    {certificate.certChain.fileName}
                  </span>
                ) : ( */}
                <a onClick={async (e) => {
                  e.preventDefault();
                  const cert = await handleImportCert('certChain', undefined, certificate);
                  if (isSameCertificate(cert, selected)) {
                    onSelected?.(cert);
                  }
                }}>{certificate?.certChain?.fileName || 'Import Cert Chain'}</a>
                {/* )} */}
              </>
            )
          }}
        />
        <Table.Column
          key="sslTarget"
          render={(text, certificate: Certificate) => {
            if (certificate.useServerCertificate === true) {
              return <div />
            }
            return (
              <Input placeholder="ssl target host" defaultValue={certificate.sslTargetHost} onChange={(e) => {
                const cert = setSslTargetHost(
                  e.target.value,
                  certificate,
                  certs,
                  setCerts
                );

                if (isSameCertificate(cert, selected)) {
                  onSelected?.(cert);
                }
              }} />
            )
          }}
        />
        <Table.Column
          key="delete"
          render={(text, certificate: Certificate) => {
            if (certificate.useServerCertificate === true) {
              return <div />
            }
            return (
              <CloseOutlined
                onClick={() => {
                  if (isSameCertificate(certificate, selected)) {
                    onSelected?.();
                  }

                  handleDeleteCertificate(certificate);
                }}
                style={{
                  cursor: "pointer",
                }} />
            );
          }}
        />
      </Table>
    </>
  );
}

function setSslTargetHost(
  value: string,
  certificate: Certificate,
  certs: Certificate[],
  setCerts: React.Dispatch<Certificate[]>
): Certificate {
  const certIndex = certs.findIndex((cert) => isSameCertificate(cert, certificate));
  certificate.sslTargetHost = value;
  certs[certIndex] = certificate;

  setCerts(certs);

  return certificate;
}
