export interface CertificateData {
    certificateId: string;
    title: string;
    subtitle: string;
    description: string;
    signatureImage?: {
        mediaId: string;
        file: string;
        thumbnail: string;
    };
    signatureName: string;
    signatureDesignation: string;
    logo?: {
        mediaId: string;
        file: string;
        thumbnail: string;
    };
    productTitle: string;
    userName: string;
    createdAt: string;
    userImage?: {
        mediaId: string;
        file: string;
        thumbnail: string;
    };
    productPageId: string;
}
