import { Link } from "../models/Link";

type UILinkWithoutDomain = Omit<Link, "domain">;
type UILink = Omit<UILinkWithoutDomain, "id"> &
    Partial<Pick<UILinkWithoutDomain, "id">>;
export default UILink;
