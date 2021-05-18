/**
 * This file contains all the PropTypes used across the app.
 */
import PropTypes from "prop-types";

export const authProps = PropTypes.shape({
  guest: PropTypes.bool,
  token: PropTypes.string,
});

export const profileProps = PropTypes.shape({
  isCreator: PropTypes.bool,
  name: PropTypes.string,
  id: PropTypes.string,
  fetched: PropTypes.bool,
  email: PropTypes.string,
  purchases: PropTypes.arrayOf(PropTypes.string),
});

export const latestPostsProps = PropTypes.shape({
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  creatorName: PropTypes.string.isRequired,
  updated: PropTypes.number.isRequired,
  slug: PropTypes.string.isRequired,
});

export const siteInfoProps = PropTypes.shape({
  title: PropTypes.string,
  subtitle: PropTypes.string,
  logopath: PropTypes.string,
  currencyUnit: PropTypes.string,
  currencyISOCode: PropTypes.string,
});

export const publicCourse = PropTypes.shape({
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  creatorName: PropTypes.string,
  updated: PropTypes.string,
  slug: PropTypes.string.isRequired,
  isFeatured: PropTypes.bool,
  cost: PropTypes.number,
  creatorId: PropTypes.string,
});

export const creatorCourse = PropTypes.shape({
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  creatorName: PropTypes.string,
  updated: PropTypes.string,
  slug: PropTypes.string,
  isFeatured: PropTypes.bool,
  cost: PropTypes.number,
});

export const siteUser = PropTypes.shape({
  email: PropTypes.string.isRequired,
  name: PropTypes.string,
  avatar: PropTypes.string,
  purchases: PropTypes.arrayOf(PropTypes.string),
  permissions: PropTypes.arrayOf(PropTypes.string),
});

export const featuredCourse = PropTypes.shape({
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  cost: PropTypes.number.isRequired,
  featuredImage: PropTypes.string,
});

export const appMessage = PropTypes.shape({
  open: PropTypes.bool.isRequired,
  message: PropTypes.string.isRequired,
  action: PropTypes.shape({
    text: PropTypes.string.isRequired,
    cb: PropTypes.func.isRequired,
  }),
});

export const lesson = PropTypes.shape({
  id: PropTypes.string,
  title: PropTypes.string,
  type: PropTypes.string,
  downloadable: PropTypes.bool,
  content: PropTypes.object,
  contentURL: PropTypes.string,
});

export const link = PropTypes.shape({
  text: PropTypes.string.isRequired,
  destination: PropTypes.string.isRequired,
  category: PropTypes.string.isRequired,
  newTab: PropTypes.bool.isRequired,
});

export const addressProps = PropTypes.shape({
  backend: PropTypes.string.isRequired,
  frontend: PropTypes.string.isRequired,
  domain: PropTypes.string.isRequired,
});

export const networkActionProps = PropTypes.bool;

export const dispatchProps = PropTypes.func;

export const mediaProps = PropTypes.shape({
  id: PropTypes.string.isRequired,
  originalFileName: PropTypes.string.isRequired,
  file: PropTypes.string.isRequired,
  mimeType: PropTypes.string.isRequired,
  thumbnail: PropTypes.string,
  altText: PropTypes.string,
});

export const selectedLessonMetaProps = PropTypes.shape({
  groupId: PropTypes.string,
  index: PropTypes.number,
});
