"use client";

import { useContext, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, Save, Loader2 } from "lucide-react";
import { MediaSelector, useToast } from "@courselit/components-library";
import { Media, Profile, UIConstants } from "@courselit/common-models";
import { AddressContext, ProfileContext } from "@components/contexts";
import { MIMETYPE_IMAGE } from "@ui-config/constants";
import {
    APP_MESSAGE_COURSE_SAVED,
    BUTTON_SAVE,
    BUTTON_SAVING,
    TOAST_TITLE_ERROR,
    TOAST_TITLE_SUCCESS,
} from "@ui-config/strings";
import { useGraphQLFetch } from "@/hooks/use-graphql-fetch";
import {
    Collapsible,
    CollapsibleTrigger,
    CollapsibleContent,
} from "@components/ui/collapsible";
import Link from "next/link";

const MUTATION_UPDATE_CERTIFICATE = `
    mutation UpdateCertificate($courseId: String!, $certificate: Boolean!) {
        updateCourse(courseData: { id: $courseId, certificate: $certificate }) {
            courseId
        }
    }
`;

const MUTATION_UPDATE_CERTIFICATE_TEMPLATE = `
    mutation UpdateCertificateTemplate($courseId: String!, $title: String, $subtitle: String, $description: String, $signatureName: String, $signatureDesignation: String, $signatureImage: MediaInput, $logo: MediaInput) {
        updateCourseCertificateTemplate(courseId: $courseId, title: $title, subtitle: $subtitle, description: $description, signatureName: $signatureName, signatureDesignation: $signatureDesignation, signatureImage: $signatureImage, logo: $logo) {
            title
            signatureImage {
                mediaId
                originalFileName
                file
                thumbnail
            }
            logo {
                mediaId
                originalFileName
                file
                thumbnail
            }
        }
    }
`;

interface CertificatesProps {
    product: any;
    productId: string;
}

