"use client";

import { ChangeEvent, useContext, useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import Link from "next/link";
import {
    COURSE_CONTENT_HEADER,
    EDIT_SECTION_HEADER,
    LABEL_DRIP_EMAIL_SUBJECT,
    MANAGE_COURSES_PAGE_HEADING,
    TOAST_DESCRIPTION_CHANGES_SAVED,
    TOAST_TITLE_SUCCESS,
} from "@ui-config/strings";
import { truncate } from "@ui-lib/utils";
import useProduct from "../../../product-hook";
import { AddressContext } from "@components/contexts";
import DashboardContent from "@components/admin/dashboard-content";
import { Constants, DripType } from "@courselit/common-models";
import { MailEditorAndPreview } from "@components/admin/mails/mail-editor-and-preview";
import { Form, useToast } from "@courselit/components-library";
import { FetchBuilder } from "@courselit/utils";
import Resources from "@components/resources";

export default function SectionPage() {
    const { toast } = useToast();
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const productId = params.id as string;
    const sectionId = params.section as string;
    const afterSectionId = searchParams.get("after");

    const [sectionName, setSectionName] = useState("");
    const [enableDrip, setEnableDrip] = useState(false);
    const [dripType, setDripType] = useState<DripType>();
    const [notifyUsers, setNotifyUsers] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [delay, setDelay] = useState(0);
    const [date, setDate] = useState<number>();
    const [emailContent, setEmailContent] = useState("");
    const [emailSubject, setEmailSubject] = useState("");
    const address = useContext(AddressContext);
    const { product } = useProduct(productId, address);
    const [loading, setLoading] = useState(false);
    const breadcrumbs = [
        { label: MANAGE_COURSES_PAGE_HEADING, href: "/dashboard/products" },
        {
            label: product ? truncate(product.title || "", 20) || "..." : "...",
            href: `/dashboard/product-new/${productId}`,
        },
        {
            label: COURSE_CONTENT_HEADER,
            href: `/dashboard/product-new/${productId}/content`,
        },
        { label: EDIT_SECTION_HEADER, href: "#" },
    ];

    useEffect(() => {
        if (sectionId && product && product.groups) {
            const group = product.groups.find(
                (group) => group.id === sectionId,
            );
            if (group) {
                const type = group.drip?.type
                    ? group.drip?.type ===
                      Constants.dripType[0].split("-")[0].toUpperCase()
                        ? Constants.dripType[0]
                        : Constants.dripType[1]
                    : undefined;
                setSectionName(group.name);
                setEnableDrip(
                    typeof group.drip?.status === "boolean"
                        ? group.drip?.status
                        : false,
                );
                setDripType(type);
                if (group.drip?.delayInMillis) {
                    setDelay(group.drip?.delayInMillis / 86400000);
                }
                if (group.drip?.dateInUTC) {
                    setDate(group.drip?.dateInUTC);
                }
                setNotifyUsers(!!group.drip?.email);
                setEmailContent(
                    group.drip?.email?.content ||
                        `Hi {{ subscriber.name }},
                    \n<p>A new section is now available in <a href='${address.frontend}/course/${product.slug}/${product.courseId}'>${product.title}</a>.</p>
                    \nCheers!`,
                );
                setEmailSubject(
                    group.drip?.email?.subject ||
                        `A new section is now available in ${product.title}`,
                );
            }
        }
    }, [product]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, string> = {};

        if (!sectionName.trim()) {
            newErrors.sectionName = "Section name is required";
        }

        if (enableDrip) {
            if (!dripType) {
                newErrors.dripType = "Please select a release type";
            }

            if (dripType === Constants.dripType[1] && !date) {
                newErrors.releaseDate =
                    "Release date is required when scheduled release is enabled";
            }
            if (dripType === Constants.dripType[0] && !delay) {
                newErrors.releaseDays =
                    "Number of days is required when scheduled release is enabled";
            }
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            // Get the first error field and scroll to it
            const firstErrorField = Object.keys(newErrors)[0];
            const errorElement = document.querySelector(
                `[data-error="${firstErrorField}"]`,
            );
            if (errorElement) {
                errorElement.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
            }

            return;
        }

        await updateGroup();

        router.push(`/dashboard/product-new/${productId}/content`);
    };

    const updateGroup = async () => {
        const query = ` 
        mutation updateGroup($id: ID!, $courseId: ID!, $name: String, $drip: DripInput) {
            course: updateGroup(
                id: $id,
                courseId: $courseId,
                name: $name,
                drip: $drip 
            ) {
                courseId,
                groups {
                    id,
                    name,
                    rank,
                    collapsed,
                    drip {
                        type,
                        status,
                        delayInMillis,
                        dateInUTC,
                        email {
                            content,
                            subject
                        }
                    }
                }
            }
        }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query,
                variables: {
                    id: sectionId,
                    courseId: product?.id,
                    name: sectionName,
                    drip: dripType
                        ? {
                              status: enableDrip,
                              type: dripType.toUpperCase().split("-")[0],
                              delayInMillis: delay,
                              dateInUTC: date,
                              email: notifyUsers
                                  ? {
                                        subject: emailSubject,
                                        content: emailContent,
                                    }
                                  : undefined,
                          }
                        : undefined,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            setLoading(true);
            const response = await fetch.exec();
            if (response.course) {
                // router.replace(
                //     `/dashboard/product-new/${productId}/content`,
                // );
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: TOAST_DESCRIPTION_CHANGES_SAVED,
                });
            }
        } catch (err: any) {
            // toast({
            //     title: TOAST_TITLE_ERROR,
            //     description: err.message,
            //     variant: "destructive",
            // });
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <div className="space-y-6">
                <div>
                    <h1 className="text-4xl font-semibold">
                        {EDIT_SECTION_HEADER}
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Update section details
                    </p>
                </div>

                <Form onSubmit={handleSave} className="space-y-8">
                    <div className="space-y-4">
                        <Label htmlFor="name">Section Name</Label>
                        <Input
                            id="name"
                            data-error="sectionName"
                            placeholder="Enter section name"
                            value={sectionName}
                            onChange={(e) => setSectionName(e.target.value)}
                            className={
                                errors.sectionName ? "border-red-500" : ""
                            }
                        />
                        {errors.sectionName && (
                            <p className="text-sm text-red-500">
                                {errors.sectionName}
                            </p>
                        )}
                    </div>

                    <Separator />

                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold">
                                Content Release
                            </h2>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>
                                            Control when this section becomes
                                            available to students
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="enable-drip">
                                    Scheduled Release
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    Release content gradually to your students
                                </p>
                            </div>
                            <Switch
                                id="enable-drip"
                                checked={enableDrip}
                                onCheckedChange={setEnableDrip}
                            />
                        </div>

                        {enableDrip && (
                            <div className="rounded-lg border p-4 space-y-6 animate-in fade-in-50">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Release Type</Label>
                                        <Select
                                            value={dripType}
                                            onValueChange={(value: DripType) =>
                                                setDripType(value)
                                            }
                                        >
                                            <SelectTrigger
                                                data-error="dripType"
                                                className={
                                                    errors.dripType
                                                        ? "border-red-500"
                                                        : ""
                                                }
                                            >
                                                <SelectValue placeholder="Select release type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem
                                                    value={
                                                        Constants.dripType[1]
                                                    }
                                                >
                                                    Release on specific date
                                                </SelectItem>
                                                <SelectItem
                                                    value={
                                                        Constants.dripType[0]
                                                    }
                                                >
                                                    Release days after previous
                                                    section
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.dripType && (
                                            <p className="text-sm text-red-500">
                                                {errors.dripType}
                                            </p>
                                        )}
                                    </div>

                                    {dripType === Constants.dripType[1] && (
                                        <div className="space-y-2">
                                            <Label htmlFor="releaseDate">
                                                Release Date & Time
                                            </Label>
                                            <Input
                                                id="releaseDate"
                                                data-error="releaseDate"
                                                type="datetime-local"
                                                className={
                                                    errors.releaseDate
                                                        ? "border-red-500"
                                                        : ""
                                                }
                                                value={new Date(
                                                    (date ||
                                                        new Date().getTime()) -
                                                        new Date().getTimezoneOffset() *
                                                            60000,
                                                )
                                                    .toISOString()
                                                    .slice(0, 16)}
                                                min={
                                                    !date
                                                        ? new Date()
                                                              .toISOString()
                                                              .slice(0, 16)
                                                        : undefined
                                                }
                                                onChange={(
                                                    e: ChangeEvent<HTMLInputElement>,
                                                ) => {
                                                    const selectedDate =
                                                        new Date(
                                                            e.target.value,
                                                        );
                                                    setDate(
                                                        selectedDate.getTime(),
                                                    );
                                                }}
                                            />
                                            {errors.releaseDate && (
                                                <p className="text-sm text-red-500">
                                                    {errors.releaseDate}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {dripType === Constants.dripType[0] && (
                                        <div className="space-y-2">
                                            <Label htmlFor="releaseDays">
                                                Days after previous section
                                            </Label>
                                            <div className="flex items-center space-x-2 max-w-[200px]">
                                                <Input
                                                    id="releaseDays"
                                                    data-error="releaseDays"
                                                    type="number"
                                                    min="1"
                                                    placeholder="0"
                                                    className={
                                                        errors.releaseDays
                                                            ? "border-red-500"
                                                            : ""
                                                    }
                                                    value={delay}
                                                    onChange={(e) =>
                                                        setDelay(
                                                            +e.target.value,
                                                        )
                                                    }
                                                />
                                                <span className="text-sm text-muted-foreground whitespace-nowrap">
                                                    days
                                                </span>
                                            </div>
                                            {errors.releaseDays && (
                                                <p className="text-sm text-red-500">
                                                    {errors.releaseDays}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <Separator />

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label htmlFor="notify-users">
                                                Email Notification
                                            </Label>
                                            <p className="text-sm text-muted-foreground">
                                                Notify students when content
                                                becomes available
                                            </p>
                                        </div>
                                        <Switch
                                            id="notify-users"
                                            checked={notifyUsers}
                                            onCheckedChange={setNotifyUsers}
                                        />
                                    </div>

                                    {
                                        notifyUsers && (
                                            <div>
                                                <div className="space-y-2">
                                                    <Label>
                                                        {
                                                            LABEL_DRIP_EMAIL_SUBJECT
                                                        }
                                                    </Label>
                                                    <Input
                                                        value={emailSubject}
                                                        onChange={(e) =>
                                                            setEmailSubject(
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                </div>
                                                <MailEditorAndPreview
                                                    content={emailContent}
                                                    onChange={setEmailContent}
                                                />
                                            </div>
                                        )
                                        // <EmailEditor content={emailContent} setEmailContent={setEmailContent} subject={emailSubject} setEmailSubject={setEmailSubject} />
                                    }
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-4">
                        <Button variant="outline" asChild>
                            <Link
                                href={`/dashboard/product-new/${productId}/content`}
                            >
                                Cancel
                            </Link>
                        </Button>
                        <Button type="submit" disabled={loading}>
                            Save changes
                        </Button>
                    </div>
                </Form>
            </div>
            <Resources
                links={[
                    {
                        href: "https://docs.courselit.app/en/products/section/#drip-a-section",
                        text: "Drip content",
                    },
                ]}
            />
        </DashboardContent>
    );
}

// function EmailEditor({ content, setEmailContent, subject, setEmailSubject }: { content: string, setEmailContent: (content: string) => void, subject: string, setEmailSubject: (subject: string) => void }) {
//   const variables = [
//     { key: "subscriber.email", description: "The email of the subscriber" },
//     { key: "subscriber.name", description: "The name of the subscriber" },
//     { key: "address", description: "Your mailing address" },
//     { key: "unsubscribe_link", description: "A link to unsubscribe from the marketing emails" },
//   ]

//   const defaultTemplate = `Hi {{ subscriber.name }},

// <p>A new section is now available in <a href="https://domain1.clqa.xyz/course/paid-course/kyzAqtNvP8SAuqamFe934">Paid course</a>.</p>

// Cheers!`

//   const previewContent = content
//     .replace("{{ subscriber.name }}", "USER_NAME")
//     .replace(/<a.*?>(.*?)<\/a>/g, '<span class="text-primary hover:underline cursor-pointer">$1</span>')

//   return (
//     <div className="rounded-lg border bg-muted/40 animate-in fade-in-50">
//       <div className="p-4 space-y-6">
//         <div className="space-y-2">
//           <Label>Email Subject</Label>
//           <Input defaultValue="A new section is now available in Paid course" className="bg-background" />
//         </div>

//         <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] gap-6">
//           <div className="space-y-4">
//             <div className="flex items-center gap-2">
//               <h4 className="text-sm font-medium">Template Variables</h4>
//               <TooltipProvider>
//                 <Tooltip>
//                   <TooltipTrigger>
//                     <HelpCircle className="h-4 w-4 text-muted-foreground" />
//                   </TooltipTrigger>
//                   <TooltipContent>
//                     <p>Click to copy variable to clipboard</p>
//                   </TooltipContent>
//                 </Tooltip>
//               </TooltipProvider>
//             </div>
//             <div className="space-y-3">
//               {variables.map((variable) => (
//                 <button
//                   key={variable.key}
//                   onClick={() => navigator.clipboard.writeText(`{{ ${variable.key} }}`)}
//                   className="block space-y-0.5 text-left hover:text-primary transition-colors w-full rounded-md"
//                 >
//                   <div className="font-mono text-xs">{"{{ " + variable.key + " }}"}</div>
//                   <div className="text-xs text-muted-foreground">{variable.description}</div>
//                 </button>
//               ))}
//             </div>
//           </div>

//           <Tabs defaultValue="content" className="w-full">
//             <TabsList className="grid w-full grid-cols-2">
//               <TabsTrigger value="content">Email Content</TabsTrigger>
//               <TabsTrigger value="preview">Preview</TabsTrigger>
//             </TabsList>
//             <TabsContent value="content">
//               <Textarea
//                 value={emailContent}
//                 onChange={(e) => setEmailContent(e.target.value)}
//                 className="min-h-[300px] font-mono bg-background"
//               />
//             </TabsContent>
//             <TabsContent value="preview">
//               <div className="rounded-md border bg-background p-4 min-h-[300px]">
//                 <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: previewContent }} />
//               </div>
//             </TabsContent>
//           </Tabs>
//         </div>
//       </div>
//     </div>
//   )
// }
