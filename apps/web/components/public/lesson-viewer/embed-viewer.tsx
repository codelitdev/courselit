import { Box, Grid, styled } from "@mui/material";

const Iframe = styled("iframe")({
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
});

// Regex taken from: https://stackoverflow.com/a/8260383
const YouTubeRegex =
    /.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]*).*/;

const YouTubeEmbed = ({ content }: { content: string }) => {
    const match = content.match(YouTubeRegex);

    return (
        <Grid container justifyContent="center">
            <Grid item xs={12}>
                <Box
                    sx={{
                        position: "relative",
                        paddingBottom: "56.25%",
                        height: "0px",
                        overflow: "hidden",
                        borderRadius: 4,
                    }}
                >
                    <Iframe
                        src={`https://www.youtube.com/embed/${match![1]}`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </Box>
            </Grid>
        </Grid>
    );
};

interface LessonEmbedViewerProps {
    content: { value: string };
}

const LessonEmbedViewer = ({ content }: LessonEmbedViewerProps) => {
    return (
        <Grid
            container
            justifyContent="center"
            sx={{
                minHeight: {
                    xs: 280,
                    sm: 340,
                    md: 500,
                    lg: 700,
                },
            }}
        >
            <Grid item xs={12}>
                {content.value.match(YouTubeRegex) && (
                    <YouTubeEmbed content={content.value} />
                )}
            </Grid>
            <Grid item>
                <a href={content.value}>{content.value}</a>
            </Grid>
        </Grid>
    );
};

export default LessonEmbedViewer;
