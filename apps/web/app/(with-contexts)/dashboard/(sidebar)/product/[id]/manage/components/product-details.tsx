"use client";

import { FormEvent, useContext, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@courselit/components-library";
import { AddressContext } from "@components/contexts";
import {
    APP_MESSAGE_COURSE_SAVED,
    BUTTON_SAVE,
    BUTTON_SAVING,
    TOAST_TITLE_ERROR,
    TOAST_TITLE_SUCCESS,
} from "@ui-config/strings";
import { useGraphQLFetch } from "@/hooks/use-graphql-fetch";
import { Save, Loader2 } from "lucide-react";
import { Editor, emptyDoc as TextEditorEmptyDoc } from "@courselit/text-editor";

const MUTATION_UPDATE_BASIC_DETAILS = `
    mutation UpdateBasicDetails($courseId: String!, $title: String!, $description: String!) {
        updateCourse(courseData: { id: $courseId, title: $title, description: $description }) {
           courseId 
        }
    }
`;

interface ProductDetailsProps {
    product: any;
}

export default function ProductDetails({ product }: ProductDetailsProps) {
    const { toast } = useToast();
    const address = useContext(AddressContext);
    const fetch = useGraphQLFetch();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [refresh, setRefresh] = useState(0);
    const [formData, setFormData] = useState<{
        name: string;
        description: any;
    }>({
        name: product?.title || "",
        description: product?.description
            ? JSON.parse(product.description)
            : TextEditorEmptyDoc,
    });

    useEffect(() => {
        if (product) {
            setRefresh((prev) => prev + 1);
        }
    }, [product]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = "Name is required";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!validateForm() || !product?.courseId) return;

        try {
            setLoading(true);
            const response = await fetch
                .setPayload({
                    query: MUTATION_UPDATE_BASIC_DETAILS,
                    variables: {
                        courseId: product.courseId,
                        title: formData.name,
                        description: JSON.stringify(formData.description),
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
        <div className="space-y-8">
            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-4">
                    <Label htmlFor="name" className="text-base font-semibold">
                        Name
                    </Label>
                    <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={errors.name ? "border-red-500" : ""}
                        disabled={loading}
                    />
                    {errors.name && (
                        <p className="text-red-500 text-sm">{errors.name}</p>
                    )}
                </div>

                <div className="space-y-4">
                    <Label
                        htmlFor="description"
                        className="text-base font-semibold"
                    >
                        Description
                    </Label>

                    <Editor
                        initialContent={formData.description}
                        onChange={(state: any) => {
                            handleInputChange({
                                target: {
                                    name: "description",
                                    value: state,
                                },
                            } as React.ChangeEvent<HTMLInputElement>);
                        }}
                        url={address.backend}
                        refresh={refresh}
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
            <Separator />
        </div>
    );
}
