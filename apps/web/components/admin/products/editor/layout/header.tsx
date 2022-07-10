import React from "react";
import { MoreVert } from "@mui/icons-material";
import {
    Breadcrumbs,
    Grid,
    IconButton,
    Menu,
    MenuItem,
    Typography,
} from "@mui/material";
import dynamic from "next/dynamic";
import Link from "next/link";
import { EDIT_PAGE_MENU_ITEM } from "../../../../../ui-config/strings";
import useCourse from "../course-hook";
import { useRouter } from "next/router";

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
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };
    const course = useCourse(id);
    const router = useRouter();

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
                <Grid
                    container
                    justifyContent="space-between"
                    alignItems="center"
                >
                    <Grid item>
                        <Typography variant="h1">{course.title}</Typography>
                    </Grid>
                    <Grid item>
                        <IconButton
                            onClick={handleClick}
                            size="small"
                            sx={{ ml: 2 }}
                            aria-controls={open ? "product-menu" : undefined}
                            aria-haspopup="true"
                            aria-expanded={open ? "true" : undefined}
                        >
                            <MoreVert />
                        </IconButton>
                        <Menu
                            id="basic-menu"
                            anchorEl={anchorEl}
                            open={open}
                            onClose={handleClose}
                            MenuListProps={{
                                "aria-labelledby": "basic-button",
                            }}
                        >
                            <MenuItem
                                onClick={() =>
                                    router.push(
                                        `/dashboard/page/${course.pageId}/edit`
                                    )
                                }
                            >
                                {EDIT_PAGE_MENU_ITEM}
                            </MenuItem>
                        </Menu>
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );
}
