import { Typography } from "@material-ui/core"

const TextRenderer = (props) => {
    return (
        <Typography component={'span'} variant="body1">
            {props.children}
        </Typography>
    )
}

export default TextRenderer