"use client";

import { useContext, useState } from "react";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash2 } from "lucide-react";
import type { Instructor, Media, Profile } from "@courselit/common-models";
import { MediaSelector, useToast } from "@courselit/components-library";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AddressContext, ProfileContext } from "@components/contexts";
import { useGraphQLFetch } from "@/hooks/use-graphql-fetch";
import { MIMETYPE_IMAGE } from "@ui-config/constants";
import {
    BTN_ADD_LINK,
    BUTTON_SAVE,
    INSTRUCTOR_BIO_LABEL,
    INSTRUCTOR_BIO_PLACEHOLDER,
    INSTRUCTOR_LINKS_LABEL,
    INSTRUCTOR_LINK_LABEL_PLACEHOLDER,
    INSTRUCTOR_LINK_LABEL_REQUIRED,
    INSTRUCTOR_LINK_URL_INVALID,
    INSTRUCTOR_LINK_URL_PLACEHOLDER,
    INSTRUCTOR_NAME_LABEL,
    INSTRUCTOR_NAME_REQUIRED,
    INSTRUCTOR_PHOTO_LABEL,
    INSTRUCTOR_SAVED_MESSAGE,
    TOAST_TITLE_ERROR,
    TOAST_TITLE_SUCCESS,
} from "@ui-config/strings";

const MAX_LINKS = 10;

const isHttpUrl = (value: string) => {
    try {
        const { protocol } = new URL(value);
        return protocol === "http:" || protocol === "https:";
    } catch {
        return false;
    }
};

const formSchema = z.object({
    name: z.string().trim().min(1, INSTRUCTOR_NAME_REQUIRED).max(100),
    bio: z.string().max(2000),
    links: z
        .array(
            z.object({
                label: z
                    .string()
                    .trim()
                    .min(1, INSTRUCTOR_LINK_LABEL_REQUIRED)
                    .max(50),
                url: z
                    .string()
                    .trim()
                    .refine(isHttpUrl, INSTRUCTOR_LINK_URL_INVALID),
            }),
        )
        .max(MAX_LINKS),
});

type FormData = z.infer<typeof formSchema>;

const MUTATION_CREATE = `
    mutation CreateInstructor($data: InstructorInput!) {
        instructor: createInstructor(instructorData: $data) {
            instructorId
            name
        }
    }
`;

const MUTATION_UPDATE = `
    mutation UpdateInstructor($instructorId: String!, $data: InstructorInput!) {
        instructor: updateInstructor(instructorId: $instructorId, instructorData: $data) {
            instructorId
            name
        }
    }
`;

interface InstructorFormProps {
    instructor?: Instructor;
    onSaved: (instructor: Pick<Instructor, "instructorId" | "name">) => void;
}

export default function InstructorForm({
    instructor,
    onSaved,
}: InstructorFormProps) {
    const { toast } = useToast();
    const fetch = useGraphQLFetch();
    const address = useContext(AddressContext);
    const { profile } = useContext(ProfileContext);
    const [loading, setLoading] = useState(false);
    // undefined: untouched, null: removed, Media: newly chosen
    const [avatarChange, setAvatarChange] = useState<Media | null | undefined>(
        undefined,
    );

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema as any),
        defaultValues: {
            name: instructor?.name ?? "",
            bio: instructor?.bio ?? "",
            links: (instructor?.links ?? []).map(({ label, url }) => ({
                label,
                url,
            })),
        },
    });
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "links",
    });

    const currentAvatar =
        avatarChange === undefined ? instructor?.avatar : avatarChange;

    const save = async (values: FormData) => {
        const data: Record<string, unknown> = {
            name: values.name.trim(),
            bio: values.bio.trim(),
            links: values.links.map(({ label, url }) => ({
                label: label.trim(),
                url: url.trim(),
            })),
        };
        if (avatarChange !== undefined) {
            data.avatar = avatarChange;
        }

        try {
            setLoading(true);
            const response = await fetch
                .setPayload({
                    query: instructor ? MUTATION_UPDATE : MUTATION_CREATE,
                    variables: instructor
                        ? { instructorId: instructor.instructorId, data }
                        : { data },
                })
                .build()
                .exec();

            if (response?.instructor) {
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: INSTRUCTOR_SAVED_MESSAGE,
                });
                onSaved(response.instructor);
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

    return (
        <FormProvider {...form}>
            <form
                onSubmit={form.handleSubmit(save)}
                className="flex flex-col gap-6"
            >
                <div className="space-y-2">
                    <Label>{INSTRUCTOR_PHOTO_LABEL}</Label>
                    <MediaSelector
                        title=""
                        src={currentAvatar?.thumbnail || ""}
                        srcTitle={currentAvatar?.originalFileName || ""}
                        onSelection={(media?: Media) => {
                            if (media) {
                                setAvatarChange(media);
                            }
                        }}
                        onRemove={() => setAvatarChange(null)}
                        mimeTypesToShow={[...MIMETYPE_IMAGE]}
                        access="public"
                        strings={{}}
                        profile={profile as unknown as Profile}
                        address={address}
                        mediaId={currentAvatar?.mediaId || ""}
                        type="course"
                        disabled={loading}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{INSTRUCTOR_NAME_LABEL}</FormLabel>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{INSTRUCTOR_BIO_LABEL}</FormLabel>
                            <FormControl>
                                <Textarea
                                    {...field}
                                    rows={5}
                                    placeholder={INSTRUCTOR_BIO_PLACEHOLDER}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="space-y-3">
                    <Label>{INSTRUCTOR_LINKS_LABEL}</Label>
                    {fields.map((item, index) => (
                        <div key={item.id} className="flex items-start gap-2">
                            <FormField
                                control={form.control}
                                name={`links.${index}.label`}
                                render={({ field }) => (
                                    <FormItem className="w-1/3">
                                        <FormControl>
                                            <Input
                                                {...field}
                                                aria-label={`Link ${index + 1} label`}
                                                placeholder={
                                                    INSTRUCTOR_LINK_LABEL_PLACEHOLDER
                                                }
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`links.${index}.url`}
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormControl>
                                            <Input
                                                {...field}
                                                aria-label={`Link ${index + 1} url`}
                                                placeholder={
                                                    INSTRUCTOR_LINK_URL_PLACEHOLDER
                                                }
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Remove link ${index + 1}`}
                                onClick={() => remove(index)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                    {fields.length < MAX_LINKS && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => append({ label: "", url: "" })}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            {BTN_ADD_LINK}
                        </Button>
                    )}
                </div>
                <div>
                    <Button type="submit" disabled={loading}>
                        {BUTTON_SAVE}
                    </Button>
                </div>
            </form>
        </FormProvider>
    );
}
