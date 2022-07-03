import { Breadcrumbs, Grid, Typography } from "@mui/material";
import dynamic from "next/dynamic";
import Link from "next/link";
import useCourse from "../course-hook";

const AppLoader = dynamic(() => import("../../../../app-loader"));

interface Breadcrumb {
    text: string;
    url: string;
}

interface ProductHeaderProps {
    breadcrumbs?: Breadcrumb[];
    id: string;
}

export default function ProductHeader({ id, breadcrumbs }: ProductHeaderProps) {
    const course = useCourse(id);

    if (!course) {
        return <></>;
    }

    return (
        <Grid container direction="column">
            {breadcrumbs && (
                <Grid item sx={{ mb: 2 }}>
                    <Breadcrumbs aria-label="product-breadcrumbs">
                        {breadcrumbs.map((crumb: Breadcrumb) =>
                            crumb.url ? (
                                <Link href={crumb.url}>{crumb.text}</Link>
                            ) : (
                                <Typography>{crumb.text}</Typography>
                            )
                        )}
                    </Breadcrumbs>
                </Grid>
            )}
            <Grid item>
                <Typography variant="h1">{course.title}</Typography>
            </Grid>
        </Grid>
    );
}
