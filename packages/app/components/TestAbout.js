import { Grid } from "@material-ui/core"
import About from "./About"

export default props => {
    return (
        <Grid container xs={12} sm={10} md={8} lg={6} xl={4}>
            <Grid container item>
                <Grid item>
                    <About />
                </Grid>
            </Grid>
            <Grid container item direction='row' justify='center'>
                <Grid container xs={5} sm={6} md={6} lg={6} xl={6}>
                    <Grid item>
                        <About />
                    </Grid>
                </Grid>
                <Grid container xs={5} sm={4} md={4} lg={4} xl={4}>
                    <Grid container item>
                        <Grid item>
                            <About />
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    )
}