export default function Certificates({
    product,
    productId,
}: CertificatesProps) {
    const { toast } = useToast();
    const address = useContext(AddressContext);
    const profile = useContext(ProfileContext);
    const fetch = useGraphQLFetch();
    const [loading, setLoading] = useState(false);
    const [certificate, setCertificate] = useState(
        product?.certificate || false,
    );
    const [certificateTemplateErrors, setCertificateTemplateErrors] = useState<
        Record<string, string>
    >({});
    const [certificateTemplate, setCertificateTemplate] = useState<{
        title: string;
        subtitle: string;
        description: string;
        signatureName: string;
        signatureDesignation: string;
        signatureImage: any;
        logo: any;
    }>({
        title: "",
        subtitle: "",
        description: "",
        signatureName: "",
        signatureDesignation: "",
        signatureImage: {},
        logo: {},
    });

    const loadCertificateTemplate = async (courseId: string) => {
        const query = `
            query GetCourseCertificateTemplate($courseId: String!) {
                certificateTemplate: getCourseCertificateTemplate(courseId: $courseId) {
                    title
                    subtitle
                    description
                    signatureName
                    signatureDesignation
                    signatureImage {
                        mediaId
                        originalFileName
                        file
                        thumbnail
                    }
                    logo {
                        mediaId
                        originalFileName
                        file
                        thumbnail
                    }
                }
            }
        `;

        try {
            const fetchInstance = fetch
                .setPayload({
                    query,
                    variables: { courseId },
                })
                .build();

            const response = await fetchInstance.exec();
            if (response.certificateTemplate) {
                setCertificateTemplate({
                    title: response.certificateTemplate.title || "",
                    subtitle: response.certificateTemplate.subtitle || "",
                    description: response.certificateTemplate.description || "",
                    signatureName:
                        response.certificateTemplate.signatureName || "",
                    signatureDesignation:
                        response.certificateTemplate.signatureDesignation || "",
                    signatureImage:
                        response.certificateTemplate.signatureImage || {},
                    logo: response.certificateTemplate.logo || {},
                });
            }
        } catch (err) {
            console.error("Error loading certificate template:", err);
        }
    };

    useEffect(() => {
        if (product?.certificate && product?.courseId) {
            loadCertificateTemplate(product.courseId);
        }
    }, [product?.certificate, product?.courseId]);

    const handleCertificateChange = async () => {
        const newValue = !certificate;
        const previousValue = certificate;
        setCertificate(newValue);

        if (!product?.courseId) return;

        try {
            setLoading(true);
            const response = await fetch
                .setPayload({
                    query: MUTATION_UPDATE_CERTIFICATE,
                    variables: {
                        courseId: product.courseId,
                        certificate: newValue,
                    },
                })
                .build()
                .exec();

            if (response?.updateCourse) {
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: APP_MESSAGE_COURSE_SAVED,
                });
            }
        } catch (err: any) {
            // Revert to previous state on error
            setCertificate(previousValue);
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCertificateTemplateInputChange = (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const { name, value } = e.target;
        setCertificateTemplate((prev) => ({ ...prev, [name]: value }));
    };

    const validateCertificateTemplate = () => {
        const newErrors: Record<string, string> = {};

        // Check description length if provided
        if (
            certificateTemplate.description &&
            certificateTemplate.description.length > 400
        ) {
            newErrors.description =
                "Description must be 400 characters or less";
        }

        setCertificateTemplateErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const saveCertificateTemplate = async (
        e: React.FormEvent<HTMLFormElement>,
    ) => {
        e.preventDefault();
        if (!validateCertificateTemplate() || !product?.courseId) return;

        const variables = {
            courseId: product.courseId,
            title: certificateTemplate.title,
            subtitle: certificateTemplate.subtitle,
            description: certificateTemplate.description,
            signatureName: certificateTemplate.signatureName,
            signatureDesignation: certificateTemplate.signatureDesignation,
        };

        try {
            setLoading(true);
            const response = await fetch
                .setPayload({
                    query: MUTATION_UPDATE_CERTIFICATE_TEMPLATE,
                    variables,
                })
                .build()
                .exec();

            if (response?.updateCourseCertificateTemplate) {
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: APP_MESSAGE_COURSE_SAVED,
                });
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const saveCertificateSignatureImage = async (media?: Media) => {
        if (!product?.courseId) return;

        // Prepare variables for the mutation
        const variables = {
            courseId: product.courseId,
            signatureImage: media || null,
        };

        try {
            setLoading(true);
            const response = await fetch
                .setPayload({
                    query: MUTATION_UPDATE_CERTIFICATE_TEMPLATE,
                    variables,
                })
                .build()
                .exec();

            if (response?.updateCourseCertificateTemplate) {
                setCertificateTemplate({
                    ...certificateTemplate,
                    signatureImage:
                        response.updateCourseCertificateTemplate
                            .signatureImage || {},
                });
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: APP_MESSAGE_COURSE_SAVED,
                });
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const saveCertificateLogo = async (media?: Media) => {
        if (!product?.courseId) return;

        // Prepare variables for the mutation
        const variables = {
            courseId: product.courseId,
            logo: media || null,
        };

        try {
            setLoading(true);
            const response = await fetch
                .setPayload({
                    query: MUTATION_UPDATE_CERTIFICATE_TEMPLATE,
                    variables,
                })
                .build()
                .exec();

            if (response?.updateCourseCertificateTemplate) {
                setCertificateTemplate({
                    ...certificateTemplate,
                    logo: response.updateCourseCertificateTemplate.logo || {},
                });
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: APP_MESSAGE_COURSE_SAVED,
                });
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    // Only show for course type products
    if (product?.type?.toLowerCase() !== UIConstants.COURSE_TYPE_COURSE) {
        return null;
    }

    return (
        <div className="space-y-8">
            <div className="space-y-6" id="publish">
                <h2 className="text-base font-semibold">Certificates</h2>
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-base font-semibold">
                            Issue certificates
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Enable certificate for this course.
                        </p>
                    </div>
                    <div className="flex gap-4 items-center">
                        {certificate && (
                            <Link
                                href={`/certificate/demo?courseId=${productId}`}
                                target="_blank"
                                className="underline text-black font-medium text-sm text-muted-foreground"
                            >
                                Preview
                            </Link>
                        )}
                        <Switch
                            checked={certificate}
                            onCheckedChange={handleCertificateChange}
                            disabled={loading}
                        />
                    </div>
                </div>
                {certificate && (
                    <div className="space-y-6" id="certificate-template">
                        <Collapsible>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <h2 className="text-base font-semibold">
                                        Certificate Template
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        Customize the content and branding for
                                        issued certificates
                                    </p>
                                </div>
                                <CollapsibleTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-9 p-0 group"
                                    >
                                        <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                                        <span className="sr-only">Toggle</span>
                                    </Button>
                                </CollapsibleTrigger>
                            </div>

                            <CollapsibleContent className="space-y-6 overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:slide-in-from-top-2 data-[state=closed]:slide-out-to-top-2">
                                {/* Form with explicit save button for text fields */}
                                <form
                                    onSubmit={saveCertificateTemplate}
                                    className="space-y-6 mt-4"
                                >
                                    <div className="space-y-4">
                                        <Label
                                            htmlFor="certificate-title"
                                            className="text-sm font-semibold"
                                        >
                                            Certificate Title
                                        </Label>
                                        <Input
                                            id="certificate-title"
                                            name="title"
                                            value={certificateTemplate.title}
                                            onChange={
                                                handleCertificateTemplateInputChange
                                            }
                                            placeholder="Certificate of Completion"
                                            className={
                                                certificateTemplateErrors.title
                                                    ? "border-red-500"
                                                    : ""
                                            }
                                            disabled={loading}
                                        />
                                        {certificateTemplateErrors.title && (
                                            <p className="text-red-500 text-sm">
                                                {
                                                    certificateTemplateErrors.title
                                                }
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <Label
                                            htmlFor="certificate-subtitle"
                                            className="text-sm font-semibold"
                                        >
                                            Certificate Subtitle
                                        </Label>
                                        <Input
                                            id="certificate-subtitle"
                                            name="subtitle"
                                            value={certificateTemplate.subtitle}
                                            onChange={
                                                handleCertificateTemplateInputChange
                                            }
                                            placeholder="This certificate is awarded to"
                                            className={
                                                certificateTemplateErrors.subtitle
                                                    ? "border-red-500"
                                                    : ""
                                            }
                                            disabled={loading}
                                        />
                                        {certificateTemplateErrors.subtitle && (
                                            <p className="text-red-500 text-sm">
                                                {
                                                    certificateTemplateErrors.subtitle
                                                }
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <Label
                                            htmlFor="certificate-description"
                                            className="text-sm font-semibold"
                                        >
                                            Certificate Description
                                        </Label>
                                        <Input
                                            id="certificate-description"
                                            name="description"
                                            value={
                                                certificateTemplate.description
                                            }
                                            onChange={
                                                handleCertificateTemplateInputChange
                                            }
                                            placeholder="for completing the course"
                                            className={
                                                certificateTemplateErrors.description
                                                    ? "border-red-500"
                                                    : ""
                                            }
                                            disabled={loading}
                                        />
                                        <div className="flex justify-between items-center">
                                            {certificateTemplateErrors.description && (
                                                <p className="text-red-500 text-sm">
                                                    {
                                                        certificateTemplateErrors.description
                                                    }
                                                </p>
                                            )}
                                            <p
                                                className={`text-xs ml-auto ${certificateTemplate.description.length > 400 ? "text-red-500" : "text-muted-foreground"}`}
                                            >
                                                {
                                                    certificateTemplate
                                                        .description.length
                                                }
                                                /400 characters
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Label
                                            htmlFor="signature-name"
                                            className="text-sm font-semibold"
                                        >
                                            Signature Name
                                        </Label>
                                        <Input
                                            id="signature-name"
                                            name="signatureName"
                                            value={
                                                certificateTemplate.signatureName
                                            }
                                            onChange={
                                                handleCertificateTemplateInputChange
                                            }
                                            placeholder="Instructor Name"
                                            className={
                                                certificateTemplateErrors.signatureName
                                                    ? "border-red-500"
                                                    : ""
                                            }
                                            disabled={loading}
                                        />
                                        {certificateTemplateErrors.signatureName && (
                                            <p className="text-red-500 text-sm">
                                                {
                                                    certificateTemplateErrors.signatureName
                                                }
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <Label
                                            htmlFor="signature-designation"
                                            className="text-sm font-semibold"
                                        >
                                            Signature Designation
                                        </Label>
                                        <Input
                                            id="signature-designation"
                                            name="signatureDesignation"
                                            value={
                                                certificateTemplate.signatureDesignation
                                            }
                                            onChange={
                                                handleCertificateTemplateInputChange
                                            }
                                            placeholder="Course Instructor"
                                            disabled={loading}
                                        />
                                    </div>

                                    <Button type="submit" disabled={loading}>
                                        {loading ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Save className="h-4 w-4 mr-2" />
                                        )}
                                        {loading ? BUTTON_SAVING : BUTTON_SAVE}
                                    </Button>
                                </form>

                                {/* Media uploads with automatic sync - outside the form */}
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <Label className="text-sm font-semibold">
                                            Signature Image
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            Upload a signature image for the
                                            certificate (saves automatically)
                                        </p>
                                        <MediaSelector
                                            title=""
                                            src={
                                                (certificateTemplate.signatureImage &&
                                                    certificateTemplate
                                                        .signatureImage
                                                        .thumbnail) ||
                                                ""
                                            }
                                            srcTitle={
                                                (certificateTemplate.signatureImage &&
                                                    certificateTemplate
                                                        .signatureImage
                                                        .originalFileName) ||
                                                ""
                                            }
                                            onSelection={(media?: Media) => {
                                                if (media) {
                                                    setCertificateTemplate(
                                                        (prev) => ({
                                                            ...prev,
                                                            signatureImage:
                                                                media,
                                                        }),
                                                    );
                                                }
                                                saveCertificateSignatureImage(
                                                    media,
                                                );
                                            }}
                                            mimeTypesToShow={[
                                                ...MIMETYPE_IMAGE,
                                            ]}
                                            access="public"
                                            strings={{}}
                                            profile={
                                                profile as unknown as Profile
                                            }
                                            address={address}
                                            mediaId={
                                                (certificateTemplate.signatureImage &&
                                                    certificateTemplate
                                                        .signatureImage
                                                        .mediaId) ||
                                                ""
                                            }
                                            onRemove={() => {
                                                setCertificateTemplate(
                                                    (prev) => ({
                                                        ...prev,
                                                        signatureImage: {},
                                                    }),
                                                );
                                                saveCertificateSignatureImage();
                                            }}
                                            type="certificate"
                                            disabled={loading}
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <Label className="text-sm font-semibold">
                                            Logo
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            Upload a logo for the certificate
                                            (saves automatically)
                                        </p>
                                        <MediaSelector
                                            title=""
                                            src={
                                                (certificateTemplate.logo &&
                                                    certificateTemplate.logo
                                                        .thumbnail) ||
                                                ""
                                            }
                                            srcTitle={
                                                (certificateTemplate.logo &&
                                                    certificateTemplate.logo
                                                        .originalFileName) ||
                                                ""
                                            }
                                            onSelection={(media?: Media) => {
                                                if (media) {
                                                    setCertificateTemplate(
                                                        (prev) => ({
                                                            ...prev,
                                                            logo: media,
                                                        }),
                                                    );
                                                }
                                                saveCertificateLogo(media);
                                            }}
                                            mimeTypesToShow={[
                                                ...MIMETYPE_IMAGE,
                                            ]}
                                            access="public"
                                            strings={{}}
                                            profile={
                                                profile as unknown as Profile
                                            }
                                            address={address}
                                            mediaId={
                                                (certificateTemplate.logo &&
                                                    certificateTemplate.logo
                                                        .mediaId) ||
                                                ""
                                            }
                                            onRemove={() => {
                                                setCertificateTemplate(
                                                    (prev) => ({
                                                        ...prev,
                                                        logo: {},
                                                    }),
                                                );
                                                saveCertificateLogo();
                                            }}
                                            type="certificate"
                                            disabled={loading}
                                        />
                                    </div>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    </div>
                )}
            </div>
            <Separator />
        </div>
    );
}
