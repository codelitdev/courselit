"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@courselit/components-library";
import {
    COURSE_INSTRUCTORS_DESCRIPTION,
    COURSE_INSTRUCTORS_TITLE,
    INSTRUCTORS_SAVED_MESSAGE,
    TOAST_TITLE_ERROR,
    TOAST_TITLE_SUCCESS,
} from "@ui-config/strings";
import { COURSE_TYPE_COURSE } from "@ui-config/constants";
import { useGraphQLFetch } from "@/hooks/use-graphql-fetch";
import useInstructors from "@/hooks/use-instructors";
import InstructorPicker from "@/components/admin/instructors/instructor-picker";

const MUTATION_UPDATE_INSTRUCTORS = `
    mutation UpdateInstructors($courseId: String!, $instructors: [String!]) {
        updateCourse(courseData: {
            id: $courseId
            instructors: $instructors
        }) {
            courseId
            instructors {
                instructorId
            }
        }
    }
`;

interface ProductInstructorsProps {
    product: any;
}

export default function ProductInstructors({
    product,
}: ProductInstructorsProps) {
    const { toast } = useToast();
    const fetch = useGraphQLFetch();
    const { instructors } = useInstructors();
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<string[]>(
        (product?.instructors ?? []).map(
            (instructor: { instructorId: string }) => instructor.instructorId,
        ),
    );

    const save = async (ids: string[]) => {
        if (!product?.courseId) return;
        const previous = selected;
        setSelected(ids);

        try {
            setLoading(true);
            const response = await fetch
                .setPayload({
                    query: MUTATION_UPDATE_INSTRUCTORS,
                    variables: {
                        courseId: product.courseId,
                        instructors: ids,
                    },
                })
                .build()
                .exec();

            if (response?.updateCourse) {
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: INSTRUCTORS_SAVED_MESSAGE,
                });
            }
        } catch (err: any) {
            setSelected(previous);
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    if (product?.type?.toLowerCase() !== COURSE_TYPE_COURSE) {
        return null;
    }

    return (
        <div className="space-y-4">
            <div className="space-y-0.5">
                <Label className="text-base font-semibold">
                    {COURSE_INSTRUCTORS_TITLE}
                </Label>
                <p className="text-sm text-muted-foreground">
                    {COURSE_INSTRUCTORS_DESCRIPTION}
                </p>
            </div>
            <InstructorPicker
                instructors={instructors}
                value={selected}
                onChange={save}
                disabled={loading}
            />
            <Separator />
        </div>
    );
}
