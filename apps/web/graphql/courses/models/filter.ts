import constants from "../../../config/constants";
const { course, download, blog } = constants;
type Filter = typeof course | typeof download | typeof blog;

export default Filter;
