import * as React from "react";
import Link from "next/link";
import { Grid, Typography } from "@mui/material";
import { PriceTag, Course } from "@courselit/components-library";
import { styled } from "@mui/system";
import MuiLink from "@mui/material/Link";

const StyledImg = styled('img')({});

interface ItemProps {
  course: Course;
  appUtilities: any;
  appConfig: any;
}

const Item = (props: ItemProps) => {
  const { appConfig } = props;

  return (
    <Grid item xs={12} md={4}>
      <Link
        href={`/${appConfig.URL_EXTENTION_COURSES}/[id]/[slug]`}
        as={`/${appConfig.URL_EXTENTION_COURSES}/${props.course.courseId}/${props.course.slug}`}
      >
        <MuiLink sx={{
            textDecoration: "none",
            color: "inherit",
            mb: 4,
            display: "block",
        }}>
          <Grid item container direction="column" component="article">
            {props.course.featuredImage && (
              <Grid item>
                <StyledImg
                  src={props.course.featuredImage.file}
                  sx={{
                    height: "auto",
                    width: "100%",
                  }}
                />
              </Grid>
            )}
            <Grid
              item
              container
              sx={{
                marginTop: 2,
                marginBottom: 0.5,
              }}
              justifyContent="space-between"
              alignItems="center"
            >
              <Grid item>
                <Typography variant="h5">{props.course.title}</Typography>
              </Grid>
              <Grid item>
                <PriceTag cost={props.course.cost} freeCostCaption="FREE" />
              </Grid>
            </Grid>
          </Grid>
        </MuiLink>
      </Link>
    </Grid>
  );
};

export default Item;
